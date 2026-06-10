// Bytecode runtime — Task 6.3 / Task 6.4. Interprets the opcode stream
// produced by `./encoder.ts`. Designed to be the runtime that the bytecode-
// backend (Task 6.5) ships alongside its generated artifact: the runtime
// is schema-agnostic — every schema-specific decision lives in the encoded
// bytes (pool indices, production offsets, refinement keys).
//
// Execution model — see `./ops.ts` for the opcode contract.
//
// `state.off` is the byte cursor into the input string (parse only).
// `state.pc` is the program counter into the opcode stream. A small
// explicit frame stack (`Frame[]`, owned by `runParse`/`runRender`/
// `runStringify`) tracks per-production locals — return PC, per-frame slot
// table (saved offsets), entry-off used by failure paths, and a reference
// to the captures object for the frame (input for render/stringify, output
// for parse). PUSH_NEW_CAPTURES pushes a fresh `{ __production }` object;
// CAPTURE_SLICE / CAPTURE_VALUE_* write into the top frame's captures.
// RETURN_OK collapses the value stack and pushes the frame's captures (or
// the top-of-stack for dispatch frames). RETURN_NULL pushes null. Render
// frames use a different completion contract — RENDER_RETURN preserves
// the top-of-stack as the return value.

import type { EncodedSchema } from './encoder.ts';
import { Op, INVERSE_TEMPLATE_ROLE_NONE } from './ops.ts';

export type RuntimeState = {
  readonly input: string;
  readonly ops: Uint8Array;
  readonly stringPool: ReadonlyArray<string>;
  readonly numberPool: ReadonlyArray<number>;
  off: number;
  pc: number;
  maxOff: number;
  valueStack: unknown[];
  // Render/stringify routing tables — set by runRender / runStringify.
  // Optional so parse-only callers (existing Task 6.3 callers) can omit them.
  // RENDER_DISPATCH / STRINGIFY_DISPATCH throw if missing at dispatch time.
  renderOffsets?: ReadonlyMap<string, number>;
  stringifyOffsetsByNodeType?: ReadonlyMap<string, ReadonlyArray<number>>;
  // Schema-level operator literal pool — consumed by SCAN_CLASS / OPERATOR.
  // Pre-sorted longest-first by the inference pass; empty for schemas
  // without an `operators:` declaration. The runtime treats `undefined`
  // as empty for backward compat with state objects built by callers
  // that predate operator-class support.
  readonly operatorLiterals?: ReadonlyArray<string>;
};

// Per-production locals. Allocated when a CALL_PRODUCTION (or the top-level
// `runParse`/`runRender`) enters a block, popped on RETURN_OK / RETURN_NULL
// / RENDER_RETURN. Slot 0 is reserved by the encoder for the production's
// entry-off (used by parse failure paths); slots 1+ are span start/end
// offsets. Render and stringify frames don't use offset slots — slot 0 is
// initialized to 0 as a placeholder.
type FrameKind = 'parse' | 'render' | 'stringify';
type Frame = {
  kind: FrameKind;
  returnPc: number;
  // The entry value-stack depth before this frame's PUSH_NEW_CAPTURES
  // (for parse) or before the frame was pushed (for render/stringify).
  // RETURN_OK truncates back to this depth before pushing the result.
  stackBase: number;
  slots: number[];
  entryOff: number;
  // For parse: the captures object created by this frame's
  // PUSH_NEW_CAPTURES. Holds a direct reference so CAPTURE_SLICE writes
  // to *this* frame's captures even when nested calls left child
  // captures on the stack. Null before PUSH_NEW_CAPTURES runs and for
  // dispatch frames.
  // For render: the INPUT captures object provided by the caller (read-
  // only — LOAD_CAPTURE reads from it).
  // For stringify: the OUTPUT captures object that the inverse IR
  // populates from the input value.
  captures: Record<string, unknown> | null;
};

export function runParse(state: RuntimeState, startOffset: number): unknown {
  // Synthetic root frame. The top-level caller doesn't have a return-pc to
  // resume into, so we sentinel it with -1 and rely on `frames.length === 0`
  // after RETURN_OK to terminate the interpreter loop.
  const frames: Frame[] = [];
  frames.push({
    kind: 'parse',
    returnPc: -1,
    stackBase: state.valueStack.length,
    slots: [],
    entryOff: state.off,
    captures: null,
  });

  state.pc = startOffset;
  return runInterpreterLoop(state, frames);
}


// renderSlot — handles the polymorphic render dispatch:
//   - null/undefined: pass-through (caller's CONCAT_N coerces to "")
//   - array: recursively render each element, return array
//   - primitive (string/number/bool): pass-through
//   - captures object (has __production): jump into the production's
//     render block via the renderOffsets map. We don't have direct access
//     to encoded.renderOffsets from inside the interpreter loop, so the
//     runtime stashes the map on `state.__renderOffsets` (set by runRender
//     / runStringify before entering the loop).
function renderSlot(
  state: RuntimeState,
  frames: Frame[],
  value: unknown,
  target: string,
): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    const out: unknown[] = new Array(value.length);
    for (let i = 0; i < value.length; i++) {
      out[i] = renderSlot(state, frames, value[i], target);
    }
    return out;
  }
  if (typeof value !== 'object') return value;
  const captures = value as Record<string, unknown>;
  const production = captures.__production;
  if (typeof production !== 'string') {
    // Plain object with no production hint — pass through. Shouldn't
    // happen in a well-formed captures tree.
    return value;
  }
  const renderOffsets = state.renderOffsets;
  if (!renderOffsets) {
    throw new Error('bytecode runtime: RENDER_DISPATCH without renderOffsets — runRender did not set up state');
  }
  const key = `${production}:${target}`;
  const offset = renderOffsets.get(key);
  if (offset === undefined) {
    throw new Error(`bytecode runtime: no render block for '${key}'`);
  }
  // Push a render frame and resume the interpreter at the block's offset.
  // The block ends with RENDER_RETURN which pops the frame and leaves its
  // result on the stack. We use a re-entrant loop strategy: push the
  // frame, jump pc, then a NESTED interpreter step. Simpler: push frame,
  // jump pc, return a marker — but we're already INSIDE the interpreter
  // loop. The cleanest path is to run a nested loop.
  return runRenderNested(state, captures, offset);
}

// Run the interpreter loop starting at `startOffset` inside a fresh
// render frame whose captures = `captures`. Returns when that frame's
// RENDER_RETURN / RETURN_NULL pops the last frame off this nested stack.
// The nested run uses its OWN frames array (not the parent's) so the
// nested completion check (`frames.length === 0`) fires correctly.
function runRenderNested(
  state: RuntimeState,
  captures: Record<string, unknown>,
  startOffset: number,
): unknown {
  // Save current pc so we can restore after the nested run.
  const savedPc = state.pc;
  const baseDepth = state.valueStack.length;

  const frames: Frame[] = [];
  frames.push({
    kind: 'render',
    returnPc: -1,
    stackBase: baseDepth,
    slots: [],
    entryOff: state.off,
    captures,
  });
  state.pc = startOffset;
  const result = runInterpreterLoop(state, frames);
  state.pc = savedPc;
  // Defensive: ensure no orphan values remain on the parent's stack from
  // a failed nested execution.
  if (state.valueStack.length > baseDepth) {
    state.valueStack.length = baseDepth;
  }
  return result;
}

// stringifySlot — handles polymorphic stringify dispatch:
//   - null/undefined → null (preserves the absent semantic so the
//                       downstream CAPTURE_VALUE_FROM_STACK stores `null`
//                       in captures; the inlined source-render block can
//                       then drop the slot — and its preceding ws — via
//                       JUMP_IF_NULL. Pre-followup this returned `""`,
//                       which left captures storing `""` and rendered as
//                       a trailing space for the cron optional command.)
//   - array          → recursively stringify each element, join with " "
//                       (cron's default whitespace policy)
//   - primitive (string/number/bool) → String(v)
//   - object         → chain-try each production of <nodeType, target>
//                       via runStringifyNested; the first non-null result
//                       wins.
function stringifySlot(
  state: RuntimeState,
  value: unknown,
  nodeType: string,
  target: string,
): unknown {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const r = stringifySlot(state, value[i], nodeType, target);
      if (r === null || r === undefined || r === '') continue;
      parts.push(String(r));
    }
    return parts.join(' ');
  }
  // Strings AND objects participate in chain-try: object-form productions
  // succeed on objects (PEEK_FIELD + ASSERT_TOP_STRING_EQ pattern) and
  // fail on strings; template-form productions succeed on strings
  // (INVERSE_TEMPLATE scans literal segments). The chain-try takes the
  // first non-null result.
  if (typeof value !== 'string' && typeof value !== 'object') {
    return String(value);
  }
  const offsetsByNodeType = state.stringifyOffsetsByNodeType;
  if (!offsetsByNodeType) {
    throw new Error('bytecode runtime: STRINGIFY_DISPATCH without stringifyOffsetsByNodeType');
  }
  const key = `${nodeType}:${target}`;
  const offsets = offsetsByNodeType.get(key);
  if (!offsets || offsets.length === 0) {
    // For strings we fall back to the input itself (matches TS backend's
    // __invertSlotFor_<Role>_<target> try/catch fallback). For objects
    // this remains a hard error — a missing object-form inverse signals
    // a real bug.
    if (typeof value === 'string') return value;
    throw new Error(`bytecode runtime: no stringify offsets for '${key}'`);
  }
  for (const offset of offsets) {
    const result = runStringifyNested(state, value, offset);
    if (result !== null) return result;
  }
  // All alts failed. Match TS backend: strings fall back to themselves;
  // other shapes are a hard error.
  if (typeof value === 'string') return value;
  throw new Error(`bytecode runtime: no production matched for stringify '${key}' (value: ${safeJson(value)})`);
}

function safeJson(value: unknown): string {
  try { return JSON.stringify(value); } catch { return String(value); }
}

// Like runRenderNested but for stringify. Pushes a stringify frame, places
// the input value on the value stack, and runs the block starting at
// `startOffset`. Returns the rebuilt string (or null on assertion mismatch).
function runStringifyNested(
  state: RuntimeState,
  value: unknown,
  startOffset: number,
): unknown {
  const savedPc = state.pc;
  const baseDepth = state.valueStack.length;
  const frames: Frame[] = [];
  frames.push({
    kind: 'stringify',
    returnPc: -1,
    stackBase: baseDepth,
    slots: [],
    entryOff: state.off,
    captures: null,
  });
  state.valueStack.push(value);
  state.pc = startOffset;
  const result = runInterpreterLoop(state, frames);
  state.pc = savedPc;
  // Ensure value stack returns to its pre-call depth. RETURN_NULL pushes
  // a null sentinel (consumed by RETURN's pop only when frames.length === 0
  // after the pop, which the inner check handles asymmetrically across
  // success/failure). Defensive clamp:
  if (state.valueStack.length > baseDepth) {
    state.valueStack.length = baseDepth;
  }
  return result;
}

// Extracted interpreter loop body. Identical to the body of runParse, but
// reusable from runRenderNested. Both call sites set up the initial frame
// stack and start pc, then enter this loop. Returns when the initial
// frame is popped (frames.length === 0).
//
// We inline this as a small re-entry point. For Commit 2 the implementation
// is a direct copy — Task 6.7 can factor this into a single shared loop
// when bytecode-budget tightening lands.
function runInterpreterLoop(state: RuntimeState, frames: Frame[]): unknown {
  while (true) {
    const op = state.ops[state.pc++]!;
    const r = stepOpcode(state, frames, op);
    if (r.kind === 'return') return r.value;
  }
}

type StepResult =
  | { readonly kind: 'continue' }
  | { readonly kind: 'return'; readonly value: unknown };

// Execute one opcode. Side-effects on state/frames. Returns 'return' when
// the synthetic root frame has popped (signals the interpreter loop to
// exit). Otherwise 'continue'.
function stepOpcode(state: RuntimeState, frames: Frame[], op: number): StepResult {
  switch (op) {
    case Op.CONSUME_LITERAL: {
      const idx = readU32(state);
      const lit = state.stringPool[idx]!;
      if (!state.input.startsWith(lit, state.off)) {
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }
      state.off += lit.length;
      if (state.off > state.maxOff) state.maxOff = state.off;
      return { kind: 'continue' };
    }

    case Op.SKIP_WS: {
      while (state.off < state.input.length) {
        const c = state.input.charCodeAt(state.off);
        if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { state.off++; continue; }
        break;
      }
      return { kind: 'continue' };
    }

    case Op.SAVE_OFF: {
      const slot = readU8(state);
      const frame = frames[frames.length - 1]!;
      frame.slots[slot] = state.off;
      return { kind: 'continue' };
    }

    case Op.RESTORE_OFF: {
      const slot = readU8(state);
      const frame = frames[frames.length - 1]!;
      const saved = frame.slots[slot];
      if (saved !== undefined) state.off = saved;
      return { kind: 'continue' };
    }

    case Op.CAPTURE_SLICE: {
      const startSlot = readU8(state);
      const endSlot = readU8(state);
      const nameIdx = readU32(state);
      const frame = frames[frames.length - 1]!;
      const start = frame.slots[startSlot]!;
      const end = frame.slots[endSlot]!;
      const name = state.stringPool[nameIdx]!;
      const captures = frame.captures;
      if (captures === null) throw new Error(`bytecode runtime: CAPTURE_SLICE before PUSH_NEW_CAPTURES`);
      captures[name] = state.input.slice(start, end);
      return { kind: 'continue' };
    }

    case Op.CAPTURE_TRIMMED_SLICE: {
      const startSlot = readU8(state);
      const endSlot = readU8(state);
      const nameIdx = readU32(state);
      const frame = frames[frames.length - 1]!;
      const startRaw = frame.slots[startSlot]!;
      const endRaw = frame.slots[endSlot]!;
      const name = state.stringPool[nameIdx]!;
      const captures = frame.captures;
      if (captures === null) throw new Error(`bytecode runtime: CAPTURE_TRIMMED_SLICE before PUSH_NEW_CAPTURES`);
      let ts = startRaw;
      let te = endRaw;
      while (ts < te) {
        const c = state.input.charCodeAt(ts);
        if (c !== 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) break;
        ts++;
      }
      while (te > ts) {
        const c = state.input.charCodeAt(te - 1);
        if (c !== 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) break;
        te--;
      }
      captures[name] = state.input.slice(ts, te);
      return { kind: 'continue' };
    }

    case Op.CAPTURE_COMMENT_INTERIOR: {
      // Like CAPTURE_SLICE, but strips the wrapping /* and */ then trims
      // interior whitespace. Mirrors v2's emitClassSpanValueExpr arm
      // for class='comment'.
      const startSlot = readU8(state);
      const endSlot = readU8(state);
      const nameIdx = readU32(state);
      const frame = frames[frames.length - 1]!;
      const start = frame.slots[startSlot]!;
      const end = frame.slots[endSlot]!;
      const name = state.stringPool[nameIdx]!;
      const captures = frame.captures;
      if (captures === null) throw new Error(`bytecode runtime: CAPTURE_COMMENT_INTERIOR before PUSH_NEW_CAPTURES`);
      let ts = start + 2;
      let te = end - 2;
      while (ts < te) {
        const c = state.input.charCodeAt(ts);
        if (c !== 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) break;
        ts++;
      }
      while (te > ts) {
        const c = state.input.charCodeAt(te - 1);
        if (c !== 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) break;
        te--;
      }
      captures[name] = state.input.slice(ts, te);
      return { kind: 'continue' };
    }

    case Op.CAPTURE_VALUE_FROM_STACK: {
      const nameIdx = readU32(state);
      const name = state.stringPool[nameIdx]!;
      const frame = frames[frames.length - 1]!;
      if (frame.captures === null) throw new Error(`bytecode runtime: CAPTURE_VALUE_FROM_STACK before frame captures init`);
      if (state.valueStack.length === 0) throw new Error(`bytecode runtime: CAPTURE_VALUE_FROM_STACK with empty value stack`);
      const value = state.valueStack.pop();
      frame.captures[name] = value as unknown;
      return { kind: 'continue' };
    }

    case Op.CAPTURE_VALUE_APPEND: {
      const nameIdx = readU32(state);
      const name = state.stringPool[nameIdx]!;
      const frame = frames[frames.length - 1]!;
      if (frame.captures === null) throw new Error(`bytecode runtime: CAPTURE_VALUE_APPEND before frame captures init`);
      if (state.valueStack.length === 0) throw new Error(`bytecode runtime: CAPTURE_VALUE_APPEND with empty value stack`);
      const value = state.valueStack.pop();
      const existing = frame.captures[name];
      if (Array.isArray(existing)) (existing as unknown[]).push(value);
      else frame.captures[name] = [value];
      return { kind: 'continue' };
    }

    case Op.CAPTURE_INIT_ARRAY: {
      const nameIdx = readU32(state);
      const name = state.stringPool[nameIdx]!;
      const frame = frames[frames.length - 1]!;
      if (frame.captures === null) throw new Error(`bytecode runtime: CAPTURE_INIT_ARRAY before frame captures init`);
      frame.captures[name] = [];
      return { kind: 'continue' };
    }

    case Op.SCAN_CLASS: {
      const kind = readU8(state);
      readU32(state);
      const start = state.off;
      scanClass(state, kind);
      if (state.off === start) {
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }
      if (state.off > state.maxOff) state.maxOff = state.off;
      return { kind: 'continue' };
    }

    case Op.SCAN_UNTIL: {
      // Operands: u32 stopCount, u32 flags, then stopCount × u32 stopIdx.
      // Flags bitmask:
      //   bit 0 (1): balanced — track () [] {} depth; stop only at depth 0
      //              when a stop matches OR a closing bracket appears.
      //   bit 1 (2): skip strings — "..." / '...' regions are opaque,
      //              even if a stop literal appears inside.
      //   bit 2 (4): skip comments — /* ... */ regions are opaque.
      // Scan advances off until one of the stop literals matches at depth
      // 0 (without consuming it), or until a depth-0 closing bracket
      // appears (also without consuming it), or EOF. Always succeeds —
      // capture follows via CAPTURE_SLICE / CAPTURE_TRIMMED_SLICE.
      const stopCount = readU32(state);
      const flags = readU32(state);
      const stops: string[] = new Array(stopCount);
      for (let i = 0; i < stopCount; i++) {
        stops[i] = state.stringPool[readU32(state)]!;
      }
      const balanced = (flags & 1) !== 0;
      const skipStrings = (flags & 2) !== 0;
      const skipComments = (flags & 4) !== 0;
      const input = state.input;
      const len = input.length;
      let depth = 0;
      scan: while (state.off < len) {
        const c = input.charCodeAt(state.off);
        if (skipComments && c === 0x2f && state.off + 1 < len && input.charCodeAt(state.off + 1) === 0x2a) {
          state.off += 2;
          while (state.off < len) {
            if (input.charCodeAt(state.off) === 0x2a && state.off + 1 < len && input.charCodeAt(state.off + 1) === 0x2f) {
              state.off += 2;
              continue scan;
            }
            state.off++;
          }
          continue;
        }
        if (skipStrings && (c === 0x22 || c === 0x27)) {
          const q = c;
          state.off++;
          while (state.off < len) {
            const sc = input.charCodeAt(state.off);
            if (sc === 0x5c && state.off + 1 < len) { state.off += 2; continue; }
            if (sc === q) { state.off++; break; }
            if (sc === 0x0a || sc === 0x0d) break;
            state.off++;
          }
          continue;
        }
        if (!balanced || depth === 0) {
          for (let i = 0; i < stops.length; i++) {
            if (input.startsWith(stops[i]!, state.off)) break scan;
          }
          if (balanced && (c === 0x29 || c === 0x5d || c === 0x7d)) break;
        }
        if (balanced) {
          if (c === 0x28 || c === 0x5b || c === 0x7b) depth++;
          else if (c === 0x29 || c === 0x5d || c === 0x7d) { if (depth > 0) depth--; }
        }
        state.off++;
      }
      if (state.off > state.maxOff) state.maxOff = state.off;
      return { kind: 'continue' };
    }

    case Op.CALL_PRODUCTION: {
      const target = readU32(state);
      const callerKind = frames[frames.length - 1]!.kind;
      frames.push({
        kind: callerKind,
        returnPc: state.pc,
        stackBase: state.valueStack.length,
        slots: [],
        entryOff: state.off,
        captures: null,
      });
      state.pc = target;
      return { kind: 'continue' };
    }

    case Op.RETURN_OK: {
      const finished = frames.pop()!;
      const result = finished.captures !== null
        ? finished.captures
        : state.valueStack[state.valueStack.length - 1];
      state.valueStack.length = finished.stackBase;
      state.valueStack.push(result);
      if (frames.length === 0) {
        return { kind: 'return', value: state.valueStack.pop() };
      }
      state.pc = finished.returnPc;
      return { kind: 'continue' };
    }

    case Op.RETURN_NULL: {
      const finished = frames.pop()!;
      state.off = finished.entryOff;
      state.valueStack.length = finished.stackBase;
      if (frames.length === 0) {
        state.valueStack.push(null);
        return { kind: 'return', value: null };
      }
      state.valueStack.push(null);
      state.pc = finished.returnPc;
      return { kind: 'continue' };
    }

    case Op.RENDER_RETURN: {
      const finished = frames.pop()!;
      if (state.valueStack.length === finished.stackBase) {
        throw new Error(`bytecode runtime: RENDER_RETURN with no value on stack`);
      }
      const result = state.valueStack[state.valueStack.length - 1];
      state.valueStack.length = finished.stackBase;
      state.valueStack.push(result);
      if (frames.length === 0) {
        return { kind: 'return', value: state.valueStack.pop() };
      }
      state.pc = finished.returnPc;
      return { kind: 'continue' };
    }

    case Op.JUMP: {
      const rel = readI32(state);
      state.pc += rel;
      return { kind: 'continue' };
    }

    case Op.JUMP_IF_OFF_EQ: {
      const slot = readU8(state);
      const rel = readI32(state);
      const frame = frames[frames.length - 1]!;
      const saved = frame.slots[slot];
      if (saved !== undefined && state.off === saved) {
        state.pc += rel;
      }
      return { kind: 'continue' };
    }

    case Op.JUMP_IF_NULL: {
      const rel = readI32(state);
      const top = state.valueStack[state.valueStack.length - 1];
      // Loose nullish check (matches `==` against null). CALL_PRODUCTION
      // pushes explicit null on failure and the optional-fusion render
      // emit relies on this branch firing for `undefined` too (absent
      // optional captures are stored as `undefined` on the captures
      // object because CAPTURE_VALUE_FROM_STACK is jumped over on the
      // failing role's branch).
      if (top === null || top === undefined) {
        state.valueStack.pop();
        state.pc += rel;
      }
      return { kind: 'continue' };
    }

    case Op.PUSH_NEW_CAPTURES: {
      const idx = readU32(state);
      const key = state.stringPool[idx]!;
      const captures: Record<string, unknown> = { __production: key };
      state.valueStack.push(captures);
      const frame = frames[frames.length - 1]!;
      frame.captures = captures;
      return { kind: 'continue' };
    }

    case Op.PUSH_LITERAL_FIELD: {
      const nameIdx = readU32(state);
      const valIdx = readU32(state);
      const name = state.stringPool[nameIdx]!;
      const val = state.stringPool[valIdx]!;
      const frame = frames[frames.length - 1]!;
      if (frame.captures === null) throw new Error(`bytecode runtime: PUSH_LITERAL_FIELD before captures init`);
      frame.captures[name] = val;
      return { kind: 'continue' };
    }

    case Op.PUSH_STRING: {
      const idx = readU32(state);
      state.valueStack.push(state.stringPool[idx]);
      return { kind: 'continue' };
    }

    case Op.PUSH_NULL: {
      state.valueStack.push(null);
      return { kind: 'continue' };
    }

    case Op.PUSH_TRUE: {
      state.valueStack.push(true);
      return { kind: 'continue' };
    }

    case Op.PUSH_FALSE: {
      state.valueStack.push(false);
      return { kind: 'continue' };
    }

    case Op.PUSH_NUMBER: {
      const idx = readU32(state);
      state.valueStack.push(state.numberPool[idx]);
      return { kind: 'continue' };
    }

    case Op.LOAD_CAPTURE: {
      const nameIdx = readU32(state);
      const name = state.stringPool[nameIdx]!;
      const frame = frames[frames.length - 1]!;
      if (frame.captures === null) throw new Error(`bytecode runtime: LOAD_CAPTURE in frame without captures`);
      // Normalize `undefined` to `null`. The bytecode optional-span emit
      // skips CAPTURE_VALUE_FROM_STACK when the inner CALL_PRODUCTION
      // returns null (the role's JUMP_IF_NULL branches over the capture
      // op), so `captures[name]` stays `undefined` for absent optionals.
      // The TS-generated captures path stores an explicit `null` instead
      // (`captures.command = parseCommand(state)` where parseCommand
      // returns null on failure). Coercing here keeps downstream
      // RENDER_DISPATCH / BUILD_OBJECT byte-equivalent across backends
      // — AST objects come out with `command: null` (kept by JSON) under
      // both, instead of an omitted key under bytecode.
      const value = frame.captures[name];
      state.valueStack.push(value === undefined ? null : value);
      return { kind: 'continue' };
    }

    case Op.CONCAT_N: {
      const count = readU32(state);
      if (state.valueStack.length < count) throw new Error(`bytecode runtime: CONCAT_N stack underflow`);
      const start = state.valueStack.length - count;
      let out = '';
      for (let i = 0; i < count; i++) {
        const v = state.valueStack[start + i];
        if (v === null || v === undefined) continue;
        if (Array.isArray(v)) {
          // For string-target rendering, an array slot is the result of a
          // .repeats() span — each element is already rendered to a
          // string by the RENDER_DISPATCH inside the loader. Join with a
          // single space (cron's default whitespace policy between
          // children). Task 6.7 / future tasks can plumb per-span sep
          // through the opcode stream if a schema needs anything other
          // than ' '.
          for (let j = 0; j < v.length; j++) {
            if (j > 0) out += ' ';
            const elem = v[j];
            if (elem === null || elem === undefined) continue;
            out += String(elem);
          }
          continue;
        }
        out += String(v);
      }
      state.valueStack.length = start;
      state.valueStack.push(out);
      return { kind: 'continue' };
    }

    case Op.BUILD_OBJECT: {
      const count = readU32(state);
      const names: string[] = new Array(count);
      for (let i = 0; i < count; i++) {
        const idx = readU32(state);
        names[i] = state.stringPool[idx]!;
      }
      if (state.valueStack.length < count) throw new Error(`bytecode runtime: BUILD_OBJECT stack underflow`);
      const obj: Record<string, unknown> = {};
      const start = state.valueStack.length - count;
      for (let i = 0; i < count; i++) obj[names[i]!] = state.valueStack[start + i];
      state.valueStack.length = start;
      state.valueStack.push(obj);
      return { kind: 'continue' };
    }

    case Op.BUILD_ARRAY: {
      const count = readU32(state);
      if (state.valueStack.length < count) throw new Error(`bytecode runtime: BUILD_ARRAY stack underflow`);
      const arr: unknown[] = new Array(count);
      const start = state.valueStack.length - count;
      for (let i = 0; i < count; i++) arr[i] = state.valueStack[start + i];
      state.valueStack.length = start;
      state.valueStack.push(arr);
      return { kind: 'continue' };
    }

    case Op.RENDER_DISPATCH: {
      const targetIdx = readU32(state);
      const target = state.stringPool[targetIdx]!;
      if (state.valueStack.length === 0) throw new Error(`bytecode runtime: RENDER_DISPATCH empty stack`);
      const value = state.valueStack.pop();
      const rendered = renderSlot(state, frames, value, target);
      state.valueStack.push(rendered);
      return { kind: 'continue' };
    }

    case Op.STRINGIFY_DISPATCH: {
      const nodeTypeIdx = readU32(state);
      const targetIdx = readU32(state);
      const nodeType = state.stringPool[nodeTypeIdx]!;
      const target = state.stringPool[targetIdx]!;
      if (state.valueStack.length === 0) throw new Error(`bytecode runtime: STRINGIFY_DISPATCH empty stack`);
      const value = state.valueStack.pop();
      const result = stringifySlot(state, value, nodeType, target);
      state.valueStack.push(result);
      return { kind: 'continue' };
    }

    case Op.PEEK_FIELD: {
      const nameIdx = readU32(state);
      const name = state.stringPool[nameIdx]!;
      const top = state.valueStack[state.valueStack.length - 1];
      if (top === null || top === undefined || typeof top !== 'object') {
        state.valueStack.push(undefined);
        return { kind: 'continue' };
      }
      state.valueStack.push((top as Record<string, unknown>)[name]);
      return { kind: 'continue' };
    }

    case Op.ASSERT_TOP_STRING_EQ: {
      const idx = readU32(state);
      const expected = state.stringPool[idx]!;
      const top = state.valueStack[state.valueStack.length - 1];
      if (top !== expected) {
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }
      state.valueStack.pop();
      return { kind: 'continue' };
    }

    case Op.ASSERT_TOP_BOOL_EQ: {
      const expected = readU8(state) !== 0;
      const top = state.valueStack[state.valueStack.length - 1];
      if (top !== expected) {
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }
      state.valueStack.pop();
      return { kind: 'continue' };
    }

    case Op.ASSERT_TOP_NUMBER_EQ: {
      const idx = readU32(state);
      const expected = state.numberPool[idx]!;
      const top = state.valueStack[state.valueStack.length - 1];
      if (top !== expected) {
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }
      state.valueStack.pop();
      return { kind: 'continue' };
    }

    case Op.ASSERT_TOP_NULL: {
      const top = state.valueStack[state.valueStack.length - 1];
      if (top !== null && top !== undefined) {
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }
      state.valueStack.pop();
      return { kind: 'continue' };
    }

    case Op.ASSERT_TOP_NOT_NULL: {
      const top = state.valueStack[state.valueStack.length - 1];
      if (top === null || top === undefined) {
        if (failProduction(state, frames)) return { kind: 'return', value: null };
        return { kind: 'continue' };
      }
      state.valueStack.pop();
      return { kind: 'continue' };
    }

    case Op.POP: {
      if (state.valueStack.length > 0) state.valueStack.pop();
      return { kind: 'continue' };
    }

    case Op.INVERSE_TEMPLATE:
      return handleInverseTemplate(state, frames);

    default:
      throw new Error(`bytecode runtime: unknown opcode 0x${op.toString(16)} at pc=${state.pc - 1}`);
  }
}

// Handler for Op.INVERSE_TEMPLATE — mirrors `walkInverseTemplate`
// (`packages/compiler/src/interp/stringify.ts:457-527`) against
// `frame.captures` populated from `state.valueStack` top. Extracted from
// stepOpcode to keep that switch focused; the case body itself was the
// largest opcode in the file. Reads operands per the layout documented at
// `Op.INVERSE_TEMPLATE`:
//   u32 numSegs, u32 numCaps, u32 targetIdx
//   numSegs × u32 stringPool refs (segment literals)
//   numCaps × { u32 nameIdx, u32 roleIdx_or_max, u8 flags }
// PEEKs (does not POP) the value on top of stack so the caller's Phase 2
// POP in emitStringifyBlock keeps the stack invariant intact.
function handleInverseTemplate(state: RuntimeState, frames: Frame[]): StepResult {
  const numSegs = readU32(state);
  const numCaps = readU32(state);
  const target = state.stringPool[readU32(state)]!;
  const segments: string[] = new Array(numSegs);
  for (let i = 0; i < numSegs; i++) {
    segments[i] = state.stringPool[readU32(state)]!;
  }
  const capNames: string[] = new Array(numCaps);
  const capRoles: (string | null)[] = new Array(numCaps);
  const capOptional: boolean[] = new Array(numCaps);
  for (let i = 0; i < numCaps; i++) {
    capNames[i] = state.stringPool[readU32(state)]!;
    const roleRaw = readU32(state);
    capRoles[i] = roleRaw === INVERSE_TEMPLATE_ROLE_NONE ? null : state.stringPool[roleRaw]!;
    capOptional[i] = readU8(state) !== 0;
  }

  if (state.valueStack.length === 0) {
    throw new Error(`bytecode runtime: INVERSE_TEMPLATE with empty value stack`);
  }
  const value = state.valueStack[state.valueStack.length - 1];
  if (typeof value !== 'string') {
    // Template-form expects string input. Fail this production so the
    // chain-try (in stringifySlot) moves to the next alt.
    if (failProduction(state, frames)) return { kind: 'return', value: null };
    return { kind: 'continue' };
  }

  const frame = frames[frames.length - 1]!;
  if (frame.captures === null) {
    throw new Error(`bytecode runtime: INVERSE_TEMPLATE before frame captures init`);
  }
  const captures = frame.captures;

  // tailOptional[j] = true iff captures[j..end] are all optional. Used by
  // the indexOf-miss fallback to slurp the rest into capture i and null
  // the trailing captures (matches walkInverseTemplate's tail-optional
  // fusion).
  const tailOptional: boolean[] = new Array(numCaps);
  let allOpt = true;
  for (let j = numCaps - 1; j >= 0; j--) {
    if (!capOptional[j]) allOpt = false;
    tailOptional[j] = allOpt;
  }

  let pos = 0;
  const seg0 = segments[0] ?? '';
  if (seg0.length > 0) {
    if (value.indexOf(seg0, pos) !== pos) {
      if (failProduction(state, frames)) return { kind: 'return', value: null };
      return { kind: 'continue' };
    }
    pos += seg0.length;
  }

  let succeeded = true;
  walkCaps: for (let i = 0; i < numCaps; i++) {
    const nextSeg = segments[i + 1] ?? '';
    const capName = capNames[i]!;
    const role = capRoles[i];

    if (i === numCaps - 1 && nextSeg.length === 0) {
      if (capOptional[i] && pos >= value.length) {
        captures[capName] = null;
      } else {
        const slice = value.slice(pos);
        captures[capName] = role === null ? slice : stringifySlot(state, slice, role, target);
        pos = value.length;
      }
      continue;
    }
    if (nextSeg.length === 0) {
      // Empty mid-segment is an encoder-time bug — the TS reference
      // walkInverseTemplate throws here (interp/stringify.ts:500-503).
      // Surface loudly so chain-try doesn't mask the encoding defect by
      // silently moving to the next alt.
      throw new Error(
        `bytecode runtime: INVERSE_TEMPLATE empty separator between captures '${capName}' and '${capNames[i + 1] ?? ''}'`,
      );
    }
    const end = value.indexOf(nextSeg, pos);
    const nextIdx = i + 1;
    const nextIsTailOptional = nextIdx < numCaps && tailOptional[nextIdx];
    if (end < 0) {
      if (nextIsTailOptional) {
        const slice = value.slice(pos);
        captures[capName] = role === null ? slice : stringifySlot(state, slice, role, target);
        pos = value.length;
        for (let k = nextIdx; k < numCaps; k++) {
          captures[capNames[k]!] = null;
        }
        break walkCaps;
      }
      succeeded = false;
      break;
    }
    const slice = value.slice(pos, end);
    captures[capName] = role === null ? slice : stringifySlot(state, slice, role, target);
    pos = end + nextSeg.length;
  }

  if (succeeded && pos !== value.length) {
    succeeded = false;
  }
  if (!succeeded) {
    if (failProduction(state, frames)) return { kind: 'return', value: null };
    return { kind: 'continue' };
  }
  return { kind: 'continue' };
}

// Public entry: render captures into a value of the given target.
export function runRender(
  encoded: EncodedSchema,
  captures: unknown,
  target: string,
): unknown {
  // Handle non-captures inputs gracefully (null/undefined/primitives pass
  // through; arrays render each element).
  if (captures === null || captures === undefined) return captures;
  if (Array.isArray(captures)) {
    return captures.map((c) => runRender(encoded, c, target));
  }
  if (typeof captures !== 'object') return captures;

  const c = captures as Record<string, unknown>;
  const production = c.__production;
  if (typeof production !== 'string') {
    throw new Error(`bytecode runtime: runRender expects captures with __production, got ${JSON.stringify(captures)}`);
  }
  const key = `${production}:${target}`;
  const offset = encoded.renderOffsets.get(key);
  if (offset === undefined) {
    throw new Error(`bytecode runtime: no render block for '${key}'`);
  }

  const state: RuntimeState = {
    input: '',
    ops: encoded.ops,
    stringPool: encoded.stringPool,
    numberPool: encoded.numberPool,
    off: 0,
    pc: offset,
    maxOff: 0,
    valueStack: [],
    renderOffsets: encoded.renderOffsets,
    operatorLiterals: encoded.operatorLiterals,
  };
  const frames: Frame[] = [];
  frames.push({
    kind: 'render',
    returnPc: -1,
    stackBase: 0,
    slots: [],
    entryOff: 0,
    captures: c,
  });
  return runInterpreterLoop(state, frames);
}

// Public entry: stringify a value into source text for the given target.
// Routes through the per-(rootType, target) chain-try: tries each of the
// root NodeType's productions in order, taking the first whose
// discriminator block succeeds. The chain-try happens in JS via
// stringifySlot, matching the runtime-side dispatch used by recursive
// STRINGIFY_DISPATCH inside template slots.
export function runStringify(
  encoded: EncodedSchema,
  value: unknown,
  target: string,
): string {
  // Identify the root NodeType from rootProductionKey ('<NodeType>#<idx>'
  // or '<NodeType>#dispatch'). We don't bake rootType separately, so we
  // parse it out of the key.
  const rootKey = encoded.rootProductionKey;
  const hashIdx = rootKey.indexOf('#');
  const rootNodeType = hashIdx >= 0 ? rootKey.slice(0, hashIdx) : rootKey;

  // Build a runtime state for the chain-try (no parse, no off).
  const state: RuntimeState = {
    input: '',
    ops: encoded.ops,
    stringPool: encoded.stringPool,
    numberPool: encoded.numberPool,
    off: 0,
    pc: 0,
    maxOff: 0,
    valueStack: [],
    renderOffsets: encoded.renderOffsets,
    stringifyOffsetsByNodeType: encoded.stringifyOffsetsByNodeType,
    operatorLiterals: encoded.operatorLiterals,
  };

  const result = stringifySlot(state, value, rootNodeType, target);
  if (typeof result !== 'string') {
    throw new Error(`bytecode runtime: stringify returned non-string (${safeJson(result)})`);
  }
  return result;
}

// --- helpers ---------------------------------------------------------------

// Fail the current production. Returns true if the failure unwound past
// the synthetic root frame (caller must return null to the top-level).
//
// Dual-use across frame kinds:
//   - parse frames: restores `state.off` to the frame's entryOff and
//     updates maxOff for syntax-error reporting.
//   - stringify frames: state.off is meaningless (always 0); the off
//     restore is a harmless no-op. The interesting work is the value-
//     stack truncation + frame pop, which lets `runStringifyNested`
//     surface null so `stringifySlot` can chain-try the next alt.
//   - render frames: render blocks don't fail under normal operation;
//     this path exists for symmetry only.
function failProduction(state: RuntimeState, frames: Frame[]): boolean {
  const finished = frames.pop()!;
  if (state.off > state.maxOff) state.maxOff = state.off;
  state.off = finished.entryOff;
  state.valueStack.length = finished.stackBase;
  if (frames.length === 0) {
    state.valueStack.push(null);
    return true;
  }
  state.valueStack.push(null);
  state.pc = finished.returnPc;
  return false;
}

// Class scanners — minimal inline implementations for IDENT and NUMBER, the
// only kinds cron exercises. Other kinds throw to keep failures loud while
// the runtime grows toward feature parity with the TS backend.
function scanClass(state: RuntimeState, kind: number): void {
  switch (kind) {
    case 1: { // IDENT
      const len = state.input.length;
      if (state.off >= len) return;
      const first = state.input.charCodeAt(state.off);
      if (!isCssIdentStart(first)) return;
      state.off++;
      while (state.off < len && isCssIdentPart(state.input.charCodeAt(state.off))) state.off++;
      return;
    }
    case 2: { // NUMBER
      const len = state.input.length;
      if (state.off >= len) return;
      if (!isDigit(state.input.charCodeAt(state.off))) return;
      state.off++;
      while (state.off < len && isDigit(state.input.charCodeAt(state.off))) state.off++;
      return;
    }
    case 3: { // HEX — bare [0-9a-fA-F]+ run, matches v2 emit/v2/span.ts.
      const len = state.input.length;
      if (state.off >= len) return;
      if (!isHexDigit(state.input.charCodeAt(state.off))) return;
      state.off++;
      while (state.off < len && isHexDigit(state.input.charCodeAt(state.off))) state.off++;
      return;
    }
    case 4: { // STRING — " or ' quoted, backslash-escape aware, newline
      // breaks (mirrors v2 + interp). No backtick support yet on bcode
      // runtime; matches the v2 default-no-refinement behavior.
      const len = state.input.length;
      if (state.off >= len) return;
      const q = state.input.charCodeAt(state.off);
      if (q !== 0x22 && q !== 0x27) return;
      state.off++;
      while (state.off < len) {
        const c = state.input.charCodeAt(state.off);
        if (c === 0x5c && state.off + 1 < len) { state.off += 2; continue; }
        if (c === q) { state.off++; break; }
        if (c === 0x0a || c === 0x0d) break;
        state.off++;
      }
      return;
    }
    case 5: { // COMMENT — /* ... */, scan-to-EOF on unterminated.
      const len = state.input.length;
      if (state.off + 1 >= len) return;
      if (
        state.input.charCodeAt(state.off) !== 0x2f ||
        state.input.charCodeAt(state.off + 1) !== 0x2a
      ) return;
      state.off += 2;
      while (state.off < len) {
        if (
          state.input.charCodeAt(state.off) === 0x2a &&
          state.off + 1 < len &&
          state.input.charCodeAt(state.off + 1) === 0x2f
        ) {
          state.off += 2;
          return;
        }
        state.off++;
      }
      return;
    }
    case 6: { // OPERATOR
      // Longest-match dispatch over schema.operatorLiterals. The list is
      // pre-sorted longest-first by the inference pass, so the first
      // matching literal wins (e.g. `!=` beats `!` if both were declared).
      const ops = state.operatorLiterals;
      if (!ops || ops.length === 0) return; // no-op; SCAN_CLASS will fail-rewind
      for (const op of ops) {
        if (state.input.startsWith(op, state.off)) {
          state.off += op.length;
          return;
        }
      }
      return; // no match; SCAN_CLASS will fail-rewind
    }
    default:
      throw new Error(`bytecode runtime: SCAN_CLASS kind ${kind} not yet implemented`);
  }
}

function isHexDigit(c: number): boolean {
  return (
    (c >= 0x30 && c <= 0x39) ||
    (c >= 0x41 && c <= 0x46) ||
    (c >= 0x61 && c <= 0x66)
  );
}

function isDigit(c: number): boolean {
  return c >= 0x30 && c <= 0x39;
}

function isCssIdentStart(c: number): boolean {
  // [A-Za-z_-] — permissive CSS-ident start (cron's CommandWord uses .css()).
  return (
    (c >= 0x41 && c <= 0x5a) ||
    (c >= 0x61 && c <= 0x7a) ||
    c === 0x5f ||
    c === 0x2d
  );
}

function isCssIdentPart(c: number): boolean {
  return isCssIdentStart(c) || isDigit(c);
}

// Little-endian readers — must mirror encoder.ts's writeU32/writeI32.
function readU8(state: RuntimeState): number {
  return state.ops[state.pc++]!;
}

function readU32(state: RuntimeState): number {
  const a = state.ops[state.pc]!;
  const b = state.ops[state.pc + 1]!;
  const c = state.ops[state.pc + 2]!;
  const d = state.ops[state.pc + 3]!;
  state.pc += 4;
  return (a | (b << 8) | (c << 16) | (d << 24)) >>> 0;
}

function readI32(state: RuntimeState): number {
  const a = state.ops[state.pc]!;
  const b = state.ops[state.pc + 1]!;
  const c = state.ops[state.pc + 2]!;
  const d = state.ops[state.pc + 3]!;
  state.pc += 4;
  // Sign-extend by left-shifting into a Int32 view via `| 0`.
  return (a | (b << 8) | (c << 16) | (d << 24)) | 0;
}

// --- Task 6.5 helpers: generated-file support ------------------------------
//
// `decodeSchema` rebuilds an `EncodedSchema` from the JSON + base64 payload
// that the bytecode backend's `emit()` inlines into the generated `.bcode.ts`
// file. The shape must match exactly what `encodeSchema()` produced — Task
// 6.5's roundtrip test verifies this end-to-end against cron.
//
// The JSON payload carries every Map as an array-of-tuples (the standard
// `Array.from(map.entries())` round-trip). The ops Uint8Array travels as
// base64 so the generated file stays single-line per opaque blob and
// human-greppable around it.

export type DecodedSchemaJson = {
  readonly stringPool: ReadonlyArray<string>;
  readonly numberPool: ReadonlyArray<number>;
  readonly productionOffsets: ReadonlyArray<readonly [string, number]>;
  readonly renderOffsets: ReadonlyArray<readonly [string, number]>;
  readonly stringifyOffsets: ReadonlyArray<readonly [string, number]>;
  readonly stringifyOffsetsByNodeType: ReadonlyArray<readonly [string, ReadonlyArray<number>]>;
  readonly stringifyDispatcherOffsets: ReadonlyArray<readonly [string, number]>;
  readonly rootProductionKey: string;
  readonly targets: ReadonlyArray<string>;
  readonly defaultTarget?: string;
  // Optional for backward compatibility with .bcode.ts artifacts
  // generated before SCAN_CLASS gained OPERATOR support. Missing →
  // empty list (any .operator() use would have failed at encode time
  // before this field was emitted).
  readonly operatorLiterals?: ReadonlyArray<string>;
};

export function decodeSchema(schemaJson: string, opsB64: string): EncodedSchema {
  const json = JSON.parse(schemaJson) as DecodedSchemaJson;
  // Node-only base64 decode — the bytecode runtime is Node-targeted.
  const opsBuf = Buffer.from(opsB64, 'base64');
  const ops = new Uint8Array(opsBuf.buffer, opsBuf.byteOffset, opsBuf.byteLength);
  return {
    ops,
    stringPool: json.stringPool,
    numberPool: json.numberPool,
    productionOffsets: new Map(json.productionOffsets),
    renderOffsets: new Map(json.renderOffsets),
    stringifyOffsets: new Map(json.stringifyOffsets),
    stringifyOffsetsByNodeType: new Map(json.stringifyOffsetsByNodeType),
    stringifyDispatcherOffsets: new Map(json.stringifyDispatcherOffsets),
    rootProductionKey: json.rootProductionKey,
    targets: json.targets,
    defaultTarget: json.defaultTarget,
    operatorLiterals: json.operatorLiterals ?? [],
  };
}

// Mirrors the TS backend's `syntaxErrorAt` (packages/compiler/src/emit/v2/
// runtime.ts) so the bytecode-emitted parser surfaces parse failures with
// the same message shape — caller code that catches SyntaxError on parse
// failure works identically across backends.
export function syntaxErrorAt(input: string, offset: number): SyntaxError {
  let lineStart = offset;
  while (lineStart > 0 && input.charCodeAt(lineStart - 1) !== 0x0a && input.charCodeAt(lineStart - 1) !== 0x0d) lineStart--;
  let lineEnd = offset;
  while (lineEnd < input.length && input.charCodeAt(lineEnd) !== 0x0a && input.charCodeAt(lineEnd) !== 0x0d) lineEnd++;
  let line = 1;
  for (let i = 0; i < lineStart; i++) if (input.charCodeAt(i) === 0x0a) line++;
  const source = input.slice(lineStart, lineEnd);
  const gutter = String(line);
  const column = Math.max(0, offset - lineStart);
  const ch = offset < input.length ? input[offset] : 'EOF';
  const headline = ch === 'EOF'
    ? `Unexpected end of input at position ${offset}`
    : `Unexpected '${ch}' at position ${offset}`;
  return new SyntaxError(`${headline}
${gutter} | ${source}
${' '.repeat(gutter.length)} | ${' '.repeat(column)}^`);
}
