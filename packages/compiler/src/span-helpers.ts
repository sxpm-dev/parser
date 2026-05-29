// Span/production lookup + modifier-inspection helpers used by both the
// code-emitting backends (emit/) and the reference interpreter (interp/).
// Extracted here so the four parallel renderers — emit/render.ts (TS
// captures-path), emit/v2/fusion.ts (TS fused-path), interp/render.ts
// (reference forward), interp/stringify.ts (reference inverse) — cannot
// drift on the small but invariant questions "is this span absent-allowed?"
// and "what separator joins its repeated children?".
//
// Bytecode encoder (emit/bytecode/encoder.ts) intentionally keeps its own
// narrower `isOptionalLocal` because the fusion shape there relies on the
// repeats-min branch being handled separately — see the comment there.

import type { Production, ResolvedSpan } from './model.ts';

export function findSpanByName(
  production: Production,
  name: string,
): ResolvedSpan | undefined {
  for (const span of production.spans) {
    if (span.name === name) return span;
  }
  return undefined;
}

// A span is "absent-allowed" when its capture may legitimately be
// null/undefined at render time — either via .optional() or
// .repeats({min:0}).
export function isAbsentAllowedSpan(span: ResolvedSpan): boolean {
  for (const m of span.modifiers) {
    if (m.kind === 'optional') return true;
    if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
  }
  return false;
}

// Discriminated descriptor for `.repeats(...)` spans. The 'indent' variant
// signals that the caller must compose a dynamic per-level join
// (`'\n' + ' '.repeat(__indentCol)`) plus a leading prefix when nested.
// The 'sep' variant carries the static inter-child separator string
// declared by `.repeats({sep})` (default: single space).
export type RepeatsDescriptor =
  | { readonly kind: 'indent' }
  | { readonly kind: 'sep'; readonly sep: string };

// Full descriptor: returns the indent variant for indent-modified repeats
// spans. Used by emit/render.ts (the captures-path TS emitter) whose
// generated code emits a dynamic indent join. Returns null when the span
// doesn't repeat.
export function repeatsJoinDescriptor(span: ResolvedSpan): RepeatsDescriptor | null {
  const hasIndent = span.modifiers.some((m) => m.kind === 'indent');
  for (const m of span.modifiers) {
    if (m.kind === 'repeats') {
      if (hasIndent) return { kind: 'indent' };
      return { kind: 'sep', sep: m.sep === undefined ? ' ' : m.sep };
    }
  }
  return null;
}

// Simpler form: returns just the inter-child separator string declared by
// `.repeats(...)`, ignoring indent. Returns null when the span doesn't
// repeat. Used by emit/v2/fusion.ts and interp/render.ts — both of which
// would need the indent branch to fully match emit/render.ts (tracked as
// Phase 7 follow-up #1; not closed here because this module is a
// behavior-preserving extraction). Callers reading this signature should
// treat indent-modified repeats spans as a documented blind spot until
// that follow-up lands.
export function repeatsJoinSeparator(span: ResolvedSpan): string | null {
  for (const m of span.modifiers) {
    if (m.kind === 'repeats') {
      return m.sep === undefined ? ' ' : m.sep;
    }
  }
  return null;
}
