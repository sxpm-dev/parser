// Auto-generated from packages/js-expr/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (v2 scannerless emit — see docs/scannerless-emit-v2.md)
/* eslint-disable */
// @ts-nocheck


export type ParseMode = 'fast' | 'raws';
export type ParseOptions = {
  readonly mode?: ParseMode;
  readonly validate?: boolean;
};

type SourcePos = { readonly line: number; readonly column: number; readonly offset: number };
type SourceRange = { readonly start: SourcePos; readonly end: SourcePos };

type State = {
  readonly input: string;
  readonly len: number;
  pos: number;
  maxOff: number;
  readonly mode: ParseMode;
  readonly lineStarts: number[];
  // Stack of expected column offsets for nested indent scopes. Pushed by
  // emitRepeatsSpan when the span carries kind:'indent'; popped on exit.
  // Fixed Int32Array(16) capacity; the runtime fails the parse if depth > 16.
  // indentStackTop is the count of pushed entries (0 when no indent is active).
  indentStack: Int32Array;
  indentStackTop: number;
};

function computeLineStarts(input: string): number[] {
  const starts = [0];
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) === 0x0a) starts.push(i + 1);
  }
  return starts;
}

function posAt(state: State, offset: number): SourcePos {
  const starts = state.lineStarts;
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - starts[lo] + 1, offset };
}

function makeSource(state: State, startOff: number, endOff: number): SourceRange {
  const start = posAt(state, startOff);
  const end = endOff > startOff
    ? { ...posAt(state, endOff - 1), offset: endOff }
    : { ...posAt(state, startOff), offset: endOff };
  return { start, end };
}

function isWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}

function isDigit(c: number): boolean { return c >= 48 && c <= 57; }
function isHexDigit(c: number): boolean {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
}
function isCssIdentStart(c: number): boolean {
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 45;
}
function isCssIdentPart(c: number): boolean {
  return isCssIdentStart(c) || (c >= 48 && c <= 57);
}
function isJsIdentStart(c: number): boolean {
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 36;
}
function isJsIdentPart(c: number): boolean {
  return isJsIdentStart(c) || (c >= 48 && c <= 57);
}

// JSON-style escape decoder for `.string().coerce()` captures. The input
// slice INCLUDES the surrounding quote chars; this strips them, processes
// the standard escape set, and returns the parsed JS string. Schema-
// agnostic — used only when a string-class span explicitly opts in via
// `.coerce()`. String.fromCharCode is used for emitted escapes so the
// preamble template literal doesn't need backslash gymnastics.
function decodeJsonString(slice: string): string {
  const len = slice.length;
  if (len < 2) return slice;
  const out: string[] = [];
  let i = 1;
  const end = len - 1;
  while (i < end) {
    const c = slice.charCodeAt(i);
    if (c !== 0x5c) { out.push(slice[i]!); i++; continue; }
    if (i + 1 >= end) break;
    const esc = slice.charCodeAt(i + 1);
    switch (esc) {
      case 0x22: out.push(String.fromCharCode(0x22)); i += 2; break; // "
      case 0x27: out.push(String.fromCharCode(0x27)); i += 2; break; // '
      case 0x5c: out.push(String.fromCharCode(0x5c)); i += 2; break; // backslash
      case 0x2f: out.push(String.fromCharCode(0x2f)); i += 2; break; // /
      case 0x62: out.push(String.fromCharCode(0x08)); i += 2; break; // \b → 0x08
      case 0x66: out.push(String.fromCharCode(0x0c)); i += 2; break; // \f → 0x0c
      case 0x6e: out.push(String.fromCharCode(0x0a)); i += 2; break; // \n → 0x0a
      case 0x72: out.push(String.fromCharCode(0x0d)); i += 2; break; // \r → 0x0d
      case 0x74: out.push(String.fromCharCode(0x09)); i += 2; break; // \t → 0x09
      case 0x75: {
        // \uXXXX hex code unit.
        const hex = slice.slice(i + 2, i + 6);
        out.push(String.fromCharCode(parseInt(hex, 16)));
        i += 6;
        break;
      }
      default:
        out.push(slice[i + 1]!);
        i += 2;
    }
  }
  return out.join('');
}

// JSON-style escape encoder for the inverse of `.string().coerce()`. Given
// a JS string value, produces a double-quoted, escape-encoded source
// representation that matches `JSON.stringify(value)` for the basic set.
function encodeJsonString(value: string): string {
  let out = String.fromCharCode(0x22); // opening "
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 0x22) {
      out += String.fromCharCode(0x5c) + String.fromCharCode(0x22); // \"
    } else if (c === 0x5c) {
      out += String.fromCharCode(0x5c) + String.fromCharCode(0x5c); // \\
    } else if (c === 0x08) {
      out += String.fromCharCode(0x5c) + 'b';
    } else if (c === 0x09) {
      out += String.fromCharCode(0x5c) + 't';
    } else if (c === 0x0a) {
      out += String.fromCharCode(0x5c) + 'n';
    } else if (c === 0x0c) {
      out += String.fromCharCode(0x5c) + 'f';
    } else if (c === 0x0d) {
      out += String.fromCharCode(0x5c) + 'r';
    } else if (c < 0x20) {
      out += String.fromCharCode(0x5c) + 'u' + c.toString(16).padStart(4, '0');
    } else {
      out += value[i];
    }
  }
  out += String.fromCharCode(0x22); // closing "
  return out;
}

function columnAt(state: State, off: number): number {
  // Column (0-indexed) of byte at off within its line — measured as a raw
  // byte offset from the start of the current line. Tabs are NOT supported
  // in the indent MVP: each tab counts as a single column, not its display
  // width. Schemas using .indent() should document this.
  const input = state.input;
  let lineStart = off;
  while (lineStart > 0 && input.charCodeAt(lineStart - 1) !== 0x0a) lineStart--;
  return off - lineStart;
}

function skipBlankLines(state: State): void {
  // Advance state.pos past any sequence of lines containing only whitespace.
  // Stops at the first non-whitespace character (without consuming the
  // leading spaces of that line).
  //
  // Blank-line whitespace includes spaces (0x20), tabs (0x09), and CR (0x0d).
  // After this call, use skipHorizontalWs to consume leading spaces on the
  // current non-blank line before measuring column via columnAt.
  const input = state.input;
  const len = state.len;
  outer: while (state.pos < len) {
    let probe = state.pos;
    while (probe < len) {
      const c = input.charCodeAt(probe);
      if (c === 0x0a) { state.pos = probe + 1; continue outer; }
      if (c === 0x20 || c === 0x09 || c === 0x0d) { probe++; continue; }
      return;
    }
    return;
  }
}

function skipHorizontalWs(state: State): void {
  // Skip ASCII spaces (0x20) only — tabs do not contribute to indent column
  // (Phase 7 MVP scope decision; see columnAt). Used after skipBlankLines to
  // land on the first non-space byte of the current line before measuring
  // column.
  const input = state.input;
  const len = state.len;
  while (state.pos < len && input.charCodeAt(state.pos) === 0x20) state.pos++;
}

function validatorErrorAt(input: string, offset: number, cause?: unknown): SyntaxError {
  let lineStart = offset;
  while (lineStart > 0 && input.charCodeAt(lineStart - 1) !== 0x0a && input.charCodeAt(lineStart - 1) !== 0x0d) lineStart--;
  let lineEnd = offset;
  while (lineEnd < input.length && input.charCodeAt(lineEnd) !== 0x0a && input.charCodeAt(lineEnd) !== 0x0d) lineEnd++;
  let line = 1;
  for (let i = 0; i < lineStart; i++) if (input.charCodeAt(i) === 0x0a) line++;
  const source = input.slice(lineStart, lineEnd);
  const gutter = String(line);
  const column = Math.max(0, offset - lineStart);
  // Headline is generic — the underlying validator's message is attached via
  // `cause` so callers can drill into it without polluting `.message`. Tests
  // assert that the headline does NOT include validator-specific text (e.g.
  // 'Invalid CSS value'), so we deliberately keep the message bare.
  return new SyntaxError(`Invalid value at position ${offset}
${gutter} | ${source}
${' '.repeat(gutter.length)} | ${' '.repeat(column)}^`, cause !== undefined ? { cause } : undefined);
}

function syntaxErrorAt(input: string, offset: number): SyntaxError {
  let lineStart = offset;
  while (lineStart > 0 && input.charCodeAt(lineStart - 1) !== 0x0a && input.charCodeAt(lineStart - 1) !== 0x0d) lineStart--;
  let lineEnd = offset;
  while (lineEnd < input.length && input.charCodeAt(lineEnd) !== 0x0a && input.charCodeAt(lineEnd) !== 0x0d) lineEnd++;
  let line = 1;
  for (let i = 0; i < lineStart; i++) if (input.charCodeAt(i) === 0x0a) line++;
  const source = input.slice(lineStart, lineEnd);
  const gutter = String(line);
  const column = Math.max(0, offset - lineStart);
  const ch = offset < input.length ? input[offset] : 'EOF';
  const headline = ch === 'EOF'
    ? `Unexpected end of input at position ${offset}`
    : `Unexpected '${ch}' at position ${offset}`;
  return new SyntaxError(`${headline}
${gutter} | ${source}
${' '.repeat(gutter.length)} | ${' '.repeat(column)}^`);
}

// --- Inferred types ---
export type Expr_ast = { type: "Identifier"; name: string } | { type: "NumericLiteral"; value: number } | Expr_ast | { type: "UnaryExpression"; op: "!==" | "===" | "!=" | "&&" | "**" | "<=" | "==" | ">=" | "||" | "!" | "%" | "*" | "+" | "-" | "/" | "<" | ">" | "~"; operand: Expr_ast } | { type: "BinaryExpression"; op: "!==" | "===" | "!=" | "&&" | "**" | "<=" | "==" | ">=" | "||" | "!" | "%" | "*" | "+" | "-" | "/" | "<" | ">" | "~"; left: Expr_ast; right: Expr_ast };

function parseExpr__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Expr#0", name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Expr#0", name: name };
}

function parseExpr__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = Number(input.slice(__value_start, __value_end));
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Expr#1", value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Expr#1", value: value };
}

function parseExpr__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __inner_start = off;
  const inner = parseExpr(state);
  if (inner === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __inner_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Expr#2", inner: inner };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Expr#2", inner: inner };
}

function parseExpr__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && ((input.startsWith("!==", off)) || (input.startsWith("===", off)) || (input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 38 && input.charCodeAt(off + 1) === 38) || (input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42) || (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 61 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 124 && input.charCodeAt(off + 1) === 124) || (input.charCodeAt(off) === 33) || (input.charCodeAt(off) === 37) || (input.charCodeAt(off) === 42) || (input.charCodeAt(off) === 43) || (input.charCodeAt(off) === 45) || (input.charCodeAt(off) === 47) || (input.charCodeAt(off) === 60) || (input.charCodeAt(off) === 62) || (input.charCodeAt(off) === 126)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __op_start = off;
  if (input.startsWith("!==", off)) { off += 3; } else if (input.startsWith("===", off)) { off += 3; } else if (input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 38 && input.charCodeAt(off + 1) === 38) { off += 2; } else if (input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42) { off += 2; } else if (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 61 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 124 && input.charCodeAt(off + 1) === 124) { off += 2; } else if (input.charCodeAt(off) === 33) { off += 1; } else if (input.charCodeAt(off) === 37) { off += 1; } else if (input.charCodeAt(off) === 42) { off += 1; } else if (input.charCodeAt(off) === 43) { off += 1; } else if (input.charCodeAt(off) === 45) { off += 1; } else if (input.charCodeAt(off) === 47) { off += 1; } else if (input.charCodeAt(off) === 60) { off += 1; } else if (input.charCodeAt(off) === 62) { off += 1; } else if (input.charCodeAt(off) === 126) { off += 1; }
  const __op_end = off;
  const op = input.slice(__op_start, __op_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __operand_start = off;
  const operand = parseExpr(state);
  if (operand === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __operand_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Expr#3", op: op, operand: operand };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Expr#3", op: op, operand: operand };
}

function parseExpr__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __left_start = off;
  const left = parseExpr(state);
  if (left === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __left_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && ((input.startsWith("!==", off)) || (input.startsWith("===", off)) || (input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 38 && input.charCodeAt(off + 1) === 38) || (input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42) || (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 61 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 124 && input.charCodeAt(off + 1) === 124) || (input.charCodeAt(off) === 33) || (input.charCodeAt(off) === 37) || (input.charCodeAt(off) === 42) || (input.charCodeAt(off) === 43) || (input.charCodeAt(off) === 45) || (input.charCodeAt(off) === 47) || (input.charCodeAt(off) === 60) || (input.charCodeAt(off) === 62) || (input.charCodeAt(off) === 126)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __op_start = off;
  if (input.startsWith("!==", off)) { off += 3; } else if (input.startsWith("===", off)) { off += 3; } else if (input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 38 && input.charCodeAt(off + 1) === 38) { off += 2; } else if (input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42) { off += 2; } else if (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 61 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 124 && input.charCodeAt(off + 1) === 124) { off += 2; } else if (input.charCodeAt(off) === 33) { off += 1; } else if (input.charCodeAt(off) === 37) { off += 1; } else if (input.charCodeAt(off) === 42) { off += 1; } else if (input.charCodeAt(off) === 43) { off += 1; } else if (input.charCodeAt(off) === 45) { off += 1; } else if (input.charCodeAt(off) === 47) { off += 1; } else if (input.charCodeAt(off) === 60) { off += 1; } else if (input.charCodeAt(off) === 62) { off += 1; } else if (input.charCodeAt(off) === 126) { off += 1; }
  const __op_end = off;
  const op = input.slice(__op_start, __op_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __right_start = off;
  const right = parseExpr(state);
  if (right === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __right_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Expr#4", left: left, op: op, right: right };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Expr#4", left: left, op: op, right: right };
}

function parseExpr__primary(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let __unaryOp: string | null = null;
  let __unaryLen = 0;
  if (off < len) {
    if (input.charCodeAt(off) === 33) { __unaryOp = "!"; __unaryLen = 1; } else if (input.charCodeAt(off) === 126) { __unaryOp = "~"; __unaryLen = 1; }
  }
  if (__unaryOp !== null) {
    const __unaryEntry = state.pos;
    state.pos = off + __unaryLen;
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    const __operand = parseExpr__primary(state);
    if (__operand === null) { state.pos = __unaryEntry; return null; }
    const __unary: any = { __production: "Expr#3", op: __unaryOp, operand: __operand };
    if (state.mode === 'raws') {
      __unary.source = makeSource(state, __unaryEntry, state.pos);
    }
    return __unary;
  }
  { const r = parseExpr__alt0(state); if (r !== null) return r; }
  { const r = parseExpr__alt1(state); if (r !== null) return r; }
  return parseExpr__alt2(state);
}

function parseExpr__pratt(state: State, minPrec: number): unknown {
  const __precTable: Record<string, number> = {
  "!==": 1,
  "===": 1,
  "!=": 1,
  "&&": 0,
  "**": 5,
  "<=": 2,
  "==": 1,
  ">=": 2,
  "||": 0,
  "%": 4,
  "*": 4,
  "+": 3,
  "-": 3,
  "/": 4,
  "<": 2,
  ">": 2,
  };
  const __rightAssoc: Record<string, boolean> = {
  "**": true,
  };
  const entryOff = state.pos;
  let left = parseExpr__primary(state);
  if (left === null) return null;
  while (true) {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (off >= len) break;
    let op: string | null = null;
    let opLen = 0;
  if (input.startsWith("!==", off)) { op = "!=="; opLen = 3; } else   if (input.startsWith("===", off)) { op = "==="; opLen = 3; } else   if (input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) { op = "!="; opLen = 2; } else   if (input.charCodeAt(off) === 38 && input.charCodeAt(off + 1) === 38) { op = "&&"; opLen = 2; } else   if (input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42) { op = "**"; opLen = 2; } else   if (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) { op = "<="; opLen = 2; } else   if (input.charCodeAt(off) === 61 && input.charCodeAt(off + 1) === 61) { op = "=="; opLen = 2; } else   if (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) { op = ">="; opLen = 2; } else   if (input.charCodeAt(off) === 124 && input.charCodeAt(off + 1) === 124) { op = "||"; opLen = 2; } else   if (input.charCodeAt(off) === 33) { op = "!"; opLen = 1; } else   if (input.charCodeAt(off) === 37) { op = "%"; opLen = 1; } else   if (input.charCodeAt(off) === 42) { op = "*"; opLen = 1; } else   if (input.charCodeAt(off) === 43) { op = "+"; opLen = 1; } else   if (input.charCodeAt(off) === 45) { op = "-"; opLen = 1; } else   if (input.charCodeAt(off) === 47) { op = "/"; opLen = 1; } else   if (input.charCodeAt(off) === 60) { op = "<"; opLen = 1; } else   if (input.charCodeAt(off) === 62) { op = ">"; opLen = 1; } else   if (input.charCodeAt(off) === 126) { op = "~"; opLen = 1; }
    if (op === null) break;
    const prec = __precTable[op]!;
    if (prec < minPrec) break;
    state.pos = off + opLen;
    if (state.pos > state.maxOff) state.maxOff = state.pos;
    // Phase 5e: right-assoc recurses at prec, left-assoc at prec + 1.
    const nextMinPrec = __rightAssoc[op] ? prec : prec + 1;
    const right = parseExpr__pratt(state, nextMinPrec);
    if (right === null) {
      state.pos = entryOff;
      return null;
    }
    const __binary: any = { __production: "Expr#4", left: left, op: op, right: right };
    if (state.mode === 'raws') {
      __binary.source = makeSource(state, entryOff, state.pos);
    }
    left = __binary;
  }
  return left;
}

function parseExpr(state: State): unknown {
  return parseExpr__pratt(state, 0);
}

const __defaultTarget: string | undefined = "ast";

function __build_Expr_0_ast(captures: any, __indentCol: number = 0): any {
  return { type: "Identifier", name: __renderSlot_ast(captures.name, __indentCol) };
}

function __build_Expr_1_ast(captures: any, __indentCol: number = 0): any {
  return { type: "NumericLiteral", value: __renderSlot_ast(captures.value, __indentCol) };
}

function __build_Expr_2_ast(captures: any, __indentCol: number = 0): any {
  return __renderSlot_ast(captures.inner, __indentCol);
}

function __build_Expr_3_ast(captures: any, __indentCol: number = 0): any {
  return { type: "UnaryExpression", op: __renderSlot_ast(captures.op, __indentCol), operand: __renderSlot_ast(captures.operand, __indentCol) };
}

function __build_Expr_4_ast(captures: any, __indentCol: number = 0): any {
  return { type: "BinaryExpression", op: __renderSlot_ast(captures.op, __indentCol), left: __renderSlot_ast(captures.left, __indentCol), right: __renderSlot_ast(captures.right, __indentCol) };
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "Expr#0": return __build_Expr_0_ast(captures, __indentCol);
    case "Expr#1": return __build_Expr_1_ast(captures, __indentCol);
    case "Expr#2": return __build_Expr_2_ast(captures, __indentCol);
    case "Expr#3": return __build_Expr_3_ast(captures, __indentCol);
    case "Expr#4": return __build_Expr_4_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __renderSlot_ast(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_ast(v[i], __indentCol));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_ast(v, __indentCol);
  }
  return v;
}

const __renderDispatch: Record<string, (captures: any) => any> = {
  "ast": (captures: any) => __dispatchRender_ast(captures),
};

export function render(input: string, options: { target: "ast"; mode?: ParseMode }): Expr_ast;
export function render(input: string, options?: { target?: undefined; mode?: ParseMode }): Expr_ast;
export function render(input: string, options?: { target?: string; mode?: ParseMode }): unknown {
  const target = options?.target ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.target or set defaultTarget on the schema");
  }
  // Fused fast path covers BOTH Template-bodied targets (e.g. 'source') AND
  // structurally-fused object-bodied targets (e.g. 'ast' for schemas whose
  // ast body is a structured object with statically resolvable refs). In
  // raws mode the captures path attaches a per-node `source: string` field
  // that the structured-fused emit does not synthesize — skip fusion so the
  // returned shape matches caller expectations.
  if (options?.mode !== 'raws') {
    const fused = __renderFused(input, target);
    if (fused !== null) return fused;
  }
  const fn = __renderDispatch[target];
  if (!fn) {
    throw new Error("render: unknown target '" + target + "'");
  }
  const captures = options && options.mode ? __parse(input, { mode: options.mode }) : __parse(input);
  return fn(captures);
}

function __rebuildSlot(v: any, joinSep: string = "", leadingPrefix: boolean = false): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    const prefix = leadingPrefix && v.length > 0 ? joinSep : "";
    let out = prefix;
    for (let i = 0; i < v.length; i++) {
      if (i > 0 && joinSep.length > 0) out += joinSep;
      out += __rebuildSlot(v[i]);
    }
    return out;
  }
  return String(v);
}

function __rebuild_Expr_0(captures: any): string {
  return String(__rebuildSlot(captures.name));
}

function __rebuild_Expr_1(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_Expr_2(captures: any): string {
  return "(" + __rebuildSlot(captures.inner) + ")";
}

function __rebuild_Expr_3(captures: any): string {
  return __rebuildSlot(captures.op) + __rebuildSlot(captures.operand);
}

function __rebuild_Expr_4(captures: any): string {
  return __rebuildSlot(captures.left) + " " + __rebuildSlot(captures.op) + " " + __rebuildSlot(captures.right);
}

function __invert_Expr_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "Identifier")) {
    throw new Error("stringify: field \"type\" expected \"Identifier\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  return __rebuild_Expr_0(captures, __indentCol);
}

function __invert_Expr_1_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "NumericLiteral")) {
    throw new Error("stringify: field \"type\" expected \"NumericLiteral\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_Expr_1(captures, __indentCol);
}

function __invert_Expr_3_ast(value: any, __indentCol: number = 0): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error("stringify: expected unary expression object for 'Expr', got " + typeof value);
  }
  const __op = value.op;
  if (typeof __op !== 'string') {
    throw new Error("stringify: unary 'Expr' missing string op (got " + typeof __op + ")");
  }
  const __operandStr = __invertSlotFor_Expr_ast(value.operand, __indentCol, 6);
  return __op + "" + String(__operandStr);
}

function __invert_Expr_4_ast(value: any, __indentCol: number = 0, __minPrec: number = -1): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error("stringify: expected binary expression object for 'Expr', got " + typeof value);
  }
  const __op = value.op;
  if (typeof __op !== 'string') {
    throw new Error("stringify: binary 'Expr' missing string op (got " + typeof __op + ")");
  }
  const __precTable: Record<string, number> = {
    "!==": 1,
    "===": 1,
    "!=": 1,
    "&&": 0,
    "**": 5,
    "<=": 2,
    "==": 1,
    ">=": 2,
    "||": 0,
    "%": 4,
    "*": 4,
    "+": 3,
    "-": 3,
    "/": 4,
    "<": 2,
    ">": 2,
  };
  const __rightAssoc: Record<string, boolean> = {
    "**": true,
  };
  const __myPrec = __precTable[__op];
  if (__myPrec === undefined) {
    throw new Error("stringify: binary 'Expr' op '" + __op + "' not declared in operators map");
  }
  // Left-assoc: left=myPrec, right=myPrec+1. Right-assoc: left=myPrec+1,
  // right=myPrec. Wrap rule `myPrec < minPrec` stays the same; only
  // what we PASS as minPrec to the children swaps.
  const __leftMinPrec = __rightAssoc[__op] ? __myPrec + 1 : __myPrec;
  const __rightMinPrec = __rightAssoc[__op] ? __myPrec : __myPrec + 1;
  const __leftStr = __invertSlotFor_Expr_ast(value.left, __indentCol, __leftMinPrec);
  const __rightStr = __invertSlotFor_Expr_ast(value.right, __indentCol, __rightMinPrec);
  let __result = String(__leftStr) + " " + __op + " " + String(__rightStr);
  if (__myPrec < __minPrec) __result = "(" + __result + ")";
  return __result;
}

function __dispatchInverse_Expr_ast(value: any, __indentCol: number = 0, __minPrec: number = -1): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "Identifier")) return __invert_Expr_0_ast(value, __indentCol);
    if (Object.is(value.type, "NumericLiteral")) return __invert_Expr_1_ast(value, __indentCol);
    if (Object.is(value.type, "UnaryExpression")) return __invert_Expr_3_ast(value, __indentCol);
    if (Object.is(value.type, "BinaryExpression")) return __invert_Expr_4_ast(value, __indentCol, __minPrec);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Expr_ast(value, 0);
}

function __invertSlotFor_Expr_ast(v: any, __indentCol: number = 0, __minPrec: number = -1): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Expr_ast(v, __indentCol, __minPrec); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Expr_ast(v[i], __indentCol, __minPrec);
        if (r != null) out.push(r);
      }
      return out;
    }
  }
  // null can be either an absent optional capture or an intentional null
  // value (e.g. JsonNull). Try the dispatcher first; on throw, treat as
  // absent (preserves optional-slot semantics for callers like rebuild's
  // optional-slot ternary).
  if (v === null) {
    try { return __dispatchInverse_Expr_ast(v, __indentCol, __minPrec); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Expr_ast(v, __indentCol, __minPrec); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Expr_ast(v, __indentCol, __minPrec);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Expr_ast(v, __indentCol, __minPrec); } catch (_e) { return String(v); }
}

function __invertSlotLeaf_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  return String(v);
}

const __inverseDispatch: Record<string, (value: any) => string> = {
  "ast": __dispatchInverse_ast,
};

export function stringify(value: Expr_ast, options: { target: "ast" }): string;
export function stringify(value: Expr_ast, options?: { target?: undefined }): string;
export function stringify(value: unknown, options?: { target?: string }): string {
  const target = options?.target ?? __defaultTarget;
  if (!target) {
    throw new Error("stringify: missing target; pass options.target or set defaultTarget on the schema");
  }
  const fn = __inverseDispatch[target];
  if (!fn) {
    throw new Error("stringify: unknown target '" + target + "'");
  }
  return fn(value);
}

function __fusedRenderStructured_Expr_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "Identifier", name: name };
}

function __fusedRenderStructured_Expr_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = Number(input.slice(__value_start, __value_end));
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "NumericLiteral", value: value };
}

const __fusedRenderStructuredTable_ast: Record<string, (state: State) => unknown> = {
  "Expr#0": __fusedRenderStructured_Expr_0_ast,
  "Expr#1": __fusedRenderStructured_Expr_1_ast,
};

const __rootProductionKey: string = "Expr#0";

function __fusedRenderDispatchLookup(target: string): Record<string, (state: State, out: string[]) => boolean> | null {
  switch (target) {
    default: return null;
  }
}

function __fusedRenderStructuredTableLookup(target: string): Record<string, (state: State) => unknown> | null {
  switch (target) {
    case "ast": return __fusedRenderStructuredTable_ast;
    default: return null;
  }
}

function __renderFused(input: string, target: string): unknown {
  // Structured-fused path: when the target's body is a structured object
  // and every leaf is statically resolvable, the parsed value IS the
  // rendered output — one pass, no captures intermediate.
  const sTable = __fusedRenderStructuredTableLookup(target);
  if (sTable !== null) {
    const sRoot = sTable[__rootProductionKey];
    if (sRoot !== undefined) {
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode: 'fast',
    lineStarts: [],
    indentStack: new Int32Array(16),
    indentStackTop: 0,
  };
      const result = sRoot(state);
      if (result === null) return null;
      if (state.pos !== input.length) return null;
      return result;
    }
  }
  // String-fused path: Template-bodied targets emit text directly into a
  // shared buffer.
  const table = __fusedRenderDispatchLookup(target);
  if (table === null) return null;
  const rootFusedFn = table[__rootProductionKey];
  if (rootFusedFn === undefined) return null;
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode: 'fast',
    lineStarts: [],
    indentStack: new Int32Array(16),
    indentStackTop: 0,
  };
  const out: string[] = [];
  const ok = rootFusedFn(state, out);
  if (!ok) return null;
  if (state.pos !== input.length) return null;
  return out.join('');
}

function __parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
  if (input.charCodeAt(0) === 0xfeff) input = input.slice(1);
  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode,
    lineStarts: mode === 'raws' ? computeLineStarts(input) : [],
    indentStack: new Int32Array(16),
    indentStackTop: 0,
  };
  const result = parseExpr(state);
  while (state.pos < state.len) {
    const __c = input.charCodeAt(state.pos);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { state.pos++; continue; }
    break;
  }
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
  return result;
}

export function validate(input: string, options?: ParseOptions): void {
  const __state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode: 'fast',
    lineStarts: [],
    indentStack: new Int32Array(16),
    indentStackTop: 0,
  };
  const __result = parseExpr(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/js-expr",
  exportName: 'validate',
};
