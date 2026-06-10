// Emit byte-level primitive code for one span in a production body.
// All emitted code operates on the function-locals `input`, `len`, `off`,
// and the `state` reference (only touched when calling another parse fn).
// Failure: rewinds `off` to a saved entry, returns null from the enclosing
// production function. Caller wraps each emit in the right rewind context.

import type { Refinement, SpanModifier } from '@parser2/parser';
import { type InferredSchema, type NodeTypeInfo, type ResolvedSpan } from '../../model.ts';
import { lowerLiteralSpan } from '../../lower/literal-span.ts';
import { indent, jsIdent, jsString } from '../strings.ts';
import { findSpanModifier, hasSpanModifier } from './modifiers.ts';
import { emitRoleLadder } from './role-ladder.ts';
import { buildAcScanner } from './scan-until-ac.ts';

// Minimum number of stops to justify the AC scanner's setup cost. Below this
// threshold the per-stop compare chain (emitStopExpr) is faster — its branches
// already inline into the byte-walk loop and the JIT can hoist constants.
// At 3+ stops the AC state machine wins because (a) each input byte triggers
// at most one switch-case dispatch instead of a chain of `__c === N || ...`
// comparisons, and (b) overlapping prefixes are merged into shared trie
// edges. Picked from the spec for Task 4.3.
const AC_MIN_STOPS = 3;

// Compute the union set of byte values (0..255) that can legitimately start a
// token in this schema: literal/punctuator first byte, class-scanner first
// byte ranges (ident-start, digit, hex, string quotes, comment `/`), plus the
// 4 whitespace bytes. Used by .until() bodies when the schema declares
// unknownChars: 'reject' to fail fast on undeclared bytes.
export function computeKnownLeadingBytes(schema: InferredSchema): Uint8Array {
  const bits = new Uint8Array(256);
  // Whitespace (tab, LF, CR, space).
  bits[0x09] = 1; bits[0x0a] = 1; bits[0x0d] = 1; bits[0x20] = 1;
  // Literals + punctuators — take the first byte of each declared text.
  for (const [text] of schema.literalTypeByText) {
    if (text.length > 0) bits[text.charCodeAt(0) & 0xff] = 1;
  }
  // Class-scanner first-byte ranges. Note: TokenClassUsage uses `.class` (a
  // SpanClass string), not `.kind`. Refinements live in `.refinements`.
  for (const cls of schema.classes) {
    if (cls.class === 'ident') {
      // ident-start: A-Z, a-z, _; also - for css-ident, $ for js-ident.
      for (let c = 0x41; c <= 0x5a; c++) bits[c] = 1; // A-Z
      for (let c = 0x61; c <= 0x7a; c++) bits[c] = 1; // a-z
      bits[0x5f] = 1; // _
      if (cls.refinements.some((r) => r.name === 'css')) bits[0x2d] = 1; // -
      if (cls.refinements.some((r) => r.name === 'js')) bits[0x24] = 1;  // $
    } else if (cls.class === 'number') {
      for (let c = 0x30; c <= 0x39; c++) bits[c] = 1; // 0-9
      bits[0x2d] = 1; // leading minus
      bits[0x2b] = 1; // leading plus
      bits[0x2e] = 1; // leading dot (decimal)
    } else if (cls.class === 'hex') {
      bits[0x23] = 1; // '#'
    } else if (cls.class === 'string') {
      bits[0x22] = 1; bits[0x27] = 1; // " '
    } else if (cls.class === 'comment') {
      bits[0x2f] = 1; // '/'
    }
    // operator class is left permissive — its leading bytes arrive via
    // the literalTypeByText loop above when used as tokens in productions.
  }
  return bits;
}

export type SpanContext = {
  // The local variable name where the parent's entry-offset is saved
  // (rewound on failure).
  readonly entryOffVar: string;
  // Whether this span lives in raws mode emit (for source-offset capture).
  readonly raws: boolean;
  // Token classes declared by the schema (`tokens: [...]`). Drives the
  // scan-until kernel's per-iteration handling of strings ("…"/'…') and
  // comments (/* … */). When 'string' is present, the kernel skips quoted
  // ranges as opaque units. When 'comment' is present, it skips /* … */
  // ranges and tracks them in a sparse comments array used by the captured-
  // slice builder. Empty set = bare byte scan with no special skips.
  readonly tokens: ReadonlySet<string>;
  // True when the schema declares an ident class with the 'css' refinement.
  // Adds url(...) raw-mode handling to balanced .until() scans so an
  // unterminated /* inside url() can't greedily eat across statement bounds.
  readonly cssIdent: boolean;
  // Node-type table used by the multi-role role-dispatch ladder to compute
  // per-role first-byte signatures (see `emitRoleLadder` below). Reading
  // this is the only schema-wide lookup performed at span-emit time.
  readonly nodeTypes: ReadonlyMap<string, NodeTypeInfo>;
  // Whether to emit the unknownChars guard inside .until() bodies.
  // True only when the schema both declares `unknownChars: 'reject'` AND has
  // at least one token class declared — without class declarations the
  // knownBytes set would be trivially narrow (whitespace + literal first
  // bytes only) and would reject legitimate content in simple test schemas.
  readonly emitUnknownCharsGuard: boolean;
  // 256-element bitset: bits[c] === 1 iff byte c may legitimately start a
  // token in this schema. Computed by computeKnownLeadingBytes. Only
  // consulted when emitUnknownCharsGuard is true.
  readonly knownBytes: Uint8Array;
  // Symbol prefix prepended to every emitted top-level function name (parse<Role>,
  // __fusedRender_<Role>_<idx>_<target>, etc.). Default '' produces byte-identical
  // output to the prior code path. See InferredSchema.symbolPrefix.
  readonly symbolPrefix: string;
  // Schema's declared operator literals, longest-first. Consumed by the
  // .operator() class scanner to emit a longest-match dispatch over the
  // declared set. Empty when the schema declares no `operators:` layers
  // (in which case any .operator() span would already have failed the
  // tokenizer pass earlier).
  readonly operatorLiterals: ReadonlyArray<string>;
  // Phase 4c v2: `whitespace: 'preserve'` mode triggers per-iteration ws
  // capture inside .repeats() spans (so the inter-Decl `; ` shape
  // survives round-trip, not just intra-Decl ws). When true, the
  // repeats emit declares a sibling `__<name>_iws` array and the
  // SpanBindings.iwsExpr map registers the parent's access to it. The
  // rebuild emit consults the same map and specializes the slot's
  // array-join to interleave items with the captured ws slices.
  readonly preserveWs: boolean;
  // Layer 1 raws sidecar (2026-06-08-raws-sidecar.md). Controls whether
  // the parser emits __ws / __litPres / *_iws capture sites, and how:
  //   - 'always'    eager (preserve schemas; pre-raws behaviour)
  //   - 'raws-only' lazy + runtime-gated on state.mode === 'raws'
  //   - 'none'      no captures (tail-mode bodies)
  readonly wsCaptureMode: 'always' | 'raws-only' | 'none';
  // Phase 4c v5: line comment markers declared via the `comment` token
  // class with a `line` refinement (`tokens: [{ class: 'comment',
  // refinements: [{ name: 'line', args: ['//'] }] }]`). When non-empty,
  // the inter-span ws-skip, repeats sep-sweep, and __parse leading /
  // trailing skip also consume `<marker>...\n` regions alongside block
  // comments. Empty for schemas that don't opt in (default).
  readonly lineCommentMarkers: ReadonlyArray<string>;
  // Phase 5a — lazy span value capture. The set of span names whose
  // VALUE is referenced by some render body or inverseDerived in this
  // production (computed by computeReferencedSpanValues). When a named
  // class or literal span is absent from this set AND has no
  // value-dependent refinement (`oneOf` / `lengths`), its `const <name>
  // = input.slice(...)` line is elided and bindings.valueExpr is not
  // populated — emit/captures.ts then drops the field from the captures
  // payload. Start/end offset locals are still emitted whenever a
  // synthetic ref needs them (see collectOffsetRefs). Undefined means
  // "treat every named span as referenced" — the conservative legacy
  // behavior, kept as the default for callers (e.g. shared-dispatch
  // prefix bodies) that haven't been threaded.
  readonly referencedValueSpans?: ReadonlySet<string>;
  // Phase 5a extension — lazy presence capture for OPTIONAL class spans.
  // When set, names a span whose PRESENCE (but not value) is referenced
  // by some render body. emitClassSpan's optional branch then substitutes
  // a `<name>_present: boolean` local for the `<name>: string | null`
  // local, eliding the input.slice() — the captures payload still carries
  // a nullable marker (`presentVar ? true : null`) so render-side
  // span-presence checks keep working. Undefined means "no presence info
  // available" — caller-friendly default; emit falls back to the
  // pre-optimization shape for optional spans.
  readonly referencedPresenceSpans?: ReadonlySet<string>;
};

export type SpanBindings = {
  // Span name → JS expression that evaluates to the captured value.
  readonly valueExpr: Map<string, string>;
  // Span name → JS expression for presence (used by optional spans).
  readonly presenceExpr: Map<string, string>;
  // Span name → JS expressions for start/end offsets (used by $.gap).
  readonly startOffExpr: Map<string, string>;
  readonly endOffExpr: Map<string, string>;
  // Phase 4c v2: span name → JS expression for the per-iteration ws
  // array captured by a `.repeats()` span in preserve mode. Empty for
  // non-preserve schemas and for non-repeats spans.
  readonly iwsExpr: Map<string, string>;
};

// Re-exported under the legacy names so existing imports (`dispatch.ts`) keep
// resolving. Implementations live in `./modifiers.ts` to avoid duplication
// between this file and `./role-ladder.ts`.
export const findModifier = findSpanModifier;
export const hasModifier = hasSpanModifier;

// Emit the JS that handles one span in sequence. Returns the source code
// block to splice into the production body (no trailing newline).
export function emitSpan(
  span: ResolvedSpan,
  ctx: SpanContext,
  bindings: SpanBindings,
): string {
  const isRepeats = findModifier(span, 'repeats') !== undefined;
  const isUntil = findModifier(span, 'until') !== undefined;
  const isOptional = hasModifier(span, 'optional');

  // Recursive role (single or multi)
  if (span.recursiveRoles.length > 0) {
    if (isRepeats) return emitRepeatsSpan(span, ctx, bindings);
    return emitRecursiveSpan(span, ctx, bindings, isOptional);
  }

  // Until/rawUntil — byte-level scan with bracket / string / comment skips
  // (until) or plain literal-stop scan (rawUntil). See the kernel below.
  const untilMod = findModifier(span, 'until');
  if (untilMod) return emitUntilSpan(span, untilMod, ctx, bindings);
  const rawUntilMod = findModifier(span, 'rawUntil');
  if (rawUntilMod) return emitRawUntilSpan(span, rawUntilMod, ctx, bindings);

  // Literal span
  if (span.class === 'literal') {
    return emitLiteralSpan(span, ctx, bindings, isOptional);
  }

  // Class span (ident / number / hex / string / comment)
  return emitClassSpan(span, ctx, bindings, isOptional);
}

function emitLiteralSpan(
  span: ResolvedSpan,
  ctx: SpanContext,
  bindings: SpanBindings,
  isOptional: boolean,
): string {
  // Phase 1 unification — single source of truth for literal-span shape.
  // Lowering converts the ResolvedSpan into a small declarative record
  // shared with interp/parse.ts:parseLiteralSpan. The compile-time emit
  // below specialises that record into inline TS; interp's runtime
  // walker executes the same record verbatim. Both stay in lockstep
  // via the LiteralSpanProgram type.
  const prog = lowerLiteralSpan(span);
  // Allow the caller's `isOptional` flag (computed once in emitSpan)
  // to override the program's modifier flag — preserves the existing
  // tail-call behaviour for optional spans hoisted into a parent.
  const effective: typeof prog = prog.optional === isOptional
    ? prog
    : { ...prog, optional: isOptional };
  const text = effective.text;
  const matchExpr = literalMatchExpr(text, 'off');
  const len = text.length;

  if (effective.optional) {
    // Optional literal: try to match, advance if matched. Never fails.
    if (effective.name !== null) {
      const name = effective.name;
      const v = jsIdent(name);
      bindings.valueExpr.set(name, v);
      bindings.presenceExpr.set(name, `(${v} !== null)`);
      const startVar = `__${v}_start`, endVar = `__${v}_end`;
      bindings.startOffExpr.set(name, startVar);
      bindings.endOffExpr.set(name, endVar);
      return `let ${v}: string | null = null;
let ${startVar} = off;
let ${endVar} = off;
if (${matchExpr}) {
  ${startVar} = off;
  off += ${len};
  ${endVar} = off;
  ${v} = ${jsString(text)};
}`;
    }
    return `if (${matchExpr}) { off += ${len}; }`;
  }

  // Required literal
  if (effective.name !== null) {
    const name = effective.name;
    const v = jsIdent(name);
    const startVar = `__${v}_start`, endVar = `__${v}_end`;
    bindings.startOffExpr.set(name, startVar);
    bindings.endOffExpr.set(name, endVar);
    // Phase 5a — lazy capture. A literal span's value is the known
    // constant `text`; emit the `const ${v} = "<text>"` line and bind
    // it into the captures payload only when some render body or
    // inverseDerived references the name. When unreferenced, the
    // start/end offset locals are still emitted (synthetic refs may
    // need them) but the constant-string allocation and the captures
    // field are skipped.
    const isReferenced =
      ctx.referencedValueSpans === undefined || ctx.referencedValueSpans.has(name);
    if (isReferenced) {
      bindings.valueExpr.set(name, v);
      return `if (!(${matchExpr})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
const ${startVar} = off;
off += ${len};
const ${endVar} = off;
const ${v} = ${jsString(text)};`;
    }
    return `if (!(${matchExpr})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
const ${startVar} = off;
off += ${len};
const ${endVar} = off;`;
  }
  return `if (!(${matchExpr})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
off += ${len};`;
}

function emitClassSpan(
  span: ResolvedSpan,
  ctx: SpanContext,
  bindings: SpanBindings,
  isOptional: boolean,
): string {
  const v = span.name ? jsIdent(span.name) : '__unnamed';
  const { startPredicate, scanBody } = classScanCode(span, ctx);
  const startVar = `__${v}_start`, endVar = `__${v}_end`;

  if (isOptional) {
    // Phase 5a extension — three-way branch by what's actually referenced:
    //
    //   (a) value referenced OR refinement needs the slice
    //       → keep the `string | null` local + input.slice() (legacy shape).
    //   (b) presence referenced, value isn't
    //       → boolean `<name>_present` local; captures.<name> carries
    //         `(presentVar || null)` so render-side `!= null` checks work.
    //   (c) neither referenced
    //       → boolean for the parse-time gate only, no captures field.
    //
    // Conservative fallback: if either set is undefined (caller didn't
    // thread Phase 5a info), behave as if the span is referenced.
    if (!span.name) {
      return `let ${v}: string | null = null;
let ${startVar} = off;
let ${endVar} = off;
if (${startPredicate}) {
  ${startVar} = off;
  ${scanBody}
  ${endVar} = off;
  ${v} = input.slice(${startVar}, ${endVar});
}`;
    }
    const isReferenced =
      ctx.referencedValueSpans === undefined || ctx.referencedValueSpans.has(span.name);
    const needsValueForRefinement = hasValueDependentRefinement(span);
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
    if (isReferenced || needsValueForRefinement) {
      if (isReferenced) bindings.valueExpr.set(span.name, v);
      bindings.presenceExpr.set(span.name, `(${v} !== null)`);
      return `let ${v}: string | null = null;
let ${startVar} = off;
let ${endVar} = off;
if (${startPredicate}) {
  ${startVar} = off;
  ${scanBody}
  ${endVar} = off;
  ${v} = input.slice(${startVar}, ${endVar});
}`;
    }
    const presentVar = `${v}_present`;
    const presenceReferenced =
      ctx.referencedPresenceSpans !== undefined && ctx.referencedPresenceSpans.has(span.name);
    bindings.presenceExpr.set(span.name, presentVar);
    if (presenceReferenced) {
      // Surface a nullable marker in captures so render-side
      // `captures.<name> != null` checks distinguish present from absent.
      // `presentVar || null` is `true` when present and `null` when not.
      bindings.valueExpr.set(span.name, `(${presentVar} || null)`);
    }
    return `let ${presentVar} = false;
let ${startVar} = off;
let ${endVar} = off;
if (${startPredicate}) {
  ${startVar} = off;
  ${scanBody}
  ${endVar} = off;
  ${presentVar} = true;
}`;
  }

  if (span.name) {
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
    // Phase 5a — lazy capture. The captured slice is needed when:
    //   (a) some render body or inverseDerived references the name, OR
    //   (b) a post-scan refinement check (`oneOf` / `lengths`) reads
    //       the value to gate acceptance.
    // When neither holds, skip both the slice extraction and the
    // captures-payload field. Start/end offset locals are kept so
    // downstream synthetic refs (gap/raw/tail/etc.) still resolve.
    const isReferenced =
      ctx.referencedValueSpans === undefined || ctx.referencedValueSpans.has(span.name);
    const needsValueForRefinement = hasValueDependentRefinement(span);
    if (isReferenced || needsValueForRefinement) {
      if (isReferenced) bindings.valueExpr.set(span.name, v);
      return `if (!(${startPredicate})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
const ${startVar} = off;
${scanBody}
const ${endVar} = off;
${emitClassSpanValueExpr(span, v, startVar, endVar)}${emitRefinementChecks(span, v, ctx.entryOffVar)}`;
    }
    return `if (!(${startPredicate})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
const ${startVar} = off;
${scanBody}
const ${endVar} = off;`;
  }
  return `if (!(${startPredicate})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
${scanBody}`;
}

// Returns true when the span has a post-scan refinement whose check reads
// the captured value (`oneOf`, `lengths`). Scan-time refinements like
// `.int()` / `.float()` / `.binary()` etc. shape the scanner predicate
// itself and do not require the captured value at runtime.
function hasValueDependentRefinement(span: ResolvedSpan): boolean {
  for (const ref of span.refinements) {
    if (ref.name === 'oneOf' || ref.name === 'lengths') return true;
  }
  return false;
}

function emitRecursiveSpan(
  span: ResolvedSpan,
  ctx: SpanContext,
  bindings: SpanBindings,
  isOptional: boolean,
): string {
  const roles = span.recursiveRoles;
  if (roles.length === 0) {
    throw new Error(`v2: emitRecursiveSpan called with no roles (span '${span.name ?? '?'}')`);
  }
  const v = span.name ? jsIdent(span.name) : '__unnamed';
  const startVar = `__${v}_start`, endVar = `__${v}_end`;

  // Single role: direct call, no ladder needed.
  if (roles.length === 1) {
    const role = roles[0]!;
    if (isOptional) {
      // Optional recursive: try parsing; if null, no advance, span absent.
      if (span.name) {
        bindings.valueExpr.set(span.name, v);
        bindings.presenceExpr.set(span.name, `(${v} !== null)`);
        bindings.startOffExpr.set(span.name, startVar);
        bindings.endOffExpr.set(span.name, endVar);
      }
      return `state.pos = off;
const ${startVar} = off;
const ${v} = ${ctx.symbolPrefix}parse${role}(state);
off = state.pos;
const ${endVar} = off;
${v === '__unnamed' ? `if (${v} !== null) {} /* result discarded */` : ''}`;
    }

    if (span.name) {
      bindings.valueExpr.set(span.name, v);
      bindings.startOffExpr.set(span.name, startVar);
      bindings.endOffExpr.set(span.name, endVar);
      return `state.pos = off;
const ${startVar} = off;
const ${v} = ${ctx.symbolPrefix}parse${role}(state);
if (${v} === null) { state.pos = ${ctx.entryOffVar}; return null; }
off = state.pos;
const ${endVar} = off;`;
    }
    return `state.pos = off;
const __r = ${ctx.symbolPrefix}parse${role}(state);
if (__r === null) { state.pos = ${ctx.entryOffVar}; return null; }
off = state.pos;`;
  }

  // Multi-role: emit a byte-prefix ladder that peeks the next byte and
  // dispatches to the matching role. See `emitRoleLadder` for the contract
  // we reuse across non-repeats (this function) and the future repeats loop
  // (Task 1.3c). Per-span `__r` is scoped to an inner block so adjacent
  // multi-role spans within the same production body never collide.
  const ladder = emitRoleLadder(roles, ctx, { resultVar: '__r' });

  if (isOptional) {
    // Optional multi-role: speculation that never advances on no-match. The
    // ladder produces `__r = null` when no role's first byte matched OR the
    // matched role's parse function returned null, so we treat both as
    // "absent". (Differs from non-optional: we don't rewind+return null.)
    if (span.name) {
      bindings.valueExpr.set(span.name, v);
      bindings.presenceExpr.set(span.name, `(${v} !== null)`);
      bindings.startOffExpr.set(span.name, startVar);
      bindings.endOffExpr.set(span.name, endVar);
    }
    return `state.pos = off;
const ${startVar} = off;
let ${v}: unknown = null;
{
  let __r: unknown = null;
${indent(ladder, 1)}
  ${v} = __r;
}
off = state.pos;
const ${endVar} = off;`;
  }

  if (span.name) {
    bindings.valueExpr.set(span.name, v);
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
    return `state.pos = off;
const ${startVar} = off;
let ${v}: unknown = null;
{
  let __r: unknown = null;
${indent(ladder, 1)}
  ${v} = __r;
}
if (${v} === null) { state.pos = ${ctx.entryOffVar}; return null; }
off = state.pos;
const ${endVar} = off;`;
  }
  return `state.pos = off;
{
  let __r: unknown = null;
${indent(ladder, 1)}
  if (__r === null) { state.pos = ${ctx.entryOffVar}; return null; }
}
off = state.pos;`;
}

function emitRepeatsSpan(
  span: ResolvedSpan,
  ctx: SpanContext,
  bindings: SpanBindings,
): string {
  const roles = span.recursiveRoles;
  if (roles.length === 0) {
    throw new Error(`v2: repeats span has no recursive roles (span '${span.name ?? '?'}')`);
  }
  const repeats = findModifier(span, 'repeats')!;
  const isIndented = hasModifier(span, 'indent');
  if (isIndented && repeats.sep !== undefined) {
    throw new Error(
      `emit v2: span '${span.name ?? '<unnamed>'}' combines .indent() with .repeats({ sep }); this is unsupported in Phase 7.`,
    );
  }
  const min = repeats.min ?? 0;
  const max = repeats.max;
  const sep = repeats.sep;
  const stopBefore = repeats.stopBefore;
  const trailing = repeats.trailing ?? 'allowed';
  const listVar = span.name ? jsIdent(span.name) : '__repeated';
  const startVar = `__${listVar}_start`, endVar = `__${listVar}_end`;
  // Phase 4c v5: per-iteration ws capture for every named .repeats() —
  // sep-bearing AND sep-less. The sep-less case fires when callers need
  // byte-exact round-trip on grammars that can't use `sep: ''` (the
  // interp loops on zero-length sweeps). The captured slice is the
  // inter-item region the loop body's leading ws-skip just consumed.
  // iws capture fires whenever the production-level ws capture is on
  // (preserve schemas eagerly; standard schemas lazily under raws mode).
  // The actual array is `string[]` for eager and `string[] | null` for
  // lazy — push sites are wrapped accordingly below.
  const captureIws = ctx.wsCaptureMode !== 'none' && span.name !== undefined;
  const iwsEager = ctx.wsCaptureMode === 'always';
  const iwsVar = captureIws ? `__${listVar}_iws` : '';
  // Scope-uniquify __prevItemEnd by the listVar so two .repeats() spans
  // in the same production (e.g. iso-duration's `date` + `time`) don't
  // redeclare the same `let` binding at the production function scope.
  const prevItemEndVar = captureIws ? `__${listVar}_prevItemEnd` : '';

  if (span.name) {
    bindings.valueExpr.set(span.name, listVar);
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
    if (captureIws) bindings.iwsExpr.set(span.name, iwsVar);
  }

  // Build the inner "try one role" code block. Single role: direct call.
  // Multi-role: use the byte-prefix ladder (returns null when no role's
  // first byte matched OR the matched role's parse returned null).
  //
  // Both forms write the result into the caller-named local `__cand`.
  // `__cand === null` means "no match at this position" — the loop breaks.
  const tryItemBlock = roles.length === 1
    ? `state.pos = off;
__cand = ${ctx.symbolPrefix}parse${roles[0]!}(state);
if (__cand !== null) { off = state.pos; }`
    // emitRoleLadder skips inter-role ws, peeks the first byte, dispatches.
    // On success it sets __cand and updates state.pos; the next line aligns
    // `off` with that. On no-match it leaves __cand === null and off
    // unchanged (the ladder's leading ws-skip DID advance `off` past inter-
    // item whitespace — that's fine; we don't rewind a no-match's ws because
    // the parent body's outer ws-skip / next-span won't be confused by it).
    : `${emitRoleLadder(roles, ctx, { resultVar: '__cand' })}
if (__cand !== null) { off = state.pos; }`;

  // Optional stopBefore: before attempting an item, check whether the
  // upcoming source starts with any literal prefix in stopBefore. If so,
  // exit the loop without consuming anything. Mirrors v1's emitStopBeforeCheck
  // (compact byte-bucketed form).
  const stopBeforeCheck = emitStopBeforeCheck(stopBefore);

  // Build the separator-sweep block. Run at the TOP of each loop iteration
  // (after the first), BEFORE attempting the next item. Mirrors v1's
  // emitRepeatedSpan which sweeps `while (sepMatch) { off += sep.length; skipWs }`
  // before each item attempt. This tolerates two cases at once:
  //   1. The previous item did NOT consume the separator → we sweep it here.
  //   2. The previous item DID consume an optional separator → the sweep
  //      finds zero seps and we proceed straight to the next item.
  //
  // The sweep is a `while` (not `if`) so consecutive separators (e.g. `a;;b`
  // in CSS-like grammars where the rule has `.span(';').optional()`) are
  // absorbed exactly the way v1 absorbs them.
  //
  // __preSweep records the offset before the sweep so trailing:forbidden can
  // rewind when a sweep consumed a sep but no item followed. __sepConsumed
  // records whether THIS sweep consumed at least one sep, used by both
  // trailing:forbidden (rewind) and trailing:required (final check).
  // Phase 4c v4: when the schema declares the `comment` token class,
  // the sep-sweep also consumes `/* ... */` block comments alongside
  // whitespace — UNLESS the repeats roles include a Comment-style
  // production (e.g. CSS's Stylesheet body lists Comment as a role).
  // Eating comments there would silently consume what the role
  // dispatcher is meant to capture as a Comment node.
  const rolesConsumeComments = roles.some((roleName) => {
    const info = ctx.nodeTypes.get(roleName);
    if (!info) return false;
    for (const prod of info.productions) {
      const firstSpan = prod.spans[0];
      if (firstSpan && firstSpan.class === 'comment') return true;
    }
    return false;
  });
  const lineCheck = ctx.lineCommentMarkers.length === 0
    ? ''
    : ctx.lineCommentMarkers.map((marker) => {
        const m = JSON.stringify(marker);
        return `  if (input.startsWith(${m}, off)) {
    off += ${marker.length};
    while (off < len && input.charCodeAt(off) !== 0x0a) off++;
    if (off < len) off++;
    continue;
  }`;
      }).join('\n');
  const sweepWsBlock = ctx.tokens.has('comment') && !rolesConsumeComments
    ? `while (off < len) {
  const __sw = input.charCodeAt(off);
  if (__sw === 0x20 || __sw === 0x09 || __sw === 0x0a || __sw === 0x0d) { off++; continue; }
  if (__sw === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
    off += 2;
    while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
    if (off < len) off += 2;
    continue;
  }
${lineCheck}
  break;
}`
    : `while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }`;
  const sepBlock = sep
    ? `__preSweep = off;
__sepConsumed = false;
// Skip ws (and comments when declared) before the separator.
${sweepWsBlock}
while (${literalMatchExpr(sep, 'off')}) {
  __sepConsumed = true;
  off += ${sep.length};
  // Skip ws (and comments) after the separator.
  ${sweepWsBlock}
}`
    // No explicit separator. Inter-item whitespace is absorbed by the inner
    // `try one role` block:
    //   - multi-role: the role-ladder skips ws before its first-byte peek
    //   - single-role: the called parse fn skips its own leading ws
    // The break-on-no-match condition (__cand === null) handles loop exit
    // when no role's first byte matches the next non-ws byte. We emit an
    // empty string (not a comment) so the resulting source carries no dead
    // text into the generated parser.
    : ``;

  // Trailing-separator policy. The top-of-loop sweep tracks __sepConsumed
  // (was any sep absorbed before the current item attempt) and __preSweep
  // (offset before that sweep). After the loop:
  //   - trailing:forbidden — if the last sweep consumed a sep but no item
  //     followed, rewind `off` to __preSweep so the trailing sep is left
  //     unconsumed for the parent's next span.
  //   - trailing:required — if items were parsed but the most recent sweep
  //     before exit did NOT consume a sep, the last item lacks its required
  //     trailing sep → fail the production.
  const trailingChecks: string[] = [];
  // Phase 4c v5 (roadmap leftover #2 follow-up): when the loop exits
  // and the most recent sep-sweep consumed only whitespace (no sep, no
  // item followed), the consumed ws belongs to the parent's inter-span
  // gap — not to this repeats span. Without the rewind, captures.__ws
  // for that gap is the empty string and raws-mode stringify loses
  // bytes. Fast mode is unaffected: off only shifts BACK, so the next
  // span's leading ws-skip eats the same bytes; the canonical-sep
  // fallback already produces the right output. Sep-bearing path only;
  // sep-less repeats don't have the __preSweep/__sepConsumed locals.
  if (sep !== undefined) {
    trailingChecks.push(`if (!__sepConsumed) { off = __preSweep; }`);
  }
  if (sep !== undefined && trailing === 'forbidden') {
    trailingChecks.push(`if (__sepConsumed) { off = __preSweep; }`);
  }
  if (sep !== undefined && trailing === 'required') {
    trailingChecks.push(
      `if (${listVar}.length > 0 && !__sepConsumed) { state.pos = ${ctx.entryOffVar}; return null; }`,
    );
  }

  // min/max enforcement. We treat min as a hard fail (rewind + null);
  // max same. v1 throws SyntaxError on these but v2's contract is to return
  // null and let the dispatcher surface the deepest position via state.maxOff.
  const minCheck = min > 0
    ? `if (${listVar}.length < ${min}) { state.pos = ${ctx.entryOffVar}; return null; }`
    : '';
  const maxCheck = max !== undefined
    ? `if (${listVar}.length > ${max}) { state.pos = ${ctx.entryOffVar}; return null; }`
    : '';

  // Compose the loop. The structure (mirrors v1 emitRepeatedSpan layout):
  //
  //   start = off
  //   list = []
  //   loop:
  //     // BETWEEN items (skipped on first iteration):
  //     //   sweep ws, then sweep zero-or-more separators
  //     //   trailing tracking captures __sepConsumed + __preSweep
  //     (stopBefore? check; break)
  //     __cand = null; <try-one-item>
  //     if (__cand === null) break  // out of items; trailing checks handle policy
  //     list.push(__cand)
  //     if (off === __loopStart) break  // infinite-loop guard
  //   trailing checks
  //   min/max checks
  //   end = off
  const lines: string[] = [];
  lines.push(`const ${startVar} = off;`);
  lines.push(`const ${listVar}: unknown[] = [];`);
  if (sep !== undefined) {
    // Sep-sweep state. __sepConsumed reflects the most recent top-of-loop
    // sweep (true iff it absorbed at least one sep). __preSweep is the
    // offset before that sweep (used by trailing:forbidden to rewind off).
    lines.push(`let __sepConsumed = false;`);
    lines.push(`let __preSweep = off;`);
  }
  if (captureIws) {
    // Per-iteration ws capture. __iws is the parallel array (length
    // N-1 for N successful items). __prevItemEnd records the offset
    // immediately after the previous item was pushed. The first
    // iteration leaves __prevItemEnd at -1; subsequent iterations
    // archive `input.slice(__prevItemEnd, off)` AFTER the sep-sweep
    // (i.e. after the parser has settled on where the next item
    // should start), capturing the full sep+ws region between items.
    if (iwsEager) {
      lines.push(`const ${iwsVar}: string[] = [];`);
    } else {
      lines.push(`const ${iwsVar}: string[] | null = state.mode === 'raws' ? [] : null;`);
    }
    lines.push(`let ${prevItemEndVar} = -1;`);
  }
  if (isIndented) {
    // Indent prologue: skip blank lines + horizontal ws to find first item's
    // column, then push that column onto the indent stack so nested repeats
    // can gate against it. If the first non-blank column is not greater than
    // the parent's column (or the stack is empty), we still push and allow
    // the loop to run (min/max enforcement handles the empty case). The
    // overflow guard matches the reference interpreter's behaviour.
    lines.push(`state.pos = off;`);
    lines.push(`skipBlankLines(state);`);
    lines.push(`skipHorizontalWs(state);`);
    lines.push(`off = state.pos;`);
    lines.push(`const __indentCol = columnAt(state, off);`);
    lines.push(`const __parentCol = state.indentStackTop > 0 ? state.indentStack[state.indentStackTop - 1] : -1;`);
    lines.push(`let __indentPushed = false;`);
    lines.push(`if (__indentCol > __parentCol) {`);
    lines.push(`  if (state.indentStackTop >= 16) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }`);
    lines.push(`  state.indentStack[state.indentStackTop++] = __indentCol;`);
    lines.push(`  __indentPushed = true;`);
    lines.push(`}`);
  }
  lines.push(`while (true) {`);
  // Track the off at loop entry. If a successful child parse returns without
  // advancing `off`, we break to avoid an infinite loop. Matches v1
  // emitRepeatedSpan's `if (__off === __before) break;` guard. This can fire
  // on truly empty productions (no spans) or on productions whose only span
  // is an optional that didn't match.
  lines.push(`  const __loopStart = off;`);
  if (isIndented) {
    // Per-iteration column gate: skip blank lines + horizontal ws, then
    // check that the next non-blank character is at the same column as the
    // first item. Any deviation (dedent or over-indent) terminates the loop.
    // We only run this when a column was actually pushed (the first item's
    // column exceeded the parent's); if __indentPushed is false the loop
    // exits via the normal __cand === null path on the first attempt.
    //
    // Note for nested-indent work (Task 7.5 onwards): the prologue above
    // already ran skipBlankLines/skipHorizontalWs/off=state.pos to find
    // __indentCol, so on the FIRST iteration this block re-runs the same
    // skip and re-measures __col against the position the prologue settled
    // on. The result is __col === __indentCol — a tautology that costs a
    // few instructions but doesn't break correctness. The reference
    // interpreter has the identical layout; do not "optimize away" the
    // first-iteration check unless both sides change together.
    lines.push(`  if (__indentPushed) {`);
    lines.push(`    state.pos = off;`);
    lines.push(`    skipBlankLines(state);`);
    lines.push(`    skipHorizontalWs(state);`);
    lines.push(`    off = state.pos;`);
    lines.push(`    if (off >= len) break;`);
    lines.push(`    const __col = columnAt(state, off);`);
    lines.push(`    if (__col !== __indentCol) break;`);
    lines.push(`  }`);
  }
  if (sep !== undefined) {
    // Top-of-loop sep-sweep, executed on EVERY iteration (including the
    // first). Mirrors v1 emitRepeatedSpan which sweeps leading separators
    // before each item attempt — e.g. CSS `a {;;\n  color: red; ;}` where
    // a Rule body opens with `;;` before any declaration is parsed. v1
    // absorbs them silently as separator noise. We do the same: on the
    // first iteration the absorbed seps don't count toward `__sepConsumed`
    // for trailing policy (because no item has been pushed yet, a leading
    // sep cannot be "trailing").
    lines.push(indent(sepBlock, 1));
  }
  if (sep === undefined && (stopBeforeCheck || captureIws)) {
    // Inter-iteration ws-skip. Two reasons it must run BEFORE the rest of
    // the loop body:
    //   1. stopBeforeCheck — tryItemBlock's own ws-skip (via emitRoleLadder)
    //      runs AFTER the stop check, so without this line a whitespace-
    //      prefixed stop trigger (e.g. `</code> <tr>`) would miss the
    //      check; the dispatch would then match the trigger as a child.
    //      When that child is itself a stopBefore-bearing repeats span
    //      (HTML's `<tr>` inside a `<td>`), every sibling row drives one
    //      extra recursion frame and the stack blows on large documents.
    //   2. captureIws — `__itemStart` is snapshotted below before
    //      tryItemBlock runs, and tryItemBlock's internal ws-skip
    //      advances state.pos past leading ws BEFORE we observe it. So
    //      without this line `input.slice(__prevItemEnd, __itemStart)`
    //      would be empty even when there IS inter-item whitespace.
    // The fused-render path in fusion.ts emits the same skip in the same
    // spot for byte-equivalence. When `sep` is defined, sepBlock already
    // lands us on the post-ws byte and this skip would be redundant.
    lines.push(`  while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }`);
  }
  if (stopBeforeCheck) {
    lines.push(indent(stopBeforeCheck, 1));
  }
  lines.push(`  let __cand: unknown = null;`);
  if (captureIws) {
    // Snapshot the offset where the upcoming item's parse will START
    // (after sep-sweep + leading ws-skip — both have run by now). We
    // resolve the inter-iteration slice using this snapshot below.
    lines.push(`  const __itemStart = off;`);
  }
  lines.push(indent(tryItemBlock, 1));
  lines.push(`  if (__cand === null) break;`);
  if (captureIws) {
    // Archive the slice between the previous item's end and this
    // item's start. Skip on the first item (prevItemEnd === -1).
    // Raws-only mode further gates the push on the lazy-allocated array
    // being non-null (fast mode leaves it null and skips entirely).
    if (iwsEager) {
      lines.push(`  if (${prevItemEndVar} >= 0) ${iwsVar}.push(input.slice(${prevItemEndVar}, __itemStart));`);
    } else {
      lines.push(`  if (${prevItemEndVar} >= 0 && ${iwsVar} !== null) ${iwsVar}.push(input.slice(${prevItemEndVar}, __itemStart));`);
    }
  }
  lines.push(`  ${listVar}.push(__cand);`);
  if (captureIws) {
    lines.push(`  ${prevItemEndVar} = off;`);
  }
  lines.push(`  if (off === __loopStart) break;`);
  lines.push(`}`);
  if (isIndented) {
    // Epilogue: pop the indent column from the stack when it was pushed in
    // the prologue. Must execute whether the loop exited via break or
    // exhaustion so the stack stays balanced for outer indent scopes.
    lines.push(`if (__indentPushed) state.indentStackTop--;`);
  }
  for (const c of trailingChecks) lines.push(c);
  if (minCheck) lines.push(minCheck);
  if (maxCheck) lines.push(maxCheck);
  lines.push(`const ${endVar} = off;`);
  return lines.join('\n');
}

// stopBefore handling — emit a check that breaks the repeats loop when the
// upcoming bytes start with any of the listed literal prefixes. Bucketed by
// first byte for cheap dispatch. Used by HTML's `<li>`/`<dt>`/etc. implicit-
// close idioms (see packages/html/src/schema.ts).
//
// Exported so the fused-render emitter (`emit/v2/fusion.ts`) can share the
// exact same byte-bucketed shape — captures-path and fused-path stopBefore
// MUST be byte-equivalent so a stopBefore-bearing schema can't diverge in
// input acceptance between the two backends.
export function emitStopBeforeCheck(stopBefore: ReadonlyArray<string> | undefined): string {
  if (!stopBefore || stopBefore.length === 0) return '';
  const stops = stopBefore.filter((s) => s.length > 0);
  if (stops.length === 0) return '';
  const byFirstByte = new Map<number, string[]>();
  for (const s of stops) {
    const c = s.charCodeAt(0);
    const bucket = byFirstByte.get(c) ?? [];
    bucket.push(s);
    byFirstByte.set(c, bucket);
  }
  const branches: string[] = [];
  for (const [code, bucket] of [...byFirstByte.entries()].sort(([a], [b]) => a - b)) {
    bucket.sort((a, b) => b.length - a.length);
    const tests = bucket.map((s) => {
      if (s.length === 1) return 'true';
      return `input.startsWith(${jsString(s)}, off)`;
    });
    branches.push(`if (__sb === ${code} && (${tests.join(' || ')})) break;`);
  }
  return `if (off < len) {
  const __sb = input.charCodeAt(off);
  ${branches.join('\n  ')}
}`;
}

// --- helpers ---------------------------------------------------------------

function literalMatchExpr(text: string, offVar: string): string {
  if (text.length === 1) {
    return `input.charCodeAt(${offVar}) === ${text.charCodeAt(0)}`;
  }
  if (text.length === 2) {
    return `input.charCodeAt(${offVar}) === ${text.charCodeAt(0)} && input.charCodeAt(${offVar} + 1) === ${text.charCodeAt(1)}`;
  }
  return `input.startsWith(${jsString(text)}, ${offVar})`;
}

// Emit the lead-byte predicate + body for a number-class scan, honoring the
// span's refinement set. The default (no refinement, or `.int()`) is a plain
// integer scan — matches v2's pre-1.3e behavior. Other refinements widen or
// narrow what bytes the scanner consumes:
//
//   .float()       — digits, optional `.fractional` (no exponent)
//   .scientific()  — float + optional `[eE][+-]?digits` exponent (superset of .float())
//   .separator(c)  — allow the given separator character between digit runs
//                    (and within fraction/exponent if those are enabled)
//   .bigint()      — integer + trailing `n` suffix
//   .binary()      — `0b` / `0B` prefix + binary digits
//   .octal()       — `0o` / `0O` prefix + octal digits
//
// Refinements stack: e.g. `.float().separator('_')` allows `1_000.5`.
// Prefix-based refinements (.binary / .octal) take priority — when present,
// they emit a prefix-locked scan that ignores .float/.scientific (binary
// floats aren't part of any current schema).
function numberScanCode(span: ResolvedSpan): { startPredicate: string; scanBody: string } {
  const refSet = new Set(span.refinements.map((r) => r.name));
  const isFloat = refSet.has('float') || refSet.has('scientific');
  const isScientific = refSet.has('scientific');
  const isBigint = refSet.has('bigint');
  const isBinary = refSet.has('binary');
  const isOctal = refSet.has('octal');

  // Find the separator character (if any). The builder stores it as
  // refinements[i] = { name: 'separator', args: [ch] }.
  let sepChar: string | undefined;
  for (const ref of span.refinements) {
    if (ref.name === 'separator' && Array.isArray(ref.args) && typeof ref.args[0] === 'string') {
      sepChar = ref.args[0] as string;
      break;
    }
  }
  const sepCode = sepChar !== undefined && sepChar.length === 1 ? sepChar.charCodeAt(0) : undefined;
  // Build "advance past one digit-or-separator" pattern. Separators are only
  // allowed BETWEEN digits — never leading or trailing — but the scan-time
  // check enforces that via the start predicate (must be a digit) and the
  // post-scan slice (consumers can validate further). This matches v1's lax
  // behavior: schemas that need stricter separator placement should layer a
  // `.oneOf` or similar value check on top.
  const digitOrSep = sepCode !== undefined
    ? `(isDigit(input.charCodeAt(off)) || input.charCodeAt(off) === ${sepCode})`
    : `isDigit(input.charCodeAt(off))`;

  // .binary() / .octal() — prefix-locked scan. These ignore .float/.scientific
  // because no current schema mixes them.
  if (isBinary) {
    return {
      startPredicate: `off + 1 < len && input.charCodeAt(off) === 0x30 && (input.charCodeAt(off + 1) === 0x62 || input.charCodeAt(off + 1) === 0x42)`,
      scanBody: `off += 2;
while (off < len && (input.charCodeAt(off) === 0x30 || input.charCodeAt(off) === 0x31${sepCode !== undefined ? ` || input.charCodeAt(off) === ${sepCode}` : ''})) off++;`,
    };
  }
  if (isOctal) {
    return {
      startPredicate: `off + 1 < len && input.charCodeAt(off) === 0x30 && (input.charCodeAt(off + 1) === 0x6f || input.charCodeAt(off + 1) === 0x4f)`,
      scanBody: `off += 2;
while (off < len && ((input.charCodeAt(off) >= 0x30 && input.charCodeAt(off) <= 0x37)${sepCode !== undefined ? ` || input.charCodeAt(off) === ${sepCode}` : ''})) off++;`,
    };
  }

  // Integer / float / scientific share the same shape — extra branches are
  // gated by refinement flags. Trailing `n` (.bigint) consumed after the
  // mantissa+exponent if both float and bigint are mixed; current schemas
  // don't combine them but the emitter is tolerant.
  const lines: string[] = [];
  // Optional leading sign. JSON requires `-` for negatives; the scan also
  // accepts `+` so schemas matching signed numerics (JSON5, scientific
  // exponents already covered separately) work without a separate
  // production. Behaviorally a no-op for unsigned numbers — startPredicate
  // still requires the next byte to be a digit.
  lines.push(`if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;`);
  // Integer (or mantissa) digit run.
  lines.push(`off++;\nwhile (off < len && ${digitOrSep}) off++;`);
  if (isFloat) {
    // Optional fractional part. Require at least one digit after the `.` so
    // `1.` doesn't consume the dot (v1's number scanner has the same rule;
    // see emitNumberScan in scannerless/scan-class.ts).
    lines.push(`if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
  off++;
  while (off < len && ${digitOrSep}) off++;
}`);
  }
  if (isScientific) {
    // Optional exponent. Only consumed when followed by a digit (with an
    // optional `+`/`-` sign in between) — mirrors v1's emit.
    lines.push(`if (off < len && (input.charCodeAt(off) === 0x65 || input.charCodeAt(off) === 0x45)) {
  let __expProbe = off + 1;
  if (__expProbe < len && (input.charCodeAt(__expProbe) === 0x2b || input.charCodeAt(__expProbe) === 0x2d)) __expProbe++;
  if (__expProbe < len && isDigit(input.charCodeAt(__expProbe))) {
    off = __expProbe;
    while (off < len && ${digitOrSep}) off++;
  }
}`);
  }
  if (isBigint) {
    // Trailing `n` suffix.
    lines.push(`if (off < len && input.charCodeAt(off) === 0x6e) off++;`);
  }
  return {
    // Accept either a digit (positive number) or a leading sign followed
    // by a digit (signed number). The scan body consumes the sign first
    // and the digit-run thereafter.
    startPredicate: `off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1))))`,
    scanBody: lines.join('\n'),
  };
}

function classScanCode(
  span: ResolvedSpan,
  ctx: SpanContext,
): { startPredicate: string; scanBody: string } {
  const cls = span.class;
  const refSet = new Set(span.refinements.map((r) => r.name));
  const isJs = refSet.has('js');
  const isCss = refSet.has('css');
  const isHtml = refSet.has('html');

  if (cls === 'ident') {
    if (isJs) {
      return {
        startPredicate: `off < len && isJsIdentStart(input.charCodeAt(off))`,
        scanBody: `off++;\nwhile (off < len && isJsIdentPart(input.charCodeAt(off))) off++;`,
      };
    }
    // css/html/default: same predicate (css-ish ident)
    return {
      startPredicate: `off < len && (isCssIdentStart(input.charCodeAt(off))${isCss || isHtml ? '' : ' || input.charCodeAt(off) === 0x5c'})`,
      scanBody: `off++;\nwhile (off < len && isCssIdentPart(input.charCodeAt(off))) off++;`,
    };
  }
  if (cls === 'number') {
    return numberScanCode(span);
  }
  if (cls === 'hex') {
    return {
      startPredicate: `off < len && isHexDigit(input.charCodeAt(off))`,
      scanBody: `off++;\nwhile (off < len && isHexDigit(input.charCodeAt(off))) off++;`,
    };
  }
  if (cls === 'string') {
    // The string class accepts " (0x22) and ' (0x27) by default. The
    // .backtick() refinement opts ` (0x60) in as an additional opener;
    // it is NOT a restriction (the rust backend treats it as the SOLE
    // opener via stringQuoteChar — a known cross-backend asymmetry).
    // Newline-in-string is rejected for "/'; backtick strings allow
    // newlines, matching the JS template-literal convention.
    const refSet = new Set(span.refinements.map((r) => r.name));
    const hasBacktick = refSet.has('backtick');
    const startPredicate = hasBacktick
      ? `off < len && (input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27 || input.charCodeAt(off) === 0x60)`
      : `off < len && (input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27)`;
    const newlineBreak = hasBacktick
      ? `if (__q !== 0x60 && (__c === 0x0a || __c === 0x0d)) break;`
      : `if (__c === 0x0a || __c === 0x0d) break;`;
    return {
      startPredicate,
      scanBody: `{
  const __q = input.charCodeAt(off);
  off++;
  while (off < len) {
    const __c = input.charCodeAt(off);
    if (__c === 0x5c && off + 1 < len) { off += 2; continue; }
    if (__c === __q) { off++; break; }
    ${newlineBreak}
    off++;
  }
}`,
    };
  }
  if (cls === 'comment') {
    return {
      startPredicate: `off + 1 < len && input.charCodeAt(off) === 0x2f && input.charCodeAt(off + 1) === 0x2a`,
      scanBody: `off += 2;
while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
if (off < len) off += 2;`,
    };
  }
  if (cls === 'operator') {
    const ops = ctx.operatorLiterals;
    if (ops.length === 0) {
      throw new Error(
        `v2: .operator() span '${span.name ?? '<unnamed>'}' has no operators declared on the schema; add an \`operators:\` map to defineSchema(...)`,
      );
    }
    // Longest-match: ops is pre-sorted longest-first. Predicate: any one of
    // them matches at off. Scan body: try each in order, advance off by the
    // matched literal's length. The match expression is a short-circuit `||`
    // chain so the JIT can fold single-byte ops to charCodeAt compares.
    const predicate = ops
      .map((op) => `(${literalMatchExpr(op, 'off')})`)
      .join(' || ');
    const scanLines = ops
      .map(
        (op) =>
          `if (${literalMatchExpr(op, 'off')}) { off += ${op.length}; }`,
      )
      .join(' else ');
    return {
      startPredicate: `off < len && (${predicate})`,
      scanBody: scanLines,
    };
  }
  throw new Error(`v2: class '${cls}' not yet supported`);
}

// Build the captured value expression for a class span. For 'comment'
// class with the `.comment()` refinement (the schema author explicitly
// asked for the comment's INTERIOR), strip `/* ... */` delimiters and
// trim surrounding whitespace — matches v1's commentInterior() runtime
// helper. When a span has the explicit `.coerce()` refinement, the slice
// is coerced to the class's native JS type — `Number(slice)` for the
// `number` class. This is opt-in so existing schemas that consume the
// raw slice (e.g. cron's structural fields) aren't silently retyped.
// Other class spans return the raw byte slice.
function emitClassSpanValueExpr(
  span: ResolvedSpan,
  captureVar: string,
  startVar: string,
  endVar: string,
): string {
  const refSet = new Set(span.refinements.map((r) => r.name));
  if (span.class === 'number' && refSet.has('coerce')) {
    return `const ${captureVar} = Number(input.slice(${startVar}, ${endVar}));`;
  }
  if (span.class === 'string' && refSet.has('coerce')) {
    return `const ${captureVar} = decodeJsonString(input.slice(${startVar}, ${endVar}));`;
  }
  if (span.class === 'comment') {
    // .comment() refinement is implicit for comment-class spans (the
    // schema's .span(...).comment() call sets class='comment' AND
    // refinement={name:'comment'}). Strip the wrapping `/*` and `*/`
    // and trim interior whitespace.
    return `let __${captureVar}_ts = ${startVar} + 2;
let __${captureVar}_te = ${endVar} - 2;
while (__${captureVar}_ts < __${captureVar}_te) {
  const __lc = input.charCodeAt(__${captureVar}_ts);
  if (__lc !== 0x20 && __lc !== 0x09 && __lc !== 0x0a && __lc !== 0x0d) break;
  __${captureVar}_ts++;
}
while (__${captureVar}_te > __${captureVar}_ts) {
  const __tc = input.charCodeAt(__${captureVar}_te - 1);
  if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
  __${captureVar}_te--;
}
const ${captureVar} = input.slice(__${captureVar}_ts, __${captureVar}_te);`;
  }
  return `const ${captureVar} = input.slice(${startVar}, ${endVar});`;
}

function emitRefinementChecks(span: ResolvedSpan, captureVar: string, entryOffVar: string): string {
  // Number-shape refinements (.int / .float / .scientific / .separator / .bigint
  // / .binary / .octal) are handled at scan time by numberScanCode below — they
  // change which bytes the scanner accepts. This function only emits post-scan
  // value tests: `.oneOf([...])` and `.lengths([N, ...])`.
  const checks: string[] = [];
  for (const ref of span.refinements) {
    if (ref.name === 'oneOf') {
      const values = ref.args?.[0];
      if (Array.isArray(values) && values.every((x) => typeof x === 'string')) {
        const lowered = (values as string[]).map((v) => v.toLowerCase());
        const cond = lowered.map((v) => `${captureVar}.toLowerCase() === ${jsString(v)}`).join(' || ');
        checks.push(`if (!(${cond})) { state.pos = ${entryOffVar}; return null; }`);
      }
    }
    if (ref.name === 'lengths') {
      // .lengths([N1, N2, ...]) requires the captured byte-length to match
      // one of the listed values. Used by css-color's hex schema to gate
      // accepted hex widths (`.lengths([3, 4, 6, 8])` — RGB / RGBA / RRGGBB
      // / RRGGBBAA). Without this refinement, malformed widths like `#12`
      // or `#123456789` would slip through the hex scanner. Phase 1.5
      // codegen gap, deferred at the time; restored here.
      const values = ref.args?.[0];
      if (Array.isArray(values) && values.every((x) => typeof x === 'number')) {
        const lens = [...new Set(values as number[])];
        if (lens.length > 0) {
          const cond = lens.map((n) => `${captureVar}.length === ${n | 0}`).join(' || ');
          checks.push(`if (!(${cond})) { state.pos = ${entryOffVar}; return null; }`);
        }
      }
    }
  }
  return checks.length === 0 ? '' : `\n${checks.join('\n')}`;
}

// --- until / rawUntil ------------------------------------------------------

function emitUntilSpan(
  span: ResolvedSpan,
  until: Extract<SpanModifier, { kind: 'until' }>,
  ctx: SpanContext,
  bindings: SpanBindings,
): string {
  // Byte-level scan to the earliest un-nested stop. Operates on the parent
  // body's `input` / `len` / `off` locals (no state writes mid-scan; we
  // record state.maxOff only on failure paths so the deepest position is
  // surfaced if a later span rejects the input).
  const stopExpr = emitStopExpr(until.stops, 'off');
  const stopNeedsC2 = stopExprNeedsSecondByte(until.stops);
  const balanced = until.balanced;
  const hasStrings = ctx.tokens.has('string');
  const hasComments = ctx.tokens.has('comment');
  const useUrlRaw = ctx.cssIdent && balanced;
  // AC fast-path eligibility: the Aho-Corasick state machine replaces the
  // per-stop compare chain when there are enough stops to justify the setup
  // cost. It is only sound when the scan has no interior token classes
  // (strings/comments) and no bracket-balance tracking, since those require
  // per-byte side state the AC emitter doesn't model. See `scan-until-ac.ts`
  // for the emitter — it advances `off` to the first match-start (or input
  // length on no match) and falls through.
  const nonEmptyStops = until.stops.filter((s) => s.length > 0);
  const useAc =
    !balanced &&
    !hasStrings &&
    !hasComments &&
    !useUrlRaw &&
    nonEmptyStops.length >= AC_MIN_STOPS;
  // .until() always trims trailing whitespace from the captured slice.
  // The schema's `trim` option is honored by v1's runtime config but the
  // emitter ignores it — every emitted .until() rewinds `off` to the last
  // non-ws byte. Matching that here keeps html `<!-- hello -->` capturing
  // `data: 'hello'` rather than the half-trimmed `'hello '` that a literal
  // `trim:false` would produce, and aligns v2 with v1 across all packages.
  const useTrim = true;

  const v = span.name ? jsIdent(span.name) : '__captured';
  const startVar = `__${v}_start`;
  const endVar = `__${v}_end`;

  // The captured value and its source-range locals live at the parent body's
  // scope so the captures expression at function exit can reference them.
  // The intermediate scan-kernel locals (depth/lastNonWs/etc.) are scoped to
  // an inner block to avoid colliding with adjacent span emits.
  const lines: string[] = [];
  lines.push(`let ${v}: string = '';`);
  lines.push(`let ${startVar} = off;`);
  lines.push(`let ${endVar} = off;`);
  lines.push(`{`);
  // Skip leading whitespace from the capture's view. Comments at the head of
  // a capture are also skipped so they don't end up in the captured slice.
  // The skip-ws/comments loop here mirrors v1's `__preWsOff`/leading-comment
  // handling.
  if (hasComments) lines.push(`  let __lastLeadingCommentEnd = -1;`);
  lines.push(`  while (off < len) {`);
  lines.push(`    const __c0 = input.charCodeAt(off);`);
  lines.push(`    if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }`);
  if (hasComments) {
    lines.push(`    if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {`);
    lines.push(`      off += 2;`);
    lines.push(`      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;`);
    lines.push(`      if (off < len) off += 2;`);
    lines.push(`      __lastLeadingCommentEnd = off;`);
    lines.push(`      continue;`);
    lines.push(`    }`);
  }
  lines.push(`    break;`);
  lines.push(`  }`);
  lines.push(`  ${startVar} = off;`);
  if (useTrim) lines.push(`  let __lastNonWs = off;`);
  if (balanced && !useAc) lines.push(`  let __depth = 0;`);
  if (stopNeedsC2 && !useAc) lines.push(`  let __c2 = -1;`);
  if (hasComments) lines.push(`  const __comments: [number, number][] = [];`);

  // --- main loop ------------------------------------------------------------
  if (useAc) {
    // Aho-Corasick fast-path: the state-machine scanner advances `off` to
    // the first match-start (or `len` on no match) in one O(n) pass. No
    // interior token skips, no bracket tracking — the eligibility predicate
    // above (`useAc`) already rejected scans that need them. After the scan
    // we walk back from `off` to compute `__lastNonWs` for the trim path.
    // The cost is O(trailing-ws) per scan, typically a handful of bytes.
    // NOTE: The unknownChars:'reject' guard is NOT emitted for the AC path.
    // AC scans have no per-byte side state, so there is no clean place to
    // insert a byte-class check without restructuring the generated code.
    // None of css/html/markdown currently combine AC-eligible scans (≥3
    // stops, no strings/comments/balanced) with unknownChars:'reject', so
    // this is a documented gap, not a live regression.
    const scanner = buildAcScanner(nonEmptyStops);
    lines.push(indent(scanner.emitJs('input', 'off'), 1));
    if (useTrim) {
      lines.push(`  __lastNonWs = off;`);
      lines.push(`  while (__lastNonWs > ${startVar}) {`);
      lines.push(`    const __wc = input.charCodeAt(__lastNonWs - 1);`);
      lines.push(`    if (__wc !== 0x20 && __wc !== 0x09 && __wc !== 0x0a && __wc !== 0x0d) break;`);
      lines.push(`    __lastNonWs--;`);
      lines.push(`  }`);
    }
  } else {
  // Hoist the known-byte bitset above the loop so it is allocated once per
  // .until() invocation, not once per input byte. The array literal is small
  // (256 entries) and JS engines constant-fold it at JIT time.
  if (ctx.emitUnknownCharsGuard) {
    const arrLit = '[' + Array.from(ctx.knownBytes).join(',') + ']';
    lines.push(`  const __KB = ${arrLit};`);
  }
  lines.push(`  while (off < len) {`);
  lines.push(`    const __c = input.charCodeAt(off);`);
  // Stop check (gated by depth when balanced).
  if (balanced) {
    lines.push(`    if (__depth === 0 && (${stopExpr})) break;`);
  } else {
    lines.push(`    if (${stopExpr}) break;`);
  }
  // Balanced brackets.
  if (balanced) {
    lines.push(`    if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {`);
    lines.push(`      __depth++; off++;`);
    if (useTrim) lines.push(`      __lastNonWs = off;`);
    lines.push(`      continue;`);
    lines.push(`    }`);
    lines.push(`    if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {`);
    lines.push(`      if (__depth === 0) break;`);
    lines.push(`      __depth--; off++;`);
    if (useTrim) lines.push(`      __lastNonWs = off;`);
    lines.push(`      continue;`);
    lines.push(`    }`);
  }
  // Strings as opaque units. Matches v1 stringSkip (single/double quote,
  // backslash-escape pair-consumes, newline aborts the scan to mirror CSS
  // tokenizer behavior so an unterminated quote can't eat the rest of input).
  if (hasStrings) {
    lines.push(`    if (__c === 0x22 || __c === 0x27) {`);
    lines.push(`      const __q = __c;`);
    lines.push(`      off++;`);
    lines.push(`      while (off < len) {`);
    lines.push(`        const __sc = input.charCodeAt(off);`);
    lines.push(`        if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }`);
    lines.push(`        if (__sc === __q) { off++; break; }`);
    lines.push(`        if (__sc === 0x0a || __sc === 0x0d) break;`);
    lines.push(`        off++;`);
    lines.push(`      }`);
    if (useTrim) lines.push(`      __lastNonWs = off;`);
    lines.push(`      continue;`);
    lines.push(`    }`);
  }
  // CSS url(...) raw-mode skip (only meaningful for balanced scans).
  if (useUrlRaw) {
    lines.push(`    if (__depth === 0 && (__c === 0x75 || __c === 0x55)`);
    lines.push(`      && off + 3 < len`);
    lines.push(`      && (input.charCodeAt(off + 1) | 32) === 0x72`);
    lines.push(`      && (input.charCodeAt(off + 2) | 32) === 0x6c`);
    lines.push(`      && input.charCodeAt(off + 3) === 0x28) {`);
    lines.push(`      off += 4;`);
    lines.push(`      while (off < len) {`);
    lines.push(`        const __uc = input.charCodeAt(off);`);
    lines.push(`        if (__uc === 0x29) { off++; break; }`);
    lines.push(`        if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }`);
    lines.push(`        if (__uc === 0x22 || __uc === 0x27) {`);
    lines.push(`          const __uq = __uc;`);
    lines.push(`          off++;`);
    lines.push(`          while (off < len) {`);
    lines.push(`            const __usc = input.charCodeAt(off);`);
    lines.push(`            if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }`);
    lines.push(`            if (__usc === __uq) { off++; break; }`);
    lines.push(`            if (__usc === 0x0a || __usc === 0x0d) break;`);
    lines.push(`            off++;`);
    lines.push(`          }`);
    lines.push(`          continue;`);
    lines.push(`        }`);
    lines.push(`        off++;`);
    lines.push(`      }`);
    if (useTrim) lines.push(`      __lastNonWs = off;`);
    lines.push(`      continue;`);
    lines.push(`    }`);
  }
  // Comments and CSS-escape pair (only in balanced scans; matches v1
  // commentSkip / escapeArm gating). Comment ranges are recorded so the
  // captured-slice builder can omit ws-adjacent comments.
  if (hasComments && balanced) {
    lines.push(`    if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {`);
    lines.push(`      let __ce = off + 2;`);
    lines.push(`      while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;`);
    lines.push(`      if (__ce < len) {`);
    lines.push(`        __comments.push([off, __ce + 2]);`);
    lines.push(`        off = __ce + 2;`);
    lines.push(`        continue;`);
    lines.push(`      }`);
    lines.push(`    }`);
  }
  if (balanced) {
    lines.push(`    if (__c === 0x5c && off + 1 < len) {`);
    if (useTrim) lines.push(`      __lastNonWs = off + 2;`);
    lines.push(`      off += 2;`);
    lines.push(`      continue;`);
    lines.push(`    }`);
  }
  if (useTrim) {
    lines.push(`    if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;`);
  }
  // unknownChars:'reject' guard: depth-0 only (inside brackets/strings/
  // comments/url() arbitrary content is accepted). If the current byte is
  // not a stop (already checked above), not an opener, and not in the known-
  // leading-bytes set, fail the production — mirrors the v1 behavior that
  // treats undeclared bytes as hard syntax errors in non-tolerant schemas.
  if (ctx.emitUnknownCharsGuard) {
    if (balanced) {
      lines.push(`    if (__depth === 0 && __KB[__c] === 0) {`);
      lines.push(`      // unknown char (depth 0, no stop, no opener) — fail production`);
      lines.push(`      if (off > state.maxOff) state.maxOff = off;`);
      lines.push(`      state.pos = ${ctx.entryOffVar};`);
      lines.push(`      return null;`);
      lines.push(`    }`);
    } else {
      lines.push(`    if (__KB[__c] === 0) {`);
      lines.push(`      // unknown char (no stop, no opener) — fail production`);
      lines.push(`      if (off > state.maxOff) state.maxOff = off;`);
      lines.push(`      state.pos = ${ctx.entryOffVar};`);
      lines.push(`      return null;`);
      lines.push(`    }`);
    }
  }
  lines.push(`    off++;`);
  lines.push(`  }`);
  }

  // --- requireStop check ----------------------------------------------------
  // Post-loop, pre-trim: if requireStop is set, fail the production when the
  // scan exited via EOF rather than a stop match. The kernel above breaks out
  // on a stop match (off < len) OR on the while-guard (off === len). So
  // `off >= len` unambiguously means no stop was found.
  // For balanced scans also fail if __depth !== 0 (unmatched bracket).
  if (until.requireStop) {
    if (balanced) {
      lines.push(`  if (off >= len || __depth !== 0) {`);
    } else {
      lines.push(`  if (off >= len) {`);
    }
    lines.push(`    if (off > state.maxOff) state.maxOff = off;`);
    lines.push(`    state.pos = ${ctx.entryOffVar};`);
    lines.push(`    return null;`);
    lines.push(`  }`);
  }

  // --- finalize capture -----------------------------------------------------
  const trimEnd = useTrim ? '__lastNonWs' : 'off';
  // Empty-anchor: when the captured slice is empty we rewind `off` to the
  // pre-ws position (or, if comments were skipped, the end of the last
  // leading comment). Mirrors v1's __emptyAnchor logic.
  if (hasComments) {
    lines.push(`  const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : ${startVar};`);
  } else {
    lines.push(`  const __emptyAnchor = ${startVar};`);
  }
  // Build the captured value. When no comments were skipped (or no comments
  // are declared in tokens) it's a single slice. With comments we build the
  // slice as a concatenation, omitting ws-adjacent comments — matches the
  // v1 captureUntil omit-list logic.
  if (hasComments) {
    lines.push(`  if (${trimEnd} === ${startVar}) {`);
    lines.push(`    off = __emptyAnchor;`);
    lines.push(`    ${v} = '';`);
    lines.push(`  } else {`);
    lines.push(`    off = ${trimEnd};`);
    lines.push(`    if (__comments.length === 0) {`);
    lines.push(`      ${v} = input.slice(${startVar}, ${trimEnd});`);
    lines.push(`    } else {`);
    lines.push(`      let __buf = '';`);
    lines.push(`      let __cursor = ${startVar};`);
    lines.push(`      for (let __i = 0; __i < __comments.length; __i++) {`);
    lines.push(`        const __cs = __comments[__i][0];`);
    lines.push(`        const __ce = __comments[__i][1];`);
    lines.push(`        if (__ce > ${trimEnd}) break;`);
    lines.push(`        const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;`);
    lines.push(`        const __after = __ce < len ? input.charCodeAt(__ce) : -1;`);
    lines.push(`        const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;`);
    lines.push(`        const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;`);
    lines.push(`        if (!(__isWsBefore || __isWsAfter)) continue;`);
    lines.push(`        __buf += input.slice(__cursor, __cs);`);
    lines.push(`        __cursor = __ce;`);
    lines.push(`      }`);
    lines.push(`      __buf += input.slice(__cursor, ${trimEnd});`);
    lines.push(`      ${v} = __buf;`);
    lines.push(`    }`);
    lines.push(`  }`);
  } else {
    lines.push(`  if (${trimEnd} === ${startVar}) {`);
    lines.push(`    off = __emptyAnchor;`);
    lines.push(`    ${v} = '';`);
    lines.push(`  } else {`);
    lines.push(`    off = ${trimEnd};`);
    lines.push(`    ${v} = input.slice(${startVar}, ${trimEnd});`);
    lines.push(`  }`);
  }
  lines.push(`  ${endVar} = off;`);
  // rejectSuffix: production fails (null-return) when the captured value
  // ends with ANY of the rejected suffixes. v2 design contract — never
  // throw for speculative failure.
  if (until.rejectSuffix && until.rejectSuffix.length > 0) {
    const conds = until.rejectSuffix
      .map((s) => `${v}.endsWith(${jsString(s)})`)
      .join(' || ');
    lines.push(`  if (${conds}) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }`);
  }
  // nonEmpty: production fails when the captured value is zero-length.
  if (until.nonEmpty) {
    lines.push(`  if (${v}.length === 0) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }`);
  }
  lines.push(`}`);

  // Bind captures so the captures expression can reference this span.
  if (span.name) {
    bindings.valueExpr.set(span.name, v);
    bindings.presenceExpr.set(span.name, `(${v}.length > 0)`);
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
  }
  return lines.join('\n');
}

function emitRawUntilSpan(
  span: ResolvedSpan,
  rawUntil: Extract<SpanModifier, { kind: 'rawUntil' }>,
  ctx: SpanContext,
  bindings: SpanBindings,
): string {
  // Plain literal-stop scan. No bracket / string / comment awareness. The
  // capture does NOT advance past the stop — the next span consumes it.
  //
  // unknownChars policy not enforced here: rawUntil's semantic intent is
  // "capture arbitrary bytes until a stop literal" (script/style bodies,
  // tag-soup content). Today none of the in-scope schemas combine
  // rawUntil with unknownChars:'reject' — html and markdown both declare
  // 'tolerate'. If a future schema needs this combination, add a
  // post-scan byte-walk that checks each captured byte against
  // ctx.knownBytes and rewinds on miss.
  const stops = rawUntil.stops;
  const ci = rawUntil.caseInsensitive;
  const v = span.name ? jsIdent(span.name) : '__rawCaptured';
  const startVar = `__${v}_start`;
  const endVar = `__${v}_end`;

  // Outer-scope declarations so the captures expression at function exit can
  // reference the captured value. Scratch locals live in the inner `{}`.
  const lines: string[] = [];
  lines.push(`let ${v}: string = '';`);
  lines.push(`let ${startVar} = off;`);
  lines.push(`let ${endVar} = off;`);
  lines.push(`{`);
  lines.push(`  ${startVar} = off;`);
  lines.push(`  let __earliest = len;`);

  if (stops.length === 0) {
    // No stops: capture everything to EOF.
    lines.push(`  off = len;`);
  } else {
    const singleCharStops = stops.filter((s) => s.length === 1);
    const multiCharStops = stops.filter((s) => s.length >= 2);
    const singleCharCodes = singleCharStops.map((s) => s.charCodeAt(0));
    const ciLetterCodes = ci
      ? singleCharCodes.filter((c) => (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a))
      : [];
    const literalSingles = ci
      ? singleCharCodes.filter((c) => !((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a)))
      : singleCharCodes;
    const ciFoldedSet = [...new Set(ciLetterCodes.map((c) => c | 0x20))];

    // Build the per-byte single-stop check.
    const singleParts: string[] = [];
    if (literalSingles.length > 0) {
      singleParts.push(literalSingles.map((c) => `__c === ${c}`).join(' || '));
    }
    if (ciFoldedSet.length > 0) {
      const fold = `((__c >= 0x41 && __c <= 0x5a) ? (__c | 0x20) : __c)`;
      singleParts.push(`(${ciFoldedSet.map((c) => `${fold} === ${c}`).join(' || ')})`);
    }
    const singleCheck = singleParts.length > 0 ? singleParts.join(' || ') : null;

    // Multi-char stops checked at each position. Grouped by first byte.
    // Case-insensitive multi-char stops fall back to a trailing search pass
    // since none of the current schemas combine ci with multi-char.
    type MultiStop = { readonly first: number; readonly text: string };
    const multiStops: MultiStop[] = multiCharStops.map((s) => ({ first: s.charCodeAt(0), text: s }));

    let multiCheck: string | null = null;
    let trailingMulti = '';
    if (multiStops.length > 0 && !ci) {
      const byFirst = new Map<number, string[]>();
      for (const { first, text } of multiStops) {
        const bucket = byFirst.get(first) ?? [];
        bucket.push(text);
        byFirst.set(first, bucket);
      }
      const branches: string[] = [];
      for (const [first, texts] of byFirst) {
        texts.sort((a, b) => b.length - a.length);
        const tests = texts.map((text) => {
          const tlen = text.length;
          if (tlen === 1) return 'true';
          const seq: string[] = [];
          for (let j = 1; j < tlen; j++) {
            seq.push(`input.charCodeAt(__i + ${j}) === ${text.charCodeAt(j)}`);
          }
          return `(__i + ${tlen - 1} < len && ${seq.join(' && ')})`;
        });
        branches.push(`if (__c === ${first} && (${tests.join(' || ')})) { __earliest = __i; break; }`);
      }
      multiCheck = branches.join('\n    ');
    } else if (multiStops.length > 0 && ci) {
      const parts: string[] = [];
      for (const { text } of multiStops) {
        parts.push(`  {`);
        parts.push(`    const __needle = ${jsString(text)};`);
        parts.push(`    const __nlen = ${text.length};`);
        parts.push(`    outer: for (let __i = ${startVar}; __i + __nlen <= __earliest; __i++) {`);
        parts.push(`      for (let __j = 0; __j < __nlen; __j++) {`);
        parts.push(`        const __ic = input.charCodeAt(__i + __j);`);
        parts.push(`        const __nc = __needle.charCodeAt(__j);`);
        parts.push(`        const __ifold = (__ic >= 0x41 && __ic <= 0x5a) || (__ic >= 0x61 && __ic <= 0x7a) ? __ic | 0x20 : __ic;`);
        parts.push(`        const __nfold = (__nc >= 0x41 && __nc <= 0x5a) || (__nc >= 0x61 && __nc <= 0x7a) ? __nc | 0x20 : __nc;`);
        parts.push(`        if (__ifold !== __nfold) continue outer;`);
        parts.push(`      }`);
        parts.push(`      __earliest = __i; break;`);
        parts.push(`    }`);
        parts.push(`  }`);
      }
      trailingMulti = '\n' + parts.join('\n');
    }

    const loopBody: string[] = [];
    if (singleCheck) loopBody.push(`if (${singleCheck}) { __earliest = __i; break; }`);
    if (multiCheck) loopBody.push(multiCheck);

    lines.push(`  for (let __i = ${startVar}; __i < len; __i++) {`);
    lines.push(`    const __c = input.charCodeAt(__i);`);
    if (loopBody.length > 0) lines.push(`    ${loopBody.join('\n    ')}`);
    lines.push(`  }${trailingMulti}`);
    lines.push(`  off = __earliest;`);
  }

  // requireStop check: fail production if no stop was found (off reached len).
  if (rawUntil.requireStop) {
    lines.push(`  if (off >= len) {`);
    lines.push(`    if (off > state.maxOff) state.maxOff = off;`);
    lines.push(`    state.pos = ${ctx.entryOffVar};`);
    lines.push(`    return null;`);
    lines.push(`  }`);
  }

  lines.push(`  ${endVar} = off;`);
  lines.push(`  ${v} = input.slice(${startVar}, ${endVar});`);
  // nonEmpty check: fail production when captured value is empty.
  if (rawUntil.nonEmpty) {
    lines.push(`  if (${v}.length === 0) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }`);
  }
  lines.push(`}`);

  if (span.name) {
    bindings.valueExpr.set(span.name, v);
    bindings.presenceExpr.set(span.name, `(${v}.length > 0)`);
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
  }
  return lines.join('\n');
}

// emitStopExpr — given the until-stops list and the offset-local name,
// produce a JS boolean expression that evaluates to true when the byte at
// `offVar` (already read into `__c` by the caller) is the start of any stop.
// Bucketed by first byte; multi-byte stops verify with startsWith. When 4+
// multi-char stops share a first byte, further bucket by second byte (the
// `__c2` local is set lazily on the matching first-byte).
function emitStopExpr(stops: readonly string[], offVar: string): string {
  const byFirstByte = new Map<number, string[]>();
  for (const stop of stops) {
    if (stop.length === 0) continue;
    const first = stop.charCodeAt(0);
    const group = byFirstByte.get(first);
    if (group) group.push(stop);
    else byFirstByte.set(first, [stop]);
  }
  const checks: string[] = [];
  for (const [first, group] of byFirstByte) {
    const hasSingle = group.some((stop) => stop.length === 1);
    const multis = group.filter((stop) => stop.length > 1).sort((a, b) => b.length - a.length);
    const multiChecks = multis.map((stop) => `input.startsWith(${jsString(stop)}, ${offVar})`);
    if (hasSingle) {
      // Single-char stop dominates: any longer prefix sharing the byte still
      // matches the single-char rule because the longer one starts with the
      // same byte. The single-char check is sufficient.
      checks.push(`__c === ${first}`);
      continue;
    }
    if (multiChecks.length === 1) {
      checks.push(`(__c === ${first} && ${multiChecks[0]})`);
      continue;
    }
    if (multiChecks.length === 0) continue;
    if (multis.length >= 4) {
      const bySecond = new Map<number, string[]>();
      for (const stop of multis) {
        const sb = stop.charCodeAt(1);
        const g2 = bySecond.get(sb);
        if (g2) g2.push(stop);
        else bySecond.set(sb, [stop]);
      }
      const subChecks: string[] = [];
      for (const [second, sub] of bySecond) {
        sub.sort((a, b) => b.length - a.length);
        if (sub.length === 1 && sub[0]!.length === 2) {
          subChecks.push(`__c2 === ${second}`);
        } else {
          const sw = sub.map((s) => `input.startsWith(${jsString(s)}, ${offVar})`).join(' || ');
          subChecks.push(`(__c2 === ${second} && (${sw}))`);
        }
      }
      checks.push(`(__c === ${first} && ((__c2 = ${offVar} + 1 < len ? input.charCodeAt(${offVar} + 1) : -1), (${subChecks.join(' || ')})))`);
      continue;
    }
    checks.push(`(__c === ${first} && (${multiChecks.join(' || ')}))`);
  }
  return checks.join(' || ') || 'false';
}

function stopExprNeedsSecondByte(stops: readonly string[]): boolean {
  const byFirstByte = new Map<number, string[]>();
  for (const stop of stops) {
    if (stop.length === 0) continue;
    const first = stop.charCodeAt(0);
    const group = byFirstByte.get(first);
    if (group) group.push(stop);
    else byFirstByte.set(first, [stop]);
  }
  for (const group of byFirstByte.values()) {
    if (group.some((s) => s.length === 1)) continue;
    if (group.filter((s) => s.length > 1).length >= 4) return true;
  }
  return false;
}

// Re-export literalMatchExpr for production.ts use (skipWs etc.)
export { literalMatchExpr };

// Re-export the role-ladder primitive so existing imports from `./span.ts`
// continue to resolve. The implementation lives in `./role-ladder.ts`.
export { emitRoleLadder, type RoleLadderOptions } from './role-ladder.ts';
