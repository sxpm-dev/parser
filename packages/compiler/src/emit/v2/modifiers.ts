// Shared span-modifier helpers used by `./span.ts` and `./role-ladder.ts`.
//
// Lives in its own file so `role-ladder.ts` (which imports `SpanContext` from
// `./span.ts` as a type only) doesn't need to duplicate the helpers to avoid
// a circular runtime dependency. Both modules can pull from here without
// either importing the other's runtime exports.

import type { SpanModifier } from '@parser2/parser';
import type { ResolvedSpan } from '../../model.ts';

export function findSpanModifier<K extends SpanModifier['kind']>(
  span: ResolvedSpan,
  kind: K,
): Extract<SpanModifier, { kind: K }> | undefined {
  for (const m of span.modifiers) if (m.kind === kind) return m as Extract<SpanModifier, { kind: K }>;
  return undefined;
}

export function hasSpanModifier(span: ResolvedSpan, kind: SpanModifier['kind']): boolean {
  return findSpanModifier(span, kind) !== undefined;
}
