// Emit one production body. Produces a function:
//   function <fnName>(state: State): unknown {
//     const input = state.input;
//     const len = state.len;
//     let off = state.off;
//     const entryOff = off;
//     // [skip leading ws]
//     // [span 1]
//     // [skip ws]
//     // [span 2]
//     // ...
//     state.pos = off;
//     return <captures expression>;
//   }
//
// Failure paths inside the body do `state.pos = entryOff; return null;` and
// update state.maxOff so the top-level error reports the deepest position.

import type { InferredSchema, Production, ResolvedSpan } from '../../model.ts';
import { computeReferencedSpanValues, emitCapturesExpr, type CapturesBindings } from '../captures.ts';
import { productionRoutingKey } from '../render.ts';
import { indent, jsString } from '../strings.ts';
import { computeKnownLeadingBytes, emitSpan, hasModifier, type SpanBindings, type SpanContext } from './span.ts';

// Class kinds whose presence (alongside `unknownChars: 'reject'`) justifies
// emitting the depth-0 byte-class guard in .until() bodies. A schema with
// only comment / whitespace classes does not constrain what bytes may
// legitimately appear at depth 0, so the guard would over-reject; gate on
// at least one of these.
const CONTENT_CLASSES: ReadonlySet<string> = new Set<string>([
  'ident', 'number', 'hex', 'string', 'regex', 'template', 'operator',
]);

export type EmitProductionOptions = {
  readonly fnName: string;
  readonly prodIdx: number;
  /** When set, emit this production as a TAIL body: the first `skipCount`
   *  spans have already been consumed by the caller (typically a shared
   *  dispatcher), and the captures from those spans are passed in as
   *  function parameters instead of locally derived. The leading ws-skip
   *  is also dropped (the caller did it before scanning the prefix). */
  readonly prefix?: {
    /** Number of leading spans whose emission is skipped. */
    readonly skipCount: number;
    /** Captured-name → parameter expression. The function signature
     *  receives a parameter for each entry (in insertion order, after the
     *  `entryOff` parameter); span emit treats these as already-bound. */
    readonly valueParams: ReadonlyMap<string, string>;
    /** Captured-name → parameter expression for source-start offsets.
     *  Same semantics as valueParams. Empty when the caller can't supply
     *  per-span offsets (downstream synthetic refs that need them would
     *  emit `undefined`; for the html shape no such refs reference the
     *  dispatched span). */
    readonly startOffParams: ReadonlyMap<string, string>;
    /** Captured-name → parameter expression for source-end offsets. */
    readonly endOffParams: ReadonlyMap<string, string>;
  };
};

export function emitProduction(
  _nodeName: string,
  production: Production,
  schema: InferredSchema,
  opts: EmitProductionOptions,
): string {
  const prefix = opts.prefix;
  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
    iwsExpr: new Map(),
  };
  // In tail mode the caller has already captured the prefix spans and
  // passed them in as parameters. Pre-populate the binding maps so any
  // downstream span/refinement/captures expression that references those
  // names sees the parameter directly instead of an undefined local.
  if (prefix) {
    for (const [name, paramExpr] of prefix.valueParams) bindings.valueExpr.set(name, paramExpr);
    for (const [name, paramExpr] of prefix.startOffParams) bindings.startOffExpr.set(name, paramExpr);
    for (const [name, paramExpr] of prefix.endOffParams) bindings.endOffExpr.set(name, paramExpr);
  }
  // Derive scan-kernel feature flags from the schema's declared token classes
  // and ident refinement. These teach .until() captures how to handle strings
  // / comments / CSS url() as opaque units.
  const tokenClasses = new Set<string>();
  let cssIdent = false;
  const lineCommentMarkers: string[] = [];
  for (const usage of schema.classes) {
    tokenClasses.add(usage.class);
    if (usage.class === 'ident' && usage.refinements.some((r) => r.name === 'css')) {
      cssIdent = true;
    }
    // Phase 4c v5: collect line-comment markers from comment-class
    // refinements declared in `tokens: [...]`. The first marker wins
    // when multiple line refinements appear (rare).
    if (usage.class === 'comment') {
      for (const ref of usage.refinements) {
        if (ref.name === 'line' && Array.isArray(ref.args) && typeof ref.args[0] === 'string') {
          lineCommentMarkers.push(ref.args[0]);
        }
      }
    }
  }
  // The unknownChars guard is only emitted when the schema BOTH declares
  // 'reject' AND has at least one CONTENT_CLASSES class. See module-level
  // CONTENT_CLASSES constant for the rationale.
  const hasContentClass = schema.classes.some((cls) => CONTENT_CLASSES.has(cls.class));
  const emitUnknownCharsGuard = schema.unknownChars === 'reject' && hasContentClass;
  // Phase 5a — lazy span value capture. Compute the set of span names
  // whose value lands in some render body / inverseDerived; emit/v2/span.ts
  // uses this to elide unreferenced class-span slices and literal-span
  // constants. Shared-dispatch prefix bodies pass the same set so the
  // tail bodies (which see the prefix spans as parameters, not captures)
  // stay consistent — even though the prefix captures already supply
  // valueExpr for those names, the lookup is harmless when present.
  const referencedValueSpans = computeReferencedSpanValues(production);
  const ctx: SpanContext = {
    entryOffVar: 'entryOff',
    raws: false /* per-call-site */,
    tokens: tokenClasses,
    cssIdent,
    nodeTypes: schema.nodeTypes,
    emitUnknownCharsGuard,
    knownBytes: computeKnownLeadingBytes(schema),
    symbolPrefix: schema.symbolPrefix,
    operatorLiterals: schema.operatorLiterals,
    preserveWs: schema.whitespace === 'preserve',
    lineCommentMarkers,
    referencedValueSpans,
  };

  const lines: string[] = [];
  lines.push(`const input = state.input;`);
  lines.push(`const len = state.len;`);
  lines.push(`let off = state.pos;`);
  // In tail mode `entryOff` is a parameter, not a local — the dispatcher
  // owns the rewind boundary because state.pos was committed past the
  // shared prefix before calling the tail. Skip the leading ws-skip too;
  // the dispatcher already consumed leading whitespace before the prefix.
  if (!prefix) {
    lines.push(`const entryOff = off;`);
    lines.push(skipWsBlock());
  }
  // Recovery alts snapshot the diagnostics-list length at entry. The
  // snapshot is later used to (a) skip the push when this body is one of
  // a speculative ladder and a downstream span failure rewinds, and (b)
  // truncate inner pushes from nested productions called by this body
  // before the rewind. emitProduction stamps `state.diagnostics.length
  // = __diagSnap;` into every failure-return path via a post-emit
  // string replacement (see end of function).
  const isRecovery = production.recovery !== undefined;
  if (isRecovery) {
    lines.push(`const __diagSnap = state.diagnostics.length;`);
  }
  // Phase 4a v2: span-less recovery. When a `.recovers({ syncAt, drop })`
  // production has zero spans, it acts as a true fall-through alt — the
  // parser scans forward (with bracket depth tracking) until it sees a
  // syncAt literal at depth 0, pushes a diagnostic for the dropped
  // region, and returns a synthetic captures payload with NO span
  // values (the schema author's render body must not reference any
  // $.<span> ref; usually it's a scalar like `{ type: 'recovered' }`).
  const isSpanlessRecovery = isRecovery && production.spans.length === 0;
  if (isSpanlessRecovery && !prefix) {
    const syncSet = production.recovery!.syncAt.filter((s) => s.length > 0);
    if (syncSet.length === 0) {
      throw new Error(
        `v2: span-less recovery production for '${production.nodeType}' has empty syncAt — would scan to EOF on every input. Require at least one non-empty sync literal.`,
      );
    }
    // Emit an inline depth-tracked scan. For each char: track () [] {}
    // depth; stop at depth 0 when a sync literal matches. The scan
    // succeeds when at least one byte was consumed (rejecting empty
    // recovery prevents the dispatcher from infinite-looping on
    // immediate sync chars).
    const sortedSync = [...syncSet].sort((a, b) => b.length - a.length);
    const syncCheck = sortedSync
      .map((s) => (s.length === 1
        ? `c === ${s.charCodeAt(0)}`
        : `input.startsWith(${jsString(s)}, off)`))
      .join(' || ');
    lines.push(`let __depth = 0;`);
    lines.push(`const __recStart = off;`);
    lines.push(`while (off < len) {`);
    lines.push(`  const c = input.charCodeAt(off);`);
    lines.push(`  if (__depth === 0 && (${syncCheck})) break;`);
    lines.push(`  if (c === 0x28 || c === 0x5b || c === 0x7b) __depth++;`);
    lines.push(`  else if (c === 0x29 || c === 0x5d || c === 0x7d) { if (__depth > 0) __depth--; }`);
    lines.push(`  off++;`);
    lines.push(`}`);
    lines.push(`if (off === __recStart) { state.pos = entryOff; state.diagnostics.length = __diagSnap; return null; }`);
    lines.push(`state.pos = off;`);
    lines.push(`if (off > state.maxOff) state.maxOff = off;`);
    lines.push(
      `state.diagnostics.push({ code: 'recovered', drop: ${jsString(production.recovery!.drop)}, start: __recStart, end: off });`,
    );
    // Synthetic captures: just __production. Render body shouldn't
    // reference any $ refs; rebuild produces the body's scalar shape.
    const prodKey = productionRoutingKey(production, opts.prodIdx);
    lines.push(`return { __production: ${jsString(prodKey)} };`);
    // Span-less recovery is only reached when !prefix (the gate above
    // requires it), so the function signature has no shared-dispatch
    // tail parameters.
    return `function ${opts.fnName}(state: State): unknown {
${indent(lines.filter((l) => l !== '').join('\n'), 1)}
}`;
  }
  // Phase 4b — `whitespace: 'preserve'`. Capture every inter-span gap
  // (the slice between the prior span's end and this span's start,
  // post leading-ws-skip) into `__ws`. The captures payload exposes
  // `__ws` so the rebuild emit can re-emit the exact bytes between
  // pieces (instead of the canonical single-space separator used for
  // 'standard'). Tail-mode bodies (prefix !== undefined) skip __ws
  // capture: shared-dispatch alts always consume a literal prefix that
  // 'preserve' semantics don't make sense for.
  const preserveWs = schema.whitespace === 'preserve' && !prefix;
  if (preserveWs) {
    lines.push(`const __ws: string[] = [];`);
    // Phase 4c v2: presence tracking for unnamed optional literal spans.
    // Their `if (match) off += len` emit doesn't expose a JS-visible
    // presence bit anywhere, so the rebuild can't tell whether to
    // re-emit the literal. We wrap each one with an off snapshot +
    // post-check that pushes the bool into __litPres; the rebuild
    // reads __litPres[i] to gate the literal piece.
    lines.push(`const __litPres: boolean[] = [];`);
  }

  const spans = production.spans;
  const startIdx = prefix ? prefix.skipCount : 0;
  for (let i = startIdx; i < spans.length; i++) {
    const span = spans[i]!;
    if (i > 0) {
      // Inter-span gap skip strategy. Three conditions must hold for the
      // gap to eat `/* */` comments alongside whitespace:
      //   (a) the schema declares `comment` as a token class
      //   (b) the upcoming span isn't itself a comment-capturing span (a
      //       comment-class span, or a recursive span whose roles include
      //       a Comment-style production) — otherwise we'd eat the comment
      //       the next span is meant to capture
      //   (c) the upcoming span is REQUIRED, not optional — v1's emit saves
      //       the offset before the gap and rewinds when the optional span
      //       doesn't match, leaving the comment available for the
      //       parent's next span. v2's optional spans don't rewind through
      //       the gap, so suppress comment-eating here to leave the comment
      //       for whoever follows. Matches the CSS Declaration alt where a
      //       trailing `/* */` comment lives between the value's trim
      //       boundary and the rule body's next iteration.
      const consumesData = spanConsumesComments(span, schema);
      const isOptional = hasModifier(span, 'optional');
      const interSpanSkip = tokenClasses.has('comment') && !consumesData && !isOptional
        ? skipWsAndCommentsBlock(lineCommentMarkers)
        : skipWsBlock();
      if (preserveWs) {
        lines.push(`const __wsStart_${i} = off;`);
      }
      lines.push(interSpanSkip);
      if (preserveWs) {
        lines.push(`__ws.push(input.slice(__wsStart_${i}, off));`);
      }
    }
    // Phase 4c v2: presence tracking for unnamed optional literals.
    // Required spans always advance off (else they fail-return null), so
    // their presence is implicitly always true. Named optionals carry
    // presence via their nullable captured value.
    const isUnnamedOptLit =
      preserveWs &&
      span.name === undefined &&
      span.class === 'literal' &&
      hasModifier(span, 'optional');
    if (isUnnamedOptLit) {
      lines.push(`const __litPre_${i} = off;`);
    }
    lines.push(emitSpan(span, ctx, bindings));
    if (isUnnamedOptLit) {
      lines.push(`__litPres.push(off > __litPre_${i});`);
    }
  }
  // No trailing ws skip — a production owns its captured range. WS after
  // belongs to the parent (which handles inter-sibling ws).

  lines.push(`state.pos = off;`);
  lines.push(`if (off > state.maxOff) state.maxOff = off;`);
  // Recovery diagnostic push — runs immediately before the captures
  // payload is returned. Inner pushes (from nested productions called
  // by this body's spans) are preserved alongside this one; rollbacks
  // are handled by the failure-return rewrite below.
  if (isRecovery) {
    const drop = production.recovery!.drop;
    lines.push(
      `state.diagnostics.push({ code: 'recovered', drop: ${jsString(drop)}, start: entryOff, end: off });`,
    );
  }

  // Build the captures payload. Same shape emitted whether the runtime is
  // running in fast or raws mode — raws-only synthetic refs (gap, raw,
  // commentLeft/Right inside the ast body's `raws:` subfield) are filtered
  // here in fast mode via `omitRaws`. In raws mode we additionally attach
  // a `source` field used by the AST builder.
  const prodKey = productionRoutingKey(production, opts.prodIdx);
  const withWs = (capt: string): string => {
    if (!preserveWs) return capt;
    // Inject `__ws: __ws` (Phase 4b), per-span `<name>_iws` entries
    // (Phase 4c v2), and `__litPres` (Phase 4c v2 unnamed-optional-
    // literal presence) immediately after `__production`. The
    // emitCapturesExpr output always starts with `{ __production: "<key>"`
    // so this regex is stable.
    const iwsFields: string[] = [];
    for (const [name, expr] of bindings.iwsExpr) {
      iwsFields.push(`${name}_iws: ${expr}`);
    }
    const fields = ['__ws: __ws', '__litPres: __litPres', ...iwsFields];
    const extras = `, ${fields.join(', ')}`;
    return capt.replace(/^\{ (__production: "[^"]+")/, `{ $1${extras}`);
  };
  const fastCaptures = withWs(emitCapturesExpr(production, prodKey, toCapturesBindings(bindings), { omitRaws: true }));
  const rawsCaptures = withWs(emitCapturesExpr(production, prodKey, toCapturesBindings(bindings), {}));
  const sameShape = fastCaptures === rawsCaptures;
  const returnBlock = sameShape
    ? `if (state.mode === 'raws') {
  const __captures: any = ${rawsCaptures};
  if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
  return __captures;
}
return ${fastCaptures};`
    : `if (state.mode === 'raws') {
  const __captures: any = ${rawsCaptures};
  if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
  return __captures;
}
return ${fastCaptures};`;
  lines.push(returnBlock);

  const extraParams = prefix
    ? [
        ', entryOff: number',
        ...[...prefix.valueParams.keys()].map((name) => `, ${name}: string`),
        ...[...prefix.startOffParams.keys()].map((name) => `, ${startOffParamName(name)}: number`),
        ...[...prefix.endOffParams.keys()].map((name) => `, ${endOffParamName(name)}: number`),
      ].join('')
    : '';
  let body = indent(lines.filter((l) => l !== '').join('\n'), 1);
  // Failure-return rewrite for recovery alts. Every emit site funnels
  // failure through `state.pos = entryOff; return null;` (or `... = off;`
  // for prefix-mode dispatchers; recovery alts use full-prologue emit
  // only, so the literal `entryOff` form is enough). Inject the
  // diagnostics-list truncate so a rolled-back recovery alt leaves
  // state.diagnostics identical to its entry length, including any
  // pushes from nested productions inside this body.
  if (isRecovery) {
    body = body.replace(
      /state\.pos = entryOff;\s*return null;/g,
      'state.pos = entryOff; state.diagnostics.length = __diagSnap; return null;',
    );
  }
  return `function ${opts.fnName}(state: State${extraParams}): unknown {
${body}
}`;
}

/** Mirror of the parameter-name convention used by the shared dispatcher
 *  caller. When the start-offset parameter for `tag` is referenced from the
 *  tail body's bindings the caller MUST supply it under this exact name. */
function startOffParamName(captureName: string): string {
  return `${captureName}__start`;
}

function endOffParamName(captureName: string): string {
  return `${captureName}__end`;
}

function toCapturesBindings(b: SpanBindings): CapturesBindings {
  return {
    valueExpr: b.valueExpr,
    startOffExpr: b.startOffExpr,
    endOffExpr: b.endOffExpr,
  };
}

function skipWsBlock(): string {
  return _skipWsBlock();
}

/** Inline ws-skip block. Exported so the generic prefix-share dispatcher
 *  (prefix-share-dispatch.ts) can emit the same inter-span and leading
 *  ws-skip the production body uses. */
export function _skipWsBlock(): string {
  return `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;
}

// True iff this span is meant to capture `/* */` comments as data. Covers:
//   1. a class-`comment` span on the span itself (e.g. .span('text', '/* x */').comment())
//   2. a recursive span (repeats / non-repeats) whose roles include any
//      production whose first non-empty span is a comment-class span.
// Used by the inter-span gap to decide whether to skip comments before this
// span. v1 mirrors the same idea by not emitting a comment-skip before a
// repeats body when one of its roles is a Comment-producing production.
export function spanConsumesComments(span: ResolvedSpan, schema: InferredSchema): boolean {
  if (span.class === 'comment') return true;
  if (span.recursiveRoles.length === 0) return false;
  for (const roleName of span.recursiveRoles) {
    const info = schema.nodeTypes.get(roleName);
    if (!info) continue;
    for (const prod of info.productions) {
      const firstSpan = prod.spans[0];
      if (firstSpan && firstSpan.class === 'comment') return true;
    }
  }
  return false;
}

export function skipWsAndCommentsBlock(lineCommentMarkers: ReadonlyArray<string> = []): string {
  // ws OR `/* ... */` block comment OR (when declared via `tokens` with a
  // `line` refinement) `<marker>...\n` line comment — repeats. Matches
  // the v1 inter-span gap when the schema's token-set includes `comment`.
  const lineCheck = lineCommentMarkers.length === 0
    ? ''
    : lineCommentMarkers.map((marker) => {
        const m = JSON.stringify(marker);
        return `  if (input.startsWith(${m}, off)) {
    off += ${marker.length};
    while (off < len && input.charCodeAt(off) !== 0x0a) off++;
    if (off < len) off++;
    continue;
  }`;
      }).join('\n');
  return `while (off < len) {
  const c = input.charCodeAt(off);
  if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
  if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
    off += 2;
    while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
    if (off < len) off += 2;
    continue;
  }
${lineCheck}
  break;
}`;
}
