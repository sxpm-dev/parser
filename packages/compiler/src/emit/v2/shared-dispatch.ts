// When a relation's alts share a literal prefix and split on a `.oneOf(...)`
// over a single captured `ident` span, we can emit a dispatcher that peeks at
// the ident's bytes once and `switch`es to call only the alts whose oneOf
// would plausibly match. Today every alt is probed serially and each re-scans
// + slices + lowercases the same ident — the bigger N is, the more wasted
// substring allocations.
//
// This module is split into:
//   - detectSharedDispatch: returns a SharedDispatch description when the
//     shape is matched, or null when it isn't.
//   - emitSharedDispatcher: emits the dispatcher body when detection succeeds.

import type { Refinement } from '@parser2/parser';
import type { NodeTypeInfo, ResolvedSpan } from '../../model.ts';

export interface SharedDispatch {
  /** Number of spans at the start of every alt that are byte-identical
   *  (modulo the oneOf set on the discriminator). Always >= 2. */
  readonly prefixLen: number;
  /** Index into spans[] where the discriminator (ident span with oneOf on
   *  at least one alt) lives. Always equal to prefixLen - 1. */
  readonly discriminatorIdx: number;
  /** Map from lowercased oneOf value to the list of alt indices whose
   *  oneOf contains it, preserved in declaration order. */
  readonly tagToAlts: ReadonlyMap<string, ReadonlyArray<number>>;
  /** Alt indices whose discriminator span has NO oneOf — i.e. they accept
   *  any ident at the discriminator position. Tried after tag-bucket alts. */
  readonly catchAllAlts: ReadonlyArray<number>;
}

export function detectSharedDispatch(info: NodeTypeInfo): SharedDispatch | null {
  const prods = info.productions;
  if (prods.length < 2) return null;

  // Phase 1: walk spans left-to-right while every alt's span at index i is
  // identical to alt 0's span at the same index — with the ONE exception
  // that the `oneOf` refinement on the last shared span is allowed to differ.
  // (That difference is precisely the dispatch signal we're after.)
  const first = prods[0]!.spans;
  if (first.length === 0) return null;

  let prefixLen = 0;
  for (let i = 0; i < first.length; i++) {
    const ok = prods.every(
      (p) => i < p.spans.length && spansMatchIgnoringOneOf(first[i]!, p.spans[i]!),
    );
    if (!ok) break;
    prefixLen = i + 1;
  }
  if (prefixLen < 2) return null;

  // Phase 2: validate the discriminator span.
  // The leading span(s) must include a literal prefix (so the dispatcher
  // can emit a fixed first-byte gate), and the discriminator itself must
  // be an `ident` span. At least one alt must carry a oneOf there.
  const discriminatorIdx = prefixLen - 1;
  if (first[discriminatorIdx]!.class !== 'ident') return null;
  if (first[0]!.class !== 'literal' || !first[0]!.text) return null;

  const tagToAlts = new Map<string, number[]>();
  const catchAllAlts: number[] = [];
  let anyOneOf = false;
  for (let altIdx = 0; altIdx < prods.length; altIdx++) {
    const span = prods[altIdx]!.spans[discriminatorIdx]!;
    const oneOf = findOneOfValues(span.refinements);
    if (oneOf === null) {
      catchAllAlts.push(altIdx);
      continue;
    }
    anyOneOf = true;
    for (const raw of oneOf) {
      const key = raw.toLowerCase();
      const bucket = tagToAlts.get(key);
      if (bucket) bucket.push(altIdx);
      else tagToAlts.set(key, [altIdx]);
    }
  }
  if (!anyOneOf) return null;

  return { prefixLen, discriminatorIdx, tagToAlts, catchAllAlts };
}

// --- helpers ---------------------------------------------------------------

/** Spans match modulo their `oneOf` refinement (used for the discriminator).
 *  All other fields — class, text, refinements, modifiers, recursiveRoles
 *  — must be byte-identical. */
function spansMatchIgnoringOneOf(a: ResolvedSpan, b: ResolvedSpan): boolean {
  if (a.class !== b.class) return false;
  if (a.text !== b.text) return false;
  if (!arraysEqual(a.modifiers, b.modifiers, sameJson)) return false;
  if (!arraysEqual(a.recursiveRoles, b.recursiveRoles, (x, y) => x === y)) return false;
  const ar = a.refinements.filter((r) => r.name !== 'oneOf');
  const br = b.refinements.filter((r) => r.name !== 'oneOf');
  return arraysEqual(ar, br, sameRefinement);
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function sameRefinement(a: Refinement, b: Refinement): boolean {
  return a.name === b.name && JSON.stringify(a.args) === JSON.stringify(b.args);
}

function arraysEqual<T>(a: ReadonlyArray<T>, b: ReadonlyArray<T>, eq: (x: T, y: T) => boolean): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (!eq(a[i]!, b[i]!)) return false;
  return true;
}

function findOneOfValues(refinements: ReadonlyArray<Refinement>): ReadonlyArray<string> | null {
  for (const r of refinements) {
    if (r.name !== 'oneOf') continue;
    const args = r.args;
    if (!Array.isArray(args) || args.length !== 1) continue;
    const list = args[0];
    if (!Array.isArray(list)) continue;
    if (list.every((v) => typeof v === 'string')) return list as ReadonlyArray<string>;
  }
  return null;
}

// --- Emit ------------------------------------------------------------------

/**
 * Emit the dispatcher function source when the relation matches the shared-
 * dispatch shape. Returns the full `function ${fnName}(state: State): unknown
 * { ... }` body (caller does not wrap).
 *
 * Shape:
 *   1. ws-skip
 *   2. first-byte gate on the leading literal (e.g. `<`)
 *   3. peek the discriminator ident (start/end via __peekOff — no state.pos
 *      commit), lowercased
 *   4. switch on the peeked tag → call matching alts in declaration order
 *   5. fall through to catch-all alts in declaration order
 *
 * Each alt call is the existing `${fnName}__altN(state)`; alt bodies are
 * unchanged. They still do their own prologue (re-scan the tag, re-check the
 * literal) and rewind state.pos on failure. We just stop probing alts whose
 * `oneOf` couldn't match.
 *
 * The dispatcher does NOT commit state.pos past the leading-literal check:
 * the peek lives in __peekOff. That way alts start from exactly the same
 * state.pos they would have under the old serial probe — no contract change.
 */
export function emitSharedDispatcher(
  fnName: string,
  altFnNames: ReadonlyArray<string>,
  dispatch: SharedDispatch,
  leadingLiteral: string,
  discriminatorSpan: ResolvedSpan,
): string {
  // Multiple oneOf values can route to the same alt list (e.g. the void-
  // element pattern, where every void tag tries alt1 then alt2). Group by
  // alt-list so the emitted JS has one `case 'a': case 'b': { body }` per
  // shared list, keeping the output compact and deterministic.
  const grouped = groupCasesByAltList(dispatch.tagToAlts);

  const caseBlocks: string[] = [];
  for (const { tags, alts } of grouped) {
    const caseLabels = tags.map((t) => `    case ${jsStringLiteral(t)}:`).join('\n');
    const probes = alts
      .map((idx) => `      { const r = ${altFnNames[idx]}(state); if (r !== null) return r; }`)
      .join('\n');
    caseBlocks.push(`${caseLabels} {\n${probes}\n      break;\n    }`);
  }

  const catchAllProbes = dispatch.catchAllAlts
    .map((idx) => `  { const r = ${altFnNames[idx]}(state); if (r !== null) return r; }`)
    .join('\n');

  const firstByte = leadingLiteral.charCodeAt(0);
  const leadingLen = leadingLiteral.length;
  const leadingMatchExpr = leadingLen === 1
    ? `input.charCodeAt(off) === ${firstByte}`
    : `input.startsWith(${jsStringLiteral(leadingLiteral)}, off)`;

  // The peek scan mirrors classScanCode's ident form for the same refinements
  // as the discriminator span. Stays byte-identical with how alt bodies scan
  // the same ident so a value that would parse one way in an alt never gets
  // dispatched to a different bucket.
  const refSet = new Set(discriminatorSpan.refinements.map((r) => r.name));
  const isJs = refSet.has('js');
  const identStart = isJs ? 'isJsIdentStart' : 'isCssIdentStart';
  const identPart = isJs ? 'isJsIdentPart' : 'isCssIdentPart';
  // Non-css/non-html ident also admits backslash-escape starts (matches
  // classScanCode); html/css discriminator does not.
  const isCss = refSet.has('css');
  const isHtml = refSet.has('html');
  const extraStartByte = !isJs && !isCss && !isHtml ? ' || input.charCodeAt(__peekOff) === 0x5c' : '';

  const wsSkip = `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;
  const wsSkipPeek = `while (__peekOff < len) { const c = input.charCodeAt(__peekOff); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { __peekOff++; continue; } break; }`;

  return `function ${fnName}(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  ${wsSkip}
  state.pos = off;
  if (off >= len) return null;
  if (!(${leadingMatchExpr})) return null;
  let __peekOff = off + ${leadingLen};
  ${wsSkipPeek}
  if (__peekOff >= len || !(${identStart}(input.charCodeAt(__peekOff))${extraStartByte})) {
${catchAllProbes}
    return null;
  }
  const __tagStart = __peekOff;
  __peekOff++;
  while (__peekOff < len && ${identPart}(input.charCodeAt(__peekOff))) __peekOff++;
  const __dispatchTag = input.slice(__tagStart, __peekOff).toLowerCase();
  switch (__dispatchTag) {
${caseBlocks.join('\n')}
  }
${catchAllProbes}
  return null;
}`;
}

interface CaseGroup {
  /** Tags that share the same alt-probe list. */
  tags: string[];
  alts: ReadonlyArray<number>;
}

function groupCasesByAltList(tagToAlts: ReadonlyMap<string, ReadonlyArray<number>>): CaseGroup[] {
  // Stable Map insertion order so the emitted JS stays deterministic across
  // runs of the same schema.
  const byKey = new Map<string, CaseGroup>();
  for (const [tag, alts] of tagToAlts) {
    const key = alts.join(',');
    let group = byKey.get(key);
    if (!group) {
      group = { tags: [], alts };
      byKey.set(key, group);
    }
    group.tags.push(tag);
  }
  return [...byKey.values()];
}

function jsStringLiteral(s: string): string {
  return JSON.stringify(s);
}
