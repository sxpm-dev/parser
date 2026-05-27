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
  for (const line of emitTemplatePushes(template, bindings, production)) {
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
function emitTemplatePushes(
  template: Template,
  bindings: SpanBindings,
  production: Production,
): string[] {
  const parts = template.parts;
  const slots = template.slots;
  type LiteralPiece = { readonly kind: 'literal'; readonly text: string; readonly raw: string };
  type SlotPiece = {
    readonly kind: 'slot';
    readonly pushExpr: string;
    readonly optional: boolean;
    readonly varExpr: string;
  };
  type Piece = LiteralPiece | SlotPiece;
  const pieces: Piece[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    if (part.length > 0) pieces.push({ kind: 'literal', text: jsString(part), raw: part });
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
      const span = findSpanByName(production, slot.ref);
      const optional = span !== undefined && isAbsentAllowedSpan(span);
      const repeatsSep = span !== undefined ? repeatsJoinSeparator(span) : null;
      let pushExpr: string;
      if (repeatsSep !== null) {
        // Array-of-children slot: per-child stringify + join. The fused
        // path never sees recursive children here (eligibility gates them
        // out), so children are scalars from a .repeats() of a primitive
        // span. Use String() on each entry to match the captures path's
        // coercion semantics.
        const sepLit = jsString(repeatsSep);
        pushExpr = `(Array.isArray(${varExpr}) ? ${varExpr}.map((__v: any) => String(__v ?? "")).join(${sepLit}) : String(${varExpr} ?? ""))`;
      } else {
        // Coalesce null/undefined to "" so optional-absent captures don't
        // serialize as the strings "null"/"undefined".
        pushExpr = `String(${varExpr} ?? "")`;
      }
      pieces.push({ kind: 'slot', pushExpr, optional, varExpr });
    }
  }

  // Fuse optional-absent slots with their immediately-preceding
  // whitespace-only literal. When the captured value is null/undefined
  // BOTH the literal and the slot collapse to nothing. Matches
  // emit/render.ts's emitTemplateExpr fusion exactly.
  const lines: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const piece = pieces[i]!;
    if (piece.kind === 'literal') {
      lines.push(`out.push(${piece.text});`);
      continue;
    }
    if (!piece.optional) {
      lines.push(`out.push(${piece.pushExpr});`);
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
        `if (${piece.varExpr} != null) { out.push(${sepLit}); out.push(${piece.pushExpr}); }`,
      );
    } else {
      lines.push(`if (${piece.varExpr} != null) out.push(${piece.pushExpr});`);
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

// Mirrors emit/render.ts's `isAbsentAllowedSpan`. A span is "absent-allowed"
// when its capture may legitimately be null/undefined at render time —
// either via .optional() or .repeats() with min: 0 (no children).
function isAbsentAllowedSpan(span: ResolvedSpan): boolean {
  for (const m of span.modifiers) {
    if (m.kind === 'optional') return true;
    if (m.kind === 'repeats' && (m.min === undefined || m.min === 0)) return true;
  }
  return false;
}

// Mirrors emit/render.ts's `repeatsJoinSeparator`. Returns the per-array
// join separator declared by `.repeats(...)`, or null when the span doesn't
// repeat. `.repeats()` without explicit `sep` defaults to a single space
// (matches the schema-level whitespace policy that drives parsing).
function repeatsJoinSeparator(span: ResolvedSpan): string | null {
  for (const m of span.modifiers) {
    if (m.kind === 'repeats') {
      return m.sep === undefined ? ' ' : m.sep;
    }
  }
  return null;
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
