// Scannerless production emit. Mirrors the structure of emit/parse.ts (the
// tokenized backend) but every leaf operation compiles to inline char-based
// scans on `state.input` instead of token-array dispatch.
//
// Each production function hoists state into function-scope locals:
//   const __input = state.input;
//   const __len = __input.length;
//   let __off = state.off;
// Span emit functions read/write __off / __input / __len. The wrapper
// writes back `state.off = __off` before returning or before invoking
// another parse function (recursive span / multi-prod alt) and re-reads
// `__off = state.off` after the call returns. This keeps state.off out of
// register pressure within a tight per-row body.

import type { SpanModifier } from '@parser2/parser';
import { CompilerError, type InferredSchema, type NodeTypeInfo, type Production, type ResolvedSpan } from '../../model.ts';
import { collectOffsetRefs, emitStructureExpr } from '../structure.ts';
import { jsIdent, jsString } from '../strings.ts';
import { emitClassScan, emitClassOffsetVars } from './scan-class.ts';

type ParseVariant = 'fast' | 'raws' | 'validate';

type Ctx = {
  readonly nodeTypes: ReadonlyMap<string, NodeTypeInfo>;
  readonly variant: ParseVariant;
  // Token classes the tokenizer (now inlined) must recognize inside
  // .until() captures. Each one teaches the depth-tracking loop how to
  // skip past that class as an opaque unit (e.g. skip past a quoted
  // string rather than letting a `;` inside it close the capture).
  readonly tokens: ReadonlySet<string>;
  // True when the schema declares an ident class with the 'css'
  // refinement. The CSS ident scanner has a built-in `url(...)` raw
  // mode (contents opaque, no comment recognition, no bracket
  // tracking) that the until-scan must mirror to keep an unterminated
  // `/*` inside `url(...)` from greedily matching a far-away `*/`.
  readonly cssIdent: boolean;
  // All declared literal terminals (punctuators + span literals). Used
  // by the role dispatcher to refine single-byte literal checks with
  // negative lookahead for longer punctuators that share the same
  // first byte but aren't handled by any dispatched role (e.g. `<`
  // for HtmlElement must NOT match `</`).
  readonly literalTexts: ReadonlySet<string>;
};

export function emitNodeFunctions(schema: InferredSchema): string {
  const tokens = new Set<string>();
  let cssIdent = false;
  for (const usage of schema.classes) {
    tokens.add(usage.class);
    if (usage.class === 'ident' && usage.refinements.some((r) => r.name === 'css')) {
      cssIdent = true;
    }
  }
  const literalTexts = new Set(schema.literals.map((l) => l.literal));
  const parts: string[] = [];
  for (const variant of ['raws', 'fast', 'validate'] as const) {
    const ctx: Ctx = { nodeTypes: schema.nodeTypes, variant, tokens, cssIdent, literalTexts };
    for (const info of schema.nodeTypes.values()) {
      parts.push(emitNodeFunction(info, ctx));
    }
  }
  return parts.join('\n\n');
}

function emitNodeFunction(info: NodeTypeInfo, ctx: Ctx): string {
  const fnName = parseFnName(info.name, ctx.variant);

  const validProductions = info.productions.filter((p) => p.recovery === undefined);
  const recoveryProductions = info.productions.filter((p) => p.recovery !== undefined);
  if (recoveryProductions.length > 0) {
    if (validProductions.length === 0) {
      throw new CompilerError(`Node type '${info.name}' has only .recovers() productions — at least one valid production is required`);
    }
    return emitNodeFunctionWithRecovery(info.name, validProductions, recoveryProductions, ctx);
  }

  if (info.productions.length === 1) {
    const body = emitProductionBody(info.productions[0]!, ctx);
    return `function ${fnName}(state: State): unknown {
${indent(body, 1)}
}`;
  }

  // Multi-production: emit each production as its own __alt function and a
  // dispatcher. Try lookahead-based dispatch first (avoids throw/catch
  // overhead of speculation); fall back to pure speculation when the
  // productions can't be distinguished by peek-scan.
  const lookaheadDispatch = emitLookaheadDispatch(info, fnName, ctx);
  if (lookaheadDispatch !== null) {
    // Lookahead dispatch commits via byte-prefix peek — most alts run
    // only once we're sure they match (hard-fail OK). EXCEPTION:
    // productions whose first span has no byte-level signature (until /
    // rawUntil / repeats) live in the dispatcher's unbounded fallback
    // group and get tried via speculation against EVERY line that didn't
    // match a byte prefix. Emit these as softFail (return null on prefix
    // mismatch) so the dispatcher's null check beats a try/catch — the
    // throw/unwind dominated profiles for markdown paragraphs (every
    // non-prefix line speculatively tried setext h1/h2 and threw).
    const altFns = info.productions.map((production, i) => {
      const span0 = production.spans[0];
      const isUnbounded = span0 ? isUnboundedFirstSpan(span0) : false;
      const inlineSpec: InlineFromDispatcher | undefined = isUnbounded
        ? { skipSpans: 0, preboundValues: new Map(), softFail: true }
        : undefined;
      const body = emitProductionBody(production, ctx, inlineSpec);
      return `function ${fnName}__alt${i}(state: State): unknown {
${indent(body, 1)}
}`;
    }).join('\n\n');
    return `${altFns}\n\n${lookaheadDispatch}`;
  }

  // No lookahead dispatcher — we fall back to speculation. Path-finding
  // misses on alts 0..N-2 used to throw + catch, which dominated profiles
  // for any schema hitting this path. Emit those alts in soft-fail mode
  // (return null on prefix mismatch) so the dispatcher can use plain
  // null checks instead of try/catch. The fallback alt N-1 stays hard:
  // by then we've ruled out all other alts, so its throws are real.
  const lastIdx = info.productions.length - 1;
  const softAltFns = info.productions.slice(0, -1).map((production, i) => {
    const body = emitProductionBody(production, ctx, {
      skipSpans: 0,
      preboundValues: new Map(),
      softFail: true,
    });
    return `function ${fnName}__alt${i}(state: State): unknown {
${indent(body, 1)}
}`;
  }).join('\n\n');
  const lastBody = emitProductionBody(info.productions[lastIdx]!, ctx);
  const lastFn = `function ${fnName}__alt${lastIdx}(state: State): unknown {
${indent(lastBody, 1)}
}`;
  const altFns = lastIdx > 0 ? `${softAltFns}\n\n${lastFn}` : lastFn;

  const dispatchChain = info.productions.slice(0, -1).map((_, i) =>
    `  { const r = ${fnName}__alt${i}(state); if (r !== null) return r; }`,
  ).join('\n');
  const dispatch = `function ${fnName}(state: State): unknown {
${dispatchChain}
  return ${fnName}__alt${lastIdx}(state);
}`;
  return `${altFns}\n\n${dispatch}`;
}

// Emit a lookahead-based dispatcher when the productions can be
// distinguished by peeking ahead. Returns null when no such structure is
// detected (caller falls back to speculation).
//
// Two strategies in order:
//   A. Shared-prefix-then-discriminator: all productions share spans
//      0..N-1; the N-th span is a distinct literal per production (one
//      production may have no N-th span — it becomes the fallback).
//   B. Group-by-first-span: productions group by first-span signature.
//      Each group is then recursively dispatched (case A or A again).
function emitLookaheadDispatch(info: NodeTypeInfo, fnName: string, ctx: Ctx): string | null {
  const productions = info.productions;
  if (productions.length < 2) return null;
  const body = emitDispatchBody(productions.map((_, i) => i), productions, fnName, ctx);
  if (body === null) return null;
  return `function ${fnName}(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
${indent(body, 1)}
}`;
}

// Emit dispatch body for a subset of productions. The subset is identified
// by `indexes` into `productions`. Tries shared-prefix dispatch first, then
// first-span grouping.
function emitDispatchBody(
  indexes: ReadonlyArray<number>,
  productions: ReadonlyArray<Production>,
  fnName: string,
  ctx: Ctx,
): string | null {
  if (indexes.length === 0) return null;
  if (indexes.length === 1) {
    return `return ${fnName}__alt${indexes[0]}(state);`;
  }
  const sharedPrefix = emitSharedPrefixDispatch(indexes, productions, fnName, ctx);
  if (sharedPrefix !== null) return sharedPrefix;
  const grouped = emitGroupedFirstSpanDispatch(indexes, productions, fnName, ctx);
  if (grouped !== null) return grouped;
  return null;
}

// Strategy A: productions in `indexes` share spans 0..N-1, then differ by
// a discriminator literal at span[N] (or no span N for the fallback).
function emitSharedPrefixDispatch(
  indexes: ReadonlyArray<number>,
  productions: ReadonlyArray<Production>,
  fnName: string,
  ctx: Ctx,
): string | null {
  const minLen = Math.min(...indexes.map((i) => productions[i]!.spans.length));
  let prefixLen = 0;
  while (prefixLen < minLen) {
    const ref = productions[indexes[0]!]!.spans[prefixLen]!;
    let allMatch = true;
    for (let k = 1; k < indexes.length; k++) {
      if (!sameSpanSignature(ref, productions[indexes[k]!]!.spans[prefixLen]!)) {
        allMatch = false;
        break;
      }
    }
    if (!allMatch) break;
    prefixLen++;
  }
  if (prefixLen === 0 && indexes.some((i) => productions[i]!.spans.length > 0)) {
    // Nothing shared at span 0 — not this strategy.
    return null;
  }
  // Determine discriminator at span[prefixLen] for each production. Two
  // discriminator shapes are supported:
  //   1. Bare literal — switch on `__input.startsWith(...)`
  //   2. Class with .oneOf — scan the class (ident/number) and switch on
  //      the lowercased captured value
  // Mixed shapes are rejected; the dispatcher must be all-literal OR
  // all-class-with-oneOf (with at most one fallback). HTML's 15+ HtmlElement
  // productions all start with `<` (shared prefix=1) and discriminate on
  // an .ident().oneOf([...]) at span 1 — the second shape.
  // literalGroups buckets indexes that share the same discriminator literal —
  // they'll recurse via emitDispatchBody on the sub-group (which re-derives
  // prefixLen and discriminates on a deeper position). This is how Attribute
  // gets routed: all four alts share `name`, three share `name`-`=` and
  // disambiguate via `"`/`'`/(rawUntil), while the boolean alt has no `=`
  // at all and becomes the fallback.
  const literalGroups = new Map<string, number[]>();
  // oneOfGroups maps each lowercased tag name to the alts that accept it.
  // HTML's HtmlElement has 15+ alts sharing `<` and discriminating on
  // `tag.ident().oneOf([...])` — most tag names route to one alt, but void
  // elements ('br','hr',...) appear in both the void and void-self-close
  // alts (so the group has 2 entries, dispatched by speculation among them).
  const oneOfGroups = new Map<string, number[]>();
  // Track classOf-routed indexes (each has its own oneOf set) so we can
  // verify all are accounted for. An alt may contribute multiple keys to
  // oneOfGroups (one per value in its oneOf), so just track membership.
  const oneOfRoutedIdx = new Set<number>();
  // classGroups buckets indexes whose discriminator is a class without
  // .oneOf — multiple alts with the same class predicate (e.g. ident) form
  // a single sub-bucket that recurses through emitDispatchBody. This is what
  // unlocks markdown's `[` prefix (5 alts: 3 share `[ident]`, 2 share `[^`)
  // — without this, the dispatcher gives up and falls back to a 4-deep
  // linear speculation chain that dominated the parse profile (70% of time).
  const classGroups = new Map<string, number[]>();
  let kind: 'literal' | 'oneOf' | null = null;
  let fallbackIdx = -1;
  for (const idx of indexes) {
    const d = productions[idx]!.spans[prefixLen];
    if (!d) {
      if (fallbackIdx >= 0) return null;
      fallbackIdx = idx;
      continue;
    }
    if (d.recursiveRoles.length > 0 || findModifier(d.modifiers, 'until') || findModifier(d.modifiers, 'rawUntil') || findModifier(d.modifiers, 'repeats')) {
      if (fallbackIdx >= 0) return null;
      fallbackIdx = idx;
      continue;
    }
    if (d.class === 'literal' && d.text) {
      if (kind === 'oneOf') return null;
      kind = 'literal';
      let bucket = literalGroups.get(d.text);
      if (!bucket) { bucket = []; literalGroups.set(d.text, bucket); }
      bucket.push(idx);
      continue;
    }
    // Class span with .oneOf — extract values.
    const oneOf = d.refinements.find((r) => r.name === 'oneOf');
    const values = oneOf?.args?.[0];
    if (!Array.isArray(values) || values.some((v) => typeof v !== 'string')) {
      // Class without .oneOf. Two cases:
      //   (a) kind is already 'oneOf' and this alt's class predicate is
      //       compatible with the oneOf discriminator — treat as the
      //       fallback (any ident that doesn't match a oneOf value).
      //       HTML's regular-element alt15 (`.ident().html()` with no
      //       oneOf) follows this shape and was previously falling back
      //       to a 16-deep speculation chain.
      //   (b) Otherwise, group by class predicate for multi-alt class
      //       dispatch (markdown's `[ident]` vs `[^` etc.).
      if (kind === 'oneOf') {
        // Verify the discriminator's class+non-oneOf refinements match —
        // otherwise the shared ident scan in the dispatcher would parse
        // a different class than this alt expects.
        const refAlt0 = productions[indexes[0]!]!.spans[prefixLen]!;
        const sameClass = d.class === refAlt0.class;
        const aRefs = d.refinements.filter((r) => r.name !== 'oneOf').map((r) => JSON.stringify(r)).sort();
        const bRefs = refAlt0.refinements.filter((r) => r.name !== 'oneOf').map((r) => JSON.stringify(r)).sort();
        const sameRefs = aRefs.length === bRefs.length && aRefs.every((r, i) => r === bRefs[i]);
        if (sameClass && sameRefs && fallbackIdx < 0) {
          fallbackIdx = idx;
          continue;
        }
        return null;
      }
      const predKey = classStartPredicateForPeek(d);
      if (predKey === 'false') return null;
      let bucket = classGroups.get(predKey);
      if (!bucket) { bucket = []; classGroups.set(predKey, bucket); }
      bucket.push(idx);
      continue;
    }
    if (kind === 'literal' || classGroups.size > 0) return null;
    kind = 'oneOf';
    const lowered = (values as readonly string[]).map((v) => v.toLowerCase());
    for (const v of lowered) {
      let bucket = oneOfGroups.get(v);
      if (!bucket) { bucket = []; oneOfGroups.set(v, bucket); }
      bucket.push(idx);
    }
    oneOfRoutedIdx.add(idx);
  }
  // Promote pure-class-bucket case to a synthetic 'literal' kind so the
  // existing emit path can drive it. The branches loop emits class
  // predicates alongside (or instead of) literal startsWith checks.
  if (kind === null && classGroups.size > 0) kind = 'literal';
  if (kind === null) return null;
  if (kind === 'literal' && literalGroups.size === 0 && classGroups.size === 0) return null;
  if (kind === 'oneOf' && oneOfRoutedIdx.size === 0) return null;
  const literalCount = [...literalGroups.values()].reduce((s, g) => s + g.length, 0);
  const classCount = [...classGroups.values()].reduce((s, g) => s + g.length, 0);
  if (kind === 'literal' && literalCount + classCount + (fallbackIdx >= 0 ? 1 : 0) !== indexes.length) return null;
  if (kind === 'oneOf' && oneOfRoutedIdx.size + (fallbackIdx >= 0 ? 1 : 0) !== indexes.length) return null;
  // Safety: a literal whose first byte falls inside one of the class
  // predicates would silently steal that byte from the class branch.
  // Bail out so we don't generate wrong dispatch.
  if (kind === 'literal' && classGroups.size > 0) {
    for (const literal of literalGroups.keys()) {
      const firstByte = literal.charCodeAt(0);
      for (const predKey of classGroups.keys()) {
        if (classPredicateAcceptsByte(predKey, firstByte)) return null;
      }
    }
  }

  const peekScan = emitPeekScanForSpans(productions[indexes[0]!]!.spans.slice(0, prefixLen));
  if (peekScan === null) return null;

  const wsSkip = `// Skip ws before the discriminator.
while (__peek < __len) {
  const __c = __input.charCodeAt(__peek);
  if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
  break;
}`;

  if (kind === 'literal') {
    const ordered = [...literalGroups.entries()].sort((a, b) => b[0].length - a[0].length);
    const branches: string[] = [];
    for (const [literal, subIndexes] of ordered) {
      let body: string;
      if (subIndexes.length === 1) {
        body = `return ${fnName}__alt${subIndexes[0]}(state);`;
      } else {
        const sub = emitDispatchBody(subIndexes, productions, fnName, ctx);
        if (sub === null) return null;
        // The recursive dispatch re-walks from the start of the production
        // because emitPeekScanForSpans always anchors at the current
        // __peek. Reset it to state.off so the inner scan covers the full
        // sub-prefix (which includes our discriminator literal).
        body = `__peek = state.off;\n${sub}`;
      }
      branches.push(`if (${peekLiteralExpr(literal)}) {
${indent(body, 1)}
}`);
    }
    // Class-without-oneOf branches: each predicate gets one branch whose
    // body is the recursive dispatch over the bucket's alts. Order doesn't
    // matter because predicates are disjoint with literals (verified above)
    // and disjoint with each other (different predicate keys → different
    // byte ranges in practice).
    for (const [predKey, subIndexes] of classGroups) {
      let body: string;
      if (subIndexes.length === 1) {
        body = `return ${fnName}__alt${subIndexes[0]}(state);`;
      } else {
        const sub = emitDispatchBody(subIndexes, productions, fnName, ctx);
        if (sub === null) return null;
        body = `__peek = state.off;\n${sub}`;
      }
      branches.push(`if (${predKey}) {
${indent(body, 1)}
}`);
    }
    const tail = fallbackIdx >= 0
      ? `return ${fnName}__alt${fallbackIdx}(state);`
      : `throw new SyntaxError('no production matched at position ' + __peek);`;
    return `${peekScan}
${wsSkip}
${branches.join('\n')}
${tail}`;
  }

  // kind === 'oneOf': scan the class at __peek (ident — only ident is
  // currently supported here; extend for number/hex/string as needed),
  // lowercase, and dispatch on the value.
  const discSpan = productions[indexes[0]!]!.spans[prefixLen]!;
  // For now only ident class is supported as a oneOf discriminator.
  if (discSpan.class !== 'ident') return null;
  const refSet = new Set(discSpan.refinements.map((r) => r.name));
  const identStart = refSet.has('html')
    ? `isCssIdentStart(__input.charCodeAt(__peek))`
    : refSet.has('js')
      ? `isJsIdentStart(__input.charCodeAt(__peek))`
      : `(isCssIdentStart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c)`;
  // The discriminator span has a name (e.g. 'tag') — its source slice is
  // captured into the structure as that name. When we inline an alt's
  // body, we need to pass the original-case slice in so $.tag references
  // still resolve correctly. We capture both __tagOrig (original case,
  // used as the value) and __ident (lowercased, used for branch dispatch).
  const discName = discSpan.name;
  // Body-helper extraction is only safe in variants that don't need source
  // ranges (`source.start.offset` etc. anchored on __startOff) — i.e.
  // fast and validate. In raws mode we'd lose the __startOff alignment,
  // so call the standalone alt instead.
  const canExtractBody = discName !== undefined && ctx.variant !== 'raws';
  const preboundValues = canExtractBody
    ? new Map([[discName!, '__pre_' + discName!]])
    : new Map<string, string>();

  // Generate per-alt body helpers that skip the prefix the dispatcher
  // already walked. Without this, every HtmlElement parse re-walks `<` +
  // ident + oneOf check inside the called alt, duplicating the dispatcher.
  // The dispatcher just sets state.off past the discriminator and passes
  // the captured ident slice in.
  const bodyHelpers = new Map<number, string>();
  const bodyHelperName = (idx: number): string => `${fnName}__alt${idx}__body`;
  const ensureBodyHelper = (idx: number): string => {
    if (bodyHelpers.has(idx)) return bodyHelperName(idx);
    const name = bodyHelperName(idx);
    const inlineSpec: InlineFromDispatcher = {
      skipSpans: prefixLen + 1,
      preboundValues,
    };
    const altBody = emitProductionBody(productions[idx]!, ctx, inlineSpec);
    // The discriminator value (e.g. tag string) flows through as a fn arg
    // so the helper itself doesn't allocate; the dispatcher passes the
    // slice it already needed for the oneOf compare.
    const paramName = '__pre_' + (discName ?? 'disc');
    const helper = `function ${name}(state: State, ${paramName}: string): unknown {
${indent(altBody, 1)}
}`;
    bodyHelpers.set(idx, helper);
    return name;
  };

  // Try to emit a merged body when multi-alt sub-bucket members differ
  // only in the final literal span. Returns the helper name or null if
  // the alts aren't mergeable (different shapes, structures, or
  // non-literal tails).
  const mergedHelpers = new Map<string, string>();
  const ensureMergedTailHelper = (
    subIndexes: ReadonlyArray<number>,
    productionsArr: ReadonlyArray<Production>,
    ctxArg: Ctx,
    prefixLenArg: number,
    preboundValuesArg: ReadonlyMap<string, string>,
    fnNameArg: string,
    helpersArg: Map<number, string>,
    helperNameFn: (idx: number) => string,
  ): string | null => {
    const cacheKey = subIndexes.join(',');
    const cached = mergedHelpers.get(cacheKey);
    if (cached) return cached;
    if (subIndexes.length < 2) return null;
    const ref = productionsArr[subIndexes[0]!]!;
    const lastAlts: string[] = [];
    for (let i = 0; i < subIndexes.length; i++) {
      const p = productionsArr[subIndexes[i]!]!;
      if (p.spans.length !== ref.spans.length) return null;
      for (let s = 0; s < p.spans.length - 1; s++) {
        if (!sameSpanSignature(p.spans[s]!, ref.spans[s]!)) return null;
      }
      const last = p.spans[p.spans.length - 1]!;
      if (last.class !== 'literal' || !last.text) return null;
      if (last.name) return null; // last span shouldn't bind a value
      if (hasModifier(last.modifiers, 'optional')) return null;
      if (lastAlts.includes(last.text)) return null; // duplicate, weird
      lastAlts.push(last.text);
      // Structures must be identical so we emit one tail.
      if (JSON.stringify(p.structure) !== JSON.stringify(ref.structure)) return null;
    }
    const name = `${fnNameArg}__altMerged_${subIndexes.join('_')}__body`;
    const inlineSpec: InlineFromDispatcher = {
      skipSpans: prefixLenArg + 1,
      preboundValues: preboundValuesArg,
      lastSpanLiteralAlternatives: lastAlts,
    };
    const mergedBody = emitProductionBody(ref, ctxArg, inlineSpec);
    const paramName = '__pre_' + (discName ?? 'disc');
    const helper = `function ${name}(state: State, ${paramName}: string): unknown {
${indent(mergedBody, 1)}
}`;
    // Reuse bodyHelpers map for emission; index doesn't matter since the
    // function name is unique per merged set.
    helpersArg.set(-(subIndexes[0]! + 1) * 1000, helper); // negative-keyed slot
    mergedHelpers.set(cacheKey, name);
    return name;
  };

  // Collapse identical sub-bucket targets so void elements (which map every
  // tag in the void list to the same [alt1, alt2] pair) don't each emit a
  // separately-numbered helper. Same key → same emitted body.
  const dispatchLines: string[] = [];
  const subDispatchBodies = new Map<string, string>();
  for (const [value, subIndexes] of oneOfGroups) {
    const key = subIndexes.join(',');
    if (!subDispatchBodies.has(key)) {
      let body: string;
      if (subIndexes.length === 1) {
        if (canExtractBody) {
          const helper = ensureBodyHelper(subIndexes[0]!);
          body = `state.off = __peek; return ${helper}(state, __tagOrig);`;
        } else {
          body = `return ${fnName}__alt${subIndexes[0]}(state);`;
        }
      } else {
        // Check if alts differ ONLY in their final literal span (e.g. HTML
        // void elements: alt1=`<` tag attrs `>`, alt2=`<` tag attrs `/>`).
        // These can be merged into one body that peeks the final literal
        // — no speculation, no throw on the rejected branch. Big win on
        // input with many `<br />` / `<input />` (synthetic bench was
        // throwing once per void self-close).
        if (canExtractBody) {
          const mergedHelper = ensureMergedTailHelper(subIndexes, productions, ctx, prefixLen, preboundValues, fnName, bodyHelpers, bodyHelperName);
          if (mergedHelper !== null) {
            body = `state.off = __peek; return ${mergedHelper}(state, __tagOrig);`;
            subDispatchBodies.set(key, body);
            const tagBody = subDispatchBodies.get(key)!;
            dispatchLines.push(`if (__ident === ${jsString(value)}) {
${indent(tagBody, 1)}
}`);
            continue;
          }
        }
        const sub = emitDispatchBody(subIndexes, productions, fnName, ctx);
        if (sub !== null) {
          body = `__peek = state.off;\n${sub}`;
        } else {
          // Sub-group can't be cheaply disambiguated by peek — speculate
          // among them. Vastly cheaper than the outer dispatcher's full
          // alt chain, because the bucket is small (typically 2).
          // Don't touch state.off: __peek is past the tag ident, but the
          // sub-alts parse the full production from the element start.
          const last = subIndexes[subIndexes.length - 1]!;
          const speculative = subIndexes.slice(0, -1).map((i) =>
            `{ const r = trySpeculate(state, ${fnName}__alt${i}); if (r !== null) return r; }`,
          ).join('\n');
          body = `${speculative}\nreturn ${fnName}__alt${last}(state);`;
        }
      }
      subDispatchBodies.set(key, body);
    }
    const body = subDispatchBodies.get(key)!;
    dispatchLines.push(`if (__ident === ${jsString(value)}) {
${indent(body, 1)}
}`);
  }
  // Fallback (no .oneOf — accepts any tag): also extract its body so the
  // common `<div>`/`<span>`/`<a>` path skips the prefix the dispatcher
  // just walked. Without this the fallback retains the full standalone
  // alt body and dominates the profile for regular-element-heavy input.
  let fallbackCall = fallbackIdx >= 0
    ? `return ${fnName}__alt${fallbackIdx}(state);`
    : `throw new SyntaxError('no production matched at position ' + __peek);`;
  if (canExtractBody && fallbackIdx >= 0) {
    // Same shape as the keyed branches: the fallback production also
    // starts with `<` + ident discriminator (just no .oneOf).
    const fbProd = productions[fallbackIdx]!;
    const fbDisc = fbProd.spans[prefixLen];
    if (fbDisc && fbDisc.class === 'ident' && fbDisc.name === discName) {
      const helper = ensureBodyHelper(fallbackIdx);
      fallbackCall = `state.off = __peek; return ${helper}(state, __tagOrig);`;
    }
  }
  // Emit body helpers BEFORE the dispatcher; they're function declarations,
  // so they hoist within the surrounding module, but emitting in source
  // order makes the generated file easier to read.
  if (bodyHelpers.size > 0) {
    pendingHelpers.push([...bodyHelpers.values()].join('\n\n'));
  }
  const tail = fallbackCall;
  const identCapture = canExtractBody
    ? `  const __tagOrig = __input.slice(__identStart, __peek);
  const __ident = __tagOrig.toLowerCase();`
    : `  const __ident = __input.slice(__identStart, __peek).toLowerCase();`;
  return `${peekScan}
${wsSkip}
if (!(${identStart})) ${fallbackIdx >= 0 ? `return ${fnName}__alt${fallbackIdx}(state);` : `throw new SyntaxError('expected ident at position ' + __peek);`}
{
  const __identStart = __peek;
  __peek++;
  while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
${identCapture}
  ${dispatchLines.join('\n  ')}
  ${tail}
}`;
}

// Strategy B: group productions by first-byte predicate (the actual
// runtime check), then within each predicate group recursively dispatch.
// Returns null when fewer than 2 byte predicates would result.
function emitGroupedFirstSpanDispatch(
  indexes: ReadonlyArray<number>,
  productions: ReadonlyArray<Production>,
  fnName: string,
  ctx: Ctx,
): string | null {
  // Group by first-byte predicate (NOT first-span signature). Two
  // productions with the same byte predicate go in the same group even if
  // their first-span signatures differ (e.g., one has .oneOf and the other
  // doesn't — both still start with the same class of byte).
  type Group = {
    check: string;       // Runtime byte-level check
    literal?: string;    // Set when the predicate is "literal starts with X"
    indexes: number[];
  };
  const groups: Group[] = [];
  // Productions with no byte-level signature (until/rawUntil/repeats first
  // span). Collected and tried last via speculation — they were previously
  // killing the entire grouped-first-span dispatch.
  const unboundedIndexes: number[] = [];
  for (const idx of indexes) {
    const span0 = productions[idx]!.spans[0];
    if (!span0) return null;
    if (isUnboundedFirstSpan(span0)) {
      unboundedIndexes.push(idx);
      continue;
    }
    const { check, literal } = firstBytePredicateOf(span0);
    if (check === null) return null;
    let group = groups.find((g) => g.check === check);
    if (!group) {
      group = { check, literal, indexes: [] };
      groups.push(group);
    }
    group.indexes.push(idx);
  }
  if (groups.length + (unboundedIndexes.length > 0 ? 1 : 0) < 2) return null;
  // Sort: literal groups first (by length desc) so multi-char literals
  // win over their single-char prefixes; class predicates last.
  groups.sort((a, b) => {
    const aLit = a.literal !== undefined;
    const bLit = b.literal !== undefined;
    if (aLit && !bLit) return -1;
    if (!aLit && bLit) return 1;
    if (aLit && bLit) return (b.literal!.length - a.literal!.length);
    return 0;
  });
  // Build each branch — recursive dispatch if multi-prod, direct call if
  // single, speculation chain if multi-prod with no further structure.
  const groupBodies: Array<{ check: string; body: string }> = [];
  for (const group of groups) {
    let body: string | null = emitDispatchBody(group.indexes, productions, fnName, ctx);
    if (body === null) {
      // Fall back to speculation among the group's productions.
      body = emitSpeculationChain(group.indexes, fnName);
    }
    groupBodies.push({ check: group.check, body });
  }
  const wsSkip = `// Skip leading ws before discriminating on first span.
while (__peek < __len) {
  const __c = __input.charCodeAt(__peek);
  if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
  break;
}`;
  // Fallback tail: productions whose first span has no fixed byte
  // signature (until/rawUntil/repeats). These alts are emitted in
  // softFail mode by emitNodeFunction, so the speculation chain uses
  // direct null checks instead of trySpeculate's try/catch.
  let fallbackTail: string;
  if (unboundedIndexes.length === 0) {
    fallbackTail = `throw new SyntaxError('no production matched at position ' + __peek);`;
  } else if (unboundedIndexes.length === 1) {
    fallbackTail = `return ${fnName}__alt${unboundedIndexes[0]}(state);`;
  } else {
    fallbackTail = emitSpeculationChain(unboundedIndexes, fnName, /* softFailAlts */ true);
  }
  // Two-level dispatch: bucket groups by their first-byte (when literal)
  // so the generated dispatcher does ONE charCodeAt + N startsWith for
  // sibling literals (`#`/`##`/`###`/...), instead of N independent
  // startsWith calls each scanning the input from scratch. For paragraph-
  // heavy markdown this skips ~11 startsWith calls per leaf in favour of
  // a single byte check.
  type ByteBucket = { byte: number; bodies: Array<{ check: string; body: string; literal: string; }>; };
  const byByte = new Map<number, ByteBucket>();
  const classBodies: Array<{ check: string; body: string }> = [];
  for (const { check, body } of groupBodies) {
    // Match the literal text out of `groupBodies`. We kept the `check`
    // string verbatim; recover the literal from the matching group entry.
    const grp = groups.find((g) => g.check === check);
    const literal = grp?.literal;
    if (literal && literal.length > 0) {
      const code = literal.charCodeAt(0);
      let bucket = byByte.get(code);
      if (!bucket) { bucket = { byte: code, bodies: [] }; byByte.set(code, bucket); }
      bucket.bodies.push({ check, body, literal });
    } else {
      classBodies.push({ check, body });
    }
  }
  // Emit byte buckets first (most efficient — single charCodeAt + branch).
  // Within each bucket, sort by literal length desc so longer wins.
  // Use a unique outer-byte variable name (__byte0) so nested peek-scan
  // blocks that redeclare `__c` don't collide.
  const bucketBranches: string[] = [];
  for (const bucket of byByte.values()) {
    bucket.bodies.sort((a, b) => b.literal.length - a.literal.length);
    let inner: string;
    if (bucket.bodies.length === 1) {
      const { check, body, literal } = bucket.bodies[0]!;
      if (literal.length === 1) {
        inner = body;
      } else {
        inner = `if (${check}) {\n${indent(body, 1)}\n}`;
      }
    } else {
      const lines: string[] = [];
      for (let i = 0; i < bucket.bodies.length; i++) {
        const { check, body, literal } = bucket.bodies[i]!;
        const open = i === 0 ? 'if' : 'else if';
        // Single-byte literal at the end of the chain — already implied by
        // the outer byte match, no need for an explicit check.
        if (literal.length === 1 && i === bucket.bodies.length - 1) {
          lines.push(i === 0 ? body : `else {\n${indent(body, 1)}\n}`);
        } else {
          lines.push(`${open} (${check}) {\n${indent(body, 1)}\n}`);
        }
      }
      inner = lines.join('\n');
    }
    bucketBranches.push(`if (__byte0 === ${bucket.byte}) {\n${indent(inner, 1)}\n}`);
  }
  const classBranches = classBodies.map(({ check, body }) =>
    `if (${check}) {\n${indent(body, 1)}\n}`,
  );
  const allBranches = [...bucketBranches, ...classBranches];
  // Single hoisted byte load reused by every bucket header. Nested blocks
  // are free to declare their own `__c` because we don't share the name.
  const headerLoad = byByte.size > 0
    ? '  const __byte0 = __input.charCodeAt(__peek);\n'
    : '';
  const branches = allBranches.join(' else ');
  return `${wsSkip}
${headerLoad}${branches}
${fallbackTail}`;
}

// Return the byte-level predicate for the first span. For literal spans
// this is a startsWith check; for class spans, the class start predicate.
function firstBytePredicateOf(span: ResolvedSpan): { check: string | null; literal?: string } {
  // until / rawUntil / repeats spans have no fixed first byte — their
  // capture starts at the current offset and runs until a stop marker, so
  // the `.span(name, exampleValue)` example text is NOT a discriminator.
  // Without this guard, markdown's setext heading production
  // (`.span('text', 'Setext heading').until('\n')`) generated a wasted
  // `startsWith("Setext heading")` check at the top of the leaf dispatcher
  // that ran (and missed) on every paragraph and list item.
  if (findModifier(span.modifiers, 'until')) return { check: null };
  if (findModifier(span.modifiers, 'rawUntil')) return { check: null };
  if (findModifier(span.modifiers, 'repeats')) return { check: null };
  if (span.class === 'literal' && span.text) {
    return { check: peekLiteralExpr(span.text), literal: span.text };
  }
  if (span.class === 'literal') return { check: null };
  return { check: classStartPredicateForPeek(span), literal: undefined };
}

// Like firstBytePredicateOf, but also distinguishes the "this span has no
// fixed first byte — treat as fallback" case. Productions that match this
// shape get bucketed together and tried last via speculation, instead of
// causing the dispatcher to give up.
function isUnboundedFirstSpan(span: ResolvedSpan): boolean {
  if (findModifier(span.modifiers, 'until')) return true;
  if (findModifier(span.modifiers, 'rawUntil')) return true;
  if (findModifier(span.modifiers, 'repeats')) return true;
  return false;
}

function emitSpeculationChain(indexes: ReadonlyArray<number>, fnName: string, softFailAlts: boolean = false): string {
  // Sync state.off before any speculation: __peek is local, but
  // trySpeculate operates on state.off. When all alts are emitted in
  // softFail mode (return null on failure rather than throwing), skip
  // trySpeculate's try/catch entirely — a plain null check is much
  // cheaper. Markdown's setext heading speculation, which runs against
  // every paragraph line, took 40% of parse time via the throw/unwind
  // path; the direct null path turns that into a branch.
  if (softFailAlts) {
    // All alts are softFail (return null on no-match). Chain them with
    // null checks, then throw at the end so the role dispatcher can fall
    // through to the next role (matches the throw-based contract of
    // tryRoles). Without the trailing throw, a chain that exhausts every
    // softFail alt would return null, which tryRoles treats as a real
    // value — breaking sibling-role fallback.
    const guarded = indexes.map((i) =>
      `{ state.off = __peek; const r = ${fnName}__alt${i}(state); if (r !== null) return r; }`,
    ).join('\n');
    return `${guarded}
state.off = __peek;
throw new SyntaxError('no production matched at position ' + __peek);`;
  }
  const speculative = indexes.slice(0, -1).map((i) =>
    `{ const r = trySpeculate(state, ${fnName}__alt${i}); if (r !== null) return r; }`,
  ).join('\n');
  const last = indexes[indexes.length - 1]!;
  return `state.off = __peek;
${speculative}
return ${fnName}__alt${last}(state);`;
}

// Returns true when the literal's first byte falls inside the byte set
// accepted by `predKey` (the string emitted by classStartPredicateForPeek).
// Used as a safety check in emitSharedPrefixDispatch so a literal branch
// doesn't silently shadow a class-without-oneOf branch.
function classPredicateAcceptsByte(predKey: string, byte: number): boolean {
  // ident-start (CSS/HTML): A-Z / a-z / _ / $ / 0x80+
  if (predKey.includes('isCssIdentStart')) {
    const c = byte;
    if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || c === 0x5F || c === 0x24 || c >= 0x80) return true;
    if (predKey.includes('0x5c') && c === 0x5C) return true;
    return false;
  }
  if (predKey.includes('isJsIdentStart')) {
    const c = byte;
    return (c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A) || c === 0x5F || c === 0x24 || c >= 0x80;
  }
  if (predKey.includes('isDigit')) return byte >= 0x30 && byte <= 0x39;
  if (predKey.includes('isHexDigit')) {
    return (byte >= 0x30 && byte <= 0x39) || (byte >= 0x41 && byte <= 0x46) || (byte >= 0x61 && byte <= 0x66);
  }
  if (predKey.includes('=== 0x22 || ') && predKey.includes('=== 0x27')) {
    return byte === 0x22 || byte === 0x27;
  }
  if (predKey.includes('=== 0x2f')) return byte === 0x2F; // comment / regexp start
  // Unknown predicate shape — conservative: assume it might accept.
  return true;
}

// Like classStartPredicate from scan-class, but uses __peek for offset
// (rather than state.off). Inlined here to avoid coupling.
function classStartPredicateForPeek(span: ResolvedSpan): string {
  const { class: cls, refinements } = span;
  const refSet = new Set(refinements.map((r) => r.name));
  const cExpr = `__input.charCodeAt(__peek)`;
  if (cls === 'ident' && refSet.has('html')) return `isCssIdentStart(${cExpr})`;
  if (cls === 'ident' && refSet.has('js')) return `isJsIdentStart(${cExpr})`;
  if (cls === 'ident' && refSet.has('css')) return `(isCssIdentStart(${cExpr}) || ${cExpr} === 0x5c)`;
  if (cls === 'ident') return `(isCssIdentStart(${cExpr}) || ${cExpr} === 0x5c)`;
  if (cls === 'number') return `isDigit(${cExpr})`;
  if (cls === 'hex') return `isHexDigit(${cExpr})`;
  if (cls === 'string') return `(${cExpr} === 0x22 || ${cExpr} === 0x27)`;
  if (cls === 'comment') return `(${cExpr} === 0x2f && __input.charCodeAt(__peek + 1) === 0x2a)`;
  return 'false';
}

// Emit a peek-scan snippet that walks `__peek` past the given prefix spans,
// or returns null if any span isn't supported in peek mode. Operates on
// __input / __len / __peek (caller declared). Includes inter-span ws skip.
function emitPeekScanForSpans(spans: ReadonlyArray<ResolvedSpan>): string | null {
  const lines: string[] = [];
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    if (i > 0) {
      lines.push(`  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }`);
    } else {
      lines.push(`  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }`);
    }
    if (hasModifier(span.modifiers, 'optional') || hasModifier(span.modifiers, 'repeats')) {
      return null;
    }
    if (findModifier(span.modifiers, 'until') || findModifier(span.modifiers, 'rawUntil')) {
      return null;
    }
    if (span.recursiveRoles.length > 0) return null;
    if (span.class === 'literal') {
      if (!span.text) return null;
      lines.push(`  if (!(${peekLiteralExprAt('__peek', span.text)})) return null;`);
      lines.push(`  __peek += ${span.text.length};`);
      continue;
    }
    // Class span: scan past
    const scan = peekScanForClass(span);
    if (scan === null) return null;
    lines.push(scan);
  }
  return lines.join('\n').replace(/return null;/g, "throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);");
}

function peekScanForClass(span: ResolvedSpan): string | null {
  const { class: cls, refinements } = span;
  const refSet = new Set(refinements.map((r) => r.name));
  if (cls === 'ident' && refSet.has('html')) {
    return `  if (!(__peek < __len && isCssIdentStart(__input.charCodeAt(__peek)))) return null;
  __peek++;
  while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;`;
  }
  if (cls === 'ident' && refSet.has('js')) {
    return `  if (!(__peek < __len && isJsIdentStart(__input.charCodeAt(__peek)))) return null;
  __peek++;
  while (__peek < __len && isJsIdentPart(__input.charCodeAt(__peek))) __peek++;`;
  }
  if (cls === 'ident') {
    return `  if (!(__peek < __len && (isCssIdentStart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c))) return null;
  __peek++;
  while (__peek < __len && (isCssIdentPart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c)) __peek++;`;
  }
  if (cls === 'number') {
    return `  if (!(__peek < __len && isDigit(__input.charCodeAt(__peek)))) return null;
  __peek++;
  while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
  if (__peek < __len && __input.charCodeAt(__peek) === 0x2e && __peek + 1 < __len && isDigit(__input.charCodeAt(__peek + 1))) {
    __peek++;
    while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
  }`;
  }
  if (cls === 'hex') {
    return `  if (!(__peek < __len && isHexDigit(__input.charCodeAt(__peek)))) return null;
  __peek++;
  while (__peek < __len && isHexDigit(__input.charCodeAt(__peek))) __peek++;`;
  }
  if (cls === 'string') {
    return `  if (!(__peek < __len && (__input.charCodeAt(__peek) === 0x22 || __input.charCodeAt(__peek) === 0x27))) return null;
  {
    const __pq = __input.charCodeAt(__peek);
    __peek++;
    while (__peek < __len) {
      const __pc = __input.charCodeAt(__peek);
      if (__pc === 0x5c) { __peek += 2; continue; }
      if (__pc === __pq) { __peek++; break; }
      if (__pc === 0x0a || __pc === 0x0d) break;
      __peek++;
    }
  }`;
  }
  return null;
}

function peekLiteralExpr(text: string): string {
  return peekLiteralExprAt('__peek', text);
}

// Punctuators that extend `text` but aren't covered by any of
// `earlierCovers` (literals tested before this one in the dispatcher).
// Returns the minimal antichain — for the HTML case with text='<' and
// earlierCovers=['<!--','<!'], this returns ['</'] which excludes every
// declared `</xxx>` punctuator with a single startsWith check.
function uncoveredLiteralExtensions(
  text: string,
  allLiterals: ReadonlySet<string>,
  earlierCovers: ReadonlyArray<string>,
): ReadonlyArray<string> {
  if (text.length === 0) return [];
  const extensions: string[] = [];
  for (const lit of allLiterals) {
    if (lit.length <= text.length) continue;
    if (!lit.startsWith(text)) continue;
    let covered = false;
    for (const cov of earlierCovers) {
      if (cov.length > text.length && lit.startsWith(cov)) { covered = true; break; }
    }
    if (!covered) extensions.push(lit);
  }
  extensions.sort((a, b) => a.length - b.length);
  const antichain: string[] = [];
  for (const ext of extensions) {
    if (antichain.some((r) => ext.startsWith(r))) continue;
    antichain.push(ext);
  }
  return antichain;
}

function peekLiteralExprAt(offsetExpr: string, text: string): string {
  if (text.length === 1) {
    return `__input.charCodeAt(${offsetExpr}) === ${text.charCodeAt(0)}`;
  }
  if (text.length === 2) {
    return `__input.charCodeAt(${offsetExpr}) === ${text.charCodeAt(0)} && __input.charCodeAt(${offsetExpr} + 1) === ${text.charCodeAt(1)}`;
  }
  return `__input.startsWith(${jsString(text)}, ${offsetExpr})`;
}

function excludeLiteralExtensionExprAt(offsetExpr: string, prefix: string, extension: string): string {
  if (!extension.startsWith(prefix) || extension.length <= prefix.length) {
    return `!(${peekLiteralExprAt(offsetExpr, extension)})`;
  }
  const suffix = extension.slice(prefix.length);
  if (suffix.length === 1) {
    return `__input.charCodeAt(${offsetExpr} + ${prefix.length}) !== ${suffix.charCodeAt(0)}`;
  }
  const suffixChecks: string[] = [];
  for (let i = 0; i < suffix.length; i++) {
    suffixChecks.push(`__input.charCodeAt(${offsetExpr} + ${prefix.length + i}) === ${suffix.charCodeAt(i)}`);
  }
  return `!(${suffixChecks.join(' && ')})`;
}

function sameSpanSignature(a: ResolvedSpan, b: ResolvedSpan): boolean {
  if (a.class !== b.class) return false;
  if (a.class === 'literal' && a.text !== b.text) return false;
  if (a.recursiveRoles.length !== b.recursiveRoles.length) return false;
  for (let i = 0; i < a.recursiveRoles.length; i++) if (a.recursiveRoles[i] !== b.recursiveRoles[i]) return false;
  if (a.refinements.length !== b.refinements.length) return false;
  for (let i = 0; i < a.refinements.length; i++) {
    const r1 = a.refinements[i]!;
    const r2 = b.refinements[i]!;
    if (r1.name !== r2.name) return false;
    if (JSON.stringify(r1.args ?? []) !== JSON.stringify(r2.args ?? [])) return false;
  }
  // Ignore post-consume modifiers (noWhitespaceAfter, noLineTerminatorAfter,
  // requireSpaceAfter) for shared-prefix matching — they affect what
  // happens AFTER the span matches, not whether the span matches.
  const aMods = a.modifiers.filter((m) => m.kind !== 'noWhitespaceAfter' && m.kind !== 'noLineTerminatorAfter' && m.kind !== 'requireSpaceAfter');
  const bMods = b.modifiers.filter((m) => m.kind !== 'noWhitespaceAfter' && m.kind !== 'noLineTerminatorAfter' && m.kind !== 'requireSpaceAfter');
  if (aMods.length !== bMods.length) return false;
  for (let i = 0; i < aMods.length; i++) {
    if (JSON.stringify(aMods[i]) !== JSON.stringify(bMods[i])) return false;
  }
  return true;
}

function emitNodeFunctionWithRecovery(
  nodeName: string,
  validProductions: ReadonlyArray<Production>,
  recoveryProductions: ReadonlyArray<Production>,
  ctx: Ctx,
): string {
  const fnName = parseFnName(nodeName, ctx.variant);
  const validFnName = `${fnName}__valid`;
  const validInfo: NodeTypeInfo = { name: nodeName, productions: validProductions };
  // Snapshot pendingHelpers so we can apply the same rename to any helpers
  // emitNodeFunction pushes onto it (e.g. dispatcher-extracted alt body
  // helpers like `parseHtmlElement__alt5__body` → `parseHtmlElement__valid__alt5__body`).
  const helpersBefore = pendingHelpers.length;
  const validDispatch = emitNodeFunction(validInfo, { ...ctx }).replace(
    new RegExp(`function ${escapeRegex(fnName)}\\(`, 'g'),
    `function ${validFnName}(`,
  ).replace(
    new RegExp(`${escapeRegex(fnName)}__alt`, 'g'),
    `${validFnName}__alt`,
  );
  for (let i = helpersBefore; i < pendingHelpers.length; i++) {
    pendingHelpers[i] = pendingHelpers[i]!.replace(
      new RegExp(`${escapeRegex(fnName)}__alt`, 'g'),
      `${validFnName}__alt`,
    );
  }

  const recoveryFns = recoveryProductions.map((production, i) => {
    const body = emitProductionBody(production, ctx);
    return `function ${fnName}__recovery${i}(state: State): unknown {
${indent(body, 1)}
}`;
  }).join('\n\n');

  const recoveryAttempts = recoveryProductions.map((_, i) =>
    `    const __r${i} = trySpeculate(state, ${fnName}__recovery${i});
    if (__r${i} !== null) return __r${i};`,
  ).join('\n');

  const wrapper = `function ${fnName}(state: State): unknown {
  const __recoverStart = state.off;
  try {
    return ${validFnName}(state);
  } catch (__validErr) {
    state.off = __recoverStart;
${recoveryAttempts}
    state.off = __recoverStart;
    throw __validErr;
  }
}`;

  return `${validDispatch}\n\n${recoveryFns}\n\n${wrapper}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Inline whitespace-skip snippet (uses hoisted __input/__len/__off locals).
// When the schema declares `tokens: ['comment']`, also skip past /* */
// comments — mirrors the tokenized backend where comments are tokens that
// `skipComments` / `nextNonCommentPos` automatically step over between
// adjacent significant tokens.
function inlineSkipWs(ctx?: Ctx): string {
  const skipComments = ctx?.tokens.has('comment') ?? false;
  if (!skipComments) {
    return `while (__off < __len) {
  const __ws_c = __input.charCodeAt(__off);
  if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
  break;
}`;
  }
  return `while (__off < __len) {
  const __ws_c = __input.charCodeAt(__off);
  if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
  if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
    __off += 2;
    while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
    if (__off < __len) __off += 2;
    continue;
  }
  break;
}`;
}

// --- Production body -------------------------------------------------------

type InlineFromDispatcher = {
  // Number of leading spans the dispatcher has already walked (and which
  // the inlined body should skip).
  readonly skipSpans: number;
  // Map of span name → JS variable in the dispatcher's scope holding the
  // value the body would otherwise compute. For HtmlElement this is
  // `{ tag: '__tagOrig' }` so the body's structure references `tag`
  // resolve to the dispatcher's pre-captured source slice.
  readonly preboundValues: ReadonlyMap<string, string>;
  // When set, the production's LAST literal span is replaced by a peek
  // that tries each alternative literal in turn. Used to merge alts that
  // differ ONLY in the closing literal — e.g. HTML void (`>`) vs void
  // self-close (`/>`) — into one body that avoids the trySpeculate throw
  // on the rejected branch. Alternatives are sorted longest first so the
  // multi-byte form wins over its prefix.
  readonly lastSpanLiteralAlternatives?: ReadonlyArray<string>;
  // Soft-fail mode: every `throw new SyntaxError(...)` in this body is
  // rewritten into `{ state.off = __softStart; return null; }`. The
  // function then returns `result | null` and callers use a direct
  // null-check instead of try/catch. Used for alts in a speculation
  // chain — path-finding misses become branchless returns, eliminating
  // the V8 Error-construction + stack-unwind cost that dominated profiles
  // on input shapes that exercised speculation.
  readonly softFail?: boolean;
};

function emitProductionBody(production: Production, ctx: Ctx, inline?: InlineFromDispatcher): string {
  const lines: string[] = [];
  const valueExpr = new Map<string, string>();
  const presenceExpr = new Map<string, string>();
  const startOffExpr = new Map<string, string>();
  const endOffExpr = new Map<string, string>();
  const spans = production.spans;
  const structureOptions = ctx.variant === 'fast' || ctx.variant === 'validate' ? { omitRaws: true } : {};
  const offsetRefs = collectOffsetRefs(production.structure, structureOptions);
  const needsNodeRange = ctx.variant === 'raws';
  const skipSpans = inline?.skipSpans ?? 0;

  if (inline) {
    // Pre-populate value/presence maps so $.<name> references in the
    // structure resolve to the dispatcher's locals.
    for (const [name, varName] of inline.preboundValues) {
      valueExpr.set(name, varName);
      presenceExpr.set(name, `(${varName} !== '' && ${varName} !== null)`);
    }
  }

  // Always emit __input/__len/__off — the body either runs inside its own
  // function (standalone or extracted helper) or is wrapped in `{}` when
  // truly inlined. The dispatcher's pre-walked position is stored in
  // state.off before the call, so __off = state.off is correct in both
  // modes; the inline skipWs is only safe to omit when the dispatcher
  // already advanced past leading whitespace.
  lines.push(`const __input = state.input;
const __len = __input.length;
let __off = state.off;`);
  if (!inline) {
    // Initial skipWs is ws-only — the parent's tryRoles dispatcher relies
    // on parseComment seeing '/*' at __off to match the comment production.
    // If we skipped comments here, parseComment would skip its own content.
    lines.push(inlineSkipWs());
  }
  if (needsNodeRange && (inline?.skipSpans ?? 0) === 0) {
    // __startOff anchors source.start.offset for the produced node. Always
    // emit when the body is a standalone function (no skipSpans means we
    // start from the body's first span, so __off here equals production start).
    // When skipSpans > 0 the dispatcher has already advanced — but
    // canExtractBody guards against that combination with raws (see
    // emitSharedPrefixDispatch), so we never reach this path with both
    // needsNodeRange and skipSpans>0.
    lines.push(`const __startOff = __off;`);
  }
  // Track the position right after the last consumed byte. Distinct from
  // __off, which after the final span may sit at an unconsumed stop char
  // (e.g. until ended at the stop and the following optional didn't take
  // it) or past trailing ws (between-span skipWs). Needed when:
  //   1. raws mode — feeds __endOff for makeSource.
  //   2. Production has an optional literal span — its fallback rewinds
  //      __off to __consumedEnd when the literal doesn't match.
  // We compute this conservatively: scan the spans for any optional
  // literal (after skipSpans). If neither condition holds, omit the
  // variable entirely to avoid dead writes in tight per-element loops.
  const needsConsumedEnd = needsNodeRange || spans.some((s, i) => {
    if (i < skipSpans) return false;
    if (!hasModifier(s.modifiers, 'optional')) return false;
    // Until/rawUntil spans use a different fallback path (state.off rewind);
    // only literal optional spans consume __consumedEnd. Other span kinds
    // (recursive, classed) don't emit the `__off = __consumedEnd` fallback.
    if (findModifier(s.modifiers, 'until') !== undefined) return false;
    if (findModifier(s.modifiers, 'rawUntil') !== undefined) return false;
    return s.class === 'literal';
  });
  if (needsConsumedEnd) {
    lines.push(`let __consumedEnd = __off;`);
  }

  for (let i = 0; i < spans.length; i++) {
    if (i < skipSpans) continue;
    // When we resume after a skipped prefix, the inter-span ws skip the
    // skipped span would normally emit (after its body) must still run
    // for the first emitted span — unless it'd be skipped in the
    // standalone path too (next-span repeats/until).
    if (i === skipSpans && skipSpans > 0) {
      const span = spans[i]!;
      const isRepeats = findModifier(span.modifiers, 'repeats') !== undefined;
      const isUntil = findModifier(span.modifiers, 'until') !== undefined;
      if (!isRepeats && !isUntil) {
        lines.push(inlineSkipWs(ctx));
      }
    }
    const span = spans[i]!;
    const next = spans[i + 1];
    const isUntil = findModifier(span.modifiers, 'until') !== undefined;
    const isRawUntil = findModifier(span.modifiers, 'rawUntil') !== undefined;
    const isOptional = hasModifier(span.modifiers, 'optional');
    // For an optional non-until span, we need to capture __off BEFORE any
    // preceding inter-span skip — if the optional doesn't fire, we want
    // to rewind so a comment that the skip stepped over is left available
    // for the parent's children loop (matches tokenized's
    // consumeOptionalLiteralId which rewinds state.pos when the literal
    // isn't there).
    const savedVar = isOptional && !isUntil && !isRawUntil
      ? `__beforeSpan${i}`
      : null;
    const isRepeats = findModifier(span.modifiers, 'repeats') !== undefined;
    const isLastSpan = i === spans.length - 1;
    const isSecondToLast = i === spans.length - 2;
    if (isLastSpan && inline?.lastSpanLiteralAlternatives && span.class === 'literal') {
      // Merged-tail emit: try each alternative in order. Sorted longest
      // first so e.g. `/>` wins before `>` would.
      const alts = [...inline.lastSpanLiteralAlternatives].sort((a, b) => b.length - a.length);
      const branches = alts.map((alt) => {
        const peek = peekLiteralExprAt('__off', alt);
        return `if (${peek}) { __off += ${alt.length}; }`;
      });
      const tail = `else { state.off = __off; throw new SyntaxError(${jsString(`expected one of ${alts.join(', ')} at position `)} + __off); }`;
      lines.push(branches.join(' else ') + ' ' + tail);
    } else if (isSecondToLast && inline?.lastSpanLiteralAlternatives && findModifier(span.modifiers, 'repeats')) {
      // The repeats span just before the merged tail needs a stop predicate
      // that covers ANY of the alternative literals, not just the canonical
      // `next.text`. Otherwise input like `<br />` runs the attrs loop until
      // parseAttribute throws on `/`.
      lines.push(emitSpan(span, next, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx, inline.lastSpanLiteralAlternatives, needsConsumedEnd));
    } else {
      lines.push(emitSpan(span, next, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx, undefined, needsConsumedEnd));
    }
    if (needsConsumedEnd) {
      if (isUntil || isRawUntil) {
        lines.push(`__consumedEnd = state.__lastCaptureEnd;`);
      } else if (isRepeats && span.name && needsNodeRange) {
        // For a repeats span, __consumedEnd anchors on __prevEnd_<listVar>
        // (end of the last consumed child), not __off — which may have
        // advanced past trailing seps/ws via the body loop's sep-skip.
        lines.push(`__consumedEnd = __prevEnd_${jsIdent(span.name)};`);
      } else if (savedVar) {
        lines.push(`if (__off > ${savedVar}) __consumedEnd = __off;`);
      } else {
        lines.push(`__consumedEnd = __off;`);
      }
    }
    // Between-span ws skip — but skip this for adjacent-to-repeats so the
    // repeats span's startOff anchors at the end of the previous literal
    // (matching the tokenized backend's behavior where __<listVar>_startOff
    // is state.ends[state.pos - 1] before any further token advances).
    if (i + 1 < spans.length) {
      const nextSpan = spans[i + 1]!;
      const nextRepeats = findModifier(nextSpan.modifiers, 'repeats');
      const nextUntil = findModifier(nextSpan.modifiers, 'until');
      const nextOptional = hasModifier(nextSpan.modifiers, 'optional');
      const nextIsUntil = findModifier(nextSpan.modifiers, 'until') !== undefined;
      const nextIsRawUntil = findModifier(nextSpan.modifiers, 'rawUntil') !== undefined;
      const nextSavedVar = nextOptional && !nextIsUntil && !nextIsRawUntil
        ? `__beforeSpan${i + 1}`
        : null;
      // Save __off BEFORE the inter-span skip so an optional next span
      // that doesn't fire can rewind through skipped comments.
      if (nextSavedVar) {
        lines.push(`const ${nextSavedVar} = __off;`);
      }
      // Skip the inter-span ws skip when the next span is a repeats or
      // until — those spans need __off positioned at the end of the
      // previous span (pre-ws) so that empty captures can record
      // __lastCaptureStart/End at the prior span's end (matching the
      // tokenized backend's state.ends[state.pos - 1] behavior).
      // Otherwise skip ws AND comments so free-floating comments between
      // significant spans (e.g. 'font-size /* x */ : big') match the
      // tokenized backend where skipComments runs before each literal.
      if (!nextRepeats && !nextUntil) {
        lines.push(inlineSkipWs(ctx));
      }
    }
  }

  // Record __endOff BEFORE the trailing ws skip — node's source.end.offset
  // matches the last consumed char, not the next non-ws position.
  if (needsNodeRange) {
    lines.push(`const __endOff = __consumedEnd;`);
  }

  // Trailing skipWs is ws-only. Comments at the end of the production
  // are NOT consumed by this production — the parent (root) handles them
  // via its own children-loop dispatch.
  lines.push(inlineSkipWs());

  // Flush __off back to state.off before returning.
  lines.push(`state.off = __off;`);

  if (ctx.variant === 'validate') {
    lines.push(`return;`);
    return applySoftFail(lines.join('\n'), inline?.softFail);
  }

  const bindings = { valueExpr, presenceExpr, startOffExpr, endOffExpr };
  const structure = emitStructureExpr(production.structure, bindings, structureOptions);
  if (ctx.variant === 'fast') {
    lines.push(`return ${structure};`);
    return applySoftFail(lines.join('\n'), inline?.softFail);
  }
  lines.push(`const __struct: Record<string, unknown> = ${structure};`);
  lines.push(`__struct.source = makeSource(state, __startOff, __endOff);`);
  lines.push(`return __struct;`);
  return applySoftFail(lines.join('\n'), inline?.softFail);
}

// Convert a hard-fail production body into a soft-fail one: each `throw
// new SyntaxError(...)` (with or without the leading `state.off = __off;`
// flush) becomes `state.off = __softStart; return null;`. Recursive parse
// calls inside the body keep their throw semantics (real errors past the
// commit point still propagate). The caller checks the null return
// instead of catching an exception — eliminating the V8 Error-construction
// and stack-unwind cost on path-finding misses.
function applySoftFail(body: string, softFail: boolean | undefined): string {
  if (!softFail) return body;
  // Match optional `state.off = __off;` flush then a complete
  // `throw new SyntaxError(<args>);` where args can include one level of
  // nested parens (e.g. `jsString("foo")`). Multi-line throws are
  // currently absent from the emitter; if introduced later the regex
  // would need updating.
  // Always wrap the replacement in `{ ... }` so `if (!cond) throw ...;`
  // (without surrounding braces) still binds correctly — without the
  // wrap, `return null;` would run unconditionally.
  const throwRe = /(?:state\.off = __off;\s*)?throw new SyntaxError\((?:[^()]|\([^()]*\))*\);/g;
  const transformed = body.replace(throwRe, '{ state.off = __softStart; return null; }');
  // Inject __softStart capture right after the standard preamble. __off
  // exists at this point because the preamble declares it.
  return transformed.replace(
    /(let __off = state\.off;)/,
    '$1\nconst __softStart = state.off;',
  );
}

// --- Spans -----------------------------------------------------------------

function emitSpan(
  span: ResolvedSpan,
  next: ResolvedSpan | undefined,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
  nextStopAlternatives?: ReadonlyArray<string>,
  bodyTracksCaptureState: boolean = true,
): string {
  const optional = hasModifier(span.modifiers, 'optional');
  const repeats = findModifier(span.modifiers, 'repeats');
  const until = findModifier(span.modifiers, 'until');
  const rawUntil = findModifier(span.modifiers, 'rawUntil');
  const noWhitespaceAfter = hasModifier(span.modifiers, 'noWhitespaceAfter');

  if (rawUntil) {
    return emitRawUntilSpan(span, rawUntil, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx, bodyTracksCaptureState);
  }
  if (until) {
    return emitUntilSpan(span, until, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx, bodyTracksCaptureState);
  }
  if (repeats) {
    return emitRepeatedSpan(span, repeats, next, valueExpr, presenceExpr, startOffExpr, endOffExpr, offsetRefs, ctx, nextStopAlternatives);
  }
  if (span.recursiveRoles.length > 0) {
    return emitRecursiveSpan(span, valueExpr, presenceExpr, optional, ctx);
  }
  if (span.class === 'literal') {
    return emitLiteralSpan(span, valueExpr, presenceExpr, startOffExpr, endOffExpr, optional, noWhitespaceAfter, offsetRefs);
  }
  return emitClassedSpan(span, valueExpr, presenceExpr, startOffExpr, endOffExpr, optional, noWhitespaceAfter, offsetRefs, ctx);
}

function emitLiteralSpan(
  span: ResolvedSpan,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  optional: boolean,
  noWhitespaceAfter: boolean,
  offsetRefs: ReadonlySet<string>,
): string {
  if (!span.text) throw new Error('emitter: literal span has no text');
  const text = span.text;
  const matchExpr = emitLiteralMatchExpr(text);
  const advance = `__off += ${text.length};`;
  const adjacencyCheck = noWhitespaceAfter
    ? '\nif (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after literal at position " + __off); }'
    : '';

  if (span.name) {
    const v = jsIdent(span.name);
    const needsOffsets = offsetRefs.has(span.name);
    valueExpr.set(span.name, v);
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${v}_start`);
      endOffExpr.set(span.name, `__${v}_end`);
    }
    if (optional) {
      presenceExpr.set(span.name, `(${v} !== null)`);
      // When the literal doesn't match, fall back to __consumedEnd (the
      // position right after the last consumed byte) so $.gap to this
      // span doesn't pick up trailing ws skipped by inter-span skipWs.
      const offsetDecls = needsOffsets
        ? `\nconst __${v}_start = ${v} !== null ? __off - ${text.length} : __consumedEnd;
const __${v}_end = ${v} !== null ? __off : __consumedEnd;`
        : '';
      // When the optional literal doesn't match, rewind __off to
      // __consumedEnd so that comments/ws consumed by the preceding
      // inter-span skip stay visible to the parent (matches tokenized's
      // consumeOptionalLiteralId rewinding state.pos on no-match).
      return `let ${v}: string | null = null;
if (${matchExpr}) {
  ${advance}
  ${v} = ${jsString(text)};${adjacencyCheck}
} else {
  __off = __consumedEnd;
}${offsetDecls}`;
    }
    const offsetDecls = needsOffsets
      ? `\nconst __${v}_start = __off - ${text.length};
const __${v}_end = __off;`
      : '';
    return `if (!(${matchExpr})) { state.off = __off; throw new SyntaxError("expected " + ${jsString(text)} + " at position " + __off); }
${advance}
const ${v} = ${jsString(text)};${adjacencyCheck}${offsetDecls}`;
  }

  if (optional) {
    return `if (${matchExpr}) { ${advance}${adjacencyCheck} } else { __off = __consumedEnd; }`;
  }
  return `if (!(${matchExpr})) { state.off = __off; throw new SyntaxError("expected " + ${jsString(text)} + " at position " + __off); }
${advance}${adjacencyCheck}`;
}

// Emit a JS expression that tests whether `__input` starts with `text` at
// `__off`. Single-char and two-char literals expand to inline char
// compares; longer literals use String.prototype.startsWith.
function emitLiteralMatchExpr(text: string): string {
  if (text.length === 1) {
    return `__input.charCodeAt(__off) === ${text.charCodeAt(0)}`;
  }
  if (text.length === 2) {
    return `__input.charCodeAt(__off) === ${text.charCodeAt(0)} && __input.charCodeAt(__off + 1) === ${text.charCodeAt(1)}`;
  }
  return `__input.startsWith(${jsString(text)}, __off)`;
}

function emitClassedSpan(
  span: ResolvedSpan,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  optional: boolean,
  noWhitespaceAfter: boolean,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
): string {
  const v = span.name ? jsIdent(span.name) : '__unnamed';
  const isComment = span.class === 'comment';
  const needsValueForRefinement = span.refinements.some((r) =>
    r.name === 'oneOf' || r.name === 'hexString',
  );
  const needsValue = ctx.variant === 'validate'
    ? needsValueForRefinement
    : (span.name !== undefined ? true : needsValueForRefinement);

  const scan = emitClassScan(span, v, { optional, needsValue });

  const adjacencyCheck = noWhitespaceAfter
    ? optional
      ? `\nif (${v} !== null && __off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after token at position " + __off); }`
      : `\nif (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after token at position " + __off); }`
    : '';

  const refinementCheck = emitSpanRefinementCheck(span, v, optional, `__${v}_s`, needsValue);

  if (span.name) {
    const needsOffsets = offsetRefs.has(span.name);
    valueExpr.set(span.name, isComment ? `${v}__interior` : v);
    if (optional) {
      presenceExpr.set(span.name, `(${v} !== null)`);
    }
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${v}_start`);
      endOffExpr.set(span.name, `__${v}_end`);
    }
    const commentInteriorBind = isComment
      ? optional
        ? `\nconst ${v}__interior = ${v} === null ? null : commentInterior(${v});`
        : `\nconst ${v}__interior = commentInterior(${v});`
      : '';
    const offsetDecls = needsOffsets ? `\n${emitClassOffsetVars(v, { optional })}` : '';
    return `${scan}${adjacencyCheck}${refinementCheck}${commentInteriorBind}${offsetDecls}`;
  }

  return `${scan}${adjacencyCheck}${refinementCheck}`;
}

function emitSpanRefinementCheck(
  span: ResolvedSpan,
  valueVar: string,
  optional: boolean,
  positionExpr: string,
  haveValue: boolean = true,
): string {
  const checks: string[] = [];
  const lengthExpr = haveValue ? `${valueVar}.length` : `(__off - ${positionExpr})`;
  for (const refinement of span.refinements) {
    if (refinement.name === 'oneOf') {
      const values = refinement.args?.[0];
      if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) continue;
      const lowered = [...new Set((values as readonly string[]).map((value) => value.toLowerCase()))];
      // Hoist the toLowerCase() result into a local so we allocate one new
      // string per check instead of one per oneOf value. HTML's
      // .ident().html().oneOf([...]) checks fire on every element.
      const loweredVar = `__${valueVar}_lc`;
      const condition = lowered.map((value) => `${loweredVar} === ${jsString(value)}`).join(' || ') || 'false';
      const message = `expected one of ${(values as readonly string[]).join(', ')} at position `;
      const decl = `const ${loweredVar} = ${optional ? `${valueVar} === null ? null : ${valueVar}.toLowerCase()` : `${valueVar}.toLowerCase()`};`;
      checks.push(optional
        ? `${decl}\nif (${valueVar} !== null && !(${condition})) { state.off = __off; throw new SyntaxError(${jsString(message)} + ${positionExpr}); }`
        : `${decl}\nif (!(${condition})) { state.off = __off; throw new SyntaxError(${jsString(message)} + ${positionExpr}); }`);
      continue;
    }
    if (refinement.name === 'hexString') {
      const message = 'expected hex string at position ';
      checks.push(optional
        ? `if (${valueVar} !== null && !isHexString(${valueVar})) { state.off = __off; throw new SyntaxError(${jsString(message)} + ${positionExpr}); }`
        : `if (!isHexString(${valueVar})) { state.off = __off; throw new SyntaxError(${jsString(message)} + ${positionExpr}); }`);
      continue;
    }
    if (refinement.name === 'lengths') {
      const values = refinement.args?.[0];
      if (!Array.isArray(values) || values.some((value) => !Number.isInteger(value))) continue;
      const condition = (values as readonly number[]).map((value) => `${lengthExpr} === ${value}`).join(' || ') || 'false';
      const message = `expected length ${(values as readonly number[]).join(', ')} at position `;
      checks.push(optional && haveValue
        ? `if (${valueVar} !== null && !(${condition})) { state.off = __off; throw new SyntaxError(${jsString(message)} + ${positionExpr}); }`
        : `if (!(${condition})) { state.off = __off; throw new SyntaxError(${jsString(message)} + ${positionExpr}); }`);
    }
  }
  return checks.length === 0 ? '' : `\n${checks.join('\n')}`;
}

function emitRecursiveSpan(
  span: ResolvedSpan,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  optional: boolean,
  ctx: Ctx,
): string {
  const roles = span.recursiveRoles;
  const sync = (rhs: string): string => `state.off = __off;
${rhs}
__off = state.off;`;

  // For multi-role non-optional dispatch, try first-token lookahead. This
  // avoids the throw/catch overhead of tryRoles when roles have distinct
  // first-token signatures.
  const lookahead = roles.length > 1 && !optional
    ? emitRoleLookahead(roles, ctx)
    : null;

  const callExpr = roles.length === 1
    ? `${parseFnName(roles[0]!, ctx.variant)}(state)`
    : `tryRoles(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}])`;

  if (ctx.variant === 'validate') {
    if (optional) {
      const speculative = roles.length === 1
        ? `trySpeculate(state, ${parseFnName(roles[0]!, ctx.variant)})`
        : `tryRolesOrNull(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}])`;
      return sync(`${speculative};`);
    }
    if (lookahead !== null) {
      return sync(`${lookahead}(state);`);
    }
    return sync(`${callExpr};`);
  }
  if (span.name) {
    const v = jsIdent(span.name);
    valueExpr.set(span.name, v);
    if (optional) {
      const speculative = roles.length === 1
        ? `trySpeculate(state, ${parseFnName(roles[0]!, ctx.variant)})`
        : `tryRolesOrNull(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}])`;
      presenceExpr.set(span.name, `(${v} !== null)`);
      return sync(`const ${v} = ${speculative};`);
    }
    if (lookahead !== null) {
      return sync(`const ${v} = ${lookahead}(state);`);
    }
    return sync(`const ${v} = ${callExpr};`);
  }
  if (optional) return sync(`${callExpr};`);
  if (lookahead !== null) {
    return sync(`${lookahead}(state);`);
  }
  return sync(`${callExpr};`);
}

// Build a synthetic lookahead dispatcher that picks the correct role based
// on the next byte / first ident value. Returns the call expression (a
// generated function name) or null when no dispatch is possible.
//
// This emits a per-call-site inline IIFE-style function in the dispatcher,
// rather than a shared helper, because the role set varies per call site.
// But to keep the generated file small, we emit it as a top-level shared
// helper keyed by the role list.
const roleDispatchCache = new WeakMap<object, Map<string, string>>();

function emitRoleLookahead(roles: ReadonlyArray<string>, ctx: Ctx): string | null {
  // We need access to NodeTypeInfo for each role to know its first-token
  // shape. Without it, fall back to tryRoles.
  // Detect distinct first-token signatures for each role.
  type FirstToken =
    | { kind: 'literal'; text: string }
    | { kind: 'class'; cls: string; refKey: string; oneOfValues?: readonly string[] };
  const firstTokens: Array<FirstToken | null> = roles.map((r) => firstTokenForRole(r, ctx));
  // Partition: roles with a fixed first-token can be byte-prefix dispatched;
  // roles with an until/repeats first span fall through to a tail tryRoles.
  // If no role has a fixed first-token we have no advantage over tryRoles.
  if (firstTokens.every((t) => t === null)) return null;
  let fallthroughRoles: string[] = [];
  const dispatchableRoles: string[] = [];
  const dispatchableTokens: FirstToken[] = [];
  for (let i = 0; i < roles.length; i++) {
    const t = firstTokens[i];
    if (t === null) fallthroughRoles.push(roles[i]!);
    else {
      dispatchableRoles.push(roles[i]!);
      dispatchableTokens.push(t);
    }
  }

  // Quick check: are there any distinct first-token keys among dispatchables?
  // If they all share one, the byte-prefix check buys nothing.
  const keyFor = (t: FirstToken): string => {
    if (t.kind === 'literal') return `L:${t.text}`;
    return `C:${t.cls}|${t.refKey}|${(t.oneOfValues ?? []).slice().sort().join(',')}`;
  };
  const uniqueKeys = new Set(dispatchableTokens.map(keyFor));
  if (uniqueKeys.size === 1 && fallthroughRoles.length === 0) return null;

  // Emit a unique helper for this role list. We don't memoize across the
  // file; the generated emit just re-emits the same function. Caller's
  // generated file size is unaffected by duplicates because each emit
  // produces a unique function name per call site.
  const fnSlug = roles.map((r) => jsIdent(r)).join('_');
  const fnName = `__roleDispatch_${ctx.variant}_${fnSlug}_${roleSeq()}`;

  // Group dispatchable roles by literal-first vs class-first.
  const literalRoles: Array<{ role: string; text: string }> = [];
  const classRoles: Array<{ role: string; tok: Extract<FirstToken, { kind: 'class' }> }> = [];
  for (let i = 0; i < dispatchableRoles.length; i++) {
    const t = dispatchableTokens[i]!;
    if (t.kind === 'literal') literalRoles.push({ role: dispatchableRoles[i]!, text: t.text });
    else classRoles.push({ role: dispatchableRoles[i]!, tok: t });
  }

  // Emit body: literals first (sorted by length desc), then class groups.
  const lines: string[] = [];
  literalRoles.sort((a, b) => b.text.length - a.text.length);
  for (let i = 0; i < literalRoles.length; i++) {
    const { role, text } = literalRoles[i]!;
    let check = peekLiteralExprAt('__off', text);
    // Refine the byte check: exclude declared punctuators that start with
    // `text` but aren't handled by any other dispatched role here. Without
    // this a single-byte literal like `<` would over-match `</`, routing
    // close tags to an HtmlElement parse that then throws. Earlier-tested
    // literals (longer ones — list is sorted by length desc) already cover
    // some extensions; we exclude only the residual antichain.
    const earlierCovers = literalRoles.slice(0, i).map((r) => r.text);
    const uncovered = uncoveredLiteralExtensions(text, ctx.literalTexts, earlierCovers);
    for (const ext of uncovered) {
      check += ` && ${excludeLiteralExtensionExprAt('__off', text, ext)}`;
    }
    lines.push(`if (${check}) return ${parseFnName(role, ctx.variant)}(state);`);
  }

  // Class roles: group by class+refKey. Within a class, multiple roles
  // may have distinct .oneOf values — dispatch by scanning the ident and
  // matching.
  type ClassGroup = {
    cls: string;
    refKey: string;
    roles: Array<{ role: string; oneOfValues?: readonly string[] }>;
  };
  const classGroups: ClassGroup[] = [];
  for (const { role, tok } of classRoles) {
    let group = classGroups.find((g) => g.cls === tok.cls && g.refKey === tok.refKey);
    if (!group) {
      group = { cls: tok.cls, refKey: tok.refKey, roles: [] };
      classGroups.push(group);
    }
    group.roles.push({ role, oneOfValues: tok.oneOfValues });
  }
  for (const group of classGroups) {
    if (group.cls === 'ident') {
      // Peek-scan ident, lowercase, dispatch on oneOf value.
      const dispatchBranches: string[] = [];
      let fallbackRole: string | null = null;
      for (const { role, oneOfValues } of group.roles) {
        if (!oneOfValues || oneOfValues.length === 0) {
          if (fallbackRole !== null) return null; // ambiguous fallback
          fallbackRole = role;
        }
      }
      // Sort: roles with oneOf go first; fallback (no oneOf) at end.
      const withOneOf = group.roles.filter((r) => r.oneOfValues && r.oneOfValues.length > 0);
      // Build a flat lookup of ident_lower → role.
      const lookup = new Map<string, string>();
      for (const { role, oneOfValues } of withOneOf) {
        for (const v of oneOfValues!) {
          const lv = v.toLowerCase();
          if (lookup.has(lv)) return null; // conflicting oneOf across roles
          lookup.set(lv, role);
        }
      }
      const identCheck = group.refKey.includes('html')
        ? `isCssIdentStart(__input.charCodeAt(__off))`
        : group.refKey.includes('js')
          ? `isJsIdentStart(__input.charCodeAt(__off))`
          : `(isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c)`;
      const peekIdentEnd = `__peek = __off + 1; while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;`;
      const dispatchSwitch: string[] = [];
      for (const [lv, role] of lookup) {
        dispatchSwitch.push(`if (__ident === ${jsString(lv)}) return ${parseFnName(role, ctx.variant)}(state);`);
      }
      const tail = fallbackRole !== null
        ? `return ${parseFnName(fallbackRole, ctx.variant)}(state);`
        : `throw new SyntaxError('no role matched ident at position ' + __off);`;
      dispatchBranches.push(`if (${identCheck}) {
  let __peek = __off;
  ${peekIdentEnd}
  const __ident = __input.slice(__off, __peek).toLowerCase();
  ${dispatchSwitch.join('\n  ')}
  ${tail}
}`);
      lines.push(...dispatchBranches);
    } else if (group.cls === 'hex') {
      // Hex is only a HashColor's prefix in css-color — but we dispatch
      // by literal '#' above. Hex-starting roles are unusual; for now
      // assume single role and dispatch directly.
      if (group.roles.length === 1) {
        lines.push(`if (isHexDigit(__input.charCodeAt(__off))) return ${parseFnName(group.roles[0]!.role, ctx.variant)}(state);`);
      } else {
        return null;
      }
    } else if (group.cls === 'number') {
      if (group.roles.length === 1) {
        lines.push(`if (isDigit(__input.charCodeAt(__off))) return ${parseFnName(group.roles[0]!.role, ctx.variant)}(state);`);
      } else {
        return null;
      }
    } else if (group.cls === 'string') {
      if (group.roles.length === 1) {
        lines.push(`if (__input.charCodeAt(__off) === 0x22 || __input.charCodeAt(__off) === 0x27) return ${parseFnName(group.roles[0]!.role, ctx.variant)}(state);`);
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  let boundaryDispatchReturns = false;
  const boundaryDispatch = emitBlockPairBoundaryDispatch(fallthroughRoles, ctx);
  if (boundaryDispatch !== null) {
    lines.push(boundaryDispatch);
    fallthroughRoles = [];
    boundaryDispatchReturns = true;
  }

  // Tail: only the roles whose first-token couldn't be peeked need
  // speculation. If everything dispatched, tail is a fixed error.
  if (boundaryDispatchReturns) {
    // The boundary dispatch returns either the block or pair role.
  } else if (fallthroughRoles.length === 0) {
    lines.push(`throw new SyntaxError('no role matched at position ' + __off);`);
  } else if (fallthroughRoles.length === 1) {
    lines.push(`return ${parseFnName(fallthroughRoles[0]!, ctx.variant)}(state);`);
  } else {
    lines.push(`return tryRoles(state, [${fallthroughRoles.map((r) => parseFnName(r, ctx.variant)).join(', ')}]);`);
  }

  const fn = `function ${fnName}(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  ${lines.join('\n  ')}
}`;
  pendingHelpers.push(fn);
  return fnName;
}

type BlockPairDispatchShape = {
  readonly blockRole: string;
  readonly pairRole: string;
  readonly open: string;
  readonly close: string | null;
  readonly separator: string | null;
  readonly pair: string;
};

function emitBlockPairBoundaryDispatch(roles: ReadonlyArray<string>, ctx: Ctx): string | null {
  const shape = inferBlockPairDispatchShape(roles, ctx);
  if (!shape) return null;
  const openCode = shape.open.charCodeAt(0);
  const closeCode = shape.close?.charCodeAt(0) ?? -1;
  const sepCode = shape.separator?.charCodeAt(0) ?? -1;
  const pairCode = shape.pair.charCodeAt(0);
  const stopCheck = [
    `__bc === ${openCode}`,
    closeCode >= 0 ? `__bc === ${closeCode}` : '',
    sepCode >= 0 ? `__bc === ${sepCode}` : '',
  ].filter(Boolean).join(' || ');
  const rejectBlockCheck = `__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === ${pairCode}`;

  return `{
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (${stopCheck})) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === ${openCode} && !(${rejectBlockCheck})) {
    const __block = trySpeculate(state, ${parseFnName(shape.blockRole, ctx.variant)});
    if (__block !== null) return __block;
  }
  return ${parseFnName(shape.pairRole, ctx.variant)}(state);
}`;
}

function inferBlockPairDispatchShape(roles: ReadonlyArray<string>, ctx: Ctx): BlockPairDispatchShape | null {
  if (roles.length !== 2) return null;
  const a = inferBlockDispatchRole(roles[0]!, ctx);
  const b = inferBlockDispatchRole(roles[1]!, ctx);
  const c = inferPairDispatchRole(roles[0]!, ctx);
  const d = inferPairDispatchRole(roles[1]!, ctx);
  const block = a ?? b;
  const pair = c ?? d;
  if (!block || !pair) return null;
  if (block.role === pair.role) return null;
  if (block.open.length !== 1 || pair.pair.length !== 1) return null;
  if (block.close !== null && block.close.length !== 1) return null;
  if (block.separator !== null && block.separator.length !== 1) return null;
  return {
    blockRole: block.role,
    pairRole: pair.role,
    open: block.open,
    close: block.close,
    separator: block.separator,
    pair: pair.pair,
  };
}

function inferBlockDispatchRole(role: string, ctx: Ctx): { readonly role: string; readonly open: string; readonly close: string | null; readonly separator: string | null } | null {
  const info = ctx.nodeTypes.get(role);
  if (!info || info.productions.length !== 1) return null;
  const production = info.productions[0]!;
  const first = production.spans[0];
  const open = production.spans[1];
  const close = production.spans[production.spans.length - 1];
  if (!first || !findModifier(first.modifiers, 'until')) return null;
  if (open?.class !== 'literal' || !open.text) return null;
  const repeated = production.spans.find((span) => findModifier(span.modifiers, 'repeats') && span.recursiveRoles.length > 0);
  const repeats = repeated ? findModifier(repeated.modifiers, 'repeats') : undefined;
  if (!repeated || !repeats) return null;
  return {
    role,
    open: open.text,
    close: close?.class === 'literal' && close.text ? close.text : null,
    separator: repeats.sep ?? null,
  };
}

function inferPairDispatchRole(role: string, ctx: Ctx): { readonly role: string; readonly pair: string } | null {
  const info = ctx.nodeTypes.get(role);
  if (!info || info.productions.length < 1) return null;
  let pair: string | null = null;
  for (const production of info.productions) {
    if (production.spans.some((span) => findModifier(span.modifiers, 'repeats') && span.recursiveRoles.length > 0)) return null;
    const first = production.spans[0];
    const second = production.spans[1];
    if (!first || !findModifier(first.modifiers, 'until')) return null;
    if (second?.class !== 'literal' || !second.text) return null;
    pair ??= second.text;
    if (pair !== second.text) return null;
  }
  return pair ? { role, pair } : null;
}

let _roleSeq = 0;
function roleSeq(): number { return _roleSeq++; }

// Helpers accumulated while emitting; flushed by the caller.
let pendingHelpers: string[] = [];
export function takePendingHelpers(): string[] {
  const out = pendingHelpers;
  pendingHelpers = [];
  _roleSeq = 0;
  return out;
}

// First-token analysis for a role: look at the role's productions and find
// the first span. For multi-production roles, only return when all
// productions agree on first-token (signature + .oneOf values).
type FirstTokenInfo =
  | { kind: 'literal'; text: string }
  | { kind: 'class'; cls: string; refKey: string; oneOfValues?: readonly string[] };

function firstTokenForRole(role: string, ctx: Ctx): FirstTokenInfo | null {
  const info = ctx.nodeTypes.get(role);
  if (!info || info.productions.length === 0) return null;
  let result: FirstTokenInfo | null = null;
  // Collect first-token from each production; merge .oneOf values when they
  // agree on class+refinement.
  for (const prod of info.productions) {
    const span0 = prod.spans[0];
    if (!span0) return null;
    if (findModifier(span0.modifiers, 'until') || findModifier(span0.modifiers, 'rawUntil') || findModifier(span0.modifiers, 'repeats')) return null;
    if (hasModifier(span0.modifiers, 'optional')) return null;
    if (span0.recursiveRoles.length > 0) return null;
    if (span0.class === 'literal') {
      if (!span0.text) return null;
      const tok: FirstTokenInfo = { kind: 'literal', text: span0.text };
      if (result === null) result = tok;
      else if (result.kind !== 'literal' || result.text !== tok.text) return null;
    } else if (span0.class === 'comment') {
      // A comment span uniquely starts with /* — treat it as a literal
      // for dispatch purposes so the byte-prefix path can route to it.
      const tok: FirstTokenInfo = { kind: 'literal', text: '/*' };
      if (result === null) result = tok;
      else if (result.kind !== 'literal' || result.text !== tok.text) return null;
    } else {
      const refKey = span0.refinements
        .filter((r) => r.name !== 'oneOf')
        .map((r) => r.name)
        .sort()
        .join('|');
      const oneOfArr = span0.refinements.find((r) => r.name === 'oneOf')?.args?.[0];
      const oneOfValues = Array.isArray(oneOfArr) && oneOfArr.every((v) => typeof v === 'string')
        ? (oneOfArr as readonly string[]).map((v) => v.toLowerCase())
        : undefined;
      const tok: FirstTokenInfo = { kind: 'class', cls: span0.class, refKey, oneOfValues };
      if (result === null) result = tok;
      else if (result.kind !== 'class' || result.cls !== tok.cls || result.refKey !== tok.refKey) return null;
      else if ((result.oneOfValues === undefined) !== (tok.oneOfValues === undefined)) return null;
      else if (result.kind === 'class' && result.oneOfValues && tok.oneOfValues) {
        // Merge: a role accepts the union of its productions' .oneOf values.
        const merged: Set<string> = new Set([...result.oneOfValues, ...tok.oneOfValues]);
        result = { kind: 'class', cls: result.cls, refKey: result.refKey, oneOfValues: [...merged].sort() };
      }
    }
  }
  return result;
}

function emitRepeatedSpan(
  span: ResolvedSpan,
  repeats: Extract<SpanModifier, { kind: 'repeats' }>,
  next: ResolvedSpan | undefined,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
  nextStopAlternatives?: ReadonlyArray<string>,
): string {
  if (span.recursiveRoles.length === 0) {
    throw new Error(`scannerless v1: .repeats() on non-recursive span is not implemented`);
  }
  const roles = span.recursiveRoles;
  const listVar = span.name ? jsIdent(span.name) : '_repeated';
  const needsOffsets = ctx.variant === 'raws' || (span.name ? offsetRefs.has(span.name) : false);

  // Each child parse call flushes/restores __off via the sync pattern. When
  // roles have distinguishable first-tokens we emit a byte-prefix dispatch
  // helper that routes Comment/AtRule-style roles directly and only
  // speculates among the remaining ambiguous ones — eliminates the bulk
  // of the throw/catch overhead `tryRoles` would incur per child.
  let childCall: string;
  if (roles.length === 1) {
    childCall = `${parseFnName(roles[0]!, ctx.variant)}(state)`;
  } else {
    const dispatcher = emitRoleLookahead(roles, ctx);
    childCall = dispatcher !== null
      ? `${dispatcher}(state)`
      : `tryRoles(state, [${roles.map((r) => parseFnName(r, ctx.variant)).join(', ')}])`;
  }
  // When the next span is a merged-tail (multiple literal alternatives),
  // stop on ANY of them — otherwise the loop misses the tail and keeps
  // trying to parse children that throw. e.g. void self-close attrs loop
  // needs to break on `/` (start of `/>`) as well as `>`.
  const stopPredicate = nextStopAlternatives && nextStopAlternatives.length > 0
    ? nextStopAlternatives.map((alt) => `(${peekLiteralExprAt('__off', alt)})`).join(' || ')
    : stopPredicateFor(next);
  const sep = repeats.sep;
  const min = repeats.min ?? 0;
  const max = repeats.max;
  const stopBeforeCheck = emitStopBeforeCheck(repeats.stopBefore);

  if (ctx.variant === 'validate') {
    const minCheck = min > 0
      ? `\nif (__count_${listVar} < ${min}) { state.off = __off; throw new SyntaxError(${jsString(`expected at least ${min} ${roles.join('|')}`)}); }`
      : '';
    const maxCheck = max === undefined
      ? ''
      : `\nif (__count_${listVar} > ${max}) { state.off = __off; throw new SyntaxError(${jsString(`expected at most ${max} ${roles.join('|')}`)}); }`;
    if (!sep) {
      return `let __count_${listVar} = 0;
while (!(${stopPredicate})) {
${stopBeforeCheck}  ${inlineSkipWs()}
  const __before = __off;
  state.off = __off; ${childCall}; __off = state.off;
  __count_${listVar}++;
  if (__off === __before) break;
  ${inlineSkipWs()}
}${minCheck}${maxCheck}`;
    }
    const sepMatch = emitLiteralMatchExpr(sep);
    return `let __count_${listVar} = 0;
while (!(${stopPredicate})) {
${stopBeforeCheck}  ${inlineSkipWs()}
  while (${sepMatch}) { __off += ${sep.length}; ${inlineSkipWs()} }
  if (${stopPredicate}) break;
  const __before = __off;
  state.off = __off; ${childCall}; __off = state.off;
  __count_${listVar}++;
  if (__off === __before) break;
  ${inlineSkipWs()}
  while (${sepMatch}) { __off += ${sep.length}; ${inlineSkipWs()} }
}${minCheck}${maxCheck}`;
  }

  if (span.name) {
    valueExpr.set(span.name, listVar);
    presenceExpr.set(span.name, `(${listVar}.length > 0)`);
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${listVar}_startOff`);
      endOffExpr.set(span.name, `__prevEnd_${listVar}`);
    }
  }

  const minCheck = min > 0
    ? `\nif (${listVar}.length < ${min}) { state.off = __off; throw new SyntaxError(${jsString(`expected at least ${min} ${roles.join('|')}`)}); }`
    : '';
  const maxCheck = max === undefined
    ? ''
    : `\nif (${listVar}.length > ${max}) { state.off = __off; throw new SyntaxError(${jsString(`expected at most ${max} ${roles.join('|')}`)}); }`;

  const attachBefore = ctx.variant === 'raws'
    ? `attachRawsBefore(state, __child, __prevEnd_${listVar});`
    : '';
  const updatePrevEnd = needsOffsets
    ? ctx.variant === 'raws'
      ? `__prevEnd_${listVar} = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_${listVar};`
      : `__prevEnd_${listVar} = __off;`
    : '';
  const offsetDecls = needsOffsets
    ? `const __${listVar}_startOff = __off;
let __prevEnd_${listVar} = __${listVar}_startOff;`
    : '';
  const attachLine = attachBefore ? `  ${attachBefore}\n` : '';
  const updateLine = updatePrevEnd ? `  ${updatePrevEnd}\n` : '';

  // In raws mode, the production-body wrap-up sets __consumedEnd to
  // __prevEnd_<listVar> directly (see emitProductionBody) — no need to
  // rewind __off here. Keeping __off at the post-sep position lets the
  // outer production's state.off accurately reflect end-of-consumed
  // content for the trailing-input check.
  const rewind = '';

  if (!sep) {
    return `${offsetDecls}
const ${listVar}: unknown[] = [];
while (true) {
  ${inlineSkipWs()}
  if (${stopPredicate}) { ${rewind} break; }
${stopBeforeCheck}  const __before = __off;
  state.off = __off; const __child = ${childCall}; __off = state.off;
${attachLine}  ${listVar}.push(__child);
  if (__off === __before) break;
${updateLine}}${minCheck}${maxCheck}`;
  }

  const sepMatch = emitLiteralMatchExpr(sep);
  return `${offsetDecls}
const ${listVar}: unknown[] = [];
while (true) {
  ${inlineSkipWs()}
  while (${sepMatch}) { __off += ${sep.length}; ${inlineSkipWs()} }
  if (${stopPredicate}) { ${rewind} break; }
${stopBeforeCheck}  const __before = __off;
  state.off = __off; const __child = ${childCall}; __off = state.off;
${attachLine}  ${listVar}.push(__child);
  if (__off === __before) break;
${updateLine}}${minCheck}${maxCheck}`;
}

function stopPredicateFor(next: ResolvedSpan | undefined): string {
  if (!next) return '__off >= __len';
  if (next.class === 'literal' && next.text) {
    return emitLiteralMatchExpr(next.text);
  }
  return '__off >= __len';
}

function emitStopBeforeCheck(stopBefore: ReadonlyArray<string> | undefined): string {
  if (!stopBefore || stopBefore.length === 0) return '';
  const stops = stopBefore.filter((s) => s.length > 0);
  if (stops.length === 0) return '';
  const byFirstChar = new Map<number, string[]>();
  for (const s of stops) {
    const code = s.charCodeAt(0);
    const bucket = byFirstChar.get(code) ?? [];
    bucket.push(s);
    byFirstChar.set(code, bucket);
  }
  const branches: string[] = [];
  for (const [code, bucket] of [...byFirstChar.entries()].sort(([a], [b]) => a - b)) {
    bucket.sort((a, b) => b.length - a.length);
    if (bucket.length <= 3) {
      const conds = bucket.map((s) => `__input.startsWith(${jsString(s)}, __off)`).join(' || ');
      branches.push(`if (__c === ${code} && (${conds})) break;`);
      continue;
    }
    const bySecondChar = new Map<number, string[]>();
    const singleChar: string[] = [];
    for (const s of bucket) {
      if (s.length < 2) {
        singleChar.push(s);
        continue;
      }
      const c2 = s.charCodeAt(1);
      const sub = bySecondChar.get(c2) ?? [];
      sub.push(s);
      bySecondChar.set(c2, sub);
    }
    const subBranches: string[] = [];
    for (const [code2, sub] of [...bySecondChar.entries()].sort(([a], [b]) => a - b)) {
      sub.sort((a, b) => b.length - a.length);
      const conds = sub.map((s) => `__input.startsWith(${jsString(s)}, __off)`).join(' || ');
      subBranches.push(`if (__c2 === ${code2} && (${conds})) break;`);
    }
    for (const lone of singleChar) {
      subBranches.push(`if (__input.startsWith(${jsString(lone)}, __off)) break;`);
    }
    branches.push(`if (__c === ${code}) {
    const __c2 = __input.charCodeAt(__off + 1);
    ${subBranches.join('\n    ')}
  }`);
  }
  return `  {
    const __c = __input.charCodeAt(__off);
    ${branches.join('\n    ')}
  }\n`;
}

// --- .until() and .rawUntil() ---------------------------------------------

function emitUntilSpan(
  span: ResolvedSpan,
  until: Extract<SpanModifier, { kind: 'until' }>,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  ctx: Ctx,
  bodyTracksCaptureState: boolean = true,
): string {
  // Char-based scan to the earliest unbalanced stop. Tracks bracket depth
  // when balanced=true. Skips past string/comment ranges as opaque units
  // when the schema declares those token classes (matches tokenized
  // backend's behavior where the tokenizer pre-classifies these and the
  // until-loop skips them by token).
  const stopExpr = emitStopExpr(until.stops);
  // When balanced=false the `__depth` counter is never incremented, so the
  // `__depth === 0 && ...` guard at the top of every loop iteration is dead
  // weight. Track it so we can elide both the variable and the guard for
  // unbounded scans (markdown's hot paragraph and setext scans).
  const tracksDepth = until.balanced;
  const balancedBlock = until.balanced ? `
    if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
    if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
      if (__depth === 0) break;
      __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
    }` : '';
  // Token-class skip arms. Strings: scan past matching quote. Comments:
  // scan past /* ... */. These are NOT counted toward __lastNonWs because
  // strings have their own content and comments are typically excluded
  // from the trimmed value boundary.
  const stringSkip = ctx.tokens.has('string') ? `
    if (__c === 0x22 || __c === 0x27) {
      const __q = __c;
      __off++;
      while (__off < __len) {
        const __sc = __input.charCodeAt(__off);
        if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
        if (__sc === __q) { __off++; break; }
        if (__sc === 0x0a || __sc === 0x0d) break;
        __off++;
      }
      __lastNonWs = __off;
      continue;
    }` : '';
  const hasComments = ctx.tokens.has('comment');
  // Leading comment+ws skip: tokenized's captureUntil advances state.pos
  // past leading comment tokens before computing startOff (line 309 of
  // emit/runtime.ts). Match that here so comments at the head of a capture
  // don't end up in the captured slice nor in the trim boundary. Track the
  // end of the last consumed leading comment — when the capture turns out
  // to be empty, that's the anchor (matches tokenized's
  // state.ends[state.pos - 1] for the previous token).
  const leadingCommentSkip = hasComments ? `
    if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      __lastLeadingCommentEnd = __off;
      continue;
    }` : '';
  // Interior comment skip: record the comment's source range so that we
  // can omit it (and any whitespace it's adjacent to) when building the
  // captured slice. Matches the omit-list logic in tokenized captureUntil
  // (lines 355-379 of emit/runtime.ts). Don't touch __lastNonWs so a
  // trailing comment doesn't extend the trim boundary.
  //
  // Only process comments at depth=0. Inside balanced (...) / [...] /
  // {...}, '/*' is treated as content — matches direct-fast.ts, which
  // doesn't recognize comments in value scans. Critically, this prevents
  // an unterminated `/*` inside `url(...)` from greedily eating across
  // statement boundaries to a far-away `*/`.
  //
  // Backslash escape: '\X' is treated as an escape sequence (2 bytes
  // consumed, both counted as significant). Matches CSS escape semantics
  // (e.g., `\;` is literal ';' inside a value, not a stop).
  // CSS url(...) raw mode: when scanning a value and we see 'url(' at
  // depth 0, skip the whole url() opaquely (strings tracked; comments
  // and brackets not recognized inside). Mirrors the CSS ident
  // tokenizer's url() branch — keeps unterminated `/*` inside url() from
  // matching a far-away `*/` across statement boundaries.
  // When balanced=false there's no depth tracking, so the url-raw skip's
  // `__depth === 0` guard is always-true and can be elided. Furthermore,
  // a `balanced: false` capture is semantically "flat" — the schema author
  // signaled the scan has no nesting structure, so the CSS-specific
  // url(...) raw-mode (which exists to treat `url(/* not-a-comment */)` as
  // opaque) doesn't apply. Same for the per-iteration comment skip below.
  // This was the biggest cost in markdown's setext speculation: every
  // paragraph paid for url() detection and depth tracking that couldn't fire.
  const urlRawDepthGuard = tracksDepth ? '__depth === 0\n      && ' : '';
  const urlRawSkip = ctx.cssIdent && until.balanced ? `
    if (${urlRawDepthGuard}(__c === 0x75 || __c === 0x55)
      && __off + 3 < __len
      && (__input.charCodeAt(__off + 1) | 32) === 0x72
      && (__input.charCodeAt(__off + 2) | 32) === 0x6c
      && __input.charCodeAt(__off + 3) === 0x28) {
      __off += 4;
      while (__off < __len) {
        const __uc = __input.charCodeAt(__off);
        if (__uc === 0x29) { __off++; break; }
        if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
        if (__uc === 0x22 || __uc === 0x27) {
          const __uq = __uc;
          __off++;
          while (__off < __len) {
            const __usc = __input.charCodeAt(__off);
            if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
            if (__usc === __uq) { __off++; break; }
            if (__usc === 0x0a || __usc === 0x0d) break;
            __off++;
          }
          continue;
        }
        __off++;
      }
      __lastNonWs = __off;
      continue;
    }` : '';
  // Comment scan inside the until-loop. The url(...) raw-mode skip above
  // already consumes `url(...)` opaquely, so any `/*` here is at a real
  // comment start and we scan to the first `*/`. Unterminated comments
  // (no `*/` until EOF) fall through to the regular byte path.
  // The backslash-as-escape arm is CSS escape semantics (`\;` is literal
  // `;`, etc.). It's only meaningful inside a balanced/nested capture —
  // for a flat `balanced: false` scan the schema author signaled no
  // escape interpretation, so we skip the branch too.
  const escapeArm = until.balanced ? `
    if (__c === 0x5c && __off + 1 < __len) {
      __lastNonWs = __off + 2;
      __off += 2;
      continue;
    }` : '';
  const commentSkip = hasComments && until.balanced ? `${urlRawSkip}
    if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      let __ce = __off + 2;
      while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
      if (__ce < __len) {
        __comments.push([__off, __ce + 2]);
        __off = __ce + 2;
        continue;
      }
    }${escapeArm}` : `${urlRawSkip}${escapeArm}`;
  const commentsDecl = hasComments ? '\n  const __comments: [number, number][] = [];' : '';
  const trimEndExpr = '__lastNonWs';
  const v = span.name ? jsIdent(span.name) : '__captured';
  // When the schema declares comments, build the captured slice by
  // concatenating segments around ws-adjacent comments; otherwise emit the
  // simple slice. Keep the simple path for non-comment schemas so they
  // don't grow code.
  const buildSlice = v === '__captured'
    ? ''
    : hasComments
      ? `
  if (__comments.length === 0) {
    ${v} = __input.slice(__startOff, ${trimEndExpr});
  } else {
    let __buf = '';
    let __cursor = __startOff;
    for (let __i = 0; __i < __comments.length; __i++) {
      const __cs = __comments[__i][0];
      const __ce = __comments[__i][1];
      if (__ce > ${trimEndExpr}) break;
      const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
      const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
      if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
      __buf += __input.slice(__cursor, __cs);
      __cursor = __ce;
    }
    __buf += __input.slice(__cursor, ${trimEndExpr});
    ${v} = __buf;
  }`
      : `
  ${v} = __input.slice(__startOff, ${trimEndExpr});`;
  // Dead-write elimination: state.__lastCaptureStart/End is read by
  //   1. the body's __consumedEnd tracking (raws and optional-literal fallback)
  //   2. needsOffsets for source range fields on the captured value
  //   3. refinement checks that need an error position (haveValue=true uses
  //      it only inside the SyntaxError message)
  // When none of these consumers exist for this span, the writes are pure
  // overhead — skip them. Hot paths: HTML attribute values, comment data,
  // markdown inline text — each runs once per node, so dropping two prop
  // writes per call saves measurable allocation/store churn.
  const needsOffsets = span.name ? offsetRefs.has(span.name) : false;
  const hasRefinements = span.refinements.length > 0;
  const writeCaptureState = bodyTracksCaptureState || needsOffsets || hasRefinements;
  const stateWriteEmpty = writeCaptureState
    ? 'state.__lastCaptureStart = __emptyAnchor;\n    state.__lastCaptureEnd = __emptyAnchor;\n    '
    : '';
  const stateWriteFilled = writeCaptureState
    ? `state.__lastCaptureStart = __startOff;\n    state.__lastCaptureEnd = ${trimEndExpr};\n    `
    : '';
  const scanCode = `{
  // __preWsOff captures the offset at entry — used (with leading-comment
  // tracking) to rewind __lastCaptureStart/End when the until captures
  // nothing. Anchor = end of the last leading comment if any, else
  // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
  const __preWsOff = __off;
  let __lastLeadingCommentEnd = -1;
  // Skip leading whitespace and comments from the capture's view.
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }${leadingCommentSkip}
    break;
  }
  const __startOff = __off;
  let __lastNonWs = __off;${tracksDepth ? '\n  let __depth = 0;' : ''}${commentsDecl}
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (${tracksDepth ? `__depth === 0 && (${stopExpr})` : stopExpr}) break;${balancedBlock}${stringSkip}${commentSkip}
    if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
    __off++;
  }
  if (__lastNonWs === __startOff) {
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
    ${stateWriteEmpty}__off = __emptyAnchor;
    ${v === '__captured' ? '' : `${v} = '';`}
  } else {
    ${stateWriteFilled}// Rewind __off to the trim boundary so trailing whitespace and
    // trailing comments (which were consumed during the scan) remain
    // available for the parent's next iteration. Matches tokenized's
    // captureUntil which rewinds state.pos past trailing comment tokens.
    __off = ${trimEndExpr};${buildSlice}
  }
}`;
  const rejectCheck = until.rejectSuffix
    ? `\nif (${v}.endsWith(${jsString(until.rejectSuffix)})) { state.off = __off; throw new SyntaxError(${jsString(`captured value ends with rejected suffix '${until.rejectSuffix}'`)}); }`
    : '';

  if (span.name) {
    valueExpr.set(span.name, v);
    presenceExpr.set(span.name, `(${v}.length > 0)`);
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${v}_start`);
      endOffExpr.set(span.name, `__${v}_end`);
    }
    const refinementCheck = emitSpanRefinementCheck(span, v, false, 'state.__lastCaptureStart', true);
    const offsetDecls = needsOffsets
      ? `\nconst __${v}_start = state.__lastCaptureStart;\nconst __${v}_end = state.__lastCaptureEnd;`
      : '';
    return `let ${v} = '';
${scanCode}${rejectCheck}${refinementCheck}${offsetDecls}`;
  }
  return `${scanCode}${rejectCheck}`;
}

function emitStopExpr(stops: readonly string[]): string {
  const byFirstByte = new Map<number, string[]>();
  for (const stop of stops) {
    if (stop.length === 0) continue;
    const first = stop.charCodeAt(0);
    const group = byFirstByte.get(first);
    if (group) group.push(stop);
    else byFirstByte.set(first, [stop]);
  }

  const checks: string[] = [];
  for (const [first, group] of byFirstByte) {
    const single = group.some((stop) => stop.length === 1);
    const multiChecks = group
      .filter((stop) => stop.length > 1)
      .sort((a, b) => b.length - a.length)
      .map((stop) => `__input.startsWith(${jsString(stop)}, __off)`);

    if (single) {
      checks.push(`__c === ${first}`);
    } else if (multiChecks.length === 1) {
      checks.push(`(__c === ${first} && ${multiChecks[0]})`);
    } else if (multiChecks.length > 1) {
      checks.push(`(__c === ${first} && (${multiChecks.join(' || ')}))`);
    }
  }

  return checks.join(' || ') || 'false';
}

function emitRawUntilSpan(
  span: ResolvedSpan,
  rawUntil: Extract<SpanModifier, { kind: 'rawUntil' }>,
  valueExpr: Map<string, string>,
  presenceExpr: Map<string, string>,
  startOffExpr: Map<string, string>,
  endOffExpr: Map<string, string>,
  offsetRefs: ReadonlySet<string>,
  _ctx: Ctx,
  bodyTracksCaptureState: boolean = true,
): string {
  const stops = rawUntil.stops;
  const ci = rawUntil.caseInsensitive;
  const v = span.name ? jsIdent(span.name) : '__rawCaptured';
  const needsOffsets = span.name ? offsetRefs.has(span.name) : false;
  const hasRefinements = span.refinements.length > 0;
  const writeCaptureState = bodyTracksCaptureState || needsOffsets || hasRefinements;
  const scanCode = emitRawUntilScan(v, stops, ci, writeCaptureState);

  if (span.name) {
    valueExpr.set(span.name, v);
    presenceExpr.set(span.name, `(${v}.length > 0)`);
    if (needsOffsets) {
      startOffExpr.set(span.name, `__${v}_start`);
      endOffExpr.set(span.name, `__${v}_end`);
    }
    const offsetDecls = needsOffsets
      ? `\nconst __${v}_start = state.__lastCaptureStart;\nconst __${v}_end = state.__lastCaptureEnd;`
      : '';
    return `let ${v} = '';
${scanCode}${offsetDecls}`;
  }
  return scanCode;
}

function emitRawUntilScan(varName: string, stops: ReadonlyArray<string>, caseInsensitive: boolean, writeCaptureState: boolean = true): string {
  const singleCharStops = stops.filter((s) => s.length === 1);
  const multiCharStops = stops.filter((s) => s.length >= 2);

  // Build a single fused scan: one pass over bytes, checking all stop chars
  // per byte. The previous emit ran one full pass per stop, which on HTML's
  // unquoted-attr value (6 single-char + 1 multi-char stop) did 7x the
  // work per attribute and dominated bench profiles at 22%.
  const captureWrite = writeCaptureState
    ? `state.__lastCaptureStart = __startOff;
  state.__lastCaptureEnd = __earliest;
  `
    : '';
  const setOff = `  __off = __earliest;
  ${captureWrite}${varName === '__rawCaptured' ? '' : `${varName} = __input.slice(__startOff, __earliest);`}
}`;

  if (stops.length === 0) {
    return `{
  const __startOff = __off;
  const __earliest = __len;
${setOff}`;
  }

  // Inline character predicate for the per-byte single-char check. For
  // case-insensitive single-char ASCII letter stops we fold on the fly;
  // non-letter chars need no folding. Multi-char stops are checked per
  // first-byte match below the predicate.
  const singleCharCodes = singleCharStops.map((s) => s.charCodeAt(0));
  const ciLetterCodes = caseInsensitive
    ? singleCharCodes.filter((c) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a))
    : [];
  const literalSingles = caseInsensitive
    ? singleCharCodes.filter((c) => !((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)))
    : singleCharCodes;
  // For ci letters we collapse upper/lower to the lower-case form once and
  // compare against the folded byte. The collapsed-set must be unique to
  // avoid redundant branches.
  const ciFoldedSet = [...new Set(ciLetterCodes.map((c) => c | 0x20))];

  const singleCheck = (() => {
    const parts: string[] = [];
    if (literalSingles.length > 0) {
      const ors = literalSingles.map((c) => `__c === ${c}`).join(' || ');
      parts.push(ors);
    }
    if (ciFoldedSet.length > 0) {
      const fold = `((__c >= 0x41 && __c <= 0x5a) ? (__c | 0x20) : __c)`;
      const ors = ciFoldedSet.map((c) => `${fold} === ${c}`).join(' || ');
      parts.push(`(${ors})`);
    }
    return parts.length > 0 ? parts.join(' || ') : null;
  })();

  // Multi-char stops checked at each position. Group by first byte so the
  // per-byte gate is cheap; on match, verify the rest of the needle.
  type MultiStop = { readonly first: number; readonly text: string };
  const multiStops: MultiStop[] = multiCharStops.map((s) => ({
    first: s.charCodeAt(0),
    text: s,
  }));

  const multiCheck = (() => {
    if (multiStops.length === 0) return null;
    // Case-insensitive multi-char stops fall back to a separate trailing
    // pass — none of the current schemas hit this combination, so we
    // avoid the inlining complexity until someone needs it.
    if (caseInsensitive) return null;
    const byFirst = new Map<number, string[]>();
    for (const { first, text } of multiStops) {
      const bucket = byFirst.get(first) ?? [];
      bucket.push(text);
      byFirst.set(first, bucket);
    }
    const branches: string[] = [];
    for (const [first, texts] of byFirst) {
      texts.sort((a, b) => b.length - a.length);
      const tests = texts.map((text) => {
        const len = text.length;
        if (len === 1) return 'true';
        const seq: string[] = [];
        for (let j = 1; j < len; j++) {
          seq.push(`__input.charCodeAt(__i + ${j}) === ${text.charCodeAt(j)}`);
        }
        return `(__i + ${len - 1} < __len && ${seq.join(' && ')})`;
      });
      branches.push(`if (__c === ${first} && (${tests.join(' || ')})) { __earliest = __i; break; }`);
    }
    return branches.join('\n    ');
  })();

  // Trailing fallback pass for case-insensitive multi-char stops.
  let trailingMulti = '';
  if (caseInsensitive && multiStops.length > 0) {
    const parts: string[] = [];
    for (const { text } of multiStops) {
      parts.push(`  {
    const __needle = ${jsString(text)};
    const __nlen = ${text.length};
    outer: for (let __i = __startOff; __i + __nlen <= __earliest; __i++) {
      for (let __j = 0; __j < __nlen; __j++) {
        const __ic = __input.charCodeAt(__i + __j);
        const __nc = __needle.charCodeAt(__j);
        const __ifold = (__ic >= 0x41 && __ic <= 0x5a) || (__ic >= 0x61 && __ic <= 0x7a) ? __ic | 0x20 : __ic;
        const __nfold = (__nc >= 0x41 && __nc <= 0x5a) || (__nc >= 0x61 && __nc <= 0x7a) ? __nc | 0x20 : __nc;
        if (__ifold !== __nfold) continue outer;
      }
      __earliest = __i; break;
    }
  }`);
    }
    trailingMulti = '\n' + parts.join('\n');
  }

  // Assemble the single-pass scan.
  const loopBody: string[] = [];
  if (singleCheck) {
    loopBody.push(`if (${singleCheck}) { __earliest = __i; break; }`);
  }
  if (multiCheck) {
    loopBody.push(multiCheck);
  }

  return `{
  const __startOff = __off;
  let __earliest = __len;
  for (let __i = __startOff; __i < __len; __i++) {
    const __c = __input.charCodeAt(__i);
    ${loopBody.join('\n    ')}
  }${trailingMulti}
${setOff}`;
}

// --- Utilities -------------------------------------------------------------

function findModifier<K extends SpanModifier['kind']>(
  modifiers: ReadonlyArray<SpanModifier>,
  kind: K,
): Extract<SpanModifier, { kind: K }> | undefined {
  for (const m of modifiers) if (m.kind === kind) return m as Extract<SpanModifier, { kind: K }>;
  return undefined;
}

function hasModifier(modifiers: ReadonlyArray<SpanModifier>, kind: SpanModifier['kind']): boolean {
  return modifiers.some((m) => m.kind === kind);
}

export function parseFnName(nodeType: string, variant: ParseVariant = 'raws'): string {
  const base = `parse${jsIdent(nodeType)}`;
  if (variant === 'validate') return `validate${jsIdent(nodeType)}`;
  return variant === 'fast' ? `${base}Fast` : base;
}

function indent(s: string, level = 1): string {
  const pad = '  '.repeat(level);
  return s.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}
