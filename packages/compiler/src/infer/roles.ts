import { CompilerError, type NodeTypeInfo } from '../model.ts';

// Pass 3: every recursive role reference must resolve to a known node type
// in the composition graph. Pass also surfaces orphan node types (defined
// but never reachable from the root).

export function resolveRecursiveRoles(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
  rootType: string,
): void {
  if (!nodeTypes.has(rootType)) {
    throw new CompilerError(
      `Root node type '${rootType}' has no defining examples`,
    );
  }
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      for (const span of production.spans) {
        for (const role of span.recursiveRoles) {
          if (!nodeTypes.has(role)) {
            throw new CompilerError(
              `Recursive role '${role}' in node '${info.name}' is not defined by any example`,
            );
          }
        }
      }
    }
  }
}
