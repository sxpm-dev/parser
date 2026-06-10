// Phase 1 unification — single source of truth for `literal` span
// semantics, shared by both backends:
//
//   - emit/v2/span.ts:emitLiteralSpan  (compile-time → TS source)
//   - interp/parse.ts:parseLiteralSpan (runtime         → interp state)
//
// The lowering produces a `LiteralSpanProgram` from a ResolvedSpan; the
// program is a small declarative record that captures every decision
// the two execution paths need to take in lockstep. Both backends now
// branch ONLY on the fields of this record — semantic divergences
// surface as a missing field rather than a duplicated `if`.
//
// First slice. The remaining primitives (`class`, `until`, `rawUntil`,
// `recursive`) keep their parallel implementations until we lower them
// one by one. Adding a primitive here is a 4-step pattern:
//
//   1. Define a `<Primitive>SpanProgram` interface here.
//   2. Add a lowerer that converts ResolvedSpan -> program.
//   3. Migrate the v2 emit to consume the program.
//   4. Migrate the interp parser to consume the program.
//
// After every primitive is lowered, the high-level ResolvedSpan
// inspections in emit/v2 and interp can be deleted.

import type { ResolvedSpan } from '../model.ts';

/** Compile-time description of a literal span. Both backends execute
 *  the same algorithm against this shape:
 *
 *    if (input.startsWith(text, pos)) { advance + capture }
 *    else if (optional) { bind null + capture }
 *    else { fail-return + maxPos bump }
 */
export interface LiteralSpanProgram {
  /** The byte sequence to match at the current parse position. */
  readonly text: string;
  /** Whether the span carries the `.optional()` modifier. */
  readonly optional: boolean;
  /** Capture name when the schema named this span; null for unnamed
   *  literal spans (the common case — separators, syntax glue). */
  readonly name: string | null;
}

/** Lower a ResolvedSpan into a LiteralSpanProgram. Throws on shape
 *  mismatch so callers don't silently miss a feature. */
export function lowerLiteralSpan(span: ResolvedSpan): LiteralSpanProgram {
  if (span.class !== 'literal') {
    throw new Error(`lowerLiteralSpan: expected class 'literal', got '${span.class}'`);
  }
  if (typeof span.text !== 'string') {
    throw new Error(
      `lowerLiteralSpan: literal span '${span.name ?? '?'}' has no text`,
    );
  }
  const optional = span.modifiers.some((m) => m.kind === 'optional');
  return {
    text: span.text,
    optional,
    name: span.name ?? null,
  };
}

/** Runtime executor — shared by interp/parse.ts:parseLiteralSpan. Both
 *  backends agree on these state-transition semantics:
 *    1. Match → advance + bind capture (text, [start, end]) + return true.
 *    2. Miss + optional → bind null capture (zero-width range) + return true.
 *    3. Miss + required → return false (caller bumps maxPos / rewinds).
 *
 *  The function operates on an abstract `LiteralRunState` so the
 *  interp's State (with full schema awareness) can be passed
 *  alongside lighter-weight test harnesses.
 */
export interface LiteralRunState {
  readonly input: string;
  pos: number;
  /** Highest byte offset reached during the parse — surfaced as
   *  state.maxOff in interp. Bumped on every fail-return so the
   *  syntax-error message points at the deepest attempted position. */
  maxOff: number;
}

export interface LiteralBindings {
  /** Called when the literal matched (or was an absent optional). The
   *  caller decides how to persist captures + ranges. */
  readonly bind: (name: string, value: string | null, start: number, end: number) => void;
}

/** Execute a LiteralSpanProgram against a runtime state. Returns the
 *  same boolean shape both backends use: true = matched (or optional
 *  absent), false = required miss. */
export function runLiteralSpan(
  prog: LiteralSpanProgram,
  state: LiteralRunState,
  bindings: LiteralBindings,
): boolean {
  if (state.input.startsWith(prog.text, state.pos)) {
    const start = state.pos;
    state.pos += prog.text.length;
    if (prog.name !== null) bindings.bind(prog.name, prog.text, start, state.pos);
    return true;
  }
  if (prog.optional) {
    if (prog.name !== null) bindings.bind(prog.name, null, state.pos, state.pos);
    return true;
  }
  if (state.pos > state.maxOff) state.maxOff = state.pos;
  return false;
}
