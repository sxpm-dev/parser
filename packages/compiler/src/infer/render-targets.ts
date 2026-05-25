import { isStructureRef, isTemplate, type RenderBody, type Template } from '@parser2/parser';
import {
  CompilerError,
  type NodeTypeInfo,
  type RenderTargetIR,
} from '../model.ts';

// Pass: walk each production's source example, collect its .render(target, body)
// entries into a Map<target, RenderTargetIR> on the production. Validates
// per-target uniqueness within a production and (for template bodies) checks
// that every slot reference resolves to a declared span. Mutates the
// production object in place — same pattern other infer passes use.
//
// Per-target completeness across a node type (every production declares the
// same set of targets) is enforced separately so the error message can list
// the missing targets per production.

export function attachRenderTargets(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      const spanNames = new Set<string>();
      for (const span of production.spans) {
        if (span.name) spanNames.add(span.name);
      }
      const renders = new Map<string, RenderTargetIR>();
      for (const entry of production.source.renders) {
        if (renders.has(entry.target)) {
          throw new CompilerError(
            `In node '${info.name}' (example '${truncate(production.source.input)}'): duplicate render target '${entry.target}'`,
          );
        }
        validateBody(entry.body, spanNames, info.name, production.source.input);
        if (entry.inverse) {
          validateTemplateSlots(entry.inverse, spanNames, info.name, production.source.input);
        }
        const ir: RenderTargetIR = entry.inverse
          ? { target: entry.target, body: entry.body, inverse: entry.inverse }
          : { target: entry.target, body: entry.body };
        renders.set(entry.target, ir);
      }
      (production as { renders: ReadonlyMap<string, RenderTargetIR> }).renders = renders;
    }
  }
  enforcePerTargetCompleteness(nodeTypes);
}

function enforcePerTargetCompleteness(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): void {
  for (const info of nodeTypes.values()) {
    if (info.productions.length === 0) continue;
    // The union of declared targets across all productions of this node type.
    // Every production must cover the full set.
    const allTargets = new Set<string>();
    for (const production of info.productions) {
      for (const target of production.renders.keys()) allTargets.add(target);
    }
    if (allTargets.size === 0) continue;
    for (const production of info.productions) {
      const missing: string[] = [];
      for (const target of allTargets) {
        if (!production.renders.has(target)) missing.push(target);
      }
      if (missing.length > 0) {
        throw new CompilerError(
          `In node '${info.name}' (example '${truncate(production.source.input)}'): missing render target(s) ${missing
            .sort()
            .map((t) => `'${t}'`)
            .join(', ')} — every production of a node type must declare the same set of targets`,
        );
      }
    }
  }
}

function validateBody(
  body: RenderBody,
  spanNames: ReadonlySet<string>,
  nodeName: string,
  input: string,
): void {
  if (body === null) return;
  const t = typeof body;
  if (t === 'string' || t === 'number' || t === 'boolean') return;
  if (isStructureRef(body)) {
    if (body.__ref === 'span-value' && !spanNames.has(body.name)) {
      throw new CompilerError(unknownSlotMessage(nodeName, input, body.name, spanNames));
    }
    return;
  }
  if (isTemplate(body)) {
    validateTemplateSlots(body, spanNames, nodeName, input);
    return;
  }
  if (Array.isArray(body)) {
    for (const child of body) validateBody(child, spanNames, nodeName, input);
    return;
  }
  for (const child of Object.values(body as Record<string, RenderBody>)) {
    validateBody(child, spanNames, nodeName, input);
  }
}

function validateTemplateSlots(
  template: Template,
  spanNames: ReadonlySet<string>,
  nodeName: string,
  input: string,
): void {
  for (const slot of template.slots) {
    if (!spanNames.has(slot.ref)) {
      throw new CompilerError(unknownSlotMessage(nodeName, input, slot.ref, spanNames));
    }
  }
}

function unknownSlotMessage(
  nodeName: string,
  input: string,
  ref: string,
  spanNames: ReadonlySet<string>,
): string {
  return `In node '${nodeName}' (example '${truncate(input)}'): slot $.${ref} references unknown span (declared spans: ${[...spanNames].sort().join(', ') || '<none>'})`;
}

function truncate(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}
