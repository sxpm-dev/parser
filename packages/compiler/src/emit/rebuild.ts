// Shared, target-independent source-reconstruction subroutine. One function
// per production: `__rebuild_<NodeType>_<idx>(captures)` returns the
// canonical source string for that production given a populated captures
// object. Every per-target inverse dispatcher hands its recovered captures
// here.
//
// Algorithm (ported from the deleted infer/source-template.ts):
//
//   For each span in declaration order:
//     - Unnamed literal span        → contribute its `text` literal.
//     - Named literal span          → captures.<name> (its runtime value is
//                                     the literal text anyway, but reading
//                                     the capture preserves any author-
//                                     supplied value carried through).
//     - Classed span                → captures.<name>.
//     - Recursive span              → captures.<name>; runtime value is
//                                     already a rebuilt string because the
//                                     inverse dispatcher recurses through
//                                     `__rebuildSlot(value)` before reaching
//                                     this point.
//     - .repeats(...) span          → captures.<name>; runtime value is an
//                                     array of rebuilt children, joined with
//                                     the empty string (children carry their
//                                     own separators).
//     - .until() / .rawUntil() span → captures.<name>.
//
//   Optional spans whose text is absent in the example example contribute
//   nothing at compile time AND emit a runtime guard: if the captured value
//   is `null`/`undefined`, the slot and its surrounding separator are
//   suppressed. (Matches the legacy source-template behaviour for optional
//   absent spans.)
//
//   Between adjacent spans: if the example input had whitespace between the
//   prior cursor and the current span's start offset, emit a single space
//   literal; otherwise nothing. `'preserve'` whitespace falls back to the
//   same behaviour until policy lands in codegen.

import {
  CompilerError,
  type InferredSchema,
  type Production,
  type ResolvedSpan,
} from '../model.ts';
import { jsString } from './strings.ts';

export function emitRebuild(schema: InferredSchema): string {
  const fns: string[] = [];
  for (const info of schema.nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      fns.push(emitOne(info.name, i, info.productions[i]!));
    }
  }
  return fns.join('\n\n');
}

type Piece =
  | { readonly kind: 'literal'; readonly text: string }
  | {
      readonly kind: 'slot';
      readonly ref: string;
      readonly optional: boolean;
      // Join separator for repeated children captured as an array. Empty
      // string when `.repeats({ sep })` is declared (children carry their
      // own separator suffix); single space when `.repeats()` without `sep`
      // (whitespace-separated at parse time). Non-repeating slots carry an
      // empty join separator — the field is unused but type-stable.
      readonly joinSep: string;
    };

function emitOne(nodeName: string, prodIdx: number, production: Production): string {
  const pieces = synthesizePieces(production);
  const expr = piecesToConcat(pieces);
  return `function ${rebuildFnName(nodeName, prodIdx)}(captures: any): string {
  return ${expr};
}`;
}

function synthesizePieces(production: Production): ReadonlyArray<Piece> {
  const input = production.source.input;
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const span of production.spans) {
    const startOffset = findSpanStart(input, span, cursor);
    if (startOffset === null) {
      // Absent path: the example doesn't surface this span. Both
      // `.optional()` and `.repeats({ min: 0 })` permit zero-length
      // captures; emit a runtime-conditional slot read with empty default
      // so rebuild stays well-defined when the captured value is null.
      if (isAbsentAllowed(span)) {
        pieces.push(contributionOf(span));
        continue;
      }
      // Non-absent-allowed span whose text is not present in the example is
      // a schema bug already flagged by validate(). Defensive guard:
      throw new CompilerError(
        `rebuild: span '${span.name ?? span.text ?? '<unnamed>'}' not found in example '${truncate(input)}'`,
      );
    }
    const sepText = input.slice(cursor, startOffset);
    if (sepText.length > 0) {
      pieces.push({ kind: 'literal', text: canonicalSeparator(sepText) });
    }
    pieces.push(contributionOf(span));
    if (span.text) cursor = startOffset + span.text.length;
  }
  return pieces;
}

function contributionOf(span: ResolvedSpan): Piece {
  // Treat both .optional() and .repeats({ min: 0 }) as absent-allowed: the
  // captured value may be null and the slot must collapse to "" at runtime.
  const optional = isAbsentAllowed(span);
  const joinSep = joinSeparatorOf(span);
  if (span.recursiveRoles.length > 0) {
    if (!span.name) throw new CompilerError('rebuild: recursive span without name');
    return { kind: 'slot', ref: span.name, optional, joinSep };
  }
  const isUntil = span.modifiers.some((m) => m.kind === 'until' || m.kind === 'rawUntil');
  if (isUntil) {
    if (!span.name) throw new CompilerError('rebuild: until-span without name');
    return { kind: 'slot', ref: span.name, optional, joinSep };
  }
  if (span.class !== 'literal') {
    if (!span.name) {
      throw new CompilerError(`rebuild: classed span without name (class '${span.class}')`);
    }
    return { kind: 'slot', ref: span.name, optional, joinSep };
  }
  if (span.name) return { kind: 'slot', ref: span.name, optional, joinSep };
  if (!span.text) throw new CompilerError('rebuild: unnamed literal span without text');
  return { kind: 'literal', text: span.text };
}

// Fix 3: determine the runtime join separator for a span captured as an
// array. `.repeats({ sep })` declares an explicit inter-child separator
// consumed by the parser between children — each child's rebuilt source
// only carries its own content, so rebuild must re-introduce the declared
// separator at join time. `.repeats()` without `sep` relies on the
// schema-level whitespace policy (typically a single space) between
// children — rebuild joins with " ". Spans that don't repeat get "" too
// (unused; arrays only land here for repeats and recursive captures, the
// latter joined via __rebuildSlot's nested recursion).
// indent-modified repeats: join with '\n' (column-0 MVP — Task 7.7 will
// introduce per-level padding when nested blocks at deeper columns land).
function joinSeparatorOf(span: ResolvedSpan): string {
  const hasIndent = span.modifiers.some((m) => m.kind === 'indent');
  for (const m of span.modifiers) {
    if (m.kind === 'repeats') {
      if (hasIndent) return '\n';
      return m.sep === undefined ? ' ' : m.sep;
    }
  }
  return '';
}

function piecesToConcat(pieces: ReadonlyArray<Piece>): string {
  if (pieces.length === 0) return '""';
  const parts: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]!;
    if (p.kind === 'literal') {
      parts.push(jsString(p.text));
      continue;
    }
    const slotAccess = `captures${memberAccess(p.ref)}`;
    const slotExpr = `__rebuildSlot(${slotAccess}${p.joinSep ? `, ${jsString(p.joinSep)}` : ''})`;
    if (p.optional) {
      // Fuse the slot with its preceding literal separator (Fix 2 — ports
      // the foldIntoTemplate optional-slot behaviour from the deleted
      // infer/source-template.ts). When the captured value is null/undefined
      // we suppress BOTH the slot and the separator; otherwise we emit
      // `<sep> + <slotExpr>` (or, when the captured value is recursive,
      // route through __rebuildSlot for proper coercion).
      // Look back for an immediately-preceding literal piece in the input
      // stream (pieces[i-1]) AND make sure we haven't already consumed it
      // (parts has the same prefix as pieces — easy to check by length).
      const prevPiece = i > 0 ? pieces[i - 1] : undefined;
      if (prevPiece && prevPiece.kind === 'literal' && parts.length > 0) {
        // Drop the just-pushed literal from `parts` and fuse it into the
        // conditional. Use the slot value (not the rebuilt slot) for the
        // null test — recursive children may rebuild to "" but still be
        // present, and we should keep the separator in that case.
        const sepLiteral = parts.pop()!;
        parts.push(`(${slotAccess} == null ? "" : ${sepLiteral} + ${slotExpr})`);
      } else {
        // No preceding literal to fuse — emit a plain slot read with
        // null-coalesce so we don't stringify null/undefined as "null".
        parts.push(`(${slotAccess} == null ? "" : ${slotExpr})`);
      }
      continue;
    }
    parts.push(slotExpr);
  }
  if (parts.length === 1) return parts[0]!.startsWith('"') ? parts[0]! : `String(${parts[0]})`;
  return parts.join(' + ');
}

function isAbsentAllowed(span: ResolvedSpan): boolean {
  for (const m of span.modifiers) {
    if (m.kind === 'optional') return true;
    if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
  }
  return false;
}

function findSpanStart(input: string, span: ResolvedSpan, cursor: number): number | null {
  if (!span.text) return null;
  const idx = input.indexOf(span.text, cursor);
  return idx < 0 ? null : idx;
}

function canonicalSeparator(_separator: string): string {
  // Any inter-span whitespace collapses to a single space. Matches the
  // legacy source-template behaviour. The whitespace policy is read at the
  // schema level; for now both 'standard' and 'preserve' use this rule.
  return ' ';
}

function memberAccess(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `.${key}`;
  return `[${jsString(key)}]`;
}

function truncate(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}

// Helper used by every rebuild fn to coerce a captures value to a string.
// Captures referencing recursive children land here already as
// fully-rebuilt strings (the inverse dispatcher recurses before rebuild
// runs). Arrays of children are joined with `joinSep` (Fix 3): an empty
// string when the span uses `.repeats({ sep })` (children carry their own
// separator suffix) or a single space when `.repeats()` declares no `sep`
// (whitespace-separated at parse time). Primitives stringify naturally.
// null/undefined → "".
export const REBUILD_SLOT_RUNTIME = `function __rebuildSlot(v: any, joinSep: string = ""): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) {
      if (i > 0 && joinSep.length > 0) out += joinSep;
      out += __rebuildSlot(v[i]);
    }
    return out;
  }
  return String(v);
}`;

export function rebuildFnName(nodeName: string, prodIdx: number): string {
  return `__rebuild_${jsIdent(nodeName)}_${prodIdx}`;
}

function jsIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}
