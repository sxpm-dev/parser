// Phase 3 — Type inference output.
//
// Walks every (NodeType, target) pair and derives a TypeScript type from the
// union of `.render(target, body)` bodies across that node's productions.
// The compiler stays domainless: types are computed from the schema's closed
// vocabulary (classes + refinements + modifiers + structure refs), never from
// node-type names or package context.
//
// The output is a plain TS-type AST (`TsType`) keyed per (NodeType, target).
// Emission (`emit/types.ts`) walks this IR and writes:
//   - `export type <NodeType>_<target> = ...`
//   - per-target `render` / `stringify` function overloads
//
// What this pass does NOT do:
//   - Emit code. Codegen lives in `emit/types.ts`.
//   - Validate. Validation runs upstream; this pass trusts the IR.
//   - Reason about layered operator precedence (Phase 5). Operator spans
//     resolve to the union of declared operator literals when the schema
//     declares any, else `string`.

import type { RenderBody, StructureRef, Template, DynKeyBody, MergeBody } from '@parser2/parser';
import {
  isStructureRef,
  isTemplate,
  isDynKey,
  isMerge,
} from '@parser2/parser';

import type { InferredSchema, NodeTypeInfo, Production, ResolvedSpan } from '../model.ts';
import { findSpanByName, isAbsentAllowedSpan } from '../span-helpers.ts';

// ---------------------------------------------------------------------------
// TS type IR
// ---------------------------------------------------------------------------

export type TsType =
  | { readonly kind: 'string' }
  | { readonly kind: 'number' }
  | { readonly kind: 'boolean' }
  | { readonly kind: 'null' }
  | { readonly kind: 'unknown' }
  | { readonly kind: 'literal'; readonly value: string | number | boolean }
  // Reference to a top-level emitted type alias, e.g. `Duration_ast`.
  | { readonly kind: 'ref'; readonly name: string }
  | { readonly kind: 'union'; readonly members: ReadonlyArray<TsType> }
  | { readonly kind: 'array'; readonly element: TsType }
  | { readonly kind: 'tuple'; readonly elements: ReadonlyArray<TsType> }
  | {
      readonly kind: 'object';
      readonly fields: ReadonlyArray<{ readonly name: string; readonly type: TsType }>;
    }
  // `Record<K, V>` — used for DynKey bodies whose key is a captured string.
  | { readonly kind: 'record'; readonly key: TsType; readonly value: TsType };

// ---------------------------------------------------------------------------
// Public entry
// ---------------------------------------------------------------------------

export type StructureTypes = {
  // `byNodeAndTarget.get(nodeType)?.get(target)` is the union of all
  // production bodies for that node at that target. Used by `emit/types.ts`
  // to emit `export type <NodeType>_<target>`.
  readonly byNodeAndTarget: ReadonlyMap<string, ReadonlyMap<string, TsType>>;
  // Stable list of all (NodeType, target) pairs emitted, in declaration
  // order. Used by `emit/types.ts` to emit the type aliases.
  readonly aliases: ReadonlyArray<{
    readonly nodeType: string;
    readonly target: string;
    readonly aliasName: string;
    readonly type: TsType;
  }>;
  // All declared targets in stable sorted order.
  readonly targets: ReadonlyArray<string>;
};

export function inferStructureTypes(schema: InferredSchema): StructureTypes {
  const targets = collectTargets(schema);
  const aliases: Array<{
    readonly nodeType: string;
    readonly target: string;
    readonly aliasName: string;
    readonly type: TsType;
  }> = [];
  const byNodeAndTarget = new Map<string, Map<string, TsType>>();

  const preserveWs = schema.whitespace === 'preserve';
  for (const info of schema.nodeTypes.values()) {
    const perTarget = new Map<string, TsType>();
    for (const target of targets) {
      const members: TsType[] = [];
      for (let i = 0; i < info.productions.length; i++) {
        const production = info.productions[i]!;
        const entry = production.renders.get(target);
        if (!entry) continue;
        let ts = bodyToTs(entry.body, target, production, schema);
        // Phase 4c v1 — mirror emit/render.ts:emitBuilder + invert.ts
        // deriveInverses auto-attach. Object 'ast' bodies emitted by a
        // preserve schema get a synthetic `__ws: string[]` field at the
        // type level so consumers see the property TypeScript guarantees
        // is on the returned AST.
        if (preserveWs && target === 'ast' && ts.kind === 'object') {
          // Mirror emit/render.ts iwsFields: type the per-repeats-span
          // `<name>_iws` array fields as `string[]` so consumers see
          // them at the type level too. Phase 4c v5: sep-bearing AND
          // sep-less repeats both contribute an iws field.
          const iwsTsFields: Array<{ name: string; type: TsType }> = [];
          for (const span of production.spans) {
            if (!span.name) continue;
            for (const m of span.modifiers) {
              if (m.kind === 'repeats') {
                iwsTsFields.push({
                  name: `${span.name}_iws`,
                  type: { kind: 'array', element: { kind: 'string' } },
                });
                break;
              }
            }
          }
          ts = {
            kind: 'object',
            fields: [
              ...ts.fields,
              { name: '__ws', type: { kind: 'array', element: { kind: 'string' } } },
              { name: '__litPres', type: { kind: 'array', element: { kind: 'boolean' } } },
              ...iwsTsFields,
            ],
          };
        }
        members.push(ts);
      }
      const merged = mergeTypes(members);
      perTarget.set(target, merged);
      aliases.push({
        nodeType: info.name,
        target,
        aliasName: aliasNameFor(info.name, target),
        type: merged,
      });
    }
    byNodeAndTarget.set(info.name, perTarget);
  }

  return { byNodeAndTarget, aliases, targets };
}

export function aliasNameFor(nodeType: string, target: string): string {
  return `${nodeType}_${sanitizeTargetForIdent(target)}`;
}

function sanitizeTargetForIdent(target: string): string {
  return target.replace(/[^A-Za-z0-9_$]/g, '_');
}

// ---------------------------------------------------------------------------
// Target collection (mirrors emit/render.ts)
// ---------------------------------------------------------------------------

function collectTargets(schema: InferredSchema): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const info of schema.nodeTypes.values()) {
    for (const production of info.productions) {
      for (const target of production.renders.keys()) set.add(target);
    }
  }
  return [...set].sort();
}

// ---------------------------------------------------------------------------
// Body → TsType
// ---------------------------------------------------------------------------

function bodyToTs(
  body: RenderBody,
  target: string,
  production: Production,
  schema: InferredSchema,
): TsType {
  if (body === null) return { kind: 'null' };
  if (typeof body === 'string') return { kind: 'literal', value: body };
  if (typeof body === 'number') {
    if (!Number.isFinite(body)) return { kind: 'null' };
    return { kind: 'literal', value: body };
  }
  if (typeof body === 'boolean') return { kind: 'literal', value: body };
  if (isStructureRef(body)) return refToTs(body, target, production, schema);
  if (isTemplate(body)) return templateToTs(body);
  if (isDynKey(body)) return dynKeyToTs(body, target, production, schema);
  if (isMerge(body)) return mergeBodyToTs(body, target, production, schema);
  if (Array.isArray(body)) {
    const elements = body.map((child) => bodyToTs(child, target, production, schema));
    return { kind: 'tuple', elements };
  }
  // Object body
  const fields: Array<{ name: string; type: TsType }> = [];
  for (const [key, value] of Object.entries(body as Record<string, RenderBody>)) {
    fields.push({ name: key, type: bodyToTs(value, target, production, schema) });
  }
  return { kind: 'object', fields };
}

function templateToTs(_template: Template): TsType {
  // Templates always render to a string at runtime — and stringify accepts
  // a string for the inverse direction. No need to inspect slots; capture
  // types only matter when the body is a captured value or object.
  return { kind: 'string' };
}

function dynKeyToTs(
  body: DynKeyBody,
  target: string,
  production: Production,
  schema: InferredSchema,
): TsType {
  // `{[captures[key.name]]: value}` — the key is always a captured string,
  // the value follows the same rules as any other body.
  const valueType = bodyToTs(body.value, target, production, schema);
  return { kind: 'record', key: { kind: 'string' }, value: valueType };
}

function mergeBodyToTs(
  _body: MergeBody,
  _target: string,
  _production: Production,
  _schema: InferredSchema,
): TsType {
  // Merge bodies fold every child entry (dispatched through each member
  // production's render) into one plain object. The set of possible keys is
  // open across productions; the value type is the union of the merged
  // children's value types. Without statically knowing the child set we
  // conservatively type as `Record<string, unknown>`. This is the same
  // conclusion the inverse pass reaches (see `emit/inverse.ts` merge IR).
  return { kind: 'record', key: { kind: 'string' }, value: { kind: 'unknown' } };
}

// ---------------------------------------------------------------------------
// StructureRef → TsType
// ---------------------------------------------------------------------------

function refToTs(
  ref: StructureRef,
  target: string,
  production: Production,
  schema: InferredSchema,
): TsType {
  if (ref.__ref === 'span-presence') return { kind: 'boolean' };
  if (ref.__ref === 'span-value') {
    const span = findSpanByName(production, ref.name);
    if (!span) {
      // The validate pass enforces capture-name resolution upstream. If
      // somehow a body references an unknown capture, fall back to unknown
      // rather than throwing — codegen elsewhere will surface it first.
      return { kind: 'unknown' };
    }
    return spanCaptureType(span, target, schema);
  }
  // All other ref kinds (span-gap, span-raw, span-tail, span-ends-with,
  // span-comment-left, span-comment-right) are raws-mode helpers that
  // always resolve to a string slice.
  if (ref.__ref === 'span-ends-with') return { kind: 'boolean' };
  return { kind: 'string' };
}

// ---------------------------------------------------------------------------
// Span capture types
// ---------------------------------------------------------------------------

function spanCaptureType(
  span: ResolvedSpan,
  target: string,
  schema: InferredSchema,
): TsType {
  const base = baseSpanType(span, target, schema);
  return applyModifiers(base, span);
}

function baseSpanType(
  span: ResolvedSpan,
  target: string,
  schema: InferredSchema,
): TsType {
  // Recursive role span — the captured value is the union of role
  // productions' `target` shapes. The compiler walks renderSlot at runtime;
  // here we reference the per-role alias name and let TS resolve the union.
  if (span.recursiveRoles.length > 0) {
    const members = span.recursiveRoles.map(
      (role): TsType => ({ kind: 'ref', name: aliasNameFor(role, target) }),
    );
    return mergeTypes(members);
  }

  // `.until()` and `.rawUntil()` modifiers capture a raw source slice.
  for (const m of span.modifiers) {
    if (m.kind === 'until' || m.kind === 'rawUntil') return { kind: 'string' };
  }

  switch (span.class) {
    case 'literal':
      return span.text !== undefined
        ? { kind: 'literal', value: span.text }
        : { kind: 'string' };
    case 'ident':
    case 'hex':
    case 'comment':
      return { kind: 'string' };
    case 'number': {
      const hasCoerce = span.refinements.some((r) => r.name === 'coerce');
      return hasCoerce ? { kind: 'number' } : { kind: 'string' };
    }
    case 'string': {
      const hasCoerce = span.refinements.some((r) => r.name === 'coerce');
      // With coerce: decodeJsonString → string (decoded). Without: raw
      // slice including quote delimiters. Both are strings.
      return { kind: 'string' };
    }
    case 'operator': {
      // The captured value is one of the declared operator literals; emit a
      // union of literal types when the schema declared any. Falls back to
      // `string` when no operators are declared (defensive — codegen would
      // already have errored in that case).
      const literals = schema.operatorLiterals;
      if (literals.length === 0) return { kind: 'string' };
      const members = literals.map(
        (lit): TsType => ({ kind: 'literal', value: lit }),
      );
      return mergeTypes(members);
    }
  }
}

function applyModifiers(base: TsType, span: ResolvedSpan): TsType {
  let type = base;
  let isArray = false;
  let nullable = false;
  for (const m of span.modifiers) {
    if (m.kind === 'repeats') {
      isArray = true;
      // .repeats({min:0}) AND no `.optional()` — the slot is still an array
      // (empty when no children matched). Don't add nullable for repeats.
    } else if (m.kind === 'optional') {
      nullable = true;
    }
  }
  if (isArray) type = { kind: 'array', element: type };
  if (nullable || (isAbsentAllowedSpan(span) && !isArray)) {
    type = unionWith(type, { kind: 'null' });
  }
  return type;
}

// ---------------------------------------------------------------------------
// Type merging
// ---------------------------------------------------------------------------

function mergeTypes(types: ReadonlyArray<TsType>): TsType {
  if (types.length === 0) return { kind: 'unknown' };
  if (types.length === 1) return types[0]!;
  // Flatten nested unions.
  const flat: TsType[] = [];
  for (const t of types) {
    if (t.kind === 'union') flat.push(...t.members);
    else flat.push(t);
  }
  // Dedupe by structural identity.
  const seen = new Map<string, TsType>();
  for (const t of flat) {
    const key = canonicalize(t);
    if (!seen.has(key)) seen.set(key, t);
  }
  const deduped = [...seen.values()];
  if (deduped.length === 1) return deduped[0]!;
  return { kind: 'union', members: deduped };
}

function unionWith(a: TsType, b: TsType): TsType {
  return mergeTypes([a, b]);
}

function canonicalize(t: TsType): string {
  // Stable string encoding for dedupe. Object fields keep declaration
  // order — two object literals with the same fields in the same order
  // collapse; different orders stay separate. That matches how schema
  // authors write bodies: order-stable.
  switch (t.kind) {
    case 'string':
    case 'number':
    case 'boolean':
    case 'null':
    case 'unknown':
      return t.kind;
    case 'literal':
      return `L:${typeof t.value}:${JSON.stringify(t.value)}`;
    case 'ref':
      return `R:${t.name}`;
    case 'union':
      return `U:[${t.members.map(canonicalize).join(',')}]`;
    case 'array':
      return `A:${canonicalize(t.element)}`;
    case 'tuple':
      return `T:[${t.elements.map(canonicalize).join(',')}]`;
    case 'object':
      return `O:{${t.fields.map((f) => `${f.name}:${canonicalize(f.type)}`).join(',')}}`;
    case 'record':
      return `Rec:${canonicalize(t.key)}=>${canonicalize(t.value)}`;
  }
}
