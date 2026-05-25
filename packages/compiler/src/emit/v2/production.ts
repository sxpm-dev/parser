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
//     return <struct expression>;
//   }
//
// Failure paths inside the body do `state.pos = entryOff; return null;` and
// update state.maxOff so the top-level error reports the deepest position.

import type { RenderBody } from '@parser2/parser';
import type { InferredSchema, Production } from '../../model.ts';
import { jsString, indent } from '../strings.ts';
import { collectOffsetRefs, emitStructureExpr, type StructureBindings } from '../structure.ts';
import { emitSpan, hasModifier, findModifier, type SpanBindings, type SpanContext } from './span.ts';

// Local bridge — Phase 3 deletes when v2 emit moves to per-target builders.
function structureOf(production: Production): RenderBody {
  return production.renders.get('ast')?.body ?? null;
}

export type EmitProductionOptions = {
  readonly fnName: string;
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

  // Build the struct. Fast and raws variants differ only by extra slice/source
  // fields baked into the same literal. We emit a single object expression
  // that uses the structure declaration. Raws extras like $.gap(from, to)
  // are pre-bound via bindings.startOff/endOff.
  //
  // For the first slice of v2 we only emit the FAST literal (raws is handled
  // by branching on state.mode at the return). The struct expression already
  // honors $.gap via the emitStructureExpr helper which reads our bindings.
  //
  // Approach for mode branching: emit both literals; conditionally return.
  // Use the structure.ts helper for both.
  const fastStructure = emitStructureExpr(structureOf(production), toStructureBindings(bindings), { omitRaws: true });
  const rawsStructure = emitStructureExpr(structureOf(production), toStructureBindings(bindings), {});

  const sourceField = `source: makeSource(state, entryOff, off)`;

  // If the structure has no raws fields, fast and raws are the same shape
  // except for the optional `source` field added in raws.
  const sameShape = fastStructure === rawsStructure;
  let returnBlock: string;
  if (sameShape) {
    returnBlock = `if (state.mode === 'raws') {
  const __struct: any = ${rawsStructure};
  if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
  return __struct;
}
return ${fastStructure};`;
  } else {
    returnBlock = `if (state.mode === 'raws') {
  const __struct: any = ${rawsStructure};
  if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
  return __struct;
}
return ${fastStructure};`;
  }
  lines.push(returnBlock);

  return `function ${opts.fnName}(state: State): unknown {
${indent(lines.filter((l) => l !== '').join('\n'), 1)}
}`;
}

function toStructureBindings(b: SpanBindings): StructureBindings {
  return {
    valueExpr: b.valueExpr,
    presenceExpr: b.presenceExpr,
    startOffExpr: b.startOffExpr,
    endOffExpr: b.endOffExpr,
  };
}

function skipWsBlock(): string {
  return `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;
}
