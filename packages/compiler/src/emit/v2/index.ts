// v2 scannerless emit — entry point.
//
// Contract: see docs/scannerless-emit-v2.md.
//
// Outputs one straight-line function per node type (or per-alt fn + dispatcher
// for multi-prod nodes). No throws in production bodies. Multi-prod dispatch
// is byte-prefix or peek-discriminator, never speculation-via-try-catch.
// All raws-mode extras are extra fields on the same object literal at end of
// body — never post-construct mutation.

import { CompilerError, type InferredSchema, type NodeTypeInfo } from '../../model.ts';
import { emitInverse } from '../inverse.ts';
import { emitRebuild, REBUILD_SLOT_RUNTIME } from '../rebuild.ts';
import { emitRender } from '../render.ts';
import { emitDispatcher } from './dispatch.ts';
import { emitProduction } from './production.ts';
import { V2_RUNTIME } from './runtime.ts';
import { emitValidate } from './validate-emit.ts';

export function emitV2Parser(schema: InferredSchema): string {
  const { imports: validatorImports, body: validateBody } = emitValidate(schema, parseFnName(schema.rootType));
  const header = emitHeader(schema, validatorImports);
  const runtime = V2_RUNTIME;
  const nodeFns: string[] = [];
  for (const info of schema.nodeTypes.values()) {
    nodeFns.push(emitNodeType(info, schema));
  }
  // Phase 4: forward render + inverse stringify, sharing the
  // target-independent `__rebuild_<NodeType>_<idx>` subroutines.
  const render = emitRender(schema);
  const rebuild = emitRebuild(schema);
  const inverse = emitInverse(schema);
  const api = emitPublicApi(schema, validateBody);
  return [header, runtime, nodeFns.join('\n\n'), render, REBUILD_SLOT_RUNTIME, rebuild, inverse, api].join('\n\n') + '\n';
}

function emitHeader(schema: InferredSchema, validatorImports: string): string {
  const importBlock = validatorImports ? `${validatorImports}\n` : '';
  return `// Auto-generated from packages/${schema.packageName}/src/schema.ts
// Do not edit by hand. Re-run \`npm run generate\` to refresh.
// (v2 scannerless emit — see docs/scannerless-emit-v2.md)
/* eslint-disable */
// @ts-nocheck
${importBlock}`;
}

function emitNodeType(info: NodeTypeInfo, schema: InferredSchema): string {
  if (info.productions.length === 0) {
    throw new CompilerError(`Node type '${info.name}' has zero productions`);
  }
  if (info.productions.length === 1) {
    return emitProduction(info.name, info.productions[0]!, schema, { fnName: parseFnName(info.name), prodIdx: 0 });
  }
  // Multi-prod: emit each alt as its own function plus a dispatcher.
  const altFns: string[] = [];
  for (let i = 0; i < info.productions.length; i++) {
    altFns.push(emitProduction(info.name, info.productions[i]!, schema, {
      fnName: `${parseFnName(info.name)}__alt${i}`,
      prodIdx: i,
    }));
  }
  const dispatcher = emitDispatcher(info, schema, parseFnName);
  return [altFns.join('\n\n'), dispatcher].join('\n\n');
}

export function parseFnName(nodeType: string): string {
  return `parse${nodeType}`;
}

function emitPublicApi(schema: InferredSchema, validateBody: string): string {
  const rootFn = parseFnName(schema.rootType);
  return `function __parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode,
    lineStarts: mode === 'raws' ? computeLineStarts(input) : [],
  };
  const result = ${rootFn}(state);
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
  return result;
}

${validateBody}`;
}
