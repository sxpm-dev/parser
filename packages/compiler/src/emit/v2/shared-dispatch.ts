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
