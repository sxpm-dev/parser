import type { DynKeyBody, MergeBody, RenderBody, StructureRef } from './types.ts';

/**
 * Use a captured value as the key of a single-entry object.
 *
 * Forward:  dynKey($.selector, $.body) — produces `{ [captures.selector]: <body> }`
 * Inverse:  reads the single-entry object's key → captures.selector; recurses
 *           on value.
 *
 * For schemas authoring "flat" target shapes (e.g. CSS `{ '.foo': {...} }`)
 * where the JSON key is a captured value rather than a fixed schema literal.
 */
export function dynKey(key: StructureRef, value: RenderBody): DynKeyBody {
  return { __dynKey: true, key, value };
}

/**
 * Merge an array of objects (each typically produced by a child production's
 * own dynKey) into a single object via Object.assign. Entries that aren't
 * objects (e.g. children whose body returned null) are filtered out.
 *
 * Forward:  merge($.nodes) — produces
 *           `Object.assign({}, ...nodes.filter(o => o && typeof o === 'object'))`.
 * Inverse:  iterates entries of the input object; each entry is dispatched
 *           through the recursive role's per-production inverse in
 *           declaration order (value-type discrimination picks the right
 *           production: string value → declaration-shape; object value →
 *           rule-shape).
 */
export function merge(array: StructureRef): MergeBody {
  return { __merge: true, array };
}

export function isDynKey(value: unknown): value is DynKeyBody {
  return (
    typeof value === 'object'
    && value !== null
    && (value as { __dynKey?: unknown }).__dynKey === true
  );
}

export function isMerge(value: unknown): value is MergeBody {
  return (
    typeof value === 'object'
    && value !== null
    && (value as { __merge?: unknown }).__merge === true
  );
}
