// Auto-generated from packages/css-color/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
/* eslint-disable */
// @ts-nocheck



function isCssIdentStart(c: number): boolean {
  // a-z A-Z _ -
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 45;
}
function isCssIdentPart(c: number): boolean {
  return isCssIdentStart(c) || (c >= 48 && c <= 57);
}

function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}

function isHexDigit(c: number): boolean {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
}

export type Token = { readonly type: string; readonly value: string; readonly start: number; readonly end: number };

export function tokenize(input: string): Token[] {
  const tokens: (Token[] & { hasComments?: boolean }) = [];
  const len = input.length;
  let i = 0;
  while (i < len) {
    const c = input.charCodeAt(i);
    // whitespace (skip)
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { i++; continue; }


    switch (c) {
      case 35: tokens.push({ type: "hash", value: "#", start: i, end: i + 1 }); i++; continue;
      case 37: tokens.push({ type: "delim", value: "%", start: i, end: i + 1 }); i++; continue;
      case 40: tokens.push({ type: "lparen", value: "(", start: i, end: i + 1 }); i++; continue;
      case 41: tokens.push({ type: "rparen", value: ")", start: i, end: i + 1 }); i++; continue;
      case 44: tokens.push({ type: "delim", value: ",", start: i, end: i + 1 }); i++; continue;
      case 47: tokens.push({ type: "delim", value: "/", start: i, end: i + 1 }); i++; continue;
    }
    if (isDigit(c)) {
      const start = i;
      while (i < len && isDigit(input.charCodeAt(i))) i++;
      if (i < len && input.charCodeAt(i) === 0x2e /* . */ && i + 1 < len && isDigit(input.charCodeAt(i + 1))) {
        i++;
        while (i < len && isDigit(input.charCodeAt(i))) i++;
      }
      const ec = i < len ? input.charCodeAt(i) : 0;
      if (ec === 0x65 || ec === 0x45 /* e E */) {
        let j = i + 1;
        if (j < len && (input.charCodeAt(j) === 0x2b || input.charCodeAt(j) === 0x2d)) j++;
        if (j < len && isDigit(input.charCodeAt(j))) {
          i = j;
          while (i < len && isDigit(input.charCodeAt(i))) i++;
        }
      }
      tokens.push({ type: 'number', value: input.slice(start, i), start, end: i });
      continue;
    }
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      const quote = c;
      const start = i;
      i++;
      while (i < len) {
        const ch = input.charCodeAt(i);
        if (ch === 0x5c /* backslash */) { i += 2; continue; }
        if (ch === quote) { i++; break; }
        if (ch === 0x0a || ch === 0x0d) { break; }
        i++;
      }
      tokens.push({ type: 'string', value: input.slice(start, i), start, end: i });
      continue;
    }
    if (isCssIdentStart(c) || c === 0x5c /* \\ */) {
      const start = i;
      while (i < len) {
        const c2 = input.charCodeAt(i);
        if (c2 === 0x5c /* \\ */) {
          i++;
          if (i < len && isHexDigit(input.charCodeAt(i))) {
            // Hex escape: up to 6 hex digits + one optional whitespace
            let n = 0;
            while (i < len && n < 6 && isHexDigit(input.charCodeAt(i))) { i++; n++; }
            if (i < len) {
              const w = input.charCodeAt(i);
              if (w === 0x20 || w === 0x09 || w === 0x0a || w === 0x0d) i++;
            }
          } else if (i < len) {
            // Single-char escape: any non-newline char
            i++;
          }
          continue;
        }
        if (!isCssIdentPart(c2)) break;
        i++;
      }
      // Raw url(...) tokenization: contents are opaque (no comment recognition,
      // no balanced brackets) until the matching ')'. Strings are tracked so
      // that a ')' inside a quoted url like url("./image (1).jpg") doesn't
      // close the url early.
      if (
        i - start === 3
        && i < len
        && input.charCodeAt(i) === 0x28 /* ( */
        && (input.charCodeAt(start) | 32) === 0x75 /* u */
        && (input.charCodeAt(start + 1) | 32) === 0x72 /* r */
        && (input.charCodeAt(start + 2) | 32) === 0x6c /* l */
      ) {
        i++; // consume (
        while (i < len) {
          const cu = input.charCodeAt(i);
          if (cu === 0x29 /* ) */) { i++; break; }
          if (cu === 0x5c /* \\ */ && i + 1 < len) { i += 2; continue; }
          if (cu === 0x22 /* " */ || cu === 0x27 /* ' */) {
            const q = cu;
            i++;
            while (i < len) {
              const ch = input.charCodeAt(i);
              if (ch === 0x5c /* \\ */ && i + 1 < len) { i += 2; continue; }
              if (ch === q) { i++; break; }
              if (ch === 0x0a || ch === 0x0d) break;
              i++;
            }
            continue;
          }
          i++;
        }
      }
      tokens.push({ type: 'ident', value: input.slice(start, i), start, end: i });
      continue;
    }

    throw new SyntaxError(`Unexpected character '${input[i]}' at position ${i}`);
  }
  return tokens;
}

type State = {
  readonly tokens: Token[];
  pos: number;
  readonly input: string;
  readonly lineStarts: number[];
  readonly mode: ParseMode;
  readonly hasComments: boolean;
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
// expect a comment (cls === 'comment') opt out via the call sites below,
// so standalone comment captures still work.
function skipComments(state: State): void {
  if (!state.hasComments) return;
  while (state.pos < state.tokens.length && state.tokens[state.pos].type === 'comment') {
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
  const m = /^\s*/.exec(inner);
  return m ? m[0] : '';
}

// Trailing whitespace inside a comment's interior. Returns '' when the
// interior is entirely whitespace (left already captured all of it).
function commentRight(raw: string): string {
  const inner = raw.slice(2, -2);
  if (inner.trim() === '') return '';
  const m = /\s*$/.exec(inner);
  return m ? m[0] : '';
}

function tokenValue(_state: State, tok: Token): string {
  return tok.value;
}

function expectLiteral(state: State, type: string, value: string): string {
  skipComments(state);
  const tok = state.tokens[state.pos];
  if (!tok || tok.type !== type || tok.value !== value) {
    throw new SyntaxError(`expected '${value}' at token ${state.pos}`);
  }
  state.pos++;
  return tok.value ?? value;
}

function consumeOptionalLiteral(state: State, type: string, value: string): string | null {
  const saved = state.pos;
  skipComments(state);
  const tok = state.tokens[state.pos];
  if (!tok || tok.type !== type || tok.value !== value) {
    state.pos = saved;
    return null;
  }
  state.pos++;
  return tok.value ?? value;
}

function expectClass(state: State, cls: string): string {
  if (cls !== 'comment') skipComments(state);
  const tok = state.tokens[state.pos];
  if (!tok || tok.type !== cls) {
    throw new SyntaxError(`expected token of class '${cls}' at token ${state.pos}`);
  }
  state.pos++;
  return tokenValue(state, tok);
}

function consumeOptionalClass(state: State, cls: string): string | null {
  const saved = state.pos;
  if (cls !== 'comment') skipComments(state);
  const tok = state.tokens[state.pos];
  if (!tok || tok.type !== cls) {
    state.pos = saved;
    return null;
  }
  state.pos++;
  return tokenValue(state, tok);
}

function requireNoWhitespaceAfterLastToken(state: State): void {
  const previous = state.tokens[state.pos - 1];
  const next = state.tokens[state.pos];
  if (previous === undefined || next === undefined || previous.end !== next.start) {
    throw new SyntaxError('expected no whitespace after token ' + (state.pos - 1));
  }
}

function peekLiteral(state: State, type: string, value: string): boolean {
  // Does NOT skip comments. Used by repeats-loop stop checks; if a trailing
  // comment sits between the last child and the body terminator, the loop
  // must do another iteration so parseComment can pick up the comment as a
  // sibling node rather than the loop exiting and leaving it stranded.
  const tok = state.tokens[state.pos];
  return tok !== undefined && tok.type === type && tok.value === value;
}

function peekLiteralAfterComments(state: State, type: string, value: string): boolean {
  if (!state.hasComments) return peekLiteral(state, type, value);
  let pos = state.pos;
  while (pos < state.tokens.length && state.tokens[pos].type === 'comment') pos++;
  const tok = state.tokens[pos];
  return tok !== undefined && tok.type === type && tok.value === value;
}

function nextNonCommentToken(state: State, pos: number): Token | undefined {
  if (!state.hasComments) return state.tokens[pos];
  while (pos < state.tokens.length && state.tokens[pos].type === 'comment') pos++;
  return state.tokens[pos];
}

function nthNonCommentToken(state: State, pos: number, index: number): Token | undefined {
  if (!state.hasComments) return state.tokens[pos + index];
  let seen = 0;
  while (pos < state.tokens.length) {
    const tok = state.tokens[pos++];
    if (tok.type === 'comment') continue;
    if (seen === index) return tok;
    seen++;
  }
  return undefined;
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
// token whose value matches any element of `stops`. When `balanced` is
// true, bracket pairs () [] {} nest. A closing bracket at depth zero means
// we've reached the boundary of an enclosing block — stop without consuming
// it. The returned string is the slice of original source covered by the
// consumed tokens (optionally trimmed).
function captureUntil(
  state: State,
  stop0: string,
  stop1: string | null,
  stop2: string | null,
  balanced: boolean,
  trim: boolean,
): string {
  let depth = 0;
  // Leading comments are absorbed (not part of capture). They typically
  // belong to raws on the previous sibling — when raws lands they should
  // be diverted, not silently dropped. Today the body loop's parseComment
  // pass catches free-floating comments before the capture starts, so this
  // really only fires when a comment immediately precedes a captured
  // sub-region (e.g. at-rule params with leading comments).
  while (state.pos < state.tokens.length && state.tokens[state.pos].type === 'comment') {
    state.pos++;
  }
  const firstIdx = state.pos;
  const startTok = state.tokens[firstIdx];
  if (!startTok) {
    state.__lastCaptureStart = state.input.length;
    state.__lastCaptureEnd = state.input.length;
    return '';
  }
  while (state.pos < state.tokens.length) {
    const t = state.tokens[state.pos];
    if (depth === 0 && (t.value === stop0 || t.value === stop1 || t.value === stop2)) break;
    if (balanced) {
      if (t.value === '(' || t.value === '[' || t.value === '{') depth++;
      else if (t.value === ')' || t.value === ']' || t.value === '}') {
        if (depth === 0) break;
        depth--;
      }
    }
    state.pos++;
  }
  // Rewind past trailing comments so they remain available for the next
  // sibling's parseComment to pick up (e.g. `decl /* trailing */` should
  // emit a separate Comment node).
  while (state.pos > firstIdx && state.tokens[state.pos - 1].type === 'comment') {
    state.pos--;
  }
  if (state.pos <= firstIdx) {
    // No tokens consumed — collapse the offset range to the previous
    // consumed token's end. This matches PostCSS convention: a gap from
    // (previous span) to (this empty capture) is '', and the whitespace
    // sits in the NEXT gap (e.g. `@font-face {` puts the space in
    // raws.between, not raws.afterName).
    const here = state.tokens[state.pos - 1]?.end ?? 0;
    state.__lastCaptureStart = here;
    state.__lastCaptureEnd = here;
    return '';
  }
  const startOff = state.tokens[firstIdx].start;
  const endOff = state.tokens[state.pos - 1].end;
  state.__lastCaptureStart = startOff;
  state.__lastCaptureEnd = endOff;

  // Fold interior comment tokens that have whitespace on either side in
  // the source. We omit the comment's source range; surrounding whitespace
  // stays untouched. Token-based — won't accidentally strip /* */ found
  // inside string tokens (where it isn't a real comment).
  if (!state.hasComments) {
    if (!trim) return state.input.slice(startOff, endOff);
    let valueStart = startOff;
    let valueEnd = endOff;
    while (valueStart < valueEnd && isAsciiWs(state.input.charCodeAt(valueStart))) valueStart++;
    while (valueEnd > valueStart && isAsciiWs(state.input.charCodeAt(valueEnd - 1))) valueEnd--;
    return state.input.slice(valueStart, valueEnd);
  }

  const omit: Array<[number, number]> = [];
  for (let i = firstIdx; i < state.pos; i++) {
    const t = state.tokens[i];
    if (t.type !== 'comment') continue;
    const before = t.start > 0 ? state.input.charCodeAt(t.start - 1) : -1;
    const after = t.end < state.input.length ? state.input.charCodeAt(t.end) : -1;
    if (isAsciiWs(before) || isAsciiWs(after)) omit.push([t.start, t.end]);
  }
  if (omit.length === 0) {
    if (!trim) return state.input.slice(startOff, endOff);
    let valueStart = startOff;
    let valueEnd = endOff;
    while (valueStart < valueEnd && isAsciiWs(state.input.charCodeAt(valueStart))) valueStart++;
    while (valueEnd > valueStart && isAsciiWs(state.input.charCodeAt(valueEnd - 1))) valueEnd--;
    return state.input.slice(valueStart, valueEnd);
  }
  let buf = '';
  let cursor = startOff;
  for (const [s, e] of omit) {
    buf += state.input.slice(cursor, s);
    cursor = e;
  }
  buf += state.input.slice(cursor, endOff);
  return trim ? buf.trim() : buf;
}

function scanTopLevelBoundary(
  state: State,
  stop0: string,
  stop1: string | null,
  stop2: string | null,
  watch0: string | null,
  watch1: string | null = null,
): { firstIdx: number; stopIdx: number; captureEndIdx: number; stop: string | null; watchIdx: number; watch1Idx: number } {
  let depth = 0;
  let pos = state.pos;
  while (pos < state.tokens.length && state.tokens[pos].type === 'comment') pos++;
  const firstIdx = pos;
  let watchIdx = -1;
  let watch1Idx = -1;
  while (pos < state.tokens.length) {
    const t = state.tokens[pos];
    if (depth === 0) {
      if (watchIdx < 0 && watch0 !== null && t.value === watch0) watchIdx = pos;
      if (watch1Idx < 0 && watch1 !== null && t.value === watch1) watch1Idx = pos;
      if (t.value === stop0 || t.value === stop1 || t.value === stop2) break;
    }
    if (t.value === '(' || t.value === '[' || t.value === '{') depth++;
    else if (t.value === ')' || t.value === ']' || t.value === '}') {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  let captureEndIdx = pos;
  while (captureEndIdx > firstIdx && state.tokens[captureEndIdx - 1].type === 'comment') captureEndIdx--;
  return {
    firstIdx,
    stopIdx: pos,
    captureEndIdx,
    stop: pos < state.tokens.length ? state.tokens[pos].value : null,
    watchIdx,
    watch1Idx,
  };
}

function captureTokenRange(state: State, firstIdx: number, endIdx: number, trim: boolean): string {
  if (firstIdx >= state.tokens.length || endIdx <= firstIdx) {
    const here = state.tokens[Math.max(0, firstIdx - 1)]?.end ?? 0;
    state.__lastCaptureStart = here;
    state.__lastCaptureEnd = here;
    return '';
  }
  const startOff = state.tokens[firstIdx].start;
  const endOff = state.tokens[endIdx - 1].end;
  state.__lastCaptureStart = startOff;
  state.__lastCaptureEnd = endOff;

  if (!state.hasComments) {
    if (!trim) return state.input.slice(startOff, endOff);
    let valueStart = startOff;
    let valueEnd = endOff;
    while (valueStart < valueEnd && isAsciiWs(state.input.charCodeAt(valueStart))) valueStart++;
    while (valueEnd > valueStart && isAsciiWs(state.input.charCodeAt(valueEnd - 1))) valueEnd--;
    return state.input.slice(valueStart, valueEnd);
  }

  const omit: Array<[number, number]> = [];
  for (let i = firstIdx; i < endIdx; i++) {
    const t = state.tokens[i];
    if (t.type !== 'comment') continue;
    const before = t.start > 0 ? state.input.charCodeAt(t.start - 1) : -1;
    const after = t.end < state.input.length ? state.input.charCodeAt(t.end) : -1;
    if (isAsciiWs(before) || isAsciiWs(after)) omit.push([t.start, t.end]);
  }
  if (omit.length === 0) {
    if (!trim) return state.input.slice(startOff, endOff);
    let valueStart = startOff;
    let valueEnd = endOff;
    while (valueStart < valueEnd && isAsciiWs(state.input.charCodeAt(valueStart))) valueStart++;
    while (valueEnd > valueStart && isAsciiWs(state.input.charCodeAt(valueEnd - 1))) valueEnd--;
    return state.input.slice(valueStart, valueEnd);
  }
  let buf = '';
  let cursor = startOff;
  for (const [s, e] of omit) {
    buf += state.input.slice(cursor, s);
    cursor = e;
  }
  buf += state.input.slice(cursor, endOff);
  return trim ? buf.trim() : buf;
}

// captureRawUntil scans raw source from the current token's start offset
// looking for the earliest occurrence of any literal in stops. Returns
// the source slice between current position and the matched stop. State
// advances to the first token whose start offset is at or past the stop.
// Used by .rawUntil() modifier for raw-text element bodies (script/style)
// and unquoted attribute values that can contain arbitrary characters.
//
// Performance notes (driven by the html package's huge-page profile):
//   - The common case is many small captures; we MUST avoid per-call work
//     that scales with the input size.
//   - Single-char stops: tight charcode loop. No allocation, no indexOf
//     scan-to-end on misses.
//   - Multi-char stops: native indexOf bounded by the running minimum so
//     later misses don't scan past an earlier hit.
//   - Case-insensitive: char-by-char ASCII case fold; do NOT lowercase
//     the input (that allocates an O(input.length) string per call).
function captureRawUntil(state: State, stops: readonly string[], caseInsensitive: boolean): string {
  const startOff = state.pos < state.tokens.length
    ? state.tokens[state.pos].start
    : state.input.length;
  const input = state.input;
  const inputLen = input.length;
  let earliest = inputLen;

  // Partition stops into single-char and multi-char. Both loops short-
  // circuit against `earliest` so we never scan past a found candidate.
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

  while (state.pos < state.tokens.length && state.tokens[state.pos].start < earliest) {
    state.pos++;
  }
  state.__lastCaptureStart = startOff;
  state.__lastCaptureEnd = earliest;
  return input.slice(startOff, earliest);
}

// Tight scan: find the first occurrence of `code` in input[from..limit).
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

function nextTopLevelStop(state: State, stop0: string, stop1: string | null, stop2: string | null): string | null {
  let depth = 0;
  let pos = state.pos;
  while (pos < state.tokens.length && state.tokens[pos].type === 'comment') pos++;
  while (pos < state.tokens.length) {
    const t = state.tokens[pos];
    if (depth === 0 && (t.value === stop0 || t.value === stop1 || t.value === stop2)) return t.value;
    if (t.value === '(' || t.value === '[' || t.value === '{') depth++;
    else if (t.value === ')' || t.value === ']' || t.value === '}') {
      if (depth === 0) return t.value;
      depth--;
    }
    pos++;
  }
  return null;
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
  if (prevEnd === 0 && /^\s*$/.test(slice)) {
    node.raws.before = '';
  } else {
    node.raws.before = slice;
  }
}

function decorateSyntaxError(input: string, error: unknown, tokens?: readonly Token[], tokenPos?: number): never {
  if (!(error instanceof SyntaxError)) throw error;
  if (hasSourceFrame(error.message)) throw error;
  const messageOffset = offsetFromMessage(error.message, -1);
  const offset = messageOffset >= 0
    ? messageOffset
    : tokenPos !== undefined
    ? tokenOffset(tokens ?? [], tokenPos, input.length)
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
  return new SyntaxError(`${cleanMessage} at position ${offset}
${gutter} | ${source}
${' '.repeat(gutter.length)} | ${' '.repeat(column)}^`);
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
  return message.includes('\n') && message.includes(' | ');
}

function tokenOffset(tokens: readonly Token[], pos: number, fallback: number): number {
  const tok = tokens[pos] ?? tokens[tokens.length - 1];
  if (!tok) return fallback;
  return tokens[pos] ? tok.start : tok.end;
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
}

function parseColorKeyword(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = expectClass(state, "ident");
  if (!(value.toLowerCase() === "aliceblue" || value.toLowerCase() === "black" || value.toLowerCase() === "blue" || value.toLowerCase() === "currentcolor" || value.toLowerCase() === "green" || value.toLowerCase() === "inherit" || value.toLowerCase() === "initial" || value.toLowerCase() === "red" || value.toLowerCase() === "revert" || value.toLowerCase() === "revert-layer" || value.toLowerCase() === "transparent" || value.toLowerCase() === "unset" || value.toLowerCase() === "white" || value.toLowerCase() === "yellow")) throw new SyntaxError("expected one of aliceblue, black, blue, currentcolor, green, inherit, initial, red, revert, revert-layer, transparent, unset, white, yellow at position " + state.tokens[state.pos - 1].start);
  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "color-keyword", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHashColor(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "hash", "#");
  requireNoWhitespaceAfterLastToken(state);
  const value = captureUntil(state, ")", ",", "/", true, true);
  if (!isHexString(value)) throw new SyntaxError("expected hex string at position " + state.__lastCaptureStart);
  if (!(value.length === 3 || value.length === 4 || value.length === 6 || value.length === 8)) throw new SyntaxError("expected length 3, 4, 6, 8 at position " + state.__lastCaptureStart);
  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "hash-color", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseRgbColorFunction(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "rgb" || name.toLowerCase() === "rgba")) throw new SyntaxError("expected one of rgb, rgba at position " + state.tokens[state.pos - 1].start);
  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "lparen", "(");
  const __args_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_args = __args_startOff;
  const args: unknown[] = [];
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    const __child = parseNumericColorFunctionToken(state);
    attachRawsBefore(state, __child, __prevEnd_args);
    args.push(__child);
    if (state.pos === __before) break;
    __prevEnd_args = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_args;
  }
  if (args.length < 1) throw new SyntaxError("expected at least 1 NumericColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "color-function", name: name };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunction__alt0(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "color" || name.toLowerCase() === "color-mix" || name.toLowerCase() === "hsl" || name.toLowerCase() === "hsla" || name.toLowerCase() === "hwb" || name.toLowerCase() === "lab" || name.toLowerCase() === "lch" || name.toLowerCase() === "light-dark" || name.toLowerCase() === "oklab" || name.toLowerCase() === "oklch")) throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + state.tokens[state.pos - 1].start);
  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "lparen", "(");
  const __args_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_args = __args_startOff;
  const args: unknown[] = [];
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    const __child = parseColorFunctionToken(state);
    attachRawsBefore(state, __child, __prevEnd_args);
    args.push(__child);
    if (state.pos === __before) break;
    __prevEnd_args = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_args;
  }
  if (args.length < 1) throw new SyntaxError("expected at least 1 ColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "color-function", name: name };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunction__alt1(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "color" || name.toLowerCase() === "color-mix" || name.toLowerCase() === "hsl" || name.toLowerCase() === "hsla" || name.toLowerCase() === "hwb" || name.toLowerCase() === "lab" || name.toLowerCase() === "lch" || name.toLowerCase() === "light-dark" || name.toLowerCase() === "oklab" || name.toLowerCase() === "oklch")) throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + state.tokens[state.pos - 1].start);
  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "lparen", "(");
  const __args_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_args = __args_startOff;
  const args: unknown[] = [];
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    const __child = parseColorFunctionToken(state);
    attachRawsBefore(state, __child, __prevEnd_args);
    args.push(__child);
    if (state.pos === __before) break;
    __prevEnd_args = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_args;
  }
  if (args.length < 1) throw new SyntaxError("expected at least 1 ColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "color-function", name: name };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunction(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lparen" && __tok1.value === "(") {
      { const r = trySpeculate(state, parseColorFunction__alt0); if (r !== null) return r; }
      return parseColorFunction__alt1(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function parseNumericColorFunctionToken__alt0(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = expectClass(state, "number");

  requireNoWhitespaceAfterLastToken(state);
  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "delim", "%");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "percentage", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseNumericColorFunctionToken__alt1(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = expectClass(state, "number");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "number", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseNumericColorFunctionToken__alt2(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "delim", "/");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "separator", value: "/" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseNumericColorFunctionToken__alt3(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "delim", ",");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "separator", value: "," };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseNumericColorFunctionToken(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "delim" && __tok.value === "/") {
    return parseNumericColorFunctionToken__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === ",") {
    return parseNumericColorFunctionToken__alt3(state);
  }
  else if (__tok !== undefined && __tok.type === "number") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "delim" && __tok1.value === "%") {
      return parseNumericColorFunctionToken__alt0(state);
    }
    return parseNumericColorFunctionToken__alt1(state);
  }
  throw new SyntaxError('no production matched');
}

function parseColorFunctionToken__alt0(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = expectClass(state, "number");

  requireNoWhitespaceAfterLastToken(state);
  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "delim", "%");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "percentage", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunctionToken__alt1(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = expectClass(state, "number");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "number", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunctionToken__alt2(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = expectClass(state, "ident");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "ident", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunctionToken__alt3(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = expectClass(state, "string");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "string", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunctionToken__alt4(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "delim", "/");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "separator", value: "/" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunctionToken__alt5(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "delim", ",");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "separator", value: "," };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorFunctionToken(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "delim" && __tok.value === "/") {
    return parseColorFunctionToken__alt4(state);
  }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === ",") {
    return parseColorFunctionToken__alt5(state);
  }
  else if (__tok !== undefined && __tok.type === "number") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "delim" && __tok1.value === "%") {
      return parseColorFunctionToken__alt0(state);
    }
    return parseColorFunctionToken__alt1(state);
  }
  else if (__tok !== undefined && __tok.type === "ident") {
    return parseColorFunctionToken__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "string") {
    return parseColorFunctionToken__alt3(state);
  }
  throw new SyntaxError('no production matched');
}

function parseVarFunction(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "var")) throw new SyntaxError("expected one of var at position " + state.tokens[state.pos - 1].start);
  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "lparen", "(");
  const __captured = captureUntil(state, ")", null, null, true, true);
  if (__captured.endsWith(",")) throw new SyntaxError("captured value ends with rejected suffix ','");
  const args = __captured;

  const __args_start = state.__lastCaptureStart;
  const __args_end = state.__lastCaptureEnd;
  expectLiteral(state, "rparen", ")");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "var-function", name: name, args: args };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseCssColor(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = (() => {
    const __tok = state.tokens[state.pos];
    if (__tok !== undefined && __tok.type === "hash" && __tok.value === "#") return parseHashColor(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "aliceblue" || __tok.value.toLowerCase() === "black" || __tok.value.toLowerCase() === "blue" || __tok.value.toLowerCase() === "currentcolor" || __tok.value.toLowerCase() === "green" || __tok.value.toLowerCase() === "inherit" || __tok.value.toLowerCase() === "initial" || __tok.value.toLowerCase() === "red" || __tok.value.toLowerCase() === "revert" || __tok.value.toLowerCase() === "revert-layer" || __tok.value.toLowerCase() === "transparent" || __tok.value.toLowerCase() === "unset" || __tok.value.toLowerCase() === "white" || __tok.value.toLowerCase() === "yellow")) return parseColorKeyword(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "rgb" || __tok.value.toLowerCase() === "rgba")) return parseRgbColorFunction(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "color" || __tok.value.toLowerCase() === "color-mix" || __tok.value.toLowerCase() === "hsl" || __tok.value.toLowerCase() === "hsla" || __tok.value.toLowerCase() === "hwb" || __tok.value.toLowerCase() === "lab" || __tok.value.toLowerCase() === "lch" || __tok.value.toLowerCase() === "light-dark" || __tok.value.toLowerCase() === "oklab" || __tok.value.toLowerCase() === "oklch")) return parseColorFunction(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "var")) return parseVarFunction(state);
    return tryRoles(state, []);
  })();
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "css-color", value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseColorKeywordFast(state: State): unknown {
  const value = expectClass(state, "ident");
  if (!(value.toLowerCase() === "aliceblue" || value.toLowerCase() === "black" || value.toLowerCase() === "blue" || value.toLowerCase() === "currentcolor" || value.toLowerCase() === "green" || value.toLowerCase() === "inherit" || value.toLowerCase() === "initial" || value.toLowerCase() === "red" || value.toLowerCase() === "revert" || value.toLowerCase() === "revert-layer" || value.toLowerCase() === "transparent" || value.toLowerCase() === "unset" || value.toLowerCase() === "white" || value.toLowerCase() === "yellow")) throw new SyntaxError("expected one of aliceblue, black, blue, currentcolor, green, inherit, initial, red, revert, revert-layer, transparent, unset, white, yellow at position " + state.tokens[state.pos - 1].start);
  return { type: "color-keyword", value: value };
}

function parseHashColorFast(state: State): unknown {
  expectLiteral(state, "hash", "#");
  requireNoWhitespaceAfterLastToken(state);
  const value = captureUntil(state, ")", ",", "/", true, true);
  if (!isHexString(value)) throw new SyntaxError("expected hex string at position " + state.__lastCaptureStart);
  if (!(value.length === 3 || value.length === 4 || value.length === 6 || value.length === 8)) throw new SyntaxError("expected length 3, 4, 6, 8 at position " + state.__lastCaptureStart);
  return { type: "hash-color", value: value };
}

function parseRgbColorFunctionFast(state: State): unknown {
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "rgb" || name.toLowerCase() === "rgba")) throw new SyntaxError("expected one of rgb, rgba at position " + state.tokens[state.pos - 1].start);
  expectLiteral(state, "lparen", "(");

  const args: unknown[] = [];
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    const __child = parseNumericColorFunctionTokenFast(state);
    args.push(__child);
    if (state.pos === __before) break;
  }
  if (args.length < 1) throw new SyntaxError("expected at least 1 NumericColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  return { type: "color-function", name: name };
}

function parseColorFunctionFast__alt0(state: State): unknown {
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "color" || name.toLowerCase() === "color-mix" || name.toLowerCase() === "hsl" || name.toLowerCase() === "hsla" || name.toLowerCase() === "hwb" || name.toLowerCase() === "lab" || name.toLowerCase() === "lch" || name.toLowerCase() === "light-dark" || name.toLowerCase() === "oklab" || name.toLowerCase() === "oklch")) throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + state.tokens[state.pos - 1].start);
  expectLiteral(state, "lparen", "(");

  const args: unknown[] = [];
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    const __child = parseColorFunctionTokenFast(state);
    args.push(__child);
    if (state.pos === __before) break;
  }
  if (args.length < 1) throw new SyntaxError("expected at least 1 ColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  return { type: "color-function", name: name };
}

function parseColorFunctionFast__alt1(state: State): unknown {
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "color" || name.toLowerCase() === "color-mix" || name.toLowerCase() === "hsl" || name.toLowerCase() === "hsla" || name.toLowerCase() === "hwb" || name.toLowerCase() === "lab" || name.toLowerCase() === "lch" || name.toLowerCase() === "light-dark" || name.toLowerCase() === "oklab" || name.toLowerCase() === "oklch")) throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + state.tokens[state.pos - 1].start);
  expectLiteral(state, "lparen", "(");

  const args: unknown[] = [];
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    const __child = parseColorFunctionTokenFast(state);
    args.push(__child);
    if (state.pos === __before) break;
  }
  if (args.length < 1) throw new SyntaxError("expected at least 1 ColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  return { type: "color-function", name: name };
}

function parseColorFunctionFast(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lparen" && __tok1.value === "(") {
      { const r = trySpeculate(state, parseColorFunctionFast__alt0); if (r !== null) return r; }
      return parseColorFunctionFast__alt1(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function parseNumericColorFunctionTokenFast__alt0(state: State): unknown {
  const value = expectClass(state, "number");

  requireNoWhitespaceAfterLastToken(state);
  expectLiteral(state, "delim", "%");
  return { type: "percentage", value: value };
}

function parseNumericColorFunctionTokenFast__alt1(state: State): unknown {
  const value = expectClass(state, "number");

  return { type: "number", value: value };
}

function parseNumericColorFunctionTokenFast__alt2(state: State): unknown {
  expectLiteral(state, "delim", "/");
  return { type: "separator", value: "/" };
}

function parseNumericColorFunctionTokenFast__alt3(state: State): unknown {
  expectLiteral(state, "delim", ",");
  return { type: "separator", value: "," };
}

function parseNumericColorFunctionTokenFast(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "delim" && __tok.value === "/") {
    return parseNumericColorFunctionTokenFast__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === ",") {
    return parseNumericColorFunctionTokenFast__alt3(state);
  }
  else if (__tok !== undefined && __tok.type === "number") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "delim" && __tok1.value === "%") {
      return parseNumericColorFunctionTokenFast__alt0(state);
    }
    return parseNumericColorFunctionTokenFast__alt1(state);
  }
  throw new SyntaxError('no production matched');
}

function parseColorFunctionTokenFast__alt0(state: State): unknown {
  const value = expectClass(state, "number");

  requireNoWhitespaceAfterLastToken(state);
  expectLiteral(state, "delim", "%");
  return { type: "percentage", value: value };
}

function parseColorFunctionTokenFast__alt1(state: State): unknown {
  const value = expectClass(state, "number");

  return { type: "number", value: value };
}

function parseColorFunctionTokenFast__alt2(state: State): unknown {
  const value = expectClass(state, "ident");

  return { type: "ident", value: value };
}

function parseColorFunctionTokenFast__alt3(state: State): unknown {
  const value = expectClass(state, "string");

  return { type: "string", value: value };
}

function parseColorFunctionTokenFast__alt4(state: State): unknown {
  expectLiteral(state, "delim", "/");
  return { type: "separator", value: "/" };
}

function parseColorFunctionTokenFast__alt5(state: State): unknown {
  expectLiteral(state, "delim", ",");
  return { type: "separator", value: "," };
}

function parseColorFunctionTokenFast(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "delim" && __tok.value === "/") {
    return parseColorFunctionTokenFast__alt4(state);
  }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === ",") {
    return parseColorFunctionTokenFast__alt5(state);
  }
  else if (__tok !== undefined && __tok.type === "number") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "delim" && __tok1.value === "%") {
      return parseColorFunctionTokenFast__alt0(state);
    }
    return parseColorFunctionTokenFast__alt1(state);
  }
  else if (__tok !== undefined && __tok.type === "ident") {
    return parseColorFunctionTokenFast__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "string") {
    return parseColorFunctionTokenFast__alt3(state);
  }
  throw new SyntaxError('no production matched');
}

function parseVarFunctionFast(state: State): unknown {
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "var")) throw new SyntaxError("expected one of var at position " + state.tokens[state.pos - 1].start);
  expectLiteral(state, "lparen", "(");
  const __captured = captureUntil(state, ")", null, null, true, true);
  if (__captured.endsWith(",")) throw new SyntaxError("captured value ends with rejected suffix ','");
  const args = __captured;


  expectLiteral(state, "rparen", ")");
  return { type: "var-function", name: name, args: args };
}

function parseCssColorFast(state: State): unknown {
  const value = (() => {
    const __tok = state.tokens[state.pos];
    if (__tok !== undefined && __tok.type === "hash" && __tok.value === "#") return parseHashColorFast(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "aliceblue" || __tok.value.toLowerCase() === "black" || __tok.value.toLowerCase() === "blue" || __tok.value.toLowerCase() === "currentcolor" || __tok.value.toLowerCase() === "green" || __tok.value.toLowerCase() === "inherit" || __tok.value.toLowerCase() === "initial" || __tok.value.toLowerCase() === "red" || __tok.value.toLowerCase() === "revert" || __tok.value.toLowerCase() === "revert-layer" || __tok.value.toLowerCase() === "transparent" || __tok.value.toLowerCase() === "unset" || __tok.value.toLowerCase() === "white" || __tok.value.toLowerCase() === "yellow")) return parseColorKeywordFast(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "rgb" || __tok.value.toLowerCase() === "rgba")) return parseRgbColorFunctionFast(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "color" || __tok.value.toLowerCase() === "color-mix" || __tok.value.toLowerCase() === "hsl" || __tok.value.toLowerCase() === "hsla" || __tok.value.toLowerCase() === "hwb" || __tok.value.toLowerCase() === "lab" || __tok.value.toLowerCase() === "lch" || __tok.value.toLowerCase() === "light-dark" || __tok.value.toLowerCase() === "oklab" || __tok.value.toLowerCase() === "oklch")) return parseColorFunctionFast(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "var")) return parseVarFunctionFast(state);
    return tryRoles(state, []);
  })();
  return { type: "css-color", value: value };
}

function validateColorKeyword(state: State): unknown {
  const value = expectClass(state, "ident");
  if (!(value.toLowerCase() === "aliceblue" || value.toLowerCase() === "black" || value.toLowerCase() === "blue" || value.toLowerCase() === "currentcolor" || value.toLowerCase() === "green" || value.toLowerCase() === "inherit" || value.toLowerCase() === "initial" || value.toLowerCase() === "red" || value.toLowerCase() === "revert" || value.toLowerCase() === "revert-layer" || value.toLowerCase() === "transparent" || value.toLowerCase() === "unset" || value.toLowerCase() === "white" || value.toLowerCase() === "yellow")) throw new SyntaxError("expected one of aliceblue, black, blue, currentcolor, green, inherit, initial, red, revert, revert-layer, transparent, unset, white, yellow at position " + state.tokens[state.pos - 1].start);
  return;
}

function validateHashColor(state: State): unknown {
  expectLiteral(state, "hash", "#");
  requireNoWhitespaceAfterLastToken(state);
  const value = captureUntil(state, ")", ",", "/", true, true);
  if (!isHexString(value)) throw new SyntaxError("expected hex string at position " + state.__lastCaptureStart);
  if (!(value.length === 3 || value.length === 4 || value.length === 6 || value.length === 8)) throw new SyntaxError("expected length 3, 4, 6, 8 at position " + state.__lastCaptureStart);
  return;
}

function validateRgbColorFunction(state: State): unknown {
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "rgb" || name.toLowerCase() === "rgba")) throw new SyntaxError("expected one of rgb, rgba at position " + state.tokens[state.pos - 1].start);
  expectLiteral(state, "lparen", "(");
  let __count_args = 0;
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    validateNumericColorFunctionToken(state);
    __count_args++;
    if (state.pos === __before) break;
  }
  if (__count_args < 1) throw new SyntaxError("expected at least 1 NumericColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  return;
}

function validateColorFunction__alt0(state: State): unknown {
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "color" || name.toLowerCase() === "color-mix" || name.toLowerCase() === "hsl" || name.toLowerCase() === "hsla" || name.toLowerCase() === "hwb" || name.toLowerCase() === "lab" || name.toLowerCase() === "lch" || name.toLowerCase() === "light-dark" || name.toLowerCase() === "oklab" || name.toLowerCase() === "oklch")) throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + state.tokens[state.pos - 1].start);
  expectLiteral(state, "lparen", "(");
  let __count_args = 0;
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    validateColorFunctionToken(state);
    __count_args++;
    if (state.pos === __before) break;
  }
  if (__count_args < 1) throw new SyntaxError("expected at least 1 ColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  return;
}

function validateColorFunction__alt1(state: State): unknown {
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "color" || name.toLowerCase() === "color-mix" || name.toLowerCase() === "hsl" || name.toLowerCase() === "hsla" || name.toLowerCase() === "hwb" || name.toLowerCase() === "lab" || name.toLowerCase() === "lch" || name.toLowerCase() === "light-dark" || name.toLowerCase() === "oklab" || name.toLowerCase() === "oklch")) throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + state.tokens[state.pos - 1].start);
  expectLiteral(state, "lparen", "(");
  let __count_args = 0;
  while (!(peekLiteral(state, "rparen", ")"))) {
    const __before = state.pos;
    validateColorFunctionToken(state);
    __count_args++;
    if (state.pos === __before) break;
  }
  if (__count_args < 1) throw new SyntaxError("expected at least 1 ColorFunctionToken");
  expectLiteral(state, "rparen", ")");
  return;
}

function validateColorFunction(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lparen" && __tok1.value === "(") {
      { const r = trySpeculate(state, validateColorFunction__alt0); if (r !== null) return r; }
      return validateColorFunction__alt1(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function validateNumericColorFunctionToken__alt0(state: State): unknown {
  const value = expectClass(state, "number");

  requireNoWhitespaceAfterLastToken(state);
  expectLiteral(state, "delim", "%");
  return;
}

function validateNumericColorFunctionToken__alt1(state: State): unknown {
  const value = expectClass(state, "number");

  return;
}

function validateNumericColorFunctionToken__alt2(state: State): unknown {
  expectLiteral(state, "delim", "/");
  return;
}

function validateNumericColorFunctionToken__alt3(state: State): unknown {
  expectLiteral(state, "delim", ",");
  return;
}

function validateNumericColorFunctionToken(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "delim" && __tok.value === "/") {
    return validateNumericColorFunctionToken__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === ",") {
    return validateNumericColorFunctionToken__alt3(state);
  }
  else if (__tok !== undefined && __tok.type === "number") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "delim" && __tok1.value === "%") {
      return validateNumericColorFunctionToken__alt0(state);
    }
    return validateNumericColorFunctionToken__alt1(state);
  }
  throw new SyntaxError('no production matched');
}

function validateColorFunctionToken__alt0(state: State): unknown {
  const value = expectClass(state, "number");

  requireNoWhitespaceAfterLastToken(state);
  expectLiteral(state, "delim", "%");
  return;
}

function validateColorFunctionToken__alt1(state: State): unknown {
  const value = expectClass(state, "number");

  return;
}

function validateColorFunctionToken__alt2(state: State): unknown {
  const value = expectClass(state, "ident");

  return;
}

function validateColorFunctionToken__alt3(state: State): unknown {
  const value = expectClass(state, "string");

  return;
}

function validateColorFunctionToken__alt4(state: State): unknown {
  expectLiteral(state, "delim", "/");
  return;
}

function validateColorFunctionToken__alt5(state: State): unknown {
  expectLiteral(state, "delim", ",");
  return;
}

function validateColorFunctionToken(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "delim" && __tok.value === "/") {
    return validateColorFunctionToken__alt4(state);
  }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === ",") {
    return validateColorFunctionToken__alt5(state);
  }
  else if (__tok !== undefined && __tok.type === "number") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "delim" && __tok1.value === "%") {
      return validateColorFunctionToken__alt0(state);
    }
    return validateColorFunctionToken__alt1(state);
  }
  else if (__tok !== undefined && __tok.type === "ident") {
    return validateColorFunctionToken__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "string") {
    return validateColorFunctionToken__alt3(state);
  }
  throw new SyntaxError('no production matched');
}

function validateVarFunction(state: State): unknown {
  const name = expectClass(state, "ident");
  if (!(name.toLowerCase() === "var")) throw new SyntaxError("expected one of var at position " + state.tokens[state.pos - 1].start);
  expectLiteral(state, "lparen", "(");
  const __captured = captureUntil(state, ")", null, null, true, true);
  if (__captured.endsWith(",")) throw new SyntaxError("captured value ends with rejected suffix ','");
  const args = __captured;


  expectLiteral(state, "rparen", ")");
  return;
}

function validateCssColor(state: State): unknown {
  (() => {
    const __tok = state.tokens[state.pos];
    if (__tok !== undefined && __tok.type === "hash" && __tok.value === "#") return validateHashColor(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "aliceblue" || __tok.value.toLowerCase() === "black" || __tok.value.toLowerCase() === "blue" || __tok.value.toLowerCase() === "currentcolor" || __tok.value.toLowerCase() === "green" || __tok.value.toLowerCase() === "inherit" || __tok.value.toLowerCase() === "initial" || __tok.value.toLowerCase() === "red" || __tok.value.toLowerCase() === "revert" || __tok.value.toLowerCase() === "revert-layer" || __tok.value.toLowerCase() === "transparent" || __tok.value.toLowerCase() === "unset" || __tok.value.toLowerCase() === "white" || __tok.value.toLowerCase() === "yellow")) return validateColorKeyword(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "rgb" || __tok.value.toLowerCase() === "rgba")) return validateRgbColorFunction(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "color" || __tok.value.toLowerCase() === "color-mix" || __tok.value.toLowerCase() === "hsl" || __tok.value.toLowerCase() === "hsla" || __tok.value.toLowerCase() === "hwb" || __tok.value.toLowerCase() === "lab" || __tok.value.toLowerCase() === "lch" || __tok.value.toLowerCase() === "light-dark" || __tok.value.toLowerCase() === "oklab" || __tok.value.toLowerCase() === "oklch")) return validateColorFunction(state);
    if (__tok !== undefined && __tok.type === "ident" && (__tok.value.toLowerCase() === "var")) return validateVarFunction(state);
    return tryRoles(state, []);
  })();
  return;
}

export function parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
  let tokens: Token[];
  try {
    tokens = tokenize(input);
  } catch (error) {
    throw decorateSyntaxError(input, error);
  }
  const lineStarts = mode === 'raws' ? computeLineStarts(input) : [];
  const hasComments = tokens.hasComments === true;
  const state: State = {
    tokens,
    pos: 0,
    input,
    lineStarts,
    mode,
    hasComments,
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    const result = mode === 'raws' ? parseCssColor(state) : parseCssColorFast(state);
    if (state.pos !== state.tokens.length) {
      throw syntaxErrorWithFrame(input, `unexpected trailing token at position ${state.pos}`, tokenOffset(tokens, state.pos, input.length));
    }
    return result;
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, tokens, state.pos);
    }
    throw error;
  }
}

export function validate(input: string, options?: ParseOptions): void {
  if (options?.validate === true && false) {
    parse(input, options);
    return;
  }
  let tokens: Token[];
  try {
    tokens = tokenize(input);
  } catch (error) {
    throw decorateSyntaxError(input, error);
  }
  const state: State = {
    tokens,
    pos: 0,
    input,
    lineStarts: [],
    mode: 'fast',
    hasComments: tokens.hasComments === true,
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    validateCssColor(state);
    if (state.pos !== state.tokens.length) {
      throw syntaxErrorWithFrame(input, `unexpected trailing token at position ${state.pos}`, tokenOffset(tokens, state.pos, input.length));
    }
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, tokens, state.pos);
    }
    throw error;
  }
}

// Attach package identity so another package's validation metadata can refer
// to this generated validator while codegen still emits static imports.
(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/css-color",
  exportName: 'validate',
};

export function countTokens(input: string): number {
  return tokenize(input).length;
}


export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}
