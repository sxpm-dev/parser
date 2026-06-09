// Generic shared-prefix factoring for multi-production dispatch.
//
// Background: `shared-dispatch.ts` already handles the K=1 case where alts
// share a literal first span and split on a `.oneOf(...)`-restricted ident
// (HTML element). That dispatch shape is specific. But many schemas have a
// LONGER shared prefix where divergence happens by literal token AFTER the
// shared run — e.g. pg-select.Select where four alts share
// `[SELECT, columns, FROM, table]` and split on the presence of ` WHERE …`
// and / or ` LIMIT …`.
//
// Under the legacy speculation chain (dispatch.ts emitSpeculationChain), the
// dispatcher tries each alt in order. The losing alts re-parse the entire
// shared prefix from scratch — pg-select's worst-case input (alt0, the
// no-WHERE / no-LIMIT form) re-parses `SELECT cols FROM table` four times.
// This module emits a dispatcher that parses the shared prefix ONCE inline,
// then peeks the next literal and routes to the matching alt tail with the
// prefix captures passed in by parameter — same per-alt tail-mode emit that
// shared-dispatch.ts already uses.
//
// Detection:
//   - All productions share a byte-identical K-span prefix (K >= 2). K=1 is
//     handled by the byte-prefix dispatcher in dispatch.ts already; matching
//     it again here would only duplicate that path.
//   - Each alt's suffix is EITHER empty (at most one such alt) OR starts
//     with a fixed-text literal first span (no optional / repeats / until
//     modifier, no recursive role) — this is the byte we dispatch on.
//   - No suffix-first-literal is a prefix of another (e.g. "LIMIT" and
//     "LIMITED" would conflict because dispatching by startsWith on "LIMIT"
//     would route both to the same group; this never arises in practice and
//     we conservatively bail).
//
// Emit: see emitPrefixShareDispatcher below.

import type { InferredSchema, NodeTypeInfo, Production } from '../../model.ts';
import { jsString } from '../strings.ts';
import { spansMatchExactly } from './shared-dispatch.ts';
import {
  _skipWsBlock,
  skipWsAndCommentsBlock,
  spanConsumesComments,
} from './production.ts';
import { computeKnownLeadingBytes, emitSpan, findModifier, hasModifier, type SpanBindings, type SpanContext } from './span.ts';

export interface PrefixShare {
  /** Number of leading spans byte-identical across every alt. K >= 2. */
  readonly prefixLen: number;
  /** For each alt, the literal text that leads its suffix, or null when the
   *  suffix is empty (the "no extension" alt — at most one). */
  readonly suffixHeads: ReadonlyArray<{ readonly altIdx: number; readonly head: string | null }>;
}

export function detectPrefixShare(info: NodeTypeInfo): PrefixShare | null {
  const prods = info.productions;
  if (prods.length < 2) return null;
  const first = prods[0]!.spans;

  // Find the longest byte-identical prefix across every alt. spansMatchExactly
  // is the same equality the existing detectSharedDispatch uses for its
  // strict-shared walk.
  let K = 0;
  while (K < first.length) {
    const allMatch = prods.every(
      (p) => K < p.spans.length && spansMatchExactly(first[K]!, p.spans[K]!),
    );
    if (!allMatch) break;
    K++;
  }
  if (K < 2) return null;

  // Every prefix span must be a clean re-usable parse step. The most
  // dangerous shape is a `.repeats()` whose stopBefore set doesn't include
  // every literal that may appear after the prefix — but in practice the
  // stop set has to cover the immediate next literal in the same production
  // (FROM after columns, etc.), and that literal IS in the shared prefix by
  // definition. Don't add an extra check; if the schema has a buggy stop
  // set, that's a schema bug, not a factoring bug.

  // Suffix-head classification.
  const heads: Array<{ altIdx: number; head: string | null }> = [];
  let emptyCount = 0;
  const headTexts: string[] = [];
  for (let altIdx = 0; altIdx < prods.length; altIdx++) {
    const suffix = prods[altIdx]!.spans.slice(K);
    if (suffix.length === 0) {
      emptyCount++;
      heads.push({ altIdx, head: null });
      continue;
    }
    const s0 = suffix[0]!;
    if (
      s0.class !== 'literal' ||
      !s0.text ||
      hasModifier(s0, 'optional') ||
      findModifier(s0, 'until') ||
      findModifier(s0, 'rawUntil') ||
      findModifier(s0, 'repeats') ||
      s0.recursiveRoles.length > 0
    ) {
      return null;
    }
    heads.push({ altIdx, head: s0.text });
    headTexts.push(s0.text);
  }
  // At most one empty-suffix alt. Two would be identical productions.
  if (emptyCount > 1) return null;
  // No literal-head must be a strict prefix of another. Conservative: avoid
  // ambiguity in the byte-peek routing.
  for (let i = 0; i < headTexts.length; i++) {
    for (let j = 0; j < headTexts.length; j++) {
      if (i === j) continue;
      if (headTexts[i] !== headTexts[j] && headTexts[j]!.startsWith(headTexts[i]!)) {
        return null;
      }
    }
  }
  return { prefixLen: K, suffixHeads: heads };
}

/** Companion of buildPrefixOption in emit/v2/index.ts — generalised to an
 *  arbitrary skipCount instead of shared-dispatch's discriminatorIdx + 1.
 *  Produces the EmitProductionOptions.prefix payload that makes a production
 *  body emit as a TAIL (skipCount spans dropped from its head, the named
 *  captures forwarded as parameters).
 *
 *  Phase 4c v5 (roadmap leftover #2): when the schema would emit ws/litPres
 *  capture for a full-body production, the dispatcher pre-allocates them and
 *  the tail receives them by parameter so its inter-suffix-span gaps land
 *  in the same array. `wsCaptureMode` is set to the same value SpanContext
 *  would have chosen, so the tail's pushes use the matching gating. */
export function buildPrefixShareOption(
  production: Production,
  skipCount: number,
  schema: InferredSchema,
) {
  const valueParams = new Map<string, string>();
  const startOffParams = new Map<string, string>();
  const endOffParams = new Map<string, string>();
  for (let i = 0; i < skipCount; i++) {
    const span = production.spans[i]!;
    if (!span.name) continue;
    valueParams.set(span.name, span.name);
    startOffParams.set(span.name, `${span.name}__start`);
    endOffParams.set(span.name, `${span.name}__end`);
  }
  const wsCaptureMode: 'always' | 'raws-only' =
    schema.whitespace === 'preserve' ? 'always' : 'raws-only';
  return {
    skipCount,
    valueParams,
    startOffParams,
    endOffParams,
    wsCaptureMode,
  } as const;
}

/** Emit the dispatcher function body when detectPrefixShare matches.
 *  Shape:
 *    1. ws-skip (matches every other dispatcher entry)
 *    2. inline parse of spans[0..prefixLen-1] via emitSpan — exactly the
 *       same code shape emitProduction would have emitted for those spans,
 *       so the captures are byte-identical to the legacy non-factored emit
 *    3. peek the byte after the post-prefix ws (read-only, doesn't commit)
 *    4. dispatch on that byte via startsWith on each distinct suffix head;
 *       within a same-head group, longest-suffix alt first (matches the
 *       legacy speculation order so e.g. alt3 [WHERE,where,LIMIT,limit] is
 *       tried before alt1 [WHERE,where])
 *    5. fall through to the empty-suffix alt if no head matched (that alt
 *       is allowed at most once)
 *
 *  Why an inline parse instead of a separate __prefix function? Because the
 *  captured locals (`columns`, `table`, …) need to stay in scope to be
 *  passed to the alt tails as arguments — a separate function would force
 *  an object allocation per parse and a destructure at the dispatch site.
 */
export function emitPrefixShareDispatcher(
  info: NodeTypeInfo,
  schema: InferredSchema,
  fnName: string,
  altFnNames: ReadonlyArray<string>,
  share: PrefixShare,
): string {
  const prefixProd = info.productions[0]!;

  // SpanContext mirrors what emitProduction builds for a normal body. The
  // dispatcher only emits the prefix spans, so referencedValueSpans is
  // intentionally left undefined (preserve every named capture — the alt
  // tails reference them by parameter name).
  const tokenClasses = new Set<string>();
  let cssIdent = false;
  const lineCommentMarkers: string[] = [];
  for (const usage of schema.classes) {
    tokenClasses.add(usage.class);
    if (usage.class === 'ident' && usage.refinements.some((r) => r.name === 'css')) {
      cssIdent = true;
    }
    if (usage.class === 'comment') {
      for (const ref of usage.refinements) {
        if (ref.name === 'line' && Array.isArray(ref.args) && typeof ref.args[0] === 'string') {
          lineCommentMarkers.push(ref.args[0]);
        }
      }
    }
  }
  const CONTENT_CLASSES = new Set(['ident', 'number', 'hex', 'string', 'regex', 'template', 'operator']);
  const hasContentClass = schema.classes.some((cls) => CONTENT_CLASSES.has(cls.class));
  const emitUnknownCharsGuard = schema.unknownChars === 'reject' && hasContentClass;
  // Build a referenced-spans set that covers EVERY named prefix span so the
  // emit/v2/span lazy-capture pass keeps them alive — the alt tails
  // unconditionally reference them by parameter name, so eliding the
  // capture here would yield ReferenceErrors at parse time.
  const referencedValueSpans = new Set<string>();
  for (let i = 0; i < share.prefixLen; i++) {
    const s = prefixProd.spans[i]!;
    if (s.name) referencedValueSpans.add(s.name);
  }
  const preserveWs = schema.whitespace === 'preserve';
  const rawsCapture = !preserveWs;
  // Phase 4c v5 (roadmap leftover #2). The dispatcher now matches the
  // full-body production's wsCaptureMode so inter-prefix-span trivia
  // is captured. The alt tails receive the partial arrays and continue
  // pushing into them, so the rebuild sees one contiguous __ws array
  // spanning prefix + suffix.
  const wsCaptureMode: 'always' | 'raws-only' = preserveWs ? 'always' : 'raws-only';
  const ctx: SpanContext = {
    entryOffVar: 'entryOff',
    raws: false,
    tokens: tokenClasses,
    cssIdent,
    nodeTypes: schema.nodeTypes,
    emitUnknownCharsGuard,
    knownBytes: computeKnownLeadingBytes(schema),
    symbolPrefix: schema.symbolPrefix,
    operatorLiterals: schema.operatorLiterals,
    preserveWs,
    wsCaptureMode,
    lineCommentMarkers,
    // The dispatcher emits only the prefix spans, which are NEVER optional
    // (shared prefix means non-optional by construction). An empty presence
    // set is correct: no optional class span can appear here.
    referencedValueSpans,
    referencedPresenceSpans: new Set<string>(),
  };
  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
    iwsExpr: new Map(),
  };

  const lines: string[] = [];
  lines.push(`const input = state.input;`);
  lines.push(`const len = state.len;`);
  lines.push(`let off = state.pos;`);
  lines.push(`const entryOff = off;`);
  lines.push(_skipWsBlock());
  // Phase 4c v5: declare the partial __ws / __litPres arrays. The
  // dispatcher pushes inter-prefix-span gaps into them; the alt tails
  // receive them as parameters and continue pushing inter-suffix-span
  // gaps, so the rebuild reads a single concatenated trivia array.
  if (preserveWs) {
    lines.push(`const __ws: string[] = [];`);
    lines.push(`const __litPres: boolean[] = [];`);
  } else {
    lines.push(`const __ws: string[] | null = state.mode === 'raws' ? [] : null;`);
    lines.push(`const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;`);
  }

  for (let i = 0; i < share.prefixLen; i++) {
    const span = prefixProd.spans[i]!;
    if (i > 0) {
      const consumesData = spanConsumesComments(span, schema);
      const isOptional = hasModifier(span, 'optional');
      const interSpanSkip = tokenClasses.has('comment') && !consumesData && !isOptional
        ? skipWsAndCommentsBlock(lineCommentMarkers)
        : _skipWsBlock();
      // Snapshot the offset before the gap and push the slice after.
      // Mirrors production.ts's full-body emit so the resulting __ws
      // array shape is indistinguishable from the unfactored path.
      lines.push(`const __wsStart_${i} = off;`);
      lines.push(interSpanSkip);
      if (preserveWs) {
        lines.push(`__ws.push(input.slice(__wsStart_${i}, off));`);
      } else {
        lines.push(`if (__ws !== null) __ws.push(input.slice(__wsStart_${i}, off));`);
      }
    }
    // Unnamed optional literals contribute a __litPres entry. Rare in
    // prefix-share but mirror the production.ts shape for parity.
    const isUnnamedOptLit =
      span.name === undefined &&
      span.class === 'literal' &&
      hasModifier(span, 'optional');
    if (isUnnamedOptLit) {
      lines.push(`const __litPre_${i} = off;`);
    }
    lines.push(emitSpan(span, ctx, bindings));
    if (isUnnamedOptLit) {
      if (preserveWs) {
        lines.push(`__litPres.push(off > __litPre_${i});`);
      } else {
        lines.push(`if (__litPres !== null) __litPres.push(off > __litPre_${i});`);
      }
    }
  }
  void rawsCapture;

  lines.push(`state.pos = off;`);
  lines.push(`if (off > state.maxOff) state.maxOff = off;`);
  lines.push(`const __postPos = off;`);

  // Read-only peek past post-prefix ws. We're looking at the byte right
  // before the suffix's first literal — startsWith over that whole literal
  // is what each branch tests.
  lines.push(`let __peekOff = off;`);
  lines.push(`while (__peekOff < len) {
  const c = input.charCodeAt(__peekOff);
  if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { __peekOff++; continue; }
  break;
}`);

  // Build per-alt tail-call expression. Mirror buildPrefixShareOption's
  // parameter order (which mirrors buildPrefixOption in emit/v2/index.ts):
  // state, entryOff, then for every named span in spans[0..prefixLen-1] the
  // values (insertion order), then start-offsets, then end-offsets. The
  // dispatcher emits LOCAL variables via emitSpan whose names follow the
  // `__<name>_start` / `__<name>_end` convention (see emitClassSpan etc.);
  // those are different from the alt-tail PARAMETER names (`<name>__start`),
  // so query the bindings map for the right local instead of synthesizing
  // a name. Value bindings are the jsIdent of the span name (the parameter
  // name matches verbatim).
  const tailArgList: string[] = ['state', 'entryOff'];
  for (let i = 0; i < share.prefixLen; i++) {
    const s = prefixProd.spans[i]!;
    if (!s.name) continue;
    const valueLocal = bindings.valueExpr.get(s.name);
    if (!valueLocal) {
      throw new Error(
        `emitPrefixShareDispatcher: emitSpan did not bind value for prefix span '${s.name}' in '${info.name}'`,
      );
    }
    tailArgList.push(valueLocal);
  }
  for (let i = 0; i < share.prefixLen; i++) {
    const s = prefixProd.spans[i]!;
    if (!s.name) continue;
    const startLocal = bindings.startOffExpr.get(s.name);
    if (!startLocal) {
      throw new Error(
        `emitPrefixShareDispatcher: emitSpan did not bind start-offset for prefix span '${s.name}' in '${info.name}'`,
      );
    }
    tailArgList.push(startLocal);
  }
  for (let i = 0; i < share.prefixLen; i++) {
    const s = prefixProd.spans[i]!;
    if (!s.name) continue;
    const endLocal = bindings.endOffExpr.get(s.name);
    if (!endLocal) {
      throw new Error(
        `emitPrefixShareDispatcher: emitSpan did not bind end-offset for prefix span '${s.name}' in '${info.name}'`,
      );
    }
    tailArgList.push(endLocal);
  }
  // Pass the partial trivia arrays last. Order MUST match the parameter
  // order emitted by emitProduction (production.ts) when its prefix opt
  // carries wsCaptureMode.
  tailArgList.push('__ws', '__litPres');
  const tailArgs = tailArgList.join(', ');

  // Group alts by suffix head. Within a group, longest-suffix (most spans)
  // first — mirrors the speculation-chain order in dispatch.ts for the same
  // reason: a longer match should win when an input could satisfy either.
  // The empty-suffix alt (head === null) is the final fallthrough.
  const byHead = new Map<string, number[]>();
  let emptyAltIdx: number | null = null;
  for (const { altIdx, head } of share.suffixHeads) {
    if (head === null) {
      emptyAltIdx = altIdx;
      continue;
    }
    let bucket = byHead.get(head);
    if (!bucket) {
      bucket = [];
      byHead.set(head, bucket);
    }
    bucket.push(altIdx);
  }
  for (const bucket of byHead.values()) {
    bucket.sort((a, b) => info.productions[b]!.spans.length - info.productions[a]!.spans.length);
  }

  // Emit the dispatch. Order heads by descending length first so that when
  // two heads share a first byte (rare but possible — e.g. "LIMIT" vs "LATERAL"
  // both start with 'L'), the longer match is tested first. Within heads of
  // equal length, declaration order via Map iteration is stable.
  const headEntries = [...byHead.entries()];
  headEntries.sort((a, b) => b[0].length - a[0].length);

  for (const [head, altIdxs] of headEntries) {
    const headLit = jsString(head);
    const probes = altIdxs
      .map(
        (idx) =>
          `  state.pos = __postPos; { const r = ${altFnNames[idx]}(${tailArgs}); if (r !== null) return r; }`,
      )
      .join('\n');
    lines.push(`if (input.startsWith(${headLit}, __peekOff)) {
${probes}
}`);
  }

  if (emptyAltIdx !== null) {
    lines.push(`state.pos = __postPos;`);
    lines.push(`return ${altFnNames[emptyAltIdx]}(${tailArgs});`);
  } else {
    lines.push(`state.pos = entryOff;`);
    lines.push(`return null;`);
  }

  const body = lines.filter((l) => l !== '').join('\n');
  // The dispatcher itself owns entryOff (it's `let off = state.pos` at the
  // top) so failure-return paths use `state.pos = entryOff; return null;`.
  // Tail calls already rewind to entryOff on internal failure (the alt body
  // sees entryOff as a parameter); we restore __postPos before each
  // subsequent probe so the next tail starts from the post-prefix position.
  return `function ${fnName}(state: State): unknown {
${indent(body, 1)}
}`;
}

function indent(s: string, level: number): string {
  const pad = '  '.repeat(level);
  return s.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}
