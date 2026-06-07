import { CompilerError, type NodeTypeInfo, type ResolvedSpan } from '../model.ts';

// Pass 7: structural checks. Catches the most common authoring mistakes
// before we reach the emitter.
//
//   - Every named span's text must be uniquely findable in the example
//     input from the prior cursor; this guards against ambiguous span
//     placement (the "use distinct identifiers" rule).
//   - Every classed span must have non-empty text (the text in the example
//     drives both inference and the disambiguation check above).
//   - .repeats({ sep: '' }) — the separator must be a non-empty literal;
//     the interpreter loops forever otherwise (interp/parse.ts repeats
//     sep-sweep advances pos by sep.length, which is zero, so the outer
//     loop never makes progress). Reject at codegen so neither the interp
//     nor the v2 emit hot path can ever hit it.
//   - Empty-text spans must be either absent-allowed (.optional() or
//     .repeats({min:0})) OR required-recursive-repeats (.of(roles).repeats
//     ({min:>=1})). Both shapes have a runtime substitute for the missing
//     example anchor — the former collapses to "", the latter is always
//     populated by recursive child dispatch. Any other empty-text shape
//     can't be anchored at parse time. This used to surface from emit/
//     rebuild.ts's synthesizePieces, but Task #18's source-target
//     template-driven rebuild skips that walk for template bodies, so the
//     check needs to live at the schema-validation layer to stay
//     unconditional.

function isAbsentAllowed(span: ResolvedSpan): boolean {
  for (const m of span.modifiers) {
    if (m.kind === 'optional') return true;
    if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
  }
  return false;
}

function isRequiredRecursiveRepeats(span: ResolvedSpan): boolean {
  if (span.recursiveRoles.length === 0) return false;
  for (const m of span.modifiers) {
    if (m.kind === 'repeats' && m.min !== undefined && m.min >= 1) return true;
  }
  return false;
}

export function validate(nodeTypes: ReadonlyMap<string, NodeTypeInfo>): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      let cursor = 0;
      const input = production.source.input;
      for (const span of production.spans) {
        for (const mod of span.modifiers) {
          if (mod.kind === 'repeats' && mod.sep === '') {
            const where = span.name ? `span '${span.name}'` : 'unnamed span';
            throw new CompilerError(
              `In node '${info.name}', ${where} has .repeats({ sep: '' }); the separator must be a non-empty literal. Empty sep would hang the parser in an infinite zero-advance loop.`,
            );
          }
        }
        if (!span.text) {
          // Empty-text spans are legal only when the runtime has an
          // alternative anchor: absent-allowed (collapses to "") or
          // required-recursive-repeats (children always populate the
          // slot). Every other empty-text span is a schema bug — there
          // is no way for the parse-time scanner to find where it
          // starts. Reject up front so codegen / interp / rebuild paths
          // can all assume non-empty text means "this span is anchored
          // somewhere in the example."
          if (!isAbsentAllowed(span) && !isRequiredRecursiveRepeats(span)) {
            const where = span.name ? `span '${span.name}'` : 'unnamed span';
            throw new CompilerError(
              `In node '${info.name}', ${where} has empty text but is neither absent-allowed (.optional() / .repeats({min:0})) nor required-recursive-repeats (.of(roles).repeats({min:>=1})); cannot be anchored in example '${input}'`,
            );
          }
          // unnamed literal or text-less classed span without anchor — skip
          continue;
        }
        const optional = span.modifiers.some((m) => m.kind === 'optional');
        const idx = input.indexOf(span.text, cursor);
        if (idx < 0) {
          if (optional) {
            // Optional span whose text isn't in this example demonstrates
            // the "absent" path. Skip without advancing the cursor.
            continue;
          }
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
