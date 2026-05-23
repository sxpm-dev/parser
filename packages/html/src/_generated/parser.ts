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

const __TYPE_ID_CLOSEBODY = 0;
const __TYPE_ID_CLOSEDD = 1;
const __TYPE_ID_CLOSEDT = 2;
const __TYPE_ID_CLOSEHEAD = 3;
const __TYPE_ID_CLOSEHTML = 4;
const __TYPE_ID_CLOSELI = 5;
const __TYPE_ID_CLOSEOPTGROUP = 6;
const __TYPE_ID_CLOSEOPTION = 7;
const __TYPE_ID_CLOSEP = 8;
const __TYPE_ID_CLOSETAGOPEN = 9;
const __TYPE_ID_CLOSETBODY = 10;
const __TYPE_ID_CLOSETD = 11;
const __TYPE_ID_CLOSETFOOT = 12;
const __TYPE_ID_CLOSETH = 13;
const __TYPE_ID_CLOSETHEAD = 14;
const __TYPE_ID_CLOSETR = 15;
const __TYPE_ID_COMMENTCLOSE = 16;
const __TYPE_ID_COMMENTOPEN = 17;
const __TYPE_ID_DELIM = 18;
const __TYPE_ID_DOCTYPEOPEN = 19;
const __TYPE_ID_DQ = 20;
const __TYPE_ID_EQUALS = 21;
const __TYPE_ID_GT = 22;
const __TYPE_ID_IDENT = 23;
const __TYPE_ID_LT = 24;
const __TYPE_ID_NUMBER = 25;
const __TYPE_ID_RAW = 26;
const __TYPE_ID_SELFCLOSE = 27;
const __TYPE_ID_SQ = 28;

const __TYPE_NAMES_BY_ID: readonly string[] = ["closeBody","closeDd","closeDt","closeHead","closeHtml","closeLi","closeOptgroup","closeOption","closeP","closeTagOpen","closeTbody","closeTd","closeTfoot","closeTh","closeThead","closeTr","commentClose","commentOpen","delim","doctypeOpen","dq","equals","gt","ident","lt","number","raw","selfClose","sq"];
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
      case 45: {
        if (input.startsWith("-->", i)) { if (count === capacity) __grow(); types[count] = 16; starts[count] = i; ends[count] = i + 3; count++; i += 3; continue; }
        break;
      }
      case 47: {
        if (input.startsWith("/>", i)) { if (count === capacity) __grow(); types[count] = 27; starts[count] = i; ends[count] = i + 2; count++; i += 2; continue; }
        break;
      }
      case 60: {
        if (input.startsWith("</optgroup>", i)) { if (count === capacity) __grow(); types[count] = 6; starts[count] = i; ends[count] = i + 11; count++; i += 11; continue; }
        if (input.startsWith("</option>", i)) { if (count === capacity) __grow(); types[count] = 7; starts[count] = i; ends[count] = i + 9; count++; i += 9; continue; }
        if (input.startsWith("</tbody>", i)) { if (count === capacity) __grow(); types[count] = 10; starts[count] = i; ends[count] = i + 8; count++; i += 8; continue; }
        if (input.startsWith("</tfoot>", i)) { if (count === capacity) __grow(); types[count] = 12; starts[count] = i; ends[count] = i + 8; count++; i += 8; continue; }
        if (input.startsWith("</thead>", i)) { if (count === capacity) __grow(); types[count] = 14; starts[count] = i; ends[count] = i + 8; count++; i += 8; continue; }
        if (input.startsWith("</body>", i)) { if (count === capacity) __grow(); types[count] = 0; starts[count] = i; ends[count] = i + 7; count++; i += 7; continue; }
        if (input.startsWith("</head>", i)) { if (count === capacity) __grow(); types[count] = 3; starts[count] = i; ends[count] = i + 7; count++; i += 7; continue; }
        if (input.startsWith("</html>", i)) { if (count === capacity) __grow(); types[count] = 4; starts[count] = i; ends[count] = i + 7; count++; i += 7; continue; }
        if (input.startsWith("</dd>", i)) { if (count === capacity) __grow(); types[count] = 1; starts[count] = i; ends[count] = i + 5; count++; i += 5; continue; }
        if (input.startsWith("</dt>", i)) { if (count === capacity) __grow(); types[count] = 2; starts[count] = i; ends[count] = i + 5; count++; i += 5; continue; }
        if (input.startsWith("</li>", i)) { if (count === capacity) __grow(); types[count] = 5; starts[count] = i; ends[count] = i + 5; count++; i += 5; continue; }
        if (input.startsWith("</td>", i)) { if (count === capacity) __grow(); types[count] = 11; starts[count] = i; ends[count] = i + 5; count++; i += 5; continue; }
        if (input.startsWith("</th>", i)) { if (count === capacity) __grow(); types[count] = 13; starts[count] = i; ends[count] = i + 5; count++; i += 5; continue; }
        if (input.startsWith("</tr>", i)) { if (count === capacity) __grow(); types[count] = 15; starts[count] = i; ends[count] = i + 5; count++; i += 5; continue; }
        if (input.startsWith("<!--", i)) { if (count === capacity) __grow(); types[count] = 17; starts[count] = i; ends[count] = i + 4; count++; i += 4; continue; }
        if (input.startsWith("</p>", i)) { if (count === capacity) __grow(); types[count] = 8; starts[count] = i; ends[count] = i + 4; count++; i += 4; continue; }
        if (input.startsWith("<!", i)) { if (count === capacity) __grow(); types[count] = 19; starts[count] = i; ends[count] = i + 2; count++; i += 2; continue; }
        if (input.startsWith("</", i)) { if (count === capacity) __grow(); types[count] = 9; starts[count] = i; ends[count] = i + 2; count++; i += 2; continue; }
        break;
      }
    }

    switch (c) {
      case 33: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 34: if (count === capacity) __grow(); types[count] = 20; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 35: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 37: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 38: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 39: if (count === capacity) __grow(); types[count] = 28; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 40: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 41: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 42: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 43: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 44: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 46: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 47: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 58: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 59: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 60: if (count === capacity) __grow(); types[count] = 24; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 61: if (count === capacity) __grow(); types[count] = 21; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 62: if (count === capacity) __grow(); types[count] = 22; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 63: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 64: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 91: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 93: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 94: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 96: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 123: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 124: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 125: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
      case 126: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
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
      if (count === capacity) __grow(); types[count] = 25; starts[count] = start; ends[count] = i; count++;
      continue;
    }
    if (isCssIdentStart(c)) {
      const start = i;
      i++;
      while (i < len) {
        const c2 = input.charCodeAt(i);
        if (!isCssIdentPart(c2)) break;
        i++;
      }
      if (count === capacity) __grow(); types[count] = 23; starts[count] = start; ends[count] = i; count++;
      continue;
    }
    switch (c) {
      case 36: if (count === capacity) __grow(); types[count] = 18; starts[count] = i; ends[count] = i + 1; count++; i++; continue;
    }
    { if (count === capacity) __grow(); types[count] = 26; starts[count] = i; ends[count] = i + 1; count++; i++; continue; }
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

function parseHtmlDocument(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(state.pos >= state.count)) {
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#document", mode: "no-quirks", childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseDoctype__valid(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_DOCTYPEOPEN, "<!");
  const keyword = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.starts[state.pos - 1]);
  const __keyword_start = state.starts[state.pos - 1];
  const __keyword_end = state.ends[state.pos - 1];
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __name_start = state.starts[state.pos - 1];
  const __name_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#documentType", name: name, publicId: "", systemId: "", parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseDoctype__recovery0(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_DOCTYPEOPEN, "<!");
  const keyword = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.starts[state.pos - 1]);
  const __keyword_start = state.starts[state.pos - 1];
  const __keyword_end = state.ends[state.pos - 1];
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __name_start = state.starts[state.pos - 1];
  const __name_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#documentType", name: name, publicId: "", systemId: "", parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseDoctype(state: State): unknown {
  const __recoverStart = state.pos;
  try {
    return parseDoctype__valid(state);
  } catch (__validErr) {
    state.pos = __recoverStart;
    const __r0 = trySpeculate(state, parseDoctype__recovery0);
    if (__r0 !== null) return __r0;
    state.pos = __recoverStart;
    throw __validErr;
  }
}

function parseComment(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_COMMENTOPEN, "<!--");
  const data = captureUntil(state, __TYPE_ID_COMMENTCLOSE, "", -1, "", -1, "", true, false);

  const __data_start = state.__lastCaptureStart;
  const __data_end = state.__lastCaptureEnd;
  expectLiteralId(state, __TYPE_ID_COMMENTCLOSE, "-->");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#comment", data: data, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt0(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const body = captureRawUntil(state, ["</"], false);
  const __body_start = state.__lastCaptureStart;
  const __body_end = state.__lastCaptureEnd;
  expectLiteralId(state, __TYPE_ID_CLOSETAGOPEN, "</");
  const closeTag = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(closeTag.toLowerCase() === "script" || closeTag.toLowerCase() === "style" || closeTag.toLowerCase() === "textarea" || closeTag.toLowerCase() === "title")) throw new SyntaxError("expected one of script, style, textarea, title at position " + state.starts[state.pos - 1]);
  const __closeTag_start = state.starts[state.pos - 1];
  const __closeTag_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [{ nodeName: "#text", value: body, parentNode: null }], parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt1(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt2(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_SELFCLOSE))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_SELFCLOSE, "/>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt3(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSELI))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</menu>", __off) || state.input.startsWith("</li>", __off) || state.input.startsWith("</ol>", __off) || state.input.startsWith("</ul>", __off))) break;
    if (__c2 === 108 && (state.input.startsWith("<li>", __off) || state.input.startsWith("<li ", __off) || state.input.startsWith("<li/", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSELI, "</li>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt4(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEDT))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</dt>", __off) || state.input.startsWith("</dd>", __off) || state.input.startsWith("</dl>", __off))) break;
    if (__c2 === 100 && (state.input.startsWith("<dt>", __off) || state.input.startsWith("<dt ", __off) || state.input.startsWith("<dt/", __off) || state.input.startsWith("<dd>", __off) || state.input.startsWith("<dd ", __off) || state.input.startsWith("<dd/", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEDT, "</dt>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEDD, "</dd>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt5(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETR))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</tbody>", __off) || state.input.startsWith("</thead>", __off) || state.input.startsWith("</tfoot>", __off) || state.input.startsWith("</table>", __off) || state.input.startsWith("</tr>", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<tbody>", __off) || state.input.startsWith("<tbody ", __off) || state.input.startsWith("<thead>", __off) || state.input.startsWith("<thead ", __off) || state.input.startsWith("<tfoot>", __off) || state.input.startsWith("<tfoot ", __off) || state.input.startsWith("<tr>", __off) || state.input.startsWith("<tr ", __off) || state.input.startsWith("<tr/", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETR, "</tr>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt6(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETD))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</tbody>", __off) || state.input.startsWith("</thead>", __off) || state.input.startsWith("</tfoot>", __off) || state.input.startsWith("</table>", __off) || state.input.startsWith("</td>", __off) || state.input.startsWith("</th>", __off) || state.input.startsWith("</tr>", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<tbody>", __off) || state.input.startsWith("<tbody ", __off) || state.input.startsWith("<thead>", __off) || state.input.startsWith("<thead ", __off) || state.input.startsWith("<tfoot>", __off) || state.input.startsWith("<tfoot ", __off) || state.input.startsWith("<td>", __off) || state.input.startsWith("<td ", __off) || state.input.startsWith("<td/", __off) || state.input.startsWith("<th>", __off) || state.input.startsWith("<th ", __off) || state.input.startsWith("<th/", __off) || state.input.startsWith("<tr>", __off) || state.input.startsWith("<tr ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETD, "</td>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETH, "</th>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt7(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEP))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</p>", __off))) break;
    if (__c2 === 97 && (state.input.startsWith("<article>", __off) || state.input.startsWith("<article ", __off) || state.input.startsWith("<address>", __off) || state.input.startsWith("<address ", __off) || state.input.startsWith("<aside>", __off) || state.input.startsWith("<aside ", __off))) break;
    if (__c2 === 98 && (state.input.startsWith("<blockquote>", __off) || state.input.startsWith("<blockquote ", __off))) break;
    if (__c2 === 100 && (state.input.startsWith("<div>", __off) || state.input.startsWith("<div ", __off) || state.input.startsWith("<dl>", __off) || state.input.startsWith("<dl ", __off))) break;
    if (__c2 === 102 && (state.input.startsWith("<footer>", __off) || state.input.startsWith("<footer ", __off) || state.input.startsWith("<form>", __off) || state.input.startsWith("<form ", __off))) break;
    if (__c2 === 104 && (state.input.startsWith("<header>", __off) || state.input.startsWith("<header ", __off) || state.input.startsWith("<h1>", __off) || state.input.startsWith("<h1 ", __off) || state.input.startsWith("<h2>", __off) || state.input.startsWith("<h2 ", __off) || state.input.startsWith("<h3>", __off) || state.input.startsWith("<h3 ", __off) || state.input.startsWith("<h4>", __off) || state.input.startsWith("<h4 ", __off) || state.input.startsWith("<h5>", __off) || state.input.startsWith("<h5 ", __off) || state.input.startsWith("<h6>", __off) || state.input.startsWith("<h6 ", __off) || state.input.startsWith("<hr>", __off) || state.input.startsWith("<hr ", __off) || state.input.startsWith("<hr/", __off))) break;
    if (__c2 === 110 && (state.input.startsWith("<nav>", __off) || state.input.startsWith("<nav ", __off))) break;
    if (__c2 === 111 && (state.input.startsWith("<ol>", __off) || state.input.startsWith("<ol ", __off))) break;
    if (__c2 === 112 && (state.input.startsWith("<pre>", __off) || state.input.startsWith("<pre ", __off) || state.input.startsWith("<p>", __off) || state.input.startsWith("<p ", __off) || state.input.startsWith("<p/", __off))) break;
    if (__c2 === 115 && (state.input.startsWith("<section>", __off) || state.input.startsWith("<section ", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<table>", __off) || state.input.startsWith("<table ", __off))) break;
    if (__c2 === 117 && (state.input.startsWith("<ul>", __off) || state.input.startsWith("<ul ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEP, "</p>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt8(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEOPTION))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</optgroup>", __off) || state.input.startsWith("</datalist>", __off) || state.input.startsWith("</option>", __off) || state.input.startsWith("</select>", __off))) break;
    if (__c2 === 111 && (state.input.startsWith("<optgroup>", __off) || state.input.startsWith("<optgroup ", __off) || state.input.startsWith("<option>", __off) || state.input.startsWith("<option ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEOPTION, "</option>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEOPTGROUP, "</optgroup>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt9(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEHTML))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60 && (state.input.startsWith("</html>", __off))) break;
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEHTML, "</html>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt10(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEHEAD))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</head>", __off))) break;
    if (__c2 === 98 && (state.input.startsWith("<body>", __off) || state.input.startsWith("<body ", __off) || state.input.startsWith("<body/", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEHEAD, "</head>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt11(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETBODY))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</tbody>", __off) || state.input.startsWith("</table>", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<tbody>", __off) || state.input.startsWith("<tbody ", __off) || state.input.startsWith("<tfoot>", __off) || state.input.startsWith("<tfoot ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETBODY, "</tbody>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt12(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETHEAD))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</thead>", __off) || state.input.startsWith("</table>", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<tbody>", __off) || state.input.startsWith("<tbody ", __off) || state.input.startsWith("<tfoot>", __off) || state.input.startsWith("<tfoot ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETHEAD, "</thead>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt13(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETFOOT))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60 && (state.input.startsWith("</tfoot>", __off) || state.input.startsWith("</table>", __off))) break;
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETFOOT, "</tfoot>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt14(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEBODY))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60 && (state.input.startsWith("</body>", __off) || state.input.startsWith("</html>", __off))) break;
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEBODY, "</body>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid__alt15(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __children_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETAGOPEN))) {
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctype(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseComment(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElement(state); }
  else {
    __child = parseTextNode(state);
  }
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (state.pos === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  expectLiteralId(state, __TYPE_ID_CLOSETAGOPEN, "</");
  const closeTag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __closeTag_start = state.starts[state.pos - 1];
  const __closeTag_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement__valid(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    const __tokIdx1__lower = __tokIdx1 < state.count ? state.input.slice(state.starts[__tokIdx1], state.ends[__tokIdx1]).toLowerCase() : undefined;
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "script" || __tokIdx1__lower === "style" || __tokIdx1__lower === "textarea" || __tokIdx1__lower === "title")) {
      return parseHtmlElement__valid__alt0(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "area" || __tokIdx1__lower === "base" || __tokIdx1__lower === "br" || __tokIdx1__lower === "col" || __tokIdx1__lower === "embed" || __tokIdx1__lower === "hr" || __tokIdx1__lower === "img" || __tokIdx1__lower === "input" || __tokIdx1__lower === "link" || __tokIdx1__lower === "meta" || __tokIdx1__lower === "param" || __tokIdx1__lower === "source" || __tokIdx1__lower === "track" || __tokIdx1__lower === "wbr")) {
      { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
      return parseHtmlElement__valid__alt2(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "li")) {
      return parseHtmlElement__valid__alt3(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "dd" || __tokIdx1__lower === "dt")) {
      return parseHtmlElement__valid__alt4(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tr")) {
      return parseHtmlElement__valid__alt5(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "td" || __tokIdx1__lower === "th")) {
      return parseHtmlElement__valid__alt6(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "p")) {
      return parseHtmlElement__valid__alt7(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "optgroup" || __tokIdx1__lower === "option")) {
      return parseHtmlElement__valid__alt8(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "html")) {
      return parseHtmlElement__valid__alt9(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "head")) {
      return parseHtmlElement__valid__alt10(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tbody")) {
      return parseHtmlElement__valid__alt11(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "thead")) {
      return parseHtmlElement__valid__alt12(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tfoot")) {
      return parseHtmlElement__valid__alt13(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "body")) {
      return parseHtmlElement__valid__alt14(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return parseHtmlElement__valid__alt15(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function parseHtmlElement__recovery0(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __tag_start = state.starts[state.pos - 1];
  const __tag_end = state.ends[state.pos - 1];
  const __attrs_startOff = (state.pos > 0 ? state.ends[state.pos - 1] : 0);
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_SELFCLOSE))) {
    const __before = state.pos;
    const __child = parseAttribute(state);
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (state.pos === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  expectLiteralId(state, __TYPE_ID_SELFCLOSE, "/>");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseHtmlElement(state: State): unknown {
  const __recoverStart = state.pos;
  try {
    return parseHtmlElement__valid(state);
  } catch (__validErr) {
    state.pos = __recoverStart;
    const __r0 = trySpeculate(state, parseHtmlElement__recovery0);
    if (__r0 !== null) return __r0;
    state.pos = __recoverStart;
    throw __validErr;
  }
}

function parseTextNode(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const value = captureRawUntil(state, ["<"], false);
  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { nodeName: "#text", value: value, parentNode: null };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute__alt0(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __name_start = state.starts[state.pos - 1];
  const __name_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  expectLiteralId(state, __TYPE_ID_DQ, "\"");
  const value = captureUntil(state, __TYPE_ID_DQ, "", -1, "", -1, "", true, true);

  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  expectLiteralId(state, __TYPE_ID_DQ, "\"");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { name: name, value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute__alt1(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __name_start = state.starts[state.pos - 1];
  const __name_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  expectLiteralId(state, __TYPE_ID_SQ, "'");
  const value = captureUntil(state, __TYPE_ID_SQ, "", -1, "", -1, "", true, true);

  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  expectLiteralId(state, __TYPE_ID_SQ, "'");
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { name: name, value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute__alt2(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __name_start = state.starts[state.pos - 1];
  const __name_end = state.ends[state.pos - 1];
  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  const value = captureRawUntil(state, [" ", "\t", "\n", "\r", "\f", ">", "/>"], false);
  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { name: name, value: value };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute__alt3(state: State): unknown {
  const __startOff = state.pos < state.count ? state.starts[state.pos] : state.input.length;
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  const __name_start = state.starts[state.pos - 1];
  const __name_end = state.ends[state.pos - 1];
  const __endOff = state.pos > 0 ? state.ends[state.pos - 1] : __startOff;
  const __struct: Record<string, unknown> = { name: name, value: "" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAttribute(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_IDENT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_EQUALS) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_DQ) {
        return parseAttribute__alt0(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_SQ) {
        return parseAttribute__alt1(state);
      }
      return parseAttribute__alt2(state);
    }
    return parseAttribute__alt3(state);
  }
  throw new SyntaxError('no production matched');
}

function parseHtmlDocumentFast(state: State): unknown {

  const children: unknown[] = [];
  while (!(state.pos >= state.count)) {
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  return { nodeName: "#document", mode: "no-quirks", childNodes: children, parentNode: null };
}

function parseDoctypeFast__valid(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DOCTYPEOPEN, "<!");
  const keyword = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.starts[state.pos - 1]);
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  return { nodeName: "#documentType", name: name, publicId: "", systemId: "", parentNode: null };
}

function parseDoctypeFast__recovery0(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DOCTYPEOPEN, "<!");
  const keyword = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.starts[state.pos - 1]);
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { nodeName: "#documentType", name: name, publicId: "", systemId: "", parentNode: null };
}

function parseDoctypeFast(state: State): unknown {
  const __recoverStart = state.pos;
  try {
    return parseDoctypeFast__valid(state);
  } catch (__validErr) {
    state.pos = __recoverStart;
    const __r0 = trySpeculate(state, parseDoctypeFast__recovery0);
    if (__r0 !== null) return __r0;
    state.pos = __recoverStart;
    throw __validErr;
  }
}

function parseCommentFast(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_COMMENTOPEN, "<!--");
  const data = captureUntil(state, __TYPE_ID_COMMENTCLOSE, "", -1, "", -1, "", true, false);

  expectLiteralId(state, __TYPE_ID_COMMENTCLOSE, "-->");
  return { nodeName: "#comment", data: data, parentNode: null };
}

function parseHtmlElementFast__valid__alt0(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const body = captureRawUntil(state, ["</"], false);
  expectLiteralId(state, __TYPE_ID_CLOSETAGOPEN, "</");
  const closeTag = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(closeTag.toLowerCase() === "script" || closeTag.toLowerCase() === "style" || closeTag.toLowerCase() === "textarea" || closeTag.toLowerCase() === "title")) throw new SyntaxError("expected one of script, style, textarea, title at position " + state.starts[state.pos - 1]);
  expectLiteralId(state, __TYPE_ID_GT, ">");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [{ nodeName: "#text", value: body, parentNode: null }], parentNode: null };
}

function parseHtmlElementFast__valid__alt1(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
}

function parseHtmlElementFast__valid__alt2(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_SELFCLOSE))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_SELFCLOSE, "/>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
}

function parseHtmlElementFast__valid__alt3(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSELI))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</menu>", __off) || state.input.startsWith("</li>", __off) || state.input.startsWith("</ol>", __off) || state.input.startsWith("</ul>", __off))) break;
    if (__c2 === 108 && (state.input.startsWith("<li>", __off) || state.input.startsWith("<li ", __off) || state.input.startsWith("<li/", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSELI, "</li>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt4(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEDT))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</dt>", __off) || state.input.startsWith("</dd>", __off) || state.input.startsWith("</dl>", __off))) break;
    if (__c2 === 100 && (state.input.startsWith("<dt>", __off) || state.input.startsWith("<dt ", __off) || state.input.startsWith("<dt/", __off) || state.input.startsWith("<dd>", __off) || state.input.startsWith("<dd ", __off) || state.input.startsWith("<dd/", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEDT, "</dt>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEDD, "</dd>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt5(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETR))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</tbody>", __off) || state.input.startsWith("</thead>", __off) || state.input.startsWith("</tfoot>", __off) || state.input.startsWith("</table>", __off) || state.input.startsWith("</tr>", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<tbody>", __off) || state.input.startsWith("<tbody ", __off) || state.input.startsWith("<thead>", __off) || state.input.startsWith("<thead ", __off) || state.input.startsWith("<tfoot>", __off) || state.input.startsWith("<tfoot ", __off) || state.input.startsWith("<tr>", __off) || state.input.startsWith("<tr ", __off) || state.input.startsWith("<tr/", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETR, "</tr>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt6(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETD))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</tbody>", __off) || state.input.startsWith("</thead>", __off) || state.input.startsWith("</tfoot>", __off) || state.input.startsWith("</table>", __off) || state.input.startsWith("</td>", __off) || state.input.startsWith("</th>", __off) || state.input.startsWith("</tr>", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<tbody>", __off) || state.input.startsWith("<tbody ", __off) || state.input.startsWith("<thead>", __off) || state.input.startsWith("<thead ", __off) || state.input.startsWith("<tfoot>", __off) || state.input.startsWith("<tfoot ", __off) || state.input.startsWith("<td>", __off) || state.input.startsWith("<td ", __off) || state.input.startsWith("<td/", __off) || state.input.startsWith("<th>", __off) || state.input.startsWith("<th ", __off) || state.input.startsWith("<th/", __off) || state.input.startsWith("<tr>", __off) || state.input.startsWith("<tr ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETD, "</td>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETH, "</th>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt7(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEP))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</p>", __off))) break;
    if (__c2 === 97 && (state.input.startsWith("<article>", __off) || state.input.startsWith("<article ", __off) || state.input.startsWith("<address>", __off) || state.input.startsWith("<address ", __off) || state.input.startsWith("<aside>", __off) || state.input.startsWith("<aside ", __off))) break;
    if (__c2 === 98 && (state.input.startsWith("<blockquote>", __off) || state.input.startsWith("<blockquote ", __off))) break;
    if (__c2 === 100 && (state.input.startsWith("<div>", __off) || state.input.startsWith("<div ", __off) || state.input.startsWith("<dl>", __off) || state.input.startsWith("<dl ", __off))) break;
    if (__c2 === 102 && (state.input.startsWith("<footer>", __off) || state.input.startsWith("<footer ", __off) || state.input.startsWith("<form>", __off) || state.input.startsWith("<form ", __off))) break;
    if (__c2 === 104 && (state.input.startsWith("<header>", __off) || state.input.startsWith("<header ", __off) || state.input.startsWith("<h1>", __off) || state.input.startsWith("<h1 ", __off) || state.input.startsWith("<h2>", __off) || state.input.startsWith("<h2 ", __off) || state.input.startsWith("<h3>", __off) || state.input.startsWith("<h3 ", __off) || state.input.startsWith("<h4>", __off) || state.input.startsWith("<h4 ", __off) || state.input.startsWith("<h5>", __off) || state.input.startsWith("<h5 ", __off) || state.input.startsWith("<h6>", __off) || state.input.startsWith("<h6 ", __off) || state.input.startsWith("<hr>", __off) || state.input.startsWith("<hr ", __off) || state.input.startsWith("<hr/", __off))) break;
    if (__c2 === 110 && (state.input.startsWith("<nav>", __off) || state.input.startsWith("<nav ", __off))) break;
    if (__c2 === 111 && (state.input.startsWith("<ol>", __off) || state.input.startsWith("<ol ", __off))) break;
    if (__c2 === 112 && (state.input.startsWith("<pre>", __off) || state.input.startsWith("<pre ", __off) || state.input.startsWith("<p>", __off) || state.input.startsWith("<p ", __off) || state.input.startsWith("<p/", __off))) break;
    if (__c2 === 115 && (state.input.startsWith("<section>", __off) || state.input.startsWith("<section ", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<table>", __off) || state.input.startsWith("<table ", __off))) break;
    if (__c2 === 117 && (state.input.startsWith("<ul>", __off) || state.input.startsWith("<ul ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEP, "</p>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt8(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEOPTION))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</optgroup>", __off) || state.input.startsWith("</datalist>", __off) || state.input.startsWith("</option>", __off) || state.input.startsWith("</select>", __off))) break;
    if (__c2 === 111 && (state.input.startsWith("<optgroup>", __off) || state.input.startsWith("<optgroup ", __off) || state.input.startsWith("<option>", __off) || state.input.startsWith("<option ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEOPTION, "</option>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEOPTGROUP, "</optgroup>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt9(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEHTML))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60 && (state.input.startsWith("</html>", __off))) break;
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEHTML, "</html>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt10(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEHEAD))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</head>", __off))) break;
    if (__c2 === 98 && (state.input.startsWith("<body>", __off) || state.input.startsWith("<body ", __off) || state.input.startsWith("<body/", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEHEAD, "</head>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt11(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETBODY))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</tbody>", __off) || state.input.startsWith("</table>", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<tbody>", __off) || state.input.startsWith("<tbody ", __off) || state.input.startsWith("<tfoot>", __off) || state.input.startsWith("<tfoot ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETBODY, "</tbody>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt12(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETHEAD))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60) {
    const __c2 = state.input.charCodeAt(__off + 1);
    if (__c2 === 47 && (state.input.startsWith("</thead>", __off) || state.input.startsWith("</table>", __off))) break;
    if (__c2 === 116 && (state.input.startsWith("<tbody>", __off) || state.input.startsWith("<tbody ", __off) || state.input.startsWith("<tfoot>", __off) || state.input.startsWith("<tfoot ", __off))) break;
  }
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETHEAD, "</thead>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt13(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETFOOT))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60 && (state.input.startsWith("</tfoot>", __off) || state.input.startsWith("</table>", __off))) break;
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETFOOT, "</tfoot>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt14(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEBODY))) {
    {
    const __off = state.pos < state.count ? state.starts[state.pos] : state.input.length;
    const __c = state.input.charCodeAt(__off);
    if (__c === 60 && (state.input.startsWith("</body>", __off) || state.input.startsWith("</html>", __off))) break;
  }
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEBODY, "</body>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid__alt15(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");

  const children: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETAGOPEN))) {
    const __before = state.pos;
    let __child: unknown;
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) { __child = parseDoctypeFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) { __child = parseCommentFast(state); }
  else if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) { __child = parseHtmlElementFast(state); }
  else {
    __child = parseTextNodeFast(state);
  }
    children.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_CLOSETAGOPEN, "</");
  const closeTag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: children, parentNode: null };
}

function parseHtmlElementFast__valid(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    const __tokIdx1__lower = __tokIdx1 < state.count ? state.input.slice(state.starts[__tokIdx1], state.ends[__tokIdx1]).toLowerCase() : undefined;
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "script" || __tokIdx1__lower === "style" || __tokIdx1__lower === "textarea" || __tokIdx1__lower === "title")) {
      return parseHtmlElementFast__valid__alt0(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "area" || __tokIdx1__lower === "base" || __tokIdx1__lower === "br" || __tokIdx1__lower === "col" || __tokIdx1__lower === "embed" || __tokIdx1__lower === "hr" || __tokIdx1__lower === "img" || __tokIdx1__lower === "input" || __tokIdx1__lower === "link" || __tokIdx1__lower === "meta" || __tokIdx1__lower === "param" || __tokIdx1__lower === "source" || __tokIdx1__lower === "track" || __tokIdx1__lower === "wbr")) {
      { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
      return parseHtmlElementFast__valid__alt2(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "li")) {
      return parseHtmlElementFast__valid__alt3(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "dd" || __tokIdx1__lower === "dt")) {
      return parseHtmlElementFast__valid__alt4(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tr")) {
      return parseHtmlElementFast__valid__alt5(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "td" || __tokIdx1__lower === "th")) {
      return parseHtmlElementFast__valid__alt6(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "p")) {
      return parseHtmlElementFast__valid__alt7(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "optgroup" || __tokIdx1__lower === "option")) {
      return parseHtmlElementFast__valid__alt8(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "html")) {
      return parseHtmlElementFast__valid__alt9(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "head")) {
      return parseHtmlElementFast__valid__alt10(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tbody")) {
      return parseHtmlElementFast__valid__alt11(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "thead")) {
      return parseHtmlElementFast__valid__alt12(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tfoot")) {
      return parseHtmlElementFast__valid__alt13(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "body")) {
      return parseHtmlElementFast__valid__alt14(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return parseHtmlElementFast__valid__alt15(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function parseHtmlElementFast__recovery0(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");


  const attrs: unknown[] = [];
  while (!(peekLiteralId(state, __TYPE_ID_SELFCLOSE))) {
    const __before = state.pos;
    const __child = parseAttributeFast(state);
    attrs.push(__child);
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_SELFCLOSE, "/>");
  return { nodeName: tag, tagName: tag, namespaceURI: "http://www.w3.org/1999/xhtml", attrs: attrs, childNodes: [], parentNode: null };
}

function parseHtmlElementFast(state: State): unknown {
  const __recoverStart = state.pos;
  try {
    return parseHtmlElementFast__valid(state);
  } catch (__validErr) {
    state.pos = __recoverStart;
    const __r0 = trySpeculate(state, parseHtmlElementFast__recovery0);
    if (__r0 !== null) return __r0;
    state.pos = __recoverStart;
    throw __validErr;
  }
}

function parseTextNodeFast(state: State): unknown {
  const value = captureRawUntil(state, ["<"], false);
  return { nodeName: "#text", value: value, parentNode: null };
}

function parseAttributeFast__alt0(state: State): unknown {
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  expectLiteralId(state, __TYPE_ID_DQ, "\"");
  const value = captureUntil(state, __TYPE_ID_DQ, "", -1, "", -1, "", true, true);

  expectLiteralId(state, __TYPE_ID_DQ, "\"");
  return { name: name, value: value };
}

function parseAttributeFast__alt1(state: State): unknown {
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  expectLiteralId(state, __TYPE_ID_SQ, "'");
  const value = captureUntil(state, __TYPE_ID_SQ, "", -1, "", -1, "", true, true);

  expectLiteralId(state, __TYPE_ID_SQ, "'");
  return { name: name, value: value };
}

function parseAttributeFast__alt2(state: State): unknown {
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  const value = captureRawUntil(state, [" ", "\t", "\n", "\r", "\f", ">", "/>"], false);
  return { name: name, value: value };
}

function parseAttributeFast__alt3(state: State): unknown {
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return { name: name, value: "" };
}

function parseAttributeFast(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_IDENT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_EQUALS) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_DQ) {
        return parseAttributeFast__alt0(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_SQ) {
        return parseAttributeFast__alt1(state);
      }
      return parseAttributeFast__alt2(state);
    }
    return parseAttributeFast__alt3(state);
  }
  throw new SyntaxError('no production matched');
}

function validateHtmlDocument(state: State): unknown {
  let __count_children = 0;
  while (!(state.pos >= state.count)) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  return;
}

function validateDoctype__valid(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DOCTYPEOPEN, "<!");
  const keyword = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.starts[state.pos - 1]);
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  return;
}

function validateDoctype__recovery0(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_DOCTYPEOPEN, "<!");
  const keyword = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(keyword.toLowerCase() === "doctype")) throw new SyntaxError("expected one of DOCTYPE at position " + state.starts[state.pos - 1]);
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateDoctype(state: State): unknown {
  const __recoverStart = state.pos;
  try {
    return validateDoctype__valid(state);
  } catch (__validErr) {
    state.pos = __recoverStart;
    const __r0 = trySpeculate(state, validateDoctype__recovery0);
    if (__r0 !== null) return __r0;
    state.pos = __recoverStart;
    throw __validErr;
  }
}

function validateComment(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_COMMENTOPEN, "<!--");
  const data = captureUntil(state, __TYPE_ID_COMMENTCLOSE, "", -1, "", -1, "", true, false);

  expectLiteralId(state, __TYPE_ID_COMMENTCLOSE, "-->");
  return;
}

function validateHtmlElement__valid__alt0(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  const body = captureRawUntil(state, ["</"], false);
  expectLiteralId(state, __TYPE_ID_CLOSETAGOPEN, "</");
  const closeTag = expectClassId(state, __TYPE_ID_IDENT, "ident");
  if (!(closeTag.toLowerCase() === "script" || closeTag.toLowerCase() === "style" || closeTag.toLowerCase() === "textarea" || closeTag.toLowerCase() === "title")) throw new SyntaxError("expected one of script, style, textarea, title at position " + state.starts[state.pos - 1]);
  expectLiteralId(state, __TYPE_ID_GT, ">");
  return;
}

function validateHtmlElement__valid__alt1(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  return;
}

function validateHtmlElement__valid__alt2(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_SELFCLOSE))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_SELFCLOSE, "/>");
  return;
}

function validateHtmlElement__valid__alt3(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSELI))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSELI, "</li>");
  return;
}

function validateHtmlElement__valid__alt4(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEDT))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEDT, "</dt>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEDD, "</dd>");
  return;
}

function validateHtmlElement__valid__alt5(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETR))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETR, "</tr>");
  return;
}

function validateHtmlElement__valid__alt6(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETD))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETD, "</td>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETH, "</th>");
  return;
}

function validateHtmlElement__valid__alt7(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEP))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEP, "</p>");
  return;
}

function validateHtmlElement__valid__alt8(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEOPTION))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEOPTION, "</option>");
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEOPTGROUP, "</optgroup>");
  return;
}

function validateHtmlElement__valid__alt9(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEHTML))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEHTML, "</html>");
  return;
}

function validateHtmlElement__valid__alt10(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEHEAD))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEHEAD, "</head>");
  return;
}

function validateHtmlElement__valid__alt11(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETBODY))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETBODY, "</tbody>");
  return;
}

function validateHtmlElement__valid__alt12(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETHEAD))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETHEAD, "</thead>");
  return;
}

function validateHtmlElement__valid__alt13(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETFOOT))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSETFOOT, "</tfoot>");
  return;
}

function validateHtmlElement__valid__alt14(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSEBODY))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  consumeOptionalLiteralId(state, __TYPE_ID_CLOSEBODY, "</body>");
  return;
}

function validateHtmlElement__valid__alt15(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_GT))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_GT, ">");
  let __count_children = 0;
  while (!(peekLiteralId(state, __TYPE_ID_CLOSETAGOPEN))) {
    const __before = state.pos;
    (() => {
    const __tokIdx = state.pos;
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_DOCTYPEOPEN) return validateDoctype(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_COMMENTOPEN) return validateComment(state);
    if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) return validateHtmlElement(state);
    return validateTextNode(state);
  })();
    __count_children++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_CLOSETAGOPEN, "</");
  const closeTag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_GT, ">");
  return;
}

function validateHtmlElement__valid(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_LT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    const __tokIdx1__lower = __tokIdx1 < state.count ? state.input.slice(state.starts[__tokIdx1], state.ends[__tokIdx1]).toLowerCase() : undefined;
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "script" || __tokIdx1__lower === "style" || __tokIdx1__lower === "textarea" || __tokIdx1__lower === "title")) {
      return validateHtmlElement__valid__alt0(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "area" || __tokIdx1__lower === "base" || __tokIdx1__lower === "br" || __tokIdx1__lower === "col" || __tokIdx1__lower === "embed" || __tokIdx1__lower === "hr" || __tokIdx1__lower === "img" || __tokIdx1__lower === "input" || __tokIdx1__lower === "link" || __tokIdx1__lower === "meta" || __tokIdx1__lower === "param" || __tokIdx1__lower === "source" || __tokIdx1__lower === "track" || __tokIdx1__lower === "wbr")) {
      { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
      return validateHtmlElement__valid__alt2(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "li")) {
      return validateHtmlElement__valid__alt3(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "dd" || __tokIdx1__lower === "dt")) {
      return validateHtmlElement__valid__alt4(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tr")) {
      return validateHtmlElement__valid__alt5(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "td" || __tokIdx1__lower === "th")) {
      return validateHtmlElement__valid__alt6(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "p")) {
      return validateHtmlElement__valid__alt7(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "optgroup" || __tokIdx1__lower === "option")) {
      return validateHtmlElement__valid__alt8(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "html")) {
      return validateHtmlElement__valid__alt9(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "head")) {
      return validateHtmlElement__valid__alt10(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tbody")) {
      return validateHtmlElement__valid__alt11(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "thead")) {
      return validateHtmlElement__valid__alt12(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "tfoot")) {
      return validateHtmlElement__valid__alt13(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT && (__tokIdx1__lower === "body")) {
      return validateHtmlElement__valid__alt14(state);
    }
    else if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_IDENT) {
      return validateHtmlElement__valid__alt15(state);
    }
    throw new SyntaxError('no production matched');
  }
  throw new SyntaxError('no production matched');
}

function validateHtmlElement__recovery0(state: State): unknown {
  expectLiteralId(state, __TYPE_ID_LT, "<");
  const tag = expectClassId(state, __TYPE_ID_IDENT, "ident");

  let __count_attrs = 0;
  while (!(peekLiteralId(state, __TYPE_ID_SELFCLOSE))) {
    const __before = state.pos;
    validateAttribute(state);
    __count_attrs++;
    if (state.pos === __before) break;
  }
  expectLiteralId(state, __TYPE_ID_SELFCLOSE, "/>");
  return;
}

function validateHtmlElement(state: State): unknown {
  const __recoverStart = state.pos;
  try {
    return validateHtmlElement__valid(state);
  } catch (__validErr) {
    state.pos = __recoverStart;
    const __r0 = trySpeculate(state, validateHtmlElement__recovery0);
    if (__r0 !== null) return __r0;
    state.pos = __recoverStart;
    throw __validErr;
  }
}

function validateTextNode(state: State): unknown {
  const value = captureRawUntil(state, ["<"], false);
  return;
}

function validateAttribute__alt0(state: State): unknown {
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  expectLiteralId(state, __TYPE_ID_DQ, "\"");
  const value = captureUntil(state, __TYPE_ID_DQ, "", -1, "", -1, "", true, true);

  expectLiteralId(state, __TYPE_ID_DQ, "\"");
  return;
}

function validateAttribute__alt1(state: State): unknown {
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  expectLiteralId(state, __TYPE_ID_SQ, "'");
  const value = captureUntil(state, __TYPE_ID_SQ, "", -1, "", -1, "", true, true);

  expectLiteralId(state, __TYPE_ID_SQ, "'");
  return;
}

function validateAttribute__alt2(state: State): unknown {
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  expectLiteralId(state, __TYPE_ID_EQUALS, "=");
  const value = captureRawUntil(state, [" ", "\t", "\n", "\r", "\f", ">", "/>"], false);
  return;
}

function validateAttribute__alt3(state: State): unknown {
  const name = expectClassId(state, __TYPE_ID_IDENT, "ident");

  return;
}

function validateAttribute(state: State): unknown {
  const __tokIdx = state.pos;
  if (__tokIdx < state.count && state.types[__tokIdx] === __TYPE_ID_IDENT) {
    const __tokIdx1 = nthNonCommentPos(state, state.pos, 1);
    if (__tokIdx1 < state.count && state.types[__tokIdx1] === __TYPE_ID_EQUALS) {
      const __tokIdx2 = nthNonCommentPos(state, state.pos, 2);
      if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_DQ) {
        return validateAttribute__alt0(state);
      }
      else if (__tokIdx2 < state.count && state.types[__tokIdx2] === __TYPE_ID_SQ) {
        return validateAttribute__alt1(state);
      }
      return validateAttribute__alt2(state);
    }
    return validateAttribute__alt3(state);
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
    const result = mode === 'raws' ? parseHtmlDocument(state) : parseHtmlDocumentFast(state);
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
    validateHtmlDocument(state);
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
  module: "@parser2/html",
  exportName: 'validate',
};

export function countTokens(input: string): number {
  return __tokenize(input).count;
}


export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}
