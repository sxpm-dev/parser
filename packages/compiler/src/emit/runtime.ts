// Inline runtime helpers emitted into every generated parser. Keep this tiny;
// each helper exists because the generated parser body refers to it.
//
// Tokens are stored as a Structure-of-Arrays: parallel `types` (Uint16Array,
// integer ID per token-class/literal-type), `starts` and `ends` (Uint32Array,
// byte offsets). `count` is the number of tokens scanned. This replaces a
// `Token[]` of `{type, value, start, end}` object literals — the same parser
// without 200k+ object allocations per parse cycle. Helpers compare against
// integer IDs, which V8 turns into one machine instruction each.
//
// `value` is reconstructed on demand: `input.slice(starts[pos], ends[pos])`.
// For known-literal token types codegen can skip even that — the literal
// text is a compile-time constant.

export const PARSE_RUNTIME = `type State = {
  readonly types: Uint16Array;
  readonly starts: Uint32Array;
  readonly ends: Uint32Array;
  readonly count: number;
  pos: number;
  readonly input: string;
  readonly lineStarts: number[];
  readonly mode: ParseMode;
  readonly hasComments: boolean;
  readonly commentTypeId: number;
  __lastCaptureStart: number;
  __lastCaptureEnd: number;
};

export type ParseMode = 'fast' | 'raws';
export type ParseOptions = {
  readonly mode?: ParseMode;
  readonly validate?: boolean;
};

type SourcePos = { readonly line: number; readonly column: number; readonly offset: number };
type SourceRange = { readonly start: SourcePos; readonly end: SourcePos };

function computeLineStarts(input: string): number[] {
  const starts = [0];
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) === 0x0a) starts.push(i + 1);
  }
  return starts;
}

function offsetToPos(state: State, offset: number): SourcePos {
  const starts = state.lineStarts;
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - starts[lo] + 1, offset };
}

function makeSource(state: State, startOff: number, endOff: number): SourceRange {
  // PostCSS convention: end.offset is exclusive (one past last consumed char)
  // but end.line/column refer to the LAST consumed char (inclusive). So we
  // compute end's line/column from (endOff - 1) and keep offset as-is.
  const start = offsetToPos(state, startOff);
  const end = endOff > startOff
    ? { ...offsetToPos(state, endOff - 1), offset: endOff }
    : { ...offsetToPos(state, startOff), offset: endOff };
  return { start, end };
}

// Skip comment tokens between sequential spans. Spans that explicitly
// expect a comment opt out via the call sites below, so standalone comment
// captures still work.
function skipComments(state: State): void {
  if (!state.hasComments) return;
  const cid = state.commentTypeId;
  while (state.pos < state.count && state.types[state.pos] === cid) {
    state.pos++;
  }
}

// Strip /* */ delimiters and trim. PostCSS stores the trimmed interior in
// .text and the leading/trailing whitespace inside the comment in raws.
function commentInterior(text: string): string {
  return text.slice(2, -2).trim();
}

// Leading whitespace inside a comment's interior (between /* and the first
// non-whitespace char). For all-whitespace interiors, left captures the
// entire interior and right is empty — matching PostCSS's convention of
// not double-counting whitespace.
function commentLeft(raw: string): string {
  const inner = raw.slice(2, -2);
  const m = /^\\s*/.exec(inner);
  return m ? m[0] : '';
}

// Trailing whitespace inside a comment's interior. Returns '' when the
// interior is entirely whitespace (left already captured all of it).
function commentRight(raw: string): string {
  const inner = raw.slice(2, -2);
  if (inner.trim() === '') return '';
  const m = /\\s*\$/.exec(inner);
  return m ? m[0] : '';
}

// Reconstruct a token's text value from input + offset arrays. Allocates a
// new string. Avoid on the hot path: most call sites compare against known
// literals via integer type IDs and never need the value.
function tokenValue(state: State, pos: number): string {
  return state.input.slice(state.starts[pos], state.ends[pos]);
}

function tokenEquals(state: State, pos: number, literal: string): boolean {
  const start = state.starts[pos];
  const end = state.ends[pos];
  if (end - start !== literal.length) return false;
  const input = state.input;
  for (let i = 0; i < literal.length; i++) {
    if (input.charCodeAt(start + i) !== literal.charCodeAt(i)) return false;
  }
  return true;
}

// Single-literal-type variants: when only one literal in the schema maps to
// the given type ID, a type compare is sufficient (no value check needed).
function expectLiteralId(state: State, typeId: number, literal: string): string {
  skipComments(state);
  const pos = state.pos;
  if (pos >= state.count || state.types[pos] !== typeId) {
    throw new SyntaxError(\`expected '\${literal}' at token \${pos}\`);
  }
  state.pos = pos + 1;
  return literal;
}

function consumeOptionalLiteralId(state: State, typeId: number, literal: string): string | null {
  const saved = state.pos;
  skipComments(state);
  const pos = state.pos;
  if (pos >= state.count || state.types[pos] !== typeId) {
    state.pos = saved;
    return null;
  }
  state.pos = pos + 1;
  return literal;
}

// Multi-literal-type variants: type ID alone isn't enough (e.g. HTML's
// 'delim' covers many single chars). Verify the literal text without
// allocating a slice — compare each char of input directly.
function expectLiteralIdValue(state: State, typeId: number, literal: string): string {
  skipComments(state);
  const pos = state.pos;
  if (pos >= state.count || state.types[pos] !== typeId || !tokenEquals(state, pos, literal)) {
    throw new SyntaxError(\`expected '\${literal}' at token \${pos}\`);
  }
  state.pos = pos + 1;
  return literal;
}

function consumeOptionalLiteralIdValue(state: State, typeId: number, literal: string): string | null {
  const saved = state.pos;
  skipComments(state);
  const pos = state.pos;
  if (pos >= state.count || state.types[pos] !== typeId || !tokenEquals(state, pos, literal)) {
    state.pos = saved;
    return null;
  }
  state.pos = pos + 1;
  return literal;
}

function expectClassId(state: State, typeId: number, className: string): string {
  if (typeId !== state.commentTypeId) skipComments(state);
  const pos = state.pos;
  if (pos >= state.count || state.types[pos] !== typeId) {
    throw new SyntaxError(\`expected token of class '\${className}' at token \${pos}\`);
  }
  state.pos = pos + 1;
  return state.input.slice(state.starts[pos], state.ends[pos]);
}

function consumeOptionalClassId(state: State, typeId: number): string | null {
  const saved = state.pos;
  if (typeId !== state.commentTypeId) skipComments(state);
  const pos = state.pos;
  if (pos >= state.count || state.types[pos] !== typeId) {
    state.pos = saved;
    return null;
  }
  state.pos = pos + 1;
  return state.input.slice(state.starts[pos], state.ends[pos]);
}

function requireNoWhitespaceAfterLastToken(state: State): void {
  const pos = state.pos;
  if (pos === 0 || pos >= state.count || state.ends[pos - 1] !== state.starts[pos]) {
    throw new SyntaxError('expected no whitespace after token ' + (pos - 1));
  }
}

// Single-literal-type peek — type ID alone is enough.
function peekLiteralId(state: State, typeId: number): boolean {
  const pos = state.pos;
  return pos < state.count && state.types[pos] === typeId;
}

function peekLiteralIdValue(state: State, typeId: number, literal: string): boolean {
  const pos = state.pos;
  return pos < state.count && state.types[pos] === typeId && tokenEquals(state, pos, literal);
}

function peekLiteralIdAfterComments(state: State, typeId: number): boolean {
  if (!state.hasComments) return peekLiteralId(state, typeId);
  let pos = state.pos;
  const cid = state.commentTypeId;
  while (pos < state.count && state.types[pos] === cid) pos++;
  return pos < state.count && state.types[pos] === typeId;
}

function peekLiteralIdValueAfterComments(state: State, typeId: number, literal: string): boolean {
  if (!state.hasComments) return peekLiteralIdValue(state, typeId, literal);
  let pos = state.pos;
  const cid = state.commentTypeId;
  while (pos < state.count && state.types[pos] === cid) pos++;
  return pos < state.count && state.types[pos] === typeId && tokenEquals(state, pos, literal);
}

// Skip comment tokens starting at \`pos\`; return the resulting index.
function nextNonCommentPos(state: State, pos: number): number {
  if (!state.hasComments) return pos;
  const cid = state.commentTypeId;
  while (pos < state.count && state.types[pos] === cid) pos++;
  return pos;
}

function nthNonCommentPos(state: State, pos: number, index: number): number {
  if (!state.hasComments) return pos + index;
  let seen = 0;
  const cid = state.commentTypeId;
  while (pos < state.count) {
    if (state.types[pos] !== cid) {
      if (seen === index) return pos;
      seen++;
    }
    pos++;
  }
  return state.count;
}

function trySpeculate(state: State, fn: (state: State) => unknown): unknown {
  const start = state.pos;
  try {
    return fn(state);
  } catch {
    state.pos = start;
    return null;
  }
}

// Try each role function in order. The first one that succeeds wins.
// Throws if none succeed (preserves the error from the LAST attempt).
function tryRoles(state: State, fns: readonly ((state: State) => unknown)[]): unknown {
  let lastError: unknown;
  const start = state.pos;
  for (const fn of fns) {
    state.pos = start;
    try {
      return fn(state);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new SyntaxError('no role matched');
}

function tryRolesOrNull(state: State, fns: readonly ((state: State) => unknown)[]): unknown {
  const start = state.pos;
  for (const fn of fns) {
    state.pos = start;
    try {
      return fn(state);
    } catch {
      // try next
    }
  }
  state.pos = start;
  return null;
}

// captureUntil consumes tokens from the current position until it sees a
// token whose type ID matches \`stopId0..2\` (-1 = absent slot). Multi-literal
// types (e.g. HTML's 'delim' covering many single chars) require a value
// check too — codegen passes the literal text via \`stopVal0..2\`; empty
// string = single-literal type (no value check needed).
//
// When \`balanced\` is true, bracket pairs () [] {} nest, tracked by leading
// charcode. A closing bracket at depth zero means we've reached the boundary
// of an enclosing block — stop without consuming it. Returns the source
// slice covering consumed tokens (optionally trimmed).
function captureUntil(
  state: State,
  stopId0: number, stopVal0: string,
  stopId1: number, stopVal1: string,
  stopId2: number, stopVal2: string,
  balanced: boolean,
  trim: boolean,
): string {
  let depth = 0;
  const cid = state.commentTypeId;
  while (state.pos < state.count && state.types[state.pos] === cid) state.pos++;
  const firstIdx = state.pos;
  if (firstIdx >= state.count) {
    state.__lastCaptureStart = state.input.length;
    state.__lastCaptureEnd = state.input.length;
    return '';
  }
  const input = state.input;
  while (state.pos < state.count) {
    const t = state.types[state.pos];
    if (depth === 0) {
      if (t === stopId0 && (stopVal0 === '' || tokenEquals(state, state.pos, stopVal0))) break;
      if (t === stopId1 && (stopVal1 === '' || tokenEquals(state, state.pos, stopVal1))) break;
      if (t === stopId2 && (stopVal2 === '' || tokenEquals(state, state.pos, stopVal2))) break;
    }
    if (balanced) {
      const c = input.charCodeAt(state.starts[state.pos]);
      if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === 0x7b /* { */) depth++;
      else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === 0x7d /* } */) {
        if (depth === 0) break;
        depth--;
      }
    }
    state.pos++;
  }
  while (state.pos > firstIdx && state.types[state.pos - 1] === cid) state.pos--;
  if (state.pos <= firstIdx) {
    const here = state.pos > 0 ? state.ends[state.pos - 1] : 0;
    state.__lastCaptureStart = here;
    state.__lastCaptureEnd = here;
    return '';
  }
  const startOff = state.starts[firstIdx];
  const endOff = state.ends[state.pos - 1];
  state.__lastCaptureStart = startOff;
  state.__lastCaptureEnd = endOff;

  if (!state.hasComments) {
    if (!trim) return input.slice(startOff, endOff);
    let valueStart = startOff;
    let valueEnd = endOff;
    while (valueStart < valueEnd && isAsciiWs(input.charCodeAt(valueStart))) valueStart++;
    while (valueEnd > valueStart && isAsciiWs(input.charCodeAt(valueEnd - 1))) valueEnd--;
    return input.slice(valueStart, valueEnd);
  }

  const omit: Array<[number, number]> = [];
  for (let i = firstIdx; i < state.pos; i++) {
    if (state.types[i] !== cid) continue;
    const tStart = state.starts[i];
    const tEnd = state.ends[i];
    const before = tStart > 0 ? input.charCodeAt(tStart - 1) : -1;
    const after = tEnd < input.length ? input.charCodeAt(tEnd) : -1;
    if (isAsciiWs(before) || isAsciiWs(after)) omit.push([tStart, tEnd]);
  }
  if (omit.length === 0) {
    if (!trim) return input.slice(startOff, endOff);
    let valueStart = startOff;
    let valueEnd = endOff;
    while (valueStart < valueEnd && isAsciiWs(input.charCodeAt(valueStart))) valueStart++;
    while (valueEnd > valueStart && isAsciiWs(input.charCodeAt(valueEnd - 1))) valueEnd--;
    return input.slice(valueStart, valueEnd);
  }
  let buf = '';
  let cursor = startOff;
  for (const [s, e] of omit) {
    buf += input.slice(cursor, s);
    cursor = e;
  }
  buf += input.slice(cursor, endOff);
  return trim ? buf.trim() : buf;
}

function scanTopLevelBoundary(
  state: State,
  stopId0: number, stopVal0: string,
  stopId1: number, stopVal1: string,
  stopId2: number, stopVal2: string,
  watchId0: number, watchVal0: string,
  watchId1: number, watchVal1: string,
): { firstIdx: number; stopIdx: number; captureEndIdx: number; stopId: number; watchIdx: number; watch1Idx: number } {
  let depth = 0;
  let pos = state.pos;
  const cid = state.commentTypeId;
  while (pos < state.count && state.types[pos] === cid) pos++;
  const firstIdx = pos;
  let watchIdx = -1;
  let watch1Idx = -1;
  const input = state.input;
  while (pos < state.count) {
    const t = state.types[pos];
    if (depth === 0) {
      if (watchIdx < 0 && watchId0 !== -1 && t === watchId0 && (watchVal0 === '' || tokenEquals(state, pos, watchVal0))) watchIdx = pos;
      if (watch1Idx < 0 && watchId1 !== -1 && t === watchId1 && (watchVal1 === '' || tokenEquals(state, pos, watchVal1))) watch1Idx = pos;
      if (t === stopId0 && (stopVal0 === '' || tokenEquals(state, pos, stopVal0))) break;
      if (t === stopId1 && (stopVal1 === '' || tokenEquals(state, pos, stopVal1))) break;
      if (t === stopId2 && (stopVal2 === '' || tokenEquals(state, pos, stopVal2))) break;
    }
    const c = input.charCodeAt(state.starts[pos]);
    if (c === 0x28 || c === 0x5b || c === 0x7b) depth++;
    else if (c === 0x29 || c === 0x5d || c === 0x7d) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  let captureEndIdx = pos;
  while (captureEndIdx > firstIdx && state.types[captureEndIdx - 1] === cid) captureEndIdx--;
  return {
    firstIdx,
    stopIdx: pos,
    captureEndIdx,
    stopId: pos < state.count ? state.types[pos] : -1,
    watchIdx,
    watch1Idx,
  };
}

function captureTokenRange(state: State, firstIdx: number, endIdx: number, trim: boolean): string {
  if (firstIdx >= state.count || endIdx <= firstIdx) {
    const here = firstIdx > 0 ? state.ends[Math.max(0, firstIdx - 1)] : 0;
    state.__lastCaptureStart = here;
    state.__lastCaptureEnd = here;
    return '';
  }
  const input = state.input;
  const cid = state.commentTypeId;
  const startOff = state.starts[firstIdx];
  const endOff = state.ends[endIdx - 1];
  state.__lastCaptureStart = startOff;
  state.__lastCaptureEnd = endOff;

  if (!state.hasComments) {
    if (!trim) return input.slice(startOff, endOff);
    let valueStart = startOff;
    let valueEnd = endOff;
    while (valueStart < valueEnd && isAsciiWs(input.charCodeAt(valueStart))) valueStart++;
    while (valueEnd > valueStart && isAsciiWs(input.charCodeAt(valueEnd - 1))) valueEnd--;
    return input.slice(valueStart, valueEnd);
  }

  const omit: Array<[number, number]> = [];
  for (let i = firstIdx; i < endIdx; i++) {
    if (state.types[i] !== cid) continue;
    const tStart = state.starts[i];
    const tEnd = state.ends[i];
    const before = tStart > 0 ? input.charCodeAt(tStart - 1) : -1;
    const after = tEnd < input.length ? input.charCodeAt(tEnd) : -1;
    if (isAsciiWs(before) || isAsciiWs(after)) omit.push([tStart, tEnd]);
  }
  if (omit.length === 0) {
    if (!trim) return input.slice(startOff, endOff);
    let valueStart = startOff;
    let valueEnd = endOff;
    while (valueStart < valueEnd && isAsciiWs(input.charCodeAt(valueStart))) valueStart++;
    while (valueEnd > valueStart && isAsciiWs(input.charCodeAt(valueEnd - 1))) valueEnd--;
    return input.slice(valueStart, valueEnd);
  }
  let buf = '';
  let cursor = startOff;
  for (const [s, e] of omit) {
    buf += input.slice(cursor, s);
    cursor = e;
  }
  buf += input.slice(cursor, endOff);
  return trim ? buf.trim() : buf;
}

// captureRawUntil scans raw source from the current token's start offset
// looking for the earliest occurrence of any literal in stops. Returns
// the source slice between current position and the matched stop. State
// advances to the first token whose start offset is at or past the stop.
function captureRawUntil(state: State, stops: readonly string[], caseInsensitive: boolean): string {
  const startOff = state.pos < state.count
    ? state.starts[state.pos]
    : state.input.length;
  const input = state.input;
  const inputLen = input.length;
  let earliest = inputLen;

  for (let s = 0; s < stops.length; s++) {
    const stop = stops[s];
    if (stop.length !== 1) continue;
    const code = stop.charCodeAt(0);
    const idx = caseInsensitive
      ? indexOfCharCI(input, code, startOff, earliest)
      : indexOfChar(input, code, startOff, earliest);
    if (idx !== -1 && idx < earliest) earliest = idx;
  }
  for (let s = 0; s < stops.length; s++) {
    const stop = stops[s];
    if (stop.length < 2) continue;
    const idx = caseInsensitive
      ? indexOfCaseInsensitive(input, stop, startOff, earliest)
      : indexOfBounded(input, stop, startOff, earliest);
    if (idx !== -1 && idx < earliest) earliest = idx;
  }

  while (state.pos < state.count && state.starts[state.pos] < earliest) {
    state.pos++;
  }
  state.__lastCaptureStart = startOff;
  state.__lastCaptureEnd = earliest;
  return input.slice(startOff, earliest);
}

// Tight scan: find the first occurrence of \`code\` in input[from..limit).
// Returns -1 if absent. Avoids native indexOf's "scan to end of string"
// behavior on misses — important when many parallel stops are checked.
function indexOfChar(input: string, code: number, from: number, limit: number): number {
  const end = limit < input.length ? limit : input.length;
  for (let i = from; i < end; i++) {
    if (input.charCodeAt(i) === code) return i;
  }
  return -1;
}

// ASCII case-insensitive variant of indexOfChar.
function indexOfCharCI(input: string, code: number, from: number, limit: number): number {
  const fold = (code >= 0x41 && code <= 0x5a) || (code >= 0x61 && code <= 0x7a) ? code | 0x20 : code;
  const end = limit < input.length ? limit : input.length;
  for (let i = from; i < end; i++) {
    const c = input.charCodeAt(i);
    const f = (c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) ? c | 0x20 : c;
    if (f === fold) return i;
  }
  return -1;
}

// Bounded multi-char indexOf. Manual scan with first-char filter; stops at
// limit. Critical that this NOT delegate to input.indexOf — native indexOf
// scans to end-of-string on misses (catastrophic for the multi-stop path
// where most needles don't appear at all in the local region).
function indexOfBounded(input: string, needle: string, from: number, limit: number): number {
  const needleLen = needle.length;
  const end = (limit < input.length ? limit : input.length) - needleLen;
  const first = needle.charCodeAt(0);
  if (needleLen === 2) {
    const second = needle.charCodeAt(1);
    for (let i = from; i <= end; i++) {
      if (input.charCodeAt(i) === first && input.charCodeAt(i + 1) === second) return i;
    }
    return -1;
  }
  outer: for (let i = from; i <= end; i++) {
    if (input.charCodeAt(i) !== first) continue;
    for (let j = 1; j < needleLen; j++) {
      if (input.charCodeAt(i + j) !== needle.charCodeAt(j)) continue outer;
    }
    return i;
  }
  return -1;
}

// ASCII case-insensitive indexOf scanning input[from..limit) for needle.
// Returns the first match offset or -1. No allocation.
function indexOfCaseInsensitive(input: string, needle: string, from: number, limit: number): number {
  const needleLen = needle.length;
  const maxStart = (limit < input.length ? limit : input.length) - needleLen;
  outer: for (let i = from; i <= maxStart; i++) {
    for (let j = 0; j < needleLen; j++) {
      const ic = input.charCodeAt(i + j);
      const nc = needle.charCodeAt(j);
      const ifold = (ic >= 0x41 && ic <= 0x5a) || (ic >= 0x61 && ic <= 0x7a) ? ic | 0x20 : ic;
      const nfold = (nc >= 0x41 && nc <= 0x5a) || (nc >= 0x61 && nc <= 0x7a) ? nc | 0x20 : nc;
      if (ifold !== nfold) continue outer;
    }
    return i;
  }
  return -1;
}

function nextTopLevelStopId(
  state: State,
  stopId0: number, stopVal0: string,
  stopId1: number, stopVal1: string,
  stopId2: number, stopVal2: string,
): number {
  let depth = 0;
  let pos = state.pos;
  const cid = state.commentTypeId;
  while (pos < state.count && state.types[pos] === cid) pos++;
  const input = state.input;
  while (pos < state.count) {
    const t = state.types[pos];
    if (depth === 0) {
      if (t === stopId0 && (stopVal0 === '' || tokenEquals(state, pos, stopVal0))) return t;
      if (t === stopId1 && (stopVal1 === '' || tokenEquals(state, pos, stopVal1))) return t;
      if (t === stopId2 && (stopVal2 === '' || tokenEquals(state, pos, stopVal2))) return t;
    }
    const c = input.charCodeAt(state.starts[pos]);
    if (c === 0x28 || c === 0x5b || c === 0x7b) depth++;
    else if (c === 0x29 || c === 0x5d || c === 0x7d) {
      if (depth === 0) return t;
      depth--;
    }
    pos++;
  }
  return -1;
}

function isAsciiWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}

function isHexString(value: string): boolean {
  if (value.length === 0) return false;
  for (let i = 0; i < value.length; i++) {
    if (!isHexDigit(value.charCodeAt(i))) return false;
  }
  return true;
}

// Attach raws.before to a parsed child. The body loop knows the offset
// where the previous sibling ended (or where the body's opening token ended
// for the first child); raws.before is the source slice from that point up
// to this child's source.start.offset. Children that don't expose source
// are skipped (e.g. lookahead failures returning null).
//
// Root-level first-child special case: PostCSS folds leading file
// whitespace into the first child's source range (source.start = 0,
// raws.before = ''). We approximate by detecting prevEnd === 0 with a
// whitespace-only gap and emitting '' instead of the actual whitespace.
function attachRawsBefore(state: State, child: unknown, prevEnd: number): void {
  if (!child || typeof child !== 'object') return;
  const node = child as { raws?: Record<string, unknown>; source?: { start?: { offset?: number } } };
  const childStart = node.source?.start?.offset;
  if (typeof childStart !== 'number') return;
  if (!node.raws) node.raws = {};
  const slice = state.input.slice(prevEnd, childStart);
  if (prevEnd === 0 && /^\\s*$/.test(slice)) {
    node.raws.before = '';
  } else {
    node.raws.before = slice;
  }
}

function decorateSyntaxError(input: string, error: unknown, state?: State): never {
  if (!(error instanceof SyntaxError)) throw error;
  if (hasSourceFrame(error.message)) throw error;
  const messageOffset = offsetFromMessage(error.message, -1);
  const offset = messageOffset >= 0
    ? messageOffset
    : state !== undefined
    ? stateTokenOffset(state, input.length)
    : offsetFromMessage(error.message, input.length);
  throw syntaxErrorWithFrame(input, error.message, offset);
}

function syntaxErrorWithFrame(input: string, message: string, offset: number): SyntaxError {
  const cleanMessage = stripPositionSuffix(message);
  let lineStart = offset;
  while (lineStart > 0) {
    const c = input.charCodeAt(lineStart - 1);
    if (c === 0x0a || c === 0x0d) break;
    lineStart--;
  }
  let lineEnd = offset;
  while (lineEnd < input.length) {
    const c = input.charCodeAt(lineEnd);
    if (c === 0x0a || c === 0x0d) break;
    lineEnd++;
  }
  let line = 1;
  for (let i = 0; i < lineStart; i++) if (input.charCodeAt(i) === 0x0a) line++;
  const source = input.slice(lineStart, lineEnd);
  const gutter = String(line);
  const column = Math.max(0, offset - lineStart);
  return new SyntaxError(\`\${cleanMessage} at position \${offset}
\${gutter} | \${source}
\${' '.repeat(gutter.length)} | \${' '.repeat(column)}^\`);
}

function stripPositionSuffix(message: string): string {
  const marker = ' at position ';
  const index = message.lastIndexOf(marker);
  if (index < 0) return message;
  let pos = index + marker.length;
  if (pos >= message.length) return message;
  while (pos < message.length) {
    const c = message.charCodeAt(pos);
    if (c < 48 || c > 57) return message;
    pos++;
  }
  return message.slice(0, index);
}

function hasSourceFrame(message: string): boolean {
  return message.includes('\\n') && message.includes(' | ');
}

function stateTokenOffset(state: State, fallback: number): number {
  const pos = state.pos;
  if (pos < state.count) return state.starts[pos];
  if (state.count > 0) return state.ends[state.count - 1];
  return fallback;
}

function offsetFromMessage(message: string, fallback: number): number {
  const marker = 'position ';
  const index = message.indexOf(marker);
  if (index < 0) return fallback;
  let pos = index + marker.length;
  let value = 0;
  let found = false;
  while (pos < message.length) {
    const c = message.charCodeAt(pos);
    if (c < 48 || c > 57) break;
    found = true;
    value = value * 10 + c - 48;
    pos++;
  }
  return found ? value : fallback;
}`;
