// Structured-fused render emission — the AST/JSON/IR analog of the existing
// Template-fused source emission in ./fusion.ts. When a (production, target)
// pair has an object-literal body whose leaves are statically resolvable
// ($-refs into the production's spans, plus literals), we can emit one
// function that parses AND constructs the target object inline — no
// {__production, ...} captures object, no __dispatchRender_X walk.
//
// Eligibility (canFuseStructured): every leaf in the body is either a
// literal (string/number/boolean/null), a nested object/array of static
// leaves, or a $.ref to a span name on the production. Top-level body must
// be an object literal (so the produced value is unambiguously structured).
// Templates inside structured bodies are deferred — first cut treats them
// as fusion-ineligible; they go to the captures path.
//
// This module is split into:
//   - canFuseStructured: returns true when (production, target) is a
//     candidate, false otherwise.
//   - emitFusedRenderStructured: emits the structured-fused fn source (added
//     in a follow-up task).

import { isDynKey, isMerge, isStructureRef, isTemplate } from '@parser2/parser';
import type { RenderBody } from '@parser2/parser';
import type { InferredSchema, Production, ResolvedSpan } from '../../model.ts';
import { detectSharedDispatch } from './shared-dispatch.ts';
import { indent, jsIdent, jsString } from '../strings.ts';
import { computeRoleFirstBytes } from './role-ladder.ts';
import { computeKnownLeadingBytes, emitSpan, type SpanBindings, type SpanContext } from './span.ts';

export function canFuseStructured(
  production: Production,
  schema: InferredSchema,
  target: string,
): boolean {
  // Skip when the captures-path dispatcher for this relation already has
  // shared-dispatch optimizations (Path 1 + 2): emitting a structured fast
  // path with a serial-probe per-role dispatcher would lose the tag-routed
  // direct dispatch, costing more per-element than the captures→build walk
  // it replaces. Measured regression on HTML huge-page (~30 → ~42 ms) is
  // entirely from this case. Other schemas (CSS, markdown, ...) don't have
  // shared-dispatch, so structural fusion is a net win there.
  const info = schema.nodeTypes.get(production.nodeType);
  if (info && detectSharedDispatch(info) !== null) return false;
  // Phase 4a: recovery productions skip structured fusion. Two reasons:
  //   (1) They belong on the captures path where emitProduction pushes a
  //       Diagnostic onto state.diagnostics just before successful return.
  //       Replicating that push inside every structured-fused emit site
  //       would scatter the recovery hook across two backends.
  //   (2) Their dispatch order must be "tried last" relative to valid
  //       alts (so a normal-input ambiguity always prefers the
  //       well-formed shape). The structured-role dispatcher's
  //       longest-literal-prefix sort doesn't honor that.
  if (production.recovery !== undefined) return false;
  // Phase 4b: 'preserve' schemas need the captures payload's `__ws`
  // array to round-trip byte-exactly. The structured-fused path bypasses
  // the captures envelope and reconstructs the target value directly, so
  // there's no place to surface __ws. Fall through to the captures path
  // (it's slower but byte-exact). Recovery + preserve are the only two
  // skip conditions in the same code style.
  if (schema.whitespace === 'preserve') return false;
  // Phase 5f: a unary-prefix or binary-operator production's first span
  // is a class='operator' or recursive(self) which the structured-fusion
  // role-ladder analyzer can't handle. The Pratt path emits these
  // productions explicitly — fusion would only ever be a deopt anyway.
  if (info && schema.unaryProductions.has(production.nodeType)) {
    const unaryIdx = schema.unaryProductions.get(production.nodeType)!.prodIdx;
    const prodIdx = info.productions.indexOf(production);
    if (prodIdx === unaryIdx) return false;
  }
  if (info && schema.binaryProductions.has(production.nodeType)) {
    const binaryIdx = schema.binaryProductions.get(production.nodeType)!.prodIdx;
    const prodIdx = info.productions.indexOf(production);
    if (prodIdx === binaryIdx) return false;
  }

  const entry = production.renders.get(target);
  if (!entry) return false;
  const body = entry.body;
  // First-cut: require a top-level object literal so the produced value is
  // unambiguously structured. Top-level Templates are the existing string
  // fusion's domain; top-level scalars/refs/arrays are deferred.
  if (body === null || typeof body !== 'object') return false;
  if (isStructureRef(body)) return false;
  if (isTemplate(body)) return false;
  if (Array.isArray(body)) return false;
  const spanNames = new Set<string>();
  for (const span of production.spans) if (span.name) spanNames.add(span.name);
  return bodyIsStaticOrResolved(body, spanNames);
}

export type StructuredFusedOptions = {
  readonly nodeName: string;
  readonly prodIdx: number;
  readonly target: string;
};

/**
 * Emit a structured-fused render function or null when ineligible. The
 * function's signature is `(state: State) => unknown` — returns the
 * constructed target object on success, `null` on failure (with state.pos
 * rewound to the entry offset, mirroring the captures-path parse fn
 * contract).
 *
 * Recursive spans are supported: each span's recursive-role candidates must
 * themselves be structurally fusable for the same target (verified by
 * isRoleStructurallyFusable with cycle-detecting cache). On match, the
 * recursive span emits a repeats loop that calls per-role structured
 * dispatchers (emitted by the caller in emit/v2/index.ts).
 */
export function emitFusedRenderStructured(
  production: Production,
  schema: InferredSchema,
  opts: StructuredFusedOptions,
): string | null {
  if (!canFuseStructured(production, schema, opts.target)) return null;
  const cache = new Map<string, boolean>();
  for (const span of production.spans) {
    for (const role of span.recursiveRoles) {
      if (!isRoleStructurallyFusable(role, schema, opts.target, cache)) return null;
    }
  }
  const entry = production.renders.get(opts.target)!;

  const ctx = buildSpanContext(schema);
  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
    iwsExpr: new Map(),
  };

  const lines: string[] = [];
  lines.push(`const input = state.input;`);
  lines.push(`const len = state.len;`);
  lines.push(`let off = state.pos;`);
  lines.push(`const entryOff = off;`);
  lines.push(skipWsBlock());
  for (let i = 0; i < production.spans.length; i++) {
    const span = production.spans[i]!;
    if (i > 0) lines.push(skipWsBlock());
    if (span.recursiveRoles.length > 0) {
      lines.push(emitStructuredRecursiveSpan(span, opts.target, bindings, schema));
    } else {
      lines.push(emitSpan(span, ctx, bindings));
    }
  }
  lines.push(`state.pos = off;`);
  lines.push(`if (off > state.maxOff) state.maxOff = off;`);
  lines.push(`return ${emitStructuredBody(entry.body, bindings)};`);

  const fnName = `__fusedRenderStructured_${jsIdent(opts.nodeName)}_${opts.prodIdx}_${jsIdent(opts.target)}`;
  return `function ${fnName}(state: State): unknown {
${indent(lines.filter((l) => l !== '').join('\n'), 1)}
}`;
}

/**
 * Names of the per-role structured dispatcher and per-(production, target)
 * structured-fused fn. Exported so emit/v2/index.ts can use the SAME naming
 * when it generates the dispatcher (which calls each production's fused fn
 * in declaration order).
 */
export function structuredFnName(nodeName: string, prodIdx: number, target: string): string {
  return `__fusedRenderStructured_${jsIdent(nodeName)}_${prodIdx}_${jsIdent(target)}`;
}

export function structuredRoleDispatcherName(role: string, target: string): string {
  return `__fusedRenderStructuredDispatch_${jsIdent(role)}_${jsIdent(target)}`;
}

/**
 * Decide whether ALL productions of `role` can fuse structurally for
 * `target`. Cache results to avoid quadratic blow-up on mutually recursive
 * schemas. To break cycles we mark a role optimistically true on entry —
 * if any descendant proves it ineligible later, we overwrite the cache
 * entry before returning.
 */
export function isRoleStructurallyFusable(
  role: string,
  schema: InferredSchema,
  target: string,
  cache: Map<string, boolean>,
): boolean {
  const cached = cache.get(role);
  if (cached !== undefined) return cached;
  const info = schema.nodeTypes.get(role);
  if (!info || info.productions.length === 0) {
    cache.set(role, false);
    return false;
  }
  cache.set(role, true); // optimistic, breaks self-recursive cycles
  for (const prod of info.productions) {
    if (!canFuseStructured(prod, schema, target)) {
      cache.set(role, false);
      return false;
    }
    for (const span of prod.spans) {
      for (const childRole of span.recursiveRoles) {
        if (!isRoleStructurallyFusable(childRole, schema, target, cache)) {
          cache.set(role, false);
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Emit a recursive span — single dispatch or a repeats loop — that builds
 * an array of structured-fused child values bound under `span.name`. The
 * dispatcher calls the per-role structured dispatcher emitted separately;
 * we assume it exists for every role in span.recursiveRoles (the
 * eligibility walk above is the gate). The dispatch is first-byte-aware
 * so an HTML children loop at `</…` does NOT fall through into TextNode
 * (which would happily accept empty input and pollute the children array).
 */
function emitStructuredRecursiveSpan(
  span: ResolvedSpan,
  target: string,
  bindings: SpanBindings,
  schema: InferredSchema,
): string {
  const name = span.name;
  if (!name) throw new Error('emitStructuredRecursiveSpan: recursive span has no name');

  const repeats = span.modifiers.find((m) => m.kind === 'repeats') as
    | {
        readonly kind: 'repeats';
        readonly min?: number;
        readonly max?: number;
        readonly sep?: string;
        readonly stopBefore?: ReadonlyArray<string>;
        readonly trailing?: 'allowed' | 'required' | 'forbidden';
      }
    | undefined;
  const dispatch = emitFusedStructuredRoleDispatch(span.recursiveRoles, target, schema);

  if (!repeats) {
    // Non-repeats recursive span — single attempt, bound directly.
    bindings.valueExpr.set(name, name);
    return [
      `let ${name}: unknown = null;`,
      `{`,
      `  const __before = off;`,
      `  state.pos = off;`,
      `  let __cand: unknown = null;`,
      indent(dispatch, 1),
      `  ${name} = __cand;`,
      `  if (${name} === null) { off = __before; state.pos = __before; } else { off = state.pos; }`,
      `}`,
    ].join('\n');
  }

  bindings.valueExpr.set(name, name);
  const min = repeats.min ?? 0;
  const max = repeats.max;
  const sep = repeats.sep;
  const stopBefore = repeats.stopBefore;
  const trailing = repeats.trailing;

  const out: string[] = [];
  out.push(`const ${name}: unknown[] = [];`);
  if (sep !== undefined) {
    // Top-of-loop sweep — mirrors the captures-path repeats. `__sepConsumed`
    // tracks whether the MOST RECENT sweep consumed at least one sep, used
    // by the post-loop trailing-required/forbidden checks.
    out.push(`let __sepConsumed = false;`);
    out.push(`let __preSweep = off;`);
  }
  out.push(`while (true) {`);
  out.push(`  const __loopStart = off;`);
  if (sep !== undefined) {
    out.push(`  __preSweep = off;`);
    out.push(`  __sepConsumed = false;`);
    out.push(`  ${skipWsBlock()}`);
    out.push(`  while (${literalMatchExpr(sep, 'off')}) {`);
    out.push(`    __sepConsumed = true;`);
    out.push(`    off += ${sep.length};`);
    out.push(`    ${skipWsBlock()}`);
    out.push(`  }`);
  } else {
    out.push(`  ${skipWsBlock()}`);
  }
  if (stopBefore && stopBefore.length > 0) {
    out.push(`  if (off < len) {`);
    out.push(`    const __sb = input.charCodeAt(off);`);
    for (const stop of stopBefore) {
      out.push(`    if (__sb === ${stop.charCodeAt(0)} && input.startsWith(${jsString(stop)}, off)) break;`);
    }
    out.push(`  }`);
  }
  out.push(`  state.pos = off;`);
  out.push(`  let __cand: unknown = null;`);
  out.push(`  if (off < len) {`);
  out.push(indent(dispatch, 2));
  out.push(`  }`);
  out.push(`  if (__cand === null) break;`);
  out.push(`  ${name}.push(__cand);`);
  out.push(`  off = state.pos;`);
  out.push(`  if (off === __loopStart) break;`);
  out.push(`}`);
  if (sep !== undefined && trailing === 'forbidden') {
    // Rewind to before the trailing sep so the parent sees it.
    out.push(`if (__sepConsumed) { off = __preSweep; }`);
  }
  if (sep !== undefined && trailing === 'required') {
    out.push(`if (${name}.length > 0 && !__sepConsumed) { state.pos = entryOff; return null; }`);
  }
  if (min > 0) out.push(`if (${name}.length < ${min}) { state.pos = entryOff; return null; }`);
  if (max !== undefined) out.push(`if (${name}.length > ${max}) { state.pos = entryOff; return null; }`);
  return out.join('\n');
}

function emitFusedStructuredRoleDispatch(
  roles: ReadonlyArray<string>,
  target: string,
  schema: InferredSchema,
): string {
  // Mirror the captures-path role-ladder's first-byte gate so we DON'T
  // fall through into a fallthrough role (e.g. TextNode's `rawUntil`) when
  // the current byte clearly belongs to a byte-signatured role (e.g.
  // HtmlElement starts with `<`). Without this gate a children loop at
  // `</div>` would try Comment/Doctype/HtmlElement (all fail), then fall
  // through to TextNode which happily matches an empty string and pollutes
  // the children array with `{nodeName:'#text', value:''}`.
  const signatures = roles.map((role, idx) => {
    const info = schema.nodeTypes.get(role);
    if (!info) throw new Error(`emitFusedStructuredRoleDispatch: unknown role '${role}'`);
    return { ...computeRoleFirstBytes(role, info, schema.nodeTypes), role, declOrder: idx };
  });
  const byteRoles = signatures.filter((s) => !s.fallthrough && s.bytes.size > 0);
  const fallthroughRoles = signatures.filter((s) => s.fallthrough);

  // Group byte-roles by transitively-shared first bytes (so multi-byte
  // overlap still routes together).
  const visited = new Set<typeof byteRoles[number]>();
  const groups: Array<{ readonly bytes: Set<number>; readonly roles: typeof byteRoles }> = [];
  const byteToRoles = new Map<number, typeof byteRoles>();
  for (const sig of byteRoles) {
    for (const b of sig.bytes) {
      const bucket = byteToRoles.get(b) ?? [];
      bucket.push(sig);
      byteToRoles.set(b, bucket);
    }
  }
  for (const sig of byteRoles) {
    if (visited.has(sig)) continue;
    const group: typeof byteRoles = [];
    const bytes = new Set<number>();
    const queue: typeof byteRoles = [sig];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      group.push(cur);
      for (const b of cur.bytes) {
        bytes.add(b);
        const neighbors = byteToRoles.get(b) ?? [];
        for (const n of neighbors) if (!visited.has(n)) queue.push(n);
      }
    }
    groups.push({ bytes, roles: group });
  }

  // Stable: byte groups in declaration order (lowest declOrder wins).
  for (const g of groups) g.roles.sort((a, b) => a.declOrder - b.declOrder);
  groups.sort((a, b) => Math.min(...a.roles.map((r) => r.declOrder)) - Math.min(...b.roles.map((r) => r.declOrder)));

  const callExpr = (role: string) => `${structuredRoleDispatcherName(role, target)}(state)`;
  const probesFor = (rolesInGroup: ReadonlyArray<{ role: string }>): string =>
    rolesInGroup.map((r, i) => {
      const c = callExpr(r.role);
      return i === 0 ? `  __cand = ${c};` : `  if (__cand === null) __cand = ${c};`;
    }).join('\n');

  const lines: string[] = [];
  lines.push(`const __c0 = input.charCodeAt(off);`);

  // Match the captures-path role-ladder's switch threshold: when the total
  // arms count reaches DISPATCH_SWITCH_MIN_BYTES we emit a switch jump
  // table, otherwise a chained if/else. v2-regressions.test pins the shape.
  let totalBytes = 0;
  for (const g of groups) totalBytes += g.bytes.size;
  if (groups.length > 0 && totalBytes >= 4) {
    lines.push(`switch (__c0) {`);
    for (const g of groups) {
      const sortedBytes = [...g.bytes].sort((a, b) => a - b);
      const caseLabels = sortedBytes.map((b) => `  case ${b}:`).join('\n');
      lines.push(caseLabels);
      lines.push(`  {`);
      lines.push(probesFor(g.roles));
      lines.push(`    break;`);
      lines.push(`  }`);
    }
    if (fallthroughRoles.length > 0) {
      lines.push(`  default: {`);
      lines.push(probesFor(fallthroughRoles));
      lines.push(`    break;`);
      lines.push(`  }`);
    }
    lines.push(`}`);
  } else {
    const branches: string[] = [];
    for (const g of groups) {
      const cond = [...g.bytes].sort((a, b) => a - b).map((b) => `__c0 === ${b}`).join(' || ');
      branches.push(`if (${cond}) {\n${probesFor(g.roles)}\n}`);
    }
    if (fallthroughRoles.length > 0) {
      if (branches.length > 0) {
        branches.push(`{\n${probesFor(fallthroughRoles)}\n}`);
        lines.push(branches.join(' else '));
      } else {
        lines.push(probesFor(fallthroughRoles));
      }
    } else if (branches.length > 0) {
      lines.push(branches.join(' else '));
    }
  }
  return lines.join('\n');
}

function literalMatchExpr(text: string, offVar: string): string {
  if (text.length === 1) return `input.charCodeAt(${offVar}) === ${text.charCodeAt(0)}`;
  return `input.startsWith(${jsString(text)}, ${offVar})`;
}

// --- internal helpers ------------------------------------------------------

function buildSpanContext(schema: InferredSchema): SpanContext {
  const tokenClasses = new Set<string>();
  let cssIdent = false;
  for (const usage of schema.classes) {
    tokenClasses.add(usage.class);
    if (usage.class === 'ident' && usage.refinements.some((r) => r.name === 'css')) cssIdent = true;
  }
  const contentClasses = new Set<string>([
    'ident', 'number', 'hex', 'string', 'regex', 'template', 'operator',
  ]);
  const hasContentClass = schema.classes.some((c) => contentClasses.has(c.class));
  const emitUnknownCharsGuard = schema.unknownChars === 'reject' && hasContentClass;
  const lineCommentMarkers: string[] = [];
  for (const usage of schema.classes) {
    if (usage.class === 'comment') {
      for (const ref of usage.refinements) {
        if (ref.name === 'line' && Array.isArray(ref.args) && typeof ref.args[0] === 'string') {
          lineCommentMarkers.push(ref.args[0]);
        }
      }
    }
  }
  return {
    entryOffVar: 'entryOff',
    raws: false,
    tokens: tokenClasses,
    cssIdent,
    nodeTypes: schema.nodeTypes,
    emitUnknownCharsGuard,
    knownBytes: computeKnownLeadingBytes(schema),
    symbolPrefix: schema.symbolPrefix,
    operatorLiterals: schema.operatorLiterals,
    preserveWs: schema.whitespace === 'preserve',
    lineCommentMarkers,
  };
}

function emitStructuredBody(body: RenderBody, bindings: SpanBindings): string {
  if (body === null) return 'null';
  if (typeof body === 'string') return jsString(body);
  if (typeof body === 'number') return Number.isFinite(body) ? String(body) : 'null';
  if (typeof body === 'boolean') return body ? 'true' : 'false';
  if (isTemplate(body)) {
    // canFuseStructured rejects embedded Templates; we shouldn't get here.
    throw new Error('emitStructuredBody: embedded Template should have been rejected by canFuseStructured');
  }
  if (isStructureRef(body)) {
    const ref = body as { readonly name: string };
    const expr = bindings.valueExpr.get(ref.name);
    if (!expr) {
      // Same — eligibility guards against this. Defensive throw so codegen
      // bugs fail loud rather than silently emit `undefined`.
      throw new Error(`emitStructuredBody: span ref "${ref.name}" has no binding`);
    }
    return expr;
  }
  if (Array.isArray(body)) {
    return `[${body.map((c) => emitStructuredBody(c, bindings)).join(', ')}]`;
  }
  const entries = Object.entries(body as Record<string, RenderBody>)
    .map(([k, v]) => `${jsObjectKey(k)}: ${emitStructuredBody(v, bindings)}`);
  return `{ ${entries.join(', ')} }`;
}

function jsObjectKey(key: string): string {
  if (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)) return key;
  return jsString(key);
}

function skipWsBlock(): string {
  return `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;
}

function bodyIsStaticOrResolved(body: RenderBody, spanNames: ReadonlySet<string>): boolean {
  if (body === null) return true;
  if (typeof body === 'string' || typeof body === 'number' || typeof body === 'boolean') return true;
  // Embedded Templates (e.g. `name: tpl\`${$.a}-${$.b}\``) are deferred for
  // the first cut — those fields would need their own emission logic and
  // pull in slot semantics. Caller falls back to captures path.
  if (isTemplate(body)) return false;
  // dynKey / merge bodies have shape semantics the structured-fused
  // walker doesn't know about (computed-key allocation, Object.assign
  // accumulation). Fall back to the captures path — emit/render.ts
  // handles them there.
  if (isDynKey(body) || isMerge(body)) return false;
  if (isStructureRef(body)) {
    const ref = body as { readonly name?: string };
    return typeof ref.name === 'string' && spanNames.has(ref.name);
  }
  if (Array.isArray(body)) {
    for (const child of body) if (!bodyIsStaticOrResolved(child, spanNames)) return false;
    return true;
  }
  for (const value of Object.values(body as Record<string, RenderBody>)) {
    if (!bodyIsStaticOrResolved(value, spanNames)) return false;
  }
  return true;
}
