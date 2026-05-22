import type { SchemaDef } from '@parser2/parser';
import { CompilerError } from '../model.ts';

// Pass 1: walk the schema's `uses:` graph and produce a flat, deduplicated
// list of schemas in dependency order (deepest dependencies first). Cycles
// are reported as errors. Identity is by object reference — schemas have no
// names anymore, so two SchemaDef objects are "the same schema" iff they
// are the same JS reference.

export function resolveCompositionGraph(root: SchemaDef): ReadonlyArray<SchemaDef> {
  const visited = new Set<SchemaDef>();
  const order: SchemaDef[] = [];
  const stack = new Set<SchemaDef>();

  function visit(schema: SchemaDef): void {
    if (stack.has(schema)) {
      throw new CompilerError('Cycle detected in schema composition');
    }
    if (visited.has(schema)) return;
    stack.add(schema);
    for (const used of schema.uses) visit(used);
    stack.delete(schema);
    visited.add(schema);
    order.push(schema);
  }

  visit(root);
  return order;
}
