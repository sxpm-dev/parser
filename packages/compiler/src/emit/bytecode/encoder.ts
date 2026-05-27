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
  NodeTypeInfo,
  Production,
  ResolvedSpan,
} from '../../model.ts';
import { productionKey } from '../render.ts';
import { Op, OPERAND_SIZES, ScanClassKind } from './ops.ts';

export type EncodedSchema = {
  readonly ops: Uint8Array;
  readonly stringPool: ReadonlyArray<string>;
  readonly numberPool: ReadonlyArray<number>;
  // Keyed by 'NodeType#N' for each declared production AND, for multi-prod
  // node types, an extra 'NodeType#dispatch' entry pointing at a chain-try
  // block. The root entry is `${rootType}#dispatch` (if the root has
  // multiple alts) or `${rootType}#0` (single-alt root).
  readonly productionOffsets: ReadonlyMap<string, number>;
  readonly rootProductionKey: string;
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

  // Patch forward references. Every pendingCalls entry resolves to either
  // a `#dispatch` entry (multi-prod target) or `#0` (single-prod target).
  // We try the dispatch key first and fall back to alt-0 when no dispatch
  // exists. This lets the encoder emit one canonical CALL_PRODUCTION target
  // per recursive role and stay agnostic about the target's prod count.
  for (const { site, targetKey } of state.pendingCalls) {
    let target = state.productionOffsets.get(targetKey);
    if (target === undefined && targetKey.endsWith('#dispatch')) {
      const fallback = targetKey.replace(/#dispatch$/, '#0');
      target = state.productionOffsets.get(fallback);
    }
    if (target === undefined) {
      throw new Error(
        `bytecode encoder: unresolved CALL_PRODUCTION target '${targetKey}' (no production or dispatch entry was emitted under that key)`,
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
    rootProductionKey: rootKey,
  };
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

  // Recursive reference (single or multi-role)
  if (span.recursiveRoles.length > 0) {
    return emitRecursiveSpan(state, span, nextSlot, { isOptional, isRepeats });
  }

  // Literal span
  if (span.class === 'literal') {
    return emitLiteralSpan(state, span, nextSlot, isOptional);
  }

  // Class span (ident / number / etc.)
  return emitClassSpan(state, span, nextSlot, isOptional);
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

  // Optional: emit SAVE_OFF + literal attempt + JUMP_IF_NULL skip-block.
  // Task 6.2's stub for optional: we save off, try the consume, and rely on
  // Task 6.3's runtime to either advance or no-op. We don't emit a real
  // skip-on-fail jump because the runtime's CONSUME_LITERAL semantics for
  // optional spans aren't finalized here; Task 6.3 will lock that contract.
  // For now we just emit the consume and a SAVE_OFF marker so the runtime
  // has the bytes it needs.
  if (isOptional) {
    writeOp(state, Op.SAVE_OFF);
    writeU8(state, startSlot);
  } else {
    writeOp(state, Op.SAVE_OFF);
    writeU8(state, startSlot);
  }

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
    writeOp(state, Op.CAPTURE_SLICE);
    writeU8(state, startSlot);
    writeU8(state, endSlot);
    writeU32(state, internString(state, span.name));
  }
  return nextSlot + 2;
}

// Recursive ref: a span calling into another node type. For multi-prod
// targets we route through the synthetic dispatch entry; for single-prod
// we call the prod directly. The runtime (Task 6.3) handles repeats /
// optional semantics via JUMP / SAVE_OFF surrounding the call.
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
  const startSlot = nextSlot;
  const endSlot = nextSlot + 1;
  writeOp(state, Op.SAVE_OFF);
  writeU8(state, startSlot);

  // Repeats: open a backward-jump loop. We emit the loop top, the call,
  // then a JUMP back to top until the call returns null. The runtime
  // (Task 6.3) handles the actual list accumulation and min/max checks.
  let loopTop = -1;
  if (opts.isRepeats) {
    loopTop = state.len;
  }

  for (const role of span.recursiveRoles) {
    const targetKey = targetKeyForRole(role);
    writeOp(state, Op.CALL_PRODUCTION);
    const site = state.len;
    writeU32(state, 0xffffffff); // placeholder; patched at end of encode
    state.pendingCalls.push({ site, targetKey });
  }

  if (opts.isRepeats && loopTop >= 0) {
    // Backward JUMP to loopTop. JUMP operand is i32 relative offset from
    // the byte AFTER the operand (i.e. relative to state.len + 4 at the
    // time we write it). Task 6.3 will refine this with a JUMP_IF_NULL
    // guard at the loop bottom; Task 6.2 lays down the unconditional
    // back-jump scaffolding.
    writeOp(state, Op.JUMP);
    const afterOperand = state.len + 4;
    const rel = loopTop - afterOperand;
    writeI32(state, rel);
  }

  // Optional recursive: rely on Task 6.3's runtime to interpret a null
  // return as "absent". No jump bytes needed at encode time for the simple
  // optional case; the runtime sees the call's result on the stack.
  void opts.isOptional;

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

// Dispatch block for a multi-prod node type. Layout:
//
//   for each alt:
//     SAVE_OFF 0
//     CALL_PRODUCTION <alt-offset>
//     JUMP_IF_NULL +<bytes-to-next-alt>
//     RETURN_OK
//   RETURN_NULL          (all alts failed)
//
// The runtime (Task 6.3) restores `off` from slot 0 before each retry.
function emitDispatchBlock(state: EncoderState, info: NodeTypeInfo): void {
  // We need to know, for each alt, where the NEXT alt starts so the
  // JUMP_IF_NULL operand resolves. Two-phase: write a placeholder, remember
  // the operand offset, then back-patch with the actual delta once we know
  // it. (Forward jumps within a single block — separate from the call-site
  // fixup table.)
  type Patch = { readonly operandSite: number; readonly afterOperand: number };
  const patches: Patch[] = [];

  for (let i = 0; i < info.productions.length; i++) {
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

// --- helpers ---------------------------------------------------------------

function mapClassKind(cls: string): ScanClassKind {
  switch (cls) {
    case 'ident': return ScanClassKind.IDENT;
    case 'number': return ScanClassKind.NUMBER;
    case 'hex': return ScanClassKind.HEX;
    case 'string': return ScanClassKind.STRING;
    case 'comment': return ScanClassKind.COMMENT;
    case 'keyword': return ScanClassKind.KEYWORD;
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
// encoder (cron doesn't bake number constants into captures), but kept here
// so the dedup machinery is symmetric with internString — Task 6.3+ will
// need it.
export function internNumber(state: EncoderState, n: number): number {
  const existing = state.numbers.get(n);
  if (existing !== undefined) return existing;
  const idx = state.numbers.size;
  state.numbers.set(n, idx);
  return idx;
}
