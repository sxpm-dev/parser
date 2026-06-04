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
