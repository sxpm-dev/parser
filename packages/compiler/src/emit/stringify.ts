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
  for (const info of nodeTypes) {
    for (const target of targets) {
      fns.push(emitNodeTargetFn(info, target));
    }
  }
  const dispatch = emitDispatch(schema, targets);
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

function emitNodeTargetFn(info: NodeTypeInfo, target: string): string {
  const fnName = `stringify_${info.name}_${jsId(target)}`;
  const productions = info.productions;
  if (productions.length === 1) {
    const production = productions[0]!;
    const tpl = pickTemplate(production, target);
    return `function ${fnName}(s: any): string {
  return ${emitConcat(tpl, target, production)};
}`;
  }
  const branches = productions.map((production) => {
    const tpl = pickTemplate(production, target);
    const guard = emitDiscriminator(production, productions);
    return `  if (${guard}) return ${emitConcat(tpl, target, production)};`;
  });
  return `function ${fnName}(s: any): string {
${branches.join('\n')}
  throw new Error("stringify: no production matches structure shape for node ${info.name} (target ${target})");
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

function emitDispatch(schema: InferredSchema, targets: ReadonlyArray<string>): string {
  const helpers = targets.map((target) => {
    const id = jsId(target);
    return `function __renderSlot_${id}(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) out += __renderSlot_${id}(v[i]);
    return out;
  }
  return stringify(v, { target: ${jsString(target)} });
}`;
  }).join('\n\n');

  // Build (typeValue -> nodeName) routing by enumerating every production.
  // A NodeType with N productions may contribute up to N distinct type
  // values (cron's CronField: wildcard / step / value / range). The
  // per-NodeType function does shape branching internally; the dispatcher
  // routes by type literal.
  const dispatchByTarget = targets.map((target) => {
    const branches: string[] = [];
    const seen = new Set<string>();
    for (const info of schema.nodeTypes.values()) {
      for (const production of info.productions) {
        const typeValue = structureTypeLiteral(production);
        if (typeValue === null) continue;
        if (seen.has(typeValue)) continue;
        seen.add(typeValue);
        branches.push(`    if (s.type === ${jsString(typeValue)}) return stringify_${info.name}_${jsId(target)}(s);`);
      }
    }
    return `  if (target === ${jsString(target)}) {
    if (typeof s !== "object" || s === null) throw new Error("stringify: structure must be an object");
${branches.join('\n')}
    throw new Error("stringify: no node type for structure.type='" + (s as any).type + "' under target='" + target + "'");
  }`;
  }).join('\n');

  return `export function stringify(s: unknown, options?: { target?: string }): string {
  const target = options?.target ?? "source";
${dispatchByTarget}
  throw new Error("stringify: unknown target '" + target + "'");
}

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

function emitDiscriminator(production: Production, all: ReadonlyArray<Production>): string {
  // Build a shape discriminator combining (a) literal-valued field equality
  // checks and (b) presence/absence checks for capture fields whose presence
  // differs across siblings. This uniquely identifies a production among
  // siblings sharing the same `type:` literal, even when discrimination
  // depends on capture-field shape (e.g. code-block with vs. without lang).
  const checks: string[] = [];
  checks.push(...literalFieldChecks(production));

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

function literalFieldChecks(production: Production): ReadonlyArray<string> {
  const s = production.structure;
  if (!(s && typeof s === 'object' && !Array.isArray(s) && !('__ref' in (s as object)))) {
    return [];
  }
  const checks: string[] = [];
  for (const [key, value] of Object.entries(s as Record<string, unknown>)) {
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
