import type { WhitespacePolicy } from '@parser2/parser';
import {
  CompilerError,
  type NodeTypeInfo,
  type Production,
  type ResolvedSpan,
  type StringifyTemplate,
} from '../model.ts';

// Pass: walk each production's span list and synthesize the 'source' template.
// Generic algorithm — no per-language knowledge.
//
// Per span:
//   - Unnamed literal span: contributes its `text` to the trailing static part.
//   - Named literal span: contributes a capture slot bound to the span name
//     (render-time slot value equals the literal text).
//   - Classed span (ident/number/string/...): contributes a capture slot.
//   - Recursive span (single role or multi-role): contributes a capture slot;
//     render-time interpolation recurses with the same target.
//   - .repeats(...) span: contributes a capture slot; render-time
//     interpolation maps over the captured list and joins with the empty
//     string (each child carries its own separators).
//   - .until() / .rawUntil() span: contributes a capture slot; render-time
//     interpolation emits the captured raw slice as-is.
//
// Between adjacent spans, the canonical 'standard' whitespace policy emits a
// single space when the example input had any whitespace there, and nothing
// otherwise. 'preserve' is declared but not yet wired through codegen (see
// packages/compiler/README.md); treat as 'standard' until that lands.

export function attachSourceTemplates(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
  whitespace: WhitespacePolicy,
): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      const synthesized = synthesize(production, whitespace);
      const current = production.stringifyTemplates;
      (production as { stringifyTemplates: ReadonlyArray<StringifyTemplate> }).stringifyTemplates = [
        synthesized,
        ...current,
      ];
    }
  }
}

type Piece =
  | { readonly kind: 'literal'; readonly text: string }
  | { readonly kind: 'slot'; readonly ref: string; readonly optional: boolean };

function synthesize(production: Production, whitespace: WhitespacePolicy): StringifyTemplate {
  const input = production.source.input;
  const pieces: Piece[] = [];
  let cursor = 0;

  for (const span of production.spans) {
    const startOffset = findSpanStart(input, span, cursor);
    // For optional-absent spans (text not found in this example), emit
    // neither separator nor slot — at render time the captured value would
    // be null and the slot helper already returns "".
    if (startOffset === null) {
      const isOptional = span.modifiers.some((m) => m.kind === 'optional');
      if (isOptional) continue;
    }
    const sepText = startOffset === null ? '' : input.slice(cursor, startOffset);
    if (sepText.length > 0) {
      pieces.push({ kind: 'literal', text: canonicalSeparator(sepText, whitespace) });
    }
    pieces.push(contributionOf(span));
    if (startOffset !== null && span.text) cursor = startOffset + span.text.length;
  }

  return foldIntoTemplate(pieces);
}

function contributionOf(span: ResolvedSpan): Piece {
  const optional = span.modifiers.some((m) => m.kind === 'optional');
  if (span.recursiveRoles.length > 0) {
    if (!span.name) throw new CompilerError('source-template: recursive span without name');
    return { kind: 'slot', ref: span.name, optional };
  }
  const isUntil = span.modifiers.some((m) => m.kind === 'until' || m.kind === 'rawUntil');
  if (isUntil) {
    if (!span.name) throw new CompilerError('source-template: until-span without name');
    return { kind: 'slot', ref: span.name, optional };
  }
  if (span.class !== 'literal') {
    if (!span.name) {
      throw new CompilerError(
        `source-template: classed span without name (class '${span.class}')`,
      );
    }
    return { kind: 'slot', ref: span.name, optional };
  }
  if (span.name) return { kind: 'slot', ref: span.name, optional };
  if (!span.text) throw new CompilerError('source-template: unnamed literal span without text');
  return { kind: 'literal', text: span.text };
}

function canonicalSeparator(_separator: string, whitespace: WhitespacePolicy): string {
  // Any whitespace -> single ' '. 'preserve' falls back to the same behavior
  // until the policy is wired through codegen.
  void whitespace;
  return ' ';
}

function findSpanStart(input: string, span: ResolvedSpan, cursor: number): number | null {
  if (!span.text) return null;
  const idx = input.indexOf(span.text, cursor);
  return idx < 0 ? null : idx;
}

function foldIntoTemplate(pieces: ReadonlyArray<Piece>): StringifyTemplate {
  const parts: string[] = [''];
  const slots: { kind: 'capture'; ref: string; optional?: boolean }[] = [];
  for (const p of pieces) {
    if (p.kind === 'literal') {
      parts[parts.length - 1] += p.text;
    } else {
      const slot: { kind: 'capture'; ref: string; optional?: boolean } = { kind: 'capture', ref: p.ref };
      if (p.optional) slot.optional = true;
      slots.push(slot);
      parts.push('');
    }
  }
  return { target: 'source', parts, slots };
}
