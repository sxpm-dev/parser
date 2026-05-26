// Emit byte-level primitive code for one span in a production body.
// All emitted code operates on the function-locals `input`, `len`, `off`,
// and the `state` reference (only touched when calling another parse fn).
// Failure: rewinds `off` to a saved entry, returns null from the enclosing
// production function. Caller wraps each emit in the right rewind context.

import type { Refinement, SpanModifier } from '@parser2/parser';
import { CompilerError, type NodeTypeInfo, type ResolvedSpan } from '../../model.ts';
import { indent, jsIdent, jsString } from '../strings.ts';

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
};

export type SpanBindings = {
  // Span name → JS expression that evaluates to the captured value.
  readonly valueExpr: Map<string, string>;
  // Span name → JS expression for presence (used by optional spans).
  readonly presenceExpr: Map<string, string>;
  // Span name → JS expressions for start/end offsets (used by $.gap).
  readonly startOffExpr: Map<string, string>;
  readonly endOffExpr: Map<string, string>;
};

export function findModifier<K extends SpanModifier['kind']>(
  span: ResolvedSpan,
  kind: K,
): Extract<SpanModifier, { kind: K }> | undefined {
  for (const m of span.modifiers) if (m.kind === kind) return m as Extract<SpanModifier, { kind: K }>;
  return undefined;
}

export function hasModifier(span: ResolvedSpan, kind: SpanModifier['kind']): boolean {
  return findModifier(span, kind) !== undefined;
}

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
  if (!span.text) throw new Error(`emit v2: literal span has no text`);
  const text = span.text;
  const matchExpr = literalMatchExpr(text, 'off');
  const len = text.length;

  if (isOptional) {
    // Optional literal: try to match, advance if matched. Never fails.
    if (span.name) {
      const v = jsIdent(span.name);
      bindings.valueExpr.set(span.name, v);
      bindings.presenceExpr.set(span.name, `(${v} !== null)`);
      const startVar = `__${v}_start`, endVar = `__${v}_end`;
      bindings.startOffExpr.set(span.name, startVar);
      bindings.endOffExpr.set(span.name, endVar);
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
  if (span.name) {
    const v = jsIdent(span.name);
    bindings.valueExpr.set(span.name, v);
    const startVar = `__${v}_start`, endVar = `__${v}_end`;
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
    return `if (!(${matchExpr})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
const ${startVar} = off;
off += ${len};
const ${endVar} = off;
const ${v} = ${jsString(text)};`;
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
  const { startPredicate, scanBody } = classScanCode(span);
  const startVar = `__${v}_start`, endVar = `__${v}_end`;

  if (isOptional) {
    if (span.name) {
      bindings.valueExpr.set(span.name, v);
      bindings.presenceExpr.set(span.name, `(${v} !== null)`);
      bindings.startOffExpr.set(span.name, startVar);
      bindings.endOffExpr.set(span.name, endVar);
    }
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

  if (span.name) {
    bindings.valueExpr.set(span.name, v);
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
    return `if (!(${startPredicate})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
const ${startVar} = off;
${scanBody}
const ${endVar} = off;
const ${v} = input.slice(${startVar}, ${endVar});${emitRefinementChecks(span, v, ctx.entryOffVar)}`;
  }
  return `if (!(${startPredicate})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }
${scanBody}`;
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
const ${v} = parse${role}(state);
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
const ${v} = parse${role}(state);
if (${v} === null) { state.pos = ${ctx.entryOffVar}; return null; }
off = state.pos;
const ${endVar} = off;`;
    }
    return `state.pos = off;
const __r = parse${role}(state);
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
  if (span.recursiveRoles.length !== 1) {
    throw new Error(`v2: multi-role repeats not yet supported (span '${span.name ?? '?'}')`);
  }
  const role = span.recursiveRoles[0]!;
  const repeats = findModifier(span, 'repeats')!;
  const min = repeats.min ?? 0;
  const listVar = span.name ? jsIdent(span.name) : '__repeated';
  const startVar = `__${listVar}_start`, endVar = `__${listVar}_end`;

  if (span.name) {
    bindings.valueExpr.set(span.name, listVar);
    bindings.startOffExpr.set(span.name, startVar);
    bindings.endOffExpr.set(span.name, endVar);
  }

  // Repeats with separator
  const sep = repeats.sep;
  const sepBlock = sep
    ? `// Consume the separator if present, then ws.
  if (!(${literalMatchExpr(sep, 'off')})) break;
  off += ${sep.length};
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }`
    : `// Required ws between children when no explicit separator.
  const __wsStart = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (off === __wsStart) break;`;

  const minCheck = min > 0
    ? `if (${listVar}.length < ${min}) { state.pos = ${ctx.entryOffVar}; return null; }`
    : '';

  return `const ${startVar} = off;
const ${listVar}: unknown[] = [];
{
  state.pos = off;
  const __first = parse${role}(state);
  if (__first !== null) {
    ${listVar}.push(__first);
    off = state.pos;
    while (true) {
      const __sepStart = off;
      ${sepBlock}
      state.pos = off;
      const __next = parse${role}(state);
      if (__next === null) { off = __sepStart; break; }
      ${listVar}.push(__next);
      off = state.pos;
    }
  }
}
const ${endVar} = off;
${minCheck}`;
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

function classScanCode(span: ResolvedSpan): { startPredicate: string; scanBody: string } {
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
    // Default: integer; .float() / .scientific() refinements are accepted by
    // schema but cron uses .int() so we emit integer-only for now.
    return {
      startPredicate: `off < len && isDigit(input.charCodeAt(off))`,
      scanBody: `off++;\nwhile (off < len && isDigit(input.charCodeAt(off))) off++;`,
    };
  }
  if (cls === 'hex') {
    return {
      startPredicate: `off < len && isHexDigit(input.charCodeAt(off))`,
      scanBody: `off++;\nwhile (off < len && isHexDigit(input.charCodeAt(off))) off++;`,
    };
  }
  if (cls === 'string') {
    return {
      startPredicate: `off < len && (input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27)`,
      scanBody: `{
  const __q = input.charCodeAt(off);
  off++;
  while (off < len) {
    const __c = input.charCodeAt(off);
    if (__c === 0x5c && off + 1 < len) { off += 2; continue; }
    if (__c === __q) { off++; break; }
    if (__c === 0x0a || __c === 0x0d) break;
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
  throw new Error(`v2: class '${cls}' not yet supported`);
}

function emitRefinementChecks(span: ResolvedSpan, captureVar: string, entryOffVar: string): string {
  // .int() / .float() / .scientific() on number are accepted; current cron uses
  // .int() which already matches an integer scan, so no extra check.
  // .oneOf([...]) — emit a value test.
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
  const useTrim = until.trim;

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
  if (balanced) lines.push(`  let __depth = 0;`);
  if (stopNeedsC2) lines.push(`  let __c2 = -1;`);
  if (hasComments) lines.push(`  const __comments: [number, number][] = [];`);

  // --- main loop ------------------------------------------------------------
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
  lines.push(`    off++;`);
  lines.push(`  }`);

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
  // ends with the rejected suffix. v2 design contract — never throw for
  // speculative failure.
  if (until.rejectSuffix) {
    lines.push(`  if (${v}.endsWith(${jsString(until.rejectSuffix)})) { if (off > state.maxOff) state.maxOff = off; state.pos = ${ctx.entryOffVar}; return null; }`);
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

  lines.push(`  ${endVar} = off;`);
  lines.push(`  ${v} = input.slice(${startVar}, ${endVar});`);
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

// --- multi-role dispatch ladder -------------------------------------------
//
// Shared primitive used by:
//   - emitRecursiveSpan (Task 1.3b) — one-shot ladder for non-repeats spans
//   - emitRepeatsSpan   (Task 1.3c — to come) — same ladder inside while(true)
//
// Contract: emits a code block that
//   - assumes the locals `input`, `len`, `off`, `state` are in scope
//   - skips inter-role whitespace before peeking the first byte
//   - peeks `input.charCodeAt(off)` and dispatches to the matching role's
//     parse function (`parse<Role>(state)`) by first-byte
//   - on a successful role parse, sets `<resultVar> = <value>` and `off =
//     state.pos`
//   - on no first-byte match OR a matched role's parse returning null, leaves
//     `<resultVar>` as null and does NOT advance `off` past the original
//     position (the matched role's own failure path already rewound state.pos)
//
// No throws, ever — per v2 design (docs/scannerless-emit-v2.md). The caller
// decides how to treat `<resultVar> === null` (rewind+return null for
// non-optional, no-op for optional, break loop for repeats).
//
// Failure mode for ambiguous role sets: when two roles share their first-byte
// signature, this helper raises CompilerError at codegen time. Proper
// disambiguation needs the peek-scan dispatcher in Task 1.3d; we explicitly
// reject the ambiguity here so the bug surfaces at codegen rather than as a
// silent first-wins runtime behavior.
export type RoleLadderOptions = {
  // Name of the JS local that receives the parsed value (or stays null when
  // no role matched). Callers declare this `let` themselves before the ladder
  // so they can scope it to their own block.
  readonly resultVar: string;
};

export function emitRoleLadder(
  roles: ReadonlyArray<string>,
  ctx: SpanContext,
  options: RoleLadderOptions,
): string {
  if (roles.length === 0) {
    throw new Error('emitRoleLadder: called with no roles');
  }

  // Build per-role first-byte signature. Each role's signature is the union
  // of first-byte sets across all its productions' first spans. A role with
  // an indeterminate first byte (until/repeats first span, optional first
  // span, or recursive first span pointing at another multi-role decision)
  // cannot be byte-dispatched — reject as a 1.3d concern.
  const signatures = roles.map((role) => {
    const info = ctx.nodeTypes.get(role);
    if (!info) {
      throw new CompilerError(
        `v2: multi-role span references unknown role '${role}'`,
      );
    }
    return computeRoleFirstBytes(role, info, ctx.nodeTypes);
  });

  // First-byte conflict detection: if any byte appears in two roles'
  // signature, byte-prefix dispatch can't tell them apart. 1.3d will add
  // peek-scan / speculation handling; until then, raise at codegen.
  const seen = new Map<number, string>();
  for (let i = 0; i < roles.length; i++) {
    const sig = signatures[i]!;
    for (const byte of sig.bytes) {
      const prior = seen.get(byte);
      if (prior !== undefined && prior !== roles[i]) {
        throw new CompilerError(
          `v2: multi-role span has roles sharing first byte 0x${byte.toString(16)} ` +
            `('${prior}' and '${roles[i]}'); peek-scan dispatch not yet supported (Task 1.3d)`,
        );
      }
      seen.set(byte, roles[i]!);
    }
  }

  const resultVar = options.resultVar;
  const lines: string[] = [];

  // Inter-role ws skip — same shape as the production-body skipWs block. The
  // ladder owns this so callers don't have to redundantly emit it before
  // each dispatch decision (relevant for the 1.3c repeats loop).
  lines.push(`while (off < len) {`);
  lines.push(`  const __wc = input.charCodeAt(off);`);
  lines.push(`  if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }`);
  lines.push(`  break;`);
  lines.push(`}`);
  lines.push(`state.pos = off;`);
  lines.push(`if (off < len) {`);
  lines.push(`  const __c0 = input.charCodeAt(off);`);

  // Emit one if-branch per role, ordered by descending signature byte-set
  // size — keeps the most-discriminating branch closest to the top.
  const ordered = roles
    .map((role, i) => ({ role, sig: signatures[i]! }))
    .sort((a, b) => b.sig.bytes.size - a.sig.bytes.size);

  for (const { role, sig } of ordered) {
    if (sig.bytes.size === 0) continue;
    const cond = [...sig.bytes].sort((a, b) => a - b).map((b) => `__c0 === ${b}`).join(' || ');
    lines.push(`  if (${cond}) {`);
    lines.push(`    ${resultVar} = parse${role}(state);`);
    // On null-return, leave resultVar = null and state.pos rewound — caller
    // decides what to do (non-optional rewinds parent's entry; optional
    // treats as "absent"; repeats breaks the loop).
    lines.push(`  }`);
  }

  lines.push(`}`);
  return lines.join('\n');
}

// Compute the set of valid first bytes for any production of a role. Returns
// `bytes` empty when the role's first-byte set can't be determined statically
// (e.g. first span is until / repeats / optional / recursive). Multi-byte
// signatures (peek-ahead) are out of scope here — they belong to Task 1.3d.
type RoleFirstBytes = {
  readonly bytes: ReadonlySet<number>;
};

function computeRoleFirstBytes(
  role: string,
  info: NodeTypeInfo,
  nodeTypes: ReadonlyMap<string, NodeTypeInfo>,
  visiting: Set<string> = new Set(),
): RoleFirstBytes {
  if (visiting.has(role)) {
    // Left-recursive role chain — not statically dispatchable. Returning an
    // empty set causes the caller's downstream conflict / dispatch-failure
    // check to fire.
    return { bytes: new Set() };
  }
  visiting.add(role);

  const bytes = new Set<number>();
  for (const prod of info.productions) {
    const span0 = prod.spans[0];
    if (!span0) {
      visiting.delete(role);
      throw new CompilerError(
        `v2: multi-role span dispatch: role '${role}' has a production with no spans`,
      );
    }
    // Disqualifying first-span modifiers (the production's first token is not
    // a single peek-able byte).
    if (
      findModifier(span0, 'until') ||
      findModifier(span0, 'rawUntil') ||
      findModifier(span0, 'repeats') ||
      hasModifier(span0, 'optional')
    ) {
      visiting.delete(role);
      throw new CompilerError(
        `v2: multi-role span dispatch: role '${role}' has a production whose first span ` +
          `is until/rawUntil/repeats/optional — byte-prefix dispatch not yet supported (Task 1.3d)`,
      );
    }
    // Recursive first span — descend into the referenced role(s). The
    // dispatch byte for the outer role is whatever the inner role accepts.
    if (span0.recursiveRoles.length > 0) {
      for (const innerRole of span0.recursiveRoles) {
        const innerInfo = nodeTypes.get(innerRole);
        if (!innerInfo) {
          visiting.delete(role);
          throw new CompilerError(
            `v2: multi-role span dispatch: role '${role}' references unknown inner role '${innerRole}'`,
          );
        }
        const inner = computeRoleFirstBytes(innerRole, innerInfo, nodeTypes, visiting);
        for (const b of inner.bytes) bytes.add(b);
      }
      continue;
    }
    // Literal first span: first byte is the literal's first character.
    if (span0.class === 'literal') {
      if (!span0.text || span0.text.length === 0) {
        visiting.delete(role);
        throw new CompilerError(
          `v2: multi-role span dispatch: role '${role}' has a literal first span with empty text`,
        );
      }
      bytes.add(span0.text.charCodeAt(0));
      continue;
    }
    // Comment class: first two bytes are `/` `*`. Dispatch on `/`.
    if (span0.class === 'comment') {
      bytes.add(0x2f);
      continue;
    }
    // Class span: derive first-byte set from the class kind. We over-approximate
    // for ident classes (a-z, A-Z, _, plus -/\ depending on refinement). The
    // role-dispatch ladder accepts the union; conflict detection on the caller
    // side flags overlap between roles.
    classFirstBytes(span0).forEach((b) => bytes.add(b));
  }
  visiting.delete(role);
  return { bytes };
}

function classFirstBytes(span: ResolvedSpan): ReadonlySet<number> {
  const refSet = new Set(span.refinements.map((r) => r.name));
  const out = new Set<number>();
  const cls = span.class;
  const addRange = (from: number, to: number) => {
    for (let c = from; c <= to; c++) out.add(c);
  };
  if (cls === 'ident') {
    addRange(0x41, 0x5a); // A-Z
    addRange(0x61, 0x7a); // a-z
    out.add(0x5f); // _
    if (refSet.has('js')) {
      out.add(0x24); // $
    } else {
      // css/html/default
      out.add(0x2d); // -
      if (!refSet.has('css') && !refSet.has('html')) out.add(0x5c); // \\ escape
    }
    return out;
  }
  if (cls === 'number') {
    addRange(0x30, 0x39); // 0-9
    return out;
  }
  if (cls === 'hex') {
    addRange(0x30, 0x39);
    addRange(0x41, 0x46);
    addRange(0x61, 0x66);
    return out;
  }
  if (cls === 'string') {
    out.add(0x22); // "
    out.add(0x27); // '
    return out;
  }
  // Other classes (regex/template/whitespace/keyword/operator) aren't used as
  // a role's first span in any current schema — surface as codegen error so
  // we notice if a new schema needs it.
  throw new CompilerError(
    `v2: multi-role span dispatch: class '${cls}' not yet supported as a role first-token`,
  );
}

// Re-export literalMatchExpr for production.ts use (skipWs etc.)
export { literalMatchExpr };
