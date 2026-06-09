// Auto-generated from packages/pg-select/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (v2 scannerless emit — see docs/scannerless-emit-v2.md)
/* eslint-disable */
// @ts-nocheck


export type ParseMode = 'fast' | 'raws';
// Emitted whenever a `.recovers({ drop, syncAt })` production matched.
// `code` distinguishes the diagnostic shape; `drop` is the schema-declared
// label; `start`/`end` are byte offsets into the parsed input demarcating
// the dropped region.
export type Diagnostic = {
  readonly code: string;
  readonly drop: string;
  readonly start: number;
  readonly end: number;
};
export type ParseOptions = {
  readonly mode?: ParseMode;
  readonly validate?: boolean;
  // Invoked once per recovered production, after the parse has succeeded.
  // Suppressed when the parse ultimately fails (a diagnostic for a region
  // inside an alt that the dispatcher later rolled back would be misleading
  // — only diagnostics from the production path that produced the final
  // result are surfaced).
  readonly onDiagnostic?: (d: Diagnostic) => void;
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
  // Recovery diagnostics accumulated during this parse. A recovery
  // production pushes one entry just before its successful return.
  // Speculation rewinds truncate the list back to a pre-entry snapshot
  // when the speculating alt returns null — see emitProduction.
  diagnostics: Diagnostic[];
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
export type ColumnRef_ast = { type: "wildcard" } | { type: "column"; name: string };
export type ColumnRef_source = string;
export type LiteralValue_ast = { type: "number"; value: string } | { type: "string"; value: string };
export type LiteralValue_source = string;
export type Predicate_ast = { type: "predicate"; col: ColumnRef_ast; op: "!=" | "<=" | ">=" | "<" | "=" | ">"; val: LiteralValue_ast };
export type Predicate_source = string;
export type Select_ast = { type: "select"; columns: ColumnRef_ast[]; table: string } | { type: "select"; columns: ColumnRef_ast[]; table: string; where: Predicate_ast } | { type: "select"; columns: ColumnRef_ast[]; table: string; limit: string } | { type: "select"; columns: ColumnRef_ast[]; table: string; where: Predicate_ast; limit: string };
export type Select_source = string;

function parseColumnRef__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColumnRef#0", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ColumnRef#0" };
}

function parseColumnRef__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColumnRef#1", __ws: __ws, __litPres: __litPres, name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ColumnRef#1", name: name };
}

function parseColumnRef(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 42) {
  return parseColumnRef__alt0(state);
}
  if (isJsIdentStart(input.charCodeAt(off))) {
  return parseColumnRef__alt1(state);
}
  return null;
}

function parseLiteralValue__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LiteralValue#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LiteralValue#0", value: value };
}

function parseLiteralValue__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  {
    const __q = input.charCodeAt(off);
    off++;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 0x5c && off + 1 < len) { off += 2; continue; }
      if (__c === __q) { off++; break; }
      if (__c === 0x0a || __c === 0x0d) break;
      off++;
    }
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LiteralValue#1", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LiteralValue#1", value: value };
}

function parseLiteralValue(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (isDigit(input.charCodeAt(off))) {
  return parseLiteralValue__alt0(state);
}
  if ((input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27)) {
  return parseLiteralValue__alt1(state);
}
  return null;
}

function parsePredicate(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  state.pos = off;
  const __col_start = off;
  const col = parseColumnRef(state);
  if (col === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __col_end = off;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && ((input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 60) || (input.charCodeAt(off) === 61) || (input.charCodeAt(off) === 62)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __op_start = off;
  if (input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 60) { off += 1; } else if (input.charCodeAt(off) === 61) { off += 1; } else if (input.charCodeAt(off) === 62) { off += 1; }
  const __op_end = off;
  const op = input.slice(__op_start, __op_end);
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  state.pos = off;
  const __val_start = off;
  const val = parseLiteralValue(state);
  if (val === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __val_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Predicate#0", __ws: __ws, __litPres: __litPres, col: col, op: op, val: val };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Predicate#0", col: col, op: op, val: val };
}

function parseSelect__alt0(state: State, entryOff: number, columns: string, table: string, columns__start: number, table__start: number, columns__end: number, table__end: number, __ws: string[] | null, __litPres: boolean[] | null): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Select#0", __ws: __ws, __litPres: __litPres, columns: columns, table: table };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Select#0", columns: columns, table: table };
}

function parseSelect__alt1(state: State, entryOff: number, columns: string, table: string, columns__start: number, table__start: number, columns__end: number, table__end: number, __ws: string[] | null, __litPres: boolean[] | null): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.startsWith("WHERE", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  state.pos = off;
  const __where_start = off;
  const where = parsePredicate(state);
  if (where === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __where_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Select#1", __ws: __ws, __litPres: __litPres, columns: columns, table: table, where: where };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Select#1", columns: columns, table: table, where: where };
}

function parseSelect__alt2(state: State, entryOff: number, columns: string, table: string, columns__start: number, table__start: number, columns__end: number, table__end: number, __ws: string[] | null, __litPres: boolean[] | null): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.startsWith("LIMIT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __limit_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __limit_end = off;
  const limit = input.slice(__limit_start, __limit_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Select#2", __ws: __ws, __litPres: __litPres, columns: columns, table: table, limit: limit };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Select#2", columns: columns, table: table, limit: limit };
}

function parseSelect__alt3(state: State, entryOff: number, columns: string, table: string, columns__start: number, table__start: number, columns__end: number, table__end: number, __ws: string[] | null, __litPres: boolean[] | null): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.startsWith("WHERE", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  state.pos = off;
  const __where_start = off;
  const where = parsePredicate(state);
  if (where === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __where_end = off;
  const __wsStart_6 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_6, off));
  if (!(input.startsWith("LIMIT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_7 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_7, off));
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __limit_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __limit_end = off;
  const limit = input.slice(__limit_start, __limit_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Select#3", __ws: __ws, __litPres: __litPres, columns: columns, table: table, where: where, limit: limit };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Select#3", columns: columns, table: table, where: where, limit: limit };
}

function parseSelect(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  const __columns_start = off;
  const columns: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __columns_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __columns_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    // Skip ws (and comments when declared) before the separator.
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 44) {
      __sepConsumed = true;
      off += 1;
      // Skip ws (and comments) after the separator.
      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    }
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 70 && (input.startsWith("FROM", off))) break;
    }
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseColumnRef(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__columns_prevItemEnd >= 0 && __columns_iws !== null) __columns_iws.push(input.slice(__columns_prevItemEnd, __itemStart));
    columns.push(__cand);
    __columns_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (!__sepConsumed) { off = __preSweep; }
  if (columns.length < 1) { state.pos = entryOff; return null; }
  const __columns_end = off;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __table_start = off;
  off++;
  while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
  const __table_end = off;
  const table = input.slice(__table_start, __table_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  const __postPos = off;
  let __peekOff = off;
  while (__peekOff < len) {
    const c = input.charCodeAt(__peekOff);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { __peekOff++; continue; }
    break;
  }
  if (input.startsWith("WHERE", __peekOff)) {
    state.pos = __postPos; { const r = parseSelect__alt3(state, entryOff, columns, table, __columns_start, __table_start, __columns_end, __table_end, __ws, __litPres); if (r !== null) return r; }
    state.pos = __postPos; { const r = parseSelect__alt1(state, entryOff, columns, table, __columns_start, __table_start, __columns_end, __table_end, __ws, __litPres); if (r !== null) return r; }
  }
  if (input.startsWith("LIMIT", __peekOff)) {
    state.pos = __postPos; { const r = parseSelect__alt2(state, entryOff, columns, table, __columns_start, __table_start, __columns_end, __table_end, __ws, __litPres); if (r !== null) return r; }
  }
  state.pos = __postPos;
  return parseSelect__alt0(state, entryOff, columns, table, __columns_start, __table_start, __columns_end, __table_end, __ws, __litPres);
}

const __defaultTarget: string | undefined = "ast";

function __build_ColumnRef_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "wildcard" }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "wildcard" });
}

function __build_ColumnRef_0_source(captures: any, __indentCol: number = 0): any {
  return String("*");
}

function __build_ColumnRef_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "column", name: __renderSlot_ast(captures.name, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "column", name: __renderSlot_ast(captures.name, __indentCol) });
}

function __build_ColumnRef_1_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.name, __indentCol) ?? ""));
}

function __build_LiteralValue_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "number", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "number", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_LiteralValue_0_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.value, __indentCol) ?? ""));
}

function __build_LiteralValue_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "string", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "string", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_LiteralValue_1_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.value, __indentCol) ?? ""));
}

function __build_Predicate_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "predicate", col: __renderSlot_ast(captures.col, __indentCol), op: __renderSlot_ast(captures.op, __indentCol), val: __renderSlot_ast(captures.val, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "predicate", col: __renderSlot_ast(captures.col, __indentCol), op: __renderSlot_ast(captures.op, __indentCol), val: __renderSlot_ast(captures.val, __indentCol) });
}

function __build_Predicate_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.col, __indentCol) ?? "") + " " + (__renderSlot_source(captures.op, __indentCol) ?? "") + " " + (__renderSlot_source(captures.val, __indentCol) ?? "");
}

function __build_Select_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "select", columns: __renderSlot_ast(captures.columns, __indentCol), table: __renderSlot_ast(captures.table, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, columns_iws: captures.columns_iws } }) : { type: "select", columns: __renderSlot_ast(captures.columns, __indentCol), table: __renderSlot_ast(captures.table, __indentCol) });
}

function __build_Select_0_source(captures: any, __indentCol: number = 0): any {
  return "SELECT " + (Array.isArray(captures.columns) ? captures.columns.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.columns, __indentCol) ?? "")) + " FROM " + (__renderSlot_source(captures.table, __indentCol) ?? "");
}

function __build_Select_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "select", columns: __renderSlot_ast(captures.columns, __indentCol), table: __renderSlot_ast(captures.table, __indentCol), where: __renderSlot_ast(captures.where, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, columns_iws: captures.columns_iws } }) : { type: "select", columns: __renderSlot_ast(captures.columns, __indentCol), table: __renderSlot_ast(captures.table, __indentCol), where: __renderSlot_ast(captures.where, __indentCol) });
}

function __build_Select_1_source(captures: any, __indentCol: number = 0): any {
  return "SELECT " + (Array.isArray(captures.columns) ? captures.columns.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.columns, __indentCol) ?? "")) + " FROM " + (__renderSlot_source(captures.table, __indentCol) ?? "") + " WHERE " + (__renderSlot_source(captures.where, __indentCol) ?? "");
}

function __build_Select_2_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "select", columns: __renderSlot_ast(captures.columns, __indentCol), table: __renderSlot_ast(captures.table, __indentCol), limit: __renderSlot_ast(captures.limit, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, columns_iws: captures.columns_iws } }) : { type: "select", columns: __renderSlot_ast(captures.columns, __indentCol), table: __renderSlot_ast(captures.table, __indentCol), limit: __renderSlot_ast(captures.limit, __indentCol) });
}

function __build_Select_2_source(captures: any, __indentCol: number = 0): any {
  return "SELECT " + (Array.isArray(captures.columns) ? captures.columns.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.columns, __indentCol) ?? "")) + " FROM " + (__renderSlot_source(captures.table, __indentCol) ?? "") + " LIMIT " + (__renderSlot_source(captures.limit, __indentCol) ?? "");
}

function __build_Select_3_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "select", columns: __renderSlot_ast(captures.columns, __indentCol), table: __renderSlot_ast(captures.table, __indentCol), where: __renderSlot_ast(captures.where, __indentCol), limit: __renderSlot_ast(captures.limit, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, columns_iws: captures.columns_iws } }) : { type: "select", columns: __renderSlot_ast(captures.columns, __indentCol), table: __renderSlot_ast(captures.table, __indentCol), where: __renderSlot_ast(captures.where, __indentCol), limit: __renderSlot_ast(captures.limit, __indentCol) });
}

function __build_Select_3_source(captures: any, __indentCol: number = 0): any {
  return "SELECT " + (Array.isArray(captures.columns) ? captures.columns.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.columns, __indentCol) ?? "")) + " FROM " + (__renderSlot_source(captures.table, __indentCol) ?? "") + " WHERE " + (__renderSlot_source(captures.where, __indentCol) ?? "") + " LIMIT " + (__renderSlot_source(captures.limit, __indentCol) ?? "");
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "ColumnRef#0": return __build_ColumnRef_0_ast(captures, __indentCol);
    case "ColumnRef#1": return __build_ColumnRef_1_ast(captures, __indentCol);
    case "LiteralValue#0": return __build_LiteralValue_0_ast(captures, __indentCol);
    case "LiteralValue#1": return __build_LiteralValue_1_ast(captures, __indentCol);
    case "Predicate#0": return __build_Predicate_0_ast(captures, __indentCol);
    case "Select#0": return __build_Select_0_ast(captures, __indentCol);
    case "Select#1": return __build_Select_1_ast(captures, __indentCol);
    case "Select#2": return __build_Select_2_ast(captures, __indentCol);
    case "Select#3": return __build_Select_3_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "ColumnRef#0": return __build_ColumnRef_0_source(captures, __indentCol);
    case "ColumnRef#1": return __build_ColumnRef_1_source(captures, __indentCol);
    case "LiteralValue#0": return __build_LiteralValue_0_source(captures, __indentCol);
    case "LiteralValue#1": return __build_LiteralValue_1_source(captures, __indentCol);
    case "Predicate#0": return __build_Predicate_0_source(captures, __indentCol);
    case "Select#0": return __build_Select_0_source(captures, __indentCol);
    case "Select#1": return __build_Select_1_source(captures, __indentCol);
    case "Select#2": return __build_Select_2_source(captures, __indentCol);
    case "Select#3": return __build_Select_3_source(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'source'");
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

function __renderSlot_source(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_source(v[i], __indentCol));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_source(v, __indentCol);
  }
  return v;
}

const __renderDispatch: Record<string, (captures: any) => any> = {
  "ast": (captures: any) => __dispatchRender_ast(captures),
  "source": (captures: any) => __dispatchRender_source(captures),
};

export function render(input: string, options: { target: "ast"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Select_ast;
export function render(input: string, options: { target: "source"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Select_source;
export function render(input: string, options?: { target?: undefined; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Select_ast;
export function render(input: string, options?: { target?: string; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): unknown {
  const target = options?.target ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.target or set defaultTarget on the schema");
  }
  // Fused fast path covers BOTH Template-bodied targets (e.g. 'source') AND
  // structurally-fused object-bodied targets (e.g. 'ast' for schemas whose
  // ast body is a structured object with statically resolvable refs). In
  // raws mode the captures path attaches a per-node `source: string` field
  // that the structured-fused emit does not synthesize — skip fusion so the
  // returned shape matches caller expectations. Recovery diagnostics also
  // force the captures path: structurally-fused render skips recovery
  // productions (see canFuseStructured), so a parse that depends on a
  // recovery alt naturally falls through to the captures path where the
  // diagnostic is emitted.
  if (options?.mode !== 'raws') {
    const fused = __renderFused(input, target);
    if (fused !== null) return fused;
  }
  const fn = __renderDispatch[target];
  if (!fn) {
    throw new Error("render: unknown target '" + target + "'");
  }
  const captures = __parse(input, { mode: options?.mode, onDiagnostic: options?.onDiagnostic });
  const result = fn(captures);
  return result;
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

// Phase 4c v2: preserve-mode array join. Interleaves items[i] with
// iws[i-1] (per-iteration ws captured at parse time). Falls back to
// the static fallbackSep when iws is null/short — defensive against
// hand-built ASTs that don't carry the iws array.
function __rebuildSlotIws(v: any, iws: any, fallbackSep: string): string {
  if (v === null || v === undefined) return "";
  if (!Array.isArray(v)) return String(v);
  let out = "";
  const hasIws = Array.isArray(iws);
  for (let i = 0; i < v.length; i++) {
    if (i > 0) {
      const gap = hasIws && typeof iws[i - 1] === "string" ? iws[i - 1] : fallbackSep;
      out += gap;
    }
    out += __rebuildSlot(v[i]);
  }
  return out;
}

function __rebuild_ColumnRef_0(captures: any): string {
  return "*";
}

function __rebuild_ColumnRef_1(captures: any): string {
  return String(__rebuildSlot(captures.name));
}

function __rebuild_LiteralValue_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_LiteralValue_1(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_Predicate_0(captures: any): string {
  return __rebuildSlot(captures.col) + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.op) + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + __rebuildSlot(captures.val);
}

function __rebuild_Select_0(captures: any): string {
  return "SELECT" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "FROM" + (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : " ") + __rebuildSlot(captures.table);
}

function __rebuild_Select_1(captures: any): string {
  return "SELECT" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "FROM" + (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : " ") + __rebuildSlot(captures.table) + (captures.__ws && captures.__ws[3] !== undefined ? captures.__ws[3] : " ") + "WHERE" + (captures.__ws && captures.__ws[4] !== undefined ? captures.__ws[4] : " ") + __rebuildSlot(captures.where);
}

function __rebuild_Select_2(captures: any): string {
  return "SELECT" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "FROM" + (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : " ") + __rebuildSlot(captures.table) + (captures.__ws && captures.__ws[3] !== undefined ? captures.__ws[3] : " ") + "LIMIT" + (captures.__ws && captures.__ws[4] !== undefined ? captures.__ws[4] : " ") + __rebuildSlot(captures.limit);
}

function __rebuild_Select_3(captures: any): string {
  return "SELECT" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "FROM" + (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : " ") + __rebuildSlot(captures.table) + (captures.__ws && captures.__ws[3] !== undefined ? captures.__ws[3] : " ") + "WHERE" + (captures.__ws && captures.__ws[4] !== undefined ? captures.__ws[4] : " ") + __rebuildSlot(captures.where) + (captures.__ws && captures.__ws[5] !== undefined ? captures.__ws[5] : " ") + "LIMIT" + (captures.__ws && captures.__ws[6] !== undefined ? captures.__ws[6] : " ") + __rebuildSlot(captures.limit);
}

function __invert_ColumnRef_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "wildcard")) {
    throw new Error("stringify: field \"type\" expected \"wildcard\", got " + JSON.stringify(value.type));
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_ColumnRef_0(captures, __indentCol);
  }
  return "*";
}

function __invert_ColumnRef_1_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "column")) {
    throw new Error("stringify: field \"type\" expected \"column\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_ColumnRef_1(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.name));
}

function __invert_LiteralValue_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "number")) {
    throw new Error("stringify: field \"type\" expected \"number\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_LiteralValue_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.value));
}

function __invert_LiteralValue_1_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "string")) {
    throw new Error("stringify: field \"type\" expected \"string\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_LiteralValue_1(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.value));
}

function __invert_Predicate_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "predicate")) {
    throw new Error("stringify: field \"type\" expected \"predicate\", got " + JSON.stringify(value.type));
  }
  captures.col = __invertSlotFor_ColumnRef_ast(value.col, __indentCol);
  captures.op = __invertSlotLeaf_ast(value.op);
  captures.val = __invertSlotFor_LiteralValue_ast(value.val, __indentCol);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Predicate_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.col) + " " + __rebuildSlot(captures.op) + " " + __rebuildSlot(captures.val);
}

function __invert_Select_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "select")) {
    throw new Error("stringify: field \"type\" expected \"select\", got " + JSON.stringify(value.type));
  }
  captures.columns = ((Array.isArray(value.columns) ? value.columns : value.columns.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_ColumnRef_ast(__e, __indentCol)));
  captures.table = __invertSlotLeaf_ast(value.table);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Select_0(captures, __indentCol);
  }
  return "SELECT " + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + " FROM " + __rebuildSlot(captures.table);
}

function __invert_Select_1_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "select")) {
    throw new Error("stringify: field \"type\" expected \"select\", got " + JSON.stringify(value.type));
  }
  captures.columns = ((Array.isArray(value.columns) ? value.columns : value.columns.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_ColumnRef_ast(__e, __indentCol)));
  captures.table = __invertSlotLeaf_ast(value.table);
  captures.where = __invertSlotFor_Predicate_ast(value.where, __indentCol);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Select_1(captures, __indentCol);
  }
  return "SELECT " + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + " FROM " + __rebuildSlot(captures.table) + " WHERE " + __rebuildSlot(captures.where);
}

function __invert_Select_2_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "select")) {
    throw new Error("stringify: field \"type\" expected \"select\", got " + JSON.stringify(value.type));
  }
  captures.columns = ((Array.isArray(value.columns) ? value.columns : value.columns.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_ColumnRef_ast(__e, __indentCol)));
  captures.table = __invertSlotLeaf_ast(value.table);
  captures.limit = __invertSlotLeaf_ast(value.limit);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Select_2(captures, __indentCol);
  }
  return "SELECT " + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + " FROM " + __rebuildSlot(captures.table) + " LIMIT " + __rebuildSlot(captures.limit);
}

function __invert_Select_3_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "select")) {
    throw new Error("stringify: field \"type\" expected \"select\", got " + JSON.stringify(value.type));
  }
  captures.columns = ((Array.isArray(value.columns) ? value.columns : value.columns.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_ColumnRef_ast(__e, __indentCol)));
  captures.table = __invertSlotLeaf_ast(value.table);
  captures.where = __invertSlotFor_Predicate_ast(value.where, __indentCol);
  captures.limit = __invertSlotLeaf_ast(value.limit);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Select_3(captures, __indentCol);
  }
  return "SELECT " + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + " FROM " + __rebuildSlot(captures.table) + " WHERE " + __rebuildSlot(captures.where) + " LIMIT " + __rebuildSlot(captures.limit);
}

function __invert_ColumnRef_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("*", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"*\" in template body");
  }
  __pos += 1;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_ColumnRef_0(captures, __indentCol);
  }
  return "*";
}

function __invert_ColumnRef_1_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.name = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_ColumnRef_1(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.name));
}

function __invert_LiteralValue_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_LiteralValue_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.value));
}

function __invert_LiteralValue_1_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_LiteralValue_1(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.value));
}

function __invert_Predicate_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture col");
    }
    captures.col = __invertSlotFor_ColumnRef_source(__s.slice(__pos, __end), __indentCol);
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture op");
    }
    captures.op = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.val = __invertSlotFor_LiteralValue_source(__s.slice(__pos), __indentCol);
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Predicate_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.col) + " " + __rebuildSlot(captures.op) + " " + __rebuildSlot(captures.val);
}

function __invert_Select_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("SELECT ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"SELECT \" in template body");
  }
  __pos += 7;
  {
    const __end = __s.indexOf(" FROM ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" FROM \" after capture columns");
    }
    captures.columns = ((Array.isArray(__s.slice(__pos, __end)) ? __s.slice(__pos, __end) : __s.slice(__pos, __end).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_ColumnRef_source(__e, __indentCol)));
    __pos = __end + 6;
  }
  captures.table = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Select_0(captures, __indentCol);
  }
  return "SELECT " + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + " FROM " + __rebuildSlot(captures.table);
}

function __invert_Select_1_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("SELECT ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"SELECT \" in template body");
  }
  __pos += 7;
  {
    const __end = __s.indexOf(" FROM ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" FROM \" after capture columns");
    }
    captures.columns = ((Array.isArray(__s.slice(__pos, __end)) ? __s.slice(__pos, __end) : __s.slice(__pos, __end).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_ColumnRef_source(__e, __indentCol)));
    __pos = __end + 6;
  }
  {
    const __end = __s.indexOf(" WHERE ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" WHERE \" after capture table");
    }
    captures.table = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  captures.where = __invertSlotFor_Predicate_source(__s.slice(__pos), __indentCol);
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Select_1(captures, __indentCol);
  }
  return "SELECT " + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + " FROM " + __rebuildSlot(captures.table) + " WHERE " + __rebuildSlot(captures.where);
}

function __invert_Select_2_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("SELECT ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"SELECT \" in template body");
  }
  __pos += 7;
  {
    const __end = __s.indexOf(" FROM ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" FROM \" after capture columns");
    }
    captures.columns = ((Array.isArray(__s.slice(__pos, __end)) ? __s.slice(__pos, __end) : __s.slice(__pos, __end).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_ColumnRef_source(__e, __indentCol)));
    __pos = __end + 6;
  }
  {
    const __end = __s.indexOf(" LIMIT ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" LIMIT \" after capture table");
    }
    captures.table = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  captures.limit = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Select_2(captures, __indentCol);
  }
  return "SELECT " + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + " FROM " + __rebuildSlot(captures.table) + " LIMIT " + __rebuildSlot(captures.limit);
}

function __invert_Select_3_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("SELECT ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"SELECT \" in template body");
  }
  __pos += 7;
  {
    const __end = __s.indexOf(" FROM ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" FROM \" after capture columns");
    }
    captures.columns = ((Array.isArray(__s.slice(__pos, __end)) ? __s.slice(__pos, __end) : __s.slice(__pos, __end).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_ColumnRef_source(__e, __indentCol)));
    __pos = __end + 6;
  }
  {
    const __end = __s.indexOf(" WHERE ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" WHERE \" after capture table");
    }
    captures.table = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  {
    const __end = __s.indexOf(" LIMIT ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" LIMIT \" after capture where");
    }
    captures.where = __invertSlotFor_Predicate_source(__s.slice(__pos, __end), __indentCol);
    __pos = __end + 7;
  }
  captures.limit = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Select_3(captures, __indentCol);
  }
  return "SELECT " + __rebuildSlotIws(captures.columns, captures.columns_iws, ",") + " FROM " + __rebuildSlot(captures.table) + " WHERE " + __rebuildSlot(captures.where) + " LIMIT " + __rebuildSlot(captures.limit);
}

function __dispatchInverse_ColumnRef_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "wildcard")) return __invert_ColumnRef_0_ast(value, __indentCol);
    if (Object.is(value.type, "column")) return __invert_ColumnRef_1_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_LiteralValue_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "number")) return __invert_LiteralValue_0_ast(value, __indentCol);
    if (Object.is(value.type, "string")) return __invert_LiteralValue_1_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Predicate_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "predicate")) return __invert_Predicate_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Select_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "select") && !("where" in value) && !("limit" in value)) return __invert_Select_0_ast(value, __indentCol);
    if (Object.is(value.type, "select") && "where" in value && !("limit" in value)) return __invert_Select_1_ast(value, __indentCol);
    if (Object.is(value.type, "select") && "limit" in value && !("where" in value)) return __invert_Select_2_ast(value, __indentCol);
    if (Object.is(value.type, "select") && "where" in value && "limit" in value) return __invert_Select_3_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Select_ast(value, 0);
}

function __dispatchInverse_ColumnRef_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("*")) return __invert_ColumnRef_0_source(value, __indentCol);
    try { return __invert_ColumnRef_1_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_LiteralValue_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_LiteralValue_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Predicate_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf(" ") >= 0) { try { return __invert_Predicate_0_source(value, __indentCol); } catch (_e) { /* try next */ } }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Select_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf(" WHERE ") >= 0 && value.indexOf(" LIMIT ") >= 0) { try { return __invert_Select_3_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf(" WHERE ") >= 0) { try { return __invert_Select_1_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf(" LIMIT ") >= 0) { try { return __invert_Select_2_source(value, __indentCol); } catch (_e) { /* try next */ } }
    try { return __invert_Select_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Select_source(value, 0);
}

function __invertSlotFor_ColumnRef_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_ColumnRef_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_ColumnRef_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_ColumnRef_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_ColumnRef_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_ColumnRef_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_ColumnRef_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_LiteralValue_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_LiteralValue_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_LiteralValue_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_LiteralValue_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_LiteralValue_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_LiteralValue_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_LiteralValue_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Predicate_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Predicate_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Predicate_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Predicate_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Predicate_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Predicate_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Predicate_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Select_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Select_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Select_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Select_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Select_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Select_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Select_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotLeaf_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  // Phase 4c v2: booleans pass through verbatim so synthetic presence
  // fields like __litPres survive the inverse without being coerced to
  // the string "true"/"false". Same for numbers (defensive — no existing
  // codegen path stores numbers in slots, but coercion would be a
  // silent bug in any future schema that does).
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_ast(v[i]);
      if (r !== null && r !== undefined) out.push(r);
    }
    return out;
  }
  return String(v);
}

function __invertSlotFor_ColumnRef_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_ColumnRef_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_ColumnRef_source(v[i], __indentCol);
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
    try { return __dispatchInverse_ColumnRef_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_ColumnRef_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_ColumnRef_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_ColumnRef_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_LiteralValue_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_LiteralValue_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_LiteralValue_source(v[i], __indentCol);
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
    try { return __dispatchInverse_LiteralValue_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_LiteralValue_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_LiteralValue_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_LiteralValue_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Predicate_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Predicate_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Predicate_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Predicate_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Predicate_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Predicate_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Predicate_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Select_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Select_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Select_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Select_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Select_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Select_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Select_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotLeaf_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  // Phase 4c v2: booleans pass through verbatim so synthetic presence
  // fields like __litPres survive the inverse without being coerced to
  // the string "true"/"false". Same for numbers (defensive — no existing
  // codegen path stores numbers in slots, but coercion would be a
  // silent bug in any future schema that does).
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_source(v[i]);
      if (r !== null && r !== undefined) out.push(r);
    }
    return out;
  }
  return String(v);
}

const __inverseDispatch: Record<string, (value: any) => string> = {
  "ast": __dispatchInverse_ast,
  "source": __dispatchInverse_source,
};

export function stringify(value: Select_ast, options: { target: "ast" }): string;
export function stringify(value: Select_source, options: { target: "source" }): string;
export function stringify(value: Select_ast, options?: { target?: undefined }): string;
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

function __fusedRender_ColumnRef_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("*");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_ColumnRef_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
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
    out.push(String(name ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_LiteralValue_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
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
    const value = input.slice(__value_start, __value_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_LiteralValue_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    {
      const __q = input.charCodeAt(off);
      off++;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 0x5c && off + 1 < len) { off += 2; continue; }
        if (__c === __q) { off++; break; }
        if (__c === 0x0a || __c === 0x0d) break;
        off++;
      }
    }
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Predicate_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_col: string[] = [];
    let __slotMatched_col = false;
    // recursive span (ColumnRef) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 36) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 42) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_0_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 65) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 66) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 67) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 68) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 69) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 70) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 71) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 73) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 74) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 75) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 76) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 78) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 79) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 80) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 81) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 82) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 85) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 86) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 88) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 90) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 95) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 97) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 98) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 99) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 100) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 101) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 102) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 103) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 104) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 105) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 106) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 107) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 108) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 109) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 110) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 111) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 112) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 113) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 114) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 115) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 116) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 117) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 118) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 119) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 120) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 121) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
        else if (__c0 === 122) {
          if (!__slotMatched_col) {
            state.pos = __offBefore;
            __slotBuf_col.length = 0;
            if (__fusedRender_ColumnRef_1_source(state, __slotBuf_col)) { __slotMatched_col = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_col) __slotBuf_col.length = 0;
      if (!__slotMatched_col) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && ((input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 60) || (input.charCodeAt(off) === 61) || (input.charCodeAt(off) === 62)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __op_start = off;
    if (input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 60) { off += 1; } else if (input.charCodeAt(off) === 61) { off += 1; } else if (input.charCodeAt(off) === 62) { off += 1; }
    const __op_end = off;
    const op = input.slice(__op_start, __op_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_val: string[] = [];
    let __slotMatched_val = false;
    // recursive span (LiteralValue) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 39) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_1_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 43) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 45) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 48) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 49) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 50) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 51) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 52) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 53) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 54) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 55) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 56) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
        else if (__c0 === 57) {
          if (!__slotMatched_val) {
            state.pos = __offBefore;
            __slotBuf_val.length = 0;
            if (__fusedRender_LiteralValue_0_source(state, __slotBuf_val)) { __slotMatched_val = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_val) __slotBuf_val.length = 0;
      if (!__slotMatched_val) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    for (let __i = 0; __i < __slotBuf_col.length; __i++) out.push(__slotBuf_col[__i]);
    out.push(" ");
    out.push(String(op ?? ""));
    out.push(" ");
    for (let __i = 0; __i < __slotBuf_val.length; __i++) out.push(__slotBuf_val[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Select_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_columns: string[] = [];
    let __slotMatched_columns = false;
    // recursive repeats span (ColumnRef) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        if (off < len) {
          const __sb = input.charCodeAt(off);
          if (__sb === 70 && (input.startsWith("FROM", off))) break;
        }
        const __bufLenBefore = __slotBuf_columns.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_columns.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 36) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 42) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_0_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 65) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 66) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 67) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 68) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 69) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 71) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 72) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 73) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 74) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 75) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 76) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 77) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 78) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 79) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 80) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 81) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 82) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 83) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 84) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 85) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 86) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 88) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 89) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 90) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 97) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 98) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 99) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 100) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 101) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 102) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 103) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 104) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 105) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 106) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 107) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 108) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 109) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 110) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 111) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 112) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 113) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 114) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 115) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 116) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 117) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 118) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 119) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 120) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 121) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 122) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_columns.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_columns = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __table_start = off;
    off++;
    while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
    const __table_end = off;
    const table = input.slice(__table_start, __table_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("SELECT ");
    for (let __i = 0; __i < __slotBuf_columns.length; __i++) out.push(__slotBuf_columns[__i]);
    out.push(" FROM ");
    out.push(String(table ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Select_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_columns: string[] = [];
    let __slotMatched_columns = false;
    // recursive repeats span (ColumnRef) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        if (off < len) {
          const __sb = input.charCodeAt(off);
          if (__sb === 70 && (input.startsWith("FROM", off))) break;
        }
        const __bufLenBefore = __slotBuf_columns.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_columns.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 36) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 42) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_0_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 65) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 66) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 67) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 68) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 69) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 71) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 72) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 73) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 74) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 75) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 76) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 77) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 78) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 79) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 80) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 81) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 82) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 83) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 84) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 85) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 86) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 88) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 89) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 90) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 97) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 98) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 99) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 100) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 101) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 102) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 103) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 104) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 105) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 106) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 107) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 108) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 109) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 110) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 111) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 112) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 113) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 114) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 115) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 116) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 117) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 118) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 119) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 120) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 121) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 122) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_columns.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_columns = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __table_start = off;
    off++;
    while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
    const __table_end = off;
    const table = input.slice(__table_start, __table_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("WHERE", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_where: string[] = [];
    let __slotMatched_where = false;
    // recursive span (Predicate) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 36) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 42) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 65) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 66) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 67) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 68) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 69) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 70) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 71) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 73) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 74) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 75) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 76) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 78) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 79) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 80) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 81) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 82) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 85) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 86) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 88) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 90) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 95) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 97) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 98) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 99) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 100) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 101) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 102) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 103) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 104) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 105) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 106) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 107) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 108) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 109) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 110) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 111) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 112) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 113) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 114) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 115) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 116) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 117) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 118) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 119) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 120) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 121) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 122) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_where) __slotBuf_where.length = 0;
      if (!__slotMatched_where) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("SELECT ");
    for (let __i = 0; __i < __slotBuf_columns.length; __i++) out.push(__slotBuf_columns[__i]);
    out.push(" FROM ");
    out.push(String(table ?? ""));
    out.push(" WHERE ");
    for (let __i = 0; __i < __slotBuf_where.length; __i++) out.push(__slotBuf_where[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Select_2_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_columns: string[] = [];
    let __slotMatched_columns = false;
    // recursive repeats span (ColumnRef) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        if (off < len) {
          const __sb = input.charCodeAt(off);
          if (__sb === 70 && (input.startsWith("FROM", off))) break;
        }
        const __bufLenBefore = __slotBuf_columns.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_columns.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 36) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 42) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_0_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 65) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 66) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 67) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 68) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 69) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 71) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 72) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 73) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 74) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 75) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 76) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 77) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 78) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 79) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 80) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 81) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 82) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 83) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 84) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 85) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 86) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 88) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 89) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 90) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 97) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 98) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 99) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 100) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 101) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 102) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 103) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 104) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 105) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 106) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 107) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 108) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 109) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 110) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 111) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 112) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 113) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 114) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 115) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 116) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 117) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 118) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 119) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 120) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 121) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 122) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_columns.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_columns = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __table_start = off;
    off++;
    while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
    const __table_end = off;
    const table = input.slice(__table_start, __table_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("LIMIT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __limit_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __limit_end = off;
    const limit = input.slice(__limit_start, __limit_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("SELECT ");
    for (let __i = 0; __i < __slotBuf_columns.length; __i++) out.push(__slotBuf_columns[__i]);
    out.push(" FROM ");
    out.push(String(table ?? ""));
    out.push(" LIMIT ");
    out.push(String(limit ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Select_3_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_columns: string[] = [];
    let __slotMatched_columns = false;
    // recursive repeats span (ColumnRef) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        if (off < len) {
          const __sb = input.charCodeAt(off);
          if (__sb === 70 && (input.startsWith("FROM", off))) break;
        }
        const __bufLenBefore = __slotBuf_columns.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_columns.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 36) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 42) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_0_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 65) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 66) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 67) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 68) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 69) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 71) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 72) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 73) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 74) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 75) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 76) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 77) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 78) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 79) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 80) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 81) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 82) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 83) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 84) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 85) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 86) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 88) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 89) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 90) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 97) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 98) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 99) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 100) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 101) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 102) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 103) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 104) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 105) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 106) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 107) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 108) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 109) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 110) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 111) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 112) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 113) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 114) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 115) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 116) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 117) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 118) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 119) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 120) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 121) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 122) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_columns.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_ColumnRef_1_source(state, __slotBuf_columns)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_columns.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_columns = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __table_start = off;
    off++;
    while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
    const __table_end = off;
    const table = input.slice(__table_start, __table_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("WHERE", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_where: string[] = [];
    let __slotMatched_where = false;
    // recursive span (Predicate) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 36) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 42) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 65) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 66) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 67) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 68) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 69) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 70) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 71) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 73) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 74) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 75) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 76) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 78) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 79) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 80) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 81) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 82) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 85) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 86) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 88) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 90) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 95) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 97) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 98) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 99) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 100) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 101) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 102) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 103) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 104) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 105) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 106) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 107) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 108) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 109) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 110) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 111) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 112) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 113) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 114) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 115) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 116) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 117) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 118) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 119) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 120) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 121) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
        else if (__c0 === 122) {
          if (!__slotMatched_where) {
            state.pos = __offBefore;
            __slotBuf_where.length = 0;
            if (__fusedRender_Predicate_0_source(state, __slotBuf_where)) { __slotMatched_where = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_where) __slotBuf_where.length = 0;
      if (!__slotMatched_where) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("LIMIT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __limit_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __limit_end = off;
    const limit = input.slice(__limit_start, __limit_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("SELECT ");
    for (let __i = 0; __i < __slotBuf_columns.length; __i++) out.push(__slotBuf_columns[__i]);
    out.push(" FROM ");
    out.push(String(table ?? ""));
    out.push(" WHERE ");
    for (let __i = 0; __i < __slotBuf_where.length; __i++) out.push(__slotBuf_where[__i]);
    out.push(" LIMIT ");
    out.push(String(limit ?? ""));
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "ColumnRef#0": __fusedRender_ColumnRef_0_source,
  "ColumnRef#1": __fusedRender_ColumnRef_1_source,
  "LiteralValue#0": __fusedRender_LiteralValue_0_source,
  "LiteralValue#1": __fusedRender_LiteralValue_1_source,
  "Predicate#0": __fusedRender_Predicate_0_source,
  "Select#0": __fusedRender_Select_0_source,
  "Select#1": __fusedRender_Select_1_source,
  "Select#2": __fusedRender_Select_2_source,
  "Select#3": __fusedRender_Select_3_source,
};

function __fusedRenderStructured_ColumnRef_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "wildcard" };
}

function __fusedRenderStructured_ColumnRef_1_ast(state: State): unknown {
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
  return { type: "column", name: name };
}

function __fusedRenderStructured_LiteralValue_0_ast(state: State): unknown {
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
  const value = input.slice(__value_start, __value_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "number", value: value };
}

function __fusedRenderStructured_LiteralValue_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  {
    const __q = input.charCodeAt(off);
    off++;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 0x5c && off + 1 < len) { off += 2; continue; }
      if (__c === __q) { off++; break; }
      if (__c === 0x0a || __c === 0x0d) break;
      off++;
    }
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "string", value: value };
}

function __fusedRenderStructured_Predicate_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let col: unknown = null;
  {
    const __before = off;
    state.pos = off;
    let __cand: unknown = null;
    const __c0 = input.charCodeAt(off);
    switch (__c0) {
      case 36:
      case 42:
      case 65:
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
      case 78:
      case 79:
      case 80:
      case 81:
      case 82:
      case 83:
      case 84:
      case 85:
      case 86:
      case 87:
      case 88:
      case 89:
      case 90:
      case 95:
      case 97:
      case 98:
      case 99:
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
      case 108:
      case 109:
      case 110:
      case 111:
      case 112:
      case 113:
      case 114:
      case 115:
      case 116:
      case 117:
      case 118:
      case 119:
      case 120:
      case 121:
      case 122:
      {
      __cand = __fusedRenderStructuredDispatch_ColumnRef_ast(state);
        break;
      }
    }
    col = __cand;
    if (col === null) { off = __before; state.pos = __before; } else { off = state.pos; }
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && ((input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) || (input.charCodeAt(off) === 60) || (input.charCodeAt(off) === 61) || (input.charCodeAt(off) === 62)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __op_start = off;
  if (input.charCodeAt(off) === 33 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 62 && input.charCodeAt(off + 1) === 61) { off += 2; } else if (input.charCodeAt(off) === 60) { off += 1; } else if (input.charCodeAt(off) === 61) { off += 1; } else if (input.charCodeAt(off) === 62) { off += 1; }
  const __op_end = off;
  const op = input.slice(__op_start, __op_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let val: unknown = null;
  {
    const __before = off;
    state.pos = off;
    let __cand: unknown = null;
    const __c0 = input.charCodeAt(off);
    switch (__c0) {
      case 39:
      case 43:
      case 45:
      case 48:
      case 49:
      case 50:
      case 51:
      case 52:
      case 53:
      case 54:
      case 55:
      case 56:
      case 57:
      {
      __cand = __fusedRenderStructuredDispatch_LiteralValue_ast(state);
        break;
      }
    }
    val = __cand;
    if (val === null) { off = __before; state.pos = __before; } else { off = state.pos; }
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "predicate", col: col, op: op, val: val };
}

function __fusedRenderStructured_Select_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const columns: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 44) {
      __sepConsumed = true;
      off += 1;
      while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    }
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 70 && input.startsWith("FROM", off)) break;
    }
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      switch (__c0) {
        case 36:
        case 42:
        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 95:
        case 97:
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
        {
        __cand = __fusedRenderStructuredDispatch_ColumnRef_ast(state);
          break;
        }
      }
    }
    if (__cand === null) break;
    columns.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  if (columns.length < 1) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __table_start = off;
  off++;
  while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
  const __table_end = off;
  const table = input.slice(__table_start, __table_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "select", columns: columns, table: table };
}

function __fusedRenderStructured_Select_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const columns: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 44) {
      __sepConsumed = true;
      off += 1;
      while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    }
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 70 && input.startsWith("FROM", off)) break;
    }
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      switch (__c0) {
        case 36:
        case 42:
        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 95:
        case 97:
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
        {
        __cand = __fusedRenderStructuredDispatch_ColumnRef_ast(state);
          break;
        }
      }
    }
    if (__cand === null) break;
    columns.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  if (columns.length < 1) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __table_start = off;
  off++;
  while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
  const __table_end = off;
  const table = input.slice(__table_start, __table_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("WHERE", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let where: unknown = null;
  {
    const __before = off;
    state.pos = off;
    let __cand: unknown = null;
    const __c0 = input.charCodeAt(off);
    switch (__c0) {
      case 36:
      case 42:
      case 65:
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
      case 78:
      case 79:
      case 80:
      case 81:
      case 82:
      case 83:
      case 84:
      case 85:
      case 86:
      case 87:
      case 88:
      case 89:
      case 90:
      case 95:
      case 97:
      case 98:
      case 99:
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
      case 108:
      case 109:
      case 110:
      case 111:
      case 112:
      case 113:
      case 114:
      case 115:
      case 116:
      case 117:
      case 118:
      case 119:
      case 120:
      case 121:
      case 122:
      {
      __cand = __fusedRenderStructuredDispatch_Predicate_ast(state);
        break;
      }
    }
    where = __cand;
    if (where === null) { off = __before; state.pos = __before; } else { off = state.pos; }
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "select", columns: columns, table: table, where: where };
}

function __fusedRenderStructured_Select_2_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const columns: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 44) {
      __sepConsumed = true;
      off += 1;
      while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    }
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 70 && input.startsWith("FROM", off)) break;
    }
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      switch (__c0) {
        case 36:
        case 42:
        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 95:
        case 97:
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
        {
        __cand = __fusedRenderStructuredDispatch_ColumnRef_ast(state);
          break;
        }
      }
    }
    if (__cand === null) break;
    columns.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  if (columns.length < 1) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __table_start = off;
  off++;
  while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
  const __table_end = off;
  const table = input.slice(__table_start, __table_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("LIMIT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __limit_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __limit_end = off;
  const limit = input.slice(__limit_start, __limit_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "select", columns: columns, table: table, limit: limit };
}

function __fusedRenderStructured_Select_3_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("SELECT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const columns: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 44) {
      __sepConsumed = true;
      off += 1;
      while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    }
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 70 && input.startsWith("FROM", off)) break;
    }
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      switch (__c0) {
        case 36:
        case 42:
        case 65:
        case 66:
        case 67:
        case 68:
        case 69:
        case 70:
        case 71:
        case 72:
        case 73:
        case 74:
        case 75:
        case 76:
        case 77:
        case 78:
        case 79:
        case 80:
        case 81:
        case 82:
        case 83:
        case 84:
        case 85:
        case 86:
        case 87:
        case 88:
        case 89:
        case 90:
        case 95:
        case 97:
        case 98:
        case 99:
        case 100:
        case 101:
        case 102:
        case 103:
        case 104:
        case 105:
        case 106:
        case 107:
        case 108:
        case 109:
        case 110:
        case 111:
        case 112:
        case 113:
        case 114:
        case 115:
        case 116:
        case 117:
        case 118:
        case 119:
        case 120:
        case 121:
        case 122:
        {
        __cand = __fusedRenderStructuredDispatch_ColumnRef_ast(state);
          break;
        }
      }
    }
    if (__cand === null) break;
    columns.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  if (columns.length < 1) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("FROM", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isJsIdentStart(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __table_start = off;
  off++;
  while (off < len && isJsIdentPart(input.charCodeAt(off))) off++;
  const __table_end = off;
  const table = input.slice(__table_start, __table_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("WHERE", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let where: unknown = null;
  {
    const __before = off;
    state.pos = off;
    let __cand: unknown = null;
    const __c0 = input.charCodeAt(off);
    switch (__c0) {
      case 36:
      case 42:
      case 65:
      case 66:
      case 67:
      case 68:
      case 69:
      case 70:
      case 71:
      case 72:
      case 73:
      case 74:
      case 75:
      case 76:
      case 77:
      case 78:
      case 79:
      case 80:
      case 81:
      case 82:
      case 83:
      case 84:
      case 85:
      case 86:
      case 87:
      case 88:
      case 89:
      case 90:
      case 95:
      case 97:
      case 98:
      case 99:
      case 100:
      case 101:
      case 102:
      case 103:
      case 104:
      case 105:
      case 106:
      case 107:
      case 108:
      case 109:
      case 110:
      case 111:
      case 112:
      case 113:
      case 114:
      case 115:
      case 116:
      case 117:
      case 118:
      case 119:
      case 120:
      case 121:
      case 122:
      {
      __cand = __fusedRenderStructuredDispatch_Predicate_ast(state);
        break;
      }
    }
    where = __cand;
    if (where === null) { off = __before; state.pos = __before; } else { off = state.pos; }
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("LIMIT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __limit_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __limit_end = off;
  const limit = input.slice(__limit_start, __limit_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "select", columns: columns, table: table, where: where, limit: limit };
}

function __fusedRenderStructuredDispatch_ColumnRef_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_ColumnRef_0_ast(state); if (r0 !== null) return r0;
  const r1 = __fusedRenderStructured_ColumnRef_1_ast(state); if (r1 !== null) return r1;
  return null;
}

function __fusedRenderStructuredDispatch_LiteralValue_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_LiteralValue_0_ast(state); if (r0 !== null) return r0;
  const r1 = __fusedRenderStructured_LiteralValue_1_ast(state); if (r1 !== null) return r1;
  return null;
}

function __fusedRenderStructuredDispatch_Predicate_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_Predicate_0_ast(state); if (r0 !== null) return r0;
  return null;
}

const __fusedRenderStructuredTable_ast: Record<string, (state: State) => unknown> = {
  "ColumnRef#0": __fusedRenderStructured_ColumnRef_0_ast,
  "ColumnRef#1": __fusedRenderStructured_ColumnRef_1_ast,
  "LiteralValue#0": __fusedRenderStructured_LiteralValue_0_ast,
  "LiteralValue#1": __fusedRenderStructured_LiteralValue_1_ast,
  "Predicate#0": __fusedRenderStructured_Predicate_0_ast,
  "Select#0": __fusedRenderStructured_Select_0_ast,
  "Select#1": __fusedRenderStructured_Select_1_ast,
  "Select#2": __fusedRenderStructured_Select_2_ast,
  "Select#3": __fusedRenderStructured_Select_3_ast,
};

const __rootProductionKey: string = "Select#0";

function __fusedRenderDispatchLookup(target: string): Record<string, (state: State, out: string[]) => boolean> | null {
  switch (target) {
    case "source": return __fusedRenderDispatch_source;
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
    diagnostics: [],
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
    diagnostics: [],
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
    diagnostics: [],
  };
  
  const result = parseSelect(state);
  
  while (state.pos < state.len) {
    const __c = input.charCodeAt(state.pos);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { state.pos++; continue; }
    break;
  }
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
  
  const __onDiag = options?.onDiagnostic;
  if (__onDiag !== undefined) {
    for (let __i = 0; __i < state.diagnostics.length; __i++) {
      __onDiag(state.diagnostics[__i]);
    }
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
    diagnostics: [],
  };
  const __result = parseSelect(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
  const __onDiag = options?.onDiagnostic;
  if (__onDiag !== undefined) {
    for (let __i = 0; __i < __state.diagnostics.length; __i++) {
      __onDiag(__state.diagnostics[__i]);
    }
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/pg-select",
  exportName: 'validate',
};
