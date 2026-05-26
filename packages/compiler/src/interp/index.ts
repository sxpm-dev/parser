// Reference interpreter — re-exports the parse + render paths. Task 2.3
// will add `interpretStringify(inferred, ast, target)`.

export { interpretParse, interpretParseCaptures } from './parse.ts';
export { interpretRender, interpretRenderFromInput } from './render.ts';
