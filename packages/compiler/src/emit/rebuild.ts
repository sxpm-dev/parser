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

// Number of spaces added per indent level. Imported by every leg of the
// stringify pipeline (this file, emit/inverse.ts, interp/stringify.ts) so
// the three paths cannot drift apart.
export const INDENT_STEP_SPACES = 2;

export function emitRebuild(schema: InferredSchema): string {
  const preserve = schema.whitespace === 'preserve';
  const fns: string[] = [];
  for (const info of schema.nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      fns.push(emitOne(info.name, i, info.productions[i]!, preserve));
    }
  }
  return fns.join('\n\n');
}

// Shared between rebuild.ts and interp/stringify.ts — both synthesize the
// same Piece sequence per production. Exported so the interp side imports
// the definition rather than re-declaring it locally.
//
// `SlotJoin` is a discriminated union describing how a slot's captured value
// is joined when it's an array (recursive / `.repeats()` children):
//   - `'none'`   — non-repeats slot; no array join needed.
//   - `'indent'` — `.indent()`-modified `.repeats()`; runtime computes
//     `'\n' + ' '.repeat(__indentCol)` dynamically per level and adds a
//     leading prefix when `__indentCol > 0`.
//   - `'sep'`    — `.repeats({ sep })` or `.repeats()` with a static join
//     string (single space when `sep` was omitted).
// Callers branch on `kind` to choose the static or dynamic emit path.
export type SlotJoin =
  | { readonly kind: 'none' }
  | { readonly kind: 'indent' }
  // Phase 4c v2: when `iwsRef` is set, the slot's array-join interleaves
  // items[i] with captures.<iwsRef>[i-1] (the per-iteration ws array
  // captured at parse time) instead of using the static `sep` literal.
  // The `sep` field stays so a fallback emit path can drop back to the
  // canonical sep if iws is absent at runtime (defense-in-depth).
  | { readonly kind: 'sep'; readonly sep: string; readonly iwsRef?: string };

// Optional encoding hook applied to a slot's captured value before it
// contributes to the source string. Set when the slot's span declares an
// inverse coercion (e.g. `.string().coerce()` → JSON-style re-encode with
// surrounding quotes and escape processing). 'none' is the default: the
// captured value is read as-is and routed through __rebuildSlot.
export type SlotEncode = 'none' | 'jsonString';

export type Piece =
  | { readonly kind: 'literal'; readonly text: string }
  | {
      readonly kind: 'slot';
      readonly ref: string;
      readonly optional: boolean;
      readonly join: SlotJoin;
      readonly encode: SlotEncode;
    }
  // Phase 4b — `whitespace: 'preserve'` AND Layer 3 raws sidecar
  // (2026-06-08-raws-sidecar.md). Emitted between consecutive production
  // spans. At codegen time the inter-span gap is unknown (parse may see
  // arbitrary ws); the slot resolves to `captures.__ws[index]` at
  // runtime when populated. `fallback` is the canonical separator the
  // schema would emit absent any captured trivia — used when:
  //   - the captures payload doesn't carry __ws (fast-mode stringify, or
  //     a hand-built AST without a raws sidecar)
  //   - or the specific index slot is undefined (length mismatch).
  // Preserve schemas always populate __ws (eagerly), so the fallback is
  // exercised on standard schemas only.
  | { readonly kind: 'wsSlot'; readonly index: number; readonly fallback: string }
  // Phase 4c v2 — unnamed optional literal piece for preserve schemas.
  // The parser tracks per-span presence in `__litPres`; rebuild emits
  // the literal only when `captures.__litPres[litIdx]` is truthy.
  | { readonly kind: 'optLit'; readonly text: string; readonly litIdx: number };

function emitOne(nodeName: string, prodIdx: number, production: Production, preserve: boolean): string {
  const pieces = synthesizePieces(production, preserve);
  const hasIndentPiece = pieces.some((p) => p.kind === 'slot' && p.join.kind === 'indent');
  const expr = piecesToConcat(pieces);
  if (hasIndentPiece) {
    return `function ${rebuildFnName(nodeName, prodIdx)}(captures: any, __indentCol: number = 0): string {
  return ${expr};
}`;
  }
  return `function ${rebuildFnName(nodeName, prodIdx)}(captures: any): string {
  return ${expr};
}`;
}

export function synthesizePieces(
  production: Production,
  preserveWs: boolean = false,
): ReadonlyArray<Piece> {
  const input = production.source.input;
  const pieces: Piece[] = [];
  let cursor = 0;
  let gapIdx = 0;
  let spanIdx = -1;
  // Phase 4c v2 — counter for unnamed-optional-literal pieces. Indexes
  // align with the __litPres array pushed by the parser (production.ts
  // increments on the same condition).
  let litIdx = 0;
  for (const span of production.spans) {
    spanIdx++;
    const startOffset = findSpanStart(input, span, cursor);
    if (startOffset === null) {
      // Absent path: the example doesn't surface this span. Both
      // `.optional()` and `.repeats({ min: 0 })` permit zero-length
      // captures; emit a runtime-conditional slot read with empty default
      // so rebuild stays well-defined when the captured value is null.
      //
      // Required-recursive-repeats path: a `.of(roles).repeats({min:>=1})`
      // span (typically `.indent()`-modified) can legitimately carry empty
      // text — the slot is always populated at runtime by recursive child
      // dispatch, and the example text is only ever consulted at compile
      // time for offset bookkeeping. Recognize this shape so schemas don't
      // need to inline a synthetic multi-line example string.
      if (isAbsentAllowed(span) || isRequiredRecursiveRepeats(span)) {
        pieces.push(contributionOf(span));
        continue;
      }
      // Other empty-text span shapes are a schema bug already flagged by
      // validate(). Defensive guard:
      throw new CompilerError(
        `rebuild: span '${span.name ?? span.text ?? '<unnamed>'}' not found in example '${truncate(input)}'`,
      );
    }
    const sepText = input.slice(cursor, startOffset);
    if (spanIdx > 0) {
      // Layer 3 raws sidecar — every inter-span gap becomes a ws-slot
      // with a canonical-sep fallback. Preserve schemas already populate
      // __ws unconditionally so the runtime read always wins; standard
      // schemas populate __ws only in raws mode, so fast-mode stringify
      // falls through to `fallback` (the same canonical separator the
      // old literal-piece emit produced).
      const fallback = preserveWs ? '' : canonicalSeparator(sepText);
      // Only emit the ws-slot when there was either ws in the example
      // (so a canonical separator would have been emitted) OR the schema
      // is preserve (which always emits one regardless of example). This
      // keeps cron-style `*/5` adjacent-span shapes from acquiring a
      // spurious gap fallback that would re-insert whitespace.
      if (preserveWs || sepText.length > 0) {
        pieces.push({ kind: 'wsSlot', index: gapIdx, fallback });
        gapIdx++;
      }
    }
    // Phase 4c v2 — unnamed optional literal becomes an optLit piece
    // that consults `captures.__litPres[litIdx]` at stringify time.
    // Plain (non-preserve) schemas keep the unconditional literal
    // emit since presence isn't tracked there.
    const isUnnamedOptLit =
      preserveWs &&
      span.name === undefined &&
      span.class === 'literal' &&
      typeof span.text === 'string' &&
      span.modifiers.some((m) => m.kind === 'optional');
    if (isUnnamedOptLit) {
      pieces.push({ kind: 'optLit', text: span.text!, litIdx });
      litIdx++;
    } else {
      pieces.push(contributionOf(span, preserveWs));
    }
    if (span.text) cursor = startOffset + span.text.length;
  }
  return pieces;
}

function contributionOf(span: ResolvedSpan, preserveWs: boolean = false): Piece {
  // Treat both .optional() and .repeats({ min: 0 }) as absent-allowed: the
  // captured value may be null and the slot must collapse to "" at runtime.
  const optional = isAbsentAllowed(span);
  const join = joinOf(span, preserveWs);
  if (span.recursiveRoles.length > 0) {
    if (!span.name) throw new CompilerError('rebuild: recursive span without name');
    return { kind: 'slot', ref: span.name, optional, join, encode: encodeOf(span) };
  }
  const isUntil = span.modifiers.some((m) => m.kind === 'until' || m.kind === 'rawUntil');
  if (isUntil) {
    if (!span.name) throw new CompilerError('rebuild: until-span without name');
    return { kind: 'slot', ref: span.name, optional, join, encode: encodeOf(span) };
  }
  if (span.class !== 'literal') {
    if (!span.name) {
      throw new CompilerError(`rebuild: classed span without name (class '${span.class}')`);
    }
    return { kind: 'slot', ref: span.name, optional, join, encode: encodeOf(span) };
  }
  if (span.name) return { kind: 'slot', ref: span.name, optional, join, encode: encodeOf(span) };
  if (!span.text) throw new CompilerError('rebuild: unnamed literal span without text');
  return { kind: 'literal', text: span.text };
}

// Determine whether a slot's captured value needs an inverse encoder when
// reconstructing source. Today: `.string().coerce()` → JSON-style re-encode.
// Default: 'none' (slot value passes through __rebuildSlot unchanged).
export function encodeOf(span: ResolvedSpan): SlotEncode {
  if (span.class === 'string' && span.refinements.some((r) => r.name === 'coerce')) {
    return 'jsonString';
  }
  return 'none';
}

// Fix 3: determine the runtime join shape for a span captured as an array.
// `.indent()`-modified `.repeats()` returns 'indent' — callers emit a
// dynamic per-level join (`'\n' + ' '.repeat(__indentCol)`) and a leading
// prefix when `__indentCol > 0`. `.repeats({ sep })` returns 'sep' with the
// declared separator (parser consumed it between children, so rebuild must
// re-introduce it). `.repeats()` without `sep` defaults to single-space
// (schema-level whitespace policy). Non-repeats spans return 'none' — they
// never reach the array-join code path at runtime.
export function joinOf(span: ResolvedSpan, preserveWs: boolean = false): SlotJoin {
  const hasIndent = span.modifiers.some((m) => m.kind === 'indent');
  for (const m of span.modifiers) {
    if (m.kind === 'repeats') {
      if (hasIndent) return { kind: 'indent' };
      // Phase 4c v5 + Layer 3 raws sidecar: when the span is named
      // (anonymous spans have no captures slot to attach iws to), the
      // captures payload may carry `<spanName>_iws` — for both sep-
      // bearing AND sep-less repeats. Tag the join with iwsRef so
      // piecesToConcat emits an inline interleave via __rebuildSlotIws
      // — it falls back to the static sep when captures.<name>_iws is
      // missing (hand-built AST or fast-mode standard schema), so this
      // is safe to emit for all schemas. `preserveWs` no longer gates it.
      void preserveWs;
      const staticSep = m.sep === undefined ? ' ' : m.sep;
      if (span.name !== undefined) {
        return { kind: 'sep', sep: staticSep, iwsRef: `${span.name}_iws` };
      }
      return { kind: 'sep', sep: staticSep };
    }
  }
  return { kind: 'none' };
}

export function piecesToConcat(pieces: ReadonlyArray<Piece>): string {
  if (pieces.length === 0) return '""';
  const parts: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]!;
    if (p.kind === 'literal') {
      parts.push(jsString(p.text));
      continue;
    }
    if (p.kind === 'wsSlot') {
      // Read the captured inter-span ws from captures.__ws[index]. Fall
      // back to the schema's canonical separator when the captures payload
      // didn't populate __ws (fast-mode stringify of a standard schema,
      // hand-built AST, non-preserve parent merging in a preserve child).
      // Preserve schemas always populate __ws so they take the captured
      // path; standard schemas in raws mode take it too (the AST builder
      // copies value.raws.__ws into captures.__ws); fast-mode standard
      // stringify hits the fallback and the output matches the pre-Layer-3
      // canonical shape byte-for-byte.
      const fallback = jsString(p.fallback);
      parts.push(
        `(captures.__ws && captures.__ws[${p.index}] !== undefined ? captures.__ws[${p.index}] : ${fallback})`,
      );
      continue;
    }
    if (p.kind === 'optLit') {
      // Conditionally emit the literal based on the parser-tracked
      // presence bit. Defensive fallback: when __litPres is missing
      // (hand-built AST), default to PRESENT so byte-exact round-trip
      // is preferred over silent omission of authored literals.
      parts.push(
        `(captures.__litPres && captures.__litPres[${p.litIdx}] === false ? "" : ${jsString(p.text)})`,
      );
      continue;
    }
    // Apply the slot's inverse encoder (e.g. encodeJsonString for
    // `.string().coerce()`) BEFORE routing through __rebuildSlot. This
    // wraps the raw captured value so its source-string form is the
    // re-encoded version (with quotes and escape sequences for strings).
    const rawSlotAccess = `captures${memberAccess(p.ref)}`;
    const slotAccess = p.encode === 'jsonString'
      ? `(typeof ${rawSlotAccess} === "string" ? encodeJsonString(${rawSlotAccess}) : ${rawSlotAccess})`
      : rawSlotAccess;
    // Indent-modified slots use a dynamic join separator and, when
    // __indentCol > 0, a leading prefix before the first child so the
    // whole block appears on a new indented line. The `__indentCol`
    // parameter is only emitted by `emitOne` when the production has at
    // least one indent-modified slot (see `hasIndentPiece` check above).
    let slotExpr: string;
    if (p.join.kind === 'indent') {
      // Dynamic join: '\n' + ' '.repeat(__indentCol)
      // Dynamic leading prefix: __indentCol > 0 → also prefix the first child
      slotExpr = `__rebuildSlot(${slotAccess}, "\\n" + " ".repeat(__indentCol), __indentCol > 0)`;
    } else if (p.join.kind === 'sep') {
      if (p.join.iwsRef) {
        // Phase 4c v2: preserve mode + .repeats({sep}) — interleave
        // items[i] with captures.<iwsRef>[i-1] (the per-iteration ws
        // array captured at parse time). Fall back to the static sep
        // when iws is missing (hand-built AST, length mismatch).
        const iws = `captures${memberAccess(p.join.iwsRef)}`;
        slotExpr = `__rebuildSlotIws(${slotAccess}, ${iws}, ${jsString(p.join.sep)})`;
      } else {
        slotExpr = `__rebuildSlot(${slotAccess}${p.join.sep ? `, ${jsString(p.join.sep)}` : ''})`;
      }
    } else {
      slotExpr = `__rebuildSlot(${slotAccess})`;
    }
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
      // Optional-slot fusion. Two flavours, since the preceding piece may
      // be either a static literal separator (pre-Layer 3 behaviour) or
      // a Layer-3 wsSlot (captured ws OR canonical-sep fallback).
      //
      //   prev = literal — same as before: when slot is absent, drop
      //     both the literal and the slot. (verb-subject test: 'hi'
      //     must stringify as 'hi', not 'hi ').
      //
      //   prev = wsSlot — runtime-conditional. When `captures.__ws[i]`
      //     is defined the parser actually captured a slice of input
      //     there, and the user expects that text back regardless of
      //     whether the optional span is present (preserve-schema test:
      //     'a b' with absent ',' between, must round-trip as 'a b'
      //     not 'ab'). When `captures.__ws[i]` is undefined the wsSlot
      //     would fall back to a canonical separator — and an orphan
      //     canonical sep should be dropped when the slot is absent
      //     (same shape as the literal-fusion case).
      const isFusableLit =
        prevPiece && prevPiece.kind === 'literal' && parts.length > 0;
      const isFusableWs =
        prevPiece && prevPiece.kind === 'wsSlot' && parts.length > 0;
      if (isFusableLit) {
        const sepLiteral = parts.pop()!;
        parts.push(`(${slotAccess} == null ? "" : ${sepLiteral} + ${slotExpr})`);
      } else if (isFusableWs) {
        // Replace the last-pushed wsSlot expr with a fusion that picks
        // the right branch at runtime. The captured-ws read is duplicated
        // (once in each branch) so the slot-present branch keeps its
        // canonical fallback while the slot-absent branch falls back to
        // empty rather than the canonical sep.
        const wsP = prevPiece as { index: number; fallback: string };
        parts.pop();
        const captured = `captures.__ws[${wsP.index}]`;
        const hasCap = `captures.__ws && ${captured} !== undefined`;
        const sepWhenAbsent = `(${hasCap} ? ${captured} : "")`;
        const sepWhenPresent = `(${hasCap} ? ${captured} : ${jsString(wsP.fallback)})`;
        parts.push(`(${slotAccess} == null ? ${sepWhenAbsent} : ${sepWhenPresent} + ${slotExpr})`);
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

export function isAbsentAllowed(span: ResolvedSpan): boolean {
  for (const m of span.modifiers) {
    if (m.kind === 'optional') return true;
    if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
  }
  return false;
}

// True when the span captures one-or-more recursive children — e.g.
// `.of(roles).repeats({min: 1+})`, with or without `.indent()`. Parsing
// dispatches by role lookahead so the span's example text is never
// consumed literally, and rebuild reads the children from the captures
// dict — neither phase needs the text. Exposed (alongside isAbsentAllowed)
// as a relaxation target for synthesizePieces so schemas can elide the
// synthetic multi-line text that yaml-block historically inlined.
export function isRequiredRecursiveRepeats(span: ResolvedSpan): boolean {
  if (span.recursiveRoles.length === 0) return false;
  for (const m of span.modifiers) {
    if (m.kind === 'repeats' && m.min !== undefined && m.min >= 1) return true;
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
//
// `leadingPrefix`: when true AND the value is a non-empty array, prepend
// `joinSep` before the first element. Indent-modified slots set this when
// `__indentCol > 0` so nested blocks start on a new indented line.
export const REBUILD_SLOT_RUNTIME = `function __rebuildSlot(v: any, joinSep: string = "", leadingPrefix: boolean = false): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    const prefix = leadingPrefix && v.length > 0 ? joinSep : "";
    let out = prefix;
    for (let i = 0; i < v.length; i++) {
      if (i > 0 && joinSep.length > 0) out += joinSep;
      out += __rebuildSlot(v[i]);
    }
    return out;
  }
  return String(v);
}

// Phase 4c v2: preserve-mode array join. Interleaves items[i] with
// iws[i-1] (per-iteration ws captured at parse time). Falls back to
// the static fallbackSep when iws is null/short — defensive against
// hand-built ASTs that don't carry the iws array.
function __rebuildSlotIws(v: any, iws: any, fallbackSep: string): string {
  if (v === null || v === undefined) return "";
  if (!Array.isArray(v)) return String(v);
  let out = "";
  const hasIws = Array.isArray(iws);
  for (let i = 0; i < v.length; i++) {
    if (i > 0) {
      const gap = hasIws && typeof iws[i - 1] === "string" ? iws[i - 1] : fallbackSep;
      out += gap;
    }
    out += __rebuildSlot(v[i]);
  }
  return out;
}`;

export function rebuildFnName(nodeName: string, prodIdx: number): string {
  return `__rebuild_${jsIdent(nodeName)}_${prodIdx}`;
}

function jsIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}
