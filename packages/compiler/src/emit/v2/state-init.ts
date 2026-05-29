// Shared State-struct initializer emitter for the v2 backend.
//
// Four places inside `emit/v2/` materialize a `State` literal verbatim:
// `emitPublicApi` and `emitFusedRenderEntry` in `index.ts`, plus
// `emitValidateStub` and the inline-validator `__validator_N` alias
// emit in `validate-emit.ts`. They drifted once during Phase 10 (the
// stub missed the `indentStack`/`indentStackTop` fields when Phase 7
// added them — a latent crash for any schema with `.indent()` spans
// and no validation rules). Centralizing the literal here means the
// next State-shape change touches one place.
//
// The output is byte-identical to the prior inline forms — the SHA256
// golden gate over the 5 in-scope packages' generated parsers
// catches any whitespace or field-order drift.

export type StateInitMode =
  | 'fast' // hardcoded `mode: 'fast'`, `lineStarts: []`
  | 'parametric'; // shorthand `mode,`, `lineStarts: mode === 'raws' ? computeLineStarts(input) : []`

export function emitStateInit(varName: string, mode: StateInitMode): string {
  const modeField = mode === 'parametric' ? 'mode' : `mode: 'fast'`;
  const lineStartsField = mode === 'parametric'
    ? `mode === 'raws' ? computeLineStarts(input) : []`
    : `[]`;
  return `  const ${varName}: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    ${modeField},
    lineStarts: ${lineStartsField},
    indentStack: new Int32Array(16),
    indentStackTop: 0,
  };`;
}
