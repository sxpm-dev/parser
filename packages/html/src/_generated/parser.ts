// Auto-generated from packages/html/src/schema.ts
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
    if (input.startsWith("<!--", i)) { tokens.push({ type: "commentOpen", value: "<!--", start: i, end: i + 4 }); i += 4; continue; }
    if (input.startsWith("-->", i)) { tokens.push({ type: "commentClose", value: "-->", start: i, end: i + 3 }); i += 3; continue; }
    if (input.startsWith("/>", i)) { tokens.push({ type: "selfClose", value: "/>", start: i, end: i + 2 }); i += 2; continue; }
    if (input.startsWith("<!", i)) { tokens.push({ type: "doctypeOpen", value: "<!", start: i, end: i + 2 }); i += 2; continue; }
    if (input.startsWith("</", i)) { tokens.push({ type: "closeTagOpen", value: "</", start: i, end: i + 2 }); i += 2; continue; }

    switch (c) {
      case 33: tokens.push({ type: "delim", value: "!", start: i, end: i + 1 }); i++; continue;
      case 34: tokens.push({ type: "dq", value: "\"", start: i, end: i + 1 }); i++; continue;
      case 35: tokens.push({ type: "delim", value: "#", start: i, end: i + 1 }); i++; continue;
      case 36: tokens.push({ type: "delim", value: "$", start: i, end: i + 1 }); i++; continue;
      case 37: tokens.push({ type: "delim", value: "%", start: i, end: i + 1 }); i++; continue;
      case 38: tokens.push({ type: "delim", value: "&", start: i, end: i + 1 }); i++; continue;
      case 39: tokens.push({ type: "sq", value: "'", start: i, end: i + 1 }); i++; continue;
      case 40: tokens.push({ type: "delim", value: "(", start: i, end: i + 1 }); i++; continue;
      case 41: tokens.push({ type: "delim", value: ")", start: i, end: i + 1 }); i++; continue;
      case 42: tokens.push({ type: "delim", value: "*", start: i, end: i + 1 }); i++; continue;
      case 43: tokens.push({ type: "delim", value: "+", start: i, end: i + 1 }); i++; continue;
      case 44: tokens.push({ type: "delim", value: ",", start: i, end: i + 1 }); i++; continue;
      case 46: tokens.push({ type: "delim", value: ".", start: i, end: i + 1 }); i++; continue;
      case 47: tokens.push({ type: "delim", value: "/", start: i, end: i + 1 }); i++; continue;
      case 58: tokens.push({ type: "delim", value: ":", start: i, end: i + 1 }); i++; continue;
      case 59: tokens.push({ type: "delim", value: ";", start: i, end: i + 1 }); i++; continue;
      case 60: tokens.push({ type: "lt", value: "<", start: i, end: i + 1 }); i++; continue;
      case 61: tokens.push({ type: "equals", value: "=", start: i, end: i + 1 }); i++; continue;
      case 62: tokens.push({ type: "gt", value: ">", start: i, end: i + 1 }); i++; continue;
      case 63: tokens.push({ type: "delim", value: "?", start: i, end: i + 1 }); i++; continue;
      case 64: tokens.push({ type: "delim", value: "@", start: i, end: i + 1 }); i++; continue;
      case 91: tokens.push({ type: "delim", value: "[", start: i, end: i + 1 }); i++; continue;
      case 93: tokens.push({ type: "delim", value: "]", start: i, end: i + 1 }); i++; continue;
      case 94: tokens.push({ type: "delim", value: "^", start: i, end: i + 1 }); i++; continue;
      case 96: tokens.push({ type: "delim", value: "`", start: i, end: i + 1 }); i++; continue;
      case 123: tokens.push({ type: "delim", value: "{", start: i, end: i + 1 }); i++; continue;
      case 124: tokens.push({ type: "delim", value: "|", start: i, end: i + 1 }); i++; continue;
      case 125: tokens.push({ type: "delim", value: "}", start: i, end: i + 1 }); i++; continue;
      case 126: tokens.push({ type: "delim", value: "~", start: i, end: i + 1 }); i++; continue;
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

function parseHtmlDocument(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const __children_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(state.pos >= state.tokens.length)) {
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "doctypeOpen" && __tok.value === "<!") { __child = parseDoctype(state); }
  else if (__tok !== undefined && __tok.type === "commentOpen" && __tok.value === "<!--") { __child = parseComment(state); }
  else if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") { __child = parseHtmlElement(state); }
  else {
    __child = tryRoles(state, [parseTextNode]);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#document", mode: "no-quirks", childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseDoctype(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "doctypeOpen", "<!");
  const keyword = expectClass(state, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.tokens[state.pos - 1].start);
  const __keyword_start = state.tokens[state.pos - 1].start;
  const __keyword_end = state.tokens[state.pos - 1].end;
  const name = expectClass(state, "ident");

  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "gt", ">");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#documentType", name: name, publicId: "", systemId: "", parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseComment(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "commentOpen", "<!--");
  const data = captureUntil(state, "-->", null, null, true, false);

  const __data_start = state.__lastCaptureStart;
  const __data_end = state.__lastCaptureEnd;
  expectLiteral(state, "commentClose", "-->");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#comment", data: data, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__alt0(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");
  if (!(tag.toLowerCase() === "area" || tag.toLowerCase() === "base" || tag.toLowerCase() === "br" || tag.toLowerCase() === "col" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "img" || tag.toLowerCase() === "input" || tag.toLowerCase() === "link" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "param" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "wbr")) throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + state.tokens[state.pos - 1].start);
  const __tag_start = state.tokens[state.pos - 1].start;
  const __tag_end = state.tokens[state.pos - 1].end;
  const __attrs_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteral(state, "gt", ">"))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteral(state, "gt", ">");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__alt1(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");
  if (!(tag.toLowerCase() === "area" || tag.toLowerCase() === "base" || tag.toLowerCase() === "br" || tag.toLowerCase() === "col" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "img" || tag.toLowerCase() === "input" || tag.toLowerCase() === "link" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "param" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "wbr")) throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + state.tokens[state.pos - 1].start);
  const __tag_start = state.tokens[state.pos - 1].start;
  const __tag_end = state.tokens[state.pos - 1].end;
  const __attrs_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteral(state, "selfClose", "/>"))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteral(state, "selfClose", "/>");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__alt2(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");

  const __tag_start = state.tokens[state.pos - 1].start;
  const __tag_end = state.tokens[state.pos - 1].end;
  const __attrs_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteral(state, "gt", ">"))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteral(state, "gt", ">");
  const __children_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteral(state, "closeTagOpen", "</"))) {
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "doctypeOpen" && __tok.value === "<!") { __child = parseDoctype(state); }
  else if (__tok !== undefined && __tok.type === "commentOpen" && __tok.value === "<!--") { __child = parseComment(state); }
  else if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") { __child = parseHtmlElement(state); }
  else {
    __child = tryRoles(state, [parseTextNode]);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  expectLiteral(state, "closeTagOpen", "</");
  const closeTag = expectClass(state, "ident");

  const __closeTag_start = state.tokens[state.pos - 1].start;
  const __closeTag_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "gt", ">");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident" && (__tok1.value.toLowerCase() === "area" || __tok1.value.toLowerCase() === "base" || __tok1.value.toLowerCase() === "br" || __tok1.value.toLowerCase() === "col" || __tok1.value.toLowerCase() === "embed" || __tok1.value.toLowerCase() === "hr" || __tok1.value.toLowerCase() === "img" || __tok1.value.toLowerCase() === "input" || __tok1.value.toLowerCase() === "link" || __tok1.value.toLowerCase() === "meta" || __tok1.value.toLowerCase() === "param" || __tok1.value.toLowerCase() === "source" || __tok1.value.toLowerCase() === "track" || __tok1.value.toLowerCase() === "wbr")) {
      { const r = trySpeculate(state, parseHtmlElement__alt0); if (r !== null) return r; }
      return parseHtmlElement__alt1(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return parseHtmlElement__alt2(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function parseTextNode(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const value = captureUntil(state, "<", "</", "<!--", true, true);

  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#text", value: value, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute__alt0(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const name = expectClass(state, "ident");

  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "equals", "=");
  expectLiteral(state, "dq", "\"");
  const value = captureUntil(state, "\"", null, null, true, true);

  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  expectLiteral(state, "dq", "\"");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { name: name, value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute__alt1(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const name = expectClass(state, "ident");

  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "equals", "=");
  expectLiteral(state, "sq", "'");
  const value = captureUntil(state, "'", null, null, true, true);

  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  expectLiteral(state, "sq", "'");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { name: name, value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute__alt2(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const name = expectClass(state, "ident");

  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "equals", "=");
  const value = expectClass(state, "ident");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { name: name, value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute__alt3(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const name = expectClass(state, "ident");

  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { name: name, value: "" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "equals" && __tok1.value === "=") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "dq" && __tok2.value === "\"") {
        return parseAttribute__alt0(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "sq" && __tok2.value === "'") {
        return parseAttribute__alt1(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return parseAttribute__alt2(state);
      }
      throw new SyntaxError('no production matched');
    }
    return parseAttribute__alt3(state);
  }
  throw new SyntaxError('no production matched');
}

function parseHtmlDocumentFast(state: State): unknown {

  const children: unknown[] = [];
  while (!(state.pos >= state.tokens.length)) {
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "doctypeOpen" && __tok.value === "<!") { __child = parseDoctypeFast(state); }
  else if (__tok !== undefined && __tok.type === "commentOpen" && __tok.value === "<!--") { __child = parseCommentFast(state); }
  else if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") { __child = parseHtmlElementFast(state); }
  else {
    __child = tryRoles(state, [parseTextNodeFast]);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  return { nodeName: "#document", mode: "no-quirks", childNodes: children, parentNode: null };
}

function parseDoctypeFast(state: State): unknown {
  expectLiteral(state, "doctypeOpen", "<!");
  const keyword = expectClass(state, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.tokens[state.pos - 1].start);
  const name = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  return { nodeName: "#documentType", name: name, publicId: "", systemId: "", parentNode: null };
}

function parseCommentFast(state: State): unknown {
  expectLiteral(state, "commentOpen", "<!--");
  const data = captureUntil(state, "-->", null, null, true, false);

  expectLiteral(state, "commentClose", "-->");
  return { nodeName: "#comment", data: data, parentNode: null };
}

function parseHtmlElementFast__alt0(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");
  if (!(tag.toLowerCase() === "area" || tag.toLowerCase() === "base" || tag.toLowerCase() === "br" || tag.toLowerCase() === "col" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "img" || tag.toLowerCase() === "input" || tag.toLowerCase() === "link" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "param" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "wbr")) throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + state.tokens[state.pos - 1].start);

  const attrs: unknown[] = [];
  while (!(peekLiteral(state, "gt", ">"))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteral(state, "gt", ">");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
}

function parseHtmlElementFast__alt1(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");
  if (!(tag.toLowerCase() === "area" || tag.toLowerCase() === "base" || tag.toLowerCase() === "br" || tag.toLowerCase() === "col" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "img" || tag.toLowerCase() === "input" || tag.toLowerCase() === "link" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "param" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "wbr")) throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + state.tokens[state.pos - 1].start);

  const attrs: unknown[] = [];
  while (!(peekLiteral(state, "selfClose", "/>"))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteral(state, "selfClose", "/>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
}

function parseHtmlElementFast__alt2(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteral(state, "gt", ">"))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteral(state, "gt", ">");

  const children: unknown[] = [];
  while (!(peekLiteral(state, "closeTagOpen", "</"))) {
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "doctypeOpen" && __tok.value === "<!") { __child = parseDoctypeFast(state); }
  else if (__tok !== undefined && __tok.type === "commentOpen" && __tok.value === "<!--") { __child = parseCommentFast(state); }
  else if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") { __child = parseHtmlElementFast(state); }
  else {
    __child = tryRoles(state, [parseTextNodeFast]);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteral(state, "closeTagOpen", "</");
  const closeTag = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident" && (__tok1.value.toLowerCase() === "area" || __tok1.value.toLowerCase() === "base" || __tok1.value.toLowerCase() === "br" || __tok1.value.toLowerCase() === "col" || __tok1.value.toLowerCase() === "embed" || __tok1.value.toLowerCase() === "hr" || __tok1.value.toLowerCase() === "img" || __tok1.value.toLowerCase() === "input" || __tok1.value.toLowerCase() === "link" || __tok1.value.toLowerCase() === "meta" || __tok1.value.toLowerCase() === "param" || __tok1.value.toLowerCase() === "source" || __tok1.value.toLowerCase() === "track" || __tok1.value.toLowerCase() === "wbr")) {
      { const r = trySpeculate(state, parseHtmlElementFast__alt0); if (r !== null) return r; }
      return parseHtmlElementFast__alt1(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return parseHtmlElementFast__alt2(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function parseTextNodeFast(state: State): unknown {
  const value = captureUntil(state, "<", "</", "<!--", true, true);

  return { nodeName: "#text", value: value, parentNode: null };
}

function parseAttributeFast__alt0(state: State): unknown {
  const name = expectClass(state, "ident");

  expectLiteral(state, "equals", "=");
  expectLiteral(state, "dq", "\"");
  const value = captureUntil(state, "\"", null, null, true, true);

  expectLiteral(state, "dq", "\"");
  return { name: name, value: value };
}

function parseAttributeFast__alt1(state: State): unknown {
  const name = expectClass(state, "ident");

  expectLiteral(state, "equals", "=");
  expectLiteral(state, "sq", "'");
  const value = captureUntil(state, "'", null, null, true, true);

  expectLiteral(state, "sq", "'");
  return { name: name, value: value };
}

function parseAttributeFast__alt2(state: State): unknown {
  const name = expectClass(state, "ident");

  expectLiteral(state, "equals", "=");
  const value = expectClass(state, "ident");

  return { name: name, value: value };
}

function parseAttributeFast__alt3(state: State): unknown {
  const name = expectClass(state, "ident");

  return { name: name, value: "" };
}

function parseAttributeFast(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "equals" && __tok1.value === "=") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "dq" && __tok2.value === "\"") {
        return parseAttributeFast__alt0(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "sq" && __tok2.value === "'") {
        return parseAttributeFast__alt1(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return parseAttributeFast__alt2(state);
      }
      throw new SyntaxError('no production matched');
    }
    return parseAttributeFast__alt3(state);
  }
  throw new SyntaxError('no production matched');
}

function validateHtmlDocument(state: State): unknown {
  let __count_children = 0;
  while (!(state.pos >= state.tokens.length)) {
    const __before = state.pos;
    (() => {
    const __tok = state.tokens[state.pos];
    if (__tok !== undefined && __tok.type === "doctypeOpen" && __tok.value === "<!") return validateDoctype(state);
    if (__tok !== undefined && __tok.type === "commentOpen" && __tok.value === "<!--") return validateComment(state);
    if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") return validateHtmlElement(state);
    return tryRoles(state, [validateTextNode]);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  return;
}

function validateDoctype(state: State): unknown {
  expectLiteral(state, "doctypeOpen", "<!");
  const keyword = expectClass(state, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.tokens[state.pos - 1].start);
  const name = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  return;
}

function validateComment(state: State): unknown {
  expectLiteral(state, "commentOpen", "<!--");
  const data = captureUntil(state, "-->", null, null, true, false);

  expectLiteral(state, "commentClose", "-->");
  return;
}

function validateHtmlElement__alt0(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");
  if (!(tag.toLowerCase() === "area" || tag.toLowerCase() === "base" || tag.toLowerCase() === "br" || tag.toLowerCase() === "col" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "img" || tag.toLowerCase() === "input" || tag.toLowerCase() === "link" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "param" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "wbr")) throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + state.tokens[state.pos - 1].start);
  let __count_attrs = 0;
  while (!(peekLiteral(state, "gt", ">"))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteral(state, "gt", ">");
  return;
}

function validateHtmlElement__alt1(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");
  if (!(tag.toLowerCase() === "area" || tag.toLowerCase() === "base" || tag.toLowerCase() === "br" || tag.toLowerCase() === "col" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "img" || tag.toLowerCase() === "input" || tag.toLowerCase() === "link" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "param" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "wbr")) throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + state.tokens[state.pos - 1].start);
  let __count_attrs = 0;
  while (!(peekLiteral(state, "selfClose", "/>"))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteral(state, "selfClose", "/>");
  return;
}

function validateHtmlElement__alt2(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");

  let __count_attrs = 0;
  while (!(peekLiteral(state, "gt", ">"))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteral(state, "gt", ">");
  let __count_children = 0;
  while (!(peekLiteral(state, "closeTagOpen", "</"))) {
    const __before = state.pos;
    (() => {
    const __tok = state.tokens[state.pos];
    if (__tok !== undefined && __tok.type === "doctypeOpen" && __tok.value === "<!") return validateDoctype(state);
    if (__tok !== undefined && __tok.type === "commentOpen" && __tok.value === "<!--") return validateComment(state);
    if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") return validateHtmlElement(state);
    return tryRoles(state, [validateTextNode]);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  expectLiteral(state, "closeTagOpen", "</");
  const closeTag = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  return;
}

function validateHtmlElement(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident" && (__tok1.value.toLowerCase() === "area" || __tok1.value.toLowerCase() === "base" || __tok1.value.toLowerCase() === "br" || __tok1.value.toLowerCase() === "col" || __tok1.value.toLowerCase() === "embed" || __tok1.value.toLowerCase() === "hr" || __tok1.value.toLowerCase() === "img" || __tok1.value.toLowerCase() === "input" || __tok1.value.toLowerCase() === "link" || __tok1.value.toLowerCase() === "meta" || __tok1.value.toLowerCase() === "param" || __tok1.value.toLowerCase() === "source" || __tok1.value.toLowerCase() === "track" || __tok1.value.toLowerCase() === "wbr")) {
      { const r = trySpeculate(state, validateHtmlElement__alt0); if (r !== null) return r; }
      return validateHtmlElement__alt1(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return validateHtmlElement__alt2(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function validateTextNode(state: State): unknown {
  const value = captureUntil(state, "<", "</", "<!--", true, true);

  return;
}

function validateAttribute__alt0(state: State): unknown {
  const name = expectClass(state, "ident");

  expectLiteral(state, "equals", "=");
  expectLiteral(state, "dq", "\"");
  const value = captureUntil(state, "\"", null, null, true, true);

  expectLiteral(state, "dq", "\"");
  return;
}

function validateAttribute__alt1(state: State): unknown {
  const name = expectClass(state, "ident");

  expectLiteral(state, "equals", "=");
  expectLiteral(state, "sq", "'");
  const value = captureUntil(state, "'", null, null, true, true);

  expectLiteral(state, "sq", "'");
  return;
}

function validateAttribute__alt2(state: State): unknown {
  const name = expectClass(state, "ident");

  expectLiteral(state, "equals", "=");
  const value = expectClass(state, "ident");

  return;
}

function validateAttribute__alt3(state: State): unknown {
  const name = expectClass(state, "ident");

  return;
}

function validateAttribute(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "equals" && __tok1.value === "=") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "dq" && __tok2.value === "\"") {
        return validateAttribute__alt0(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "sq" && __tok2.value === "'") {
        return validateAttribute__alt1(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return validateAttribute__alt2(state);
      }
      throw new SyntaxError('no production matched');
    }
    return validateAttribute__alt3(state);
  }
  throw new SyntaxError('no production matched');
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
    const result = mode === 'raws' ? parseHtmlDocument(state) : parseHtmlDocumentFast(state);
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
    validateHtmlDocument(state);
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
  module: "@parser2/html",
  exportName: 'validate',
};

export function countTokens(input: string): number {
  return tokenize(input).length;
}


export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}
