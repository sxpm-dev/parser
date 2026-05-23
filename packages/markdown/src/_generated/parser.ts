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

const __TYPE_ID__23_23 = 0;
const __TYPE_ID__23_23_23 = 1;
const __TYPE_ID__23_23_23_23 = 2;
const __TYPE_ID__23_23_23_23_23 = 3;
const __TYPE_ID__23_23_23_23_23_23 = 4;
const __TYPE_ID_AMPERSAND = 5;
const __TYPE_ID_BACKTICK = 6;
const __TYPE_ID_BANG = 7;
const __TYPE_ID_BOLD = 8;
const __TYPE_ID_CARET = 9;
const __TYPE_ID_COLON = 10;
const __TYPE_ID_DASH = 11;
const __TYPE_ID_DOT = 12;
const __TYPE_ID_EQUALS = 13;
const __TYPE_ID_FENCE = 14;
const __TYPE_ID_GT = 15;
const __TYPE_ID_HASH = 16;
const __TYPE_ID_IDENT = 17;
const __TYPE_ID_ITALIC = 18;
const __TYPE_ID_LBRACKET = 19;
const __TYPE_ID_LPAREN = 20;
const __TYPE_ID_LT = 21;
const __TYPE_ID_NUMBER = 22;
const __TYPE_ID_PIPE = 23;
const __TYPE_ID_PLUS = 24;
const __TYPE_ID_QUOTE = 25;
const __TYPE_ID_RBRACKET = 26;
const __TYPE_ID_RPAREN = 27;
const __TYPE_ID_SEMICOLON = 28;
const __TYPE_ID_SLASH = 29;
const __TYPE_ID_STRIKE = 30;
const __TYPE_ID_THEMATIC = 31;
const __TYPE_ID_THEMATICSTAR = 32;
const __TYPE_ID_THEMATICUNDERSCORE = 33;

const __TYPE_NAMES_BY_ID: readonly string[] = ["##","###","####","#####","######","ampersand","backtick","bang","bold","caret","colon","dash","dot","equals","fence","gt","hash","ident","italic","lbracket","lparen","lt","number","pipe","plus","quote","rbracket","rparen","semicolon","slash","strike","thematic","thematicStar","thematicUnderscore"];
const __COMMENT_TYPE_ID = -1;

type TokenizerOutput = {
  types: Uint16Array;
  starts: Uint32Array;
  ends: Uint32Array;
  count: number;
  hasComments: boolean;
};

// Runs the scanner over `input` and returns the populated typed arrays.
// Capacity grows geometrically — empirical token density is ~0.2 tokens
// per source byte for ASCII-heavy markup; `length >> 2` is a safe start.
function __tokenize(input: string): TokenizerOutput {
  const len = input.length;
  let capacity = len > 256 ? len >> 2 : 64;
  let types = new Uint16Array(capacity);
  let starts = new Uint32Array(capacity);
  let ends = new Uint32Array(capacity);
  let count = 0;
  let hasComments = false;
  const __grow = (): void => {
    capacity = capacity * 2;
    const t2 = new Uint16Array(capacity); t2.set(types); types = t2;
    const s2 = new Uint32Array(capacity); s2.set(starts); starts = s2;
    const e2 = new Uint32Array(capacity); e2.set(ends); ends = e2;
  };
  let i = 0;
  while (i < len) {
    const c = input.charCodeAt(i);
    // whitespace (skip)
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { i++; continue; }
    switch (c) {
      case 35: {
        if (input.startsWith("######", i)) { if (count === capacity) __grow(); types[count] = 4; starts[count] = i; ends[count] = i + 6; count++; i += 6; continue; }
        if (input.startsWith("#####", i)) { if (count === capacity) __grow(); types[count] = 3; starts[count] = i; ends[count] = i + 5; count++; i += 5; continue; }
        if (input.startsWith("####", i)) { if (count === capacity) __grow(); types[count] = 2; starts[count] = i; ends[count] = i + 4; count++; i += 4; continue; }
        if (input.startsWith("###", i)) { if (count === capacity) __grow(); types[count] = 1; starts[count] = i; ends[count] = i + 3; count++; i += 3; continue; }
        if (input.startsWith("##", i)) { if (count === capacity) __grow(); types[count] = 0; starts[count] = i; ends[count] = i + 2; count++; i += 2; continue; }
        break;
      }
      case 42: {
        if (input.startsWith("***", i)) { if (count === capacity) __grow(); types[count] = 32; starts[count] = i; ends[count] = i + 3; count++; i += 3; continue; }
        if (input.startsWith("**", i)) { if (count === capacity) __grow(); types[count] = 8; starts[count] = i; ends[count] = i + 2; count++; i += 2; continue; }
        break;
      }
      case 45: {
        if (input.startsWith("---", i)) { if (count === capacity) __grow(); types[count] = 31; starts[count] = i; ends[count] = i + 3; count++; i += 3; continue; }
        break;
      }
      case 95: {
        if (input.startsWith("___", i)) { if (count === capacity) __grow(); types[count] = 33; starts[count] = i; ends[count] = i + 3; count++; i += 3; continue; }
        break;
      }
      case 96: {
        if (input.startsWith("```", i)) { if (count === capacity) __grow(); types[count] = 14; starts[count] = i; ends[count] = i + 3; count++; i += 3; continue; }
        break;
      }
      case 126: {
        if (input.startsWith("~~", i)) { if (count === capacity) __grow(); types[count] = 30; starts[count] = i; ends[count] = i + 2; count++; i += 2; continue; }
        break;
      }
    }

    switch (c) {
      case 33: if (count === capacity) __grow(); types[count] = 7; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 34: if (count === capacity) __grow(); types[count] = 25; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 35: if (count === capacity) __grow(); types[count] = 16; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 38: if (count === capacity) __grow(); types[count] = 5; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 40: if (count === capacity) __grow(); types[count] = 20; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 41: if (count === capacity) __grow(); types[count] = 27; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 42: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 43: if (count === capacity) __grow(); types[count] = 24; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 45: if (count === capacity) __grow(); types[count] = 11; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 46: if (count === capacity) __grow(); types[count] = 12; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 47: if (count === capacity) __grow(); types[count] = 29; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 58: if (count === capacity) __grow(); types[count] = 10; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 59: if (count === capacity) __grow(); types[count] = 28; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 60: if (count === capacity) __grow(); types[count] = 21; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 61: if (count === capacity) __grow(); types[count] = 13; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 62: if (count === capacity) __grow(); types[count] = 15; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 91: if (count === capacity) __grow(); types[count] = 19; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 93: if (count === capacity) __grow(); types[count] = 26; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 94: if (count === capacity) __grow(); types[count] = 9; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 96: if (count === capacity) __grow(); types[count] = 6; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 124: if (count === capacity) __grow(); types[count] = 23; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
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
      if (count === capacity) __grow(); types[count] = 22; starts[count] = start; ends[count] = i; count++;
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
      if (count === capacity) __grow(); types[count] = 17; starts[count] = start; ends[count] = i; count++;
      continue;
    }

    throw new SyntaxError(`Unexpected character '${input[i]}' at position ${i}`);
  }
  return { types, starts, ends, count, hasComments };
}

export function tokenize(input: string): Token[] {
  const out = __tokenize(input);
  const tokens: Token[] = new Array(out.count);
  for (let i = 0; i < out.count; i++) {
    const s = out.starts[i];
    const e = out.ends[i];
    tokens[i] = { type: __TYPE_NAMES_BY_ID[out.types[i]], value: input.slice(s, e), start: s, end: e };
  }
  return tokens;
}

type State = {
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
    throw new SyntaxError(`expected '${literal}' at token ${pos}`);
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
    throw new SyntaxError(`expected '${literal}' at token ${pos}`);
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
    throw new SyntaxError(`expected token of class '${className}' at token ${pos}`);
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

// Skip comment tokens starting at `pos`; return the resulting index.
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
// token whose type ID matches `stopId0..2` (-1 = absent slot). Multi-literal
// types (e.g. HTML's 'delim' covering many single chars) require a value
// check too — codegen passes the literal text via `stopVal0..2`; empty
// string = single-literal type (no value check needed).
//
// When `balanced` is true, bracket pairs () [] {} nest, tracked by leading
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
  if (prevEnd === 0 && /^\s*$/.test(slice)) {
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
}

function parseMarkdownDocument(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(state.pos >= state.count)) {
    const __before = state.pos;
    const __child = parseMarkdownLeaf(state);
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "document", children: children };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt0(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_HASH, "#");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 1, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt1(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID__23_23, "##");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 2, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt2(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID__23_23_23, "###");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 3, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt3(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID__23_23_23_23, "####");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 4, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt4(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID__23_23_23_23_23, "#####");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 5, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt5(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID__23_23_23_23_23_23, "######");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 6, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt6(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "heading", depth: 2, text: [first, second], style: "setext" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt7(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "paragraph", text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt8(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt9(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_PLUS, "+");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, marker: "+", text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt10(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, marker: "*", text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt11(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const index = expectClassId(state, __TYPE_ID_NUMBER, "number");

  const __index_start = state.starts[state.pos - 1];
  const __index_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "list-item", ordered: true, index: index, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt12(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const checked = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __checked_start = state.starts[state.pos - 1];
  const __checked_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "task-list-item", checked: true, marker: checked, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt13(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "task-list-item", checked: false, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt14(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "blockquote", text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt15(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "thematic-break" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt16(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_THEMATICSTAR, "***");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "thematic-break", marker: "*" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt17(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_THEMATICUNDERSCORE, "___");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "thematic-break", marker: "_" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt18(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_BOLD, "**");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __value_start = state.starts[state.pos - 1];
  const __value_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_BOLD, "**");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "bold", text: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt19(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __value_start = state.starts[state.pos - 1];
  const __value_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "italic", text: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt20(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_STRIKE, "~~");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __value_start = state.starts[state.pos - 1];
  const __value_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_STRIKE, "~~");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "strikethrough", text: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt21(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_BACKTICK, "`");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __value_start = state.starts[state.pos - 1];
  const __value_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_BACKTICK, "`");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "inline-code", text: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt22(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const label = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __label_start = state.starts[state.pos - 1];
  const __label_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LPAREN, "(");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __scheme_start = state.starts[state.pos - 1];
  const __scheme_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __host_start = state.starts[state.pos - 1];
  const __host_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tld_start = state.starts[state.pos - 1];
  const __tld_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RPAREN, ")");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "link", label: label, scheme: scheme, host: [host, tld] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt23(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const label = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __label_start = state.starts[state.pos - 1];
  const __label_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __id_start = state.starts[state.pos - 1];
  const __id_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "reference-link", label: label, id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt24(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_BANG, "!");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const alt = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __alt_start = state.starts[state.pos - 1];
  const __alt_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LPAREN, "(");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __scheme_start = state.starts[state.pos - 1];
  const __scheme_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __host_start = state.starts[state.pos - 1];
  const __host_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tld_start = state.starts[state.pos - 1];
  const __tld_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const path = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __path_start = state.starts[state.pos - 1];
  const __path_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const ext = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __ext_start = state.starts[state.pos - 1];
  const __ext_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RPAREN, ")");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "image", alt: alt, scheme: scheme, host: [host, tld], path: [path, ext] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt25(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_BANG, "!");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const alt = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __alt_start = state.starts[state.pos - 1];
  const __alt_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __id_start = state.starts[state.pos - 1];
  const __id_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "reference-image", alt: alt, id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt26(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __scheme_start = state.starts[state.pos - 1];
  const __scheme_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __host_start = state.starts[state.pos - 1];
  const __host_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tld_start = state.starts[state.pos - 1];
  const __tld_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "autolink", scheme: scheme, host: [host, tld] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt27(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_AMPERSAND, "&");
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __name_start = state.starts[state.pos - 1];
  const __name_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_SEMICOLON, ";");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "entity", name: name };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt28(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  const lang = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __lang_start = state.starts[state.pos - 1];
  const __lang_end = state.ends[state.pos - 1];
  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __body_start = state.starts[state.pos - 1];
  const __body_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "code-block", lang: lang, text: body };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt29(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __body_start = state.starts[state.pos - 1];
  const __body_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "code-block", text: body };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt30(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "table-row", cells: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt31(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "table-delimiter", align: ["default", "default"] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt32(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "table-delimiter", align: ["left", "right"] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt33(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __id_start = state.starts[state.pos - 1];
  const __id_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __scheme_start = state.starts[state.pos - 1];
  const __scheme_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __host_start = state.starts[state.pos - 1];
  const __host_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tld_start = state.starts[state.pos - 1];
  const __tld_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "definition", id: id, scheme: scheme, host: [host, tld] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt34(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_CARET, "^");
  const id = expectClassId(state, __TYPE_ID_NUMBER, "number");

  const __id_start = state.starts[state.pos - 1];
  const __id_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __first_start = state.starts[state.pos - 1];
  const __first_end = state.ends[state.pos - 1];
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __second_start = state.starts[state.pos - 1];
  const __second_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "footnote-definition", id: id, text: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt35(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_CARET, "^");
  const id = expectClassId(state, __TYPE_ID_NUMBER, "number");

  const __id_start = state.starts[state.pos - 1];
  const __id_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "footnote-reference", id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf__alt36(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __body_start = state.starts[state.pos - 1];
  const __body_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_LT, "<");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const closingTag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __closingTag_start = state.starts[state.pos - 1];
  const __closingTag_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { type: "html", tag: tag, text: body, closingTag: closingTag };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMarkdownLeaf(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_HASH) {
    return parseMarkdownLeaf__alt0(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23) {
    return parseMarkdownLeaf__alt1(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23) {
    return parseMarkdownLeaf__alt2(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23) {
    return parseMarkdownLeaf__alt3(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23_23) {
    return parseMarkdownLeaf__alt4(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23_23_23) {
    return parseMarkdownLeaf__alt5(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DASH) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_LBRACKET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_RBRACKET) {
        return parseMarkdownLeaf__alt13(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return parseMarkdownLeaf__alt12(state);
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return parseMarkdownLeaf__alt8(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_PLUS) {
    return parseMarkdownLeaf__alt9(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_ITALIC) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_ITALIC) {
        return parseMarkdownLeaf__alt19(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return parseMarkdownLeaf__alt10(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_GT) {
    return parseMarkdownLeaf__alt14(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATIC) {
    return parseMarkdownLeaf__alt15(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATICSTAR) {
    return parseMarkdownLeaf__alt16(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATICUNDERSCORE) {
    return parseMarkdownLeaf__alt17(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BOLD) {
    return parseMarkdownLeaf__alt18(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_STRIKE) {
    return parseMarkdownLeaf__alt20(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BACKTICK) {
    return parseMarkdownLeaf__alt21(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LBRACKET) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_CARET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_NUMBER) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_RBRACKET) {
          const __tokIdx4 = nthNonCommentPos(state, state.pos, 4);
          if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_COLON) {
            return parseMarkdownLeaf__alt34(state);
          }
          return parseMarkdownLeaf__alt35(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_RBRACKET) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_LPAREN) {
          return parseMarkdownLeaf__alt22(state);
        }
        else if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_LBRACKET) {
          return parseMarkdownLeaf__alt23(state);
        }
        else if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_COLON) {
          return parseMarkdownLeaf__alt33(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BANG) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_LBRACKET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_RBRACKET) {
          const __tokIdx4 = nthNonCommentPos(state, state.pos, 4);
          if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_LPAREN) {
            return parseMarkdownLeaf__alt24(state);
          }
          else if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_LBRACKET) {
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
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_COLON) {
        return parseMarkdownLeaf__alt26(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_GT) {
        return parseMarkdownLeaf__alt36(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_AMPERSAND) {
    return parseMarkdownLeaf__alt27(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_FENCE) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_FENCE) {
        return parseMarkdownLeaf__alt29(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return parseMarkdownLeaf__alt28(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_PIPE) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_THEMATIC) {
      return parseMarkdownLeaf__alt31(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_COLON) {
      return parseMarkdownLeaf__alt32(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return parseMarkdownLeaf__alt30(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_IDENT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_THEMATIC) {
        return parseMarkdownLeaf__alt6(state);
      }
      return parseMarkdownLeaf__alt7(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_NUMBER) {
    return parseMarkdownLeaf__alt11(state);
  }
  throw new SyntaxError('no production matched');
}

function parseMarkdownDocumentFast(state: State): unknown {

  const children: unknown[] = [];
  while (!(state.pos >= state.count)) {
    const __before = state.pos;
    const __child = parseMarkdownLeafFast(state);
    children.push(__child);
    if (state.pos === __before) break;
  }
  return { type: "document", children: children };
}

function parseMarkdownLeafFast__alt0(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_HASH, "#");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "heading", depth: 1, text: [first, second] };
}

function parseMarkdownLeafFast__alt1(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23, "##");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "heading", depth: 2, text: [first, second] };
}

function parseMarkdownLeafFast__alt2(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23_23, "###");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "heading", depth: 3, text: [first, second] };
}

function parseMarkdownLeafFast__alt3(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23_23_23, "####");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "heading", depth: 4, text: [first, second] };
}

function parseMarkdownLeafFast__alt4(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23_23_23_23, "#####");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "heading", depth: 5, text: [first, second] };
}

function parseMarkdownLeafFast__alt5(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23_23_23_23_23, "######");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "heading", depth: 6, text: [first, second] };
}

function parseMarkdownLeafFast__alt6(state: State): unknown {
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  return { type: "heading", depth: 2, text: [first, second], style: "setext" };
}

function parseMarkdownLeafFast__alt7(state: State): unknown {
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "paragraph", text: [first, second] };
}

function parseMarkdownLeafFast__alt8(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "list-item", ordered: false, text: [first, second] };
}

function parseMarkdownLeafFast__alt9(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_PLUS, "+");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "list-item", ordered: false, marker: "+", text: [first, second] };
}

function parseMarkdownLeafFast__alt10(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "list-item", ordered: false, marker: "*", text: [first, second] };
}

function parseMarkdownLeafFast__alt11(state: State): unknown {
  const index = expectClassId(state, __TYPE_ID_NUMBER, "number");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "list-item", ordered: true, index: index, text: [first, second] };
}

function parseMarkdownLeafFast__alt12(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const checked = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "task-list-item", checked: true, marker: checked, text: [first, second] };
}

function parseMarkdownLeafFast__alt13(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "task-list-item", checked: false, text: [first, second] };
}

function parseMarkdownLeafFast__alt14(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "blockquote", text: [first, second] };
}

function parseMarkdownLeafFast__alt15(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  return { type: "thematic-break" };
}

function parseMarkdownLeafFast__alt16(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_THEMATICSTAR, "***");
  return { type: "thematic-break", marker: "*" };
}

function parseMarkdownLeafFast__alt17(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_THEMATICUNDERSCORE, "___");
  return { type: "thematic-break", marker: "_" };
}

function parseMarkdownLeafFast__alt18(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_BOLD, "**");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_BOLD, "**");
  return { type: "bold", text: value };
}

function parseMarkdownLeafFast__alt19(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  return { type: "italic", text: value };
}

function parseMarkdownLeafFast__alt20(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_STRIKE, "~~");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_STRIKE, "~~");
  return { type: "strikethrough", text: value };
}

function parseMarkdownLeafFast__alt21(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_BACKTICK, "`");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_BACKTICK, "`");
  return { type: "inline-code", text: value };
}

function parseMarkdownLeafFast__alt22(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const label = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LPAREN, "(");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RPAREN, ")");
  return { type: "link", label: label, scheme: scheme, host: [host, tld] };
}

function parseMarkdownLeafFast__alt23(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const label = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  return { type: "reference-link", label: label, id: id };
}

function parseMarkdownLeafFast__alt24(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_BANG, "!");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const alt = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LPAREN, "(");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const path = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const ext = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RPAREN, ")");
  return { type: "image", alt: alt, scheme: scheme, host: [host, tld], path: [path, ext] };
}

function parseMarkdownLeafFast__alt25(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_BANG, "!");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const alt = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  return { type: "reference-image", alt: alt, id: id };
}

function parseMarkdownLeafFast__alt26(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  return { type: "autolink", scheme: scheme, host: [host, tld] };
}

function parseMarkdownLeafFast__alt27(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_AMPERSAND, "&");
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_SEMICOLON, ";");
  return { type: "entity", name: name };
}

function parseMarkdownLeafFast__alt28(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  const lang = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  return { type: "code-block", lang: lang, text: body };
}

function parseMarkdownLeafFast__alt29(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  return { type: "code-block", text: body };
}

function parseMarkdownLeafFast__alt30(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  return { type: "table-row", cells: [first, second] };
}

function parseMarkdownLeafFast__alt31(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  return { type: "table-delimiter", align: ["default", "default"] };
}

function parseMarkdownLeafFast__alt32(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  return { type: "table-delimiter", align: ["left", "right"] };
}

function parseMarkdownLeafFast__alt33(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "definition", id: id, scheme: scheme, host: [host, tld] };
}

function parseMarkdownLeafFast__alt34(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_CARET, "^");
  const id = expectClassId(state, __TYPE_ID_NUMBER, "number");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { type: "footnote-definition", id: id, text: [first, second] };
}

function parseMarkdownLeafFast__alt35(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_CARET, "^");
  const id = expectClassId(state, __TYPE_ID_NUMBER, "number");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  return { type: "footnote-reference", id: id };
}

function parseMarkdownLeafFast__alt36(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_LT, "<");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const closingTag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  return { type: "html", tag: tag, text: body, closingTag: closingTag };
}

function parseMarkdownLeafFast(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_HASH) {
    return parseMarkdownLeafFast__alt0(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23) {
    return parseMarkdownLeafFast__alt1(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23) {
    return parseMarkdownLeafFast__alt2(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23) {
    return parseMarkdownLeafFast__alt3(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23_23) {
    return parseMarkdownLeafFast__alt4(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23_23_23) {
    return parseMarkdownLeafFast__alt5(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DASH) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_LBRACKET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_RBRACKET) {
        return parseMarkdownLeafFast__alt13(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return parseMarkdownLeafFast__alt12(state);
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return parseMarkdownLeafFast__alt8(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_PLUS) {
    return parseMarkdownLeafFast__alt9(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_ITALIC) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_ITALIC) {
        return parseMarkdownLeafFast__alt19(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return parseMarkdownLeafFast__alt10(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_GT) {
    return parseMarkdownLeafFast__alt14(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATIC) {
    return parseMarkdownLeafFast__alt15(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATICSTAR) {
    return parseMarkdownLeafFast__alt16(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATICUNDERSCORE) {
    return parseMarkdownLeafFast__alt17(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BOLD) {
    return parseMarkdownLeafFast__alt18(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_STRIKE) {
    return parseMarkdownLeafFast__alt20(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BACKTICK) {
    return parseMarkdownLeafFast__alt21(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LBRACKET) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_CARET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_NUMBER) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_RBRACKET) {
          const __tokIdx4 = nthNonCommentPos(state, state.pos, 4);
          if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_COLON) {
            return parseMarkdownLeafFast__alt34(state);
          }
          return parseMarkdownLeafFast__alt35(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_RBRACKET) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_LPAREN) {
          return parseMarkdownLeafFast__alt22(state);
        }
        else if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_LBRACKET) {
          return parseMarkdownLeafFast__alt23(state);
        }
        else if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_COLON) {
          return parseMarkdownLeafFast__alt33(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BANG) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_LBRACKET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_RBRACKET) {
          const __tokIdx4 = nthNonCommentPos(state, state.pos, 4);
          if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_LPAREN) {
            return parseMarkdownLeafFast__alt24(state);
          }
          else if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_LBRACKET) {
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
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_COLON) {
        return parseMarkdownLeafFast__alt26(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_GT) {
        return parseMarkdownLeafFast__alt36(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_AMPERSAND) {
    return parseMarkdownLeafFast__alt27(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_FENCE) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_FENCE) {
        return parseMarkdownLeafFast__alt29(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return parseMarkdownLeafFast__alt28(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_PIPE) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_THEMATIC) {
      return parseMarkdownLeafFast__alt31(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_COLON) {
      return parseMarkdownLeafFast__alt32(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return parseMarkdownLeafFast__alt30(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_IDENT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_THEMATIC) {
        return parseMarkdownLeafFast__alt6(state);
      }
      return parseMarkdownLeafFast__alt7(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_NUMBER) {
    return parseMarkdownLeafFast__alt11(state);
  }
  throw new SyntaxError('no production matched');
}

function validateMarkdownDocument(state: State): unknown {
  let __count_children = 0;
  while (!(state.pos >= state.count)) {
    const __before = state.pos;
    validateMarkdownLeaf(state);
    __count_children++;
    if (state.pos === __before) break;
  }
  return;
}

function validateMarkdownLeaf__alt0(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_HASH, "#");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt1(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23, "##");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt2(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23_23, "###");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt3(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23_23_23, "####");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt4(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23_23_23_23, "#####");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt5(state: State): unknown {
  expectLiteralId(state, __TYPE_ID__23_23_23_23_23_23, "######");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt6(state: State): unknown {
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  return;
}

function validateMarkdownLeaf__alt7(state: State): unknown {
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt8(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt9(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_PLUS, "+");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt10(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt11(state: State): unknown {
  const index = expectClassId(state, __TYPE_ID_NUMBER, "number");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt12(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const checked = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt13(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DASH, "-");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt14(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt15(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  return;
}

function validateMarkdownLeaf__alt16(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_THEMATICSTAR, "***");
  return;
}

function validateMarkdownLeaf__alt17(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_THEMATICUNDERSCORE, "___");
  return;
}

function validateMarkdownLeaf__alt18(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_BOLD, "**");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_BOLD, "**");
  return;
}

function validateMarkdownLeaf__alt19(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_ITALIC, "*");
  return;
}

function validateMarkdownLeaf__alt20(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_STRIKE, "~~");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_STRIKE, "~~");
  return;
}

function validateMarkdownLeaf__alt21(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_BACKTICK, "`");
  const value = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_BACKTICK, "`");
  return;
}

function validateMarkdownLeaf__alt22(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const label = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LPAREN, "(");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RPAREN, ")");
  return;
}

function validateMarkdownLeaf__alt23(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const label = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  return;
}

function validateMarkdownLeaf__alt24(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_BANG, "!");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const alt = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LPAREN, "(");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const path = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const ext = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RPAREN, ")");
  return;
}

function validateMarkdownLeaf__alt25(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_BANG, "!");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const alt = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  return;
}

function validateMarkdownLeaf__alt26(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  return;
}

function validateMarkdownLeaf__alt27(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_AMPERSAND, "&");
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_SEMICOLON, ";");
  return;
}

function validateMarkdownLeaf__alt28(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  const lang = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  return;
}

function validateMarkdownLeaf__alt29(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_FENCE, "```");
  return;
}

function validateMarkdownLeaf__alt30(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  return;
}

function validateMarkdownLeaf__alt31(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  return;
}

function validateMarkdownLeaf__alt32(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  expectLiteralId(state, __TYPE_ID_THEMATIC, "---");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_PIPE, "|");
  return;
}

function validateMarkdownLeaf__alt33(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  const id = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  const scheme = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_COLON, ":");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const host = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_DOT, ".");
  const tld = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt34(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_CARET, "^");
  const id = expectClassId(state, __TYPE_ID_NUMBER, "number");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  expectLiteralId(state, __TYPE_ID_COLON, ":");
  const first = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const second = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateMarkdownLeaf__alt35(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LBRACKET, "[");
  expectLiteralId(state, __TYPE_ID_CARET, "^");
  const id = expectClassId(state, __TYPE_ID_NUMBER, "number");

  expectLiteralId(state, __TYPE_ID_RBRACKET, "]");
  return;
}

function validateMarkdownLeaf__alt36(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  const body = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_LT, "<");
  expectLiteralId(state, __TYPE_ID_SLASH, "/");
  const closingTag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  return;
}

function validateMarkdownLeaf(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_HASH) {
    return validateMarkdownLeaf__alt0(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23) {
    return validateMarkdownLeaf__alt1(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23) {
    return validateMarkdownLeaf__alt2(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23) {
    return validateMarkdownLeaf__alt3(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23_23) {
    return validateMarkdownLeaf__alt4(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID__23_23_23_23_23_23) {
    return validateMarkdownLeaf__alt5(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DASH) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_LBRACKET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_RBRACKET) {
        return validateMarkdownLeaf__alt13(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return validateMarkdownLeaf__alt12(state);
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return validateMarkdownLeaf__alt8(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_PLUS) {
    return validateMarkdownLeaf__alt9(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_ITALIC) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_ITALIC) {
        return validateMarkdownLeaf__alt19(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return validateMarkdownLeaf__alt10(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_GT) {
    return validateMarkdownLeaf__alt14(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATIC) {
    return validateMarkdownLeaf__alt15(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATICSTAR) {
    return validateMarkdownLeaf__alt16(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_THEMATICUNDERSCORE) {
    return validateMarkdownLeaf__alt17(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BOLD) {
    return validateMarkdownLeaf__alt18(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_STRIKE) {
    return validateMarkdownLeaf__alt20(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BACKTICK) {
    return validateMarkdownLeaf__alt21(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LBRACKET) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_CARET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_NUMBER) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_RBRACKET) {
          const __tokIdx4 = nthNonCommentPos(state, state.pos, 4);
          if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_COLON) {
            return validateMarkdownLeaf__alt34(state);
          }
          return validateMarkdownLeaf__alt35(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_RBRACKET) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_LPAREN) {
          return validateMarkdownLeaf__alt22(state);
        }
        else if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_LBRACKET) {
          return validateMarkdownLeaf__alt23(state);
        }
        else if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_COLON) {
          return validateMarkdownLeaf__alt33(state);
        }
        throw new SyntaxError('no production matched');
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_BANG) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_LBRACKET) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        const __tokIdx3 = nthNonCommentPos(state, state.pos, 3);
        if (__tokIdx3 < state.count && state.types[__tokIdx3] === __TYPE_ID_RBRACKET) {
          const __tokIdx4 = nthNonCommentPos(state, state.pos, 4);
          if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_LPAREN) {
            return validateMarkdownLeaf__alt24(state);
          }
          else if (__tokIdx4 < state.count && state.types[__tokIdx4] === __TYPE_ID_LBRACKET) {
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
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_COLON) {
        return validateMarkdownLeaf__alt26(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_GT) {
        return validateMarkdownLeaf__alt36(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_AMPERSAND) {
    return validateMarkdownLeaf__alt27(state);
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_FENCE) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_FENCE) {
        return validateMarkdownLeaf__alt29(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_IDENT) {
        return validateMarkdownLeaf__alt28(state);
      }
      throw new SyntaxError('no production matched');
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_PIPE) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_THEMATIC) {
      return validateMarkdownLeaf__alt31(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_COLON) {
      return validateMarkdownLeaf__alt32(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return validateMarkdownLeaf__alt30(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_IDENT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_THEMATIC) {
        return validateMarkdownLeaf__alt6(state);
      }
      return validateMarkdownLeaf__alt7(state);
    }
    throw new SyntaxError('no production matched');
  }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_NUMBER) {
    return validateMarkdownLeaf__alt11(state);
  }
  throw new SyntaxError('no production matched');
}

export function parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
  let __out: ReturnType<typeof __tokenize>;
  try {
    __out = __tokenize(input);
  } catch (error) {
    throw decorateSyntaxError(input, error);
  }
  const lineStarts = mode === 'raws' ? computeLineStarts(input) : [];
  const state: State = {
    types: __out.types,
    starts: __out.starts,
    ends: __out.ends,
    count: __out.count,
    pos: 0,
    input,
    lineStarts,
    mode,
    hasComments: __out.hasComments,
    commentTypeId: __COMMENT_TYPE_ID,
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    const result = mode === 'raws' ? parseMarkdownDocument(state) : parseMarkdownDocumentFast(state);
    if (state.pos !== state.count) {
      throw syntaxErrorWithFrame(input, `unexpected trailing token at position ${state.pos}`, stateTokenOffset(state, input.length));
    }
    return result;
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, state);
    }
    throw error;
  }
}

export function validate(input: string, options?: ParseOptions): void {
  if (options?.validate === true && false) {
    parse(input, options);
    return;
  }
  let __out: ReturnType<typeof __tokenize>;
  try {
    __out = __tokenize(input);
  } catch (error) {
    throw decorateSyntaxError(input, error);
  }
  const state: State = {
    types: __out.types,
    starts: __out.starts,
    ends: __out.ends,
    count: __out.count,
    pos: 0,
    input,
    lineStarts: [],
    mode: 'fast',
    hasComments: __out.hasComments,
    commentTypeId: __COMMENT_TYPE_ID,
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    validateMarkdownDocument(state);
    if (state.pos !== state.count) {
      throw syntaxErrorWithFrame(input, `unexpected trailing token at position ${state.pos}`, stateTokenOffset(state, input.length));
    }
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, state);
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
  return __tokenize(input).count;
}


export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}
