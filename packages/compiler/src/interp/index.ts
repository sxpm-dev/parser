// Reference interpreter — re-exports the parse + render + stringify
// paths. The interpreter is the slow trust-anchor for the differential
// fuzzer (Task 2.4) — every codegen feature added to v2 must keep parity
// with this module.

export { interpretParse, interpretParseCaptures } from './parse.ts';
export { interpretRender, interpretRenderFromInput } from './render.ts';
export { interpretStringify } from './stringify.ts';
