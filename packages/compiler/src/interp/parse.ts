// Reference interpreter — parse path. Walks an InferredSchema directly to
// produce the same captures shape (and ast render) that the v2-generated
// parser would. This is the slow-but-obviously-correct trust anchor that
// the differential fuzzer (Task 2.4) compares against the v2 codegen.
//
// Design goals (in priority order):
//   1. Correctness — every span class + modifier handled the same way the v2
//      emitter handles it. No optimization, no precomputation.
//   2. Readability — straight-line, no clever indirection.
//   3. Match the v2 dispatch ordering — when multiple productions for one
//      node type apply, try them in the same order the v2 dispatcher tries
//      them so the resulting captures key (__production: "Node#<idx>") is
//      identical.
//
// What is intentionally NOT included:
//   - source-position computation matching v2's exact start/end byte offsets
//     (the interpreter computes a coarse `source` field; tests strip it).
//   - raws mode (only 'fast' is implemented in this slice).
//   - recovery productions (skipped in dispatch; rare in current schemas).

import {
  isStructureRef,
  isTemplate,
  type RenderBody,
  type SpanModifier,
  type StructureRef,
  type Template,
} from '@parser2/parser';
import type { InferredSchema, NodeTypeInfo, Production, ResolvedSpan } from '../model.ts';

// --- State -----------------------------------------------------------------

type State = {
  readonly input: string;
  readonly len: number;
  pos: number;
  maxOff: number;
};

// --- Captures --------------------------------------------------------------

// Shape returned by parseProduction. Mirrors the v2 captures object — keyed
// by span name, with synthetic keys for $.gap / $.raw / $.tail / etc. The
// __production key carries "Node#<prodIdx>" so the render dispatcher can
// route without value-shape inspection (same protocol as v2).
type Captures = Record<string, unknown> & { __production: string };

type SpanRange = { readonly start: number; readonly end: number };

// --- Entry points ----------------------------------------------------------

export function interpretParse(schema: InferredSchema, input: string): unknown {
  const state: State = { input, len: input.length, pos: 0, maxOff: 0 };
  const captures = parseNode(schema, schema.rootType, state);
  // Trailing-input check mirrors the v2 public API: a partial match is a
  // parse error.
  skipWs(state);
  if (captures === null || state.pos !== input.length) {
    throw new SyntaxError(
      `interp: parse failed at position ${state.maxOff > state.pos ? state.maxOff : state.pos}`,
    );
  }
  // Render the AST target by walking the production's `ast` render body
  // against the captures. The result mirrors what render(input, {type:'ast'})
  // produces in v2-generated parsers.
  return renderCapturesAsAst(schema, captures);
}

// Exposed for the future differential fuzzer (Task 2.4) — gives raw captures
// without forcing the ast render walk.
export function interpretParseCaptures(schema: InferredSchema, input: string): Captures {
  const state: State = { input, len: input.length, pos: 0, maxOff: 0 };
  const captures = parseNode(schema, schema.rootType, state);
  skipWs(state);
  if (captures === null || state.pos !== input.length) {
    throw new SyntaxError(
      `interp: parse failed at position ${state.maxOff > state.pos ? state.maxOff : state.pos}`,
    );
  }
  return captures;
}

// --- Node-level dispatch ---------------------------------------------------

function parseNode(schema: InferredSchema, nodeType: string, state: State): Captures | null {
  const info = schema.nodeTypes.get(nodeType);
  if (!info) {
    throw new Error(`interp: unknown node type '${nodeType}'`);
  }
  skipWs(state);
  // Order productions the same way the v2 dispatcher does — see emit/v2/
  // dispatch.ts for the byte-prefix / speculation strategy. We don't need
  // the byte-prefix fast path for correctness; we DO need the same trial
  // order so that productions sharing a first byte resolve identically.
  const ordered = orderProductionsForDispatch(info);
  const entry = state.pos;
  for (const idx of ordered) {
    const production = info.productions[idx]!;
    const result = parseProduction(schema, production, idx, state);
    if (result !== null) return result;
    // Each production rewinds state.pos on failure, but defend in depth.
    state.pos = entry;
  }
  return null;
}

// Returns the indices of `info.productions` in the order the v2 dispatcher
// tries them. For multi-production node types we mirror the two-tier
// strategy used in emit/v2/dispatch.ts: longest-literal-prefix first within
// each first-byte bucket, with byte-prefix groups tried before fallthrough
// (no-first-byte) productions.
function orderProductionsForDispatch(info: NodeTypeInfo): number[] {
  const prods = info.productions;
  if (prods.length <= 1) return prods.map((_, i) => i);

  type Meta = {
    readonly idx: number;
    readonly firstByte: number | null;
    readonly literalLen: number;
    readonly restricted: boolean;
    readonly hasSpans: boolean;
  };

  const meta: Meta[] = prods.map((p, idx) => {
    const s0 = p.spans[0];
    if (!s0) return { idx, firstByte: null, literalLen: 0, restricted: false, hasSpans: false };
    // Spans whose first byte isn't fixed go to the fallthrough bucket.
    if (
      findModifier(s0, 'until') ||
      findModifier(s0, 'rawUntil') ||
      findModifier(s0, 'repeats') ||
      hasModifier(s0, 'optional') ||
      s0.recursiveRoles.length > 0
    ) {
      return { idx, firstByte: null, literalLen: 0, restricted: hasOneOf(p), hasSpans: true };
    }
    if (s0.class === 'literal' && typeof s0.text === 'string' && s0.text.length > 0) {
      return {
        idx,
        firstByte: s0.text.charCodeAt(0),
        literalLen: s0.text.length,
        restricted: hasOneOf(p),
        hasSpans: true,
      };
    }
    // Class spans: byte set is broad. We treat them as "byte-discriminated"
    // for ordering purposes but with literalLen 0 so literal prefixes win.
    return { idx, firstByte: -1, literalLen: 0, restricted: hasOneOf(p), hasSpans: true };
  });

  // Bucket by first byte. Within each bucket, sort by:
  //   1. tag-restricted (.oneOf) wins
  //   2. longest literal prefix wins
  //   3. span count descending
  //   4. declaration order
  const buckets = new Map<number | null | -1, Meta[]>();
  for (const m of meta) {
    const key = m.firstByte;
    const arr = buckets.get(key) ?? [];
    arr.push(m);
    buckets.set(key, arr);
  }
  for (const arr of buckets.values()) {
    arr.sort((a, b) => {
      if (a.restricted !== b.restricted) return a.restricted ? -1 : 1;
      if (a.literalLen !== b.literalLen) return b.literalLen - a.literalLen;
      const sa = prods[a.idx]!.spans.length;
      const sb = prods[b.idx]!.spans.length;
      if (sa !== sb) return sb - sa;
      return a.idx - b.idx;
    });
  }

  // Walk meta in declared order, substituting each first-byte group with
  // its reordered queue — preserves the v2 dispatcher's structure where
  // byte-discriminated productions are tried first, fallthrough last.
  const consumed = new Map<number | null | -1, number>();
  const order: number[] = [];
  for (const m of meta) {
    const queue = buckets.get(m.firstByte)!;
    const k = consumed.get(m.firstByte) ?? 0;
    order.push(queue[k]!.idx);
    consumed.set(m.firstByte, k + 1);
  }
  return order;
}

function hasOneOf(prod: Production): boolean {
  for (const span of prod.spans) {
    if (span.refinements.some((r) => r.name === 'oneOf')) return true;
  }
  return false;
}

// --- Production-level parse ------------------------------------------------

function parseProduction(
  schema: InferredSchema,
  production: Production,
  prodIdx: number,
  state: State,
): Captures | null {
  const entry = state.pos;
  const captures: Record<string, unknown> = {};
  const ranges = new Map<string, SpanRange>();
  // Track production end offset for $.tail refs.
  let endOff = entry;

  for (let i = 0; i < production.spans.length; i++) {
    const span = production.spans[i]!;
    if (i > 0) {
      skipWs(state);
    } else {
      skipWs(state);
    }
    const before = state.pos;
    const ok = parseSpan(schema, span, state, captures, ranges);
    if (!ok) {
      state.pos = entry;
      return null;
    }
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    endOff = state.pos;
    if (state.pos < before) {
      // Safety: parseSpan never rewinds below `before` on success.
      // If it ever did we'd corrupt the dispatcher; surface here.
      throw new Error(`interp: span '${span.name ?? '?'}' rewound past entry`);
    }
  }

  // Build the captures dict in the same shape v2 emits — span values keyed
  // by span name plus synthetic refs for any $.gap / $.raw / $.tail / etc.
  // referenced by the ast render body. We don't omit raws here; if a render
  // body wants a raws subobject the interpreter happily computes it.
  const out: Captures = {
    __production: `${production.nodeType}#${prodIdx}`,
    ...captures,
  };
  attachSyntheticRefs(production, out, ranges, state.input, endOff);
  return out;
}

// --- Span dispatch ---------------------------------------------------------

function parseSpan(
  schema: InferredSchema,
  span: ResolvedSpan,
  state: State,
  captures: Record<string, unknown>,
  ranges: Map<string, SpanRange>,
): boolean {
  const isOptional = hasModifier(span, 'optional');
  // Recursive role span
  if (span.recursiveRoles.length > 0) {
    const repeats = findModifier(span, 'repeats');
    if (repeats) {
      return parseRepeatsSpan(schema, span, repeats, state, captures, ranges);
    }
    return parseRecursiveSpan(schema, span, state, captures, ranges, isOptional);
  }

  // until / rawUntil
  const untilMod = findModifier(span, 'until');
  if (untilMod) {
    return parseUntilSpan(schema, span, untilMod, state, captures, ranges);
  }
  const rawUntilMod = findModifier(span, 'rawUntil');
  if (rawUntilMod) {
    return parseRawUntilSpan(span, rawUntilMod, state, captures, ranges);
  }

  // Literal
  if (span.class === 'literal') {
    return parseLiteralSpan(span, state, captures, ranges, isOptional);
  }
  // Class span (ident / number / hex / string / comment / ...)
  return parseClassSpan(span, state, captures, ranges, isOptional);
}

// ---- literal span ---------------------------------------------------------

function parseLiteralSpan(
  span: ResolvedSpan,
  state: State,
  captures: Record<string, unknown>,
  ranges: Map<string, SpanRange>,
  isOptional: boolean,
): boolean {
  if (!span.text) throw new Error(`interp: literal span has no text`);
  const text = span.text;
  if (state.input.startsWith(text, state.pos)) {
    const start = state.pos;
    state.pos += text.length;
    bindSpan(span, text, start, state.pos, captures, ranges);
    return true;
  }
  if (isOptional) {
    // Optional literal absent — record null + zero-width range so synthetic
    // refs that reference the span don't blow up.
    bindSpan(span, null, state.pos, state.pos, captures, ranges);
    return true;
  }
  if (state.pos > state.maxOff) state.maxOff = state.pos;
  return false;
}

// ---- class span ----------------------------------------------------------

function parseClassSpan(
  span: ResolvedSpan,
  state: State,
  captures: Record<string, unknown>,
  ranges: Map<string, SpanRange>,
  isOptional: boolean,
): boolean {
  const start = state.pos;
  const ok = scanClass(span, state);
  if (!ok) {
    if (isOptional) {
      bindSpan(span, null, start, start, captures, ranges);
      return true;
    }
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    return false;
  }
  // Value extraction. For comment spans the v2 emitter strips `/* ... */`
  // and trims interior whitespace when the span carries the (implicit)
  // .comment() refinement — we mirror that here.
  const rawSlice = state.input.slice(start, state.pos);
  let value: string;
  if (span.class === 'comment') {
    value = trimWs(stripCommentDelimiters(rawSlice));
  } else {
    value = rawSlice;
  }
  // Post-scan refinement checks (.oneOf).
  for (const ref of span.refinements) {
    if (ref.name === 'oneOf') {
      const values = ref.args?.[0];
      if (Array.isArray(values) && values.every((x) => typeof x === 'string')) {
        const lowered = (values as string[]).map((v) => v.toLowerCase());
        if (!lowered.includes(value.toLowerCase())) {
          state.pos = start;
          return false;
        }
      }
    }
  }
  bindSpan(span, value, start, state.pos, captures, ranges);
  return true;
}

// Advance `state.pos` over a class-shaped run starting at the current
// position. Returns false (without rewinding) when the start predicate
// fails. On success the position lands one byte past the last consumed
// character.
function scanClass(span: ResolvedSpan, state: State): boolean {
  const refSet = new Set(span.refinements.map((r) => r.name));
  const cls = span.class;
  const input = state.input;
  const len = state.len;

  if (cls === 'ident') {
    if (state.pos >= len) return false;
    const c = input.charCodeAt(state.pos);
    if (refSet.has('js')) {
      if (!isJsIdentStart(c)) return false;
      state.pos++;
      while (state.pos < len && isJsIdentPart(input.charCodeAt(state.pos))) state.pos++;
      return true;
    }
    // css/html/default
    if (!(isCssIdentStart(c) || (!refSet.has('css') && !refSet.has('html') && c === 0x5c))) {
      return false;
    }
    state.pos++;
    while (state.pos < len && isCssIdentPart(input.charCodeAt(state.pos))) state.pos++;
    return true;
  }

  if (cls === 'number') {
    return scanNumber(span, state);
  }

  if (cls === 'hex') {
    if (state.pos >= len || !isHexDigit(input.charCodeAt(state.pos))) return false;
    state.pos++;
    while (state.pos < len && isHexDigit(input.charCodeAt(state.pos))) state.pos++;
    return true;
  }

  if (cls === 'string') {
    if (state.pos >= len) return false;
    const q = input.charCodeAt(state.pos);
    if (q !== 0x22 && q !== 0x27) return false;
    state.pos++;
    while (state.pos < len) {
      const c = input.charCodeAt(state.pos);
      if (c === 0x5c && state.pos + 1 < len) {
        state.pos += 2;
        continue;
      }
      if (c === q) {
        state.pos++;
        break;
      }
      if (c === 0x0a || c === 0x0d) break;
      state.pos++;
    }
    return true;
  }

  if (cls === 'comment') {
    if (
      state.pos + 1 >= len ||
      input.charCodeAt(state.pos) !== 0x2f ||
      input.charCodeAt(state.pos + 1) !== 0x2a
    ) {
      return false;
    }
    state.pos += 2;
    while (
      state.pos < len &&
      !(input.charCodeAt(state.pos) === 0x2a &&
        state.pos + 1 < len &&
        input.charCodeAt(state.pos + 1) === 0x2f)
    ) {
      state.pos++;
    }
    if (state.pos < len) state.pos += 2;
    return true;
  }

  if (cls === 'whitespace') {
    if (state.pos >= len || !isWs(input.charCodeAt(state.pos))) return false;
    while (state.pos < len && isWs(input.charCodeAt(state.pos))) state.pos++;
    return true;
  }

  throw new Error(`interp: class '${cls}' not yet supported`);
}

function scanNumber(span: ResolvedSpan, state: State): boolean {
  const refSet = new Set(span.refinements.map((r) => r.name));
  const isFloat = refSet.has('float') || refSet.has('scientific');
  const isScientific = refSet.has('scientific');
  const isBigint = refSet.has('bigint');
  const isBinary = refSet.has('binary');
  const isOctal = refSet.has('octal');
  let sepCode: number | undefined;
  for (const ref of span.refinements) {
    if (ref.name === 'separator' && Array.isArray(ref.args) && typeof ref.args[0] === 'string') {
      sepCode = (ref.args[0] as string).charCodeAt(0);
      break;
    }
  }
  const input = state.input;
  const len = state.len;
  const isDigitOrSep = (c: number) => isDigit(c) || (sepCode !== undefined && c === sepCode);

  if (isBinary) {
    if (
      state.pos + 1 >= len ||
      input.charCodeAt(state.pos) !== 0x30 ||
      (input.charCodeAt(state.pos + 1) !== 0x62 && input.charCodeAt(state.pos + 1) !== 0x42)
    ) {
      return false;
    }
    state.pos += 2;
    while (
      state.pos < len &&
      (input.charCodeAt(state.pos) === 0x30 ||
        input.charCodeAt(state.pos) === 0x31 ||
        (sepCode !== undefined && input.charCodeAt(state.pos) === sepCode))
    ) {
      state.pos++;
    }
    return true;
  }
  if (isOctal) {
    if (
      state.pos + 1 >= len ||
      input.charCodeAt(state.pos) !== 0x30 ||
      (input.charCodeAt(state.pos + 1) !== 0x6f && input.charCodeAt(state.pos + 1) !== 0x4f)
    ) {
      return false;
    }
    state.pos += 2;
    while (
      state.pos < len &&
      ((input.charCodeAt(state.pos) >= 0x30 && input.charCodeAt(state.pos) <= 0x37) ||
        (sepCode !== undefined && input.charCodeAt(state.pos) === sepCode))
    ) {
      state.pos++;
    }
    return true;
  }

  if (state.pos >= len || !isDigit(input.charCodeAt(state.pos))) return false;
  state.pos++;
  while (state.pos < len && isDigitOrSep(input.charCodeAt(state.pos))) state.pos++;

  if (isFloat) {
    if (
      state.pos + 1 < len &&
      input.charCodeAt(state.pos) === 0x2e &&
      isDigit(input.charCodeAt(state.pos + 1))
    ) {
      state.pos++;
      while (state.pos < len && isDigitOrSep(input.charCodeAt(state.pos))) state.pos++;
    }
  }
  if (isScientific) {
    if (
      state.pos < len &&
      (input.charCodeAt(state.pos) === 0x65 || input.charCodeAt(state.pos) === 0x45)
    ) {
      let probe = state.pos + 1;
      if (
        probe < len &&
        (input.charCodeAt(probe) === 0x2b || input.charCodeAt(probe) === 0x2d)
      ) {
        probe++;
      }
      if (probe < len && isDigit(input.charCodeAt(probe))) {
        state.pos = probe;
        while (state.pos < len && isDigitOrSep(input.charCodeAt(state.pos))) state.pos++;
      }
    }
  }
  if (isBigint) {
    if (state.pos < len && input.charCodeAt(state.pos) === 0x6e) state.pos++;
  }
  return true;
}

// ---- until span ----------------------------------------------------------

function parseUntilSpan(
  schema: InferredSchema,
  span: ResolvedSpan,
  until: Extract<SpanModifier, { kind: 'until' }>,
  state: State,
  captures: Record<string, unknown>,
  ranges: Map<string, SpanRange>,
): boolean {
  const stops = until.stops;
  const balanced = until.balanced;
  const input = state.input;
  const len = state.len;

  // Skip leading whitespace from the capture's view. Mirrors v2's
  // emitUntilSpan which trims leading ws (and comments when the schema
  // declares the `comment` token class — that case is unused in markdown's
  // current schema; we honor it via the tokens set on the schema).
  while (state.pos < len && isWs(input.charCodeAt(state.pos))) state.pos++;

  const start = state.pos;
  let depth = 0;
  let lastNonWs = state.pos;
  while (state.pos < len) {
    if (depth === 0 && matchesAnyStop(input, state.pos, stops)) break;
    if (balanced) {
      const c = input.charCodeAt(state.pos);
      if (c === 0x28 || c === 0x5b || c === 0x7b) {
        depth++;
        state.pos++;
        lastNonWs = state.pos;
        continue;
      }
      if (c === 0x29 || c === 0x5d || c === 0x7d) {
        if (depth === 0) break;
        depth--;
        state.pos++;
        lastNonWs = state.pos;
        continue;
      }
      // CSS-style escape pair — only meaningful when the schema declares an
      // ident class with the `css` refinement and the until is balanced. We
      // honor the pair-consumption (mirrors v2's `useUrlRaw` arm).
      if (c === 0x5c && state.pos + 1 < len) {
        state.pos += 2;
        lastNonWs = state.pos;
        continue;
      }
    }
    const c = input.charCodeAt(state.pos);
    if (c !== 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d) {
      lastNonWs = state.pos + 1;
    }
    state.pos++;
  }

  // requireStop: fail the production when the scan exited via EOF (no stop
  // was matched). The loop above exits either on a stop match (state.pos < len)
  // or on the while-guard (state.pos >= len). Also fail on unmatched bracket.
  if (until.requireStop) {
    if (state.pos >= len || depth !== 0) {
      if (state.pos > state.maxOff) state.maxOff = state.pos;
      return false;
    }
  }

  // Trim trailing whitespace from the captured slice (v2 always trims, even
  // when the schema's `until.trim` is false — see comment in emitUntilSpan).
  const trimEnd = lastNonWs;
  let value: string;
  let endOff: number;
  if (trimEnd === start) {
    // Empty capture: rewind off to the pre-ws position to leave the ws for
    // whoever follows. Mirrors v2's __emptyAnchor logic (we don't track
    // leading comments in this interpreter).
    state.pos = start;
    value = '';
    endOff = start;
  } else {
    state.pos = trimEnd;
    value = input.slice(start, trimEnd);
    endOff = trimEnd;
  }

  if (until.rejectSuffix && until.rejectSuffix.some((s) => value.endsWith(s))) {
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    return false;
  }
  if (until.nonEmpty && value.length === 0) {
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    return false;
  }

  // Avoid `tokens.has('string')` etc. — the schema-declared token-class set
  // affects the kernel only when the body must skip strings/comments as
  // opaque units. None of the current happy-path markdown captures exercise
  // those (no `tokens: ['string','comment']` in markdown). When we get to
  // css/html the schema lookup below will be needed.
  void schema;

  bindSpan(span, value, start, endOff, captures, ranges);
  return true;
}

// ---- rawUntil span -------------------------------------------------------

function parseRawUntilSpan(
  span: ResolvedSpan,
  rawUntil: Extract<SpanModifier, { kind: 'rawUntil' }>,
  state: State,
  captures: Record<string, unknown>,
  ranges: Map<string, SpanRange>,
): boolean {
  const stops = rawUntil.stops;
  const ci = rawUntil.caseInsensitive;
  const input = state.input;
  const len = state.len;
  const start = state.pos;

  let earliest = len;
  if (stops.length > 0) {
    for (let i = start; i < len; i++) {
      if (matchesAnyStopAt(input, i, stops, ci)) {
        earliest = i;
        break;
      }
    }
  }
  // requireStop: fail the production when no stop was found (earliest === len).
  if (rawUntil.requireStop && earliest >= len) {
    if (earliest > state.maxOff) state.maxOff = earliest;
    return false;
  }
  state.pos = earliest;
  const value = input.slice(start, earliest);
  // nonEmpty: fail the production when the captured value is zero-length.
  if (rawUntil.nonEmpty && value.length === 0) {
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    return false;
  }
  bindSpan(span, value, start, earliest, captures, ranges);
  return true;
}

// ---- recursive role span -------------------------------------------------

function parseRecursiveSpan(
  schema: InferredSchema,
  span: ResolvedSpan,
  state: State,
  captures: Record<string, unknown>,
  ranges: Map<string, SpanRange>,
  isOptional: boolean,
): boolean {
  skipWs(state);
  const start = state.pos;
  const value = dispatchRoles(schema, span.recursiveRoles, state);
  if (value === null) {
    if (isOptional) {
      bindSpan(span, null, start, start, captures, ranges);
      return true;
    }
    state.pos = start;
    return false;
  }
  bindSpan(span, value, start, state.pos, captures, ranges);
  return true;
}

// ---- repeats span --------------------------------------------------------

function parseRepeatsSpan(
  schema: InferredSchema,
  span: ResolvedSpan,
  repeats: Extract<SpanModifier, { kind: 'repeats' }>,
  state: State,
  captures: Record<string, unknown>,
  ranges: Map<string, SpanRange>,
): boolean {
  const min = repeats.min ?? 0;
  const max = repeats.max;
  const sep = repeats.sep;
  const stopBefore = repeats.stopBefore;
  const start = state.pos;
  const list: unknown[] = [];
  let sepConsumed = false;
  let preSweep = state.pos;

  // Loop. Each iteration: optional sep-sweep, stopBefore check, attempt
  // one role parse, push on success. Break when no role matched.
  // Infinite-loop guard: break if a successful parse didn't advance.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const loopStart = state.pos;
    if (sep !== undefined) {
      preSweep = state.pos;
      sepConsumed = false;
      // Skip ws before sep.
      while (state.pos < state.len && isWs(state.input.charCodeAt(state.pos))) state.pos++;
      while (state.input.startsWith(sep, state.pos)) {
        sepConsumed = true;
        state.pos += sep.length;
        while (state.pos < state.len && isWs(state.input.charCodeAt(state.pos))) state.pos++;
      }
    }
    if (stopBefore && stopBefore.length > 0) {
      let stop = false;
      for (const prefix of stopBefore) {
        if (prefix.length > 0 && state.input.startsWith(prefix, state.pos)) {
          stop = true;
          break;
        }
      }
      if (stop) break;
    }
    const beforeAttempt = state.pos;
    const value = dispatchRoles(schema, span.recursiveRoles, state);
    if (value === null) {
      state.pos = beforeAttempt;
      break;
    }
    list.push(value);
    if (state.pos === loopStart) break;
    if (max !== undefined && list.length > max) {
      state.pos = start;
      return false;
    }
  }

  // Trailing-separator policy.
  const trailing = repeats.trailing ?? 'allowed';
  if (sep !== undefined && trailing === 'forbidden') {
    if (sepConsumed) state.pos = preSweep;
  }
  if (sep !== undefined && trailing === 'required') {
    if (list.length > 0 && !sepConsumed) {
      state.pos = start;
      return false;
    }
  }
  if (list.length < min) {
    state.pos = start;
    return false;
  }
  bindSpan(span, list, start, state.pos, captures, ranges);
  return true;
}

// ---- role dispatch -------------------------------------------------------

// Attempts to parse one node by trying each role in order, with byte-prefix
// bucketing (mirrors emitRoleLadder). For correctness the order matters:
// roles with byte-discriminated first spans are tried before fallthrough
// roles (until/rawUntil/repeats/optional first span). Within a same-byte
// bucket, longest literal prefix first.
function dispatchRoles(
  schema: InferredSchema,
  roles: ReadonlyArray<string>,
  state: State,
): Captures | null {
  if (roles.length === 0) return null;
  skipWs(state);
  if (state.pos >= state.len) return null;
  // Single role — direct call.
  if (roles.length === 1) {
    return parseNode(schema, roles[0]!, state);
  }
  // Multi-role: split roles into byte-signatured vs. fallthrough buckets.
  // A byte-signatured role's first span is a literal/class with a fixed
  // first byte; a fallthrough role's first span is .until / .rawUntil /
  // .repeats / .optional / a recursive role — those match any byte.
  //
  // Dispatch order: byteSig roles first (longest literal prefix wins
  // internally via orderProductionsForDispatch), then fallthrough roles.
  // The v2 emitter additionally suppresses fallthrough roles when the
  // current byte is unambiguously claimed by a byteSig role's literal
  // first byte (e.g. for HTML's `<` byte the dispatcher tries
  // Comment/Doctype/HtmlElement and explicitly skips TextNode). We mirror
  // that suppression for *literal* byteSig sets only — class-typed
  // byteSig spans (ident/number/hex/...) accept broad byte ranges, so
  // we keep the fallthrough open in that case to avoid regressing CSS
  // dispatch where ident-class first spans share bytes with paragraph-
  // style fallthrough roles.
  const byteSig: string[] = [];
  const fallthrough: string[] = [];
  const byteSigLiteralBytes = new Set<number>();
  for (const role of roles) {
    const info = schema.nodeTypes.get(role);
    if (!info) continue;
    let isFallthrough = true;
    for (const prod of info.productions) {
      const s0 = prod.spans[0];
      if (!s0) continue;
      if (
        findModifier(s0, 'until') ||
        findModifier(s0, 'rawUntil') ||
        findModifier(s0, 'repeats') ||
        hasModifier(s0, 'optional') ||
        s0.recursiveRoles.length > 0
      ) {
        continue;
      }
      isFallthrough = false;
      if (s0.class === 'literal' && typeof s0.text === 'string' && s0.text.length > 0) {
        byteSigLiteralBytes.add(s0.text.charCodeAt(0));
      }
      break;
    }
    if (isFallthrough) fallthrough.push(role);
    else byteSig.push(role);
  }
  const c0 = state.input.charCodeAt(state.pos);
  const byteClaimedByLiteralByteSig =
    byteSig.length > 0 && byteSigLiteralBytes.has(c0);
  const ladder = byteClaimedByLiteralByteSig
    ? byteSig
    : [...byteSig, ...fallthrough];
  for (const role of ladder) {
    const entry = state.pos;
    const result = parseNode(schema, role, state);
    if (result !== null) return result;
    state.pos = entry;
  }
  return null;
}

// --- Bindings + synthetic refs ---------------------------------------------

function bindSpan(
  span: ResolvedSpan,
  value: unknown,
  start: number,
  end: number,
  captures: Record<string, unknown>,
  ranges: Map<string, SpanRange>,
): void {
  if (!span.name) return;
  captures[span.name] = value;
  ranges.set(span.name, { start, end });
}

function attachSyntheticRefs(
  production: Production,
  captures: Captures,
  ranges: Map<string, SpanRange>,
  input: string,
  endOff: number,
): void {
  // Walk every render body and resolve any structure ref to its synthetic
  // captures key.
  const seen = new Set<string>();
  const visit = (body: RenderBody): void => {
    if (body === null) return;
    const t = typeof body;
    if (t === 'string' || t === 'number' || t === 'boolean') return;
    if (isTemplate(body)) return;
    if (isStructureRef(body)) {
      if (body.__ref === 'span-value' || body.__ref === 'span-presence') return;
      const key = syntheticKey(body);
      if (seen.has(key)) return;
      seen.add(key);
      const value = computeSyntheticValue(body, ranges, input, endOff);
      if (value !== undefined) captures[key] = value;
      return;
    }
    if (Array.isArray(body)) {
      for (const item of body) visit(item);
      return;
    }
    for (const child of Object.values(body as Record<string, RenderBody>)) {
      visit(child);
    }
  };
  for (const entry of production.renders.values()) {
    visit(entry.body);
  }
}

function computeSyntheticValue(
  ref: StructureRef,
  ranges: Map<string, SpanRange>,
  input: string,
  endOff: number,
): unknown {
  switch (ref.__ref) {
    case 'span-value':
    case 'span-presence':
      return undefined;
    case 'span-gap': {
      const fromR = ranges.get(ref.from);
      const toR = ranges.get(ref.to);
      if (!fromR || !toR) return undefined;
      return input.slice(fromR.end, toR.start);
    }
    case 'span-tail': {
      const fromR = ranges.get(ref.from);
      if (!fromR) return undefined;
      return input.slice(fromR.end, endOff);
    }
    case 'span-raw': {
      const r = ranges.get(ref.name);
      if (!r) return undefined;
      return input.slice(r.start, r.end);
    }
    case 'span-ends-with': {
      const r = ranges.get(ref.name);
      if (!r) return undefined;
      return input.slice(r.end - ref.suffix.length, r.end) === ref.suffix;
    }
    case 'span-comment-left': {
      const r = ranges.get(ref.name);
      if (!r) return undefined;
      const interior = stripCommentDelimiters(input.slice(r.start, r.end));
      const trimmed = interior.replace(/[\s\S]*?(\S[\s\S]*|$)/, (_m, _rest) => _rest ?? '');
      return interior.slice(0, interior.length - trimmed.length);
    }
    case 'span-comment-right': {
      const r = ranges.get(ref.name);
      if (!r) return undefined;
      const interior = stripCommentDelimiters(input.slice(r.start, r.end));
      const trimmed = interior.replace(/\s+$/, '');
      return interior.slice(trimmed.length);
    }
  }
}

function syntheticKey(ref: StructureRef): string {
  switch (ref.__ref) {
    case 'span-value':
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

function jsIdent(name: string): string {
  return name.replace(/[^A-Za-z0-9_$]/g, '_');
}

// --- AST render walk -------------------------------------------------------

// Walks a captures object (with __production set) into the v2-equivalent
// 'ast' shape by interpreting the production's `ast` render body. Mirrors
// emit/render.ts: structural body shapes route to object/array/scalar
// literals; structure refs read captures by synthetic key; templates fuse
// into a string. The slot helper recurses into nested captures.

function renderCapturesAsAst(schema: InferredSchema, captures: Captures): unknown {
  return renderSlotAst(schema, captures);
}

function renderSlotAst(schema: InferredSchema, value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => renderSlotAst(schema, v));
  if (typeof value === 'object') {
    const c = value as Record<string, unknown>;
    if (typeof c.__production === 'string') {
      const [nodeType, idxStr] = c.__production.split('#');
      const info = schema.nodeTypes.get(nodeType!);
      if (!info) throw new Error(`interp render: unknown node type '${nodeType}'`);
      const idx = Number(idxStr);
      const production = info.productions[idx];
      if (!production) {
        throw new Error(`interp render: bad production index '${c.__production}'`);
      }
      const entry = production.renders.get('ast');
      if (!entry) {
        throw new Error(`interp render: production '${c.__production}' has no 'ast' target`);
      }
      return walkBody(schema, entry.body, c, /* target */ 'ast');
    }
  }
  return value;
}

function walkBody(
  schema: InferredSchema,
  body: RenderBody,
  captures: Record<string, unknown>,
  target: string,
): unknown {
  if (body === null) return null;
  const t = typeof body;
  if (t === 'string' || t === 'number' || t === 'boolean') return body;
  if (isStructureRef(body)) return readRef(schema, body, captures, target);
  if (isTemplate(body)) return walkTemplate(schema, body, captures, target);
  if (Array.isArray(body)) {
    return body.map((child) => walkBody(schema, child, captures, target));
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body as Record<string, RenderBody>)) {
    out[k] = walkBody(schema, v, captures, target);
  }
  return out;
}

function readRef(
  schema: InferredSchema,
  ref: StructureRef,
  captures: Record<string, unknown>,
  target: string,
): unknown {
  if (ref.__ref === 'span-presence') {
    return captures[ref.name] != null;
  }
  const key = syntheticKey(ref);
  const value = captures[key];
  if (ref.__ref === 'span-value') {
    return renderSlotForTarget(schema, value, target);
  }
  return value;
}

function renderSlotForTarget(schema: InferredSchema, value: unknown, target: string): unknown {
  if (target === 'ast') return renderSlotAst(schema, value);
  // For string targets (html/source) we collapse arrays via the same logic
  // emit/render.ts uses; this isn't exercised by the parse-path tests but
  // we provide it so Task 2.2 (render path) has a starting point.
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) {
    return value.map((v) => renderSlotForTarget(schema, v, target));
  }
  if (typeof value === 'object' && typeof (value as Captures).__production === 'string') {
    const c = value as Captures;
    const [nodeType, idxStr] = c.__production.split('#');
    const info = schema.nodeTypes.get(nodeType!);
    if (!info) throw new Error(`interp render: unknown node type '${nodeType}'`);
    const production = info.productions[Number(idxStr)]!;
    const entry = production.renders.get(target);
    if (!entry) throw new Error(`interp render: no '${target}' for '${c.__production}'`);
    return walkBody(schema, entry.body, c, target);
  }
  return value;
}

function walkTemplate(
  schema: InferredSchema,
  template: Template,
  captures: Record<string, unknown>,
  target: string,
): string {
  const { parts, slots } = template;
  let out = '';
  for (let i = 0; i < parts.length; i++) {
    out += parts[i];
    if (i < slots.length) {
      const slot = slots[i]!;
      const raw = captures[slot.ref];
      const rendered = renderSlotForTarget(schema, raw, target);
      if (rendered === null || rendered === undefined) {
        // Match v2's null-coalesce in template fusion.
        continue;
      }
      if (Array.isArray(rendered)) {
        // v2 joins with " " by default for .repeats() arrays — we don't
        // have access to the per-slot span's repeats sep here. The parse-
        // path tests don't exercise template-with-array slots; if they
        // do this needs the same `repeatsJoinSeparator` lookup that
        // emit/render.ts performs.
        out += rendered.join(' ');
      } else {
        out += String(rendered);
      }
    }
  }
  return out;
}

// --- Helpers ---------------------------------------------------------------

function skipWs(state: State): void {
  while (state.pos < state.len && isWs(state.input.charCodeAt(state.pos))) state.pos++;
}

function isWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}
function isDigit(c: number): boolean {
  return c >= 0x30 && c <= 0x39;
}
function isHexDigit(c: number): boolean {
  return (c >= 0x30 && c <= 0x39) || (c >= 0x41 && c <= 0x46) || (c >= 0x61 && c <= 0x66);
}
function isCssIdentStart(c: number): boolean {
  return (c >= 0x61 && c <= 0x7a) || (c >= 0x41 && c <= 0x5a) || c === 0x5f || c === 0x2d;
}
function isCssIdentPart(c: number): boolean {
  return isCssIdentStart(c) || (c >= 0x30 && c <= 0x39);
}
function isJsIdentStart(c: number): boolean {
  return (c >= 0x61 && c <= 0x7a) || (c >= 0x41 && c <= 0x5a) || c === 0x5f || c === 0x24;
}
function isJsIdentPart(c: number): boolean {
  return isJsIdentStart(c) || (c >= 0x30 && c <= 0x39);
}

function matchesAnyStop(input: string, pos: number, stops: ReadonlyArray<string>): boolean {
  for (const stop of stops) {
    if (stop.length === 0) continue;
    if (input.startsWith(stop, pos)) return true;
  }
  return false;
}

function matchesAnyStopAt(
  input: string,
  pos: number,
  stops: ReadonlyArray<string>,
  ci: boolean,
): boolean {
  for (const stop of stops) {
    if (stop.length === 0) continue;
    if (!ci) {
      if (input.startsWith(stop, pos)) return true;
      continue;
    }
    if (pos + stop.length > input.length) continue;
    let ok = true;
    for (let j = 0; j < stop.length; j++) {
      const ic = input.charCodeAt(pos + j);
      const nc = stop.charCodeAt(j);
      const ifold = (ic >= 0x41 && ic <= 0x5a) || (ic >= 0x61 && ic <= 0x7a) ? ic | 0x20 : ic;
      const nfold = (nc >= 0x41 && nc <= 0x5a) || (nc >= 0x61 && nc <= 0x7a) ? nc | 0x20 : nc;
      if (ifold !== nfold) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

function findModifier<K extends SpanModifier['kind']>(
  span: ResolvedSpan,
  kind: K,
): Extract<SpanModifier, { kind: K }> | undefined {
  for (const m of span.modifiers) {
    if (m.kind === kind) return m as Extract<SpanModifier, { kind: K }>;
  }
  return undefined;
}

function hasModifier(span: ResolvedSpan, kind: SpanModifier['kind']): boolean {
  return findModifier(span, kind) !== undefined;
}

function stripCommentDelimiters(s: string): string {
  // Strip `/* ... */` if present. Used for class='comment' values.
  if (s.startsWith('/*') && s.endsWith('*/') && s.length >= 4) {
    return s.slice(2, s.length - 2);
  }
  return s;
}

function trimWs(s: string): string {
  let start = 0;
  let end = s.length;
  while (start < end && isWs(s.charCodeAt(start))) start++;
  while (end > start && isWs(s.charCodeAt(end - 1))) end--;
  return s.slice(start, end);
}
