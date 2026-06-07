// Pass: derive an inverse function shape per (production, target). The result
// is stored on `RenderTargetIR.inverseDerived` as an `InverseIR`. The shape
// describes how the inverse parser walks a rendered value to recover the
// production's capture map. Source reconstruction itself happens through the
// shared, target-independent `__rebuild_<NodeType>_<idx>` subroutine emitted
// by `emit/rebuild.ts`.
//
// Derivation cases (mirror the body shapes the forward emitter handles):
//
//   - Object body                              → InverseIR.object
//     Each field becomes either an `InverseField.literal` (constant scalars
//     and nulls; asserted at runtime) or an `InverseField.inverse` (nested
//     InverseIR populating captures from the field's value).
//
//   - Array body                               → InverseIR.array
//     Positional; length must be statically known. `RenderBody` itself does
//     not permit spreads (see packages/parser/src/types.ts) so this is a
//     simple positional walk.
//
//   - Scalar body (string/number/boolean/null) → InverseIR.scalar
//     Inverse asserts equality at runtime. Yields no captures itself; the
//     production has no free slots in this target.
//
//   - Bare $.name body                         → InverseIR.ref
//     Inverse reads the value into `captures.<name>` directly.
//
//   - Template body                            → InverseIR.template
//     Literal-segment scanner: `segments[i]` precedes `captures[i]`. The
//     scanner reads each capture by advancing to the next literal segment.
//     Adjacent slots (zero-length separator between consecutive captures)
//     are rejected as a compile error — author must supply `options.inverse`.
//
//   - Explicit `options.inverse` (Template)    → derived from the template
//     Same Template-body derivation; overrides the body-derived inverse.
//
// After per-production derivation, a second pass enforces precondition 2
// (per-target production discrimination): when a node-type has multiple
// productions sharing a target, the inverse dispatcher must be able to tell
// them apart from the value alone. Strategies (object-target literal-field
// match, string-target unique prefix). Otherwise a named CompilerError.

import {
  isDynKey,
  isMerge,
  isStructureRef,
  isTemplate,
  type RenderBody,
  type Template,
} from '@parser2/parser';
import {
  CompilerError,
  type InverseField,
  type InverseIR,
  type NodeTypeInfo,
  type Production,
  type RenderTargetIR,
} from '../model.ts';

export function deriveInverses(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
  transparentPassthroughs: ReadonlyMap<
    string,
    ReadonlyArray<import('./transparent-passthrough.ts').TransparentPassthroughInfo>
  > = new Map(),
): void {
  // Phase 5g: skip transparent-passthrough productions entirely. They have
  // no usable inverse (their AST body is a recursive ref to the same node
  // type), and including them in `validateInverseDiscrimination` would
  // surface a false ambiguity vs. the inner production they wrap.
  const isPassthrough = buildPassthroughLookup(transparentPassthroughs);
  for (const info of nodeTypes.values()) {
    for (let i = 0; i < info.productions.length; i++) {
      const production = info.productions[i]!;
      if (isPassthrough(info.name, i)) continue;
      for (const entry of production.renders.values()) {
        const derived = entry.inverse
          ? deriveFromTemplate(entry.inverse, info.name, entry.target, production.source.input)
          : deriveFromBody(entry.body, info.name, entry.target, production.source.input);
        (entry as { inverseDerived?: InverseIR }).inverseDerived = derived;
      }
    }
  }
  // validateInverseDiscrimination short-circuits per-pair when either
  // production's `inverseDerived` is undefined, so transparent-passthrough
  // productions (skipped above) are naturally excluded from the conflict
  // search.
  validateInverseDiscrimination(nodeTypes);
}

function buildPassthroughLookup(
  map: ReadonlyMap<string, ReadonlyArray<import('./transparent-passthrough.ts').TransparentPassthroughInfo>>,
): (nodeName: string, prodIdx: number) => boolean {
  const lookup = new Map<string, Set<number>>();
  for (const [nodeName, infos] of map) {
    const set = new Set<number>();
    for (const info of infos) set.add(info.prodIdx);
    lookup.set(nodeName, set);
  }
  return (nodeName, prodIdx) => lookup.get(nodeName)?.has(prodIdx) === true;
}

function deriveFromBody(
  body: RenderBody,
  nodeName: string,
  target: string,
  input: string,
): InverseIR {
  if (
    body === null
    || typeof body === 'string'
    || typeof body === 'number'
    || typeof body === 'boolean'
  ) {
    return { kind: 'scalar', value: body };
  }
  if (isStructureRef(body)) {
    if (body.__ref !== 'span-value') {
      // Non-span-value refs (span-presence, synthetic gap/raw/tail/...) are
      // not invertible from a rendered value alone — a `present: true`
      // boolean doesn't carry the source text needed to reconstruct the
      // span, and synthetic refs are derived spans of the source rather
      // than user-visible captures. Stringify only knows how to walk
      // `span-value` references back to their capture sites.
      //
      // Full span-presence inverse support is tracked under Phase 4
      // (formatter / preservation modes); see
      // docs/superpowers/plans/2026-06-06-9-10-roadmap.md.
      throw new CompilerError(
        `inverse: in node '${nodeName}' (target '${target}'): $.${body.__ref} refs are not invertible; only $.span-value refs can drive stringify`,
      );
    }
    return { kind: 'ref', capture: body.name };
  }
  if (isTemplate(body)) {
    return deriveFromTemplate(body, nodeName, target, input);
  }
  if (isDynKey(body)) {
    // Single-entry object: key is bound to keyCapture; value recurses.
    if (body.key.__ref !== 'span-value') {
      throw new CompilerError(
        `inverse: in node '${nodeName}' (target '${target}'): dynKey() key must be a span-value $.ref, got $.${body.key.__ref}`,
      );
    }
    return {
      kind: 'dynKey',
      keyCapture: body.key.name,
      value: deriveFromBody(body.value, nodeName, target, input),
    };
  }
  if (isMerge(body)) {
    // The array ref must point at a recursive repeats span. We capture the
    // role list here so the inverse-emit can dispatch each object entry
    // through the per-role multi-helper.
    if (body.array.__ref !== 'span-value') {
      throw new CompilerError(
        `inverse: in node '${nodeName}' (target '${target}'): merge() array must be a span-value $.ref, got $.${body.array.__ref}`,
      );
    }
    return {
      kind: 'merge',
      arrayCapture: body.array.name,
      // Roles resolved at emit time from the production's spans — see
      // emit/inverse.ts. Carrying an empty list here keeps derive
      // schema-only; the emit knows the production it's serving.
      roles: [],
    };
  }
  if (Array.isArray(body)) {
    return {
      kind: 'array',
      elements: body.map((child) => deriveFromBody(child, nodeName, target, input)),
    };
  }
  const fields: InverseField[] = [];
  for (const [name, child] of Object.entries(body as Record<string, RenderBody>)) {
    if (
      child === null
      || typeof child === 'string'
      || typeof child === 'number'
      || typeof child === 'boolean'
    ) {
      fields.push({ kind: 'literal', name, value: child });
    } else {
      fields.push({
        kind: 'inverse',
        name,
        inverse: deriveFromBody(child, nodeName, target, input),
      });
    }
  }
  return { kind: 'object', fields };
}

function deriveFromTemplate(
  template: Template,
  nodeName: string,
  target: string,
  input: string,
): InverseIR {
  // Precondition 1: between any two consecutive slots there must be a
  // non-empty literal separator. Templates carry `parts.length === slots.length + 1`,
  // so the separator between slot i and slot i+1 is parts[i+1].
  for (let i = 0; i + 1 < template.slots.length; i++) {
    if (template.parts[i + 1] === '') {
      throw new CompilerError(
        `inverse: in node '${nodeName}' (target '${target}', example '${truncate(input)}'): slots $.${template.slots[i]!.ref} and $.${template.slots[i + 1]!.ref} are adjacent with no separator; provide explicit options.inverse`,
      );
    }
  }
  return {
    kind: 'template',
    segments: [...template.parts],
    captures: template.slots.map((s) => s.ref),
  };
}

// --------- Precondition 2: per-target production discrimination ----------

function validateInverseDiscrimination(
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
): void {
  for (const info of nodeTypes.values()) {
    if (info.productions.length <= 1) continue;
    // Collect every target declared on every production of this node type
    // (per-target completeness is already enforced upstream, so every
    // production declares the same set, but we walk defensively).
    const targets = new Set<string>();
    for (const production of info.productions) {
      for (const target of production.renders.keys()) targets.add(target);
    }
    for (const target of targets) {
      checkTargetDiscrimination(info, target);
    }
  }
}

function checkTargetDiscrimination(info: NodeTypeInfo, target: string): void {
  const productions = info.productions;
  // Group productions by their derivation kind for this target. We compare
  // pairwise within each kind.
  for (let i = 0; i < productions.length; i++) {
    for (let j = i + 1; j < productions.length; j++) {
      const a = productions[i]!;
      const b = productions[j]!;
      const ia = a.renders.get(target)?.inverseDerived;
      const ib = b.renders.get(target)?.inverseDerived;
      if (!ia || !ib) continue;
      // Productions whose body is `null` opt-out of this target entirely
      // (they render to null, get filtered by merge(), and never need an
      // inverse path). Treat them as ineligible for collision against any
      // other production — including another null-bodied one.
      if (isNullBody(ia) || isNullBody(ib)) continue;
      const reason = collisionReason(ia, ib);
      if (reason !== null) {
        throw new CompilerError(
          `inverse: target '${target}' has indistinguishable productions in node '${info.name}': ${describeProduction(a, i)} vs ${describeProduction(b, j)} share ${reason}; one production must be made distinguishable (literal field, unique prefix, or explicit options.inverse)`,
        );
      }
    }
  }
}

// Returns a short reason string when the two inverses cannot be
// discriminated by inspecting a runtime value, or null when they can.
function collisionReason(a: InverseIR, b: InverseIR): string | null {
  if (a.kind !== b.kind) return null;
  switch (a.kind) {
    case 'object': {
      const bo = b as Extract<InverseIR, { kind: 'object' }>;
      // Discriminator strategies, in priority order:
      //   1) A literal field whose values differ between the two productions.
      //   2) Field-name set difference: one production declares a field the
      //      other doesn't (literal or not). The dispatcher can branch on
      //      `name in value` to tell them apart.
      const aLits = literalFields(a);
      const bLits = literalFields(bo);
      const allLitKeys = new Set<string>([...aLits.keys(), ...bLits.keys()]);
      for (const key of allLitKeys) {
        const av = aLits.get(key);
        const bv = bLits.get(key);
        if (av === undefined || bv === undefined) return null;
        if (!Object.is(av, bv)) return null;
      }
      const aNames = fieldNames(a);
      const bNames = fieldNames(bo);
      const aOnly = [...aNames].filter((n) => !bNames.has(n));
      const bOnly = [...bNames].filter((n) => !aNames.has(n));
      if (aOnly.length > 0 || bOnly.length > 0) return null;
      // All literal values match AND all field names match. The two are
      // value-shape-identical.
      if (aLits.size === 0) {
        return 'no literal discriminator fields and identical field-name sets';
      }
      return 'identical literal-field values and identical field-name sets on object body';
    }
    case 'template': {
      const bt = b as Extract<InverseIR, { kind: 'template' }>;
      // Feature 1 (spec Design rule 5 — value-stable round-trip): if the
      // two templates are structurally identical (same segments AND same
      // captures), they are NOT a collision. The inverse dispatcher can
      // pick either production deterministically (lowest-index wins in
      // emit/inverse.ts) and the resulting source re-parses to a value
      // that, when re-rendered to this target, equals the original. Bytes
      // may differ between the two source forms; value-stability holds.
      if (templatesAreStructurallyIdentical(a, bt)) return null;
      const aPrefix = a.segments[0] ?? '';
      const bPrefix = bt.segments[0] ?? '';
      // 1) Distinct non-empty leading prefixes (or one empty + the other
      //    non-empty) discriminate trivially.
      if (aPrefix !== bPrefix) return null;
      // 2) Same leading prefix (possibly empty). Look for unique embedded
      //    literal segments — a non-empty segment present in one production
      //    but not in any segment of the other can be used as a runtime
      //    discriminator (does the input contain this substring?).
      const aLiterals = nonEmptySegments(a.segments);
      const bLiterals = nonEmptySegments(bt.segments);
      if (hasDiscriminatingLiteral(aLiterals, bLiterals) || hasDiscriminatingLiteral(bLiterals, aLiterals)) {
        return null;
      }
      if (aPrefix === '' && bPrefix === '') {
        return 'both template bodies start with a capture (no leading literal prefix) and no embedded literal segment distinguishes them';
      }
      return `the same leading literal prefix ${JSON.stringify(aPrefix)} and no embedded literal segment distinguishes them`;
    }
    case 'scalar': {
      const bs = b as Extract<InverseIR, { kind: 'scalar' }>;
      // Same literal value → indistinguishable. Different value → trivially fine.
      if (Object.is(a.value, bs.value)) {
        return `the same scalar value ${JSON.stringify(a.value)}`;
      }
      return null;
    }
    case 'ref':
      // Two bare-ref bodies are indistinguishable: both accept any
      // string and write to a single capture. Different capture names
      // don't help — the runtime sees only the value.
      return 'two bare $.name bodies cannot be discriminated from a value alone';
    case 'array': {
      const ba = b as Extract<InverseIR, { kind: 'array' }>;
      // Different lengths discriminate.
      if (a.elements.length !== ba.elements.length) return null;
      return 'array bodies of equal length with no literal discriminator';
    }
    case 'dynKey': {
      // Two dynKey bodies collide when their value sub-IRs are the same
      // runtime-type bucket — see emit/inverse.ts dynKeyEntryTypeCondition.
      // Different buckets discriminate (string vs object vs array).
      const bd = b as Extract<InverseIR, { kind: 'dynKey' }>;
      const ka = dynKeyValueKindBucket(a.value);
      const kb = dynKeyValueKindBucket(bd.value);
      if (ka !== kb) return null;
      return `two dynKey bodies whose entry values are both ${ka}-shaped — cannot discriminate from a value alone`;
    }
    case 'merge':
      // Two merge bodies are indistinguishable from a value alone (both
      // accept any object). Schemas should declare at most one merge body
      // per node type; today only Stylesheet has this shape, so the
      // collision never fires in practice.
      return 'two merge bodies cannot be discriminated from a value alone';
  }
}

function isNullBody(ir: InverseIR): boolean {
  return ir.kind === 'scalar' && ir.value === null;
}

function dynKeyValueKindBucket(value: InverseIR): 'string' | 'object' | 'array' | 'any' {
  switch (value.kind) {
    case 'ref': return 'string';
    case 'merge':
    case 'dynKey':
    case 'object': return 'object';
    case 'array': return 'array';
    case 'scalar':
    case 'template': return 'any';
  }
}

// Collects the non-empty literal segments of a template inverse. Used by
// Fix 1 — when two template productions share a leading prefix (often
// empty), an embedded literal segment present in only one of them serves
// as a runtime discriminator (the inverse dispatcher checks
// `value.includes(<unique-literal>)`).
function nonEmptySegments(segments: ReadonlyArray<string>): ReadonlyArray<string> {
  return segments.filter((s) => s.length > 0);
}

// Feature 1: deep structural equality between two template inverses.
// `segments` and `captures` are both string arrays; identity means the
// same length AND element-wise string equality. When templates are
// structurally identical, the spec rule 5 (value-stable round-trip)
// allows the inverse dispatcher to pick either production — the rebuilt
// source re-parses to the same target value either way.
function templatesAreStructurallyIdentical(
  a: Extract<InverseIR, { kind: 'template' }>,
  b: Extract<InverseIR, { kind: 'template' }>,
): boolean {
  if (a.segments.length !== b.segments.length) return false;
  if (a.captures.length !== b.captures.length) return false;
  for (let i = 0; i < a.segments.length; i++) {
    if (a.segments[i] !== b.segments[i]) return false;
  }
  for (let i = 0; i < a.captures.length; i++) {
    if (a.captures[i] !== b.captures[i]) return false;
  }
  return true;
}

// Does production A have a non-empty literal segment that does not appear
// as a substring of any of production B's segments? If so, that literal is
// a discriminator: the inverse dispatcher can branch on
// `value.includes(<literal>)` to route to A.
function hasDiscriminatingLiteral(
  aLiterals: ReadonlyArray<string>,
  bLiterals: ReadonlyArray<string>,
): boolean {
  for (const lit of aLiterals) {
    let containedInSomeB = false;
    for (const bLit of bLiterals) {
      if (bLit.includes(lit)) {
        containedInSomeB = true;
        break;
      }
    }
    if (!containedInSomeB) return true;
  }
  return false;
}

function literalFields(ir: Extract<InverseIR, { kind: 'object' }>): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const field of ir.fields) {
    if (field.kind === 'literal') out.set(field.name, field.value);
  }
  return out;
}

function fieldNames(ir: Extract<InverseIR, { kind: 'object' }>): Set<string> {
  const out = new Set<string>();
  for (const field of ir.fields) out.add(field.name);
  return out;
}

function describeProduction(production: Production, idx: number): string {
  return `production #${idx} (example '${truncate(production.source.input)}')`;
}

function truncate(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}
