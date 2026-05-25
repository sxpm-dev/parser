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

export function deriveInverses(nodeTypes: ReadonlyMap<string, NodeTypeInfo>): void {
  for (const info of nodeTypes.values()) {
    for (const production of info.productions) {
      for (const entry of production.renders.values()) {
        const derived = entry.inverse
          ? deriveFromTemplate(entry.inverse, info.name, entry.target, production.source.input)
          : deriveFromBody(entry.body, info.name, entry.target, production.source.input);
        (entry as { inverseDerived?: InverseIR }).inverseDerived = derived;
      }
    }
  }
  validateInverseDiscrimination(nodeTypes);
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
      // Synthetic refs (gap/raw/tail/...) are not invertible at the body
      // root — they're derived spans of the source, not user-visible
      // captures. The author has to wrap them in an object/template.
      throw new CompilerError(
        `inverse: in node '${nodeName}' (target '${target}'): bare $.${body.__ref} refs are not invertible at the body root; wrap them in an object or template`,
      );
    }
    return { kind: 'ref', capture: body.name };
  }
  if (isTemplate(body)) {
    return deriveFromTemplate(body, nodeName, target, input);
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
