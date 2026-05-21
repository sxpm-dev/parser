// Auto-generated from packages/markdown/src/schema.ts
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
    if (input.startsWith("######", i)) { tokens.push({ type: "######", value: "######", start: i, end: i + 6 }); i += 6; continue; }
    if (input.startsWith("#####", i)) { tokens.push({ type: "#####", value: "#####", start: i, end: i + 5 }); i += 5; continue; }
    if (input.startsWith("####", i)) { tokens.push({ type: "####", value: "####", start: i, end: i + 4 }); i += 4; continue; }
    if (input.startsWith("###", i)) { tokens.push({ type: "###", value: "###", start: i, end: i + 3 }); i += 3; continue; }
    if (input.startsWith("***", i)) { tokens.push({ type: "thematicStar", value: "***", start: i, end: i + 3 }); i += 3; continue; }
    if (input.startsWith("---", i)) { tokens.push({ type: "thematic", value: "---", start: i, end: i + 3 }); i += 3; continue; }
    if (input.startsWith("___", i)) { tokens.push({ type: "thematicUnderscore", value: "___", start: i, end: i + 3 }); i += 3; continue; }
    if (input.startsWith("```", i)) { tokens.push({ type: "fence", value: "```", start: i, end: i + 3 }); i += 3; continue; }
    if (input.startsWith("##", i)) { tokens.push({ type: "##", value: "##", start: i, end: i + 2 }); i += 2; continue; }
    if (input.startsWith("**", i)) { tokens.push({ type: "bold", value: "**", start: i, end: i + 2 }); i += 2; continue; }
    if (input.startsWith("~~", i)) { tokens.push({ type: "strike", value: "~~", start: i, end: i + 2 }); i += 2; continue; }

    switch (c) {
      case 33: tokens.push({ type: "bang", value: "!", start: i, end: i + 1 }); i++; continue;
      case 34: tokens.push({ type: "quote", value: "\"", start: i, end: i + 1 }); i++; continue;
      case 35: tokens.push({ type: "hash", value: "#", start: i, end: i + 1 }); i++; continue;
      case 38: tokens.push({ type: "ampersand", value: "&", start: i, end: i + 1 }); i++; continue;
      case 40: tokens.push({ type: "lparen", value: "(", start: i, end: i + 1 }); i++; continue;
      case 41: tokens.push({ type: "rparen", value: ")", start: i, end: i + 1 }); i++; continue;
      case 42: tokens.push({ type: "italic", value: "*", start: i, end: i + 1 }); i++; continue;
      case 43: tokens.push({ type: "plus", value: "+", start: i, end: i + 1 }); i++; continue;
      case 45: tokens.push({ type: "dash", value: "-", start: i, end: i + 1 }); i++; continue;
      case 46: tokens.push({ type: "dot", value: ".", start: i, end: i + 1 }); i++; continue;
      case 47: tokens.push({ type: "slash", value: "/", start: i, end: i + 1 }); i++; continue;
      case 58: tokens.push({ type: "colon", value: ":", start: i, end: i + 1 }); i++; continue;
      case 59: tokens.push({ type: "semicolon", value: ";", start: i, end: i + 1 }); i++; continue;
      case 60: tokens.push({ type: "lt", value: "<", start: i, end: i + 1 }); i++; continue;
      case 61: tokens.push({ type: "equals", value: "=", start: i, end: i + 1 }); i++; continue;
      case 62: tokens.push({ type: "gt", value: ">", start: i, end: i + 1 }); i++; continue;
      case 91: tokens.push({ type: "lbracket", value: "[", start: i, end: i + 1 }); i++; continue;
      case 93: tokens.push({ type: "rbracket", value: "]", start: i, end: i + 1 }); i++; continue;
      case 94: tokens.push({ type: "caret", value: "^", start: i, end: i + 1 }); i++; continue;
      case 96: tokens.push({ type: "backtick", value: "`", start: i, end: i + 1 }); i++; continue;
      case 124: tokens.push({ type: "pipe", value: "|", start: i, end: i + 1 }); i++; continue;
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

function nextNonCommentToken(state: State, pos: number): Token | undefined {
  while (pos < state.tokens.length && state.tokens[pos].type === 'comment') pos++;
  return state.tokens[pos];
}

function nthNonCommentToken(state: State, pos: number, index: number): Token | undefined {
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

function parseMarkdownDocument(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const __children_startOff = state.tokens[state.pos - 1]?.end ?? 0;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(state.pos >= state.tokens.length)) {
    const __before = state.pos;
    const __child = parseMarkdownLeaf(state);
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "document", children: children };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt0(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "hash", "#");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 1, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt1(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "##", "##");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 2, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt2(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "###", "###");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 3, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt3(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "####", "####");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 4, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt4(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "#####", "#####");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 5, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt5(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "######", "######");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 6, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt6(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "thematic", "---");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 2, text: [first, second], style: "setext" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt7(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "paragraph", text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt8(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "dash", "-");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt9(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "plus", "+");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, marker: "+", text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt10(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "italic", "*");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, marker: "*", text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt11(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  const index = expectClass(state, "number");

  const __index_start = state.tokens[state.pos - 1].start;
  const __index_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "dot", ".");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "list-item", ordered: true, index: index, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt12(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "dash", "-");
  expectLiteral(state, "lbracket", "[");
  const checked = expectClass(state, "ident");

  const __checked_start = state.tokens[state.pos - 1].start;
  const __checked_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "task-list-item", checked: true, marker: checked, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt13(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "dash", "-");
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "rbracket", "]");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "task-list-item", checked: false, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt14(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "gt", ">");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "blockquote", text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt15(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "thematic", "---");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "thematic-break" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt16(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "thematicStar", "***");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "thematic-break", marker: "*" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt17(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "thematicUnderscore", "___");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "thematic-break", marker: "_" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt18(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "bold", "**");
  const value = expectClass(state, "ident");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "bold", "**");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "bold", text: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt19(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "italic", "*");
  const value = expectClass(state, "ident");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "italic", "*");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "italic", text: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt20(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "strike", "~~");
  const value = expectClass(state, "ident");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "strike", "~~");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "strikethrough", text: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt21(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "backtick", "`");
  const value = expectClass(state, "ident");

  const __value_start = state.tokens[state.pos - 1].start;
  const __value_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "backtick", "`");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "inline-code", text: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt22(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lbracket", "[");
  const label = expectClass(state, "ident");

  const __label_start = state.tokens[state.pos - 1].start;
  const __label_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lparen", "(");
  const scheme = expectClass(state, "ident");

  const __scheme_start = state.tokens[state.pos - 1].start;
  const __scheme_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  const __host_start = state.tokens[state.pos - 1].start;
  const __host_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  const __tld_start = state.tokens[state.pos - 1].start;
  const __tld_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rparen", ")");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "link", label: label, scheme: scheme, host: [host, tld] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt23(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lbracket", "[");
  const label = expectClass(state, "ident");

  const __label_start = state.tokens[state.pos - 1].start;
  const __label_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  const __id_start = state.tokens[state.pos - 1].start;
  const __id_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "reference-link", label: label, id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt24(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "bang", "!");
  expectLiteral(state, "lbracket", "[");
  const alt = expectClass(state, "ident");

  const __alt_start = state.tokens[state.pos - 1].start;
  const __alt_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lparen", "(");
  const scheme = expectClass(state, "ident");

  const __scheme_start = state.tokens[state.pos - 1].start;
  const __scheme_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  const __host_start = state.tokens[state.pos - 1].start;
  const __host_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  const __tld_start = state.tokens[state.pos - 1].start;
  const __tld_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "slash", "/");
  const path = expectClass(state, "ident");

  const __path_start = state.tokens[state.pos - 1].start;
  const __path_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "dot", ".");
  const ext = expectClass(state, "ident");

  const __ext_start = state.tokens[state.pos - 1].start;
  const __ext_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rparen", ")");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "image", alt: alt, scheme: scheme, host: [host, tld], path: [path, ext] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt25(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "bang", "!");
  expectLiteral(state, "lbracket", "[");
  const alt = expectClass(state, "ident");

  const __alt_start = state.tokens[state.pos - 1].start;
  const __alt_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  const __id_start = state.tokens[state.pos - 1].start;
  const __id_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "reference-image", alt: alt, id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt26(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lt", "<");
  const scheme = expectClass(state, "ident");

  const __scheme_start = state.tokens[state.pos - 1].start;
  const __scheme_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  const __host_start = state.tokens[state.pos - 1].start;
  const __host_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  const __tld_start = state.tokens[state.pos - 1].start;
  const __tld_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "gt", ">");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "autolink", scheme: scheme, host: [host, tld] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt27(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "ampersand", "&");
  const name = expectClass(state, "ident");

  const __name_start = state.tokens[state.pos - 1].start;
  const __name_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "semicolon", ";");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "entity", name: name };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt28(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "fence", "```");
  const lang = expectClass(state, "ident");

  const __lang_start = state.tokens[state.pos - 1].start;
  const __lang_end = state.tokens[state.pos - 1].end;
  const body = expectClass(state, "ident");

  const __body_start = state.tokens[state.pos - 1].start;
  const __body_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "fence", "```");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "code-block", lang: lang, text: body };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt29(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "fence", "```");
  const body = expectClass(state, "ident");

  const __body_start = state.tokens[state.pos - 1].start;
  const __body_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "fence", "```");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "code-block", text: body };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt30(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "pipe", "|");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "pipe", "|");
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "pipe", "|");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "table-row", cells: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt31(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "table-delimiter", align: ["default", "default"] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt32(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "pipe", "|");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "table-delimiter", align: ["left", "right"] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt33(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  const __id_start = state.tokens[state.pos - 1].start;
  const __id_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "colon", ":");
  const scheme = expectClass(state, "ident");

  const __scheme_start = state.tokens[state.pos - 1].start;
  const __scheme_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  const __host_start = state.tokens[state.pos - 1].start;
  const __host_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  const __tld_start = state.tokens[state.pos - 1].start;
  const __tld_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "definition", id: id, scheme: scheme, host: [host, tld] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt34(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "caret", "^");
  const id = expectClass(state, "number");

  const __id_start = state.tokens[state.pos - 1].start;
  const __id_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "colon", ":");
  const first = expectClass(state, "ident");

  const __first_start = state.tokens[state.pos - 1].start;
  const __first_end = state.tokens[state.pos - 1].end;
  const second = expectClass(state, "ident");

  const __second_start = state.tokens[state.pos - 1].start;
  const __second_end = state.tokens[state.pos - 1].end;
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "footnote-definition", id: id, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt35(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "caret", "^");
  const id = expectClass(state, "number");

  const __id_start = state.tokens[state.pos - 1].start;
  const __id_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "rbracket", "]");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "footnote-reference", id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt36(state: State): unknown {
  const __startTok = state.tokens[state.pos];
  const __startOff = __startTok ? __startTok.start : state.input.length;
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");

  const __tag_start = state.tokens[state.pos - 1].start;
  const __tag_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "gt", ">");
  const body = expectClass(state, "ident");

  const __body_start = state.tokens[state.pos - 1].start;
  const __body_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "lt", "<");
  expectLiteral(state, "slash", "/");
  const closingTag = expectClass(state, "ident");

  const __closingTag_start = state.tokens[state.pos - 1].start;
  const __closingTag_end = state.tokens[state.pos - 1].end;
  expectLiteral(state, "gt", ">");
  const __lastTok = state.tokens[state.pos - 1];
  const __endOff = __lastTok ? __lastTok.end : __startOff;
  const __struct: Record<string, unknown> = { type: "html", tag: tag, text: body, closingTag: closingTag };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "hash" && __tok.value === "#") {
    return parseMarkdownLeaf__alt0(state);
  }
  else if (__tok !== undefined && __tok.type === "##" && __tok.value === "##") {
    return parseMarkdownLeaf__alt1(state);
  }
  else if (__tok !== undefined && __tok.type === "###" && __tok.value === "###") {
    return parseMarkdownLeaf__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "####" && __tok.value === "####") {
    return parseMarkdownLeaf__alt3(state);
  }
  else if (__tok !== undefined && __tok.type === "#####" && __tok.value === "#####") {
    return parseMarkdownLeaf__alt4(state);
  }
  else if (__tok !== undefined && __tok.type === "######" && __tok.value === "######") {
    return parseMarkdownLeaf__alt5(state);
  }
  else if (__tok !== undefined && __tok.type === "dash" && __tok.value === "-") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lbracket" && __tok1.value === "[") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "rbracket" && __tok2.value === "]") {
        return parseMarkdownLeaf__alt13(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return parseMarkdownLeaf__alt12(state);
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return parseMarkdownLeaf__alt8(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "plus" && __tok.value === "+") {
    return parseMarkdownLeaf__alt9(state);
  }
  else if (__tok !== undefined && __tok.type === "italic" && __tok.value === "*") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "italic" && __tok2.value === "*") {
        return parseMarkdownLeaf__alt19(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return parseMarkdownLeaf__alt10(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "gt" && __tok.value === ">") {
    return parseMarkdownLeaf__alt14(state);
  }
  else if (__tok !== undefined && __tok.type === "thematic" && __tok.value === "---") {
    return parseMarkdownLeaf__alt15(state);
  }
  else if (__tok !== undefined && __tok.type === "thematicStar" && __tok.value === "***") {
    return parseMarkdownLeaf__alt16(state);
  }
  else if (__tok !== undefined && __tok.type === "thematicUnderscore" && __tok.value === "___") {
    return parseMarkdownLeaf__alt17(state);
  }
  else if (__tok !== undefined && __tok.type === "bold" && __tok.value === "**") {
    return parseMarkdownLeaf__alt18(state);
  }
  else if (__tok !== undefined && __tok.type === "strike" && __tok.value === "~~") {
    return parseMarkdownLeaf__alt20(state);
  }
  else if (__tok !== undefined && __tok.type === "backtick" && __tok.value === "`") {
    return parseMarkdownLeaf__alt21(state);
  }
  else if (__tok !== undefined && __tok.type === "lbracket" && __tok.value === "[") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "caret" && __tok1.value === "^") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "number") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "rbracket" && __tok3.value === "]") {
          const __tok4 = nthNonCommentToken(state, state.pos, 4);
          if (__tok4 !== undefined && __tok4.type === "colon" && __tok4.value === ":") {
            return parseMarkdownLeaf__alt34(state);
          }
          return parseMarkdownLeaf__alt35(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "rbracket" && __tok2.value === "]") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "lparen" && __tok3.value === "(") {
          return parseMarkdownLeaf__alt22(state);
        }
        else if (__tok3 !== undefined && __tok3.type === "lbracket" && __tok3.value === "[") {
          return parseMarkdownLeaf__alt23(state);
        }
        else if (__tok3 !== undefined && __tok3.type === "colon" && __tok3.value === ":") {
          return parseMarkdownLeaf__alt33(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "bang" && __tok.value === "!") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lbracket" && __tok1.value === "[") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "ident") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "rbracket" && __tok3.value === "]") {
          const __tok4 = nthNonCommentToken(state, state.pos, 4);
          if (__tok4 !== undefined && __tok4.type === "lparen" && __tok4.value === "(") {
            return parseMarkdownLeaf__alt24(state);
          }
          else if (__tok4 !== undefined && __tok4.type === "lbracket" && __tok4.value === "[") {
            return parseMarkdownLeaf__alt25(state);
          }
          throw new SyntaxError('no production matched');
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "colon" && __tok2.value === ":") {
        return parseMarkdownLeaf__alt26(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "gt" && __tok2.value === ">") {
        return parseMarkdownLeaf__alt36(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "ampersand" && __tok.value === "&") {
    return parseMarkdownLeaf__alt27(state);
  }
  else if (__tok !== undefined && __tok.type === "fence" && __tok.value === "```") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "fence" && __tok2.value === "```") {
        return parseMarkdownLeaf__alt29(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return parseMarkdownLeaf__alt28(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "pipe" && __tok.value === "|") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "thematic" && __tok1.value === "---") {
      return parseMarkdownLeaf__alt31(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "colon" && __tok1.value === ":") {
      return parseMarkdownLeaf__alt32(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return parseMarkdownLeaf__alt30(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "thematic" && __tok2.value === "---") {
        return parseMarkdownLeaf__alt6(state);
      }
      return parseMarkdownLeaf__alt7(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "number") {
    return parseMarkdownLeaf__alt11(state);
  }
  throw new SyntaxError('no production matched');
}

function parseMarkdownDocumentFast(state: State): unknown {

  const children: unknown[] = [];
  while (!(state.pos >= state.tokens.length)) {
    const __before = state.pos;
    const __child = parseMarkdownLeafFast(state);
    children.push(__child);
    if (state.pos === __before) break;
  }
  return { type: "document", children: children };
}

function parseMarkdownLeafFast__alt0(state: State): unknown {
  expectLiteral(state, "hash", "#");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "heading", depth: 1, text: [first, second] };
}

function parseMarkdownLeafFast__alt1(state: State): unknown {
  expectLiteral(state, "##", "##");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "heading", depth: 2, text: [first, second] };
}

function parseMarkdownLeafFast__alt2(state: State): unknown {
  expectLiteral(state, "###", "###");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "heading", depth: 3, text: [first, second] };
}

function parseMarkdownLeafFast__alt3(state: State): unknown {
  expectLiteral(state, "####", "####");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "heading", depth: 4, text: [first, second] };
}

function parseMarkdownLeafFast__alt4(state: State): unknown {
  expectLiteral(state, "#####", "#####");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "heading", depth: 5, text: [first, second] };
}

function parseMarkdownLeafFast__alt5(state: State): unknown {
  expectLiteral(state, "######", "######");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "heading", depth: 6, text: [first, second] };
}

function parseMarkdownLeafFast__alt6(state: State): unknown {
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  expectLiteral(state, "thematic", "---");
  return { type: "heading", depth: 2, text: [first, second], style: "setext" };
}

function parseMarkdownLeafFast__alt7(state: State): unknown {
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "paragraph", text: [first, second] };
}

function parseMarkdownLeafFast__alt8(state: State): unknown {
  expectLiteral(state, "dash", "-");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "list-item", ordered: false, text: [first, second] };
}

function parseMarkdownLeafFast__alt9(state: State): unknown {
  expectLiteral(state, "plus", "+");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "list-item", ordered: false, marker: "+", text: [first, second] };
}

function parseMarkdownLeafFast__alt10(state: State): unknown {
  expectLiteral(state, "italic", "*");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "list-item", ordered: false, marker: "*", text: [first, second] };
}

function parseMarkdownLeafFast__alt11(state: State): unknown {
  const index = expectClass(state, "number");

  expectLiteral(state, "dot", ".");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "list-item", ordered: true, index: index, text: [first, second] };
}

function parseMarkdownLeafFast__alt12(state: State): unknown {
  expectLiteral(state, "dash", "-");
  expectLiteral(state, "lbracket", "[");
  const checked = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "task-list-item", checked: true, marker: checked, text: [first, second] };
}

function parseMarkdownLeafFast__alt13(state: State): unknown {
  expectLiteral(state, "dash", "-");
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "rbracket", "]");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "task-list-item", checked: false, text: [first, second] };
}

function parseMarkdownLeafFast__alt14(state: State): unknown {
  expectLiteral(state, "gt", ">");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "blockquote", text: [first, second] };
}

function parseMarkdownLeafFast__alt15(state: State): unknown {
  expectLiteral(state, "thematic", "---");
  return { type: "thematic-break" };
}

function parseMarkdownLeafFast__alt16(state: State): unknown {
  expectLiteral(state, "thematicStar", "***");
  return { type: "thematic-break", marker: "*" };
}

function parseMarkdownLeafFast__alt17(state: State): unknown {
  expectLiteral(state, "thematicUnderscore", "___");
  return { type: "thematic-break", marker: "_" };
}

function parseMarkdownLeafFast__alt18(state: State): unknown {
  expectLiteral(state, "bold", "**");
  const value = expectClass(state, "ident");

  expectLiteral(state, "bold", "**");
  return { type: "bold", text: value };
}

function parseMarkdownLeafFast__alt19(state: State): unknown {
  expectLiteral(state, "italic", "*");
  const value = expectClass(state, "ident");

  expectLiteral(state, "italic", "*");
  return { type: "italic", text: value };
}

function parseMarkdownLeafFast__alt20(state: State): unknown {
  expectLiteral(state, "strike", "~~");
  const value = expectClass(state, "ident");

  expectLiteral(state, "strike", "~~");
  return { type: "strikethrough", text: value };
}

function parseMarkdownLeafFast__alt21(state: State): unknown {
  expectLiteral(state, "backtick", "`");
  const value = expectClass(state, "ident");

  expectLiteral(state, "backtick", "`");
  return { type: "inline-code", text: value };
}

function parseMarkdownLeafFast__alt22(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  const label = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lparen", "(");
  const scheme = expectClass(state, "ident");

  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  expectLiteral(state, "rparen", ")");
  return { type: "link", label: label, scheme: scheme, host: [host, tld] };
}

function parseMarkdownLeafFast__alt23(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  const label = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  return { type: "reference-link", label: label, id: id };
}

function parseMarkdownLeafFast__alt24(state: State): unknown {
  expectLiteral(state, "bang", "!");
  expectLiteral(state, "lbracket", "[");
  const alt = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lparen", "(");
  const scheme = expectClass(state, "ident");

  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  expectLiteral(state, "slash", "/");
  const path = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const ext = expectClass(state, "ident");

  expectLiteral(state, "rparen", ")");
  return { type: "image", alt: alt, scheme: scheme, host: [host, tld], path: [path, ext] };
}

function parseMarkdownLeafFast__alt25(state: State): unknown {
  expectLiteral(state, "bang", "!");
  expectLiteral(state, "lbracket", "[");
  const alt = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  return { type: "reference-image", alt: alt, id: id };
}

function parseMarkdownLeafFast__alt26(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const scheme = expectClass(state, "ident");

  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  return { type: "autolink", scheme: scheme, host: [host, tld] };
}

function parseMarkdownLeafFast__alt27(state: State): unknown {
  expectLiteral(state, "ampersand", "&");
  const name = expectClass(state, "ident");

  expectLiteral(state, "semicolon", ";");
  return { type: "entity", name: name };
}

function parseMarkdownLeafFast__alt28(state: State): unknown {
  expectLiteral(state, "fence", "```");
  const lang = expectClass(state, "ident");

  const body = expectClass(state, "ident");

  expectLiteral(state, "fence", "```");
  return { type: "code-block", lang: lang, text: body };
}

function parseMarkdownLeafFast__alt29(state: State): unknown {
  expectLiteral(state, "fence", "```");
  const body = expectClass(state, "ident");

  expectLiteral(state, "fence", "```");
  return { type: "code-block", text: body };
}

function parseMarkdownLeafFast__alt30(state: State): unknown {
  expectLiteral(state, "pipe", "|");
  const first = expectClass(state, "ident");

  expectLiteral(state, "pipe", "|");
  const second = expectClass(state, "ident");

  expectLiteral(state, "pipe", "|");
  return { type: "table-row", cells: [first, second] };
}

function parseMarkdownLeafFast__alt31(state: State): unknown {
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  return { type: "table-delimiter", align: ["default", "default"] };
}

function parseMarkdownLeafFast__alt32(state: State): unknown {
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "pipe", "|");
  return { type: "table-delimiter", align: ["left", "right"] };
}

function parseMarkdownLeafFast__alt33(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "colon", ":");
  const scheme = expectClass(state, "ident");

  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  return { type: "definition", id: id, scheme: scheme, host: [host, tld] };
}

function parseMarkdownLeafFast__alt34(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "caret", "^");
  const id = expectClass(state, "number");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "colon", ":");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return { type: "footnote-definition", id: id, text: [first, second] };
}

function parseMarkdownLeafFast__alt35(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "caret", "^");
  const id = expectClass(state, "number");

  expectLiteral(state, "rbracket", "]");
  return { type: "footnote-reference", id: id };
}

function parseMarkdownLeafFast__alt36(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  const body = expectClass(state, "ident");

  expectLiteral(state, "lt", "<");
  expectLiteral(state, "slash", "/");
  const closingTag = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  return { type: "html", tag: tag, text: body, closingTag: closingTag };
}

function parseMarkdownLeafFast(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "hash" && __tok.value === "#") {
    return parseMarkdownLeafFast__alt0(state);
  }
  else if (__tok !== undefined && __tok.type === "##" && __tok.value === "##") {
    return parseMarkdownLeafFast__alt1(state);
  }
  else if (__tok !== undefined && __tok.type === "###" && __tok.value === "###") {
    return parseMarkdownLeafFast__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "####" && __tok.value === "####") {
    return parseMarkdownLeafFast__alt3(state);
  }
  else if (__tok !== undefined && __tok.type === "#####" && __tok.value === "#####") {
    return parseMarkdownLeafFast__alt4(state);
  }
  else if (__tok !== undefined && __tok.type === "######" && __tok.value === "######") {
    return parseMarkdownLeafFast__alt5(state);
  }
  else if (__tok !== undefined && __tok.type === "dash" && __tok.value === "-") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lbracket" && __tok1.value === "[") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "rbracket" && __tok2.value === "]") {
        return parseMarkdownLeafFast__alt13(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return parseMarkdownLeafFast__alt12(state);
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return parseMarkdownLeafFast__alt8(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "plus" && __tok.value === "+") {
    return parseMarkdownLeafFast__alt9(state);
  }
  else if (__tok !== undefined && __tok.type === "italic" && __tok.value === "*") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "italic" && __tok2.value === "*") {
        return parseMarkdownLeafFast__alt19(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return parseMarkdownLeafFast__alt10(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "gt" && __tok.value === ">") {
    return parseMarkdownLeafFast__alt14(state);
  }
  else if (__tok !== undefined && __tok.type === "thematic" && __tok.value === "---") {
    return parseMarkdownLeafFast__alt15(state);
  }
  else if (__tok !== undefined && __tok.type === "thematicStar" && __tok.value === "***") {
    return parseMarkdownLeafFast__alt16(state);
  }
  else if (__tok !== undefined && __tok.type === "thematicUnderscore" && __tok.value === "___") {
    return parseMarkdownLeafFast__alt17(state);
  }
  else if (__tok !== undefined && __tok.type === "bold" && __tok.value === "**") {
    return parseMarkdownLeafFast__alt18(state);
  }
  else if (__tok !== undefined && __tok.type === "strike" && __tok.value === "~~") {
    return parseMarkdownLeafFast__alt20(state);
  }
  else if (__tok !== undefined && __tok.type === "backtick" && __tok.value === "`") {
    return parseMarkdownLeafFast__alt21(state);
  }
  else if (__tok !== undefined && __tok.type === "lbracket" && __tok.value === "[") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "caret" && __tok1.value === "^") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "number") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "rbracket" && __tok3.value === "]") {
          const __tok4 = nthNonCommentToken(state, state.pos, 4);
          if (__tok4 !== undefined && __tok4.type === "colon" && __tok4.value === ":") {
            return parseMarkdownLeafFast__alt34(state);
          }
          return parseMarkdownLeafFast__alt35(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "rbracket" && __tok2.value === "]") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "lparen" && __tok3.value === "(") {
          return parseMarkdownLeafFast__alt22(state);
        }
        else if (__tok3 !== undefined && __tok3.type === "lbracket" && __tok3.value === "[") {
          return parseMarkdownLeafFast__alt23(state);
        }
        else if (__tok3 !== undefined && __tok3.type === "colon" && __tok3.value === ":") {
          return parseMarkdownLeafFast__alt33(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "bang" && __tok.value === "!") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lbracket" && __tok1.value === "[") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "ident") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "rbracket" && __tok3.value === "]") {
          const __tok4 = nthNonCommentToken(state, state.pos, 4);
          if (__tok4 !== undefined && __tok4.type === "lparen" && __tok4.value === "(") {
            return parseMarkdownLeafFast__alt24(state);
          }
          else if (__tok4 !== undefined && __tok4.type === "lbracket" && __tok4.value === "[") {
            return parseMarkdownLeafFast__alt25(state);
          }
          throw new SyntaxError('no production matched');
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "colon" && __tok2.value === ":") {
        return parseMarkdownLeafFast__alt26(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "gt" && __tok2.value === ">") {
        return parseMarkdownLeafFast__alt36(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "ampersand" && __tok.value === "&") {
    return parseMarkdownLeafFast__alt27(state);
  }
  else if (__tok !== undefined && __tok.type === "fence" && __tok.value === "```") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "fence" && __tok2.value === "```") {
        return parseMarkdownLeafFast__alt29(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return parseMarkdownLeafFast__alt28(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "pipe" && __tok.value === "|") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "thematic" && __tok1.value === "---") {
      return parseMarkdownLeafFast__alt31(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "colon" && __tok1.value === ":") {
      return parseMarkdownLeafFast__alt32(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return parseMarkdownLeafFast__alt30(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "thematic" && __tok2.value === "---") {
        return parseMarkdownLeafFast__alt6(state);
      }
      return parseMarkdownLeafFast__alt7(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "number") {
    return parseMarkdownLeafFast__alt11(state);
  }
  throw new SyntaxError('no production matched');
}

function validateMarkdownDocument(state: State): unknown {
  let __count_children = 0;
  while (!(state.pos >= state.tokens.length)) {
    const __before = state.pos;
    validateMarkdownLeaf(state);
    __count_children++;
    if (state.pos === __before) break;
  }
  return;
}

function validateMarkdownLeaf__alt0(state: State): unknown {
  expectLiteral(state, "hash", "#");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt1(state: State): unknown {
  expectLiteral(state, "##", "##");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt2(state: State): unknown {
  expectLiteral(state, "###", "###");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt3(state: State): unknown {
  expectLiteral(state, "####", "####");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt4(state: State): unknown {
  expectLiteral(state, "#####", "#####");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt5(state: State): unknown {
  expectLiteral(state, "######", "######");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt6(state: State): unknown {
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  expectLiteral(state, "thematic", "---");
  return;
}

function validateMarkdownLeaf__alt7(state: State): unknown {
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt8(state: State): unknown {
  expectLiteral(state, "dash", "-");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt9(state: State): unknown {
  expectLiteral(state, "plus", "+");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt10(state: State): unknown {
  expectLiteral(state, "italic", "*");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt11(state: State): unknown {
  const index = expectClass(state, "number");

  expectLiteral(state, "dot", ".");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt12(state: State): unknown {
  expectLiteral(state, "dash", "-");
  expectLiteral(state, "lbracket", "[");
  const checked = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt13(state: State): unknown {
  expectLiteral(state, "dash", "-");
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "rbracket", "]");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt14(state: State): unknown {
  expectLiteral(state, "gt", ">");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt15(state: State): unknown {
  expectLiteral(state, "thematic", "---");
  return;
}

function validateMarkdownLeaf__alt16(state: State): unknown {
  expectLiteral(state, "thematicStar", "***");
  return;
}

function validateMarkdownLeaf__alt17(state: State): unknown {
  expectLiteral(state, "thematicUnderscore", "___");
  return;
}

function validateMarkdownLeaf__alt18(state: State): unknown {
  expectLiteral(state, "bold", "**");
  const value = expectClass(state, "ident");

  expectLiteral(state, "bold", "**");
  return;
}

function validateMarkdownLeaf__alt19(state: State): unknown {
  expectLiteral(state, "italic", "*");
  const value = expectClass(state, "ident");

  expectLiteral(state, "italic", "*");
  return;
}

function validateMarkdownLeaf__alt20(state: State): unknown {
  expectLiteral(state, "strike", "~~");
  const value = expectClass(state, "ident");

  expectLiteral(state, "strike", "~~");
  return;
}

function validateMarkdownLeaf__alt21(state: State): unknown {
  expectLiteral(state, "backtick", "`");
  const value = expectClass(state, "ident");

  expectLiteral(state, "backtick", "`");
  return;
}

function validateMarkdownLeaf__alt22(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  const label = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lparen", "(");
  const scheme = expectClass(state, "ident");

  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  expectLiteral(state, "rparen", ")");
  return;
}

function validateMarkdownLeaf__alt23(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  const label = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  return;
}

function validateMarkdownLeaf__alt24(state: State): unknown {
  expectLiteral(state, "bang", "!");
  expectLiteral(state, "lbracket", "[");
  const alt = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lparen", "(");
  const scheme = expectClass(state, "ident");

  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  expectLiteral(state, "slash", "/");
  const path = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const ext = expectClass(state, "ident");

  expectLiteral(state, "rparen", ")");
  return;
}

function validateMarkdownLeaf__alt25(state: State): unknown {
  expectLiteral(state, "bang", "!");
  expectLiteral(state, "lbracket", "[");
  const alt = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  return;
}

function validateMarkdownLeaf__alt26(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const scheme = expectClass(state, "ident");

  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  return;
}

function validateMarkdownLeaf__alt27(state: State): unknown {
  expectLiteral(state, "ampersand", "&");
  const name = expectClass(state, "ident");

  expectLiteral(state, "semicolon", ";");
  return;
}

function validateMarkdownLeaf__alt28(state: State): unknown {
  expectLiteral(state, "fence", "```");
  const lang = expectClass(state, "ident");

  const body = expectClass(state, "ident");

  expectLiteral(state, "fence", "```");
  return;
}

function validateMarkdownLeaf__alt29(state: State): unknown {
  expectLiteral(state, "fence", "```");
  const body = expectClass(state, "ident");

  expectLiteral(state, "fence", "```");
  return;
}

function validateMarkdownLeaf__alt30(state: State): unknown {
  expectLiteral(state, "pipe", "|");
  const first = expectClass(state, "ident");

  expectLiteral(state, "pipe", "|");
  const second = expectClass(state, "ident");

  expectLiteral(state, "pipe", "|");
  return;
}

function validateMarkdownLeaf__alt31(state: State): unknown {
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  return;
}

function validateMarkdownLeaf__alt32(state: State): unknown {
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "pipe", "|");
  expectLiteral(state, "thematic", "---");
  expectLiteral(state, "colon", ":");
  expectLiteral(state, "pipe", "|");
  return;
}

function validateMarkdownLeaf__alt33(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  const id = expectClass(state, "ident");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "colon", ":");
  const scheme = expectClass(state, "ident");

  expectLiteral(state, "colon", ":");
  expectLiteral(state, "slash", "/");
  expectLiteral(state, "slash", "/");
  const host = expectClass(state, "ident");

  expectLiteral(state, "dot", ".");
  const tld = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt34(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "caret", "^");
  const id = expectClass(state, "number");

  expectLiteral(state, "rbracket", "]");
  expectLiteral(state, "colon", ":");
  const first = expectClass(state, "ident");

  const second = expectClass(state, "ident");

  return;
}

function validateMarkdownLeaf__alt35(state: State): unknown {
  expectLiteral(state, "lbracket", "[");
  expectLiteral(state, "caret", "^");
  const id = expectClass(state, "number");

  expectLiteral(state, "rbracket", "]");
  return;
}

function validateMarkdownLeaf__alt36(state: State): unknown {
  expectLiteral(state, "lt", "<");
  const tag = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  const body = expectClass(state, "ident");

  expectLiteral(state, "lt", "<");
  expectLiteral(state, "slash", "/");
  const closingTag = expectClass(state, "ident");

  expectLiteral(state, "gt", ">");
  return;
}

function validateMarkdownLeaf(state: State): unknown {
  const __tok = state.tokens[state.pos];
  if (__tok !== undefined && __tok.type === "hash" && __tok.value === "#") {
    return validateMarkdownLeaf__alt0(state);
  }
  else if (__tok !== undefined && __tok.type === "##" && __tok.value === "##") {
    return validateMarkdownLeaf__alt1(state);
  }
  else if (__tok !== undefined && __tok.type === "###" && __tok.value === "###") {
    return validateMarkdownLeaf__alt2(state);
  }
  else if (__tok !== undefined && __tok.type === "####" && __tok.value === "####") {
    return validateMarkdownLeaf__alt3(state);
  }
  else if (__tok !== undefined && __tok.type === "#####" && __tok.value === "#####") {
    return validateMarkdownLeaf__alt4(state);
  }
  else if (__tok !== undefined && __tok.type === "######" && __tok.value === "######") {
    return validateMarkdownLeaf__alt5(state);
  }
  else if (__tok !== undefined && __tok.type === "dash" && __tok.value === "-") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lbracket" && __tok1.value === "[") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "rbracket" && __tok2.value === "]") {
        return validateMarkdownLeaf__alt13(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return validateMarkdownLeaf__alt12(state);
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return validateMarkdownLeaf__alt8(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "plus" && __tok.value === "+") {
    return validateMarkdownLeaf__alt9(state);
  }
  else if (__tok !== undefined && __tok.type === "italic" && __tok.value === "*") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "italic" && __tok2.value === "*") {
        return validateMarkdownLeaf__alt19(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return validateMarkdownLeaf__alt10(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "gt" && __tok.value === ">") {
    return validateMarkdownLeaf__alt14(state);
  }
  else if (__tok !== undefined && __tok.type === "thematic" && __tok.value === "---") {
    return validateMarkdownLeaf__alt15(state);
  }
  else if (__tok !== undefined && __tok.type === "thematicStar" && __tok.value === "***") {
    return validateMarkdownLeaf__alt16(state);
  }
  else if (__tok !== undefined && __tok.type === "thematicUnderscore" && __tok.value === "___") {
    return validateMarkdownLeaf__alt17(state);
  }
  else if (__tok !== undefined && __tok.type === "bold" && __tok.value === "**") {
    return validateMarkdownLeaf__alt18(state);
  }
  else if (__tok !== undefined && __tok.type === "strike" && __tok.value === "~~") {
    return validateMarkdownLeaf__alt20(state);
  }
  else if (__tok !== undefined && __tok.type === "backtick" && __tok.value === "`") {
    return validateMarkdownLeaf__alt21(state);
  }
  else if (__tok !== undefined && __tok.type === "lbracket" && __tok.value === "[") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "caret" && __tok1.value === "^") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "number") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "rbracket" && __tok3.value === "]") {
          const __tok4 = nthNonCommentToken(state, state.pos, 4);
          if (__tok4 !== undefined && __tok4.type === "colon" && __tok4.value === ":") {
            return validateMarkdownLeaf__alt34(state);
          }
          return validateMarkdownLeaf__alt35(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "rbracket" && __tok2.value === "]") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "lparen" && __tok3.value === "(") {
          return validateMarkdownLeaf__alt22(state);
        }
        else if (__tok3 !== undefined && __tok3.type === "lbracket" && __tok3.value === "[") {
          return validateMarkdownLeaf__alt23(state);
        }
        else if (__tok3 !== undefined && __tok3.type === "colon" && __tok3.value === ":") {
          return validateMarkdownLeaf__alt33(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "bang" && __tok.value === "!") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "lbracket" && __tok1.value === "[") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "ident") {
        const __tok3 = nthNonCommentToken(state, state.pos, 3);
        if (__tok3 !== undefined && __tok3.type === "rbracket" && __tok3.value === "]") {
          const __tok4 = nthNonCommentToken(state, state.pos, 4);
          if (__tok4 !== undefined && __tok4.type === "lparen" && __tok4.value === "(") {
            return validateMarkdownLeaf__alt24(state);
          }
          else if (__tok4 !== undefined && __tok4.type === "lbracket" && __tok4.value === "[") {
            return validateMarkdownLeaf__alt25(state);
          }
          throw new SyntaxError('no production matched');
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "lt" && __tok.value === "<") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "colon" && __tok2.value === ":") {
        return validateMarkdownLeaf__alt26(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "gt" && __tok2.value === ">") {
        return validateMarkdownLeaf__alt36(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "ampersand" && __tok.value === "&") {
    return validateMarkdownLeaf__alt27(state);
  }
  else if (__tok !== undefined && __tok.type === "fence" && __tok.value === "```") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "fence" && __tok2.value === "```") {
        return validateMarkdownLeaf__alt29(state);
      }
      else if (__tok2 !== undefined && __tok2.type === "ident") {
        return validateMarkdownLeaf__alt28(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "pipe" && __tok.value === "|") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "thematic" && __tok1.value === "---") {
      return validateMarkdownLeaf__alt31(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "colon" && __tok1.value === ":") {
      return validateMarkdownLeaf__alt32(state);
    }
    else if (__tok1 !== undefined && __tok1.type === "ident") {
      return validateMarkdownLeaf__alt30(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "ident") {
    const __tok1 = nthNonCommentToken(state, state.pos, 1);
    if (__tok1 !== undefined && __tok1.type === "ident") {
      const __tok2 = nthNonCommentToken(state, state.pos, 2);
      if (__tok2 !== undefined && __tok2.type === "thematic" && __tok2.value === "---") {
        return validateMarkdownLeaf__alt6(state);
      }
      return validateMarkdownLeaf__alt7(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tok !== undefined && __tok.type === "number") {
    return validateMarkdownLeaf__alt11(state);
  }
  throw new SyntaxError('no production matched');
}

export function parse(input: string, options: ParseOptions = {}): unknown {
  const mode = options.mode ?? 'fast';
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
    const result = mode === 'raws' ? parseMarkdownDocument(state) : parseMarkdownDocumentFast(state);
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

export function validate(input: string, options: ParseOptions = {}): void {
  if (options.validate === true && false) {
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
    validateMarkdownDocument(state);
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
  module: "@parser2/markdown",
  exportName: 'validate',
};

export function countTokens(input: string): number {
  return tokenize(input).length;
}


export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}
