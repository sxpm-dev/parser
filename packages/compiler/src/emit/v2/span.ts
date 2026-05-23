// Emit byte-level primitive code for one span in a production body.
// All emitted code operates on the function-locals `input`, `len`, `off`,
// and the `state` reference (only touched when calling another parse fn).
// Failure: rewinds `off` to a saved entry, returns null from the enclosing
// production function. Caller wraps each emit in the right rewind context.

import type { Refinement, SpanModifier } from '@parser2/parser';
import type { ResolvedSpan } from '../../model.ts';
import { jsIdent, jsString } from '../strings.ts';

export type SpanContext = {
  // The local variable name where the parent's entry-offset is saved
  // (rewound on failure).
  readonly entryOffVar: string;
  // Whether this span lives in raws mode emit (for source-offset capture).
  readonly raws: boolean;
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

  // Until/rawUntil — not yet supported in v2 first slice
  if (isUntil || findModifier(span, 'rawUntil')) {
    throw new Error(`v2: until/rawUntil span not yet supported (span '${span.name ?? '?'}')`);
  }

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
  if (span.recursiveRoles.length !== 1) {
    throw new Error(`v2: multi-role non-repeats span not yet supported (span '${span.name ?? '?'}')`);
  }
  const role = span.recursiveRoles[0]!;
  const v = span.name ? jsIdent(span.name) : '__unnamed';
  const startVar = `__${v}_start`, endVar = `__${v}_end`;

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

// Re-export literalMatchExpr for production.ts use (skipWs etc.)
export { literalMatchExpr };
