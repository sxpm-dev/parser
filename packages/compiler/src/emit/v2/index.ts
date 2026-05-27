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
import { jsIdent, jsString } from '../strings.ts';
import { productionKey } from '../render.ts';
import { emitDispatcher } from './dispatch.ts';
import { emitFusedRender, fusedRenderFnName } from './fusion.ts';
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
  // Phase 5 Task 5.1: per-(production, non-ast target) fused parse+render
  // functions for Template-bodied renders with non-recursive slots only.
  // Carries its own dispatch table keyed by `<NodeType>#<idx>`.
  //
  // Phase 5 Task 5.2: `__renderFused(input, target)` is emitted alongside
  // the dispatch tables — the public `render()` body (emitted from
  // `emit/render.ts`) calls it first and falls back to the captures path
  // when it returns null (no eligible root entry / partial parse / runtime
  // failure). Function hoisting makes the forward reference from
  // `render()` safe even though `__renderFused` is emitted later in the
  // file. The fused entry is unconditionally emitted (even when no
  // production fused) so the `render()` body always has a callable —
  // ineligible cases just short-circuit to null and the captures path
  // handles them.
  const { source: fusion, targets: fusedTargets } = emitFusion(schema);
  const fusedEntry = emitFusedRenderEntry(schema, fusedTargets);
  const api = emitPublicApi(schema, validateBody);
  return [
    header,
    runtime,
    nodeFns.join('\n\n'),
    render,
    REBUILD_SLOT_RUNTIME,
    rebuild,
    inverse,
    fusion,
    fusedEntry,
    api,
  ].filter((p) => p !== '').join('\n\n') + '\n';
}

// Phase 5 Task 5.1 — emit every per-(production, non-ast target) fused
// renderer + a per-target dispatch map keyed by the same `<Node>#<idx>`
// routing string the captures-based dispatcher uses. The map shape lets
// Task 5.2 swap the slow path (parse → captures → builder) for the fused
// path (parse+render in one walk) wherever the (production, target) entry
// exists, and fall back to the slow path everywhere else.
//
// Returns both the emitted source AND the sorted list of targets that
// actually got a dispatch table — Task 5.2's `__renderFused` entry needs
// the latter to switch on target → dispatch table without referencing a
// table that wasn't emitted (which would land in TDZ at module init).
function emitFusion(schema: InferredSchema): { source: string; targets: ReadonlyArray<string> } {
  const fns: string[] = [];
  // Per-target dispatch tables. Each map is keyed by the production routing
  // string (`<NodeType>#<prodIdx>`) and yields the fused function. A target
  // appears in the output ONLY when at least one production fused
  // successfully — targets where every production is ineligible (non-template
  // body, recursive slots, ast) are absent from the emitted file. Task 5.2's
  // wiring must therefore guard for table presence (the `__renderFused`
  // entry only references tables for targets in `sortedTargets`).
  const targetDispatchEntries = new Map<string, string[]>();
  for (const info of schema.nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      const production = info.productions[i]!;
      for (const target of production.renders.keys()) {
        if (target === 'ast') continue;
        const src = emitFusedRender(production, schema, {
          nodeName: info.name,
          prodIdx: i,
          target,
        });
        if (src === null) continue;
        fns.push(src);
        const key = productionKey(info.name, i);
        const fn = fusedRenderFnName(info.name, i, target);
        const list = targetDispatchEntries.get(target) ?? [];
        list.push(`  ${jsString(key)}: ${fn},`);
        targetDispatchEntries.set(target, list);
      }
    }
  }
  // Sort targets alphabetically so the emitted dispatch table is stable
  // across runs of the compiler (matches the alphabetisation in
  // emit/render.ts's `collectTargets`).
  const sortedTargets = [...targetDispatchEntries.keys()].sort();
  const tables = sortedTargets.map((target) => {
    const id = jsIdent(target);
    const entries = targetDispatchEntries.get(target) ?? [];
    return `const __fusedRenderDispatch_${id}: Record<string, (state: State, out: string[]) => boolean> = {
${entries.join('\n')}
};`;
  });
  if (fns.length === 0 && tables.length === 0) {
    return { source: '', targets: sortedTargets };
  }
  const source = [fns.join('\n\n'), tables.join('\n\n')].filter((p) => p !== '').join('\n\n');
  return { source, targets: sortedTargets };
}

// Phase 5 Task 5.2 — entry point that the public `render()` body calls
// before falling back to the captures path. Walks the same `State` shape
// the parser uses (mode 'fast' since the fused path never needs raws
// metadata), invokes the root production's fused builder if one exists
// for the requested target, and returns null whenever the fused path is
// not eligible. A null return signals the caller to use the captures
// dispatcher — semantics-preserving fallback.
//
// `__rootProductionKey` is `<rootType>#0`. Multi-prod roots are NOT
// supported in Task 5.2 (would require running each alt's fused builder
// in declaration order); no schema in the in-scope set has a multi-prod
// root, but the dispatch-table lookup yields `undefined` when the key is
// absent and the function correctly returns null in that case.
//
// When no production fused for ANY target (sortedTargets is empty) the
// lookup switch has just a `default` arm that returns null — `render()`
// always falls back to the captures path. Same shape, no behavior change.
function emitFusedRenderEntry(schema: InferredSchema, fusedTargets: ReadonlyArray<string>): string {
  const rootKey = `${schema.rootType}#0`;
  const cases = fusedTargets.map((target) => {
    const id = jsIdent(target);
    return `    case ${jsString(target)}: return __fusedRenderDispatch_${id};`;
  });
  const switchBody = cases.length === 0
    ? '    default: return null;'
    : `${cases.join('\n')}\n    default: return null;`;
  return `const __rootProductionKey: string = ${jsString(rootKey)};

function __fusedRenderDispatchLookup(target: string): Record<string, (state: State, out: string[]) => boolean> | null {
  switch (target) {
${switchBody}
  }
}

function __renderFused(input: string, target: string): string | null {
  const table = __fusedRenderDispatchLookup(target);
  if (table === null) return null;
  const rootFusedFn = table[__rootProductionKey];
  if (rootFusedFn === undefined) return null;
  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode: 'fast',
    lineStarts: [],
  };
  const out: string[] = [];
  const ok = rootFusedFn(state, out);
  if (!ok) return null;
  if (state.pos !== input.length) return null;
  return out.join('');
}`;
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
