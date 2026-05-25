// Forward render emit. One emitter, three concerns:
//   1. Per-(production, target) builders   — `__build_<NodeType>_<idx>_<target>`
//   2. Per-target dispatchers              — `__dispatchRender_<target>` (switch on
//                                            captures.__production)
//   3. Public `render(input, options)`     — selects dispatcher by options.type
//                                            (or schema.defaultTarget)
//
// Discrimination:
//   The forward path receives a *captures* object from the parser (see
//   emit/captures.ts). The parser stamps `__production: "<NodeType>#<idx>"`
//   onto every captures object as the literal that the dispatcher's switch
//   discriminates on — NO value-shape inspection happens here. (The inverse
//   path, landing in Phase 4, has no production hint and has to discriminate
//   on value shape; that's a separate machinery.)
//
// Body shapes the builder handles (all structural — no domain assumptions):
//   - null / number / string / boolean   → JS literal (numbers honour NaN /
//                                          Infinity by emitting null)
//   - StructureRef (span-value, etc.)    → captures.<key> lookup. Synthetic
//                                          keys (gap/raw/tail/...) are
//                                          computed at parse time and stored
//                                          on captures by emit/captures.ts.
//   - Template                           → fused string concat with
//                                          __renderSlot dispatch on each
//                                          slot for recursive children
//   - array                              → array of recursive body exprs
//   - object                             → object literal of recursive body
//                                          exprs

import { isStructureRef, isTemplate, type RenderBody, type StructureRef, type Template } from '@parser2/parser';
import type { InferredSchema, NodeTypeInfo, Production } from '../model.ts';
import { syntheticKey } from './captures.ts';
import { jsString } from './strings.ts';

export function emitRender(schema: InferredSchema): string {
  const nodeTypes = [...schema.nodeTypes.values()];
  const targets = collectTargets(nodeTypes);

  const builders: string[] = [];
  for (const info of nodeTypes) {
    for (let i = 0; i < info.productions.length; i++) {
      const production = info.productions[i]!;
      for (const target of targets) {
        const entry = production.renders.get(target);
        if (!entry) {
          // validate.ts enforces per-target completeness; getting here
          // would mean a code path bypassed the validator.
          throw new Error(`render: production '${info.name}#${i}' missing target '${target}'`);
        }
        builders.push(emitBuilder(info.name, i, target, entry.body));
      }
    }
  }

  const dispatchers = targets.map((target) => emitDispatcher(target, nodeTypes));
  const slotHelpers = targets.map((target) => emitRenderSlotHelper(target));
  const renderDispatch = emitRenderDispatchTable(targets);
  const publicRender = emitPublicRender(schema.defaultTarget);
  const defaultTargetDecl = emitDefaultTarget(schema.defaultTarget);

  return [
    defaultTargetDecl,
    builders.join('\n\n'),
    dispatchers.join('\n\n'),
    slotHelpers.join('\n\n'),
    renderDispatch,
    publicRender,
  ].filter((p) => p !== '').join('\n\n');
}

// ---------------------------------------------------------------------------
// Target collection
// ---------------------------------------------------------------------------

function collectTargets(nodeTypes: ReadonlyArray<NodeTypeInfo>): ReadonlyArray<string> {
  const set = new Set<string>();
  for (const info of nodeTypes) {
    for (const production of info.productions) {
      for (const target of production.renders.keys()) set.add(target);
    }
  }
  return [...set].sort();
}

// ---------------------------------------------------------------------------
// Per-production builder
// ---------------------------------------------------------------------------

function emitBuilder(nodeName: string, prodIdx: number, target: string, body: RenderBody): string {
  const fnName = builderName(nodeName, prodIdx, target);
  const expr = emitBodyExpr(body, target);
  return `function ${fnName}(captures: any): any {
  return ${expr};
}`;
}

function emitBodyExpr(body: RenderBody, target: string): string {
  if (body === null) return 'null';
  if (typeof body === 'string') return jsString(body);
  if (typeof body === 'number') {
    if (!Number.isFinite(body)) return 'null';
    return String(body);
  }
  if (typeof body === 'boolean') return body ? 'true' : 'false';
  if (isStructureRef(body)) return emitRefExpr(body, target);
  if (isTemplate(body)) return emitTemplateExpr(body, target);
  if (Array.isArray(body)) {
    const items = body.map((child) => emitBodyExpr(child, target));
    return `[${items.join(', ')}]`;
  }
  const entries = Object.entries(body as Record<string, RenderBody>)
    .map(([key, value]) => `${jsObjectKey(key)}: ${emitBodyExpr(value, target)}`);
  return `{ ${entries.join(', ')} }`;
}

function emitRefExpr(ref: StructureRef, target: string): string {
  if (ref.__ref === 'span-presence') {
    const key = ref.name;
    return `(captures${memberAccess(key)} != null)`;
  }
  const key = syntheticKey(ref);
  const access = `captures${memberAccess(key)}`;
  // span-value may reference a recursive child or array of children. Route
  // it through __renderSlot_<target> so the dispatcher recurses (and so
  // arrays of children get per-child dispatch + target-specific joining).
  if (ref.__ref === 'span-value') {
    return `__renderSlot_${jsIdent(target)}(${access})`;
  }
  return access;
}

function emitTemplateExpr(template: Template, target: string): string {
  // Fused concat: seg0 + slot(captures.<a>) + seg1 + slot(captures.<b>) + ...
  // Each slot routes through __renderSlot_<target> so nested-capture and
  // array-of-children slots collapse to strings (per the target's slot
  // helper). Empty leading/trailing parts are skipped.
  //
  // Fix 4: in string-concat contexts (template body fusion), wrap each slot
  // in `(... ?? "")` so a null/undefined optional capture becomes "" rather
  // than the string "null"/"undefined". The slot helper itself still
  // passes null/undefined through for object/array body recursion (where
  // null is a legitimate property value), so we defensively coalesce at
  // the concat site.
  const parts = template.parts;
  const slots = template.slots;
  const pieces: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length > 0) pieces.push(jsString(part));
    if (i < slots.length) {
      const slot = slots[i]!;
      const access = `captures${memberAccess(slot.ref)}`;
      pieces.push(`(__renderSlot_${jsIdent(target)}(${access}) ?? "")`);
    }
  }
  if (pieces.length === 0) return '""';
  if (pieces.length === 1) return `String(${pieces[0]})`;
  return pieces.join(' + ');
}

// ---------------------------------------------------------------------------
// Per-target dispatcher
// ---------------------------------------------------------------------------

function emitDispatcher(target: string, nodeTypes: ReadonlyArray<NodeTypeInfo>): string {
  const cases: string[] = [];
  for (const info of nodeTypes) {
    for (let i = 0; i < info.productions.length; i++) {
      const key = productionKey(info.name, i);
      const fn = builderName(info.name, i, target);
      cases.push(`    case ${jsString(key)}: return ${fn}(captures);`);
    }
  }
  const id = jsIdent(target);
  return `function __dispatchRender_${id}(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target '${target}')");
  }
  switch (captures.__production) {
${cases.join('\n')}
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target '${target}'");
}`;
}

function emitRenderSlotHelper(target: string): string {
  const id = jsIdent(target);
  // Slot helper used by template and span-value refs. For non-captures
  // values it returns the raw value (callers concatenate). For captures
  // objects and arrays it routes through the per-target dispatcher.
  // String targets concatenate; structured targets keep arrays as-is.
  // Distinguishing string vs structured targets here would require a
  // target-shape compile-time decision; for now we ALWAYS preserve the
  // value type (arrays stay arrays unless joined by surrounding concat).
  return `function __renderSlot_${id}(v: any): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_${id}(v[i]));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_${id}(v);
  }
  return v;
}`;
}

// ---------------------------------------------------------------------------
// Public render() + dispatch table
// ---------------------------------------------------------------------------

function emitRenderDispatchTable(targets: ReadonlyArray<string>): string {
  // The table is keyed by target string. Each entry takes the *captures*
  // produced by the internal parse and returns the rendered value. Keeping
  // this as a plain object literal lets V8 inline single-target lookups.
  const entries = targets.map((target) => {
    const id = jsIdent(target);
    return `  ${jsString(target)}: (captures: any) => __dispatchRender_${id}(captures),`;
  }).join('\n');
  return `const __renderDispatch: Record<string, (captures: any) => any> = {
${entries}
};`;
}

function emitDefaultTarget(defaultTarget: string | undefined): string {
  return `const __defaultTarget: string | undefined = ${defaultTarget === undefined ? 'undefined' : jsString(defaultTarget)};`;
}

function emitPublicRender(_defaultTarget: string | undefined): string {
  // The constant `__defaultTarget` is emitted separately so the runtime
  // reads it as a plain identifier. No target name flows through the
  // compiler logic — the constant is the only mention.
  return `export function render(input: string, options?: { type?: string }): unknown {
  const target = options?.type ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.type or set defaultTarget on the schema");
  }
  const fn = __renderDispatch[target];
  if (!fn) {
    throw new Error("render: unknown target '" + target + "'");
  }
  const captures = __parse(input);
  return fn(captures);
}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function builderName(nodeName: string, prodIdx: number, target: string): string {
  return `__build_${jsIdent(nodeName)}_${prodIdx}_${jsIdent(target)}`;
}

export function productionKey(nodeName: string, prodIdx: number): string {
  return `${nodeName}#${prodIdx}`;
}

function jsObjectKey(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return key;
  return jsString(key);
}

function jsIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}

function memberAccess(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return `.${key}`;
  return `[${jsString(key)}]`;
}

// Exposed for the per-production parser body emitters in
// emit/scannerless/parse.ts and emit/v2/production.ts — they generate
// `__parse` and need to stamp the same routing key onto each captures
// payload. Keep this in sync with the dispatcher's switch cases.
export function productionRoutingKey(production: Production, prodIdx: number): string {
  return productionKey(production.nodeType, prodIdx);
}
