// Structured-fused render emission — the AST/JSON/IR analog of the existing
// Template-fused source emission in ./fusion.ts. When a (production, target)
// pair has an object-literal body whose leaves are statically resolvable
// ($-refs into the production's spans, plus literals), we can emit one
// function that parses AND constructs the target object inline — no
// {__production, ...} captures object, no __dispatchRender_X walk.
//
// Eligibility (canFuseStructured): every leaf in the body is either a
// literal (string/number/boolean/null), a nested object/array of static
// leaves, or a $.ref to a span name on the production. Top-level body must
// be an object literal (so the produced value is unambiguously structured).
// Templates inside structured bodies are deferred — first cut treats them
// as fusion-ineligible; they go to the captures path.
//
// This module is split into:
//   - canFuseStructured: returns true when (production, target) is a
//     candidate, false otherwise.
//   - emitFusedRenderStructured: emits the structured-fused fn source (added
//     in a follow-up task).

import { isStructureRef, isTemplate } from '@parser2/parser';
import type { RenderBody } from '@parser2/parser';
import type { InferredSchema, Production } from '../../model.ts';
import { indent, jsIdent, jsString } from '../strings.ts';
import { computeKnownLeadingBytes, emitSpan, type SpanBindings, type SpanContext } from './span.ts';

export function canFuseStructured(
  production: Production,
  schema: InferredSchema,
  target: string,
): boolean {
  void schema; // reserved for future recursive-role eligibility checks
  const entry = production.renders.get(target);
  if (!entry) return false;
  const body = entry.body;
  // First-cut: require a top-level object literal so the produced value is
  // unambiguously structured. Top-level Templates are the existing string
  // fusion's domain; top-level scalars/refs/arrays are deferred.
  if (body === null || typeof body !== 'object') return false;
  if (isStructureRef(body)) return false;
  if (isTemplate(body)) return false;
  if (Array.isArray(body)) return false;
  const spanNames = new Set<string>();
  for (const span of production.spans) if (span.name) spanNames.add(span.name);
  return bodyIsStaticOrResolved(body, spanNames);
}

export type StructuredFusedOptions = {
  readonly nodeName: string;
  readonly prodIdx: number;
  readonly target: string;
};

/**
 * Emit a structured-fused render function or null when ineligible. The
 * function's signature is `(state: State) => unknown` — returns the
 * constructed target object on success, `null` on failure (with state.pos
 * rewound to the entry offset, mirroring the captures-path parse fn
 * contract).
 *
 * First-cut limitation: any recursive span on the production disqualifies
 * the production. Task 3 lifts that — until then those productions stay on
 * the captures path.
 */
export function emitFusedRenderStructured(
  production: Production,
  schema: InferredSchema,
  opts: StructuredFusedOptions,
): string | null {
  if (!canFuseStructured(production, schema, opts.target)) return null;
  for (const span of production.spans) {
    if (span.recursiveRoles.length > 0) return null;
  }
  const entry = production.renders.get(opts.target)!;

  const ctx = buildSpanContext(schema);
  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
  };

  const lines: string[] = [];
  lines.push(`const input = state.input;`);
  lines.push(`const len = state.len;`);
  lines.push(`let off = state.pos;`);
  lines.push(`const entryOff = off;`);
  lines.push(skipWsBlock());
  for (let i = 0; i < production.spans.length; i++) {
    const span = production.spans[i]!;
    if (i > 0) lines.push(skipWsBlock());
    lines.push(emitSpan(span, ctx, bindings));
  }
  lines.push(`state.pos = off;`);
  lines.push(`if (off > state.maxOff) state.maxOff = off;`);
  lines.push(`return ${emitStructuredBody(entry.body, bindings)};`);

  const fnName = `__fusedRenderStructured_${jsIdent(opts.nodeName)}_${opts.prodIdx}_${jsIdent(opts.target)}`;
  return `function ${fnName}(state: State): unknown {
${indent(lines.filter((l) => l !== '').join('\n'), 1)}
}`;
}

// --- internal helpers ------------------------------------------------------

function buildSpanContext(schema: InferredSchema): SpanContext {
  const tokenClasses = new Set<string>();
  let cssIdent = false;
  for (const usage of schema.classes) {
    tokenClasses.add(usage.class);
    if (usage.class === 'ident' && usage.refinements.some((r) => r.name === 'css')) cssIdent = true;
  }
  const contentClasses = new Set<string>([
    'ident', 'keyword', 'number', 'hex', 'string', 'regex', 'template', 'operator',
  ]);
  const hasContentClass = schema.classes.some((c) => contentClasses.has(c.class));
  const emitUnknownCharsGuard = schema.unknownChars === 'reject' && hasContentClass;
  return {
    entryOffVar: 'entryOff',
    raws: false,
    tokens: tokenClasses,
    cssIdent,
    nodeTypes: schema.nodeTypes,
    emitUnknownCharsGuard,
    knownBytes: computeKnownLeadingBytes(schema),
    symbolPrefix: schema.symbolPrefix,
  };
}

function emitStructuredBody(body: RenderBody, bindings: SpanBindings): string {
  if (body === null) return 'null';
  if (typeof body === 'string') return jsString(body);
  if (typeof body === 'number') return Number.isFinite(body) ? String(body) : 'null';
  if (typeof body === 'boolean') return body ? 'true' : 'false';
  if (isTemplate(body)) {
    // canFuseStructured rejects embedded Templates; we shouldn't get here.
    throw new Error('emitStructuredBody: embedded Template should have been rejected by canFuseStructured');
  }
  if (isStructureRef(body)) {
    const ref = body as { readonly name: string };
    const expr = bindings.valueExpr.get(ref.name);
    if (!expr) {
      // Same — eligibility guards against this. Defensive throw so codegen
      // bugs fail loud rather than silently emit `undefined`.
      throw new Error(`emitStructuredBody: span ref "${ref.name}" has no binding`);
    }
    return expr;
  }
  if (Array.isArray(body)) {
    return `[${body.map((c) => emitStructuredBody(c, bindings)).join(', ')}]`;
  }
  const entries = Object.entries(body as Record<string, RenderBody>)
    .map(([k, v]) => `${jsObjectKey(k)}: ${emitStructuredBody(v, bindings)}`);
  return `{ ${entries.join(', ')} }`;
}

function jsObjectKey(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return key;
  return jsString(key);
}

function skipWsBlock(): string {
  return `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;
}

function bodyIsStaticOrResolved(body: RenderBody, spanNames: ReadonlySet<string>): boolean {
  if (body === null) return true;
  if (typeof body === 'string' || typeof body === 'number' || typeof body === 'boolean') return true;
  // Embedded Templates (e.g. `name: tpl\`${$.a}-${$.b}\``) are deferred for
  // the first cut — those fields would need their own emission logic and
  // pull in slot semantics. Caller falls back to captures path.
  if (isTemplate(body)) return false;
  if (isStructureRef(body)) {
    const ref = body as { readonly name?: string };
    return typeof ref.name === 'string' && spanNames.has(ref.name);
  }
  if (Array.isArray(body)) {
    for (const child of body) if (!bodyIsStaticOrResolved(child, spanNames)) return false;
    return true;
  }
  for (const value of Object.values(body as Record<string, RenderBody>)) {
    if (!bodyIsStaticOrResolved(value, spanNames)) return false;
  }
  return true;
}
