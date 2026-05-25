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

import type { InferredSchema, Production } from '../../model.ts';
import { emitCapturesExpr, type CapturesBindings } from '../captures.ts';
import { productionRoutingKey } from '../render.ts';
import { indent } from '../strings.ts';
import { emitSpan, type SpanBindings, type SpanContext } from './span.ts';

export type EmitProductionOptions = {
  readonly fnName: string;
  readonly prodIdx: number;
};

export function emitProduction(
  _nodeName: string,
  production: Production,
  _schema: InferredSchema,
  opts: EmitProductionOptions,
): string {
  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
  };
  const ctx: SpanContext = { entryOffVar: 'entryOff', raws: false /* per-call-site */ };

  const lines: string[] = [];
  lines.push(`const input = state.input;`);
  lines.push(`const len = state.len;`);
  lines.push(`let off = state.pos;`);
  lines.push(`const entryOff = off;`);
  // Skip leading ws — required by 'standard' whitespace policy. Always emit;
  // a refined emit could omit when the schema declares no-ws policy.
  lines.push(skipWsBlock());

  const spans = production.spans;
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    if (i > 0) lines.push(skipWsBlock());
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
