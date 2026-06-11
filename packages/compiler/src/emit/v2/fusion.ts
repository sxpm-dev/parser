// Phase 5 — Fused parse+render emitter.
//
// For each (production, non-ast target) pair whose render body is a Template,
// emit a function:
//
//   function __fusedRender_<NodeType>_<prodIdx>_<target>(state, out): boolean
//
// The function walks the input bytes the same way the parser does, but on
// success writes the rendered string fragments directly into `out` (a string
// array the caller joins). No intermediate captures object is allocated.
// On failure the state is rewound (the underlying span emit already restores
// `state.pos` to the saved entry offset before returning null) and the
// function returns false.
//
// Eligibility (Task 5.3): a production is eligible when
//   - its body is a Template,
//   - every non-recursive slot resolves to a span on this production, and
//   - every recursive slot references roles whose productions are ALL
//     transitively eligible for the same target.
// The third clause was deferred in Task 5.1; Task 5.3 closes it by walking
// the role / production graph with memoization. When a production fails the
// recursive eligibility check the whole (production, target) pair returns
// null from `emitFusedRender` and the runtime falls back to the captures
// path for the entire tree rooted there.

import { isTemplate, type Template } from '@parser2/parser';
import type { InferredSchema, Production, ResolvedSpan } from '../../model.ts';
import { computeReferencedSpanPresence, computeReferencedSpanValues } from '../captures.ts';
import { findSpanByName, isAbsentAllowedSpan, repeatsJoinDescriptor } from '../../span-helpers.ts';
import { indent, jsIdent, jsString } from '../strings.ts';
import { classFirstBytes, DISPATCH_SWITCH_MIN_BYTES } from './role-ladder.ts';
import { computeKnownLeadingBytes, emitSpan, emitStopBeforeCheck, hasModifier, type SpanBindings, type SpanContext } from './span.ts';
import { skipWsCommentsStmt, skipWsStmt } from './shared-helpers.ts';
import { findSpanModifier } from './modifiers.ts';

// Class kinds whose presence (alongside `unknownChars: 'reject'`) justifies
// emitting the depth-0 byte-class guard in .until() bodies. Kept in sync
// with the same list in `production.ts`. A schema with only comment /
// whitespace classes does not constrain what bytes may legitimately appear
// at depth 0, so the guard would over-reject; gate on at least one of these.
const CONTENT_CLASSES: ReadonlySet<string> = new Set<string>([
  'ident', 'number', 'hex', 'string', 'operator',
]);

export type FusedRenderOptions = {
  readonly nodeName: string;
  readonly prodIdx: number;
  readonly target: string;
};

// Build the fused function source. Returns null when the production is not
// eligible for fusion (non-Template body, unresolvable slot, or recursive
// slot whose role graph has a non-fusable production for this target).
export function emitFusedRender(
  production: Production,
  schema: InferredSchema,
  opts: FusedRenderOptions,
): string | null {
  // 'ast' is structural and out of scope for string fusion.
  if (opts.target === 'ast') return null;

  const entry = production.renders.get(opts.target);
  if (!entry) return null;
  if (!isTemplate(entry.body)) return null;
  const template = entry.body as Template;

  // Eligibility: every slot must reference a span on this production AND,
  // for recursive slots, every role's productions must be transitively
  // fusable. The walk is memoized via a per-target cache so a deeply-
  // recursive role graph (markdown's MarkdownLeaf, css's Rule body) is
  // visited once.
  const cache = getEligibilityCache(schema, opts.target);
  for (const slot of template.slots) {
    const span = findSpanByName(production, slot.ref);
    if (!span) return null;
    if (span.recursiveRoles.length > 0) {
      if (!areRolesFusable(span.recursiveRoles, schema, opts.target, cache)) {
        return null;
      }
    }
  }

  const fnName = fusedRenderFnName(schema, opts.nodeName, opts.prodIdx, opts.target);
  const body = emitFusedBody(template, production, schema, opts.target);
  return `function ${fnName}(state: State, out: string[]): boolean {
${indent(body, 1)}
}`;
}

// Stable function-name convention. Mirrors `__build_<NodeType>_<idx>_<target>`
// in emit/render.ts but with a distinct prefix so the two never collide. The
// schema's `symbolPrefix` is prepended (default '' is byte-identical to the
// prior code path) so multiple fused parsers can be composed without collisions.
export function fusedRenderFnName(
  schema: Pick<InferredSchema, 'symbolPrefix'>,
  nodeName: string,
  prodIdx: number,
  target: string,
): string {
  return `${schema.symbolPrefix}__fusedRender_${jsIdent(nodeName)}_${prodIdx}_${jsIdent(target)}`;
}

// ---------------------------------------------------------------------------
// Eligibility — per-target memoized "is this production fusable" probe.
//
// We walk the production / role graph, treating an in-progress production
// as "tentatively eligible" so left-recursive role chains terminate. The
// cache key is `<NodeType>#<prodIdx>` and the value is one of:
//   - true  — proved fusable
//   - false — proved ineligible
// Productions still in flight are not added until the walk completes; an
// in-progress marker lives in a parallel set so a cycle gets the tentative
// treatment without polluting the cache. After the walk we verify the
// tentative-eligible assumption against the actual reached productions and
// downgrade to false if any child turned out ineligible.
// ---------------------------------------------------------------------------

type EligibilityCache = Map<string, boolean>;
// One cache per (schema instance, target) pair. Two compiles of the same
// schema would create separate caches; that's fine — codegen runs once per
// compile.
const eligibilityCaches = new WeakMap<InferredSchema, Map<string, EligibilityCache>>();

function getEligibilityCache(schema: InferredSchema, target: string): EligibilityCache {
  let perSchema = eligibilityCaches.get(schema);
  if (!perSchema) {
    perSchema = new Map();
    eligibilityCaches.set(schema, perSchema);
  }
  let cache = perSchema.get(target);
  if (!cache) {
    cache = new Map();
    perSchema.set(target, cache);
  }
  return cache;
}

function productionKey(nodeName: string, prodIdx: number): string {
  return `${nodeName}#${prodIdx}`;
}

function areRolesFusable(
  roles: ReadonlyArray<string>,
  schema: InferredSchema,
  target: string,
  cache: EligibilityCache,
): boolean {
  const inProgress = new Set<string>();
  for (const role of roles) {
    if (!isRoleFusable(role, schema, target, cache, inProgress)) return false;
  }
  return true;
}

function isRoleFusable(
  role: string,
  schema: InferredSchema,
  target: string,
  cache: EligibilityCache,
  inProgress: Set<string>,
): boolean {
  const info = schema.nodeTypes.get(role);
  if (!info) return false;
  for (let i = 0; i < info.productions.length; i++) {
    const prod = info.productions[i]!;
    if (!isProductionFusable(prod, role, i, schema, target, cache, inProgress)) {
      return false;
    }
  }
  return true;
}

function isProductionFusable(
  production: Production,
  nodeName: string,
  prodIdx: number,
  schema: InferredSchema,
  target: string,
  cache: EligibilityCache,
  inProgress: Set<string>,
): boolean {
  const key = productionKey(nodeName, prodIdx);
  if (cache.has(key)) return cache.get(key)!;
  // Cycle: treat as tentatively eligible. If the rest of the walk proves
  // some other production in the chain ineligible, we'll bail out below
  // (the surrounding `areRolesFusable` only returns true when EVERY role
  // proves clean). The tentative pass-through is sound because the parent
  // is already on the in-progress stack; if it turns out to be ineligible,
  // the parent's return value (false) is what the cache stores.
  if (inProgress.has(key)) return true;
  inProgress.add(key);

  const entry = production.renders.get(target);
  if (!entry || !isTemplate(entry.body)) {
    inProgress.delete(key);
    cache.set(key, false);
    return false;
  }
  // Unsupported repeats features.
  //
  // `.indent()`-modified spans are ineligible: `emitFusedRepeatsSpan` joins
  // children with a static separator (`' '` when no `sep` is declared),
  // which produces flat output for indent-block schemas like yaml-block.
  // The captures-based forward path (emit/render.ts) threads `__indentCol`
  // and emits the correct per-level join + leading prefix (Phase 7 follow-
  // up #1) — gating fusion here lets that path run.
  //
  // `stopBefore` is honoured by `emitFusedRepeatsSpan` directly (Phase 5
  // follow-up): the loop emits the same byte-bucketed check the captures
  // path uses, so a stopBefore-bearing production now fuses end-to-end and
  // produces byte-equivalent output. No gate needed.
  for (const span of production.spans) {
    if (findSpanModifier(span, 'indent')) {
      inProgress.delete(key);
      cache.set(key, false);
      return false;
    }
  }
  const template = entry.body as Template;
  let ok = true;
  for (const slot of template.slots) {
    const span = findSpanByName(production, slot.ref);
    if (!span) { ok = false; break; }
    if (span.recursiveRoles.length === 0) continue;
    for (const r of span.recursiveRoles) {
      if (!isRoleFusable(r, schema, target, cache, inProgress)) {
        ok = false;
        break;
      }
    }
    if (!ok) break;
  }
  inProgress.delete(key);
  cache.set(key, ok);
  return ok;
}

// Walk the production's spans the same way `emitProduction` does, but swap
// the captures-building epilog for a direct string-concat push into `out`.
// The inner work is wrapped in an arrow returning `unknown` so we can
// distinguish "failure (null)" from "success (true)" — the existing span
// emit's failure paths do `state.pos = entryOff; return null;` which lands
// us back at the arrow's caller.
function emitFusedBody(
  template: Template,
  production: Production,
  schema: InferredSchema,
  target: string,
): string {
  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
    iwsExpr: new Map(),
  };
  const ctx = buildSpanContext(schema, production);

  const inner: string[] = [];
  inner.push(`const input = state.input;`);
  inner.push(`const len = state.len;`);
  inner.push(`let off = state.pos;`);
  inner.push(`const entryOff = off;`);
  // Leading ws skip — required by 'standard' whitespace policy. The leading
  // skip is ALWAYS ws-only (never comment-aware) so a comment-capturing
  // first span isn't fed its own delimiters. Matches `emitProduction`.
  inner.push(skipWsBlock());

  // Recursive spans push their rendered fragments into a per-span side
  // buffer at parse time. The template-push step splices each buffer in at
  // the slot's position so literal text BEFORE a recursive slot in the
  // template (e.g. `<g>` in `<g>${$.verb}<s>${$.subject}</s></g>`) is
  // emitted in source order. Direct pushes into `out` would put the
  // recursive content BEFORE the surrounding literals.
  const streamedSlots = new Map<string, StreamedSlotInfo>();

  const spans = production.spans;
  for (let i = 0; i < spans.length; i++) {
    const span = spans[i]!;
    if (i > 0) {
      // Inter-span gap skip strategy — mirrors `emitProduction`. The three
      // conditions for comment-eating are identical, so the same code path
      // applies. Anything missed here would diverge from the non-fused
      // parser body's behavior, breaking equivalence for callers that
      // expect identical input acceptance.
      const consumesData = spanConsumesComments(span, schema);
      const isOptional = hasModifier(span, 'optional');
      const interSpanSkip = ctx.tokens.has('comment') && !consumesData && !isOptional
        ? skipWsAndCommentsBlock()
        : skipWsBlock();
      inner.push(interSpanSkip);
    }
    if (span.recursiveRoles.length > 0) {
      // Recursive span: emit a fused-aware variant that calls the per-role
      // fused builders. Candidates write into a PER-SPAN buffer (not `out`
      // directly) so the parent's template-push step controls final
      // ordering — literal prefix, streamed slot, literal suffix.
      const baseId = span.name ? jsIdent(span.name) : `__rec_${i}`;
      const bufVar = `__slotBuf_${baseId}`;
      const matchedVar = `__slotMatched_${baseId}`;
      inner.push(`const ${bufVar}: string[] = [];`);
      inner.push(`let ${matchedVar} = false;`);
      inner.push(emitFusedRecursiveSpan(span, ctx, target, bufVar, matchedVar));
      if (span.name) {
        streamedSlots.set(span.name, { bufVar, matchedVar });
      }
    } else {
      inner.push(emitSpan(span, ctx, bindings));
    }
  }

  // After all spans succeed, commit state, emit the rendered string segments
  // directly to `out`, and return true. No captures object is built. The
  // segment / slot interleave mirrors the structure of the Template the
  // schema author wrote: parts[0], slot[0], parts[1], slot[1], …, parts[n].
  inner.push(`state.pos = off;`);
  inner.push(`if (off > state.maxOff) state.maxOff = off;`);
  for (const line of emitTemplatePushes(template, bindings, production, streamedSlots)) {
    inner.push(line);
  }
  inner.push(`return true;`);

  // Wrap the inner block in an arrow that returns `unknown` so the span
  // emit's `return null` lands at the arrow's call site rather than at the
  // outer fused function. The arrow's return value is the discriminator:
  // `null` → failure (state.pos already rewound by emitSpan); `true` →
  // success. Any other shape is impossible given our epilog. Cast through
  // unknown so the arrow's null-return type-checks under strict TS.
  return `const __ok = ((): unknown => {
${indent(inner.filter((l) => l !== '').join('\n'), 1)}
})();
return __ok === true;`;
}

// ---------------------------------------------------------------------------
// Recursive-span emit for fused contexts.
//
// Mirrors the captures-producing logic in `span.ts`'s `emitRecursiveSpan` /
// `emitRepeatsSpan`, but instead of calling `parse<Role>(state)` (which
// builds a captures tree) it calls `__fusedRender_<Role>_<idx>_<target>(state,
// out)` for each candidate production. The candidate productions are tried
// in declaration order with `out`-buffer + `state.pos` snapshot-and-rollback
// so a failed candidate leaves no partial writes.
//
// Strategy choice (controller-mandated Option B): "try each fused, fall back".
// Allocation-free on the happy path; one snapshot pair per attempt; correct
// rollback on failure. Future task may replace with byte-prefix dispatch
// (Option A) if profiling shows the linear-try overhead dominates.
// ---------------------------------------------------------------------------

type StreamedSlotInfo = {
  readonly bufVar: string;
  readonly matchedVar: string;
};

function emitFusedRecursiveSpan(
  span: ResolvedSpan,
  ctx: SpanContext,
  target: string,
  bufVar: string,
  matchedVar: string,
): string {
  const roles = span.recursiveRoles;
  if (roles.length === 0) {
    throw new Error(`fusion: emitFusedRecursiveSpan called with no roles (span '${span.name ?? '?'}')`);
  }
  const isOptional = hasModifier(span, 'optional');
  const repeats = findSpanModifier(span, 'repeats');
  if (repeats) return emitFusedRepeatsSpan(span, ctx, target, bufVar, matchedVar);

  // Single-shot recursive (single or multi-role): try each role's
  // productions in declaration order. Candidates write into the per-span
  // buffer `bufVar`; on first success the writes stand and `off`/`state.pos`
  // sit at the candidate's exit position. On total miss: if optional,
  // advance nothing and leave the buffer empty; else, fail the parent
  // (state.pos rewinds via the `return null` epilog the arrow catches).
  const candidates = expandRoleCandidates(roles, ctx);
  const lines: string[] = [];
  lines.push(`// recursive span (${roles.join(', ')}) — fused dispatch`);
  lines.push(`{`);
  lines.push(`  const __offBefore = off;`);
  lines.push(`  state.pos = off;`);
  // Mirror the captures-time role ladder: `if (off < len) { byte-prefix
  // dispatch }`. EOF short-circuits the entire dispatch (matches the
  // outer guard in `emitRoleLadder`).
  lines.push(`  if (off < len) {`);
  lines.push(`    const __c0 = input.charCodeAt(off);`);
  lines.push(indent(emitByteDispatch(candidates, target, ctx, {
    matchedVar,
    bufVar,
    offResetVar: '__offBefore',
    // Single-shot: clear the buffer between attempts. A previous candidate's
    // partial writes (it failed mid-emit) would otherwise leak into the
    // next attempt's output.
    attemptResetExpr: `${bufVar}.length = 0;`,
  }), 2));
  lines.push(`  }`);
  // On total miss `bufVar` may carry the last attempt's partial writes —
  // explicitly clear it so the template-push step sees an empty buffer.
  lines.push(`  if (!${matchedVar}) ${bufVar}.length = 0;`);
  if (isOptional) {
    // Optional miss: rewind `off` to the entry of this span (we never
    // advanced it). state.pos already points at __offBefore from the last
    // failed attempt; sync `off` so the next inter-span skip starts from
    // the right place.
    lines.push(`  if (!${matchedVar}) { off = __offBefore; state.pos = __offBefore; }`);
  } else {
    lines.push(`  if (!${matchedVar}) { state.pos = ${ctx.entryOffVar}; return null; }`);
  }
  lines.push(`}`);
  return lines.join('\n');
}

// Build a byte-prefix dispatch block matching the captures-time role
// ladder. Assumes `__c0`, `${matchedVar}`, `${bufVar}` are in scope.
// Emits:
//   if (__c0 === N1) { try byte-signatured candidates with first-byte N1 }
//   else if (__c0 === N2) { ... }
//   ...
//   else { try fallthrough candidates }
//
// Candidates within the same byte-group are speculated longest-prefix
// first (already pre-sorted by expandRoleCandidates).
//
// `attemptResetExpr` runs BEFORE each candidate's call to clear any
// partial writes the previous attempt left in the buffer. For repeats
// loops the reset trims back to `__bufLenBefore + sepMarker` so the
// pre-pushed join separator stays; for single-shot recursive spans it
// clears the buffer entirely (no separator at play).
type ByteDispatchOpts = {
  readonly matchedVar: string;
  readonly bufVar: string;
  readonly offResetVar: string;
  readonly attemptResetExpr: string;
};
function emitByteDispatch(
  candidates: ReadonlyArray<FusedCandidate>,
  target: string,
  ctx: SpanContext,
  opts: ByteDispatchOpts,
): string {
  const byByte = new Map<number, FusedCandidate[]>();
  const fallthroughs: FusedCandidate[] = [];
  for (const cand of candidates) {
    if (cand.fallthrough) { fallthroughs.push(cand); continue; }
    for (const byte of cand.firstBytes) {
      const bucket = byByte.get(byte) ?? [];
      bucket.push(cand);
      byByte.set(byte, bucket);
    }
  }
  const branchSrc = (cand: FusedCandidate): string => {
    const fn = fusedRenderFnName({ symbolPrefix: ctx.symbolPrefix }, cand.nodeName, cand.prodIdx, target);
    return [
      `if (!${opts.matchedVar}) {`,
      `  state.pos = ${opts.offResetVar};`,
      `  ${opts.attemptResetExpr}`,
      `  if (${fn}(state, ${opts.bufVar})) { ${opts.matchedVar} = true; off = state.pos; }`,
      `}`,
    ].join('\n');
  };
  // Group bytes whose candidate buckets render to the SAME body — an
  // ident-start role contributes ~52 letter bytes that all probe the same
  // candidate list, and emitting the probe chain once per byte was the
  // single largest source of generated-code bloat (HTML's 17 fused
  // HtmlElement renderers each carried ~50 identical 28-line blocks per
  // ladder). Identical-body groups share one switch body via stacked case
  // labels (same idiom as role-ladder.ts / fusion-structured.ts); the
  // chained-if form is kept for narrow fanouts.
  const sortedBytes = [...byByte.keys()].sort((a, b) => a - b);
  const byBody = new Map<string, number[]>();
  for (const byte of sortedBytes) {
    const body = byByte.get(byte)!.map(branchSrc).join('\n');
    const group = byBody.get(body);
    if (group) group.push(byte);
    else byBody.set(body, [byte]);
  }
  const fallBody = fallthroughs.length > 0 ? fallthroughs.map(branchSrc).join('\n') : null;
  const lines: string[] = [];
  if (sortedBytes.length >= DISPATCH_SWITCH_MIN_BYTES) {
    lines.push(`switch (__c0) {`);
    for (const [body, bytes] of byBody) {
      lines.push(`  ${bytes.map((b) => `case ${b}:`).join(' ')}`);
      lines.push(indent(body, 2));
      lines.push(`    break;`);
    }
    if (fallBody !== null) {
      lines.push(`  default:`);
      lines.push(indent(fallBody, 2));
      lines.push(`    break;`);
    }
    lines.push(`}`);
    return lines.join('\n');
  }
  let first = true;
  for (const [body, bytes] of byBody) {
    const prefix = first ? 'if' : 'else if';
    first = false;
    lines.push(`${prefix} (${bytes.map((b) => `__c0 === ${b}`).join(' || ')}) {`);
    lines.push(indent(body, 1));
    lines.push(`}`);
  }
  if (fallBody !== null) {
    if (byBody.size === 0) {
      lines.push(fallBody);
    } else {
      lines.push(`else {`);
      lines.push(indent(fallBody, 1));
      lines.push(`}`);
    }
  }
  return lines.join('\n');
}


function emitFusedRepeatsSpan(
  span: ResolvedSpan,
  ctx: SpanContext,
  target: string,
  bufVar: string,
  matchedVar: string,
): string {
  const roles = span.recursiveRoles;
  const repeats = findSpanModifier(span, 'repeats')!;
  const min = repeats.min ?? 0;
  const max = repeats.max;
  const sep = repeats.sep;
  // The render-time join separator for the slot. When the schema author
  // wrote `.repeats({ sep: ', ' })` we emit `, ` between children. With no
  // explicit `sep` the captures path defaults to a single space via
  // `repeatsJoinDescriptor`. We mirror that for fusion so the rendered
  // output matches the captures-fallback exactly.
  const joinSep = sep === undefined ? ' ' : sep;
  // stopBefore literals — when the next bytes start with any of these
  // prefixes the loop must break without attempting an item. Reuses the
  // captures-path helper (exported from span.ts) so the byte-bucketed
  // dispatch shape is identical across backends. Empty string when the
  // span has no stopBefore (the helper accepts undefined/empty and yields
  // '', which we inline-test before emitting).
  const stopBeforeCheck = emitStopBeforeCheck(repeats.stopBefore);
  const candidates = expandRoleCandidates(roles, ctx);

  const lines: string[] = [];
  lines.push(`// recursive repeats span (${roles.join(', ')}) — fused loop`);
  lines.push(`{`);
  lines.push(`  let __count = 0;`);
  lines.push(`  while (true) {`);
  lines.push(`    const __loopStart = off;`);
  if (sep !== undefined) {
    // Top-of-loop separator sweep — mirrors the parse-time sweep in
    // `emitRepeatsSpan`. Allows zero-or-more separators between items so
    // tolerant grammars (CSS `;;`) parse identically under fusion. No
    // post-loop trailing-policy check yet (the captures fallback handles
    // trailing-sep edge cases), so the sweep doesn't need to track whether
    // a separator was consumed.
    lines.push(`    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }`);
    lines.push(`    while (${literalMatchExpr(sep, 'off')}) {`);
    lines.push(`      off += ${sep.length};`);
    lines.push(`      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }`);
    lines.push(`    }`);
  } else {
    // No declared separator — skip inter-item whitespace exactly the way
    // the role ladder does at parse time. Without this, a multiline
    // markdown document with blank lines between blocks would treat the
    // blanks as inseparable input and the loop would never advance.
    lines.push(`    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }`);
  }
  if (stopBeforeCheck) {
    // After the sep-sweep / ws-skip lands on the next item's start byte,
    // peek the byte against the stopBefore literals and break the loop
    // when one matches. We have NOT yet snapshotted the buffer or pushed
    // the join separator, so a clean `break` here leaves no dangling
    // writes — symmetrical to the captures-path break in `emitRepeatsSpan`.
    // Without this, a stopBefore-bearing fused loop would over-consume
    // input whenever a role candidate's first byte aliases the stop
    // prefix (e.g. HTML's `<li>` whose siblings/closers both start with
    // `<` — without the check the loop would greedily descend into a
    // sibling element instead of returning to the parent's close handler).
    lines.push(indent(stopBeforeCheck, 2));
  }
  lines.push(`    const __bufLenBefore = ${bufVar}.length;`);
  lines.push(`    const __offBeforeItem = off;`);
  lines.push(`    state.pos = off;`);
  lines.push(`    let __itemMatched = false;`);
  // Pre-allocate space for the join separator. Pushed BEFORE the item
  // attempt and rolled back along with the item if it fails. This keeps
  // the (sep, child) pair atomic — a failed child can't leave a dangling
  // separator in the buffer.
  lines.push(`    if (__count > 0) ${bufVar}.push(${jsString(joinSep)});`);
  // EOF guard — the role ladder at parse time (emitRoleLadder in span.ts)
  // checks `if (off < len)` before dispatching, so an EOF position never
  // triggers a fallthrough role's empty-match. Without this guard a
  // `.until()`-leading paragraph role would capture "" at EOF and add a
  // spurious empty child, diverging from the captures path.
  lines.push(`    if (off < len) {`);
  // Byte-prefix dispatch: when `__c0` matches a byte-signatured candidate's
  // first-byte set, ONLY that group's speculation chain runs (mirroring the
  // chained-if shape in `emitRoleLadder`). Fallthrough candidates are the
  // `else` branch — tried only when no byte-signatured branch matched.
  // Crucial for `<div>Hello</div>` where the closing `<` of `</div>` is a
  // byte-signatured (HtmlElement) byte; the captures path tries
  // Comment/Doctype/HtmlElement, they all fail, the loop breaks. It does
  // NOT then fall through to TextNode (which would capture "" and add a
  // spurious empty child).
  lines.push(`      const __c0 = input.charCodeAt(off);`);
  lines.push(indent(emitByteDispatch(candidates, target, ctx, {
    matchedVar: '__itemMatched',
    bufVar,
    offResetVar: '__offBeforeItem',
    // Repeats: trim back to before this iteration's writes (preserving
    // the pre-pushed join separator if any). A successful candidate will
    // overwrite from this length; a failed candidate leaves it cleared.
    attemptResetExpr: `${bufVar}.length = __bufLenBefore + (__count > 0 ? 1 : 0);`,
  }), 3));
  lines.push(`    }`);
  lines.push(`    if (!__itemMatched) {`);
  // No child matched at this position — rewind the pre-pushed separator
  // (if any) and exit the loop. The captures-path uses break with no
  // rewind because the loop variable is captures-level; we additionally
  // rewind `off` and `state.pos` to the pre-item snapshot so the parent
  // body's next inter-span skip lands at the right place.
  lines.push(`      ${bufVar}.length = __bufLenBefore;`);
  lines.push(`      off = __offBeforeItem;`);
  lines.push(`      state.pos = __offBeforeItem;`);
  lines.push(`      break;`);
  lines.push(`    }`);
  lines.push(`    __count++;`);
  // Repeats with at least one item: mark the slot matched so the template
  // push step doesn't treat it as absent. For min:0 / no items the slot is
  // still considered "matched" — render-side a min:0 repeats with empty
  // body emits nothing, but it's not the same as a missing optional.
  lines.push(`    ${matchedVar} = true;`);
  if (max !== undefined) {
    lines.push(`    if (__count > ${max}) { state.pos = ${ctx.entryOffVar}; return null; }`);
  }
  lines.push(`    if (off === __loopStart) break;`);
  lines.push(`  }`);
  if (min > 0) {
    lines.push(`  if (__count < ${min}) { state.pos = ${ctx.entryOffVar}; return null; }`);
  }
  lines.push(`}`);
  return lines.join('\n');
}

// Materialize the (nodeName, prodIdx) candidates we'll try when a recursive
// span dispatches across roles. The order MUST mirror the captures-time
// dispatcher emitted by `emitRoleLadder` (./role-ladder.ts) so input
// acceptance and the chosen production for ambiguous inputs match exactly:
//
//   1. Non-fallthrough productions first, sorted by longest-literal-first-
//      prefix DESC. This mirrors the role ladder's same-byte conflict
//      resolver — when two productions share a first byte (e.g. markdown
//      ```js… vs ```\n…) the one with the longer literal prefix is tried
//      first.
//   2. Fallthrough productions last, in (role declaration, prod declaration)
//      order. A fallthrough production has a first span with no fixed first
//      byte (until/rawUntil/repeats/optional). The captures dispatcher tries
//      these only after no byte-signatured production matched the current
//      `__c0`. Without this deferral a Document with MarkdownLeaf +
//      MarkdownParagraph roles would always try Paragraph because its
//      .until-based first span accepts every byte.
//
// Each candidate carries its first-byte signature so the emit can gate
// non-fallthrough candidates on `__c0` — matching the byte-prefix dispatch
// in `emitRoleLadder`. Fallthrough candidates skip the byte gate (tried
// for every position).
type FusedCandidate = {
  readonly nodeName: string;
  readonly prodIdx: number;
  // Bytes (0..255) this production accepts as its first byte. Empty for
  // fallthrough candidates.
  readonly firstBytes: ReadonlySet<number>;
  // True when the production has a first span with no fixed first byte —
  // tried as the catch-all after byte-signatured candidates miss.
  readonly fallthrough: boolean;
  // Longest literal-prefix length (for same-byte conflict ordering).
  readonly literalLen: number;
};

function expandRoleCandidates(roles: ReadonlyArray<string>, ctx: SpanContext): ReadonlyArray<FusedCandidate> {
  const cands: FusedCandidate[] = [];
  const candProductions: Production[] = [];
  for (const role of roles) {
    const info = ctx.nodeTypes.get(role);
    if (!info) {
      throw new Error(`fusion: recursive role '${role}' has no NodeTypeInfo`);
    }
    for (let i = 0; i < info.productions.length; i++) {
      const prod = info.productions[i]!;
      const meta = computeProductionFirstBytes(prod, ctx, new Set());
      cands.push({
        nodeName: role,
        prodIdx: i,
        firstBytes: meta.bytes,
        fallthrough: meta.fallthrough,
        literalLen: meta.literalLen,
      });
      candProductions.push(prod);
    }
  }
  // Order: non-fallthrough by longest-literal-prefix DESC, then by span
  // count DESC (more spans = more structural commitment; mirrors the
  // captures-time dispatcher in emit/v2/dispatch.ts's
  // `emitGroupSpeculation`). The span-count tiebreak is the discriminator
  // that lets `*/N` win over `*` and `N-N` win over `N` when both have the
  // same first-literal length but different structural depth. Without it
  // the fused dispatch and captures dispatch diverge on shape-ambiguous
  // inputs — same divergence the Phase 6 bytecode dispatch had before its
  // sort was tightened. Fallthroughs trail in declaration order.
  const nonFt = cands.filter((c) => !c.fallthrough);
  const ft = cands.filter((c) => c.fallthrough);
  const spanCount = (c: FusedCandidate): number => {
    const idx = cands.indexOf(c);
    return candProductions[idx]!.spans.length;
  };
  nonFt.sort((a, b) => {
    if (a.literalLen !== b.literalLen) return b.literalLen - a.literalLen;
    const sb = spanCount(b);
    const sa = spanCount(a);
    if (sa !== sb) return sb - sa;
    return 0; // stable sort preserves declaration order
  });
  return [...nonFt, ...ft];
}

// Compute (first-bytes, fallthrough, literalLen) for a single production.
// Mirrors `computeRoleFirstBytes` in role-ladder.ts but operates on a
// single production rather than a whole role's productions list. We don't
// reuse that helper directly because its return type aggregates across
// productions; we need the per-production granularity to gate dispatch
// on each candidate.
function computeProductionFirstBytes(
  prod: Production,
  ctx: SpanContext,
  visiting: Set<string>,
): { readonly bytes: ReadonlySet<number>; readonly fallthrough: boolean; readonly literalLen: number } {
  const span0 = prod.spans[0];
  if (!span0) {
    return { bytes: new Set(), fallthrough: true, literalLen: 0 };
  }
  // Modifiers that put a production in fallthrough mode.
  const hasUntil = span0.modifiers.some((m) => m.kind === 'until' || m.kind === 'rawUntil');
  const hasRepeats = span0.modifiers.some((m) => m.kind === 'repeats');
  const hasOptional = span0.modifiers.some((m) => m.kind === 'optional');
  if (hasUntil || hasRepeats || hasOptional) {
    return { bytes: new Set(), fallthrough: true, literalLen: 0 };
  }
  // Recursive first span — union across roles' productions.
  if (span0.recursiveRoles.length > 0) {
    const bytes = new Set<number>();
    let fallthrough = false;
    let literalLen = 0;
    for (const r of span0.recursiveRoles) {
      const info = ctx.nodeTypes.get(r);
      if (!info) continue;
      if (visiting.has(r)) { fallthrough = true; continue; }
      visiting.add(r);
      for (const inner of info.productions) {
        const m = computeProductionFirstBytes(inner, ctx, visiting);
        for (const b of m.bytes) bytes.add(b);
        if (m.fallthrough) fallthrough = true;
        if (m.literalLen > literalLen) literalLen = m.literalLen;
      }
      visiting.delete(r);
    }
    return { bytes, fallthrough, literalLen };
  }
  if (span0.class === 'literal') {
    if (!span0.text || span0.text.length === 0) {
      return { bytes: new Set(), fallthrough: true, literalLen: 0 };
    }
    return {
      bytes: new Set<number>([span0.text.charCodeAt(0)]),
      fallthrough: false,
      literalLen: span0.text.length,
    };
  }
  if (span0.class === 'comment') {
    return { bytes: new Set<number>([0x2f]), fallthrough: false, literalLen: 2 };
  }
  // Class span — derive byte set via the role-ladder helper. We treat
  // class-byte productions as having a 0-length literalLen for ordering
  // (always trail longer-literal matches within the same group).
  try {
    return { bytes: classFirstBytes(span0), fallthrough: false, literalLen: 0 };
  } catch {
    // Unsupported class span — treat as fallthrough so the candidate is
    // tried unconditionally. Matches role-ladder's blow-up semantics
    // softly so a partially-supported schema still fuses what it can.
    return { bytes: new Set(), fallthrough: true, literalLen: 0 };
  }
}

// Walk template.parts / template.slots and emit one `out.push(...)` per
// non-empty segment / slot. Slot values are wrapped in `String(...)` so a
// runtime number / boolean / array slot collapses to its string form —
// matches the inverse-direction template rebuild semantics.
//
// Mirrors the two pieces of template fusion in emit/render.ts that the
// captures path already implements (commit history: "Gap A" and "Gap B"):
//
//   - Gap A — optional-absent slot suppresses preceding whitespace
//     separator. When the slot references an .optional() / .repeats({min:0})
//     span and the immediately-preceding literal is whitespace-only, the
//     entire pair (literal + slot) is gated on slot presence.
//   - Gap B — .repeats() slot joins array children with the schema-declared
//     separator (single space for plain .repeats(), explicit `sep` when
//     declared). Without this thread, Array.prototype.toString comma-joins
//     at runtime.
//
// Task 5.3 addendum: when a slot references a recursive span whose content
// was streamed into a per-span buffer during the parse loop, the template's
// slot push splices that buffer's contents into `out`. Gap A still applies —
// an absent optional recursive slot collapses both the slot and any
// immediately-preceding whitespace-only literal.
function emitTemplatePushes(
  template: Template,
  bindings: SpanBindings,
  production: Production,
  streamedSlots: ReadonlyMap<string, StreamedSlotInfo>,
): string[] {
  const parts = template.parts;
  const slots = template.slots;
  type LiteralPiece = { readonly kind: 'literal'; readonly text: string; readonly raw: string };
  type ScalarSlot = {
    readonly kind: 'slot';
    readonly mode: 'scalar';
    readonly pushExpr: string;
    readonly optional: boolean;
    readonly presenceExpr: string;
  };
  type StreamedSlot = {
    readonly kind: 'slot';
    readonly mode: 'streamed';
    readonly bufVar: string;
    readonly matchedVar: string;
    readonly optional: boolean;
    readonly presenceExpr: string;
  };
  type SlotPiece = ScalarSlot | StreamedSlot;
  type Piece = LiteralPiece | SlotPiece;
  const pieces: Piece[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length > 0) pieces.push({ kind: 'literal', text: jsString(part), raw: part });
    if (i < slots.length) {
      const slot = slots[i]!;
      const streamed = streamedSlots.get(slot.ref);
      const span = findSpanByName(production, slot.ref);
      const optional = span !== undefined && isAbsentAllowedSpan(span);
      if (streamed) {
        // Recursive slot — content lives in a per-span buffer populated by
        // the parse loop. Splice it into `out` at this position.
        pieces.push({
          kind: 'slot',
          mode: 'streamed',
          bufVar: streamed.bufVar,
          matchedVar: streamed.matchedVar,
          optional,
          presenceExpr: streamed.matchedVar,
        });
        continue;
      }
      const varExpr = bindings.valueExpr.get(slot.ref);
      if (varExpr === undefined) {
        // The eligibility check at emitFusedRender entry guarantees every
        // slot ref resolves to a span on this production. Reaching here
        // means a span name resolved but emitSpan declined to bind it
        // (only happens for unnamed spans, which can never be referenced).
        // Treat it as a hard codegen error so the schema author hears
        // about the wiring drift instead of silently rendering "".
        throw new Error(
          `fusion: slot '${slot.ref}' has no binding (template references an unnamed span)`,
        );
      }
      const repeats = span !== undefined ? repeatsJoinDescriptor(span) : null;
      let pushExpr: string;
      if (repeats !== null && repeats.kind === 'indent') {
        // Unreachable: `isProductionFusable` (line 211) gates productions
        // with any indent-modified span out of the fused path so the
        // captures-based emitter in `emit/render.ts` can run instead
        // (it threads `__indentCol` and emits the dynamic per-level
        // join). If this throws, the eligibility check has drifted.
        throw new Error(
          `fusion: indent-modified repeats slot '${slot.ref}' reached the fused path — eligibility gate at fusion.ts:211 should have prevented this`,
        );
      } else if (repeats !== null) {
        // Array-of-children slot whose children are NOT recursive (eligibility
        // gates recursive-arrays through the streamed path). Stringify each
        // child and join with the declared separator.
        const sepLit = jsString(repeats.sep);
        pushExpr = `(Array.isArray(${varExpr}) ? ${varExpr}.map((__v: any) => String(__v ?? "")).join(${sepLit}) : String(${varExpr} ?? ""))`;
      } else {
        // Coalesce null/undefined to "" so optional-absent captures don't
        // serialize as the strings "null"/"undefined".
        pushExpr = `String(${varExpr} ?? "")`;
      }
      pieces.push({
        kind: 'slot',
        mode: 'scalar',
        pushExpr,
        optional,
        presenceExpr: `(${varExpr} != null)`,
      });
    }
  }

  // Render one slot piece into JS code that pushes onto `out`. Streamed
  // slots use a tight `for` loop instead of `out.push(...buf)` to avoid the
  // spread-arg stack hazard for large buffers (V8's apply limit ~64k).
  const emitSlotPush = (piece: SlotPiece): string => {
    if (piece.mode === 'streamed') {
      return `for (let __i = 0; __i < ${piece.bufVar}.length; __i++) out.push(${piece.bufVar}[__i]);`;
    }
    return `out.push(${piece.pushExpr});`;
  };

  // Fuse optional-absent slots with their immediately-preceding
  // whitespace-only literal. When the captured value is absent BOTH the
  // literal and the slot collapse to nothing. Matches emit/render.ts's
  // emitTemplateExpr fusion exactly. Applies uniformly to scalar and
  // streamed slots — the presenceExpr varies but the pattern is identical.
  const lines: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!;
    if (piece.kind === 'literal') {
      lines.push(`out.push(${piece.text});`);
      continue;
    }
    if (!piece.optional) {
      lines.push(emitSlotPush(piece));
      continue;
    }
    // Optional slot. Decide whether to fuse with the preceding literal.
    const prev = i > 0 ? pieces[i - 1] : undefined;
    const prevIsWhitespaceLiteral =
      prev !== undefined
      && prev.kind === 'literal'
      && prev.raw.length > 0
      && /^\s+$/.test(prev.raw);
    if (prevIsWhitespaceLiteral && lines.length > 0) {
      // Replace the just-pushed literal with a presence-gated emission of
      // both the literal and the slot. The lookup MUST match the line we
      // emitted for the preceding whitespace literal — there are no
      // intermediate pushes between literal and slot.
      lines.pop();
      const sepLit = (prev as LiteralPiece).text;
      lines.push(
        `if (${piece.presenceExpr}) { out.push(${sepLit}); ${emitSlotPush(piece)} }`,
      );
    } else {
      lines.push(`if (${piece.presenceExpr}) ${emitSlotPush(piece)}`);
    }
  }
  return lines;
}

// Mirror of `emitProduction`'s context construction. Kept inline here
// rather than extracted into a shared helper because production.ts and
// fusion.ts each have a small amount of orchestration logic around it and
// premature factoring would obscure the parallel structure. See plan note
// from controller: "Do NOT factor out a shared helper unless the
// duplication is trivial".
function buildSpanContext(schema: InferredSchema, production: Production): SpanContext {
  const tokenClasses = new Set<string>();
  let cssIdent = false;
  for (const usage of schema.classes) {
    tokenClasses.add(usage.class);
    if (usage.class === 'ident' && usage.refinements.some((r) => r.name === 'css')) {
      cssIdent = true;
    }
  }
  const hasContentClass = schema.classes.some((cls) => CONTENT_CLASSES.has(cls.class));
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
    // Fusion emits a different return shape than the standard production
    // body, so the Layer 1 raws-only capture isn't wired through here
    // yet. Preserve schemas keep 'always' so iws sites in repeats spans
    // continue to emit; standard schemas stay 'none'.
    wsCaptureMode: schema.whitespace === 'preserve' ? 'always' : 'none',
    lineCommentMarkers,
    // Phase 5a — lazy capture on the Template-fused fast path. The
    // template emit's slot interleaver reads bindings.valueExpr; spans
    // not referenced by any (production, target) render body have the
    // value slice dropped.
    referencedValueSpans: computeReferencedSpanValues(production),
    referencedPresenceSpans: computeReferencedSpanPresence(production),
  };
}

// Inline-literal match for repeats-loop sep sweeps. The captured-path
// version lives in `span.ts` (kept private there); we mirror the small
// shape here to avoid a cross-module dependency for a 3-line helper.
function literalMatchExpr(text: string, offVar: string): string {
  if (text.length === 1) {
    return `input.charCodeAt(${offVar}) === ${text.charCodeAt(0)}`;
  }
  if (text.length === 2) {
    return `input.charCodeAt(${offVar}) === ${text.charCodeAt(0)} && input.charCodeAt(${offVar} + 1) === ${text.charCodeAt(1)}`;
  }
  return `input.startsWith(${jsString(text)}, ${offVar})`;
}

// Whitespace skips — same semantics as production.ts's; both now delegate
// to the shared-helper registry (one `__skipWs` / `__skipWsC_*` per module).

function skipWsBlock(): string {
  return skipWsStmt();
}

function skipWsAndCommentsBlock(): string {
  return skipWsCommentsStmt();
}

// Same logic as `spanConsumesComments` in production.ts. Inlined so this
// module is not transitively coupled to production.ts's internals.
function spanConsumesComments(span: ResolvedSpan, schema: InferredSchema): boolean {
  if (span.class === 'comment') return true;
  if (span.recursiveRoles.length === 0) return false;
  for (const roleName of span.recursiveRoles) {
    const info = schema.nodeTypes.get(roleName);
    if (!info) continue;
    for (const prod of info.productions) {
      const firstSpan = prod.spans[0];
      if (firstSpan && firstSpan.class === 'comment') return true;
    }
  }
  return false;
}
