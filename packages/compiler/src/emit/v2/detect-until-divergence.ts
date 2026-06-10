// Generic detection of the "until-divergence" sibling shape: two productions
// of one node type that are identical except production A's until-scan at
// span i carries ONE extra single-char stop x, and A's next span is a plain
// literal(x). Under the speculation chain, every input that matches B pays a
// full failed parse of A first (A scans the capture, stops where B would,
// then fails the literal(x) check). The merged emitter runs ONE scan with
// A's stop set: stopping at x routes to A's tail, anything else routes
// directly to B's tail with the already-captured value — the common case
// never scans twice.
//
// Domainless: triggered purely by ResolvedSpan structure. Any schema with a
// "value with marked-suffix variant" pair benefits (a css-like
// `!important` declaration pair is one instance of the shape; nothing here
// knows about css).

import type { NodeTypeInfo, ResolvedSpan } from '../../model.ts';
import type { SpanModifier } from '@parser2/parser';
import { spansMatchExactly } from './shared-dispatch.ts';

export interface UntilDivergence {
  /** Index of the diverging until span (shared prefix is 0..scanIdx-1). */
  readonly scanIdx: number;
  /** The single-char stop present only in the long alt's scan. */
  readonly extraStop: string;
  /** Production index (in info.productions) of the long alt (extra stop + literal tail). */
  readonly longAltIdx: number;
  /** Production index of the short alt. */
  readonly shortAltIdx: number;
}

type UntilMod = Extract<SpanModifier, { kind: 'until' }>;

function untilOf(span: ResolvedSpan): UntilMod | null {
  const m = span.modifiers.find((mm) => mm.kind === 'until');
  return (m as UntilMod | undefined) ?? null;
}

/** Spans equal ignoring the until modifier's stop list (everything else,
 *  including the capture name, must match). */
function spansMatchExceptStops(a: ResolvedSpan, b: ResolvedSpan): boolean {
  if (a.name !== b.name) return false;
  const ua = untilOf(a);
  const ub = untilOf(b);
  if (!ua || !ub) return false;
  const strip = (s: ResolvedSpan, u: UntilMod): ResolvedSpan => ({
    ...s,
    modifiers: s.modifiers.map((m) => (m === u ? { ...u, stops: [] } : m)),
  });
  return spansMatchExactly(strip(a, ua), strip(b, ub));
}

export function detectUntilDivergence(info: NodeTypeInfo): UntilDivergence | null {
  if (info.productions.length !== 2) return null;
  const p0 = info.productions[0]!;
  const p1 = info.productions[1]!;

  for (const [long, short, longIdx, shortIdx] of [
    [p0, p1, 0, 1] as const,
    [p1, p0, 1, 0] as const,
  ]) {
    // Shared prefix: structurally identical AND same capture names.
    // spansMatchExactly ignores `name`, but merged emission binds prefix
    // captures once and both alt bodies read them by name, so names must
    // agree at every prefix position.
    let i = 0;
    while (
      i < long.spans.length &&
      i < short.spans.length &&
      spansMatchExactly(long.spans[i]!, short.spans[i]!) &&
      long.spans[i]!.name === short.spans[i]!.name
    ) i++;

    const ls = long.spans[i];
    const ss = short.spans[i];
    if (!ls || !ss) continue;
    if (ls.recursiveRoles.length > 0 || ss.recursiveRoles.length > 0) continue;
    if (!ls.name || !spansMatchExceptStops(ls, ss)) continue;

    const ul = untilOf(ls)!;
    const us = untilOf(ss)!;
    if (ul.requireStop || us.requireStop) continue;
    if (!ul.balanced || !us.balanced) continue;

    const longStops = new Set(ul.stops);
    const shortStops = new Set(us.stops);
    const extra = ul.stops.filter((s) => !shortStops.has(s));
    const missing = us.stops.filter((s) => !longStops.has(s));
    if (missing.length !== 0 || extra.length !== 1) continue;
    const x = extra[0]!;
    if (x.length !== 1) continue;

    // The long alt must continue with a plain literal(x) — no modifiers,
    // no recursion. That literal is what makes "scan stopped at x" a
    // necessary condition for the long alt to succeed.
    const follow = long.spans[i + 1];
    if (!follow) continue;
    if (follow.class !== 'literal' || follow.text !== x) continue;
    if (follow.modifiers.length > 0 || follow.recursiveRoles.length > 0) continue;

    return { scanIdx: i, extraStop: x, longAltIdx: longIdx, shortAltIdx: shortIdx };
  }
  return null;
}
