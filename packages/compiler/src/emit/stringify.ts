import { isStructureRef, type StructureValue } from '@parser2/parser';
import {
  type InferredSchema,
  type NodeTypeInfo,
  type Production,
  type StringifyTemplate,
} from '../model.ts';
import { jsString } from './strings.ts';

// Emit a stringify implementation for one InferredSchema. Used by both
// scannerless and v2 emitters via their public-API generators. Output is
// pure ES — no parse-state, no runtime dependencies.
//
// Codegen strategy:
//   For each (NodeType, target) pair, emit `stringify_<NodeType>_<target>(s)`
//   that walks the template's parts/slots and returns the concatenated string.
//   Slots dispatch through a per-target helper `__renderSlot_<target>(v)` that
//   handles primitives, arrays, and recursive Structure children. The public
//   `stringify(s, opts)` switches on the runtime `target` value and on
//   `s.type` to find the right per-NodeType function.
//
// Domainlessness invariant:
//   The compiler never branches on target name strings. Target names enter
//   the compiler as opaque keys (collected from schema data) and exit as
//   string-literal arguments embedded in the generated dispatch table. The
//   generated file's `if (target === "html") { ... }` blocks are produced by
//   a loop over schema-collected target keys; they are data, not compiler
//   logic. See packages/compiler/test/templates.test.ts and the Task 16
//   acceptance grep.

export function emitStringify(schema: InferredSchema): string {
  const nodeTypes = [...schema.nodeTypes.values()];
  const targets = collectTargets(nodeTypes);
  const fns: string[] = [];
  // Map<targetId, Map<typeLiteral, perTypeFnName>> — populated by
  // emitNodeTargetFn and consumed by emitDispatch so the recursive
  // dispatcher can route directly to per-(NodeType, typeLiteral, target)
  // functions, bypassing the per-NodeType switch wrapper.
  const perTypeDispatch = new Map<string, Map<string, string>>();
  for (const target of targets) perTypeDispatch.set(jsId(target), new Map());
  for (const info of nodeTypes) {
    for (const target of targets) {
      fns.push(emitNodeTargetFn(info, target, perTypeDispatch.get(jsId(target))!));
    }
  }
  const dispatch = emitDispatch(targets, perTypeDispatch);
  return [fns.join('\n\n'), dispatch].join('\n\n');
}

function collectTargets(nodeTypes: ReadonlyArray<NodeTypeInfo>): ReadonlyArray<string> {
  const targets = new Set<string>();
  for (const info of nodeTypes) {
    for (const production of info.productions) {
      for (const t of production.stringifyTemplates) targets.add(t.target);
    }
  }
  const authored = [...targets].filter((t) => t !== 'source').sort();
  return ['source', ...authored];
}

function emitNodeTargetFn(
  info: NodeTypeInfo,
  target: string,
  perTypeOut: Map<string, string>,
): string {
  const fnName = `stringify_${info.name}_${jsId(target)}`;
  const productions = info.productions;
  // Partition productions by their structure.type literal. Productions sharing
  // a literal become a per-type function `stringify_<Node>_<typeId>_<target>`;
  // productions without a literal type fall back to a linear scan inside the
  // per-NodeType wrapper.
  //
  // Two layers fall out of this:
  //   1) Per-type functions only check fields needed to discriminate same-type
  //      siblings — for the common case (one production per type), the body
  //      is a single return.
  //   2) The recursive dispatcher (__dispatchStringify_<target>) routes
  //      directly from s.type to the per-type function, bypassing the
  //      per-NodeType wrapper's switch on s.type.
  const groups = new Map<string, Production[]>();
  const noType: Production[] = [];
  for (const production of productions) {
    const t = structureTypeLiteral(production);
    if (t === null) {
      noType.push(production);
      continue;
    }
    const list = groups.get(t);
    if (list) list.push(production);
    else groups.set(t, [production]);
  }

  const perTypeFns: string[] = [];
  const wrapperCases: string[] = [];
  for (const [typeLit, group] of groups) {
    const typeFnName = `stringify_${info.name}_${jsId(typeLit)}_${jsId(target)}`;
    perTypeFns.push(emitPerTypeFn(typeFnName, group, target, info.name, typeLit));
    perTypeOut.set(typeLit, typeFnName);
    wrapperCases.push(`    case ${jsString(typeLit)}: return ${typeFnName}(s);`);
  }

  const fallback = noType.length === 0
    ? ''
    : noType.map((production) => {
        const tpl = pickTemplate(production, target);
        const guard = emitDiscriminator(production, productions, { skipTypeField: false });
        return `  if (${guard}) return ${emitConcat(tpl, target, production)};`;
      }).join('\n') + '\n';

  // The per-NodeType wrapper exists for direct callers (e.g. tests that
  // import a single per-NodeType function). The hot path goes through the
  // per-target dispatcher and skips this wrapper.
  let wrapper: string;
  if (productions.length === 1 && wrapperCases.length === 1 && noType.length === 0) {
    const production = productions[0]!;
    const tpl = pickTemplate(production, target);
    wrapper = `function ${fnName}(s: any): string {
  return ${emitConcat(tpl, target, production)};
}`;
  } else {
    const switchBlock = wrapperCases.length === 0
      ? ''
      : `  switch (s.type) {
${wrapperCases.join('\n')}
  }
`;
    wrapper = `function ${fnName}(s: any): string {
${switchBlock}${fallback}  throw new Error("stringify: no production matches structure shape for node ${info.name} (target ${target})");
}`;
  }

  // Emit per-type fns only when there is more than one production overall
  // (single-production NodeTypes collapse to a direct wrapper) to avoid
  // pointless one-liner indirection.
  const useDedicatedPerTypeFns = productions.length > 1;
  if (!useDedicatedPerTypeFns) {
    // For the single-production case the dispatcher should target the
    // wrapper directly — it's already the optimal one-liner.
    perTypeOut.set([...groups.keys()][0]!, fnName);
    return wrapper;
  }
  return [...perTypeFns, wrapper].join('\n\n');
}

function emitPerTypeFn(
  fnName: string,
  group: ReadonlyArray<Production>,
  target: string,
  nodeName: string,
  typeLit: string,
): string {
  if (group.length === 1) {
    const production = group[0]!;
    const tpl = pickTemplate(production, target);
    return `function ${fnName}(s: any): string {
  return ${emitConcat(tpl, target, production)};
}`;
  }
  const branches = group.map((production) => {
    const tpl = pickTemplate(production, target);
    const guard = emitDiscriminator(production, group, { skipTypeField: true });
    return `  if (${guard}) return ${emitConcat(tpl, target, production)};`;
  }).join('\n');
  return `function ${fnName}(s: any): string {
${branches}
  throw new Error("stringify: no production matches structure shape for node ${nodeName} (target ${target}, type ${typeLit})");
}`;
}

function pickTemplate(production: Production, target: string): StringifyTemplate {
  const found = production.stringifyTemplates.find((t) => t.target === target);
  if (!found) {
    throw new Error(
      `stringify: production '${production.nodeType}' (example '${production.source.input.slice(0, 40)}') has no template for target '${target}'`,
    );
  }
  return found;
}

function emitConcat(template: StringifyTemplate, target: string, production: Production): string {
  const helper = `__renderSlot_${jsId(target)}`;
  const accessByRef = buildAccessMap(production);
  const literalByRef = buildLiteralMap(production);
  // Walk left-to-right. For each slot whose `optional` flag is set, fuse
  // the preceding part (typically a separator) with the slot into a single
  // ternary: when the runtime value is null/undefined, both the separator
  // and the slot collapse to "". This keeps round-trip clean for inputs
  // that omit optional spans.
  const pieces: string[] = [];
  for (let i = 0; i < template.parts.length; i++) {
    const part = template.parts[i]!;
    const slot = i < template.slots.length ? template.slots[i]! : null;
    if (slot && slot.optional) {
      const valueExpr = slotValueExpr(slot, accessByRef, literalByRef);
      const slotExpr = slotEmitExpr(slot, helper, accessByRef, literalByRef);
      const sepExpr = part.length > 0 ? jsString(part) : '""';
      pieces.push(`(${valueExpr} == null ? "" : ${sepExpr} + ${slotExpr})`);
      continue;
    }
    if (part.length > 0) pieces.push(jsString(part));
    if (slot) {
      pieces.push(slotEmitExpr(slot, helper, accessByRef, literalByRef));
    }
  }
  if (pieces.length === 0) return '""';
  return pieces.join(' + ');
}

function slotEmitExpr(
  slot: { readonly ref: string },
  helper: string,
  accessByRef: ReadonlyMap<string, string>,
  literalByRef: ReadonlyMap<string, string>,
): string {
  const access = accessByRef.get(slot.ref);
  if (access !== undefined) return `${helper}(${access})`;
  const literal = literalByRef.get(slot.ref);
  if (literal !== undefined) return jsString(literal);
  return '""';
}

function slotValueExpr(
  slot: { readonly ref: string },
  accessByRef: ReadonlyMap<string, string>,
  literalByRef: ReadonlyMap<string, string>,
): string {
  const access = accessByRef.get(slot.ref);
  if (access !== undefined) return access;
  const literal = literalByRef.get(slot.ref);
  if (literal !== undefined) return jsString(literal);
  return 'undefined';
}

function buildAccessMap(production: Production): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  walk(production.structure, 's', map);
  return map;
}

function walk(value: StructureValue, access: string, out: Map<string, string>): void {
  if (value === null) return;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return;
  if (isStructureRef(value)) {
    if (value.__ref === 'span-value') {
      if (!out.has(value.name)) out.set(value.name, access);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      walk(value[i]!, `${access}[${i}]`, out);
    }
    return;
  }
  for (const [key, child] of Object.entries(value as Record<string, StructureValue>)) {
    walk(child, `${access}[${jsString(key)}]`, out);
  }
}

function buildLiteralMap(production: Production): ReadonlyMap<string, string> {
  const map = new Map<string, string>();
  for (const span of production.spans) {
    if (span.name && span.class === 'literal' && span.text) {
      map.set(span.name, span.text);
    }
  }
  return map;
}

function emitDispatch(
  targets: ReadonlyArray<string>,
  perTypeDispatch: ReadonlyMap<string, ReadonlyMap<string, string>>,
): string {
  // Per-target dispatcher: routes a Structure value to the right per-type
  // function via a single switch on s.type. This is the hot path — every
  // recursive child render goes through here (see __renderSlot_<target>
  // below). Hoisting the switch out of the public stringify() wrapper means
  // we pay one type-string compare per node instead of also paying a
  // target-string compare every recursion. Routing to per-type functions
  // (rather than per-NodeType functions) means we avoid a second switch on
  // the same s.type inside the per-NodeType wrapper.
  const perTargetDispatchers = targets.map((target) => {
    const id = jsId(target);
    const cases: string[] = [];
    const typeToFn = perTypeDispatch.get(id);
    if (typeToFn) {
      for (const [typeValue, fnName] of typeToFn) {
        cases.push(`    case ${jsString(typeValue)}: return ${fnName}(s);`);
      }
    }
    return `function __dispatchStringify_${id}(s: any): string {
  if (typeof s !== "object" || s === null) throw new Error("stringify: structure must be an object");
  switch (s.type) {
${cases.join('\n')}
  }
  throw new Error("stringify: no node type for structure.type='" + (s as any).type + "' under target='${target}'");
}`;
  }).join('\n\n');

  const helpers = targets.map((target) => {
    const id = jsId(target);
    if (target === 'json-auto') {
      // Variant B: AST-shape autopilot. Each production template emits a full
      // JSON object including its outer braces, so arrays bracket-wrap and
      // comma-separate normally. Strings are fully JSON-quoted (slot helper
      // adds both the quotes and the escapes), matching the synthesizer's
      // assumption that `${$.name}` interpolates as a complete JSON value.
      return `function __renderSlot_${id}(v: any): string {
  if (v === null || v === undefined) return "null";
  const t = typeof v;
  if (t === "string") return __jsonString(v);
  if (t === "number") return Number.isFinite(v) ? String(v) : "null";
  if (t === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    let out = "[" + __renderSlot_${id}(v[0]);
    for (let i = 1; i < v.length; i++) out += "," + __renderSlot_${id}(v[i]);
    return out + "]";
  }
  return __dispatchStringify_${id}(v);
}`;
    }
    if (target === 'json') {
      // Variant A: author-written custom-shape JSON. Strings interpolate as
      // JSON-escaped *content* only — the author writes the surrounding "..."
      // themselves in the template literal, which is what lets composite keys
      // ("@media screen") and selector-as-key shapes ({"\.foo": {...}}) be
      // expressed. Arrays comma-join *without* brackets, and pieces that
      // render to "" are skipped (comments collapse without leaving a `,,`).
      // The parent template chooses whether to wrap with `{...}`, `[...]`, or
      // neither.
      return `function __renderSlot_${id}(v: any): string {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string") return __jsonEscapeInner(v);
  if (t === "number") return Number.isFinite(v) ? String(v) : "null";
  if (t === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    let out = "";
    let first = true;
    for (let i = 0; i < v.length; i++) {
      const piece = __renderSlot_${id}(v[i]);
      if (piece === "") continue;
      if (!first) out += ",";
      out += piece;
      first = false;
    }
    return out;
  }
  return __dispatchStringify_${id}(v);
}`;
    }
    return `function __renderSlot_${id}(v: any): string {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string") return v;
  if (t === "number") return String(v);
  if (t === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) out += __renderSlot_${id}(v[i]);
    return out;
  }
  return __dispatchStringify_${id}(v);
}`;
  }).join('\n\n');

  const needsJsonString = targets.includes('json-auto');
  const needsJsonInner = targets.includes('json');
  const jsonStringHelper = needsJsonString
    ? `
const __JSON_STRING_SAFE = /^[\\x20-\\x21\\x23-\\x5b\\x5d-\\x7e]*$/;
function __jsonString(s: string): string {
  return __JSON_STRING_SAFE.test(s) ? '"' + s + '"' : JSON.stringify(s);
}
`
    : '';
  const jsonInnerHelper = needsJsonInner
    ? `
const __JSON_INNER_SAFE = /^[\\x20-\\x21\\x23-\\x5b\\x5d-\\x7e]*$/;
function __jsonEscapeInner(s: string): string {
  if (__JSON_INNER_SAFE.test(s)) return s;
  const wrapped = JSON.stringify(s);
  return wrapped.slice(1, wrapped.length - 1);
}
`
    : '';

  const publicBranches = targets.map((target) => {
    const id = jsId(target);
    return `  if (target === ${jsString(target)}) return __dispatchStringify_${id}(s as any);`;
  }).join('\n');

  return `${perTargetDispatchers}

export function stringify(s: unknown, options?: { target?: string }): string {
  const target = options?.target ?? "source";
${publicBranches}
  throw new Error("stringify: unknown target '" + target + "'");
}
${jsonStringHelper}${jsonInnerHelper}
${helpers}`;
}

function structureTypeLiteral(production: Production): string | null {
  const s = production.structure;
  if (s && typeof s === 'object' && !Array.isArray(s) && !('__ref' in (s as object))) {
    const t = (s as Record<string, unknown>).type;
    if (typeof t === 'string') return t;
  }
  return null;
}

function emitDiscriminator(
  production: Production,
  all: ReadonlyArray<Production>,
  options: { readonly skipTypeField: boolean } = { skipTypeField: false },
): string {
  // Build a shape discriminator combining (a) literal-valued field equality
  // checks and (b) presence/absence checks for capture fields whose presence
  // differs across siblings. This uniquely identifies a production among
  // siblings sharing the same `type:` literal, even when discrimination
  // depends on capture-field shape (e.g. code-block with vs. without lang).
  //
  // When the caller has already discriminated by `s.type` via an outer
  // switch, set skipTypeField=true so we don't re-emit `s.type === '...'`
  // and don't emit presence checks for fields that only differ across
  // unrelated types.
  const checks: string[] = [];
  checks.push(...literalFieldChecks(production, options.skipTypeField));

  // Compute the union of all sibling fields excluding this production's
  // literal fields (already covered above).
  const myFields = new Set(structureFieldNames(production));
  const allSiblingFields = new Set<string>();
  for (const other of all) {
    if (other === production) continue;
    for (const f of structureFieldNames(other)) allSiblingFields.add(f);
  }
  const myLiteralFields = new Set(literalFieldNames(production));
  for (const field of new Set([...myFields, ...allSiblingFields])) {
    if (myLiteralFields.has(field)) continue; // value check already emitted
    if (options.skipTypeField && field === 'type') continue;
    const inMine = myFields.has(field);
    let presentInAllSiblings = true;
    let absentInAllSiblings = true;
    for (const other of all) {
      if (other === production) continue;
      const has = structureFieldNames(other).includes(field);
      if (has) absentInAllSiblings = false;
      else presentInAllSiblings = false;
    }
    if (inMine && !presentInAllSiblings) {
      checks.push(`s[${jsString(field)}] !== undefined`);
    } else if (!inMine && !absentInAllSiblings) {
      checks.push(`s[${jsString(field)}] === undefined`);
    }
  }
  if (checks.length === 0) return 'true';
  return checks.join(' && ');
}

function literalFieldNames(production: Production): ReadonlyArray<string> {
  const s = production.structure;
  if (!(s && typeof s === 'object' && !Array.isArray(s) && !('__ref' in (s as object)))) return [];
  const out: string[] = [];
  for (const [key, value] of Object.entries(s as Record<string, unknown>)) {
    if (
      value === null
      || typeof value === 'string'
      || typeof value === 'number'
      || typeof value === 'boolean'
    ) {
      out.push(key);
    }
  }
  return out;
}

function literalFieldChecks(production: Production, skipTypeField: boolean = false): ReadonlyArray<string> {
  const s = production.structure;
  if (!(s && typeof s === 'object' && !Array.isArray(s) && !('__ref' in (s as object)))) {
    return [];
  }
  const checks: string[] = [];
  for (const [key, value] of Object.entries(s as Record<string, unknown>)) {
    if (skipTypeField && key === 'type') continue;
    if (value === null) {
      checks.push(`s[${jsString(key)}] === null`);
    } else if (typeof value === 'string') {
      checks.push(`s[${jsString(key)}] === ${jsString(value)}`);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      checks.push(`s[${jsString(key)}] === ${String(value)}`);
    }
    // Skip $ refs and nested objects/arrays — those carry capture data.
  }
  return checks;
}

function structureFieldNames(production: Production): ReadonlyArray<string> {
  const s = production.structure;
  if (s && typeof s === 'object' && !Array.isArray(s) && !('__ref' in (s as object))) {
    return Object.keys(s as Record<string, unknown>);
  }
  return [];
}

function jsId(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, '_');
}
