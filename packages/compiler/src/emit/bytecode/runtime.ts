// Bytecode runtime — Task 6.3. Interprets the opcode stream produced by
// `./encoder.ts`. Designed to be the runtime that the bytecode-backend
// (Task 6.5) ships alongside its generated artifact: the runtime is
// schema-agnostic — every schema-specific decision lives in the encoded
// bytes (pool indices, production offsets, refinement keys).
//
// Execution model — see `./ops.ts` for the opcode contract.
//
// `state.off` is the byte cursor into the input string. `state.pc` is the
// program counter into the opcode stream. A small explicit frame stack
// (`Frame[]`, owned by `runParse`) tracks per-production locals — return PC,
// per-frame slot table (saved offsets), and entry-off used by failure
// paths. PUSH_NEW_CAPTURES pushes a fresh `{ __production }` object onto
// `state.valueStack`. CAPTURE_SLICE writes `captures[name] = slice` on the
// top-of-stack object. RETURN_OK pops the value stack (returning the top
// to the caller via JS recursion's natural unwind path) and restores the
// caller's frame. RETURN_NULL discards the in-flight captures, restores
// the caller's entry `off`, and pushes `null` so the caller's JUMP_IF_NULL
// (dispatch retry, optional-span guard, repeats-loop exit) can branch.

import { Op } from './ops.ts';

export type RuntimeState = {
  readonly input: string;
  readonly ops: Uint8Array;
  readonly stringPool: ReadonlyArray<string>;
  readonly numberPool: ReadonlyArray<number>;
  off: number;
  pc: number;
  maxOff: number;
  valueStack: unknown[];
};

// Per-production locals. Allocated when a CALL_PRODUCTION (or the top-level
// `runParse`) enters a block, popped on RETURN_OK / RETURN_NULL. Slot 0 is
// reserved by the encoder for the production's entry-off (used by failure
// paths); slots 1+ are span start/end offsets.
type Frame = {
  returnPc: number;
  // The entry value-stack depth before PUSH_NEW_CAPTURES pushed this
  // frame's captures. Used by RETURN_NULL to discard any speculative
  // captures (and child captures pushed by nested calls) when the
  // production fails partway through.
  stackBase: number;
  slots: number[];
  entryOff: number;
  // The captures object created by this frame's PUSH_NEW_CAPTURES. We hold
  // a direct reference so CAPTURE_SLICE writes to *this* frame's captures
  // even when nested CALL_PRODUCTIONs have left child captures sitting on
  // top of the value stack. Null for the synthetic root before any
  // PUSH_NEW_CAPTURES runs, and for dispatch frames which never push their
  // own captures (they pass the alt's captures through unchanged).
  captures: Record<string, unknown> | null;
};

export function runParse(state: RuntimeState, startOffset: number): unknown {
  // Synthetic root frame. The top-level caller doesn't have a return-pc to
  // resume into, so we sentinel it with -1 and rely on `frames.length === 0`
  // after RETURN_OK to terminate the interpreter loop. The slot table is
  // shared with the first real frame because cron's root production is the
  // only one that runs at this depth, but we still allocate a fresh array
  // for cleanliness.
  const frames: Frame[] = [];
  frames.push({
    returnPc: -1,
    stackBase: state.valueStack.length,
    slots: [],
    entryOff: state.off,
    captures: null,
  });

  state.pc = startOffset;

  while (true) {
    const op = state.ops[state.pc++]!;
    switch (op) {
      case Op.CONSUME_LITERAL: {
        const idx = readU32(state);
        const lit = state.stringPool[idx]!;
        if (!state.input.startsWith(lit, state.off)) {
          // Hard fail this production.
          if (failProduction(state, frames)) return null;
          break;
        }
        state.off += lit.length;
        if (state.off > state.maxOff) state.maxOff = state.off;
        break;
      }

      case Op.SKIP_WS: {
        while (state.off < state.input.length) {
          const c = state.input.charCodeAt(state.off);
          if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { state.off++; continue; }
          break;
        }
        break;
      }

      case Op.SAVE_OFF: {
        const slot = readU8(state);
        const frame = frames[frames.length - 1]!;
        frame.slots[slot] = state.off;
        break;
      }

      case Op.RESTORE_OFF: {
        const slot = readU8(state);
        const frame = frames[frames.length - 1]!;
        const saved = frame.slots[slot];
        if (saved !== undefined) state.off = saved;
        break;
      }

      case Op.CAPTURE_SLICE: {
        const startSlot = readU8(state);
        const endSlot = readU8(state);
        const nameIdx = readU32(state);
        const frame = frames[frames.length - 1]!;
        const start = frame.slots[startSlot]!;
        const end = frame.slots[endSlot]!;
        const name = state.stringPool[nameIdx]!;
        // Write to THIS frame's captures, not the value stack's top:
        // nested CALL_PRODUCTIONs may have left a child's captures on top
        // of the stack between SAVE_OFF and CAPTURE_SLICE. The encoder
        // guarantees PUSH_NEW_CAPTURES has run before any CAPTURE_SLICE
        // in this frame; if frame.captures is still null the encoder
        // produced an out-of-order stream.
        const captures = frame.captures;
        if (captures === null) {
          throw new Error(`bytecode runtime: CAPTURE_SLICE before PUSH_NEW_CAPTURES at pc=${state.pc}`);
        }
        captures[name] = state.input.slice(start, end);
        break;
      }

      case Op.SCAN_CLASS: {
        const kind = readU8(state);
        // Refinement-key pool index — for Task 6.3 we use it only as a
        // hint (cron's class spans don't change scanner behavior based on
        // the refinement beyond what kind already encodes: NUMBER==int,
        // IDENT==css). Future tasks may dispatch off this.
        readU32(state);
        const start = state.off;
        scanClass(state, kind);
        if (state.off === start) {
          // Class scanner consumed zero bytes → fail.
          if (failProduction(state, frames)) return null;
          break;
        }
        if (state.off > state.maxOff) state.maxOff = state.off;
        break;
      }

      case Op.CALL_PRODUCTION: {
        const target = readU32(state);
        // Push a new frame for the callee. The callee's PUSH_NEW_CAPTURES
        // (first opcode after SAVE_OFF + SKIP_WS) records the captures
        // base depth for failure rollback.
        frames.push({
          returnPc: state.pc,
          stackBase: state.valueStack.length,
          slots: [],
          entryOff: state.off,
          captures: null,
        });
        state.pc = target;
        break;
      }

      case Op.RETURN_OK: {
        // Collapse the value stack back to the frame's entry depth and
        // push this frame's result. For regular production frames the
        // result is `frame.captures` (the object pushed by
        // PUSH_NEW_CAPTURES at the top of the block). For dispatch frames
        // (no PUSH_NEW_CAPTURES — they pass the alt's captures through)
        // the result is whatever was sitting on top of the value stack at
        // the moment of RETURN_OK.
        const finished = frames.pop()!;
        const result = finished.captures !== null
          ? finished.captures
          : state.valueStack[state.valueStack.length - 1];
        state.valueStack.length = finished.stackBase;
        state.valueStack.push(result);
        if (frames.length === 0) {
          // Synthetic root: return the captures to the top-level caller.
          return state.valueStack.pop();
        }
        state.pc = finished.returnPc;
        break;
      }

      case Op.RETURN_NULL: {
        // Hard fail from inside the production. Restore entry off and
        // push null for the caller's JUMP_IF_NULL guard. Discard any
        // captures/child captures pushed during this frame.
        const finished = frames.pop()!;
        state.off = finished.entryOff;
        state.valueStack.length = finished.stackBase;
        if (frames.length === 0) {
          // Synthetic root: surface null to the top-level caller.
          state.valueStack.push(null);
          return null;
        }
        state.valueStack.push(null);
        state.pc = finished.returnPc;
        break;
      }

      case Op.JUMP: {
        const rel = readI32(state);
        state.pc += rel;
        break;
      }

      case Op.JUMP_IF_NULL: {
        const rel = readI32(state);
        const top = state.valueStack[state.valueStack.length - 1];
        if (top === null) {
          // Branch taken: consume the null sentinel and jump.
          state.valueStack.pop();
          state.pc += rel;
        }
        // TODO(6.4): on the non-taken branch the child captures object is
        // left on the value stack. For cron's success path this is bounded —
        // RETURN_OK's stackBase truncation discards it. Task 6.4 will redesign
        // value-stack semantics when RENDER_DISPATCH starts consuming child
        // captures (the orphan becomes the value to write into parent
        // captures, eliminating the leak by design).
        break;
      }

      case Op.PUSH_NEW_CAPTURES: {
        const idx = readU32(state);
        const key = state.stringPool[idx]!;
        const captures: Record<string, unknown> = { __production: key };
        state.valueStack.push(captures);
        const frame = frames[frames.length - 1]!;
        frame.captures = captures;
        break;
      }

      case Op.PUSH_LITERAL_FIELD: {
        const nameIdx = readU32(state);
        const valIdx = readU32(state);
        const name = state.stringPool[nameIdx]!;
        const val = state.stringPool[valIdx]!;
        const frame = frames[frames.length - 1]!;
        if (frame.captures === null) {
          throw new Error(`bytecode runtime: PUSH_LITERAL_FIELD before PUSH_NEW_CAPTURES at pc=${state.pc}`);
        }
        frame.captures[name] = val;
        break;
      }

      // The following opcodes are reserved by the encoder vocabulary but
      // not exercised by cron. Task 6.4 (render dispatch) and later tasks
      // will fill in their cases. Hitting them here is a runtime bug.
      default:
        throw new Error(`bytecode runtime: unknown opcode 0x${op.toString(16)} at pc=${state.pc - 1}`);
    }
  }
}

// --- helpers ---------------------------------------------------------------

// Fail the current production. Returns true if the failure unwound past
// the synthetic root frame (caller must return null to the top-level).
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
    default:
      throw new Error(`bytecode runtime: SCAN_CLASS kind ${kind} not yet implemented (Task 6.3 covers cron primitives only)`);
  }
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
