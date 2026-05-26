// Phase 5 — Fused parse+render emitter.
//
// For each (production, non-ast target) pair whose render body is a Template
// composed of non-recursive slots, emit a function:
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
// Task 5.1 emits the function but does NOT wire it into the public
// `render()` entry point. Task 5.2 will dispatch through these functions
// and bypass the captures-allocating slow path for eligible combinations.
//
// Recursive slots (slot.ref names a span with recursiveRoles.length > 0) are
// deferred to Task 5.3 — this emitter returns null for any production whose
// template references one, so the caller skips the (production, target)
// combination.

import { isTemplate, type Template } from '@parser2/parser';
import type { InferredSchema, Production, ResolvedSpan } from '../../model.ts';
import { indent, jsIdent, jsString } from '../strings.ts';
import { computeKnownLeadingBytes, emitSpan, hasModifier, type SpanBindings, type SpanContext } from './span.ts';

// Class kinds whose presence (alongside `unknownChars: 'reject'`) justifies
// emitting the depth-0 byte-class guard in .until() bodies. Kept in sync
// with the same list in `production.ts`. A schema with only comment /
// whitespace classes does not constrain what bytes may legitimately appear
// at depth 0, so the guard would over-reject; gate on at least one of these.
const CONTENT_CLASSES: ReadonlySet<string> = new Set<string>([
  'ident', 'keyword', 'number', 'hex', 'string', 'regex', 'template', 'operator',
]);

export type FusedRenderOptions = {
  readonly nodeName: string;
  readonly prodIdx: number;
  readonly target: string;
};

// Build the fused function source. Returns null when the production is not
// eligible (non-Template body, or any slot references a recursive span).
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

  // Eligibility: every slot must reference a non-recursive span on this
  // production. Recursive slots come in Task 5.3 (they require dispatching
  // the recursive child through the fused-render table, which only exists
  // after the dispatcher itself is wired — Task 5.2 prerequisite).
  for (const slot of template.slots) {
    const span = findSpanByName(production, slot.ref);
    if (!span) return null; // unresolvable slot — let the slow path raise
    if (span.recursiveRoles.length > 0) return null;
  }

  const fnName = fusedRenderFnName(opts.nodeName, opts.prodIdx, opts.target);
  const body = emitFusedBody(template, production, schema);
  return `function ${fnName}(state: State, out: string[]): boolean {
${indent(body, 1)}
}`;
}

// Stable function-name convention. Mirrors `__build_<NodeType>_<idx>_<target>`
// in emit/render.ts but with a distinct prefix so the two never collide.
export function fusedRenderFnName(nodeName: string, prodIdx: number, target: string): string {
  return `__fusedRender_${jsIdent(nodeName)}_${prodIdx}_${jsIdent(target)}`;
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
): string {
  const bindings: SpanBindings = {
    valueExpr: new Map(),
    presenceExpr: new Map(),
    startOffExpr: new Map(),
    endOffExpr: new Map(),
  };
  const ctx = buildSpanContext(schema);

  const inner: string[] = [];
  inner.push(`const input = state.input;`);
  inner.push(`const len = state.len;`);
  inner.push(`let off = state.pos;`);
  inner.push(`const entryOff = off;`);
  // Leading ws skip — required by 'standard' whitespace policy. The leading
  // skip is ALWAYS ws-only (never comment-aware) so a comment-capturing
  // first span isn't fed its own delimiters. Matches `emitProduction`.
  inner.push(skipWsBlock());

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
    inner.push(emitSpan(span, ctx, bindings));
  }

  // After all spans succeed, commit state, emit the rendered string segments
  // directly to `out`, and return true. No captures object is built. The
  // segment / slot interleave mirrors the structure of the Template the
  // schema author wrote: parts[0], slot[0], parts[1], slot[1], …, parts[n].
  inner.push(`state.pos = off;`);
  inner.push(`if (off > state.maxOff) state.maxOff = off;`);
  for (const line of emitTemplatePushes(template, bindings)) {
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

// Walk template.parts / template.slots and emit one `out.push(...)` per
// non-empty segment / slot. Slot values are wrapped in `String(...)` so a
// runtime number / boolean / array slot collapses to its string form —
// matches the inverse-direction template rebuild semantics.
function emitTemplatePushes(template: Template, bindings: SpanBindings): string[] {
  const parts = template.parts;
  const slots = template.slots;
  const lines: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length > 0) {
      lines.push(`out.push(${jsString(part)});`);
    }
    if (i < slots.length) {
      const slot = slots[i]!;
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
      // Coalesce null/undefined to "" so optional-absent captures don't
      // serialize as the strings "null"/"undefined". Mirrors the same
      // defensive coalesce in emit/render.ts's emitTemplateExpr.
      lines.push(`out.push(String(${varExpr} ?? ""));`);
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
function buildSpanContext(schema: InferredSchema): SpanContext {
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
  return {
    entryOffVar: 'entryOff',
    raws: false,
    tokens: tokenClasses,
    cssIdent,
    nodeTypes: schema.nodeTypes,
    emitUnknownCharsGuard,
    knownBytes: computeKnownLeadingBytes(schema),
  };
}

function findSpanByName(production: Production, name: string): ResolvedSpan | undefined {
  for (const span of production.spans) {
    if (span.name === name) return span;
  }
  return undefined;
}

// Whitespace skips — identical to those in production.ts. Inlined here to
// keep this module free-standing; the duplication is two short literals and
// stays in sync because both modules use the same `skipWsBlock` / `skipWs
// AndCommentsBlock` semantics from the v2 emit contract.

function skipWsBlock(): string {
  return `while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`;
}

function skipWsAndCommentsBlock(): string {
  return `while (off < len) {
  const c = input.charCodeAt(off);
  if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
  if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
    off += 2;
    while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
    if (off < len) off += 2;
    continue;
  }
  break;
}`;
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
