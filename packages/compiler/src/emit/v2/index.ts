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
import { emitPreamble } from '../preamble.ts';
import { emitRebuild, REBUILD_SLOT_RUNTIME } from '../rebuild.ts';
import { emitRender } from '../render.ts';
import { emitTypes } from '../types.ts';
import { jsIdent, jsString } from '../strings.ts';
import { productionKey } from '../render.ts';
import { emitDispatcher } from './dispatch.ts';
import { detectSharedDispatch } from './shared-dispatch.ts';
import { buildPrefixShareOption, detectPrefixShare } from './prefix-share-dispatch.ts';
import {
  canFuseStructured,
  emitFusedRenderStructured,
  isRoleStructurallyFusable,
  structuredFnName,
  structuredRoleDispatcherName,
} from './fusion-structured.ts';
import { emitFusedRender, fusedRenderFnName } from './fusion.ts';
import { emitProduction } from './production.ts';
import { emitPrattNode } from './pratt.ts';
import { V2_RUNTIME } from './runtime.ts';
import { emitStateInit } from './state-init.ts';
import { emitValidate } from './validate-emit.ts';

export function emitV2Parser(schema: InferredSchema): string {
  // Inline mode (Phase C / Task C.3): the schema's parser is being
  // concatenated into a parent's generated file as a validator. Suppress
  // the file header, runtime preamble (State / posAt / syntaxErrorAt /
  // class predicates — the parent already declared them), and every
  // public-facing block (render, rebuild, inverse, fusion, public API).
  // Only the internal parse helpers and dispatchers are emitted; the
  // parent's inline-validator pass then drops in the source verbatim and
  // emits `__validator_N` aliases that invoke the prefixed root parse fn.
  if (schema.emitMode === 'inline') {
    const nodeFns: string[] = [];
    for (const info of schema.nodeTypes.values()) {
      nodeFns.push(emitNodeType(info, schema));
    }
    return nodeFns.join('\n\n') + '\n';
  }

  const { imports: validatorImports, body: validateBody, inlineBlock } = emitValidate(schema, parseFnName(schema, schema.rootType));
  const header = emitHeader(schema, validatorImports);
  const runtime = V2_RUNTIME;
  const nodeFns: string[] = [];
  for (const info of schema.nodeTypes.values()) {
    nodeFns.push(emitNodeType(info, schema));
  }
  // Phase 3 — inferred TS types + per-target render/stringify overloads.
  // The alias block is emitted near the top of the file (next to ParseMode)
  // so type references resolve when the overloads are inlined into
  // emit/render.ts and emit/inverse.ts' outputs further down.
  const typeEmission = emitTypes(schema);
  // Phase 4: forward render + inverse stringify, sharing the
  // target-independent `__rebuild_<NodeType>_<idx>` subroutines.
  const render = emitRender(schema, { renderOverloads: typeEmission.renderOverloads });
  const rebuild = emitRebuild(schema);
  const inverse = emitInverse(schema, { stringifyOverloads: typeEmission.stringifyOverloads });
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
  const { source: structuredFusion, targets: structuredTargets } = emitStructuredFusion(schema);
  const fusedEntry = emitFusedRenderEntry(schema, fusedTargets, structuredTargets);
  const api = emitPublicApi(schema, validateBody);
  return [
    header,
    runtime,
    // Phase 3 alias block. Goes after the runtime (so ParseMode et al. are
    // already declared) and before everything that references the aliases
    // via the render/stringify overloads.
    typeEmission.aliasBlock,
    // Inline-validator composition pass — sub-schemas' internal parse
    // functions and the __validator_N aliases live AFTER the runtime
    // helpers (so they can reference State / syntaxErrorAt) but BEFORE
    // the parent's parse functions. Empty string when no inline rules.
    inlineBlock,
    nodeFns.join('\n\n'),
    render,
    REBUILD_SLOT_RUNTIME,
    rebuild,
    inverse,
    fusion,
    structuredFusion,
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
        const fn = fusedRenderFnName(schema, info.name, i, target);
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

/**
 * F1/F2 — Structured fusion. Mirrors `emitFusion` but for OBJECT/scalar
 * bodies (typically the schema author's `ast` target). When a (production,
 * target) pair has a statically resolvable structured body whose recursive
 * roles are themselves structurally fusable, emit a function that parses
 * AND builds the target object inline. Per-role dispatchers route into the
 * right production for each role. Per-target tables keyed by
 * `<NodeType>#<prodIdx>` plug into __renderFused.
 *
 * Returns the joined source and the list of targets that actually got at
 * least one fused production (the entry-point switch only references
 * targets that exist).
 */
function emitStructuredFusion(schema: InferredSchema): { source: string; targets: ReadonlyArray<string> } {
  // Determine the candidate target set: every target named on any production.
  const allTargets = new Set<string>();
  for (const info of schema.nodeTypes.values()) {
    for (const prod of info.productions) {
      for (const target of prod.renders.keys()) allTargets.add(target);
    }
  }

  const fns: string[] = [];
  // Per-target dispatch table entries: `"<NodeType>#<prodIdx>": __fusedRenderStructured_X_N_target,`
  const tableEntries = new Map<string, string[]>();
  // Roles that need a per-role dispatcher emitted (because some recursive
  // span references them and they're structurally fusable for this target).
  const roleDispatchersByTarget = new Map<string, Set<string>>();

  for (const target of allTargets) {
    const cache = new Map<string, boolean>();
    for (const info of schema.nodeTypes.values()) {
      for (let i = 0; i < info.productions.length; i++) {
        const production = info.productions[i]!;
        const src = emitFusedRenderStructured(production, schema, {
          nodeName: info.name,
          prodIdx: i,
          target,
        });
        if (src === null) continue;
        fns.push(src);
        const key = productionKey(info.name, i);
        const list = tableEntries.get(target) ?? [];
        list.push(`  ${jsString(key)}: ${structuredFnName(info.name, i, target)},`);
        tableEntries.set(target, list);
        // Collect roles referenced by recursive spans in this production —
        // each one needs its own dispatcher emitted (since the production's
        // body calls `__fusedRenderStructuredDispatch_<Role>_<target>`).
        for (const span of production.spans) {
          for (const role of span.recursiveRoles) {
            if (!isRoleStructurallyFusable(role, schema, target, cache)) continue;
            const set = roleDispatchersByTarget.get(target) ?? new Set();
            set.add(role);
            roleDispatchersByTarget.set(target, set);
          }
        }
      }
    }
  }

  // Per-role dispatchers — emitted once per (role, target). Order productions
  // by longest leading-literal-prefix descending so a more-specific opener
  // (e.g. markdown's `\`\`\`\n` no-lang fenced-code) wins over a shorter
  // shared prefix (`\`\`\`` with-lang). Matches the captures-path role-
  // ladder's emitGroupSpeculation tie-break; without it the structured-
  // fused path would commit to the wrong production for an input that
  // happens to be claimed by both. Declaration order is the stable
  // tiebreaker.
  for (const [target, roles] of roleDispatchersByTarget) {
    for (const role of [...roles].sort()) {
      const info = schema.nodeTypes.get(role)!;
      const fusableIdxs: number[] = [];
      for (let i = 0; i < info.productions.length; i++) {
        if (canFuseStructured(info.productions[i]!, schema, target)) fusableIdxs.push(i);
      }
      fusableIdxs.sort((a, b) => {
        // Mirror the captures-path emitGroupSpeculation tie-break: only a
        // fixed-byte-prefix literal first span contributes a literal
        // length. Spans modified by .until / .rawUntil / .repeats /
        // .optional or a recursive role generalize the first-byte set
        // and must not be treated as long literal prefixes (otherwise
        // the structured-fused dispatcher tries the generalizing alt
        // before the more-specific literal one, diverging from the
        // captures path).
        const litLen = (idx: number): number => {
          const s0 = info.productions[idx]!.spans[0];
          if (!s0 || s0.class !== 'literal' || typeof s0.text !== 'string') return 0;
          for (const m of s0.modifiers) {
            if (
              m.kind === 'optional' ||
              m.kind === 'until' ||
              m.kind === 'rawUntil' ||
              m.kind === 'repeats'
            ) {
              return 0;
            }
          }
          if (s0.recursiveRoles.length > 0) return 0;
          return s0.text.length;
        };
        const diff = litLen(b) - litLen(a);
        return diff !== 0 ? diff : a - b;
      });
      const probes: string[] = [];
      let probeCount = 0;
      for (const idx of fusableIdxs) {
        const fn = structuredFnName(role, idx, target);
        if (probeCount === 0) probes.push(`  const r${probeCount} = ${fn}(state); if (r${probeCount} !== null) return r${probeCount};`);
        else probes.push(`  const r${probeCount} = ${fn}(state); if (r${probeCount} !== null) return r${probeCount};`);
        probeCount++;
      }
      const dispatcherName = structuredRoleDispatcherName(role, target);
      fns.push(`function ${dispatcherName}(state: State): unknown {
${probes.join('\n')}
  return null;
}`);
    }
  }

  const sortedTargets = [...tableEntries.keys()].sort();
  const tables = sortedTargets.map((target) => {
    const id = jsIdent(target);
    const entries = tableEntries.get(target) ?? [];
    return `const __fusedRenderStructuredTable_${id}: Record<string, (state: State) => unknown> = {
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
function emitFusedRenderEntry(
  schema: InferredSchema,
  fusedTargets: ReadonlyArray<string>,
  structuredTargets: ReadonlyArray<string>,
): string {
  const rootKey = `${schema.rootType}#0`;
  const cases = fusedTargets.map((target) => {
    const id = jsIdent(target);
    return `    case ${jsString(target)}: return __fusedRenderDispatch_${id};`;
  });
  const switchBody = cases.length === 0
    ? '    default: return null;'
    : `${cases.join('\n')}\n    default: return null;`;
  // Same shape for the structured table lookup.
  const sCases = structuredTargets.map((target) => {
    const id = jsIdent(target);
    return `    case ${jsString(target)}: return __fusedRenderStructuredTable_${id};`;
  });
  const sSwitchBody = sCases.length === 0
    ? '    default: return null;'
    : `${sCases.join('\n')}\n    default: return null;`;
  // The fused entry MUST apply the input-normalization preamble (BOM strip,
  // unicode/newline normalize, ASCII case fold) BEFORE state init, mirroring
  // `__parse`. Without it a case-insensitive schema (html) parses the raw
  // bytes through fusion and the rendered output preserves the original
  // case — diverging from the captures-path fallback which normalizes via
  // `__parse`'s preamble. The fold is applied AFTER the table-lookup guard
  // so the null-table fast path skips the string work entirely.
  const preamble = emitPreamble(schema);
  return `const __rootProductionKey: string = ${jsString(rootKey)};

function __fusedRenderDispatchLookup(target: string): Record<string, (state: State, out: string[]) => boolean> | null {
  switch (target) {
${switchBody}
  }
}

function __fusedRenderStructuredTableLookup(target: string): Record<string, (state: State) => unknown> | null {
  switch (target) {
${sSwitchBody}
  }
}

function __renderFused(input: string, target: string): unknown {
  // Structured-fused path: when the target's body is a structured object
  // and every leaf is statically resolvable, the parsed value IS the
  // rendered output — one pass, no captures intermediate.
  const sTable = __fusedRenderStructuredTableLookup(target);
  if (sTable !== null) {
    const sRoot = sTable[__rootProductionKey];
    if (sRoot !== undefined) {
${preamble}${emitStateInit('state', 'fast')}
      const result = sRoot(state);
      if (result === null) return null;
      if (state.pos !== input.length) return null;
      return result;
    }
  }
  // String-fused path: Template-bodied targets emit text directly into a
  // shared buffer.
  const table = __fusedRenderDispatchLookup(target);
  if (table === null) return null;
  const rootFusedFn = table[__rootProductionKey];
  if (rootFusedFn === undefined) return null;
${preamble}${emitStateInit('state', 'fast')}
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
    return emitProduction(info.name, info.productions[0]!, schema, { fnName: parseFnName(schema, info.name), prodIdx: 0 });
  }
  // Multi-prod: emit each alt as its own function plus a dispatcher. When
  // the shared-dispatch pattern matches (literal+ident-with-oneOf prefix
  // across alts), emit alts as TAIL bodies — the dispatcher captures the
  // prefix once and passes the discriminator value + entryOff to each tail
  // by parameter. The full-prologue form is dropped for those alts; nothing
  // else calls them.
  //
  // Phase 5: when the node has a detected binary-operator production, the
  // standard speculation dispatcher is replaced with a Pratt primary +
  // climbing loop. The binary alt fn is still emitted (so its body has
  // a place to live for rendering & raws-mode source tagging), but
  // __primary skips it — Pratt synthesizes the binary captures directly.
  const binaryInfo = schema.binaryProductions.get(info.name);
  const shared = binaryInfo === undefined ? detectSharedDispatch(info) : null;
  // Generic shared-prefix factoring — only considered when shared-dispatch
  // didn't already claim this node (the two strategies own disjoint shapes;
  // see prefix-share-dispatch.ts header for the split).
  const prefixShare = binaryInfo === undefined && shared === null
    ? detectPrefixShare(info)
    : null;
  const altFns: string[] = [];
  for (let i = 0; i < info.productions.length; i++) {
    let prefixOpt: ReturnType<typeof buildPrefixOption> | ReturnType<typeof buildPrefixShareOption> | undefined;
    if (shared !== null) {
      prefixOpt = buildPrefixOption(info.productions[i]!, shared);
    } else if (prefixShare !== null) {
      prefixOpt = buildPrefixShareOption(info.productions[i]!, prefixShare.prefixLen, schema);
    }
    altFns.push(emitProduction(info.name, info.productions[i]!, schema, {
      fnName: `${parseFnName(schema, info.name)}__alt${i}`,
      prodIdx: i,
      prefix: prefixOpt,
    }));
  }
  if (binaryInfo !== undefined) {
    return emitPrattNode(info, schema, binaryInfo, altFns);
  }
  const dispatcher = emitDispatcher(info, schema, (n) => parseFnName(schema, n));
  return [altFns.join('\n\n'), dispatcher].join('\n\n');
}

/** Materialise the EmitProductionOptions.prefix payload from a SharedDispatch
 *  description: which spans to skip, which capture names the dispatcher will
 *  pass as parameters, and the source-offset parameter names. The parameter
 *  expressions are the capture names themselves (e.g. capture `tag` → param
 *  `tag`) so the emitted captures object stays byte-identical to the prior
 *  shape. */
function buildPrefixOption(production: import('../../model.ts').Production, shared: import('./shared-dispatch.ts').SharedDispatch) {
  const valueParams = new Map<string, string>();
  const startOffParams = new Map<string, string>();
  const endOffParams = new Map<string, string>();
  // Every span in spans[0..discriminatorIdx] is shared across alts and is
  // emitted by the dispatcher. We only forward the captures that downstream
  // span/refinement code might reference — those are the named spans (the
  // unnamed leading literal `<` has no capture and needs no parameter).
  for (let i = 0; i <= shared.discriminatorIdx; i++) {
    const span = production.spans[i]!;
    if (!span.name) continue;
    valueParams.set(span.name, span.name);
    startOffParams.set(span.name, `${span.name}__start`);
    endOffParams.set(span.name, `${span.name}__end`);
  }
  return {
    skipCount: shared.discriminatorIdx + 1,
    valueParams,
    startOffParams,
    endOffParams,
  } as const;
}

// Returns the top-level parse function name for a node type. The schema's
// `symbolPrefix` is prepended so generated parsers can be composed without
// name collisions (default '' is byte-identical to the unprefixed form).
export function parseFnName(schema: InferredSchema, nodeType: string): string {
  return `${schema.symbolPrefix}parse${nodeType}`;
}

function emitPublicApi(schema: InferredSchema, validateBody: string): string {
  const rootFn = parseFnName(schema, schema.rootType);
  const preamble = emitPreamble(schema);
  // Trailing-whitespace + (optional) comment skip before the EOF check.
  // Without this, `42 /* trailing */` would parse `42` and then complain
  // at position 2 because the root parse leaves `state.pos` at the end of
  // the value. Comment skipping is conditional on the schema declaring
  // `tokens: ['comment']` so non-comment-aware schemas stay
  // byte-identical to the prior emit.
  const hasComment = schema.classes.some((t) => t.class === 'comment');
  // Phase 4c v5: line comment markers declared via the `comment` token
  // class with a `line` refinement.
  const lineCommentMarkers: string[] = [];
  for (const usage of schema.classes) {
    if (usage.class === 'comment') {
      for (const ref of usage.refinements) {
        if (ref.name === 'line' && Array.isArray(ref.args) && typeof ref.args[0] === 'string') {
          lineCommentMarkers.push(ref.args[0]);
        }
      }
    }
  }
  const lineSkipFragment = lineCommentMarkers.length === 0
    ? ''
    : lineCommentMarkers.map((marker) => {
        const m = JSON.stringify(marker);
        return `    if (input.startsWith(${m}, state.pos)) {
      state.pos += ${marker.length};
      while (state.pos < state.len && input.charCodeAt(state.pos) !== 0x0a) state.pos++;
      if (state.pos < state.len) state.pos++;
      continue;
    }`;
      }).join('\n');
  const trailingSkip = hasComment
    ? `while (state.pos < state.len) {
    const __c = input.charCodeAt(state.pos);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { state.pos++; continue; }
    if (__c === 0x2f && state.pos + 1 < state.len && input.charCodeAt(state.pos + 1) === 0x2a) {
      state.pos += 2;
      while (state.pos < state.len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < state.len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
      if (state.pos < state.len) state.pos += 2;
      continue;
    }
${lineSkipFragment}
    break;
  }`
    : `while (state.pos < state.len) {
    const __c = input.charCodeAt(state.pos);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { state.pos++; continue; }
    break;
  }`;
  // Phase 4c v4: leading/trailing ws around the root parse. For
  // preserve schemas the public `__parse` captures the ws (and
  // comments where applicable) at offset 0 before the root runs and
  // the ws after the root has matched but before EOF, then attaches
  // them to the captures payload as `__leadingWs` / `__trailingWs`.
  // The render builder forwards them to the AST. Stringify (via the
  // inverse derivation) reads them back and the rebuild concatenates
  // them on either side of the root output.
  const preserveWs = schema.whitespace === 'preserve';
  // Phase 4c v5: leading ws + (block + line) comment skip runs for
  // comment-aware schemas, EXCEPT when the root production's spans
  // include a recursive role with a Comment-producing production
  // (CSS's Stylesheet body lists Comment as a role; eating comments
  // here would silently consume what the role-ladder is meant to
  // capture as a Comment child node).
  const rootInfo = schema.nodeTypes.get(schema.rootType);
  const rootConsumesComments = rootInfo !== undefined && rootInfo.productions.some((prod) => {
    for (const span of prod.spans) {
      for (const roleName of span.recursiveRoles) {
        const info = schema.nodeTypes.get(roleName);
        if (!info) continue;
        for (const rolePr of info.productions) {
          const firstSpan = rolePr.spans[0];
          if (firstSpan && firstSpan.class === 'comment') return true;
        }
      }
    }
    return false;
  });
  const leadingWsSkip = hasComment && !rootConsumesComments
    ? `while (state.pos < state.len) {
    const __c = input.charCodeAt(state.pos);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { state.pos++; continue; }
    if (__c === 0x2f && state.pos + 1 < state.len && input.charCodeAt(state.pos + 1) === 0x2a) {
      state.pos += 2;
      while (state.pos < state.len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < state.len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
      if (state.pos < state.len) state.pos += 2;
      continue;
    }
${lineSkipFragment}
    break;
  }`
    : '';
  const leadingCapture = preserveWs
    ? `const __leadStart = state.pos;
  ${leadingWsSkip}
  const __leadingWs = input.slice(__leadStart, state.pos);`
    : leadingWsSkip;
  const trailingCapture = preserveWs
    ? `const __trailStart = state.pos;`
    : '';
  const trailingAssign = preserveWs
    ? `const __trailingWs = input.slice(__trailStart, state.pos);
  if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
    (result as any).__leadingWs = __leadingWs;
    (result as any).__trailingWs = __trailingWs;
  }`
    : '';
  return `function __parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
${preamble}${emitStateInit('state', 'parametric')}
  ${leadingCapture}
  const result = ${rootFn}(state);
  ${trailingCapture}
  ${trailingSkip}
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
  ${trailingAssign}
  const __onDiag = options?.onDiagnostic;
  if (__onDiag !== undefined) {
    for (let __i = 0; __i < state.diagnostics.length; __i++) {
      __onDiag(state.diagnostics[__i]);
    }
  }
  return result;
}

${validateBody}`;
}
