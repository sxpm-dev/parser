// Schema → bytecode encoder for the Phase 6 bytecode backend.
//
// Walks every NodeTypeInfo / Production in the InferredSchema and emits a
// contiguous opcode + operand stream into a single Uint8Array. Pool entries
// (literal strings, numeric constants) are deduplicated and the final
// stringPool / numberPool are returned alongside the opcode bytes.
//
// Encoder conventions (Task 6.2 — these match what Task 6.3's runtime will
// later interpret):
//
//   - Pool indices are u32. Slot numbers are u8. Jump offsets are i32
//     relative to the byte AFTER the operand. See `./ops.ts` OPERAND_SIZES.
//
//   - The productionOffsets map keys mirror the TS backend's routing keys
//     produced by `productionRoutingKey` (e.g. 'CronField#0'). For multi-
//     production node types we also add a synthetic 'CronField#dispatch'
//     entry pointing at a dispatch block that chain-tries each alt and
//     returns the first success. Call sites use `CALL_PRODUCTION
//     <nodeType>#dispatch` rather than calling a specific alt directly so
//     the caller stays oblivious to which alt eventually matched.
//
//   - Forward references: when emitting `CALL_PRODUCTION` we don't yet know
//     the target's byte offset (it may not have been emitted). We write a
//     placeholder u32 (0xFFFFFFFF) into the operand and remember the call
//     site in a `pendingCalls` list. At the end of the encode pass we walk
//     that list and patch each operand with the resolved target offset.
//
//   - Modifier handling is intentionally minimal in Task 6.2 — the encoder
//     lays down opcodes that the runtime will execute later. For optional
//     and repeats spans we emit simple stubs (SAVE_OFF / JUMP_IF_NULL /
//     backward JUMP); Task 6.3 will validate semantic correctness end-to-
//     end and refine these as needed. The test for Task 6.2 only asserts
//     that the opcode stream has the right SHAPE (non-empty, pools
//     populated, productionOffsets populated).

import type {
  InferredSchema,
  InverseField,
  InverseIR,
  NodeTypeInfo,
  Production,
  ResolvedSpan,
} from '../../model.ts';
import { isStructureRef, isTemplate, type RenderBody, type StructureRef, type Template } from '@parser2/parser';
import { findSpanByName, isAbsentAllowedSpan } from '../../span-helpers.ts';
import { syntheticKey } from '../captures.ts';
import { productionKey } from '../render.ts';
import { Op, OPERAND_SIZES, ScanClassKind, INVERSE_TEMPLATE_ROLE_NONE } from './ops.ts';

export type EncodedSchema = {
  readonly ops: Uint8Array;
  readonly stringPool: ReadonlyArray<string>;
  readonly numberPool: ReadonlyArray<number>;
  // Keyed by 'NodeType#N' for each declared production AND, for multi-prod
  // node types, an extra 'NodeType#dispatch' entry pointing at a chain-try
  // block. The root entry is `${rootType}#dispatch` (if the root has
  // multiple alts) or `${rootType}#0` (single-alt root).
  readonly productionOffsets: ReadonlyMap<string, number>;
  // Keyed by '<NodeType>#<N>:<target>'. Points at the per-(production,
  // target) render block. Produced by Task 6.4.
  readonly renderOffsets: ReadonlyMap<string, number>;
  // Keyed by '<NodeType>#<N>:<target>'. Points at the per-(production,
  // target) inverse stringify block. Produced by Task 6.4 Commit 3.
  readonly stringifyOffsets: ReadonlyMap<string, number>;
  // Keyed by '<NodeType>:<target>'. Lists the per-production stringify
  // block offsets that STRINGIFY_DISPATCH should chain-try in order.
  // The runtime takes the first one that returns non-null.
  readonly stringifyOffsetsByNodeType: ReadonlyMap<string, ReadonlyArray<number>>;
  // Keyed by '<NodeType>:<target>'. Points at the per-(NodeType, target)
  // stringify dispatcher (a chain-try bytecode block). Used by Public
  // runStringify (entry = `<rootType>:<target>`).
  readonly stringifyDispatcherOffsets: ReadonlyMap<string, number>;
  readonly rootProductionKey: string;
  // Sorted list of declared render targets (e.g. ['ast', 'source']).
  readonly targets: ReadonlyArray<string>;
  // Schema-level default render target (e.g. 'source'); undefined when the
  // schema did not declare one. The generated `render()` / `stringify()`
  // entries use this when the caller omits `options.type`.
  readonly defaultTarget?: string;
  // Operator literals from `schema.operatorLiterals` — sorted longest-
  // first by the inference pass. Consumed by SCAN_CLASS / OPERATOR at
  // runtime. Empty for schemas without an `operators:` declaration.
  readonly operatorLiterals: ReadonlyArray<string>;
};

// Internal: mutable encoder state. Kept out of EncodedSchema (which is the
// immutable output shape).
type EncoderState = {
  // Growable byte buffer. We allocate a 4 KiB initial buffer and double on
  // overflow — final output is a Uint8Array view sliced to exact length.
  buf: Uint8Array;
  len: number;
  // Dedup pools. Map values are pool indices (insertion order).
  strings: Map<string, number>;
  numbers: Map<number, number>;
  // Resolved offsets per production routing key. Populated as we emit each
  // production block.
  productionOffsets: Map<string, number>;
  // Forward-reference table: each entry records (callSiteOffset, targetKey)
  // for a CALL_PRODUCTION operand that we patched with 0xFFFFFFFF at emit
  // time. End-of-pass fixup walks this list and writes the resolved offset.
  pendingCalls: Array<{ readonly site: number; readonly targetKey: string }>;
  // Resolved per-(production, target) render block offsets. Key:
  // '<NodeType>#<idx>:<target>'.
  renderOffsets: Map<string, number>;
  // Resolved per-(production, target) inverse stringify block offsets.
  stringifyOffsets: Map<string, number>;
  // Per-(NodeType, target) list of stringify block offsets to chain-try.
  stringifyOffsetsByNodeType: Map<string, number[]>;
  // Resolved per-target stringify dispatcher offsets.
  stringifyDispatcherOffsets: Map<string, number>;
  // Transient — set by emitStringifyBlock so deep emitInverseIR calls can
  // route STRINGIFY_DISPATCH to the matching target. Reset to undefined
  // outside stringify emission.
  currentTarget?: string;
  // The inferred schema this encoder is producing bytecode for. Threaded
  // through so .until() emit can consult schema.classes (decide whether
  // to set the skip-strings / skip-comments flags on SCAN_UNTIL).
  schema: InferredSchema;
  // Synthetic multi-role dispatch keys (e.g. "AtRule|Comment|Rule:source")
  // requested by emitWriteRefValue / emitInverseTemplate during stringify
  // emit. Populated at request time; resolved into
  // stringifyOffsetsByNodeType at the END of encodeSchema (after all
  // per-(prod, target) offsets are known). Done in a post-pass because
  // a multi-role span emitted inside an EARLY production (e.g. Rule)
  // would otherwise capture an incomplete offset list — missing any
  // role whose stringify block hasn't emitted yet (AtRule comes after
  // Rule in CSS).
  pendingSyntheticDispatchKeys: Set<string>;
};

// Public entry point. Walks every node type, emits one block per production,
// optionally emits a dispatch block per multi-prod node type, and patches
// forward-reference call sites at the end.
export function encodeSchema(schema: InferredSchema): EncodedSchema {
  const state: EncoderState = {
    buf: new Uint8Array(4096),
    len: 0,
    strings: new Map(),
    numbers: new Map(),
    productionOffsets: new Map(),
    pendingCalls: [],
    renderOffsets: new Map(),
    stringifyOffsets: new Map(),
    stringifyOffsetsByNodeType: new Map(),
    stringifyDispatcherOffsets: new Map(),
    schema,
    pendingSyntheticDispatchKeys: new Set(),
  };

  // Pre-intern frequently used strings (production routing keys) so the
  // ordering of stringPool entries is deterministic and inspectable. Order
  // here doesn't affect correctness but keeps generated artifacts stable
  // across re-runs.
  for (const info of schema.nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      internString(state, productionKey(info.name, i));
    }
    if (info.productions.length > 1) {
      internString(state, `${info.name}#dispatch`);
    }
  }

  // Emit each production block.
  for (const info of schema.nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      const prod = info.productions[i]!;
      const key = productionKey(info.name, i);
      state.productionOffsets.set(key, state.len);
      emitProductionBlock(state, prod, i);
    }
    if (info.productions.length > 1) {
      const dispatchKey = `${info.name}#dispatch`;
      state.productionOffsets.set(dispatchKey, state.len);
      emitDispatchBlock(state, info);
    }
  }

  // Collect render targets, sorted for determinism.
  const targets = collectTargets(schema);

  // Emit per-(production, target) render blocks.
  for (const info of schema.nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      const prod = info.productions[i]!;
      for (const target of targets) {
        const entry = prod.renders.get(target);
        if (!entry) {
          // Defensive — validate.ts enforces per-target completeness in
          // the TS backend's render emitter; we mirror that contract.
          throw new Error(`bytecode encoder: production '${productionKey(info.name, i)}' missing render target '${target}'`);
        }
        const key = `${productionKey(info.name, i)}:${target}`;
        state.renderOffsets.set(key, state.len);
        emitRenderBlock(state, entry.body, target, prod);
      }
    }
  }

  // Emit per-(production, target) inverse stringify blocks + per-target
  // dispatcher (chain-tries every root production).
  //
  // Only IR shapes the encoder supports are emitted (object-form with
  // string scalars / ref population — cron's AST target). Unsupported
  // shapes (template, array, non-string scalars) are simply skipped at
  // encode time, leaving stringifyOffsets empty for those keys. The
  // public runStringify path checks for missing entries before dispatching.
  for (const info of schema.nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      const prod = info.productions[i]!;
      for (const target of targets) {
        const entry = prod.renders.get(target);
        if (!entry || !entry.inverseDerived) continue;
        if (!canEncodeInverse(entry.inverseDerived)) continue;
        const key = `${productionKey(info.name, i)}:${target}`;
        const offset = state.len;
        state.stringifyOffsets.set(key, offset);
        // Also index by NodeType for STRINGIFY_DISPATCH's chain-try.
        const byNodeKey = `${info.name}:${target}`;
        const list = state.stringifyOffsetsByNodeType.get(byNodeKey) ?? [];
        list.push(offset);
        state.stringifyOffsetsByNodeType.set(byNodeKey, list);
        emitStringifyBlock(state, entry.inverseDerived, target, prod, i);
      }
    }
  }

  // Per-(NodeType, target) stringify dispatcher: chain-tries each
  // NodeType's productions for the target. The runtime performs the
  // chain-try in JS via `runStringifyDispatch`, reading
  // stringifyOffsetsByNodeType. No additional bytecode is emitted here —
  // stringifyDispatcherOffsets is kept as a convenience map pointing at
  // the first alt's offset (for tooling that wants a single entry point);
  // the public runStringify uses stringifyOffsetsByNodeType directly.
  for (const info of schema.nodeTypes.values()) {
    for (const target of targets) {
      const byNodeKey = `${info.name}:${target}`;
      const list = state.stringifyOffsetsByNodeType.get(byNodeKey);
      if (!list || list.length === 0) continue;
      state.stringifyDispatcherOffsets.set(byNodeKey, list[0]!);
    }
  }

  // Post-pass: resolve every pending synthetic multi-role dispatch key.
  // For each `<role1>|<role2>|...:<target>` request, look up each role's
  // per-target offset list (now finalized — all stringify blocks have
  // emitted) and concatenate. Without this, an early multi-role call
  // site (Rule's nodes ref) would resolve against an incomplete
  // offset map, and later prods (AtRule) would be silently absent
  // from the dispatch chain.
  for (const synthKey of state.pendingSyntheticDispatchKeys) {
    const colonAt = synthKey.lastIndexOf(':');
    if (colonAt < 0) continue;
    const rolesJoined = synthKey.slice(0, colonAt);
    const target = synthKey.slice(colonAt + 1);
    const roles = rolesJoined.split('|');
    const combined: number[] = [];
    for (const role of roles) {
      const offsets = state.stringifyOffsetsByNodeType.get(`${role}:${target}`);
      if (offsets !== undefined) combined.push(...offsets);
    }
    state.stringifyOffsetsByNodeType.set(synthKey, combined);
  }

  // Patch forward references. Every pendingCalls entry resolves to either
  // a `#dispatch` entry (multi-prod target) or `#0` (single-prod target),
  // OR a per-(production, target) render/stringify block (key contains a
  // `:<target>` suffix). We try maps in order: productionOffsets (with
  // #dispatch fallback to #0), then renderOffsets, then stringifyOffsets.
  for (const { site, targetKey } of state.pendingCalls) {
    let target: number | undefined;
    if (targetKey.includes(':')) {
      target = state.renderOffsets.get(targetKey);
      if (target === undefined) target = state.stringifyOffsets.get(targetKey);
    } else {
      target = state.productionOffsets.get(targetKey);
      if (target === undefined && targetKey.endsWith('#dispatch')) {
        const fallback = targetKey.replace(/#dispatch$/, '#0');
        target = state.productionOffsets.get(fallback);
      }
    }
    if (target === undefined) {
      throw new Error(
        `bytecode encoder: unresolved CALL_PRODUCTION target '${targetKey}' (no production, render, or stringify entry was emitted under that key)`,
      );
    }
    writeU32At(state, site, target);
  }

  const root = schema.rootType;
  const rootInfo = schema.nodeTypes.get(root);
  if (!rootInfo) {
    throw new Error(`bytecode encoder: rootType '${root}' missing from schema.nodeTypes`);
  }
  const rootKey = rootInfo.productions.length > 1
    ? `${root}#dispatch`
    : productionKey(root, 0);

  return {
    ops: state.buf.slice(0, state.len),
    stringPool: [...state.strings.keys()],
    numberPool: [...state.numbers.keys()],
    productionOffsets: state.productionOffsets,
    renderOffsets: state.renderOffsets,
    stringifyOffsets: state.stringifyOffsets,
    stringifyOffsetsByNodeType: state.stringifyOffsetsByNodeType,
    stringifyDispatcherOffsets: state.stringifyDispatcherOffsets,
    rootProductionKey: rootKey,
    targets,
    defaultTarget: schema.defaultTarget,
    operatorLiterals: schema.operatorLiterals,
  };
}

function collectTargets(schema: InferredSchema): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const info of schema.nodeTypes.values()) {
    for (const prod of info.productions) {
      for (const t of prod.renders.keys()) set.add(t);
    }
  }
  return [...set].sort();
}

// --- per-production emit ---------------------------------------------------

// Each production block layout (Task 6.2 minimum):
//   SAVE_OFF entryOffSlot=0
//   SKIP_WS
//   PUSH_NEW_CAPTURES <prodKey>
//   <per-span opcodes>
//   RETURN_OK
//
// Per-span opcodes:
//   - literal           → CONSUME_LITERAL <text>
//   - class span        → SCAN_CLASS <kind> <refinementKey>
//                         CAPTURE_SLICE <startSlot> <endSlot> <captureName>
//   - recursive ref     → CALL_PRODUCTION <dispatchOrFirstAltOffset>
//                         (result already on value stack; runtime stores it
//                         in captures during Task 6.3)
//
// Optional modifier: emit SAVE_OFF before the span body and a JUMP_IF_NULL
// to skip the span on failure. Repeats modifier: emit a backward JUMP loop
// after the span body, with a SAVE_OFF + RESTORE_OFF for `min: 1` honoring.
// Task 6.3 will refine these — Task 6.2 only needs the bytes laid down so
// the encoder test (and the future runtime) can see structurally complete
// emit.
//
// Slot allocation: slot 0 is reserved for the production's entry offset
// (used by RETURN_NULL paths). Per-span start/end offsets use slots 1, 2,
// 3, 4, ... starting at 1. We don't try to enforce a u8 ceiling here —
// cron's deepest production has ≤7 spans which is well below 256.
function emitProductionBlock(state: EncoderState, prod: Production, prodIdx: number): void {
  const prodKey = productionKey(prod.nodeType, prodIdx);

  // SAVE_OFF entryOffSlot=0
  writeOp(state, Op.SAVE_OFF);
  writeU8(state, 0);

  // SKIP_WS (leading)
  writeOp(state, Op.SKIP_WS);

  // PUSH_NEW_CAPTURES <prodKey>
  writeOp(state, Op.PUSH_NEW_CAPTURES);
  writeU32(state, internString(state, prodKey));

  // Pre-init every named .repeats({min:0}) span's captures field to an
  // empty array. Without this, zero iterations leave the field undefined
  // and the AST surfaces it as `null` instead of `[]`. Mirrors v2's
  // upfront `const <name>: unknown[] = [];` declaration.
  //
  // SKIP when min >= 1: bcode's min-check is a LOAD_CAPTURE +
  // JUMP_IF_NULL pattern that relies on the field being `undefined`
  // (not `[]`) to signal "zero items parsed". Initializing to `[]`
  // would defeat the min:1 enforcement (cron's Command#0 then
  // succeeds with empty words instead of failing). Schemas needing
  // both min:1 AND zero-iter-to-empty-array would require switching
  // the min-check to an array-length op (TODO).
  for (const span of prod.spans) {
    if (!span.name) continue;
    const repeatsMod = span.modifiers.find((m) => m.kind === 'repeats');
    if (repeatsMod === undefined) continue;
    const min = 'min' in repeatsMod && typeof repeatsMod.min === 'number' ? repeatsMod.min : 0;
    if (min >= 1) continue;
    writeOp(state, Op.CAPTURE_INIT_ARRAY);
    writeU32(state, internString(state, span.name));
  }

  let nextSlot = 1;
  for (let i = 0; i < prod.spans.length; i++) {
    const span = prod.spans[i]!;
    if (i > 0) writeOp(state, Op.SKIP_WS);
    nextSlot = emitSpan(state, span, nextSlot);
  }

  // RETURN_OK
  writeOp(state, Op.RETURN_OK);
}

// Emit one span. Returns the next free slot index.
function emitSpan(state: EncoderState, span: ResolvedSpan, nextSlot: number): number {
  const isOptional = span.modifiers.some((m) => m.kind === 'optional');
  const isRepeats = span.modifiers.some((m) => m.kind === 'repeats');
  const untilMod = span.modifiers.find((m) => m.kind === 'until');
  const rawUntilMod = span.modifiers.find((m) => m.kind === 'rawUntil');

  // Recursive reference (single or multi-role)
  if (span.recursiveRoles.length > 0) {
    return emitRecursiveSpan(state, span, nextSlot, { isOptional, isRepeats });
  }

  // .until() span: literal-stop scan with bracket / string / comment
  // awareness. Trim-on-capture is the schema author's default.
  if (untilMod !== undefined) {
    return emitUntilSpan(state, span, untilMod as {
      readonly stops: ReadonlyArray<string>;
      readonly balanced: boolean;
      readonly trim: boolean;
    }, nextSlot);
  }

  // .rawUntil() span: plain literal-stop scan with NO bracket / string /
  // comment awareness. The off-equal repeats guard added alongside this
  // makes "zero-byte capture" safe — the parent .repeats() loop breaks
  // instead of spinning. Capture is raw bytes (no trim).
  if (rawUntilMod !== undefined) {
    return emitRawUntilSpan(state, span, rawUntilMod as {
      readonly stops: ReadonlyArray<string>;
      readonly caseInsensitive: boolean;
      readonly requireStop?: boolean;
      readonly nonEmpty?: boolean;
    }, nextSlot);
  }

  // Literal span
  if (span.class === 'literal') {
    return emitLiteralSpan(state, span, nextSlot, isOptional);
  }

  // Class span (ident / number / etc.)
  return emitClassSpan(state, span, nextSlot, isOptional);
}

// Phase 6 — .rawUntil() span bytecode emit. Same SCAN_UNTIL op but with
// flags=0 (no bracket-balance, no string/comment skip). Case-insensitive
// stops are not yet honored in the bcode runtime — none of the in-scope
// schemas combine .rawUntil with CI. Capture is always raw (no trim).
function emitRawUntilSpan(
  state: EncoderState,
  span: ResolvedSpan,
  modifier: {
    readonly stops: ReadonlyArray<string>;
    readonly caseInsensitive: boolean;
    readonly requireStop?: boolean;
    readonly nonEmpty?: boolean;
  },
  nextSlot: number,
): number {
  const startSlot = nextSlot;
  const endSlot = nextSlot + 1;
  writeOp(state, Op.SAVE_OFF);
  writeU8(state, startSlot);

  writeOp(state, Op.SCAN_UNTIL);
  writeU32(state, modifier.stops.length);
  writeU32(state, 0); // flags = 0 (no balanced, no string/comment skip)
  for (const s of modifier.stops) writeU32(state, internString(state, s));

  writeOp(state, Op.SAVE_OFF);
  writeU8(state, endSlot);

  if (span.name) {
    writeOp(state, Op.CAPTURE_SLICE);
    writeU8(state, startSlot);
    writeU8(state, endSlot);
    writeU32(state, internString(state, span.name));
  }
  return nextSlot + 2;
}

// Phase 6 — .until() span bytecode emit. Mirrors v2's emitUntilSpan in
// emit/v2/span.ts. The runtime SCAN_UNTIL op handles the scan with
// optional bracket-balance, string-skip, and comment-skip; the capture
// op (CAPTURE_SLICE or CAPTURE_TRIMMED_SLICE) follows.
function emitUntilSpan(
  state: EncoderState,
  span: ResolvedSpan,
  modifier: {
    readonly stops: ReadonlyArray<string>;
    readonly balanced: boolean;
    readonly trim: boolean;
  },
  nextSlot: number,
): number {
  const startSlot = nextSlot;
  const endSlot = nextSlot + 1;
  const tokens = new Set<string>();
  for (const t of state.schema.classes) tokens.add(t.class);
  const skipStrings = tokens.has('string');
  const skipComments = tokens.has('comment');
  let flags = 0;
  if (modifier.balanced) flags |= 1;
  if (skipStrings) flags |= 2;
  if (skipComments) flags |= 4;

  writeOp(state, Op.SAVE_OFF);
  writeU8(state, startSlot);

  writeOp(state, Op.SCAN_UNTIL);
  writeU32(state, modifier.stops.length);
  writeU32(state, flags);
  for (const s of modifier.stops) writeU32(state, internString(state, s));

  writeOp(state, Op.SAVE_OFF);
  writeU8(state, endSlot);

  if (span.name) {
    const captureOp = modifier.trim ? Op.CAPTURE_TRIMMED_SLICE : Op.CAPTURE_SLICE;
    writeOp(state, captureOp);
    writeU8(state, startSlot);
    writeU8(state, endSlot);
    writeU32(state, internString(state, span.name));
  }
  return nextSlot + 2;
}

function emitLiteralSpan(
  state: EncoderState,
  span: ResolvedSpan,
  nextSlot: number,
  isOptional: boolean,
): number {
  if (!span.text) {
    throw new Error(`bytecode encoder: literal span without text (span name '${span.name ?? '?'}')`);
  }
  const startSlot = nextSlot;
  const endSlot = nextSlot + 1;

  writeOp(state, Op.SAVE_OFF);
  writeU8(state, startSlot);

  // Optional literal: try to match; if not present, push null on the value
  // stack and skip forward past the capture block. The runtime treats a null
  // top-of-stack at JUMP_IF_NULL as "branch taken". For literals, the
  // "match present" path is reflected by the CONSUME succeeding (no branch
  // needed — the byte cursor simply advances).
  //
  // For Task 6.3, optional LITERAL spans aren't exercised by cron (cron's
  // only optional span is the recursive `command` span). We still emit the
  // SAVE_OFF marker so structurally the production block looks the same as
  // the non-optional path. The runtime's CONSUME_LITERAL falls through to
  // RETURN_NULL on a miss when this span is required; optional literals
  // are emitted with a peek-and-skip pattern handled here when the encoder
  // grows that case. Marker reserved.
  void isOptional;

  writeOp(state, Op.CONSUME_LITERAL);
  writeU32(state, internString(state, span.text));

  // If the literal carries a capture name, emit CAPTURE_SLICE so the runtime
  // stamps captures[name] = the consumed text.
  if (span.name) {
    writeOp(state, Op.SAVE_OFF);
    writeU8(state, endSlot);
    writeOp(state, Op.CAPTURE_SLICE);
    writeU8(state, startSlot);
    writeU8(state, endSlot);
    writeU32(state, internString(state, span.name));
    return nextSlot + 2;
  }
  return nextSlot + 1;
}

function emitClassSpan(
  state: EncoderState,
  span: ResolvedSpan,
  nextSlot: number,
  isOptional: boolean,
): number {
  const startSlot = nextSlot;
  const endSlot = nextSlot + 1;
  const kind = mapClassKind(span.class);
  // Encode a single primary refinement key (first non-modifier refinement).
  // For cron's `.int()` / `.css()` this is the only refinement on the span.
  // Multi-refinement spans (css-color/css-length) aren't in scope for Task
  // 6.2; we just pack the first into the operand and let Task 6.3 decide
  // how the runtime fans out.
  const primary = span.refinements[0]?.name ?? '';
  const refKey = internString(state, primary);

  writeOp(state, Op.SAVE_OFF);
  writeU8(state, startSlot);

  // Optional class spans use the same SCAN_CLASS opcode — the runtime
  // (Task 6.3) will branch on whether the start predicate matched. For
  // Task 6.2 the emit is shape-only.
  void isOptional;

  writeOp(state, Op.SCAN_CLASS);
  writeU8(state, kind);
  writeU32(state, refKey);

  writeOp(state, Op.SAVE_OFF);
  writeU8(state, endSlot);

  if (span.name) {
    // comment-class spans implicitly carry the .comment() refinement —
    // the captured value is the interior text (delimiters stripped,
    // surrounding whitespace trimmed). Emit a dedicated op so the
    // runtime applies the trim instead of returning the raw slice.
    const captureOp = span.class === 'comment' ? Op.CAPTURE_COMMENT_INTERIOR : Op.CAPTURE_SLICE;
    writeOp(state, captureOp);
    writeU8(state, startSlot);
    writeU8(state, endSlot);
    writeU32(state, internString(state, span.name));
  }
  // .oneOf([...]) refinement enforcement (matches v2 case-insensitive).
  // Emitted only for named ident spans — the assertion reads
  // captures[name] which requires the CAPTURE_SLICE to have run. For
  // anonymous spans the value isn't stored; skip the check (no
  // schema in scope uses .oneOf on an anonymous ident). The set is
  // pre-lowered at encode time so the runtime only lowercases the
  // captured value.
  const oneOfRef = span.refinements.find((r) => r.name === 'oneOf');
  if (span.name && oneOfRef !== undefined) {
    const values = oneOfRef.args?.[0];
    if (Array.isArray(values) && values.every((v) => typeof v === 'string')) {
      const lowered = (values as string[]).map((v) => v.toLowerCase());
      writeOp(state, Op.ASSERT_CAPTURE_IN_LOWERED_SET);
      writeU32(state, internString(state, span.name));
      writeU32(state, lowered.length);
      for (const v of lowered) writeU32(state, internString(state, v));
    }
  }
  return nextSlot + 2;
}

// Recursive ref: a span calling into another node type. For multi-prod
// targets we route through the synthetic dispatch entry; for single-prod
// we call the prod directly. Optional and repeats spans wrap the call in a
// JUMP_IF_NULL guard so the runtime's null-return is treated as "absent"
// (optional) or "loop exit" (repeats) rather than a hard production fail.
//
// Captures completeness (Task 6.4 fix): for recursive spans we no longer
// stamp `captures[name] = input.slice(start, end)` — that gave render only
// the raw source string. Instead we capture the CHILD CAPTURES OBJECT
// returned by the recursive call via CAPTURE_VALUE_FROM_STACK
// (single calls) or CAPTURE_VALUE_APPEND (repeats). Render walks the
// captures tree by routing each child through `__dispatchRender_<target>`.
// Sort a list of role names by the longest literal-prefix any of their
// productions starts with. Roles whose productions all start with a
// non-literal first span (recursive / .until() / .rawUntil() / class)
// get prefix-length 0 and stay in declared order relative to other
// 0-length roles. Mirrors v2's emitRoleLadder ordering so multi-role
// dispatch prefers more-specific (longer literal) productions over
// less-specific ones — closes the HTML doctype-vs-comment ambiguity
// on inputs like `<!-- ... -->`.
function sortRolesByLongestPrefix(state: EncoderState, roles: ReadonlyArray<string>): string[] {
  const meta = roles.map((role, declOrder) => {
    const info = state.schema.nodeTypes.get(role);
    let longest = 0;
    if (info) {
      for (const prod of info.productions) {
        const s0 = prod.spans[0];
        if (s0 && s0.class === 'literal' && typeof s0.text === 'string' && s0.text.length > 0) {
          // Only fixed-position literals count — same exclusions as v2's
          // computeSpeculationOrder (optional / until / repeats / recursive
          // disqualify the prefix from being a stable byte-discriminator).
          const mods = s0.modifiers;
          const hasMod = mods.some((m) => m.kind === 'optional' || m.kind === 'until' || m.kind === 'rawUntil' || m.kind === 'repeats');
          if (!hasMod && s0.recursiveRoles.length === 0) {
            if (s0.text.length > longest) longest = s0.text.length;
          }
        }
      }
    }
    return { role, longest, declOrder };
  });
  meta.sort((a, b) => {
    if (a.longest !== b.longest) return b.longest - a.longest;
    return a.declOrder - b.declOrder;
  });
  return meta.map((m) => m.role);
}

function emitRecursiveSpan(
  state: EncoderState,
  span: ResolvedSpan,
  nextSlot: number,
  opts: { readonly isOptional: boolean; readonly isRepeats: boolean },
): number {
  if (span.recursiveRoles.length === 0) {
    throw new Error(`bytecode encoder: recursive span without roles (span '${span.name ?? '?'}')`);
  }
  // For multi-role spans (a single span legitimately referencing more than
  // one node type) we emit one CALL_PRODUCTION per role. The runtime tries
  // each in order via JUMP_IF_NULL fall-through. cron doesn't use multi-
  // role spans on a single span site — every Cron-recursive span names one
  // target node type (CronField / Command / CommandWord), and that target
  // may itself have multiple internal alts (handled by its dispatch entry).
  //
  // ASSUMPTION (Task 6.4): the optional/required CAPTURE_VALUE_FROM_STACK
  // (and repeats CAPTURE_VALUE_APPEND) emitted after the role loop consume
  // ONE captures object from the value stack. When multiple roles succeed
  // sequentially before that capture-emit, only the last one is consumed;
  // earlier successes leave orphans on the stack until RETURN_OK's
  // stackBase truncation. cron's single-role spans never hit this path —
  // multi-role schemas will need either an additional POP between roles or
  // per-role CAPTURE_VALUE_FROM_STACK emission. Documented here for the
  // next implementer.
  const startSlot = nextSlot;
  const endSlot = nextSlot + 1;
  writeOp(state, Op.SAVE_OFF);
  writeU8(state, startSlot);

  // Repeats: emit a guarded backward-jump loop. Layout per role:
  //   [loop-top]
  //   CALL_PRODUCTION <role>
  //   JUMP_IF_NULL +<bytes-to-loop-exit>
  //   CAPTURE_VALUE_APPEND <nameIdx>   (consumes the child captures)
  //   SKIP_WS                          (between repeats children)
  //   JUMP <back-to-loop-top>
  //   [loop-exit]
  // On JUMP_IF_NULL taken, the null sentinel has been popped — nothing
  // more to do. On non-taken, the child captures is on the value stack;
  // CAPTURE_VALUE_APPEND consumes it.
  if (opts.isRepeats) {
    // Allocate an extra slot for the loop-start off (used by the
    // infinite-loop guard: if the child call "succeeded" without
    // advancing state.off, the parent loop must exit instead of
    // spinning forever). Mirrors v2's `if (off === __loopStart) break;`.
    const loopStartSlot = nextSlot + 2;
    // Sort roles by longest-literal-prefix descending. Without this,
    // HTML's HtmlDocument.children = of(Doctype, Comment, ...) tries
    // Doctype first for `<!--` — Doctype's prefix-share dispatcher
    // matches '<!' and (because bcode doesn't enforce .oneOf()
    // refinements yet) accepts arbitrary ident as the DOCTYPE keyword,
    // routing into the recovery alt. Mirrors v2's emitRoleLadder which
    // sorts by longestLiteralPrefix descending. Comment (literal `<!--`
    // length 4) now wins over Doctype (literal `<!` length 2).
    const sortedRoles = sortRolesByLongestPrefix(state, span.recursiveRoles);
    for (const role of sortedRoles) {
      const loopTop = state.len;
      // Save state.off into loopStartSlot. The off-equal check after
      // CAPTURE_VALUE_APPEND uses this to decide whether to break.
      writeOp(state, Op.SAVE_OFF);
      writeU8(state, loopStartSlot);
      const targetKey = targetKeyForRole(role);
      writeOp(state, Op.CALL_PRODUCTION);
      const site = state.len;
      writeU32(state, 0xffffffff); // placeholder; patched at end of encode
      state.pendingCalls.push({ site, targetKey });

      // JUMP_IF_NULL <forward to loop-exit> — placeholder patched after we
      // emit the back-jump.
      writeOp(state, Op.JUMP_IF_NULL);
      const jinOperandSite = state.len;
      writeI32(state, 0);
      const jinAfter = state.len;

      if (span.name) {
        writeOp(state, Op.CAPTURE_VALUE_APPEND);
        writeU32(state, internString(state, span.name));
      }
      // Infinite-loop guard: if state.off didn't advance during this
      // iteration, break out. Mirrors v2 emitRepeatsSpan's
      // `if (off === __loopStart) break;` guard.
      writeOp(state, Op.JUMP_IF_OFF_EQ);
      writeU8(state, loopStartSlot);
      const jofSite = state.len;
      writeI32(state, 0);
      const jofAfter = state.len;
      // Inter-iteration whitespace (repeats children are whitespace-
      // separated by default policy).
      writeOp(state, Op.SKIP_WS);

      // JUMP back to loopTop.
      writeOp(state, Op.JUMP);
      const jbAfter = state.len + 4;
      writeI32(state, loopTop - jbAfter);

      // Loop-exit lands here.
      const loopExit = state.len;
      writeI32At(state, jinOperandSite, loopExit - jinAfter);
      writeI32At(state, jofSite, loopExit - jofAfter);
    }
    // Enforce `repeats.min` (Phase 6 follow-up #2). The captures-path emit
    // fails the production when fewer than `min` children matched. The
    // bytecode emit previously skipped this check, which let Command#0 in
    // cron succeed with zero `words` items — surfacing as `command: { type:
    // 'command' }` (instead of `null`) when the trailing optional command
    // was absent. Without the check `captures.command` is non-null on the
    // value stack, so the optional-fusion render path (the actual symptom
    // listed in this follow-up) couldn't fire either.
    //
    // For min === 0: no check needed; zero items is valid.
    // For min === 1: check that `frame.captures[span.name]` was populated.
    //   CAPTURE_VALUE_APPEND only runs after a successful loop iteration,
    //   so the field is `undefined` iff zero items matched. Use JUMP_IF_NULL
    //   (loosened to nullish) to detect that and fail.
    // For min > 1: array-length check requires an opcode we don't have
    //   (no array-length / number-compare ops in the bytecode runtime).
    //   No in-scope schema uses min > 1 on a bytecode-emitted production;
    //   throw loudly so the next schema author hears about the gap.
    const repeatsMod = span.modifiers.find((m) => m.kind === 'repeats');
    const min = repeatsMod && 'min' in repeatsMod && typeof repeatsMod.min === 'number' ? repeatsMod.min : 0;
    if (min === 1 && span.name) {
      // LOAD_CAPTURE <name>
      writeOp(state, Op.LOAD_CAPTURE);
      writeU32(state, internString(state, span.name));
      // JUMP_IF_NULL <to-fail>
      writeOp(state, Op.JUMP_IF_NULL);
      const jinMinSite = state.len;
      writeI32(state, 0);
      const jinMinAfter = state.len;
      // Non-null path: pop the loaded value (we just wanted the presence
      // check; the array stays in frame.captures for downstream render).
      writeOp(state, Op.POP);
      // JUMP <past failure block>
      writeOp(state, Op.JUMP);
      const jOverFailSite = state.len;
      writeI32(state, 0);
      const jOverFailAfter = state.len;
      // Failure block — fail the production with RETURN_NULL.
      const failTarget = state.len;
      writeI32At(state, jinMinSite, failTarget - jinMinAfter);
      writeOp(state, Op.RETURN_NULL);
      // After-failure target — the loop continues from here.
      const afterFail = state.len;
      writeI32At(state, jOverFailSite, afterFail - jOverFailAfter);
    } else if (min > 1) {
      throw new Error(
        `bytecode encoder: repeats.min > 1 not yet supported (span '${span.name ?? '?'}' has min=${min}); add an array-length opcode or extend the min-check emit`,
      );
    }
    writeOp(state, Op.SAVE_OFF);
    writeU8(state, endSlot);
    // +3 slots: startSlot, endSlot, loopStartSlot (off-equal guard).
    return nextSlot + 3;
  }

  // Single (non-repeats) call site per role.
  if (opts.isOptional) {
    // For each role, emit CALL_PRODUCTION; JUMP_IF_NULL +skip-capture.
    // On non-taken branch: CAPTURE_VALUE_FROM_STACK consumes child captures
    // into captures[name]. On taken branch: null is popped by JUMP_IF_NULL;
    // captures[name] is left absent.
    const skipPatches: number[] = [];
    const skipAfterOperands: number[] = [];
    for (const role of span.recursiveRoles) {
      const targetKey = targetKeyForRole(role);
      writeOp(state, Op.CALL_PRODUCTION);
      const site = state.len;
      writeU32(state, 0xffffffff);
      state.pendingCalls.push({ site, targetKey });

      writeOp(state, Op.JUMP_IF_NULL);
      skipPatches.push(state.len);
      writeI32(state, 0); // placeholder
      skipAfterOperands.push(state.len);
    }

    // Post-call: capture the child captures object under the span's name.
    if (span.name) {
      writeOp(state, Op.CAPTURE_VALUE_FROM_STACK);
      writeU32(state, internString(state, span.name));
    }
    writeOp(state, Op.SAVE_OFF);
    writeU8(state, endSlot);

    // Back-patch each JUMP_IF_NULL to land here (after capture).
    const skipTarget = state.len;
    for (let i = 0; i < skipPatches.length; i++) {
      const operandSite = skipPatches[i]!;
      const afterOperand = skipAfterOperands[i]!;
      writeI32At(state, operandSite, skipTarget - afterOperand);
    }
    return nextSlot + 2;
  }

  // Required (non-repeats, non-optional) recursive span. CALL_PRODUCTION
  // leaves the child captures on the value stack on success or null on
  // failure. We use a JUMP_IF_NULL to detect failure; on null we fall
  // through to RETURN_NULL (failProduction). On success we capture the
  // child via CAPTURE_VALUE_FROM_STACK.
  for (const role of span.recursiveRoles) {
    const targetKey = targetKeyForRole(role);
    writeOp(state, Op.CALL_PRODUCTION);
    const site = state.len;
    writeU32(state, 0xffffffff);
    state.pendingCalls.push({ site, targetKey });

    // JUMP_IF_NULL +<bytes-to-RETURN_NULL>. On null, branch into a
    // RETURN_NULL that fails the parent production. On non-null, fall
    // through to CAPTURE_VALUE_FROM_STACK.
    writeOp(state, Op.JUMP_IF_NULL);
    const jinOperandSite = state.len;
    writeI32(state, 0); // placeholder
    const jinAfter = state.len;

    if (span.name) {
      writeOp(state, Op.CAPTURE_VALUE_FROM_STACK);
      writeU32(state, internString(state, span.name));
    }
    // JUMP past the failure block.
    writeOp(state, Op.JUMP);
    const jOperandSite = state.len;
    writeI32(state, 0); // placeholder
    const jAfter = state.len;

    // Failure block: RETURN_NULL.
    const failTarget = state.len;
    writeI32At(state, jinOperandSite, failTarget - jinAfter);
    writeOp(state, Op.RETURN_NULL);

    // After-success target.
    const afterTarget = state.len;
    writeI32At(state, jOperandSite, afterTarget - jAfter);
  }

  writeOp(state, Op.SAVE_OFF);
  writeU8(state, endSlot);
  return nextSlot + 2;
}

// Dispatch block for a multi-prod node type. Layout:
//
//   for each alt (in dispatch order — see computeDispatchOrder):
//     SAVE_OFF 0
//     CALL_PRODUCTION <alt-offset>
//     JUMP_IF_NULL +<bytes-to-next-alt>
//     RETURN_OK
//   RETURN_NULL          (all alts failed)
//
// The runtime (Task 6.3) restores `off` from slot 0 before each retry.
//
// Dispatch order matches the TS backend's `emitGroupSpeculation` /
// `computeSpeculationOrder` in `emit/v2/dispatch.ts` so the two backends
// commit to the same alt for any ambiguous input:
//   1. Tag-restricted alts (have `.oneOf(...)` somewhere) first.
//   2. Then longest first-span literal prefix.
//   3. Then span count descending (more spans = more structural commitment —
//      this is the discriminator that makes `N-N` win over `N` for `1-5`).
//   4. Then declared order.
// Without this sort the bytecode chain-tries in declaration order and
// returns the first non-null result, which yields the SHORTEST match for
// shape-ambiguous schemas. Phase 6 follow-up #1.
function emitDispatchBlock(state: EncoderState, info: NodeTypeInfo): void {
  // We need to know, for each alt, where the NEXT alt starts so the
  // JUMP_IF_NULL operand resolves. Two-phase: write a placeholder, remember
  // the operand offset, then back-patch with the actual delta once we know
  // it. (Forward jumps within a single block — separate from the call-site
  // fixup table.)
  type Patch = { readonly operandSite: number; readonly afterOperand: number };
  const patches: Patch[] = [];

  const order = computeDispatchOrder(info.productions);
  for (const i of order) {
    const altKey = productionKey(info.name, i);

    // SAVE_OFF 0  — record entry off for restore on alt failure
    writeOp(state, Op.SAVE_OFF);
    writeU8(state, 0);

    // CALL_PRODUCTION <alt>
    writeOp(state, Op.CALL_PRODUCTION);
    const callSite = state.len;
    writeU32(state, 0xffffffff);
    state.pendingCalls.push({ site: callSite, targetKey: altKey });

    // JUMP_IF_NULL +<placeholder> — skip the RETURN_OK below if alt failed.
    writeOp(state, Op.JUMP_IF_NULL);
    const operandSite = state.len;
    writeI32(state, 0); // placeholder
    const afterOperand = state.len;
    patches.push({ operandSite, afterOperand });

    // RETURN_OK — alt succeeded.
    writeOp(state, Op.RETURN_OK);

    // Resolve this alt's patch: jump target is "the byte after RETURN_OK",
    // which is the start of the next alt (or the trailing RETURN_NULL).
    const nextAltStart = state.len;
    const rel = nextAltStart - afterOperand;
    writeI32At(state, operandSite, rel);
  }
  void patches; // patches were back-filled in-loop; kept for clarity.

  // RETURN_NULL — all alts failed.
  writeOp(state, Op.RETURN_NULL);
}

// Returns the indices of `productions` in the order the dispatch block
// should chain-try them. Mirrors the TS backend's
// `emitGroupSpeculation` / `computeSpeculationOrder` tiebreakers. Pure
// function over the production list — no global state.
function computeDispatchOrder(productions: ReadonlyArray<Production>): number[] {
  const litLen = (idx: number): number => {
    const s0 = productions[idx]!.spans[0];
    if (s0 && s0.class === 'literal' && typeof s0.text === 'string') return s0.text.length;
    return 0;
  };
  const isRestricted = (idx: number): boolean => {
    for (const span of productions[idx]!.spans) {
      if (span.refinements.some((r) => r.name === 'oneOf')) return true;
    }
    return false;
  };
  const indices = productions.map((_, i) => i);
  indices.sort((a, b) => {
    const restA = isRestricted(a);
    const restB = isRestricted(b);
    if (restA !== restB) return restA ? -1 : 1;
    const lenDelta = litLen(b) - litLen(a);
    if (lenDelta !== 0) return lenDelta;
    const spanDelta = productions[b]!.spans.length - productions[a]!.spans.length;
    if (spanDelta !== 0) return spanDelta;
    return a - b;
  });
  return indices;
}

// --- render-block emit (Task 6.4 Commit 2) ---------------------------------

// Emit the opcode sequence that, given a render frame whose frame.captures
// holds the parsed captures object, builds the rendered value for the
// declared (production, target) pair. Block ends with RENDER_RETURN.
function emitRenderBlock(
  state: EncoderState,
  body: RenderBody,
  target: string,
  production: Production,
): void {
  emitRenderBodyExpr(state, body, target, production);
  writeOp(state, Op.RENDER_RETURN);
}

// Recursively emit ops that push a single rendered value onto the stack.
// Mirrors `emit/render.ts:emitBodyExpr` but as opcodes instead of JS source.
function emitRenderBodyExpr(
  state: EncoderState,
  body: RenderBody,
  target: string,
  production: Production,
): void {
  if (body === null) {
    writeOp(state, Op.PUSH_NULL);
    return;
  }
  if (typeof body === 'string') {
    writeOp(state, Op.PUSH_STRING);
    writeU32(state, internString(state, body));
    return;
  }
  if (typeof body === 'number') {
    if (!Number.isFinite(body)) {
      writeOp(state, Op.PUSH_NULL);
      return;
    }
    writeOp(state, Op.PUSH_NUMBER);
    writeU32(state, internNumber(state, body));
    return;
  }
  if (typeof body === 'boolean') {
    writeOp(state, body ? Op.PUSH_TRUE : Op.PUSH_FALSE);
    return;
  }
  if (isStructureRef(body)) {
    emitRefExpr(state, body, target);
    return;
  }
  if (isTemplate(body)) {
    emitRenderTemplate(state, body, target, production);
    return;
  }
  if (Array.isArray(body)) {
    for (const child of body) emitRenderBodyExpr(state, child, target, production);
    writeOp(state, Op.BUILD_ARRAY);
    writeU32(state, body.length);
    return;
  }
  // Object literal — emit child values in declared key order, then a
  // BUILD_OBJECT opcode carrying the key names.
  const entries = Object.entries(body as Record<string, RenderBody>);
  for (const [, value] of entries) {
    emitRenderBodyExpr(state, value, target, production);
  }
  writeOp(state, Op.BUILD_OBJECT);
  writeU32(state, entries.length);
  for (const [key] of entries) {
    writeU32(state, internString(state, key));
  }
}

// Emit a StructureRef. For span-presence, push (captures[name] != null).
// For span-value, load captures[<name>] and route through RENDER_DISPATCH
// so a captures-object child renders to the target. Other ref kinds
// (gap, tail, raw, ends-with, comment-left/right) use synthesized capture
// keys that captures.ts already computed at parse time — we just LOAD them.
function emitRefExpr(state: EncoderState, ref: StructureRef, target: string): void {
  if (ref.__ref === 'span-presence') {
    // Not exercised by cron — keep loud for early-detection of new schemas
    // that need this path.
    throw new Error(`bytecode encoder: span-presence refs not yet supported (target '${target}')`);
  }
  const key = ref.__ref === 'span-value' ? ref.name : syntheticKey(ref);
  writeOp(state, Op.LOAD_CAPTURE);
  writeU32(state, internString(state, key));
  if (ref.__ref === 'span-value') {
    writeOp(state, Op.RENDER_DISPATCH);
    writeU32(state, internString(state, target));
  }
}

// Emit a Template body — fused string concat. For each part/slot:
//   - non-empty part → PUSH_STRING <part>
//   - slot           → LOAD_CAPTURE <name> + RENDER_DISPATCH <target>
// then CONCAT_N of all pushed pieces.
//
// Repeats-aware: for slots whose span is .repeats(...), the captured value
// is an array. RENDER_DISPATCH recursively renders each element to a
// string (for string targets) and returns an array. To produce the final
// string we need to join with the declared separator. We mark such slots
// by emitting a JOIN_OR_PASS opcode pattern: we currently inline the join
// by emitting PUSH_STRING <sep> + JOIN_TOP — but that op doesn't exist.
//
// For Commit 2 we keep it simple: CONCAT_N's runtime joins arrays with the
// span's declared separator (' ' default). To pass the separator we
// piggy-back on the value-stack: emit PUSH_STRING <sep> BEFORE the slot
// dispatch and use a special opcode (or rely on runtime convention).
// Simplest path: emit RENDER_DISPATCH normally and have CONCAT_N detect
// arrays and join them with a default ' '. Per-slot separator is deferred
// (cron's only repeats slot uses default ' ' anyway).
//
// Optional-absent fusion (Phase 6 follow-up #2). Mirrors the TS path in
// `emit/render.ts:240-263`: when an optional slot's preceding literal is
// whitespace-only (acts as an inter-span separator), both the literal AND
// the slot collapse to "" when the capture is null. Non-whitespace literals
// around an optional slot are left in place (matching the TS path).
//
// Bytecode shape (no SWAP/PEEK_BELOW ops exist, so we always concat
// internally to leave EXACTLY one value on the stack per fused unit):
//
//   fused pair (ws literal + optional slot):
//     PUSH_STRING <ws>             // [..., ws]
//     LOAD_CAPTURE <name>          // [..., ws, v]
//     JUMP_IF_NULL +nullCleanup    // pops v + branches on null
//     RENDER_DISPATCH <target>     // [..., ws, rendered_v]
//     CONCAT_N 2                   // [..., ws+rendered_v]
//     JUMP +endSkip                // skip the null path
//   nullCleanup:
//     POP                          // drop the pre-pushed ws
//     PUSH_STRING ""               // [..., ""]
//   endSkip:
//
//   solo optional slot (no preceding ws literal — e.g. it's the first slot
//   or the preceding literal carries structural punctuation):
//     LOAD_CAPTURE <name>          // [..., v]
//     JUMP_IF_NULL +nullCleanup
//     RENDER_DISPATCH <target>     // [..., rendered_v]
//     JUMP +endSkip
//   nullCleanup:
//     PUSH_STRING ""
//   endSkip:
//
// Each fused/solo unit contributes EXACTLY ONE value to the outer
// CONCAT_N count, which keeps that count static (CONCAT_N takes a u32
// operand; no opcode supports runtime-counted concat).
//
// Note: `.repeats({ min: 0 })` slots are not covered here. The captured
// value for an empty repeats slot is `[]` (not null), so JUMP_IF_NULL
// would not fire. Closing that requires a JUMP_IF_EMPTY-style opcode or
// runtime support; deferred until a real schema needs it (cron only uses
// `.optional()` for absence semantics).
function emitRenderTemplate(
  state: EncoderState,
  template: Template,
  target: string,
  production: Production,
): void {
  type LiteralPiece = { readonly kind: 'literal'; readonly text: string };
  type SlotPiece = { readonly kind: 'slot'; readonly ref: string; readonly optional: boolean };
  type Piece = LiteralPiece | SlotPiece;
  const pieces: Piece[] = [];
  const parts = template.parts;
  const slots = template.slots;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length > 0) pieces.push({ kind: 'literal', text: part });
    if (i < slots.length) {
      const slot = slots[i]!;
      const span = findSpanByName(production, slot.ref);
      const optional = span !== undefined && isOptionalLocal(span);
      pieces.push({ kind: 'slot', ref: slot.ref, optional });
    }
  }

  let pushed = 0;
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!;
    if (piece.kind === 'literal') {
      // Fuse with the next piece when it's an optional slot AND this
      // literal is purely whitespace.
      const next = i + 1 < pieces.length ? pieces[i + 1] : undefined;
      const fuse = next !== undefined
        && next.kind === 'slot'
        && next.optional
        && /^\s+$/.test(piece.text);
      if (fuse) {
        emitFusedOptionalPair(state, piece.text, (next as SlotPiece).ref, target);
        pushed++;
        i++; // skip the slot piece — consumed by the fused emit
        continue;
      }
      writeOp(state, Op.PUSH_STRING);
      writeU32(state, internString(state, piece.text));
      pushed++;
      continue;
    }
    if (!piece.optional) {
      writeOp(state, Op.LOAD_CAPTURE);
      writeU32(state, internString(state, piece.ref));
      writeOp(state, Op.RENDER_DISPATCH);
      writeU32(state, internString(state, target));
      pushed++;
      continue;
    }
    // Optional slot with no preceding fusable whitespace literal.
    emitSoloOptionalSlot(state, piece.ref, target);
    pushed++;
  }

  // If nothing was pushed, push an empty string so CONCAT_N has something.
  if (pushed === 0) {
    writeOp(state, Op.PUSH_STRING);
    writeU32(state, internString(state, ''));
    pushed = 1;
  }

  writeOp(state, Op.CONCAT_N);
  writeU32(state, pushed);
}

// --- optional-fusion helpers ----------------------------------------------

function emitFusedOptionalPair(
  state: EncoderState,
  wsLiteral: string,
  slotRef: string,
  target: string,
): void {
  // PUSH_STRING <ws>
  writeOp(state, Op.PUSH_STRING);
  writeU32(state, internString(state, wsLiteral));
  // LOAD_CAPTURE <name>
  writeOp(state, Op.LOAD_CAPTURE);
  writeU32(state, internString(state, slotRef));
  // JUMP_IF_NULL +<patched-later>
  writeOp(state, Op.JUMP_IF_NULL);
  const jinNullSite = state.len;
  writeI32(state, 0); // placeholder
  const jinAfter = state.len;
  // Non-null branch: render and concat the (ws, rendered) pair.
  writeOp(state, Op.RENDER_DISPATCH);
  writeU32(state, internString(state, target));
  writeOp(state, Op.CONCAT_N);
  writeU32(state, 2);
  // JUMP +<patched-later> over the null-cleanup block.
  writeOp(state, Op.JUMP);
  const jumpEndSite = state.len;
  writeI32(state, 0); // placeholder
  const jumpAfter = state.len;
  // Null path: drop the pre-pushed ws, push an empty string so the outer
  // CONCAT_N sees exactly one value.
  const nullLand = state.len;
  writeI32At(state, jinNullSite, nullLand - jinAfter);
  writeOp(state, Op.POP);
  writeOp(state, Op.PUSH_STRING);
  writeU32(state, internString(state, ''));
  // End of fused unit.
  const endLand = state.len;
  writeI32At(state, jumpEndSite, endLand - jumpAfter);
}

function emitSoloOptionalSlot(
  state: EncoderState,
  slotRef: string,
  target: string,
): void {
  // LOAD_CAPTURE <name>
  writeOp(state, Op.LOAD_CAPTURE);
  writeU32(state, internString(state, slotRef));
  // JUMP_IF_NULL +<patched-later>
  writeOp(state, Op.JUMP_IF_NULL);
  const jinNullSite = state.len;
  writeI32(state, 0);
  const jinAfter = state.len;
  // Non-null branch: render.
  writeOp(state, Op.RENDER_DISPATCH);
  writeU32(state, internString(state, target));
  // JUMP over null-cleanup.
  writeOp(state, Op.JUMP);
  const jumpEndSite = state.len;
  writeI32(state, 0);
  const jumpAfter = state.len;
  // Null path: push empty string.
  const nullLand = state.len;
  writeI32At(state, jinNullSite, nullLand - jinAfter);
  writeOp(state, Op.PUSH_STRING);
  writeU32(state, internString(state, ''));
  // End.
  const endLand = state.len;
  writeI32At(state, jumpEndSite, endLand - jumpAfter);
}

// Returns true when the span carries an `.optional()` modifier. Narrower
// than `isAbsentAllowedSpan` (no `.repeats({min:0})` branch) because the
// fusion shape relies on the runtime capture being `null` for absent —
// repeats slots produce `[]` instead and won't trip JUMP_IF_NULL.
function isOptionalLocal(span: ResolvedSpan): boolean {
  for (const m of span.modifiers) {
    if (m.kind === 'optional') return true;
  }
  return false;
}

// --- stringify-block emit (Task 6.4 Commit 3) ------------------------------

// Emit a per-(production, target) inverse stringify block. Strategy:
//   1. Top of value stack is the input VALUE being stringified.
//   2. Walk the InverseIR: assertions on object fields / scalar matching;
//      capture-population from refs; template literal-segment scanning.
//   3. After population, dispatch into the production's render block to
//      rebuild the source string (using the freshly-populated captures).
//   4. RENDER_RETURN.
//
// The block uses RETURN_NULL on assertion failure so the dispatcher's
// chain-try (next production) gets a null on the value stack and skips.
// On success, RENDER_RETURN replaces the value at frame top with the
// produced source string.
//
// Layout note: stringify frames are pushed by STRINGIFY_DISPATCH. The
// frame's frame.captures starts empty ({}). The block populates it from
// the input value (which sits on top of the value stack at frame entry).
// Emit the inverse stringify block for one (production, target) pair.
// The `target` here is the SHAPE of the input value (e.g., 'ast'); the
// block always REBUILDS to source via the 'source' render body. This
// matches the TS path's `__rebuild_<NodeType>_<idx>(captures)` target-
// independent rebuild step.
function emitStringifyBlock(
  state: EncoderState,
  ir: InverseIR,
  target: string,
  production: Production,
  prodIdx: number,
): void {
  state.currentTarget = target;
  try {
    // Phase 0: stringify frames enter with frame.captures = null. The
    // block needs a fresh captures object so the inverse IR can populate
    // it. PUSH_NEW_CAPTURES creates `{ __production: prodKey }` and
    // assigns it to frame.captures. (The __production marker on captures
    // is unused by the rebuild path but harmless.)
    writeOp(state, Op.PUSH_NEW_CAPTURES);
    writeU32(state, internString(state, productionKey(production.nodeType, prodIdx)));
    // PUSH_NEW_CAPTURES pushes the captures onto the value stack — but
    // we need the input VALUE there for the discriminator to peek at.
    // Pop the captures off the stack (still referenced from
    // frame.captures).
    writeOp(state, Op.POP);

    // Phase 1: walk the IR. Value-on-stack-top at start; the inverse
    // logic peeks/asserts on it and populates frame.captures from refs.
    // Top-level dispatch: call emitInverseObject directly when the IR
    // is an object so the must-be-present/absent discriminator pass
    // fires at the OUTER alt-discrimination layer. Nested object IRs
    // (inside an object's field) route through emitInverseIR's `case
    // 'object'` which passes isTopLevel:false.
    if (ir.kind === 'object') {
      emitInverseObject(state, ir.fields, production, /* isTopLevel */ true);
    } else {
      emitInverseIR(state, ir, production);
    }

    // Phase 2: pop the input value off the value stack — captures now
    // holds everything we need; the rebuild output is built fresh from
    // captures.
    writeOp(state, Op.POP);

    // Phase 3: inline the 'source' render block body so it executes
    // against THIS frame's captures (already populated by the inverse
    // IR). Stringify always REBUILDS to source — the target argument
    // here ('ast', etc.) identifies the shape of the input value, not
    // the output shape. The trailing RENDER_RETURN completes the
    // stringify frame and surfaces the rebuilt source string as the
    // result.
    emitRenderBlockBodyInline(state, 'source', production, prodIdx);
  } finally {
    state.currentTarget = undefined;
  }
}

// Emit just the body of a production's render block WITHOUT the RENDER_RETURN
// at the end. Used by stringify so we run the render expression in the
// CURRENT frame (re-using its captures) and let the stringify frame's
// own RENDER_RETURN handle the final return.
function emitRenderBlockBodyInline(
  state: EncoderState,
  target: string,
  production: Production,
  prodIdx: number,
): void {
  const entry = production.renders.get(target);
  if (!entry) {
    throw new Error(`bytecode encoder: stringify needs render body for '${productionKey(production.nodeType, prodIdx)}:${target}'`);
  }
  emitRenderBodyExpr(state, entry.body, target, production);
  writeOp(state, Op.RENDER_RETURN);
}

// Returns true if the inverse IR has a shape the bytecode emitter supports.
// Used by the Commit 2 path to skip unsupported targets (template-form
// inverses, array) without crashing the encode. Non-string scalar
// literals (bool / number / null) are now supported as discriminator
// fields via ASSERT_TOP_BOOL_EQ / ASSERT_TOP_NUMBER_EQ / ASSERT_TOP_NULL.
function canEncodeInverse(ir: InverseIR): boolean {
  switch (ir.kind) {
    case 'scalar':
      return isSupportedScalar(ir.value);
    case 'ref':
      return true;
    case 'object':
      for (const field of ir.fields) {
        if (field.kind === 'literal') {
          if (!isSupportedScalar(field.value)) return false;
        } else {
          if (!canEncodeInverse(field.inverse)) return false;
        }
      }
      return true;
    case 'array':
      return false;
    case 'template':
      // Phase 6 follow-up #3 — template-form inverses encode as a single
      // INVERSE_TEMPLATE macro opcode. The runtime handler implements
      // walkInverseTemplate against frame.captures.
      return true;
    case 'dynKey':
    case 'merge':
      // Flat-object inverse IR kinds (added by the json-target work) are
      // not yet supported by the bytecode encoder. The captures-path
      // inverse emitter handles them; the bytecode path falls back.
      return false;
    case 'presence':
      // Span-presence inverse: not yet wired into the bytecode encoder.
      // The captures-path inverse emitter handles it; the bytecode path
      // falls back when a production's inverse uses this kind.
      return false;
  }
}

// Recursively emit ops that match-and-populate from the input value sitting
// on top of the value stack. Each kind of IR either asserts a property of
// the value (fail with RETURN_NULL on mismatch) OR writes a capture entry.
// The input value remains on TOP after the block (so the caller can chain
// or POP). Object/array IR variants leave the parent value on top via PEEK.
//
// `production` is the current stringify production — used to look up span
// definitions when we encounter a `ref` IR so we can decide whether the
// capture targets a primitive (just write the value) or a recursive sub-
// AST (stringify-dispatch first, then write the rebuilt source string).
function emitInverseIR(
  state: EncoderState,
  ir: InverseIR,
  production: Production,
  refTargetCapture?: string,
): void {
  switch (ir.kind) {
    case 'scalar':
      // Compare top of stack to the literal scalar; fail on mismatch.
      emitAssertScalar(state, ir.value);
      return;
    case 'ref':
      // Write the value into captures[<name>]. For recursive sub-AST
      // values (when the matching span has recursiveRoles), recursively
      // STRINGIFY_DISPATCH first so the captures slot holds a rebuilt
      // source string rather than the raw child AST. Non-recursive refs
      // (primitives) are written as-is and rebuild's __rebuildSlot does
      // String(v) coercion at concat time.
      emitWriteRefValue(state, production, ir.capture, refTargetCapture);
      return;
    case 'object':
      // Nested emitInverseObject calls pass isTopLevel: false so the
      // sibling-only absence check doesn't double-fire from inside a
      // nested object (it would compare against the OUTER production's
      // sibling field-names, which makes no sense at the nested layer).
      emitInverseObject(state, ir.fields, production, /* isTopLevel */ false);
      return;
    case 'array':
      emitInverseArray(state, ir.elements);
      return;
    case 'template':
      emitInverseTemplate(state, ir.segments, ir.captures, production);
      return;
  }
}

function emitInverseObject(
  state: EncoderState,
  fields: ReadonlyArray<InverseField>,
  production: Production,
  isTopLevel: boolean = true,
): void {
  // Phase 6 — discriminator strengthening. Each multi-alt node type's
  // inverse alts often differ only in which fields they declare (e.g.
  // CSS AtRule#0 carries `nodes` for `@media { ... }`-style blocks,
  // AtRule#1 omits it for `@charset "..."`-style at-rules). Without an
  // absence check on the sibling-only fields, the first alt tried wins
  // every time and emits the wrong shape (`@charset "UTF-8" {}`
  // instead of `@charset "UTF-8"`). Mirror of rust emit's
  // buildDiscriminatorChecks's absence pass.
  if (isTopLevel) {
    emitAbsenceChecksForSiblingOnlyFields(state, fields, production);
  }
  // Each field reads value[name] (via PEEK_FIELD which leaves value on top
  // and adds name's value on top of THAT). Then either asserts a scalar or
  // recurses into a nested IR. Mismatch → RETURN_NULL via ASSERT path.
  for (const field of fields) {
    writeOp(state, Op.PEEK_FIELD);
    writeU32(state, internString(state, field.name));
    if (field.kind === 'literal') {
      emitAssertScalar(state, field.value);
      // emitAssertScalar pops the field value on success.
    } else {
      // The field's IR may be a leaf `ref` — pass the field name through
      // so emitWriteRefValue can match it against a span (the span name
      // matches the field name for object-shaped renders).
      emitInverseIR(state, field.inverse, production, field.name);
      // After recursion, the nested IR may have left the field value on top.
      // Pop it so we land back at the parent value.
      writeOp(state, Op.POP);
    }
  }
}

// Emit asserts that distinguish this alt from siblings whose literal-
// field maps would tie. Two passes:
//   1. ABSENCE — every field name declared by some sibling but NOT by
//      this alt → assert value[name] is null/undefined.
//   2. PRESENCE — every field name declared by this alt but NOT by some
//      sibling → assert value[name] is NOT null/undefined.
// Without (2), a wider alt (e.g. CSS AtRule#0 with `nodes`) silently
// matches inputs that lack the extra field, instead of falling through
// to the narrower alt (AtRule#1 without `nodes`). Mirror of v2's
// emit/inverse.ts (L1300+) which builds the same dual condition.
function emitAbsenceChecksForSiblingOnlyFields(
  state: EncoderState,
  fields: ReadonlyArray<InverseField>,
  production: Production,
): void {
  const target = state.currentTarget;
  if (target === undefined) return;
  const info = state.schema.nodeTypes.get(production.nodeType);
  if (info === undefined || info.productions.length <= 1) return;
  const myFieldNames = new Set(fields.map((f) => f.name));
  const mustBeAbsent = new Set<string>();
  const mustBePresent = new Set<string>();
  for (const sib of info.productions) {
    if (sib === production) continue;
    const sibEntry = sib.renders.get(target);
    if (!sibEntry || !sibEntry.inverseDerived) continue;
    const sibIr = sibEntry.inverseDerived;
    if (sibIr.kind !== 'object') continue;
    const sibFieldNames = new Set(sibIr.fields.map((f) => f.name));
    for (const n of sibFieldNames) {
      if (!myFieldNames.has(n)) mustBeAbsent.add(n);
    }
    for (const n of myFieldNames) {
      if (!sibFieldNames.has(n)) mustBePresent.add(n);
    }
  }
  for (const name of mustBeAbsent) {
    writeOp(state, Op.PEEK_FIELD);
    writeU32(state, internString(state, name));
    writeOp(state, Op.ASSERT_TOP_NULL);
  }
  for (const name of mustBePresent) {
    // Skip literal fields: they're always present at runtime (the schema
    // sets them) — the must-be-present check would always pass and
    // wastes bytes. Only ref fields can legitimately be absent.
    const f = fields.find((field) => field.name === name);
    if (f !== undefined && f.kind === 'literal') continue;
    writeOp(state, Op.PEEK_FIELD);
    writeU32(state, internString(state, name));
    writeOp(state, Op.ASSERT_TOP_NOT_NULL);
  }
}

function emitInverseArray(state: EncoderState, _elements: ReadonlyArray<InverseIR>): void {
  // Defensive placeholder — cron doesn't use array-form inverse IRs.
  throw new Error(`bytecode encoder: array-form inverse IR not yet supported`);
}

// Emit the INVERSE_TEMPLATE macro opcode for a template-form inverse.
// Layout (also documented at Op.INVERSE_TEMPLATE):
//   u32 numSegs, u32 numCaps, u32 targetIdx
//   numSegs × u32 stringPool refs (segment literals)
//   numCaps × { u32 nameIdx, u32 roleIdx_or_max, u8 flags }
//     roleIdx_or_max = 0xFFFFFFFF for non-recursive (leaf) captures
//     flags bit 0 = isOptional; bits 1-7 reserved
//
// The runtime peeks top-of-stack (must be string), populates
// frame.captures from the scan, and leaves the input string on top so
// the caller's Phase 2 POP (in emitStringifyBlock) cleans it.
function emitInverseTemplate(
  state: EncoderState,
  segments: ReadonlyArray<string>,
  captures: ReadonlyArray<string>,
  production: Production,
): void {
  if (state.currentTarget === undefined) {
    throw new Error(`bytecode encoder: emitInverseTemplate called without state.currentTarget`);
  }
  // Per-capture metadata: role (if recursive) + optionality.
  type CapMeta = { readonly nameIdx: number; readonly roleIdx: number; readonly optional: boolean };
  const target = state.currentTarget;
  const meta: CapMeta[] = captures.map((capName) => {
    const span = findSpanByName(production, capName);
    const optional = span !== undefined && isAbsentAllowedSpan(span);
    if (span && span.recursiveRoles.length > 0) {
      // Multi-role template capture (CSS Stylesheet's `nodes` of(Comment,
      // AtRule, Rule, Declaration)) maps to a synthetic dispatch key
      // `<role1>|<role2>|...:<target>`. The runtime's stringifySlot
      // chain-tries the combined offset list; each production carries
      // its own type-discriminator so wrong-typed alts fall through.
      // Population deferred to encodeSchema's post-pass — see
      // pendingSyntheticDispatchKeys doc on EncoderState.
      let role: string;
      if (span.recursiveRoles.length === 1) {
        role = span.recursiveRoles[0]!;
      } else {
        const sortedRoles = [...span.recursiveRoles].sort();
        role = sortedRoles.join('|');
        state.pendingSyntheticDispatchKeys.add(`${role}:${target}`);
      }
      return { nameIdx: internString(state, capName), roleIdx: internString(state, role), optional };
    }
    return { nameIdx: internString(state, capName), roleIdx: INVERSE_TEMPLATE_ROLE_NONE, optional };
  });
  writeOp(state, Op.INVERSE_TEMPLATE);
  writeU32(state, segments.length);
  writeU32(state, captures.length);
  writeU32(state, internString(state, state.currentTarget));
  for (const seg of segments) {
    writeU32(state, internString(state, seg));
  }
  for (const m of meta) {
    writeU32(state, m.nameIdx);
    writeU32(state, m.roleIdx);
    writeU8(state, m.optional ? 1 : 0);
  }
}

// Write the top-of-stack value into captures[<captureName>]. If the
// matching span declares recursive roles, recursively STRINGIFY_DISPATCH
// the value first so the stored entry is a rebuilt source string (not
// the raw child AST node). For arrays of recursive children (.repeats()
// spans), STRINGIFY_DISPATCH inside the runtime walks the array element-
// wise. After capture, push PUSH_NULL so the caller's POP keeps the
// stack invariant ("value remains on top for chaining").
function emitWriteRefValue(
  state: EncoderState,
  production: Production,
  captureName: string,
  spanName: string | undefined,
): void {
  // Locate the span that captures into `<spanName>`. For object-form
  // inverses the field name matches the span name; for nested refs we
  // pass the field-name as `spanName` from emitInverseObject.
  const effectiveName = spanName ?? captureName;
  const span = production.spans.find((s) => s.name === effectiveName);
  const recursive = span !== undefined && span.recursiveRoles.length > 0;

  if (recursive) {
    const roles = span!.recursiveRoles;
    if (state.currentTarget === undefined) {
      throw new Error(`bytecode encoder: emitWriteRefValue called without state.currentTarget`);
    }
    const target = state.currentTarget;
    // For single-role spans the dispatcher key is just `<role>:<target>`
    // and the runtime's stringifySlot chain-tries that role's productions.
    // For MULTI-ROLE spans (CSS Stylesheet.nodes = of(Comment, AtRule,
    // Rule, Declaration)), build a synthetic key like
    // `Comment|AtRule|Rule|Declaration:<target>` and populate it with
    // the concatenated offset list of every role's productions. The
    // runtime treats the synthetic key like any other and walks the
    // combined list; each production carries its own discriminator
    // (type-field assert), so wrong-typed entries fall through cleanly.
    let dispatchKey: string;
    if (roles.length === 1) {
      dispatchKey = roles[0]!;
    } else {
      // Sorted to give the synthetic key a stable identity regardless
      // of source-order in the of() call. Two multi-role spans with
      // the same role set share one combined offset list.
      const sortedRoles = [...roles].sort();
      dispatchKey = sortedRoles.join('|');
      // Defer the actual offset-list build to the post-pass at the end
      // of encodeSchema. Resolving at request time would miss offsets
      // for any role whose stringify block hasn't emitted yet — e.g.
      // when Rule's nodes ref is processed BEFORE AtRule's blocks
      // emit, the combined list would lack AtRule entries.
      state.pendingSyntheticDispatchKeys.add(`${dispatchKey}:${target}`);
    }
    writeOp(state, Op.STRINGIFY_DISPATCH);
    writeU32(state, internString(state, dispatchKey));
    writeU32(state, internString(state, target));
  }
  writeOp(state, Op.CAPTURE_VALUE_FROM_STACK);
  writeU32(state, internString(state, captureName));
  // Push null placeholder so the caller's POP balances the stack
  // (it expects the input value to still be on top after the IR walk).
  writeOp(state, Op.PUSH_NULL);
}

// Pop top of stack and assert it equals the literal scalar. For string
// scalars we emit ASSERT_TOP_STRING_EQ. For non-string scalars (number/
// bool/null) we deliberately punt — cron's inverse only uses string
// discriminators.
function emitAssertScalar(state: EncoderState, value: string | number | boolean | null): void {
  if (typeof value === 'string') {
    writeOp(state, Op.ASSERT_TOP_STRING_EQ);
    writeU32(state, internString(state, value));
    return;
  }
  if (typeof value === 'boolean') {
    writeOp(state, Op.ASSERT_TOP_BOOL_EQ);
    writeU8(state, value ? 1 : 0);
    return;
  }
  if (typeof value === 'number') {
    writeOp(state, Op.ASSERT_TOP_NUMBER_EQ);
    writeU32(state, internNumber(state, value));
    return;
  }
  if (value === null) {
    writeOp(state, Op.ASSERT_TOP_NULL);
    return;
  }
  throw new Error(`bytecode encoder: unsupported scalar type for assert (value: ${JSON.stringify(value)})`);
}

function isSupportedScalar(value: unknown): boolean {
  return (
    typeof value === 'string'
    || typeof value === 'boolean'
    || typeof value === 'number'
    || value === null
  );
}

// Stringify dispatcher is performed in the runtime (see
// `runStringifyDispatch` in runtime.ts) rather than encoded as bytecode.
// The runtime reads `stringifyOffsetsByNodeType` to chain-try each
// production's stringify block, returning the first non-null result.
// This keeps the chain-try semantics simple (no value-stack juggling
// across alts) and matches how `renderSlot` performs polymorphic
// dispatch from JS.

// --- helpers ---------------------------------------------------------------

function mapClassKind(cls: string): ScanClassKind {
  switch (cls) {
    case 'ident': return ScanClassKind.IDENT;
    case 'number': return ScanClassKind.NUMBER;
    case 'hex': return ScanClassKind.HEX;
    case 'string': return ScanClassKind.STRING;
    case 'comment': return ScanClassKind.COMMENT;
    case 'operator': return ScanClassKind.OPERATOR;
    default:
      throw new Error(`bytecode encoder: SCAN_CLASS does not yet support class '${cls}' (Task 6.2 covers cron primitives only)`);
  }
}

// Compute the dispatch / direct-call key for a recursive role. We always
// prefer the multi-prod dispatch entry when available; this keeps callers
// agnostic about how the target is broken into alts.
function targetKeyForRole(role: string): string {
  // The encoder doesn't have schema.nodeTypes in scope here (avoids a
  // schema-wide threading), but it knows that:
  //   - if the schema has only one alt for a role, productionOffsets will
  //     contain `<role>#0` and NO `<role>#dispatch` entry
  //   - if it has multiple alts, productionOffsets will contain
  //     `<role>#dispatch`
  // The forward-ref patch step (in encodeSchema) checks both keys in order,
  // so we encode the dispatch key here and fall back to #0 if missing.
  return `${role}#dispatch`;
}

// --- low-level write helpers ----------------------------------------------

function writeOp(state: EncoderState, op: Op): void {
  ensureCapacity(state, 1);
  // OPERAND_SIZES sanity in dev: if the table is missing this op the encoder
  // is calling an opcode it doesn't know how to advance past. Defensive
  // check — cheap, no allocation in the steady state.
  if (!(op in OPERAND_SIZES)) {
    throw new Error(`bytecode encoder: opcode 0x${op.toString(16)} missing from OPERAND_SIZES`);
  }
  state.buf[state.len++] = op & 0xff;
}

function writeU8(state: EncoderState, v: number): void {
  ensureCapacity(state, 1);
  state.buf[state.len++] = v & 0xff;
}

function writeU32(state: EncoderState, v: number): void {
  ensureCapacity(state, 4);
  // Little-endian u32.
  state.buf[state.len++] = v & 0xff;
  state.buf[state.len++] = (v >>> 8) & 0xff;
  state.buf[state.len++] = (v >>> 16) & 0xff;
  state.buf[state.len++] = (v >>> 24) & 0xff;
}

function writeI32(state: EncoderState, v: number): void {
  // Two's complement — same byte layout as u32, the runtime decodes via
  // (v << 0) to sign-extend.
  writeU32(state, v >>> 0);
}

function writeU32At(state: EncoderState, offset: number, v: number): void {
  state.buf[offset] = v & 0xff;
  state.buf[offset + 1] = (v >>> 8) & 0xff;
  state.buf[offset + 2] = (v >>> 16) & 0xff;
  state.buf[offset + 3] = (v >>> 24) & 0xff;
}

function writeI32At(state: EncoderState, offset: number, v: number): void {
  writeU32At(state, offset, v >>> 0);
}

function ensureCapacity(state: EncoderState, extra: number): void {
  const needed = state.len + extra;
  if (needed <= state.buf.length) return;
  let cap = state.buf.length;
  while (cap < needed) cap *= 2;
  const grown = new Uint8Array(cap);
  grown.set(state.buf);
  state.buf = grown;
}

// Intern a string in the pool; returns its index. Insertion order is the
// final pool order.
function internString(state: EncoderState, s: string): number {
  const existing = state.strings.get(s);
  if (existing !== undefined) return existing;
  const idx = state.strings.size;
  state.strings.set(s, idx);
  return idx;
}

// Reserved for future PUSH_NUMBER_FIELD emit. Not called by Task 6.2's
// encoder (cron doesn't bake number constants into captures). Kept module-
// private to avoid exporting a helper whose parameter type (EncoderState)
// is not part of the public API — Task 6.3+ can re-export both together.
function internNumber(state: EncoderState, n: number): number {
  const existing = state.numbers.get(n);
  if (existing !== undefined) return existing;
  const idx = state.numbers.size;
  state.numbers.set(n, idx);
  return idx;
}
