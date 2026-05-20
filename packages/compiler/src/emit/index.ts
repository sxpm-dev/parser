import type { InferredSchema } from '../model.ts';
import { emitDirectFastPath } from './direct-fast.ts';
import { emitNodeFunctions, parseFnName } from './parse.ts';
import { PARSE_RUNTIME } from './runtime.ts';
import { emitTokenizer } from './tokenize.ts';

// Top-level emitter. Produces a single TypeScript file that, when imported,
// exports the parse / tokenize / stringify API for the schema.

export function emitParser(schema: InferredSchema): string {
  const header = emitHeader(schema);
  const tokenizer = emitTokenizer(schema);
  const runtime = PARSE_RUNTIME;
  const parsers = emitNodeFunctions(schema);
  const directFast = emitDirectFastPath(schema);
  const api = emitPublicApi(schema, directFast !== null);
  return [header, tokenizer, runtime, parsers, directFast, api].filter((part) => part !== null).join('\n\n') + '\n';
}

function emitHeader(schema: InferredSchema): string {
  return `// Auto-generated from packages/${schema.rootSchemaName}/src/schema.ts
// Do not edit by hand. Re-run \`npm run generate\` to refresh.
/* eslint-disable */
// @ts-nocheck`;
}

function emitPublicApi(schema: InferredSchema, hasDirectFast: boolean): string {
  const rootFn = parseFnName(schema.rootType);
  const fastRootFn = parseFnName(schema.rootType, 'fast');
  const directFastDispatch = hasDirectFast ? `  if (mode === 'fast') return parseDirectFast(input);\n` : '';
  return `export function parse(input: string, options: ParseOptions = {}): unknown {
  const mode = options.mode ?? 'fast';
${directFastDispatch}  const tokens = tokenize(input);
  const lineStarts = mode === 'raws' ? computeLineStarts(input) : [];
  const hasComments = tokens.hasComments === true;
  const state: State = {
    tokens,
    pos: 0,
    input,
    lineStarts,
    mode,
    hasComments,
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  const result = mode === 'raws' ? ${rootFn}(state) : ${fastRootFn}(state);
  if (state.pos !== state.tokens.length) {
    throw new SyntaxError(\`unexpected trailing token at position \${state.pos}\`);
  }
  return result;
}

export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}`;
}
