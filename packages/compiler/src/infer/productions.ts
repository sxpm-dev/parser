import type { ExampleDef, SchemaDef } from '@parser2/parser';
import { isStructureRef, isTemplate } from '@parser2/parser';
import {
  CompilerError,
  type NodeTypeInfo,
  type Production,
  type ResolvedSpan,
  type RenderTargetIR,
} from '../model.ts';

// Pass 2 + 3: walk every example, group by .as(NodeType) (or infer from the
// 'ast' render body's `type` field), build a Production per example with
// spans carried through as-is. Recursive role names are kept verbatim —
// pass 3 (resolveRoles) validates them.

export function buildProductions(
  schemas: ReadonlyArray<SchemaDef>,
): ReadonlyMap<string, NodeTypeInfo> {
  const productionsByNodeType = new Map<string, Production[]>();

  for (const schema of schemas) {
    for (const example of schema.examples) {
      if (example.status.kind === 'rejected') continue;
      const nodeType = inferNodeType(example);
      const production: Production = {
        nodeType,
        source: example,
        spans: example.spans.map(toResolvedSpan),
        // attachRenderTargets fills this in. Start empty so the Production
        // shape is always well-formed even if the example declared no .render.
        renders: new Map<string, RenderTargetIR>(),
        recovery: example.status.kind === 'recovered' ? example.status.recovery : undefined,
      };
      const list = productionsByNodeType.get(nodeType) ?? [];
      list.push(production);
      productionsByNodeType.set(nodeType, list);
    }
  }

  const out = new Map<string, NodeTypeInfo>();
  for (const [name, productions] of productionsByNodeType) {
    out.set(name, { name, productions });
  }
  return out;
}

function inferNodeType(example: ExampleDef): string {
  if (example.nodeType) return example.nodeType;
  // Fallback: if the example declares an 'ast' render whose body is a
  // structured object (not a Template, not a $ref, not an array) with a
  // string-valued `type` field, use that as the node type.
  const astEntry = example.renders.find((r) => r.target === 'ast');
  const body = astEntry?.body;
  if (
    body !== undefined
    && body !== null
    && typeof body === 'object'
    && !Array.isArray(body)
    && !isTemplate(body)
    && !isStructureRef(body)
  ) {
    const type = (body as { type?: unknown }).type;
    if (typeof type === 'string') return type;
  }
  throw new CompilerError(
    `Example '${truncate(example.input)}' has no .as(NodeType) and no inferable type from .render('ast', ...) body`,
  );
}

function toResolvedSpan(spanDef: ResolvedSpan): ResolvedSpan {
  // Pass 2 emits identity-resolved spans; pass 3 (resolveRoles) checks role
  // references against the node-type set.
  return {
    name: spanDef.name,
    text: spanDef.text,
    class: spanDef.class,
    refinements: spanDef.refinements,
    modifiers: spanDef.modifiers,
    recursiveRoles: spanDef.recursiveRoles ?? [],
  };
}

function truncate(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}
