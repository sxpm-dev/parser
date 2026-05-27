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
import { syntheticKey } from '../captures.ts';
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
  // Keyed by '<NodeType>#<N>:<target>'. Points at the per-(production,
  // target) render block. Produced by Task 6.4.
  readonly renderOffsets: ReadonlyMap<string, number>;
  // Keyed by '<NodeType>#<N>:<target>'. Points at the per-(production,
  // target) inverse stringify block. Produced by Task 6.4 Commit 3.
  readonly stringifyOffsets: ReadonlyMap<string, number>;
  // Keyed by target name. Points at the per-target stringify dispatcher
  // (chain-try over each production of the root NodeType). Used by
  // runStringify as the entry point.
  readonly stringifyDispatcherOffsets: ReadonlyMap<string, number>;
  readonly rootProductionKey: string;
  // Sorted list of declared render targets (e.g. ['ast', 'source']).
  readonly targets: ReadonlyArray<string>;
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
  // Resolved per-target stringify dispatcher offsets.
  stringifyDispatcherOffsets: Map<string, number>;
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
    stringifyDispatcherOffsets: new Map(),
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
        state.stringifyOffsets.set(key, state.len);
        emitStringifyBlock(state, entry.inverseDerived, target, prod, i);
      }
    }
  }

  // Per-target stringify dispatcher (sits over the ROOT type's productions).
  // Layout per target: chain-try each root production, taking the first
  // whose discriminator block succeeds. Only emit a dispatcher if at least
  // one production has an encodable inverse.
  const rootInfo0 = schema.nodeTypes.get(schema.rootType);
  if (rootInfo0) {
    for (const target of targets) {
      const hasAny = rootInfo0.productions.some((p) => {
        const ir = p.renders.get(target)?.inverseDerived;
        return ir !== undefined && canEncodeInverse(ir);
      });
      if (!hasAny) continue;
      state.stringifyDispatcherOffsets.set(target, state.len);
      emitStringifyDispatcher(state, rootInfo0, target);
    }
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
    stringifyDispatcherOffsets: state.stringifyDispatcherOffsets,
    rootProductionKey: rootKey,
    targets,
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
    writeOp(state, Op.CAPTURE_SLICE);
    writeU8(state, startSlot);
    writeU8(state, endSlot);
    writeU32(state, internString(state, span.name));
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
    for (const role of span.recursiveRoles) {
      const loopTop = state.len;
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
    }
    writeOp(state, Op.SAVE_OFF);
    writeU8(state, endSlot);
    return nextSlot + 2;
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
// Optional-fusion (preceding whitespace literal suppressed when optional
// slot is absent) is NOT implemented yet — Task 6.4 plan defers it.
function emitRenderTemplate(
  state: EncoderState,
  template: Template,
  target: string,
  production: Production,
): void {
  const parts = template.parts;
  const slots = template.slots;
  let pushed = 0;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length > 0) {
      writeOp(state, Op.PUSH_STRING);
      writeU32(state, internString(state, part));
      pushed++;
    }
    if (i < slots.length) {
      const slot = slots[i]!;
      writeOp(state, Op.LOAD_CAPTURE);
      writeU32(state, internString(state, slot.ref));
      writeOp(state, Op.RENDER_DISPATCH);
      writeU32(state, internString(state, target));
      pushed++;
    }
    void production; // reserved for fusion (currently unused)
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
function emitStringifyBlock(
  state: EncoderState,
  ir: InverseIR,
  target: string,
  production: Production,
  prodIdx: number,
): void {
  // Phase 1: walk the IR. Value-on-stack-top at start; ends with the same
  // value still on top (we leave it for the caller — discriminators pop it
  // via POP/ASSERT). After this phase, captures (frame.captures) is
  // populated.
  emitInverseIR(state, ir);

  // Phase 2: pop the input value off the value stack — we consumed all
  // the info we need; the render output is built fresh from captures.
  writeOp(state, Op.POP);

  // Phase 3: dispatch into the production's render block to rebuild source.
  // We can't use RENDER_DISPATCH here (that's keyed by __production on
  // captures, which we set explicitly below). Instead: push a synthetic
  // captures object that includes the __production key, then RENDER_DISPATCH.
  //
  // Simpler approach: directly inline a CALL into the render block. To
  // achieve this we need an opcode that calls into a render block with
  // the CURRENT frame's captures. For now, we set frame.captures.__production
  // and use RENDER_DISPATCH — push the captures onto the stack and route.
  //
  // We add a small helper: set captures.__production via PUSH_LITERAL_FIELD,
  // then push the captures onto the stack via a new pattern: LOAD_CAPTURES_SELF
  // (not in the opcode set). Avoid adding a new opcode: instead, encode the
  // render block's body INLINE here so the same frame's captures is used.
  emitRenderBlockBodyInline(state, target, production, prodIdx);
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
// inverses, array, non-string scalars) without crashing the encode.
function canEncodeInverse(ir: InverseIR): boolean {
  switch (ir.kind) {
    case 'scalar':
      return typeof ir.value === 'string';
    case 'ref':
      return true;
    case 'object':
      for (const field of ir.fields) {
        if (field.kind === 'literal') {
          if (typeof field.value !== 'string') return false;
        } else {
          if (!canEncodeInverse(field.inverse)) return false;
        }
      }
      return true;
    case 'array':
      return false;
    case 'template':
      return false;
  }
}

// Recursively emit ops that match-and-populate from the input value sitting
// on top of the value stack. Each kind of IR either asserts a property of
// the value (fail with RETURN_NULL on mismatch) OR writes a capture entry.
// The input value remains on TOP after the block (so the caller can chain
// or POP). Object/array IR variants leave the parent value on top via PEEK.
function emitInverseIR(state: EncoderState, ir: InverseIR): void {
  switch (ir.kind) {
    case 'scalar':
      // Compare top of stack to the literal scalar; fail on mismatch.
      emitAssertScalar(state, ir.value);
      return;
    case 'ref':
      // Write the entire value into captures[<name>]. Doesn't consume it.
      emitWriteCaptureFromTop(state, ir.capture);
      return;
    case 'object':
      emitInverseObject(state, ir.fields);
      return;
    case 'array':
      emitInverseArray(state, ir.elements);
      return;
    case 'template':
      // Template-based inverse: scan literal segments in the string value,
      // assigning text between segments to the named captures. Cron doesn't
      // exercise template inverses end-to-end (its render bodies are
      // discriminated by object 'type' fields), so we punt: the template
      // inverse from cron's `source` target is structurally there but the
      // PUBLIC stringify path always uses the AST (object) form. For Task
      // 6.4 commit 3 we only need to wire AST stringify. Defensive:
      throw new Error(`bytecode encoder: template-form inverse stringify not yet wired (cron exercises object-form discriminators only)`);
  }
}

function emitInverseObject(state: EncoderState, fields: ReadonlyArray<InverseField>): void {
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
      emitInverseIR(state, field.inverse);
      // After recursion, the nested IR may have left the field value on top.
      // Pop it so we land back at the parent value.
      writeOp(state, Op.POP);
    }
  }
}

function emitInverseArray(state: EncoderState, _elements: ReadonlyArray<InverseIR>): void {
  // Defensive placeholder — cron doesn't use array-form inverse IRs.
  throw new Error(`bytecode encoder: array-form inverse IR not yet supported`);
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
  // Non-string scalar assertion — emit a more general assert later; for
  // now throw to keep the failure mode loud.
  throw new Error(`bytecode encoder: non-string scalar assertion not yet supported (value: ${JSON.stringify(value)})`);
}

// Write top-of-stack into the current frame's captures under `name`.
// Does NOT pop — the value remains for downstream uses. The runtime uses
// PEEK semantics: read top, write to captures[name], leave stack alone.
function emitWriteCaptureFromTop(state: EncoderState, name: string): void {
  // We don't have a single "peek-and-write" op. Use CAPTURE_VALUE_FROM_STACK
  // (which DOES pop) — but we want to preserve the value on top. The
  // simplest path: the caller (object-field handler) does emitInverseIR
  // then issues a POP. So here we just pop into captures.
  writeOp(state, Op.CAPTURE_VALUE_FROM_STACK);
  writeU32(state, internString(state, name));
  // The caller's POP will be a no-op now (stack is one shorter). We push
  // a placeholder null back to keep the invariant "value remains on top".
  writeOp(state, Op.PUSH_NULL);
}

// Per-target stringify dispatcher. Layout:
//
//   for each root production:
//     SAVE_OFF 0  (unused for stringify — no input offset, but the dispatch
//                  frame's slots are not exercised here either)
//     CALL_PRODUCTION <stringify-block-for-(prod, target)>
//     JUMP_IF_NULL +<bytes-to-next-alt>
//     RETURN_OK
//   RETURN_NULL
//
// CALL_PRODUCTION's frame setup is reused: the called block pushes a render
// frame, runs assertions, and either RENDER_RETURNs (success — value on
// stack) or RETURN_NULL (failure — null on stack, caller's JUMP_IF_NULL
// branches to the next alt).
function emitStringifyDispatcher(
  state: EncoderState,
  info: NodeTypeInfo,
  target: string,
): void {
  for (let i = 0; i < info.productions.length; i++) {
    const prod = info.productions[i]!;
    const entry = prod.renders.get(target);
    if (!entry || !entry.inverseDerived) continue;

    // SAVE_OFF 0 — placeholder so the called block's slot table exists.
    writeOp(state, Op.SAVE_OFF);
    writeU8(state, 0);

    // CALL_PRODUCTION <stringify block>
    writeOp(state, Op.CALL_PRODUCTION);
    const callSite = state.len;
    writeU32(state, 0xffffffff);
    state.pendingCalls.push({
      site: callSite,
      targetKey: `${productionKey(info.name, i)}:${target}`,
    });

    // JUMP_IF_NULL +<placeholder>
    writeOp(state, Op.JUMP_IF_NULL);
    const operandSite = state.len;
    writeI32(state, 0);
    const afterOperand = state.len;

    // RETURN_OK — alt matched, return the rendered value.
    writeOp(state, Op.RETURN_OK);

    const nextAltStart = state.len;
    writeI32At(state, operandSite, nextAltStart - afterOperand);
  }
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
