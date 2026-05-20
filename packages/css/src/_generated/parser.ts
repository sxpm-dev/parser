// Auto-generated from packages/css/src/schema.ts
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

    if (c === 0x2f /* / */ && i + 1 < len && input.charCodeAt(i + 1) === 0x2a /* * */) {
      const start = i;
      i += 2;
      while (i < len && !(input.charCodeAt(i) === 0x2a && i + 1 < len && input.charCodeAt(i + 1) === 0x2f)) i++;
      if (i < len) i += 2;
      tokens.hasComments = true;
      tokens.push({ type: 'comment', value: input.slice(start, i), start, end: i });
      continue;
    }
    switch (c) {
      case 33: tokens.push({ type: "delim", value: "!", start: i, end: i + 1 }); i++; continue;
      case 35: tokens.push({ type: "delim", value: "#", start: i, end: i + 1 }); i++; continue;
      case 36: tokens.push({ type: "delim", value: "$", start: i, end: i + 1 }); i++; continue;
      case 37: tokens.push({ type: "delim", value: "%", start: i, end: i + 1 }); i++; continue;
      case 38: tokens.push({ type: "delim", value: "&", start: i, end: i + 1 }); i++; continue;
      case 40: tokens.push({ type: "lparen", value: "(", start: i, end: i + 1 }); i++; continue;
      case 41: tokens.push({ type: "rparen", value: ")", start: i, end: i + 1 }); i++; continue;
      case 42: tokens.push({ type: "delim", value: "*", start: i, end: i + 1 }); i++; continue;
      case 43: tokens.push({ type: "delim", value: "+", start: i, end: i + 1 }); i++; continue;
      case 44: tokens.push({ type: "comma", value: ",", start: i, end: i + 1 }); i++; continue;
      case 46: tokens.push({ type: "delim", value: ".", start: i, end: i + 1 }); i++; continue;
      case 58: tokens.push({ type: "colon", value: ":", start: i, end: i + 1 }); i++; continue;
      case 59: tokens.push({ type: "semicolon", value: ";", start: i, end: i + 1 }); i++; continue;
      case 61: tokens.push({ type: "delim", value: "=", start: i, end: i + 1 }); i++; continue;
      case 62: tokens.push({ type: "delim", value: ">", start: i, end: i + 1 }); i++; continue;
      case 63: tokens.push({ type: "delim", value: "?", start: i, end: i + 1 }); i++; continue;
      case 64: tokens.push({ type: "delim", value: "@", start: i, end: i + 1 }); i++; continue;
      case 91: tokens.push({ type: "lbracket", value: "[", start: i, end: i + 1 }); i++; continue;
      case 93: tokens.push({ type: "rbracket", value: "]", start: i, end: i + 1 }); i++; continue;
      case 94: tokens.push({ type: "delim", value: "^", start: i, end: i + 1 }); i++; continue;
      case 123: tokens.push({ type: "lbrace", value: "{", start: i, end: i + 1 }); i++; continue;
      case 124: tokens.push({ type: "delim", value: "|", start: i, end: i + 1 }); i++; continue;
      case 125: tokens.push({ type: "rbrace", value: "}", start: i, end: i + 1 }); i++; continue;
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
    switch (c) {
      case 47: tokens.push({ type: "delim", value: "/", start: i, end: i + 1 }); i++; continue;
      case 92: tokens.push({ type: "delim", value: "\\", start: i, end: i + 1 }); i++; continue;
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

function peekLiteral(state: State, type: string, value: string): boolean {
  // Does NOT skip comments. Used by repeats-loop stop checks; if a trailing
  // comment sits between the last child and the body terminator, the loop
  // must do another iteration so parseComment can pick up the comment as a
  // sibling node rather than the loop exiting and leaving it stranded.
  const tok = state.tokens[state.pos];
  return tok !== undefined && tok.type === type && tok.value === value;
}

function peekLiteralAfterComments(state: State, type: string, value: string): boolean {
  let pos = state.pos;
  while (pos < state.tokens.length && state.tokens[pos].type === 'comment') pos++;
  const tok = state.tokens[pos];
  return tok !== undefined && tok.type === type && tok.value === value;
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

function parseComment(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const __raw_text = expectClass(state, "comment");
  const text = commentInterior(__raw_text);
  const __text_start = state.tokens[state.pos - 1].start;
  const __text_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "comment", text: text, raws: { left: commentLeft(state.input.slice(__text_start, __text_end)), right: commentRight(state.input.slice(__text_start, __text_end)) } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseDeclaration(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const prop = captureUntil(state, ":", ";", "}", true, true);
  const __prop_start = state.__lastCaptureStart;
  const __prop_end = state.__lastCaptureEnd;
  expectLiteral(state, "colon", ":");
  const value = captureUntil(state, ";", "}", "!", true, true);
  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  if (peekLiteralAfterComments(state, "delim", "!")) {
    expectLiteral(state, "delim", "!");
    const important = expectClass(state, "ident");
    const __important_start = state.tokens[state.pos - 1].start;
    const __important_end = state.tokens[state.pos - 1].end;
    consumeOptionalLiteral(state, "semicolon", ";");
    const __lastTok = state.tokens[state.pos - 1];
    const __endOff = __lastTok ? __lastTok.end : __startOff;
    const __struct: Record<string, unknown> = { type: "decl", prop: prop, value: value, important: true, raws: { between: state.input.slice(__prop_end, __value_start) } };
    __struct.source = makeSource(state, __startOff, __endOff);
    return __struct;
  }
  consumeOptionalLiteral(state, "semicolon", ";");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "decl", prop: prop, value: value, raws: { between: state.input.slice(__prop_end, __value_start) } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseRule(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const __captured = captureUntil(state, "{", ";", null, true, true);
  if (__captured.endsWith(":")) throw new SyntaxError("captured value ends with rejected suffix ':'");
  const selector = __captured;
  const __selector_start = state.__lastCaptureStart;
  const __selector_end = state.__lastCaptureEnd;
  const lbrace = expectLiteral(state, "lbrace", "{");
  const __lbrace_start = state.tokens[state.pos - 1].start;
  const __lbrace_end = state.tokens[state.pos - 1].end;
  const __nodes_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_nodes = __nodes_startOff;
  const nodes: unknown[] = [];
  while (!(peekLiteral(state, "rbrace", "}"))) {
    // Tolerate stray leading separators (e.g. `a {;; color: red }`).
    // The separators are silently consumed; they're recoverable as raws
    // because raws.before for the next child is computed against
    // __prevEnd_nodes (which doesn't advance during this skip).
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
    if (peekLiteral(state, "rbrace", "}")) break;
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "comment") { __child = parseComment(state); }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === "@") { __child = parseAtRule(state); }
  else {
    if (nextTopLevelStop(state, "{", ";", null) === "{") {
      const __first = trySpeculate(state, parseRule);
      __child = __first !== null ? __first : parseDeclaration(state);
    } else {
      __child = parseDeclaration(state);
    }
  }
    attachRawsBefore(state, __child, __prevEnd_nodes);
    nodes.push(__child);
    if (state.pos === __before) break;
    __prevEnd_nodes = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_nodes;
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
  }
  const rbrace = expectLiteral(state, "rbrace", "}");
  const __rbrace_start = state.tokens[state.pos - 1].start;
  const __rbrace_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "rule", selector: selector, nodes: nodes, raws: { between: state.input.slice(__selector_end, __lbrace_start), after: state.input.slice(__prevEnd_nodes, __rbrace_start), semicolon: (state.input.slice(__prevEnd_nodes - 1, __prevEnd_nodes) === ";") } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAtRule(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "delim", "@");
  const name = expectClass(state, "ident");
  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  const params = captureUntil(state, ";", "{", "}", true, true);
  const __params_start = state.__lastCaptureStart;
  const __params_end = state.__lastCaptureEnd;
  if (peekLiteralAfterComments(state, "lbrace", "{")) {
    const lbrace = expectLiteral(state, "lbrace", "{");
    const __lbrace_start = state.tokens[state.pos - 1].start;
    const __lbrace_end = state.tokens[state.pos - 1].end;
    const __nodes_startOff = state.tokens[state.pos - 1]?.end ?? 0;
    let __prevEnd_nodes = __nodes_startOff;
    const nodes: unknown[] = [];
    while (!(peekLiteral(state, "rbrace", "}"))) {
      // Tolerate stray leading separators (e.g. `a {;; color: red }`).
      // The separators are silently consumed; they're recoverable as raws
      // because raws.before for the next child is computed against
      // __prevEnd_nodes (which doesn't advance during this skip).
      while (peekLiteral(state, "semicolon", ";")) {
        expectLiteral(state, "semicolon", ";");
      }
      if (peekLiteral(state, "rbrace", "}")) break;
      const __before = state.pos;
      let __child: unknown;
    const __tok = state.tokens[state.pos];
    if (__tok !== undefined && __tok.type === "comment") { __child = parseComment(state); }
    else if (__tok !== undefined && __tok.type === "delim" && __tok.value === "@") { __child = parseAtRule(state); }
    else {
      if (nextTopLevelStop(state, "{", ";", null) === "{") {
        const __first = trySpeculate(state, parseRule);
        __child = __first !== null ? __first : parseDeclaration(state);
      } else {
        __child = parseDeclaration(state);
      }
    }
      attachRawsBefore(state, __child, __prevEnd_nodes);
      nodes.push(__child);
      if (state.pos === __before) break;
      __prevEnd_nodes = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_nodes;
      while (peekLiteral(state, "semicolon", ";")) {
        expectLiteral(state, "semicolon", ";");
      }
    }
    const rbrace = expectLiteral(state, "rbrace", "}");
    const __rbrace_start = state.tokens[state.pos - 1].start;
    const __rbrace_end = state.tokens[state.pos - 1].end;
    const __lastTok = state.tokens[state.pos - 1];
    const __endOff = __lastTok ? __lastTok.end : __startOff;
    const __struct: Record<string, unknown> = { type: "atrule", name: name, params: params, nodes: nodes, raws: { afterName: state.input.slice(__name_end, __params_start), between: state.input.slice(__params_end, __lbrace_start), after: state.input.slice(__prevEnd_nodes, __rbrace_start), semicolon: (state.input.slice(__prevEnd_nodes - 1, __prevEnd_nodes) === ";") } };
    __struct.source = makeSource(state, __startOff, __endOff);
    return __struct;
  }
  const semi = consumeOptionalLiteral(state, "semicolon", ";");
  const __semi_start = semi !== null ? state.tokens[state.pos - 1].start : (state.tokens[state.pos - 1]?.end ?? 0);
  const __semi_end = semi !== null ? state.tokens[state.pos - 1].end : __semi_start;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "atrule", name: name, params: params, raws: { afterName: state.input.slice(__name_end, __params_start), between: state.input.slice(__params_end, __semi_start) } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseStylesheet(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const __nodes_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_nodes = __nodes_startOff;
  const nodes: unknown[] = [];
  while (!(state.pos >= state.tokens.length)) {
    // Tolerate stray leading separators (e.g. `a {;; color: red }`).
    // The separators are silently consumed; they're recoverable as raws
    // because raws.before for the next child is computed against
    // __prevEnd_nodes (which doesn't advance during this skip).
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
    if (state.pos >= state.tokens.length) break;
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "comment") { __child = parseComment(state); }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === "@") { __child = parseAtRule(state); }
  else {
    if (nextTopLevelStop(state, "{", ";", null) === "{") {
      const __first = trySpeculate(state, parseRule);
      __child = __first !== null ? __first : parseDeclaration(state);
    } else {
      __child = parseDeclaration(state);
    }
  }
    attachRawsBefore(state, __child, __prevEnd_nodes);
    nodes.push(__child);
    if (state.pos === __before) break;
    __prevEnd_nodes = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_nodes;
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
  }
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "root", nodes: nodes, raws: { after: state.input.slice(__prevEnd_nodes, __endOff), semicolon: (state.input.slice(__prevEnd_nodes - 1, __prevEnd_nodes) === ";") } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseCommentFast(state: State): unknown {
  const __raw_text = expectClass(state, "comment");
  const text = commentInterior(__raw_text);
  return { type: "comment", text: text };
}

function parseDeclarationFast(state: State): unknown {
  const prop = captureUntil(state, ":", ";", "}", true, true);
  expectLiteral(state, "colon", ":");
  const value = captureUntil(state, ";", "}", "!", true, true);
  if (peekLiteralAfterComments(state, "delim", "!")) {
    expectLiteral(state, "delim", "!");
    const important = expectClass(state, "ident");
    consumeOptionalLiteral(state, "semicolon", ";");
    return { type: "decl", prop: prop, value: value, important: true };
  }
  consumeOptionalLiteral(state, "semicolon", ";");
  return { type: "decl", prop: prop, value: value };
}

function parseDeclarationFast__fromLeadingCapture(state: State, prop: string): unknown {
  expectLiteral(state, "colon", ":");
  const value = captureUntil(state, ";", "}", "!", true, true);
  if (peekLiteralAfterComments(state, "delim", "!")) {
    expectLiteral(state, "delim", "!");
    const important = expectClass(state, "ident");
    consumeOptionalLiteral(state, "semicolon", ";");
    return { type: "decl", prop: prop, value: value, important: true };
  }
  consumeOptionalLiteral(state, "semicolon", ";");
  return { type: "decl", prop: prop, value: value };
}

function parseRuleFast(state: State): unknown {
  const __captured = captureUntil(state, "{", ";", null, true, true);
  if (__captured.endsWith(":")) throw new SyntaxError("captured value ends with rejected suffix ':'");
  const selector = __captured;

  const lbrace = expectLiteral(state, "lbrace", "{");

  const nodes: unknown[] = [];
  while (!(peekLiteral(state, "rbrace", "}"))) {
    // Tolerate stray leading separators (e.g. `a {;; color: red }`).
    // The separators are silently consumed; they're recoverable as raws
    // because raws.before for the next child is computed against
    // __prevEnd_nodes (which doesn't advance during this skip).
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
    if (peekLiteral(state, "rbrace", "}")) break;
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "comment") { __child = parseCommentFast(state); }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === "@") { __child = parseAtRuleFast(state); }
  else {
    const __scan = scanTopLevelBoundary(state, "{", ";", null, ":", "!");
    if (__scan.stop === "{") {
      const selector = captureTokenRange(state, __scan.firstIdx, __scan.captureEndIdx, true);
      if (selector.endsWith(":")) {
        state.pos = __scan.firstIdx;
        __child = parseDeclarationFast(state);
      } else {
        state.pos = __scan.stopIdx;
        __child = parseRuleFast__fromLeadingCapture(state, selector);
      }
    } else {
      if (__scan.watchIdx < 0) {
        __child = parseDeclarationFast(state);
      } else {
        const prop = captureTokenRange(state, __scan.firstIdx, __scan.watchIdx, true);
        state.pos = __scan.watchIdx;
        expectLiteral(state, "colon", ":");
        const __valueStart = state.pos;
        if (__scan.watch1Idx >= 0) {
          const value = captureTokenRange(state, __valueStart, __scan.watch1Idx, true);
          state.pos = __scan.watch1Idx;
          __child = (() => {
            expectLiteral(state, "delim", "!");
            const important = expectClass(state, "ident");
            consumeOptionalLiteral(state, "semicolon", ";");
            return { type: "decl", prop: prop, value: value, important: true };
          })();
        } else {
          const value = captureTokenRange(state, __valueStart, __scan.captureEndIdx, true);
          state.pos = __scan.stopIdx;
          __child = (() => {
            consumeOptionalLiteral(state, "semicolon", ";");
            return { type: "decl", prop: prop, value: value };
          })();
        }
      }
    }
  }
    nodes.push(__child);
    if (state.pos === __before) break;
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
  }
  const rbrace = expectLiteral(state, "rbrace", "}");
  return { type: "rule", selector: selector, nodes: nodes };
}

function parseRuleFast__fromLeadingCapture(state: State, selector: string): unknown {
  const lbrace = expectLiteral(state, "lbrace", "{");

  const nodes: unknown[] = [];
  while (!(peekLiteral(state, "rbrace", "}"))) {
    // Tolerate stray leading separators (e.g. `a {;; color: red }`).
    // The separators are silently consumed; they're recoverable as raws
    // because raws.before for the next child is computed against
    // __prevEnd_nodes (which doesn't advance during this skip).
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
    if (peekLiteral(state, "rbrace", "}")) break;
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "comment") { __child = parseCommentFast(state); }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === "@") { __child = parseAtRuleFast(state); }
  else {
    const __scan = scanTopLevelBoundary(state, "{", ";", null, ":", "!");
    if (__scan.stop === "{") {
      const selector = captureTokenRange(state, __scan.firstIdx, __scan.captureEndIdx, true);
      if (selector.endsWith(":")) {
        state.pos = __scan.firstIdx;
        __child = parseDeclarationFast(state);
      } else {
        state.pos = __scan.stopIdx;
        __child = parseRuleFast__fromLeadingCapture(state, selector);
      }
    } else {
      if (__scan.watchIdx < 0) {
        __child = parseDeclarationFast(state);
      } else {
        const prop = captureTokenRange(state, __scan.firstIdx, __scan.watchIdx, true);
        state.pos = __scan.watchIdx;
        expectLiteral(state, "colon", ":");
        const __valueStart = state.pos;
        if (__scan.watch1Idx >= 0) {
          const value = captureTokenRange(state, __valueStart, __scan.watch1Idx, true);
          state.pos = __scan.watch1Idx;
          __child = (() => {
            expectLiteral(state, "delim", "!");
            const important = expectClass(state, "ident");
            consumeOptionalLiteral(state, "semicolon", ";");
            return { type: "decl", prop: prop, value: value, important: true };
          })();
        } else {
          const value = captureTokenRange(state, __valueStart, __scan.captureEndIdx, true);
          state.pos = __scan.stopIdx;
          __child = (() => {
            consumeOptionalLiteral(state, "semicolon", ";");
            return { type: "decl", prop: prop, value: value };
          })();
        }
      }
    }
  }
    nodes.push(__child);
    if (state.pos === __before) break;
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
  }
  const rbrace = expectLiteral(state, "rbrace", "}");
  return { type: "rule", selector: selector, nodes: nodes };
}

function parseAtRuleFast(state: State): unknown {
  expectLiteral(state, "delim", "@");
  const name = expectClass(state, "ident");
  const params = captureUntil(state, ";", "{", "}", true, true);
  if (peekLiteralAfterComments(state, "lbrace", "{")) {
    const lbrace = expectLiteral(state, "lbrace", "{");

    const nodes: unknown[] = [];
    while (!(peekLiteral(state, "rbrace", "}"))) {
      // Tolerate stray leading separators (e.g. `a {;; color: red }`).
      // The separators are silently consumed; they're recoverable as raws
      // because raws.before for the next child is computed against
      // __prevEnd_nodes (which doesn't advance during this skip).
      while (peekLiteral(state, "semicolon", ";")) {
        expectLiteral(state, "semicolon", ";");
      }
      if (peekLiteral(state, "rbrace", "}")) break;
      const __before = state.pos;
      let __child: unknown;
    const __tok = state.tokens[state.pos];
    if (__tok !== undefined && __tok.type === "comment") { __child = parseCommentFast(state); }
    else if (__tok !== undefined && __tok.type === "delim" && __tok.value === "@") { __child = parseAtRuleFast(state); }
    else {
      const __scan = scanTopLevelBoundary(state, "{", ";", null, ":", "!");
      if (__scan.stop === "{") {
        const selector = captureTokenRange(state, __scan.firstIdx, __scan.captureEndIdx, true);
        if (selector.endsWith(":")) {
          state.pos = __scan.firstIdx;
          __child = parseDeclarationFast(state);
        } else {
          state.pos = __scan.stopIdx;
          __child = parseRuleFast__fromLeadingCapture(state, selector);
        }
      } else {
        if (__scan.watchIdx < 0) {
          __child = parseDeclarationFast(state);
        } else {
          const prop = captureTokenRange(state, __scan.firstIdx, __scan.watchIdx, true);
          state.pos = __scan.watchIdx;
          expectLiteral(state, "colon", ":");
          const __valueStart = state.pos;
          if (__scan.watch1Idx >= 0) {
            const value = captureTokenRange(state, __valueStart, __scan.watch1Idx, true);
            state.pos = __scan.watch1Idx;
            __child = (() => {
              expectLiteral(state, "delim", "!");
              const important = expectClass(state, "ident");
              consumeOptionalLiteral(state, "semicolon", ";");
              return { type: "decl", prop: prop, value: value, important: true };
            })();
          } else {
            const value = captureTokenRange(state, __valueStart, __scan.captureEndIdx, true);
            state.pos = __scan.stopIdx;
            __child = (() => {
              consumeOptionalLiteral(state, "semicolon", ";");
              return { type: "decl", prop: prop, value: value };
            })();
          }
        }
      }
    }
      nodes.push(__child);
      if (state.pos === __before) break;
      while (peekLiteral(state, "semicolon", ";")) {
        expectLiteral(state, "semicolon", ";");
      }
    }
    const rbrace = expectLiteral(state, "rbrace", "}");
    return { type: "atrule", name: name, params: params, nodes: nodes };
  }
  const semi = consumeOptionalLiteral(state, "semicolon", ";");

  return { type: "atrule", name: name, params: params };
}

function parseStylesheetFast(state: State): unknown {

  const nodes: unknown[] = [];
  while (!(state.pos >= state.tokens.length)) {
    // Tolerate stray leading separators (e.g. `a {;; color: red }`).
    // The separators are silently consumed; they're recoverable as raws
    // because raws.before for the next child is computed against
    // __prevEnd_nodes (which doesn't advance during this skip).
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
    if (state.pos >= state.tokens.length) break;
    const __before = state.pos;
    let __child: unknown;
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "comment") { __child = parseCommentFast(state); }
  else if (__tok !== undefined && __tok.type === "delim" && __tok.value === "@") { __child = parseAtRuleFast(state); }
  else {
    const __scan = scanTopLevelBoundary(state, "{", ";", null, ":", "!");
    if (__scan.stop === "{") {
      const selector = captureTokenRange(state, __scan.firstIdx, __scan.captureEndIdx, true);
      if (selector.endsWith(":")) {
        state.pos = __scan.firstIdx;
        __child = parseDeclarationFast(state);
      } else {
        state.pos = __scan.stopIdx;
        __child = parseRuleFast__fromLeadingCapture(state, selector);
      }
    } else {
      if (__scan.watchIdx < 0) {
        __child = parseDeclarationFast(state);
      } else {
        const prop = captureTokenRange(state, __scan.firstIdx, __scan.watchIdx, true);
        state.pos = __scan.watchIdx;
        expectLiteral(state, "colon", ":");
        const __valueStart = state.pos;
        if (__scan.watch1Idx >= 0) {
          const value = captureTokenRange(state, __valueStart, __scan.watch1Idx, true);
          state.pos = __scan.watch1Idx;
          __child = (() => {
            expectLiteral(state, "delim", "!");
            const important = expectClass(state, "ident");
            consumeOptionalLiteral(state, "semicolon", ";");
            return { type: "decl", prop: prop, value: value, important: true };
          })();
        } else {
          const value = captureTokenRange(state, __valueStart, __scan.captureEndIdx, true);
          state.pos = __scan.stopIdx;
          __child = (() => {
            consumeOptionalLiteral(state, "semicolon", ";");
            return { type: "decl", prop: prop, value: value };
          })();
        }
      }
    }
  }
    nodes.push(__child);
    if (state.pos === __before) break;
    while (peekLiteral(state, "semicolon", ";")) {
      expectLiteral(state, "semicolon", ";");
    }
  }
  return { type: "root", nodes: nodes };
}

type DirectState = {
  readonly input: string;
  readonly len: number;
  pos: number;
  scanStop: number;
  scanStopIdx: number;
  scanCaptureStart: number;
  scanCaptureEnd: number;
  scanColonIdx: number;
  scanBangIdx: number;
};

function parseDirectFast(input: string): unknown {
  const state: DirectState = {
    input,
    len: input.length,
    pos: 0,
    scanStop: -1,
    scanStopIdx: 0,
    scanCaptureStart: 0,
    scanCaptureEnd: 0,
    scanColonIdx: -1,
    scanBangIdx: -1,
  };
  const nodes = parseDirectRootChildren(state);
  skipDirectWsAndSeparators(state);
  if (state.pos !== state.len) throw new SyntaxError(`unexpected trailing character at position ${state.pos}`);
  return { type: "root", nodes: nodes };
}

function parseDirectRootChildren(state: DirectState): unknown[] {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== 59) break;
      state.pos++;
    }
    if (state.pos >= len) return nodes;
    const c = input.charCodeAt(state.pos);
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[state.pos]}' at position ${state.pos}`);
    if (c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */) {
      nodes[nodes.length] = parseDirectComment(state);
      continue;
    }
    if (c === 64) {
      nodes[nodes.length] = parseDirectPrefixed(state);
      continue;
    }
    nodes[nodes.length] = parseDirectBlockOrPair(state);
  }
}

function parseDirectChildren(state: DirectState): unknown[] {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== 59) break;
      state.pos++;
    }
    if (state.pos >= len) {
      throw new SyntaxError(`expected '}' at position ${state.pos}`);
    }
    const c = input.charCodeAt(state.pos);
    if (c === 125) {
      state.pos++;
      return nodes;
    }
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[state.pos]}' at position ${state.pos}`);
    if (c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */) {
      nodes[nodes.length] = parseDirectComment(state);
      continue;
    }
    if (c === 64) {
      nodes[nodes.length] = parseDirectPrefixed(state);
      continue;
    }
    nodes[nodes.length] = parseDirectBlockOrPair(state);
  }
}

function parseDirectComment(state: DirectState): unknown {
  const input = state.input;
  const len = state.len;
  const start = state.pos;
  state.pos += 2;
  while (state.pos < len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
  if (state.pos < len) state.pos += 2;
  let textStart = start + 2;
  let textEnd = state.pos - 2;
  while (textStart < textEnd) {
    const lc = input.charCodeAt(textStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    textStart++;
  }
  while (textEnd > textStart) {
    const tc = input.charCodeAt(textEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    textEnd--;
  }
  return { type: "comment", text: input.slice(textStart, textEnd) };
}

function parseDirectPrefixed(state: DirectState): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const nameStart = state.pos;
  readDirectIdent(state);
  const name = input.slice(nameStart, state.pos);
  scanDirectBoundary(state, 59, 123, 125);
  const params = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
  const scanStop = state.scanStop;
  state.pos = state.scanStopIdx;
  if (scanStop === 123) {
    state.pos++;
    const nodes = parseDirectChildren(state);
    return { type: "atrule", name: name, params: params, nodes: nodes };
  }
  if (scanStop === 59) state.pos++;
  return { type: "atrule", name: name, params: params };
}


function parseDirectBlockOrPair(state: DirectState): unknown {
  const input = state.input;
  scanDirectPairBoundary(state, 123, 59, 125);
  const rejectsBlock = state.scanCaptureEnd > state.scanCaptureStart && input.charCodeAt(state.scanCaptureEnd - 1) === 58;
  if (state.scanStop === 123 && !rejectsBlock) {
    const selector = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
    state.pos = state.scanStopIdx + 1;
    const nodes = parseDirectChildren(state);
    return { type: "rule", selector: selector, nodes: nodes };
  }
  const scanColonIdx = state.scanColonIdx;
  if (scanColonIdx < 0) throw new SyntaxError(`expected : at position ${state.pos}`);
  const scanCaptureStart = state.scanCaptureStart;
  const scanCaptureEnd = state.scanCaptureEnd;
  const scanBangIdx = state.scanBangIdx;
  let pairLeftEnd = scanColonIdx;
  while (pairLeftEnd > scanCaptureStart) {
    const lc = input.charCodeAt(pairLeftEnd - 1);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    pairLeftEnd--;
  }
  const prop = input.slice(scanCaptureStart, pairLeftEnd);
  if (state.scanStop === 123) {
    state.pos = scanColonIdx + 1;
    return parseDirectDeclarationRest(state, prop);
  }
  let pairRightStart = scanColonIdx + 1;
  const rawRightEnd = scanBangIdx >= 0 ? scanBangIdx : scanCaptureEnd;
  while (pairRightStart < rawRightEnd) {
    const lc = input.charCodeAt(pairRightStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    pairRightStart++;
  }
  let pairRightEnd = rawRightEnd;
  while (pairRightEnd > pairRightStart) {
    const tc = input.charCodeAt(pairRightEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    pairRightEnd--;
  }
  const value = input.slice(pairRightStart, pairRightEnd);
  state.pos = scanBangIdx >= 0 ? scanBangIdx : state.scanStopIdx;
  if (scanBangIdx >= 0) return parseDirectImportantDeclarationRest(state, prop, value);
  if (state.scanStop === 59) state.pos++;
  return { type: "decl", prop: prop, value: value };
}

function parseDirectDeclarationRest(state: DirectState, prop: string): unknown {
  const input = state.input;
  scanDirectValueBoundary(state, 59, 125, 33);
  const value = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
  state.pos = state.scanStopIdx;
  if (state.scanStop === 33) {
    return parseDirectImportantDeclarationRest(state, prop, value);
  }
  if (state.scanStop === 59) state.pos++;
  return { type: "decl", prop: prop, value: value };
}

function parseDirectImportantDeclarationRest(state: DirectState, prop: string, value: string): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const importantStart = state.pos;
  readDirectIdent(state);
  if (state.pos === importantStart) throw new SyntaxError(`expected token of class 'ident' at position ${importantStart}`);
  skipDirectWs(state);
  if (input.charCodeAt(state.pos) === 59) state.pos++;
  return { type: "decl", prop: prop, value: value, important: true };
}

function scanDirectBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
  let depth = 0;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[pos]}' at position ${pos}`);
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      pos = skipDirectString(input, pos, len);
      continue;
    }
    if (c === 0x5c /* \\ */) {
      pos += pos + 1 < len ? 2 : 1;
      continue;
    }
    if (depth === 0) {
      if (c === stop0 || c === stop1 || c === stop2) break;
    }
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === 123) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === 125) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  let captureStart = startPos;
  while (captureStart < pos) {
    const lc = input.charCodeAt(captureStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    captureStart++;
  }
  let captureEnd = pos;
  while (captureEnd > captureStart) {
    const tc = input.charCodeAt(captureEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    captureEnd--;
  }
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = captureStart;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = -1;
  state.scanBangIdx = -1;
}

function scanDirectPairBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
  let depth = 0;
  let colonIdx = -1;
  let bangIdx = -1;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[pos]}' at position ${pos}`);
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      pos = skipDirectString(input, pos, len);
      continue;
    }
    if (c === 0x5c /* \\ */) {
      pos += pos + 1 < len ? 2 : 1;
      continue;
    }
    if (depth === 0) {
      if (colonIdx < 0 && c === 58) colonIdx = pos;
      if (colonIdx >= 0 && bangIdx < 0 && c === 33) bangIdx = pos;
      if (c === stop0 || c === stop1 || c === stop2) break;
    }
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === 123) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === 125) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  // Callers (parseDirectChildren / parseDirectRootChildren) always advance past
  // whitespace and separators before dispatching here, so the leading-trim
  // loop is dead. captureStart is always the entry pos.
  let captureEnd = pos;
  while (captureEnd > startPos) {
    const tc = input.charCodeAt(captureEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    captureEnd--;
  }
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = startPos;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = colonIdx;
  state.scanBangIdx = bangIdx;
}

function scanDirectValueBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
  let depth = 0;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[pos]}' at position ${pos}`);
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      pos = skipDirectString(input, pos, len);
      continue;
    }
    if (c === 0x5c /* \\ */) {
      pos += pos + 1 < len ? 2 : 1;
      continue;
    }
    if (depth === 0 && (c === stop0 || c === stop1 || c === stop2)) break;
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === 123) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === 125) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  let captureStart = startPos;
  while (captureStart < pos) {
    const lc = input.charCodeAt(captureStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    captureStart++;
  }
  let captureEnd = pos;
  while (captureEnd > captureStart) {
    const tc = input.charCodeAt(captureEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    captureEnd--;
  }
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = captureStart;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = -1;
  state.scanBangIdx = -1;
}

function skipDirectString(input: string, pos: number, len: number): number {
  const quote = input.charCodeAt(pos);
  pos++;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c === 0x5c /* \\ */) { pos += 2; continue; }
    pos++;
    if (c === quote) break;
  }
  return pos;
}

function readDirectIdent(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len) {
    const c = input.charCodeAt(state.pos);
    if (c === 0x5c /* \\ */) {
      state.pos += state.pos + 1 < len ? 2 : 1;
      continue;
    }
    if (!((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 45 || (c >= 48 && c <= 57))) break;
    state.pos++;
  }
}

function skipDirectWsAndSeparators(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len) {
    const c = input.charCodeAt(state.pos);
    if (isDirectWs(c) || c === 59) {
      state.pos++;
      continue;
    }
    break;
  }
}

function skipDirectWs(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len && isDirectWs(input.charCodeAt(state.pos))) state.pos++;
}

function isDirectWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}

export function parse(input: string, options: ParseOptions = {}): unknown {
  const mode = options.mode ?? 'fast';
  if (mode === 'fast') return parseDirectFast(input);
  const tokens = tokenize(input);
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
  const result = mode === 'raws' ? parseStylesheet(state) : parseStylesheetFast(state);
  if (state.pos !== state.tokens.length) {
    throw new SyntaxError(`unexpected trailing token at position ${state.pos}`);
  }
  return result;
}

export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}
