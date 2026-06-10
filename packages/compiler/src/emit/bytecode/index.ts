// Bytecode backend — Task 6.5. Produces a self-contained `.bcode.ts` file
// that imports only `@parser2/compiler/bytecode/runtime` and exposes the
// same public surface as the TS backend's generated `parser.ts`:
//
//   - __parse(input, options?)     — fast-mode only; raws is intentionally
//                                    out of scope for the bytecode runtime
//                                    (see Task 6.2 plan).
//   - render(input, options?)      — parse + render to options.type (or
//                                    the schema's defaultTarget).
//   - stringify(value, options?)   — inverse: value → source text for the
//                                    given target.
//
// Serialization format: the EncodedSchema's Maps + arrays travel as JSON
// (array-of-tuples for Maps); the `ops` Uint8Array travels as inline
// base64. Both are embedded as string literals so the generated file is a
// single self-contained artifact identical-shaped to the TS backend's
// output. `decodeSchema(jsonString, b64String)` lives in runtime.ts and
// reconstructs the EncodedSchema at module-load time.

import type { Backend } from '../backend.ts';
import type { InferredSchema } from '../../model.ts';
import { encodeSchema, type EncodedSchema } from './encoder.ts';
import { emitPreamble } from '../preamble.ts';

export { encodeSchema } from './encoder.ts';
export type { EncodedSchema } from './encoder.ts';
export { Op, OPERAND_SIZES, ScanClassKind } from './ops.ts';
export type { RuntimeState } from './runtime.ts';
export { runParse, runRender, runStringify, decodeSchema, syntaxErrorAt } from './runtime.ts';

export const BYTECODE_BACKEND: Backend = {
  name: 'bytecode',
  fileExtension: '.bcode.ts',
  emit(schema: InferredSchema): string {
    const encoded = encodeSchema(schema);
    return emitGeneratedFile(schema, encoded);
  },
};

// --- internals -------------------------------------------------------------

function emitGeneratedFile(schema: InferredSchema, encoded: EncodedSchema): string {
  const schemaJson = serializeSchemaJson(encoded);
  // Embed JSON inside a single-quoted JS string. JSON.stringify never emits
  // single quotes outside string contents (and inside, JSON-escapes them as
  // ' only when needed), so wrapping in single quotes and escaping
  // backslashes + single quotes is sufficient. But the safest portable form
  // is to JSON.stringify the JSON-string itself — that gives us a valid JS
  // double-quoted string with everything escaped — and re-parse at runtime.
  const schemaLiteral = JSON.stringify(schemaJson);
  const opsB64 = bytesToBase64(encoded.ops);
  const opsLiteral = JSON.stringify(opsB64);
  const defaultTargetLiteral = encoded.defaultTarget === undefined
    ? 'undefined'
    : JSON.stringify(encoded.defaultTarget);
  const headerComment = `// Auto-generated from packages/${schema.packageName}/src/schema.ts
// Do not edit by hand. Re-run \`npm run generate\` to refresh.
// (bytecode backend — see packages/compiler/src/emit/bytecode/)`;
  const preamble = emitPreamble(schema);

  return `${headerComment}
/* eslint-disable */
// @ts-nocheck

import { decodeSchema, runParse, runRender, runStringify, syntaxErrorAt } from '@parser2/compiler/bytecode/runtime';

const __SCHEMA_JSON: string = ${schemaLiteral};
const __OPS_B64: string = ${opsLiteral};
const __DECODED = decodeSchema(__SCHEMA_JSON, __OPS_B64);
const __defaultTarget: string | undefined = ${defaultTargetLiteral};

export function __parse(input: string, options?: { mode?: string }): unknown {
  const mode = options?.mode ?? 'fast';
  if (mode !== 'fast') {
    throw new Error("bytecode-backend parser only supports 'fast' mode; use the TS backend for 'raws'");
  }
${preamble}  const state = {
    input,
    ops: __DECODED.ops,
    stringPool: __DECODED.stringPool,
    numberPool: __DECODED.numberPool,
    off: 0,
    pc: 0,
    maxOff: 0,
    valueStack: [] as unknown[],
    operatorLiterals: __DECODED.operatorLiterals,
  };
  const rootOffset = __DECODED.productionOffsets.get(__DECODED.rootProductionKey);
  if (rootOffset === undefined) {
    throw new Error("bytecode-backend parser: missing root production offset for '" + __DECODED.rootProductionKey + "'");
  }
  const captures = runParse(state, rootOffset);
  if (captures === null) {
    throw syntaxErrorAt(input, state.maxOff > state.off ? state.maxOff : state.off);
  }
  // Trailing-whitespace skip before the EOF check. Mirrors v2's
  // __parse trailing skip — fixtures with trailing \\n / spaces /
  // tabs would otherwise fail the EOF check at state.off=len-1.
  while (state.off < input.length) {
    const c = input.charCodeAt(state.off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { state.off++; continue; }
    break;
  }
  if (state.off !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.off ? state.maxOff : state.off);
  }
  return captures;
}

export function render(input: string, options?: { target?: string; mode?: string }): unknown {
  const target = options?.target ?? __defaultTarget;
  if (target === undefined) {
    throw new Error("render: missing target; pass options.target or set defaultTarget on the schema");
  }
  const captures = __parse(input, options);
  return runRender(__DECODED, captures, target);
}

export function stringify(value: unknown, options?: { target?: string }): string {
  const target = options?.target ?? __defaultTarget;
  if (target === undefined) {
    throw new Error("stringify: missing target; pass options.target or set defaultTarget on the schema");
  }
  return runStringify(__DECODED, value, target);
}
`;
}

// Serialize EncodedSchema's non-binary state into a JSON string. Maps become
// array-of-tuples so JSON.parse round-trips them into the same insertion
// order; decodeSchema then re-wraps each list in `new Map(...)`.
function serializeSchemaJson(encoded: EncodedSchema): string {
  return JSON.stringify({
    stringPool: encoded.stringPool,
    numberPool: encoded.numberPool,
    productionOffsets: Array.from(encoded.productionOffsets.entries()),
    renderOffsets: Array.from(encoded.renderOffsets.entries()),
    stringifyOffsets: Array.from(encoded.stringifyOffsets.entries()),
    stringifyOffsetsByNodeType: Array.from(encoded.stringifyOffsetsByNodeType.entries()),
    stringifyDispatcherOffsets: Array.from(encoded.stringifyDispatcherOffsets.entries()),
    rootProductionKey: encoded.rootProductionKey,
    targets: encoded.targets,
    defaultTarget: encoded.defaultTarget,
    operatorLiterals: encoded.operatorLiterals,
  });
}

// Node-only base64 encode (matches the Node-only `Buffer.from(b64,
// 'base64')` decode in runtime.ts's decodeSchema).
function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64');
}
