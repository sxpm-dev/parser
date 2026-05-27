// Reference interpreter — stringify path (Task 2.3). Inverse direction:
// given a rendered value (output of `interpretRender(...)` or v2's
// `render(...)`) plus a declared target, walk the per-(production, target)
// InverseIR built by `infer/invert.ts` to recover the production's
// captures, then re-interleave the canonical separators + spans into the
// source string.
//
// Mirrors emit/inverse.ts + emit/rebuild.ts structurally: the same
// per-(NodeType, target) dispatcher classifies values, the same
// literal-segment scanner walks template inverses, the same recursive
// slot helper dispatches child captures by their declared roles.
//
// Public surface:
//   - interpretStringify(schema, value, target): the reverse of
//     interpretRender(schema, captures, target). For a target whose body
//     is a Template (string-valued), `value` is a string. For an object-
//     bodied target, `value` is the rendered object. The returned string
//     is the canonical source — re-parsing it yields a value whose
//     re-render to this same target equals the original value (spec
//     rule 5: value-stable round-trip).
//
// Why a separate module from render.ts:
//   The forward direction reads captures by dispatching on
//   `captures.__production`; the inverse direction has no such hint and
//   must discriminate on the rendered value's shape. The two dispatchers
//   share no runtime state — keeping them apart matches the v2 codegen
//   structure (emit/render.ts vs emit/inverse.ts) and keeps the
//   per-feature drift checks easy to follow.

import type {
  InferredSchema,
  InverseField,
  InverseIR,
  Production,
  ResolvedSpan,
} from '../model.ts';

// --- Public API ------------------------------------------------------------

export function interpretStringify(
  schema: InferredSchema,
  value: unknown,
  target: string,
): string {
  return dispatchNode(schema, schema.rootType, target, value);
}

// --- Per-(NodeType, target) dispatcher -------------------------------------

// Routes a rendered value through the right production's inverter. Mirrors
// emit/inverse.ts → emitNodeDispatcher: object-target values discriminate
// on literal-field values (with field-name presence breaking ties), array
// targets on length, template targets on leading-prefix (longest first) or
// unique embedded literals.
function dispatchNode(
  schema: InferredSchema,
  nodeType: string,
  target: string,
  value: unknown,
): string {
  const info = schema.nodeTypes.get(nodeType);
  if (!info) {
    throw new Error(`stringify: unknown node type '${nodeType}' (target '${target}')`);
  }
  type Branch = {
    readonly prodIdx: number;
    readonly production: Production;
    readonly ir: InverseIR;
  };
  const branches: Branch[] = [];
  for (let i = 0; i < info.productions.length; i++) {
    const production = info.productions[i]!;
    const entry = production.renders.get(target);
    if (!entry || !entry.inverseDerived) continue;
    branches.push({ prodIdx: i, production, ir: entry.inverseDerived });
  }
  if (branches.length === 0) {
    throw new Error(
      `stringify: no productions declared for node '${nodeType}' target '${target}'`,
    );
  }

  const objects = branches.filter((b) => b.ir.kind === 'object');
  const arrays = branches.filter((b) => b.ir.kind === 'array');
  const templates = branches.filter((b) => b.ir.kind === 'template');
  const scalars = branches.filter((b) => b.ir.kind === 'scalar');
  const refs = branches.filter((b) => b.ir.kind === 'ref');

  // Object-shape dispatch
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const ranked = rankObjectBranches(objects);
    for (const r of ranked) {
      if (objectMatches(value as Record<string, unknown>, r.branch.ir, r.otherFieldNames)) {
        return invertProduction(schema, r.branch.production, r.branch.ir, target, value);
      }
    }
  }

  // Array-shape dispatch
  if (Array.isArray(value)) {
    for (const b of arrays) {
      const ir = b.ir as Extract<InverseIR, { kind: 'array' }>;
      if (value.length === ir.elements.length) {
        return invertProduction(schema, b.production, b.ir, target, value);
      }
    }
  }

  // String-shape dispatch — templates, then refs, then scalar-string.
  if (typeof value === 'string') {
    const tplPlans = planTemplateDispatch(templates);
    for (const p of tplPlans) {
      if (p.check === null || p.check(value)) {
        return invertProduction(schema, p.branch.production, p.branch.ir, target, value);
      }
    }
    // Bare-ref bodies accept any string.
    for (const b of refs) {
      return invertProduction(schema, b.production, b.ir, target, value);
    }
    // Scalar string
    for (const b of scalars) {
      const ir = b.ir as Extract<InverseIR, { kind: 'scalar' }>;
      if (Object.is(value, ir.value)) {
        return invertProduction(schema, b.production, b.ir, target, value);
      }
    }
  }

  // Scalar non-string dispatch (number/boolean/null)
  for (const b of scalars) {
    const ir = b.ir as Extract<InverseIR, { kind: 'scalar' }>;
    if (Object.is(value, ir.value)) {
      return invertProduction(schema, b.production, b.ir, target, value);
    }
  }

  throw new Error(
    `stringify: no production matches for target '${target}' in node '${nodeType}' (value: ${safeStringify(value)})`,
  );
}

// --- Object-branch ranking -------------------------------------------------

type ObjectIR = Extract<InverseIR, { kind: 'object' }>;
type Branch = { readonly prodIdx: number; readonly production: Production; readonly ir: InverseIR };
type RankedObjectBranch = {
  readonly branch: Branch & { readonly ir: ObjectIR };
  readonly literalConds: ReadonlyArray<{ readonly name: string; readonly value: unknown }>;
  readonly otherFieldNames: ReadonlyArray<{
    readonly mustHave: ReadonlyArray<string>;
    readonly mustNotHave: ReadonlyArray<string>;
  }>;
  readonly specificity: number;
};

function rankObjectBranches(
  branches: ReadonlyArray<Branch>,
): ReadonlyArray<RankedObjectBranch> {
  const objs = branches.filter((b) => b.ir.kind === 'object') as Array<
    Branch & { readonly ir: ObjectIR }
  >;
  const result: RankedObjectBranch[] = [];
  for (let i = 0; i < objs.length; i++) {
    const b = objs[i]!;
    const litConds = literalFieldList(b.ir);
    const names = fieldNameSet(b.ir);
    const otherFieldNames: Array<{
      readonly mustHave: ReadonlyArray<string>;
      readonly mustNotHave: ReadonlyArray<string>;
    }> = [];
    for (let j = 0; j < objs.length; j++) {
      if (i === j) continue;
      const other = objs[j]!;
      const otherLits = literalFieldList(other.ir);
      if (!literalFieldsEqual(litConds, otherLits)) continue;
      const otherNames = fieldNameSet(other.ir);
      const mustHave: string[] = [];
      const mustNotHave: string[] = [];
      for (const n of names) if (!otherNames.has(n)) mustHave.push(n);
      for (const n of otherNames) if (!names.has(n)) mustNotHave.push(n);
      if (mustHave.length > 0 || mustNotHave.length > 0) {
        otherFieldNames.push({ mustHave, mustNotHave });
      }
    }
    const specificity = litConds.length + otherFieldNames.reduce(
      (sum, n) => sum + n.mustHave.length + n.mustNotHave.length,
      0,
    );
    result.push({ branch: b, literalConds: litConds, otherFieldNames, specificity });
  }
  result.sort((a, b) => b.specificity - a.specificity);
  return result;
}

function literalFieldList(ir: ObjectIR): ReadonlyArray<{ readonly name: string; readonly value: unknown }> {
  const out: { readonly name: string; readonly value: unknown }[] = [];
  for (const field of ir.fields) {
    if (field.kind === 'literal') out.push({ name: field.name, value: field.value });
  }
  // Sort for deterministic compare in literalFieldsEqual.
  return [...out].sort((x, y) => x.name.localeCompare(y.name));
}

function literalFieldsEqual(
  a: ReadonlyArray<{ readonly name: string; readonly value: unknown }>,
  b: ReadonlyArray<{ readonly name: string; readonly value: unknown }>,
): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]!.name !== b[i]!.name) return false;
    if (!Object.is(a[i]!.value, b[i]!.value)) return false;
  }
  return true;
}

function fieldNameSet(ir: ObjectIR): Set<string> {
  const out = new Set<string>();
  for (const field of ir.fields) out.add(field.name);
  return out;
}

function objectMatches(
  value: Record<string, unknown>,
  ir: ObjectIR,
  otherFieldNames: ReadonlyArray<{
    readonly mustHave: ReadonlyArray<string>;
    readonly mustNotHave: ReadonlyArray<string>;
  }>,
): boolean {
  for (const field of ir.fields) {
    if (field.kind !== 'literal') continue;
    if (!Object.is(value[field.name], field.value)) return false;
  }
  for (const spec of otherFieldNames) {
    for (const name of spec.mustHave) {
      if (!(name in value)) return false;
    }
    for (const name of spec.mustNotHave) {
      if (name in value) return false;
    }
  }
  return true;
}

// --- Template-branch ranking ----------------------------------------------

type TemplateIR = Extract<InverseIR, { kind: 'template' }>;

type TplPlan = {
  readonly branch: Branch & { readonly ir: TemplateIR };
  readonly check: ((value: string) => boolean) | null;
  readonly priority: number;
};

function planTemplateDispatch(
  branches: ReadonlyArray<Branch>,
): ReadonlyArray<TplPlan> {
  const allTpls = branches.filter((b) => b.ir.kind === 'template') as Array<
    Branch & { readonly ir: TemplateIR }
  >;
  // Drop structurally-identical duplicates (Feature 1: spec rule 5).
  const tpls: typeof allTpls = [];
  const seen = new Set<string>();
  for (const b of allTpls) {
    const key = templateShapeKey(b.ir);
    if (seen.has(key)) continue;
    seen.add(key);
    tpls.push(b);
  }
  const plans: TplPlan[] = [];
  for (const b of tpls) {
    const prefix = b.ir.segments[0] ?? '';
    if (prefix.length > 0) {
      plans.push({
        branch: b,
        check: (v) => v.startsWith(prefix),
        priority: prefix.length,
      });
      continue;
    }
    // Empty leading prefix — look for a unique embedded literal segment.
    const sameLeadingSiblings = tpls.filter(
      (other) => other !== b && (other.ir.segments[0] ?? '') === prefix,
    );
    const ourLiterals = b.ir.segments.filter((s) => s.length > 0);
    let bestLit: string | null = null;
    for (const lit of ourLiterals) {
      let foundInSibling = false;
      for (const sib of sameLeadingSiblings) {
        for (const sibSeg of sib.ir.segments) {
          if (sibSeg.includes(lit)) {
            foundInSibling = true;
            break;
          }
        }
        if (foundInSibling) break;
      }
      if (!foundInSibling) {
        if (bestLit === null || lit.length > bestLit.length) bestLit = lit;
      }
    }
    if (bestLit !== null) {
      const lit = bestLit;
      plans.push({
        branch: b,
        check: (v) => v.indexOf(lit) >= 0,
        priority: lit.length,
      });
    } else {
      plans.push({ branch: b, check: null, priority: -1 });
    }
  }
  plans.sort((a, b) => b.priority - a.priority);
  return plans;
}

function templateShapeKey(ir: TemplateIR): string {
  return JSON.stringify({ s: ir.segments, c: ir.captures });
}

// --- Per-production inverter ----------------------------------------------

// Mirrors emit/inverse.ts → emitInverter: scalar bodies recover no
// captures (the production's source string is constant). All other
// shapes recover captures into a map, then hand them to the rebuild
// subroutine (port of emit/rebuild.ts).
function invertProduction(
  schema: InferredSchema,
  production: Production,
  ir: InverseIR,
  target: string,
  value: unknown,
): string {
  if (ir.kind === 'scalar') {
    if (!Object.is(value, ir.value)) {
      throw new Error(
        `stringify: expected scalar ${safeStringify(ir.value)}, got ${safeStringify(value)}`,
      );
    }
    return production.source.input;
  }
  const captures: Record<string, unknown> = {};
  walkInverse(schema, ir, value, target, production, captures);
  return rebuildSource(production, captures);
}

// Walks an InverseIR, populating `captures` from `value`. Mirrors
// emit/inverse.ts → emitInverseBody.
function walkInverse(
  schema: InferredSchema,
  ir: InverseIR,
  value: unknown,
  target: string,
  production: Production,
  captures: Record<string, unknown>,
): void {
  switch (ir.kind) {
    case 'object':
      walkInverseObject(schema, ir.fields, value, target, production, captures);
      return;
    case 'array':
      walkInverseArray(schema, ir.elements, value, target, production, captures);
      return;
    case 'scalar':
      if (!Object.is(value, ir.value)) {
        throw new Error(
          `stringify: expected scalar ${safeStringify(ir.value)}, got ${safeStringify(value)}`,
        );
      }
      return;
    case 'ref':
      captures[ir.capture] = invertSlot(schema, ir.capture, production, target, value);
      return;
    case 'template':
      walkInverseTemplate(schema, ir.segments, ir.captures, value, target, production, captures);
      return;
  }
}

function walkInverseObject(
  schema: InferredSchema,
  fields: ReadonlyArray<InverseField>,
  value: unknown,
  target: string,
  production: Production,
  captures: Record<string, unknown>,
): void {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`stringify: expected object value, got ${typeof value}`);
  }
  const obj = value as Record<string, unknown>;
  for (const field of fields) {
    const v = obj[field.name];
    if (field.kind === 'literal') {
      if (!Object.is(v, field.value)) {
        throw new Error(
          `stringify: field '${field.name}' expected ${safeStringify(field.value)}, got ${safeStringify(v)}`,
        );
      }
      continue;
    }
    walkInverse(schema, field.inverse, v, target, production, captures);
  }
}

function walkInverseArray(
  schema: InferredSchema,
  elements: ReadonlyArray<InverseIR>,
  value: unknown,
  target: string,
  production: Production,
  captures: Record<string, unknown>,
): void {
  if (!Array.isArray(value) || value.length !== elements.length) {
    throw new Error(
      `stringify: expected array of length ${elements.length}, got ${Array.isArray(value) ? `length ${value.length}` : typeof value}`,
    );
  }
  for (let i = 0; i < elements.length; i++) {
    walkInverse(schema, elements[i]!, value[i], target, production, captures);
  }
}

// Template-body scanner. Mirrors emit/inverse.ts → emitTemplateBody:
// walks segments[i] separators, captures slices between them into the
// named captures. Tail-optional-absent fusion mirrors Gap A of the
// forward render path — when a separator preceding an optional capture
// (and every capture after it is optional too) is missing, the prior
// capture consumes the remainder and the tail captures land as null.
function walkInverseTemplate(
  schema: InferredSchema,
  segments: ReadonlyArray<string>,
  captureNames: ReadonlyArray<string>,
  value: unknown,
  target: string,
  production: Production,
  captures: Record<string, unknown>,
): void {
  if (typeof value !== 'string') {
    throw new Error(`stringify: expected string value for template body, got ${typeof value}`);
  }
  const s = value;
  const isOptional: ReadonlyArray<boolean> = captureNames.map(
    (n) => isOptionalCapture(production, n),
  );
  const tailOptional: boolean[] = new Array(captureNames.length).fill(false);
  let allOpt = true;
  for (let j = captureNames.length - 1; j >= 0; j--) {
    if (!isOptional[j]) allOpt = false;
    tailOptional[j] = allOpt;
  }
  let pos = 0;
  const seg0 = segments[0] ?? '';
  if (seg0.length > 0) {
    if (s.indexOf(seg0, pos) !== pos) {
      throw new Error(`stringify: expected leading literal '${seg0}' in template body`);
    }
    pos += seg0.length;
  }
  for (let i = 0; i < captureNames.length; i++) {
    const nextSeg = segments[i + 1] ?? '';
    const capName = captureNames[i]!;
    if (i === captureNames.length - 1 && nextSeg.length === 0) {
      if (isOptional[i] && pos >= s.length) {
        captures[capName] = null;
      } else {
        captures[capName] = invertSlot(schema, capName, production, target, s.slice(pos));
        pos = s.length;
      }
      continue;
    }
    if (nextSeg.length === 0) {
      throw new Error(
        `stringify: empty separator between captures '${capName}' and '${captureNames[i + 1]}'`,
      );
    }
    const end = s.indexOf(nextSeg, pos);
    const nextIdx = i + 1;
    const nextIsTailOptional = nextIdx < captureNames.length && tailOptional[nextIdx];
    if (end < 0) {
      if (nextIsTailOptional) {
        captures[capName] = invertSlot(schema, capName, production, target, s.slice(pos));
        pos = s.length;
        for (let k = nextIdx; k < captureNames.length; k++) {
          captures[captureNames[k]!] = null;
        }
        // Skip to end — the rest of the captures are null.
        break;
      }
      throw new Error(`stringify: expected separator '${nextSeg}' after capture ${capName}`);
    }
    captures[capName] = invertSlot(schema, capName, production, target, s.slice(pos, end));
    pos = end + nextSeg.length;
  }
  if (pos !== s.length) {
    throw new Error(
      `stringify: trailing content not described by template body (pos ${pos} of ${s.length})`,
    );
  }
}

// Recursive slot helper. Mirrors emit/inverse.ts → emitNodeSlotHelper +
// emitMultiRoleSlotHelper + emitLeafSlotHelper. The behaviour depends on
// the span's `recursiveRoles`:
//   - 0 roles (leaf): primitive / array of primitives — pass-through.
//   - 1 role (recursive): dispatch through the child node's
//     per-(NodeType, target) dispatcher.
//   - 2+ roles (multi-role recursive): try each role in declared order,
//     first to succeed wins.
function invertSlot(
  schema: InferredSchema,
  capture: string,
  production: Production,
  target: string,
  value: unknown,
): unknown {
  const span = findSpanByName(production, capture);
  if (!span) {
    // Defensive fallback — validate.ts catches unknown captures.
    return invertLeafValue(value);
  }
  const roles = span.recursiveRoles;
  if (roles.length === 0) {
    return invertLeafValue(value);
  }
  if (roles.length === 1) {
    return invertNodeSlot(schema, roles[0]!, target, value);
  }
  return invertMultiRoleSlot(schema, roles, target, value);
}

function invertLeafValue(value: unknown): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const v of value) {
      const r = invertLeafValue(v);
      if (r != null) out.push(r);
    }
    return out;
  }
  return String(value);
}

function invertNodeSlot(
  schema: InferredSchema,
  role: string,
  target: string,
  value: unknown,
): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    // Re-invert strings through the role's dispatcher so html-target
    // captures (already rendered html) recurse back to source. If no
    // production accepts the shape, pass through (it's already source-
    // shaped for source-target captures).
    try {
      return dispatchNode(schema, role, target, value);
    } catch (_e) {
      return value;
    }
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const v of value) {
      const r = invertNodeSlot(schema, role, target, v);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof value === 'object') {
    return dispatchNode(schema, role, target, value);
  }
  return String(value);
}

function invertMultiRoleSlot(
  schema: InferredSchema,
  roles: ReadonlyArray<string>,
  target: string,
  value: unknown,
): unknown {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    for (const role of roles) {
      try {
        return dispatchNode(schema, role, target, value);
      } catch (_e) {
        /* try next */
      }
    }
    return value;
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    for (const v of value) {
      const r = invertMultiRoleSlot(schema, roles, target, v);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof value === 'object') {
    for (const role of roles) {
      try {
        return dispatchNode(schema, role, target, value);
      } catch (_e) {
        /* try next */
      }
    }
    throw new Error(
      `stringify: no role matched for multi-role capture (roles: ${roles.join(', ')}; value: ${safeStringify(value)})`,
    );
  }
  return String(value);
}

// --- Rebuild --------------------------------------------------------------

// Port of emit/rebuild.ts → emitOne + piecesToConcat + __rebuildSlot. Walks
// `production.spans` in declaration order, interpolating captured values
// between the span's source-position-bounded literal separators.
function rebuildSource(production: Production, captures: Record<string, unknown>): string {
  const input = production.source.input;
  type Piece =
    | { readonly kind: 'literal'; readonly text: string }
    | {
        readonly kind: 'slot';
        readonly ref: string;
        readonly optional: boolean;
        readonly joinSep: string;
      };
  const pieces: Piece[] = [];
  let cursor = 0;
  for (const span of production.spans) {
    const startOffset = findSpanStart(input, span, cursor);
    if (startOffset === null) {
      if (isAbsentAllowedSpan(span)) {
        pieces.push(contributionOf(span));
        continue;
      }
      throw new Error(
        `stringify: span '${span.name ?? span.text ?? '<unnamed>'}' not found in example '${truncate(input)}'`,
      );
    }
    const sepText = input.slice(cursor, startOffset);
    if (sepText.length > 0) {
      pieces.push({ kind: 'literal', text: canonicalSeparator(sepText) });
    }
    pieces.push(contributionOf(span));
    if (span.text) cursor = startOffset + span.text.length;
  }
  // Concat with optional-slot + preceding-literal fusion.
  let result = '';
  // We walk pieces and apply the same fusion rule emit/rebuild.ts does:
  // when an optional slot's captured value is null/undefined AND the
  // preceding piece is a literal, drop both. Otherwise the slot collapses
  // to "" but the literal stays.
  const built: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const p = pieces[i]!;
    if (p.kind === 'literal') {
      built.push(p.text);
      continue;
    }
    const raw = captures[p.ref];
    if (p.optional && (raw === null || raw === undefined)) {
      // Drop the preceding literal too (if any).
      if (built.length > 0 && pieces[i - 1] && pieces[i - 1]!.kind === 'literal') {
        built.pop();
      }
      continue;
    }
    built.push(rebuildSlotValue(raw, p.joinSep));
  }
  for (const s of built) result += s;
  return result;
}

function contributionOf(span: ResolvedSpan):
  | { readonly kind: 'literal'; readonly text: string }
  | {
      readonly kind: 'slot';
      readonly ref: string;
      readonly optional: boolean;
      readonly joinSep: string;
    } {
  const optional = isAbsentAllowedSpan(span);
  const joinSep = joinSeparatorOf(span);
  if (span.recursiveRoles.length > 0) {
    if (!span.name) throw new Error('stringify: recursive span without name');
    return { kind: 'slot', ref: span.name, optional, joinSep };
  }
  const isUntil = span.modifiers.some((m) => m.kind === 'until' || m.kind === 'rawUntil');
  if (isUntil) {
    if (!span.name) throw new Error('stringify: until-span without name');
    return { kind: 'slot', ref: span.name, optional, joinSep };
  }
  if (span.class !== 'literal') {
    if (!span.name) {
      throw new Error(`stringify: classed span without name (class '${span.class}')`);
    }
    return { kind: 'slot', ref: span.name, optional, joinSep };
  }
  if (span.name) return { kind: 'slot', ref: span.name, optional, joinSep };
  if (!span.text) throw new Error('stringify: unnamed literal span without text');
  return { kind: 'literal', text: span.text };
}

function joinSeparatorOf(span: ResolvedSpan): string {
  // Detect indent modifier first — indent-modified repeats spans join children
  // with '\n' (column-0 MVP; Task 7.7 will introduce per-level padding).
  const hasIndent = span.modifiers.some((m) => m.kind === 'indent');
  for (const m of span.modifiers) {
    if (m.kind === 'repeats') {
      if (hasIndent) return '\n';
      return m.sep === undefined ? ' ' : m.sep;
    }
  }
  return '';
}

// Coerces a captured value to its rebuilt-source string. Recursive children
// land here as already-rebuilt strings (the slot helper returned a string
// for nested object/template values). Arrays of children join with the
// span-declared separator. Primitives stringify naturally. null/undefined
// → "".
function rebuildSlotValue(v: unknown, joinSep: string): string {
  if (v === null || v === undefined) return '';
  if (Array.isArray(v)) {
    let out = '';
    for (let i = 0; i < v.length; i++) {
      if (i > 0 && joinSep.length > 0) out += joinSep;
      out += rebuildSlotValue(v[i], '');
    }
    return out;
  }
  return String(v);
}

// --- Helpers --------------------------------------------------------------

function findSpanByName(production: Production, name: string): ResolvedSpan | undefined {
  for (const span of production.spans) {
    if (span.name === name) return span;
  }
  return undefined;
}

function isAbsentAllowedSpan(span: ResolvedSpan): boolean {
  for (const m of span.modifiers) {
    if (m.kind === 'optional') return true;
    if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
  }
  return false;
}

function isOptionalCapture(production: Production, captureName: string): boolean {
  const span = findSpanByName(production, captureName);
  if (!span) return false;
  return isAbsentAllowedSpan(span);
}

function findSpanStart(input: string, span: ResolvedSpan, cursor: number): number | null {
  if (!span.text) return null;
  const idx = input.indexOf(span.text, cursor);
  return idx < 0 ? null : idx;
}

function canonicalSeparator(_separator: string): string {
  return ' ';
}

function truncate(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}

function safeStringify(v: unknown): string {
  try {
    const s = JSON.stringify(v);
    if (s === undefined) return String(v);
    return s.length <= 80 ? s : `${s.slice(0, 77)}...`;
  } catch (_e) {
    return String(v);
  }
}
