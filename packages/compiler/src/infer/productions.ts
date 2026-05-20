import type { ExampleDef, SchemaDef, StructureValue } from '@parser2/parser';
import { isStructureRef } from '@parser2/parser';
import {
  CompilerError,
  type NodeTypeInfo,
  type Production,
  type ResolvedSpan,
} from '../model.ts';

// Pass 2 + 3: walk every example, group by .as(NodeType) (or infer from
// structure.type), build a Production per example with spans carried through
// as-is. Recursive role names are kept verbatim — pass 3 (resolveRoles)
// validates them.

export function buildProductions(
  schemas: ReadonlyArray<SchemaDef>,
): ReadonlyMap<string, NodeTypeInfo> {
  const productionsByNodeType = new Map<string, Production[]>();

  for (const schema of schemas) {
    for (const example of schema.examples) {
      if (example.status.kind === 'rejected') continue;
      if (example.structure === undefined && example.status.kind === 'valid') {
        throw new CompilerError(
          `Example '${truncate(example.input)}' has no .structure(...) literal`,
        );
      }
      const nodeType = inferNodeType(example);
      const production: Production = {
        nodeType,
        source: example,
        spans: example.spans.map(toResolvedSpan),
        structure: example.structure as StructureValue,
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
  if (example.structure && typeof example.structure === 'object' && !Array.isArray(example.structure) && !isStructureRef(example.structure)) {
    const type = (example.structure as { type?: unknown }).type;
    if (typeof type === 'string') return type;
  }
  throw new CompilerError(
    `Example '${truncate(example.input)}' has no .as(NodeType) and no inferable type from structure`,
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
