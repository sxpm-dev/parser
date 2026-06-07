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

  // Walk spans left-to-right. A span position is:
  //   - strict-shared (every alt's span byte-identical to alt 0's) → keep walking
  //   - oneOf-diverged (every alt's span matches alt 0's EXCEPT possibly the
  //     oneOf refinement) → this is the discriminator; stop here
  //   - otherwise → no shared dispatch; bail
  // We want the FIRST oneOf-diverged span as the discriminator, not the
  // longest loose-match run — alts can coincidentally agree on later spans
  // (e.g. all share the same `attrs` slot after the tag) and using the run
  // would land the discriminator past the ident.
  const first = prods[0]!.spans;
  if (first.length === 0) return null;

  let discriminatorIdx = -1;
  for (let i = 0; i < first.length; i++) {
    const strictMatch = prods.every(
      (p) => i < p.spans.length && spansMatchExactly(first[i]!, p.spans[i]!),
    );
    if (strictMatch) continue;
    const looseMatch = prods.every(
      (p) => i < p.spans.length && spansMatchIgnoringOneOf(first[i]!, p.spans[i]!),
    );
    if (looseMatch && first[i]!.class === 'ident') {
      discriminatorIdx = i;
    }
    break;
  }
  if (discriminatorIdx < 1) return null;

  // The leading span MUST be a fixed literal so the dispatcher can emit a
  // single-byte first-byte gate before peeking the discriminator.
  if (first[0]!.class !== 'literal' || !first[0]!.text) return null;

  const prefixLen = discriminatorIdx + 1;
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

/** Spans are byte-identical — used to walk the strict-shared prefix before
 *  the discriminator. Like `spansMatchIgnoringOneOf` but DOES compare the
 *  oneOf refinement (no exception). Exported so the generic prefix-share
 *  detector (prefix-share-dispatch.ts) can reuse the same equality. */
export function spansMatchExactly(a: ResolvedSpan, b: ResolvedSpan): boolean {
  if (a.class !== b.class) return false;
  if (a.class === 'literal' && a.text !== b.text) return false;
  if (!arraysEqual(a.modifiers, b.modifiers, sameJson)) return false;
  if (!arraysEqual(a.recursiveRoles, b.recursiveRoles, (x, y) => x === y)) return false;
  return arraysEqual(a.refinements, b.refinements, sameRefinement);
}

/** Spans match modulo their `oneOf` refinement (used for the discriminator).
 *  All other shape fields — class, refinements, modifiers, recursiveRoles —
 *  must be byte-identical. The `text` field carries different meaning by
 *  class: for `literal` it's the literal text the parser matches and MUST
 *  agree across alts; for capturing classes (ident/number/string/…) it's the
 *  example input from the schema (e.g. `<script>` vs `<br>`) and would
 *  reject otherwise-identical alts that just happen to use different
 *  examples. So only compare `text` when the class makes it semantically
 *  load-bearing. */
function spansMatchIgnoringOneOf(a: ResolvedSpan, b: ResolvedSpan): boolean {
  if (a.class !== b.class) return false;
  if (a.class === 'literal' && a.text !== b.text) return false;
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
 *   3. scan the discriminator ident (capture start/end/value), commit
 *      state.pos to the byte AFTER the tag scan
 *   4. switch on the lowercased tag → call matching alt TAILS with the
 *      captured prefix, falling back to catch-all tails if all fail
 *
 * Alt-tail bodies skip the shared prefix entirely — the dispatcher owns the
 * leading ws-skip, the literal check, the ident scan, the tag-string slice,
 * and the entryOff. Tails are called as:
 *   ${altFn}(state, entryOff, ${discriminator}, ${discriminator}__start, ${discriminator}__end)
 * On failure each tail rewinds `state.pos = entryOff` and returns null, at
 * which point the dispatcher resets `state.pos = __postScan` (the offset
 * right after the tag scan) so the next tail starts from the same place.
 */
export function emitSharedDispatcher(
  fnName: string,
  altFnNames: ReadonlyArray<string>,
  dispatch: SharedDispatch,
  leadingLiteral: string,
  discriminatorSpan: ResolvedSpan,
): string {
  const discriminatorName = discriminatorSpan.name;
  if (!discriminatorName) {
    throw new Error(`emitSharedDispatcher: discriminator span must have a name (got: ${JSON.stringify(discriminatorSpan)})`);
  }

  // Build the per-tail call expression. The parameter order MUST match
  // buildPrefixOption in emit/v2/index.ts: state, entryOff, then for every
  // named span in spans[0..discriminatorIdx]: value, start-offset, end-offset.
  // For the html shape only the discriminator span itself is named, so the
  // call has 5 args total. If a future shape names earlier spans (e.g. a
  // typed punctuator capture), they'd need to be added here in the same
  // order.
  const tailCallArgs = `state, __entryOff, ${discriminatorName}, ${discriminatorName}__start, ${discriminatorName}__end`;

  const grouped = groupCasesByAltList(dispatch.tagToAlts);

  const caseBlocks: string[] = [];
  for (const { tags, alts } of grouped) {
    const caseLabels = tags.map((t) => `    case ${jsStringLiteral(t)}:`).join('\n');
    const probes = alts
      .map((idx) =>
        `      state.pos = __postScan; { const r = ${altFnNames[idx]}(${tailCallArgs}); if (r !== null) return r; }`,
      )
      .join('\n');
    caseBlocks.push(`${caseLabels} {\n${probes}\n      break;\n    }`);
  }

  const catchAllProbes = dispatch.catchAllAlts
    .map((idx) =>
      `  state.pos = __postScan; { const r = ${altFnNames[idx]}(${tailCallArgs}); if (r !== null) return r; }`,
    )
    .join('\n');

  const firstByte = leadingLiteral.charCodeAt(0);
  const leadingLen = leadingLiteral.length;
  const leadingMatchExpr = leadingLen === 1
    ? `input.charCodeAt(off) === ${firstByte}`
    : `input.startsWith(${jsStringLiteral(leadingLiteral)}, off)`;

  const refSet = new Set(discriminatorSpan.refinements.map((r) => r.name));
  const isJs = refSet.has('js');
  const identStart = isJs ? 'isJsIdentStart' : 'isCssIdentStart';
  const identPart = isJs ? 'isJsIdentPart' : 'isCssIdentPart';
  const isCss = refSet.has('css');
  const isHtml = refSet.has('html');
  const extraStartByte = !isJs && !isCss && !isHtml ? ' || input.charCodeAt(off) === 0x5c' : '';

  const wsSkip = `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;

  return `function ${fnName}(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const __entryOff = off;
  ${wsSkip}
  if (off >= len) { state.pos = __entryOff; return null; }
  if (!(${leadingMatchExpr})) { state.pos = __entryOff; return null; }
  off += ${leadingLen};
  ${wsSkip}
  if (off >= len || !(${identStart}(input.charCodeAt(off))${extraStartByte})) { state.pos = __entryOff; return null; }
  const ${discriminatorName}__start = off;
  off++;
  while (off < len && ${identPart}(input.charCodeAt(off))) off++;
  const ${discriminatorName}__end = off;
  const ${discriminatorName} = input.slice(${discriminatorName}__start, ${discriminatorName}__end);
  const __postScan = off;
  const __dispatchTag = ${discriminatorName}.toLowerCase();
  switch (__dispatchTag) {
${caseBlocks.join('\n')}
  }
${catchAllProbes}
  state.pos = __entryOff;
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
