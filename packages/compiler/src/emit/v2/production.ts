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
import { emitCapturesExpr, type CapturesBindings } from '../captures.ts';
import { productionRoutingKey } from '../render.ts';
import { indent } from '../strings.ts';
import { computeKnownLeadingBytes, emitSpan, hasModifier, type SpanBindings, type SpanContext } from './span.ts';

export type EmitProductionOptions = {
  readonly fnName: string;
  readonly prodIdx: number;
};

export function emitProduction(
  _nodeName: string,
  production: Production,
  schema: InferredSchema,
  opts: EmitProductionOptions,
): string {
  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
  };
  // Derive scan-kernel feature flags from the schema's declared token classes
  // and ident refinement. These teach .until() captures how to handle strings
  // / comments / CSS url() as opaque units.
  const tokenClasses = new Set<string>();
  let cssIdent = false;
  for (const usage of schema.classes) {
    tokenClasses.add(usage.class);
    if (usage.class === 'ident' && usage.refinements.some((r) => r.name === 'css')) {
      cssIdent = true;
    }
  }
  // The unknownChars guard is only emitted when the schema BOTH declares
  // 'reject' AND has at least one "content" class — ident, keyword, number,
  // hex, string, regex, template, or operator. A comment-only or
  // whitespace-only class set doesn't constrain what content bytes can appear
  // at depth 0 inside a .until() body, so the guard would fire on legitimate
  // content (letters, digits, etc.) and is suppressed in that case. Schemas
  // without any class declarations produce a similarly trivial knownBytes set.
  const CONTENT_CLASSES = new Set(['ident', 'keyword', 'number', 'hex', 'string', 'regex', 'template', 'operator']);
  const hasContentClass = schema.classes.some((cls) => CONTENT_CLASSES.has(cls.class));
  const emitUnknownCharsGuard = schema.unknownChars === 'reject' && hasContentClass;
  const ctx: SpanContext = {
    entryOffVar: 'entryOff',
    raws: false /* per-call-site */,
    tokens: tokenClasses,
    cssIdent,
    nodeTypes: schema.nodeTypes,
    emitUnknownCharsGuard,
    knownBytes: computeKnownLeadingBytes(schema),
  };

  const lines: string[] = [];
  lines.push(`const input = state.input;`);
  lines.push(`const len = state.len;`);
  lines.push(`let off = state.pos;`);
  lines.push(`const entryOff = off;`);
  // Skip leading ws — required by 'standard' whitespace policy. The leading
  // skip is ALWAYS ws-only (never comment-aware). Otherwise productions whose
  // first span captures a /* … */ comment would consume the comment they're
  // meant to capture. v1 emits the same shape.
  lines.push(skipWsBlock());

  const spans = production.spans;
  for (let i = 0; i < spans.length; i++) {
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
        ? skipWsAndCommentsBlock()
        : skipWsBlock();
      lines.push(interSpanSkip);
    }
    lines.push(emitSpan(span, ctx, bindings));
  }
  // No trailing ws skip — a production owns its captured range. WS after
  // belongs to the parent (which handles inter-sibling ws).

  lines.push(`state.pos = off;`);
  lines.push(`if (off > state.maxOff) state.maxOff = off;`);

  // Build the captures payload. Same shape emitted whether the runtime is
  // running in fast or raws mode — raws-only synthetic refs (gap, raw,
  // commentLeft/Right inside the ast body's `raws:` subfield) are filtered
  // here in fast mode via `omitRaws`. In raws mode we additionally attach
  // a `source` field used by the AST builder.
  const prodKey = productionRoutingKey(production, opts.prodIdx);
  const fastCaptures = emitCapturesExpr(production, prodKey, toCapturesBindings(bindings), { omitRaws: true });
  const rawsCaptures = emitCapturesExpr(production, prodKey, toCapturesBindings(bindings), {});
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

  return `function ${opts.fnName}(state: State): unknown {
${indent(lines.filter((l) => l !== '').join('\n'), 1)}
}`;
}

function toCapturesBindings(b: SpanBindings): CapturesBindings {
  return {
    valueExpr: b.valueExpr,
    startOffExpr: b.startOffExpr,
    endOffExpr: b.endOffExpr,
  };
}

function skipWsBlock(): string {
  return `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;
}

// True iff this span is meant to capture `/* */` comments as data. Covers:
//   1. a class-`comment` span on the span itself (e.g. .span('text', '/* x */').comment())
//   2. a recursive span (repeats / non-repeats) whose roles include any
//      production whose first non-empty span is a comment-class span.
// Used by the inter-span gap to decide whether to skip comments before this
// span. v1 mirrors the same idea by not emitting a comment-skip before a
// repeats body when one of its roles is a Comment-producing production.
function spanConsumesComments(span: ResolvedSpan, schema: InferredSchema): boolean {
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

function skipWsAndCommentsBlock(): string {
  // ws OR `/* ... */` comment — repeats. Matches the v1 inter-span gap when
  // the schema's token-set includes `comment`.
  return `while (off < len) {
  const c = input.charCodeAt(off);
  if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
  if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
    off += 2;
    while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
    if (off < len) off += 2;
    continue;
  }
  break;
}`;
}
