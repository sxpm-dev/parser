// Reference interpreter — re-exports the parse path. Task 2.2 will add
// `interpretRender(inferred, input, target)` and Task 2.3 will add
// `interpretStringify(inferred, ast, target)`. Keeping the module surface
// minimal until those land.

export { interpretParse, interpretParseCaptures } from './parse.ts';
