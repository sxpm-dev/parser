import type { SchemaDef } from '@parser2/parser';
import { CompilerError } from '../model.ts';

// Pass 1: walk the schema's `uses:` graph and produce a flat, deduplicated
// list of schemas in dependency order (deepest dependencies first). Cycles
// are reported as errors.

export function resolveCompositionGraph(root: SchemaDef): ReadonlyArray<SchemaDef> {
  const visited = new Map<string, SchemaDef>();
  const order: SchemaDef[] = [];
  const stack = new Set<string>();

  function visit(schema: SchemaDef): void {
    if (stack.has(schema.name)) {
      throw new CompilerError(`Cycle detected in schema composition at '${schema.name}'`);
    }
    if (visited.has(schema.name)) {
      if (visited.get(schema.name) !== schema) {
        throw new CompilerError(
          `Two distinct schemas share the name '${schema.name}'; schema names must be unique`,
        );
      }
      return;
    }
    stack.add(schema.name);
    for (const used of schema.uses) visit(used);
    stack.delete(schema.name);
    visited.set(schema.name, schema);
    order.push(schema);
  }

  visit(root);
  return order;
}
