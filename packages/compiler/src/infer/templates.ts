import { CompilerError, type NodeTypeInfo, type StringifyTemplate } from '../model.ts';

// Pass: walk each production's source example, decompose its
// .stringify(target, template) entries into { target, parts, slots }, validate
// against spans, attach onto Production.stringifyTemplates. Mutates the
// production object in place (productions are constructed mutably in
// productions.ts; we cast away readonly here, same pattern other passes use).

const RESERVED_TARGETS = new Set(['source']);

export function attachAuthorTemplates(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      const seen = new Set<string>();
      const collected: StringifyTemplate[] = [];
      const spanNames = new Set<string>();
      for (const span of production.spans) {
        if (span.name) spanNames.add(span.name);
      }
      for (const entry of production.source.stringifyTemplates) {
        if (RESERVED_TARGETS.has(entry.target)) {
          throw new CompilerError(
            `In node '${info.name}' (example '${truncate(production.source.input)}'): reserved target name '${entry.target}' cannot be used with .stringify(...) — it is auto-derived`,
          );
        }
        if (seen.has(entry.target)) {
          throw new CompilerError(
            `In node '${info.name}' (example '${truncate(production.source.input)}'): duplicate stringify target '${entry.target}'`,
          );
        }
        seen.add(entry.target);
        for (const slot of entry.template.slots) {
          if (!spanNames.has(slot.ref)) {
            throw new CompilerError(
              `In node '${info.name}' (example '${truncate(production.source.input)}'): slot $.${slot.ref} references unknown span (declared spans: ${[...spanNames].sort().join(', ') || '<none>'})`,
            );
          }
        }
        collected.push({
          target: entry.target,
          parts: [...entry.template.parts],
          slots: entry.template.slots.map((s) => ({ kind: 'capture', ref: s.ref })),
        });
      }
      (production as { stringifyTemplates: ReadonlyArray<StringifyTemplate> }).stringifyTemplates = collected;
    }
  }
}

function truncate(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}
