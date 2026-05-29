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
import type { InferredSchema, NodeTypeInfo, Production, ResolvedSpan } from '../model.ts';
import { syntheticKey } from './captures.ts';
import { INDENT_STEP_SPACES } from './rebuild.ts';
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
        builders.push(emitBuilder(info.name, i, target, entry.body, production));
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

function emitBuilder(
  nodeName: string,
  prodIdx: number,
  target: string,
  body: RenderBody,
  production: Production,
): string {
  const fnName = builderName(nodeName, prodIdx, target);
  const expr = emitBodyExpr(body, target, production);
  // `__indentCol` is the column at which THIS production's indent-modified
  // children's join lands. Default 0 keeps top-level entry points (the
  // public `render()` wrapper, the dispatcher, the dispatch table) calling
  // builders without an explicit indent. Non-indent productions ignore the
  // parameter; indent-modified productions use it to compute the dynamic
  // join separator and leading prefix for their indent slot (mirrors the
  // inverse rebuild pattern in emit/rebuild.ts — Task 7.7b — for the
  // forward direction).
  return `function ${fnName}(captures: any, __indentCol: number = 0): any {
  return ${expr};
}`;
}

function emitBodyExpr(body: RenderBody, target: string, production: Production): string {
  if (body === null) return 'null';
  if (typeof body === 'string') return jsString(body);
  if (typeof body === 'number') {
    if (!Number.isFinite(body)) return 'null';
    return String(body);
  }
  if (typeof body === 'boolean') return body ? 'true' : 'false';
  if (isStructureRef(body)) return emitRefExpr(body, target);
  if (isTemplate(body)) return emitTemplateExpr(body, target, production);
  if (Array.isArray(body)) {
    const items = body.map((child) => emitBodyExpr(child, target, production));
    return `[${items.join(', ')}]`;
  }
  const entries = Object.entries(body as Record<string, RenderBody>)
    .map(([key, value]) => `${jsObjectKey(key)}: ${emitBodyExpr(value, target, production)}`);
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
  // Pass `__indentCol` through unchanged — a bare span-value reference is
  // not itself joined by an indent separator; it just unwraps a recursive
  // child at the current column.
  if (ref.__ref === 'span-value') {
    return `__renderSlot_${jsIdent(target)}(${access}, __indentCol)`;
  }
  return access;
}

function emitTemplateExpr(template: Template, target: string, production: Production): string {
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
  //
  // Gap A — Forward template fusion for optional-absent slots: when a slot
  // references an .optional() / .repeats({min:0}) span and the captured
  // value is null/undefined, the preceding literal separator must be
  // suppressed too — otherwise the rendered output carries a dangling
  // separator. Mirrors the inverse rebuild fusion in emit/rebuild.ts.
  //
  // Gap B — Forward template joinSep for .repeats() arrays: when the slot
  // references a `.repeats()` span, the captured value at runtime is an
  // array. Without an explicit join, JS coerces via Array.prototype.toString
  // (comma-join). Emit an inline `Array.isArray(...) ? .map(...).join(<sep>)`
  // expression with the same join separator the rebuild path uses.
  const targetId = jsIdent(target);
  const parts = template.parts;
  const slots = template.slots;
  type LiteralPiece = { readonly kind: 'literal'; readonly text: string; readonly raw: string };
  type SlotPiece = {
    readonly kind: 'slot';
    readonly text: string;
    readonly optional: boolean;
    readonly access: string;
  };
  type Piece = LiteralPiece | SlotPiece;
  const pieces: Piece[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length > 0) pieces.push({ kind: 'literal', text: jsString(part), raw: part });
    if (i < slots.length) {
      const slot = slots[i]!;
      const access = `captures${memberAccess(slot.ref)}`;
      const span = findSpanByName(production, slot.ref);
      const optional = span !== undefined && isAbsentAllowedSpan(span);
      const repeats = span !== undefined ? repeatsJoinSeparator(span) : null;
      let slotExpr: string;
      if (repeats !== null) {
        if (repeats.isIndent) {
          // Indent-modified repeats span: dynamic per-level join + leading
          // prefix when nested. Mirrors the inverse rebuild pattern in
          // emit/rebuild.ts (Task 7.7b) for the forward direction. The
          // children render at __indentCol + INDENT_STEP_SPACES — they need
          // to know the column at which THEIR indent children will land if
          // they themselves contain indent spans.
          const childCol = `(__indentCol + ${INDENT_STEP_SPACES})`;
          const joinExpr = `("\\n" + " ".repeat(__indentCol))`;
          const leadingExpr = `(__indentCol > 0 ? "\\n" + " ".repeat(__indentCol) : "")`;
          slotExpr =
            `(Array.isArray(${access})`
            + ` ? ${leadingExpr} + ${access}.map((c: any) => __renderSlot_${targetId}(c, ${childCol})).join(${joinExpr})`
            + ` : (__renderSlot_${targetId}(${access}, ${childCol}) ?? ""))`;
        } else {
          // Array-of-children slot: per-child dispatch then join with the
          // span-declared separator. Fall back to the scalar path when the
          // capture isn't actually an array (e.g. .repeats({min:0}) with a
          // single child or a non-array sentinel). Non-indent slots pass
          // __indentCol unchanged so a child production that DOES have an
          // indent slot still receives the correct ambient column.
          const sepLit = jsString(repeats.sep);
          slotExpr =
            `(Array.isArray(${access})`
            + ` ? ${access}.map((c: any) => __renderSlot_${targetId}(c, __indentCol)).join(${sepLit})`
            + ` : (__renderSlot_${targetId}(${access}, __indentCol) ?? ""))`;
        }
      } else {
        slotExpr = `(__renderSlot_${targetId}(${access}, __indentCol) ?? "")`;
      }
      pieces.push({ kind: 'slot', text: slotExpr, optional, access });
    }
  }

  // Fuse optional-absent slots with their immediately-preceding literal
  // separator. When the captured value is null/undefined, both the literal
  // and the slot collapse to "". Only fuse when the preceding literal is
  // purely whitespace — i.e. acts as an inter-span separator (mirrors
  // rebuild's `canonicalSeparator` which collapses every inter-span gap to
  // a single space). Author-supplied non-whitespace literals (HTML tags,
  // brackets, structural punctuation) are kept verbatim around an absent
  // optional slot, matching the null-coalesce-only behaviour Fix 4
  // introduced.
  const fused: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!;
    if (piece.kind === 'literal') {
      fused.push(piece.text);
      continue;
    }
    if (!piece.optional) {
      fused.push(piece.text);
      continue;
    }
    const prevPiece = i > 0 ? pieces[i - 1] : undefined;
    const prevIsWhitespaceLiteral =
      prevPiece !== undefined
      && prevPiece.kind === 'literal'
      && prevPiece.raw.length > 0
      && /^\s+$/.test(prevPiece.raw);
    if (prevIsWhitespaceLiteral && fused.length > 0) {
      const sepLit = fused.pop()!;
      fused.push(`(${piece.access} == null ? "" : ${sepLit} + ${piece.text})`);
    } else {
      fused.push(`(${piece.access} == null ? "" : ${piece.text})`);
    }
  }

  if (fused.length === 0) return '""';
  if (fused.length === 1) return `String(${fused[0]})`;
  return fused.join(' + ');
}

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

// Returns a descriptor `{ sep, isIndent }` for `.repeats(...)` spans, or
// null when the span doesn't repeat. Mirrors the rebuild-side
// `joinSeparatorOf` in emit/rebuild.ts and the interpreter's stringify
// equivalent — keep all three in lockstep.
//
// Priority:
//   1. Indent-modified repeats span → callers compose a dynamic per-level
//      join expression `'\n' + ' '.repeat(__indentCol)` plus a leading
//      prefix when `__indentCol > 0`. The static `sep` field is unused
//      when `isIndent` is true (the caller builds the join inline). Task
//      7.7b added this threading on the inverse side; Phase 7 follow-up #1
//      ports it to the forward side so `render(input, {target:'source'})`
//      produces correctly indented multi-line output for indent-modified
//      schemas (e.g. yaml-block nested mappings/sequences).
//   2. `.repeats({ sep })` → declared inter-child separator that the parser
//      consumed between children — children's rebuilt source carries only
//      their own content, so we re-introduce the declared separator here.
//   3. `.repeats()` without `sep` → schema-level whitespace policy (single
//      space) between children.
function repeatsJoinSeparator(span: ResolvedSpan): { sep: string; isIndent: boolean } | null {
  const hasIndent = span.modifiers.some((m) => m.kind === 'indent');
  for (const m of span.modifiers) {
    if (m.kind === 'repeats') {
      if (hasIndent) return { sep: '\n', isIndent: true };
      return { sep: m.sep === undefined ? ' ' : m.sep, isIndent: false };
    }
  }
  return null;
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
      cases.push(`    case ${jsString(key)}: return ${fn}(captures, __indentCol);`);
    }
  }
  const id = jsIdent(target);
  return `function __dispatchRender_${id}(captures: any, __indentCol: number = 0): any {
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
  //
  // `__indentCol` is threaded through to the dispatcher (and to recursive
  // self-calls on arrays) so indent-modified builders downstream can
  // compute their per-level join and leading prefix. Default 0 keeps
  // legacy non-indent call sites unchanged.
  return `function __renderSlot_${id}(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_${id}(v[i], __indentCol));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_${id}(v, __indentCol);
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
  // `mode` is optional and only meaningful for packages whose generated
  // `__parse` accepts it (currently css's raws mode). Passing `undefined`
  // for non-css packages is a no-op — the inner __parse just falls back
  // to its default.
  //
  // Phase 5 Task 5.2 — Fused path: for any non-ast target whose root
  // production has a fused builder, parse-and-render happens in one walk
  // with zero AST allocation. `__renderFused` returns null whenever the
  // (root × target) pair is not eligible (no fused dispatch table, no
  // root entry, partial parse, or runtime failure); we then fall back to
  // the captures-based path so semantics stay identical. Task 5.3 closes
  // recursive-slot eligibility so the fast path covers full schemas.
  return `export function render(input: string, options?: { target?: string; mode?: ParseMode }): unknown {
  const target = options?.target ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.target or set defaultTarget on the schema");
  }
  if (target !== 'ast') {
    const fused = __renderFused(input, target);
    if (fused !== null) return fused;
  }
  const fn = __renderDispatch[target];
  if (!fn) {
    throw new Error("render: unknown target '" + target + "'");
  }
  const captures = options && options.mode ? __parse(input, { mode: options.mode }) : __parse(input);
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

// Exposed for the per-production parser body emitter in
// emit/v2/production.ts — it generates `__parse` and needs to stamp the
// same routing key onto each captures payload. Keep this in sync with the
// dispatcher's switch cases.
export function productionRoutingKey(production: Production, prodIdx: number): string {
  return productionKey(production.nodeType, prodIdx);
}
