import { CompilerError, type NodeTypeInfo } from '../model.ts';

// Pass 7: structural checks. Catches the most common authoring mistakes
// before we reach the emitter.
//
//   - Every named span's text must be uniquely findable in the example
//     input from the prior cursor; this guards against ambiguous span
//     placement (the "use distinct identifiers" rule).
//   - Every classed span must have non-empty text (the text in the example
//     drives both inference and the disambiguation check above).

export function validate(nodeTypes: ReadonlyMap<string, NodeTypeInfo>): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      let cursor = 0;
      const input = production.source.input;
      for (const span of production.spans) {
        if (!span.text) {
          // unnamed literal or text-less classed span without anchor — skip
          continue;
        }
        const idx = input.indexOf(span.text, cursor);
        if (idx < 0) {
          throw new CompilerError(
            `In node '${info.name}', span text '${span.text}' not found in input '${input}' from position ${cursor}`,
          );
        }
        // Ambiguity: another occurrence of the same text appears later in
        // the input AND that span is recursive — we cannot tell which
        // occurrence is which without more disambiguation.
        if (span.recursiveRoles.length > 0) {
          const tail = input.indexOf(span.text, idx + 1);
          if (tail >= 0) {
            throw new CompilerError(
              `In node '${info.name}', recursive span text '${span.text}' appears multiple times in input '${input}'; rewrite the example so the substring is unique`,
            );
          }
        }
        cursor = idx + span.text.length;
      }
    }
  }
}
