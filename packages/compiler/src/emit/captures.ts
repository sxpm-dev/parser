// Captures-shape emit. Replaces the deleted emit/structure.ts.
//
// The parser body produces a *captures* object — a flat dict keyed by span
// name plus synthetic keys for every $.gap / $.raw / $.endsWith / $.tail /
// $.commentLeft / $.commentRight ref any render body references. It also
// carries `__production: "<NodeType>#<prodIdx>"` so the per-target render
// dispatcher can route without re-discriminating on value shape.
//
// All forward target emit (`__build_<NodeType>_<prodIdx>_<target>` in
// emit/render.ts) reads from this captures object. The 'ast' builder
// reconstructs the AST shape; other builders project the captures into
// whatever shape their body declares.
//
// Synthetic capture keys are stable and addressable by structure refs:
//   span-gap      from a to b   →  captures.__gap_<a>_<b>
//   span-raw      x             →  captures.__raw_<x>
//   span-tail     from a        →  captures.__tail_<a>
//   span-ends-with x suffix     →  captures.__endsWith_<x>_<jsId(suffix)>
//   span-comment-left  x        →  captures.__commentLeft_<x>
//   span-comment-right x        →  captures.__commentRight_<x>
// Span values land at captures.<spanName> as-is; span-presence reads
// captures.<spanName> != null.

import { isDynKey, isMerge, isStructureRef, isTemplate, type RenderBody, type StructureRef } from '@parser2/parser';
import type { InverseIR, Production } from '../model.ts';
import { jsString } from './strings.ts';

export type CapturesBindings = {
  // For each named span, the JS expression that evaluates to its captured
  // value. Optional spans bind a `value | null` expression.
  readonly valueExpr: ReadonlyMap<string, string>;
  // For each named span, JS expressions that evaluate to the source-offset
  // of the start and end of the consumed region. Used by $.gap / $.raw /
  // $.tail / $.endsWith / $.commentLeft / $.commentRight.
  readonly startOffExpr: ReadonlyMap<string, string>;
  readonly endOffExpr: ReadonlyMap<string, string>;
};

export type CapturesEmitOptions = {
  // When true, synthetic refs that appear *only* inside a top-level `raws`
  // subfield of the ast body are skipped. Mirrors the legacy fast-variant
  // behaviour where raws-only refs were not computed.
  readonly omitRaws?: boolean;
};

// Emit the captures-object expression returned by one production's parser
// function. The expression is a single object literal:
//   { __production: "Node#0", spanA: vA, spanB: vB, __gap_a_b: ... }
//
// prodKey is the routing string the render dispatcher switches on. It must
// be unique within a generated parser file — `${nodeType}#${prodIdx}` is
// the scheme used by emit/render.ts.
export function emitCapturesExpr(
  production: Production,
  prodKey: string,
  bindings: CapturesBindings,
  options: CapturesEmitOptions = {},
): string {
  const fields: string[] = [`__production: ${jsString(prodKey)}`];
  for (const span of production.spans) {
    if (!span.name) continue;
    const expr = bindings.valueExpr.get(span.name);
    if (expr === undefined) continue;
    fields.push(`${jsObjectKey(span.name)}: ${expr}`);
  }
  const refs = collectAllRefs(production, options);
  for (const ref of refs) {
    const key = syntheticKey(ref);
    const expr = emitRefExpr(ref, bindings);
    if (expr === null) continue;
    fields.push(`${jsObjectKey(key)}: ${expr}`);
  }
  return `{ ${fields.join(', ')} }`;
}

// Phase 5a — lazy span value capture.
//
// Returns the set of span names whose VALUE must be captured into the
// captures payload. A span's value is "referenced" when any (forward) render
// body or any derived inverse IR reads it back:
//   - $.name           (span-value)    →  captures.<name>
//   - $.name.present   (span-presence) →  captures.<name> != null check
//   - dynKey({key: $.k})              →  key string read from captures.k
//   - merge($.arr)                    →  array read from captures.arr
//   - Template slot for name           →  captures.<name>
//   - inverseDerived references        →  rebuild reads captures.<name>
//
// Synthetic refs (span-gap / span-raw / span-tail / span-ends-with /
// span-comment-left / span-comment-right) DO NOT pull a span's value —
// they derive a slice from the source-offset locals via collectOffsetRefs.
// A span whose name appears ONLY behind a synthetic ref can safely skip
// the value slice while keeping its start/end offset locals alive.
//
// The forward emitter uses this set to decide whether to materialise
// `const <name> = input.slice(...)` for class spans and
// `const <name> = "<literal>"` for literal spans. When the name is absent
// from this set, the captures-payload emit also drops the field
// (bindings.valueExpr is never set for it).
export function computeReferencedSpanValues(production: Production): ReadonlySet<string> {
  const set = new Set<string>();
  for (const entry of production.renders.values()) {
    walkBodyForValues(entry.body, set);
    if (entry.inverseDerived !== undefined) walkInverseForValues(entry.inverseDerived, set);
  }
  return set;
}

function walkBodyForValues(body: RenderBody, set: Set<string>): void {
  if (body === null) return;
  if (typeof body !== 'object') return;
  if (isStructureRef(body)) {
    if (body.__ref === 'span-value' || body.__ref === 'span-presence') {
      set.add(body.name);
    }
    return;
  }
  if (isTemplate(body)) {
    for (const slot of body.slots) set.add(slot.ref);
    return;
  }
  if (isDynKey(body)) {
    if (body.key.__ref === 'span-value') set.add(body.key.name);
    walkBodyForValues(body.value, set);
    return;
  }
  if (isMerge(body)) {
    if (body.array.__ref === 'span-value') set.add(body.array.name);
    return;
  }
  if (Array.isArray(body)) {
    for (const item of body) walkBodyForValues(item, set);
    return;
  }
  for (const child of Object.values(body as Record<string, RenderBody>)) {
    walkBodyForValues(child, set);
  }
}

function walkInverseForValues(ir: InverseIR, set: Set<string>): void {
  switch (ir.kind) {
    case 'ref':
      set.add(ir.capture);
      return;
    case 'dynKey':
      set.add(ir.keyCapture);
      walkInverseForValues(ir.value, set);
      return;
    case 'merge':
      set.add(ir.arrayCapture);
      return;
    case 'template':
      for (const c of ir.captures) set.add(c);
      return;
    case 'object':
      for (const f of ir.fields) {
        if (f.kind === 'inverse') walkInverseForValues(f.inverse, set);
      }
      return;
    case 'array':
      for (const e of ir.elements) walkInverseForValues(e, set);
      return;
    case 'scalar':
      return;
  }
}

// Returns the set of span-offset names the parser must materialise for the
// production's captures to be computable. Includes any span whose name is
// referenced by a synthetic ref (gap / raw / tail / endsWith / comments).
//
// Used by the v2 emitter to know which spans need
// __<name>_start / __<name>_end locals.
export function collectOffsetRefs(
  production: Production,
  options: CapturesEmitOptions = {},
  refs: Set<string> = new Set(),
): ReadonlySet<string> {
  for (const ref of collectAllRefs(production, options)) {
    switch (ref.__ref) {
      case 'span-gap':
        refs.add(ref.from);
        refs.add(ref.to);
        break;
      case 'span-tail':
        refs.add(ref.from);
        break;
      case 'span-raw':
      case 'span-ends-with':
      case 'span-comment-left':
      case 'span-comment-right':
        refs.add(ref.name);
        break;
      default:
        break;
    }
  }
  return refs;
}

// Walks every render body declared on `production` and returns the
// deduplicated synthetic refs. Used by both captures emission (to populate
// captures.<synthetic>) and forward render emit (to know which captures key
// to read).
function collectAllRefs(
  production: Production,
  options: CapturesEmitOptions,
): ReadonlyArray<StructureRef> {
  const seen = new Map<string, StructureRef>();
  for (const entry of production.renders.values()) {
    walkBody(entry.body, seen, options, /* insideRaws */ false);
  }
  return [...seen.values()];
}

function walkBody(
  body: RenderBody,
  seen: Map<string, StructureRef>,
  options: CapturesEmitOptions,
  insideRaws: boolean,
): void {
  if (body === null) return;
  if (typeof body === 'string' || typeof body === 'number' || typeof body === 'boolean') return;
  if (isTemplate(body)) return;
  if (isStructureRef(body)) {
    if (insideRaws && options.omitRaws) return;
    if (body.__ref === 'span-value' || body.__ref === 'span-presence') return;
    const key = syntheticKey(body);
    if (!seen.has(key)) seen.set(key, body);
    return;
  }
  if (Array.isArray(body)) {
    for (const item of body) walkBody(item, seen, options, insideRaws);
    return;
  }
  for (const [key, child] of Object.entries(body as Record<string, RenderBody>)) {
    const childInsideRaws = insideRaws || key === 'raws';
    walkBody(child, seen, options, childInsideRaws);
  }
}

export function syntheticKey(ref: StructureRef): string {
  switch (ref.__ref) {
    case 'span-value':
      return ref.name;
    case 'span-presence':
      return ref.name;
    case 'span-gap':
      return `__gap_${jsIdent(ref.from)}_${jsIdent(ref.to)}`;
    case 'span-tail':
      return `__tail_${jsIdent(ref.from)}`;
    case 'span-raw':
      return `__raw_${jsIdent(ref.name)}`;
    case 'span-ends-with':
      return `__endsWith_${jsIdent(ref.name)}_${jsIdent(ref.suffix)}`;
    case 'span-comment-left':
      return `__commentLeft_${jsIdent(ref.name)}`;
    case 'span-comment-right':
      return `__commentRight_${jsIdent(ref.name)}`;
  }
}

function emitRefExpr(ref: StructureRef, bindings: CapturesBindings): string | null {
  switch (ref.__ref) {
    case 'span-value':
    case 'span-presence':
      return null;
    case 'span-gap': {
      const fromEnd = bindings.endOffExpr.get(ref.from);
      const toStart = bindings.startOffExpr.get(ref.to);
      if (!fromEnd || !toStart) {
        throw new Error(`captures: $.gap('${ref.from}', '${ref.to}') — unknown span`);
      }
      return `state.input.slice(${fromEnd}, ${toStart})`;
    }
    case 'span-tail': {
      const fromEnd = bindings.endOffExpr.get(ref.from);
      if (!fromEnd) throw new Error(`captures: $.tail('${ref.from}') — unknown span`);
      return `state.input.slice(${fromEnd}, __endOff)`;
    }
    case 'span-raw': {
      const startExpr = bindings.startOffExpr.get(ref.name);
      const endExpr = bindings.endOffExpr.get(ref.name);
      if (!startExpr || !endExpr) throw new Error(`captures: $.raw('${ref.name}') — unknown span`);
      return `state.input.slice(${startExpr}, ${endExpr})`;
    }
    case 'span-ends-with': {
      const endExpr = bindings.endOffExpr.get(ref.name);
      if (!endExpr) throw new Error(`captures: $.endsWith('${ref.name}', ...) — unknown span`);
      const lit = jsString(ref.suffix);
      return `(state.input.slice(${endExpr} - ${ref.suffix.length}, ${endExpr}) === ${lit})`;
    }
    case 'span-comment-left': {
      const startExpr = bindings.startOffExpr.get(ref.name);
      const endExpr = bindings.endOffExpr.get(ref.name);
      if (!startExpr || !endExpr) throw new Error(`captures: $.commentLeft('${ref.name}') — unknown span`);
      return `commentLeft(state.input.slice(${startExpr}, ${endExpr}))`;
    }
    case 'span-comment-right': {
      const startExpr = bindings.startOffExpr.get(ref.name);
      const endExpr = bindings.endOffExpr.get(ref.name);
      if (!startExpr || !endExpr) throw new Error(`captures: $.commentRight('${ref.name}') — unknown span`);
      return `commentRight(state.input.slice(${startExpr}, ${endExpr}))`;
    }
  }
}

function jsObjectKey(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return key;
  return jsString(key);
}

function jsIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}
