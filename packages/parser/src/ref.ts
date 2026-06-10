import type {
  SpanCommentLeftRef,
  SpanCommentRightRef,
  SpanEndsWithRef,
  SpanGapRef,
  SpanPresenceRef,
  SpanRawRef,
  SpanTailRef,
  SpanValueRef,
  StructureRef,
} from './types.ts';

// Reference proxy for use inside `.render(target, body)` bodies (and inside
// `tpl` template literals). See individual ref types in types.ts for what
// each one compiles to. Reserved method names are listed in
// RESERVED_METHODS — accessing those returns the helper function instead of
// constructing a SpanValueRef.

const RESERVED_METHODS = new Set([
  'gap', 'tail', 'raw', 'endsWith', 'commentLeft', 'commentRight',
]);

const handler: ProxyHandler<Record<string, never>> = {
  get(_target, prop) {
    if (typeof prop !== 'string') return undefined;
    if (prop === 'gap') {
      return (from: string, to: string): SpanGapRef => ({ __ref: 'span-gap', from, to });
    }
    if (prop === 'tail') {
      return (from: string): SpanTailRef => ({ __ref: 'span-tail', from });
    }
    if (prop === 'raw') {
      return (name: string): SpanRawRef => ({ __ref: 'span-raw', name });
    }
    if (prop === 'endsWith') {
      return (name: string, suffix: string): SpanEndsWithRef => ({
        __ref: 'span-ends-with', name, suffix,
      });
    }
    if (prop === 'commentLeft') {
      return (name: string): SpanCommentLeftRef => ({ __ref: 'span-comment-left', name });
    }
    if (prop === 'commentRight') {
      return (name: string): SpanCommentRightRef => ({ __ref: 'span-comment-right', name });
    }
    if (RESERVED_METHODS.has(prop)) return undefined;
    const value: SpanValueRef = { __ref: 'span-value', name: prop };
    return new Proxy(value, {
      get(target, key) {
        if (key === 'present') {
          const presence: SpanPresenceRef = { __ref: 'span-presence', name: prop };
          return presence;
        }
        return (target as Record<string | symbol, unknown>)[key];
      },
    });
  },
};

export type RefProxy = {
  readonly [key: string]: SpanValueRef & { readonly present: SpanPresenceRef };
} & {
  readonly gap: (from: string, to: string) => SpanGapRef;
  readonly tail: (from: string) => SpanTailRef;
  readonly raw: (name: string) => SpanRawRef;
  readonly endsWith: (name: string, suffix: string) => SpanEndsWithRef;
  readonly commentLeft: (name: string) => SpanCommentLeftRef;
  readonly commentRight: (name: string) => SpanCommentRightRef;
};

export const $: RefProxy = new Proxy({} as Record<string, never>, handler) as unknown as RefProxy;

// Capture-name-scoped view of the SAME runtime proxy, used by the typed
// `targets: ($) => …` relation form. Only the declared capture names are
// accessible as properties — `$.typo` is a compile error — while the
// reserved helper methods keep their loose string params (they reference
// synthetic regions, not only named captures, and tightening them is a
// separate decision).
export type TypedRefs<Names extends string> = {
  readonly [K in Names]: SpanValueRef & { readonly present: SpanPresenceRef };
} & {
  readonly gap: (from: Names, to: Names) => SpanGapRef;
  readonly tail: (from: Names) => SpanTailRef;
  readonly raw: (name: Names) => SpanRawRef;
  readonly endsWith: (name: Names, suffix: string) => SpanEndsWithRef;
  readonly commentLeft: (name: Names) => SpanCommentLeftRef;
  readonly commentRight: (name: Names) => SpanCommentRightRef;
};

export function isStructureRef(value: unknown): value is StructureRef {
  if (typeof value !== 'object' || value === null) return false;
  const tag = (value as { __ref?: unknown }).__ref;
  return tag === 'span-value'
    || tag === 'span-presence'
    || tag === 'span-gap'
    || tag === 'span-tail'
    || tag === 'span-raw'
    || tag === 'span-ends-with'
    || tag === 'span-comment-left'
    || tag === 'span-comment-right';
}
