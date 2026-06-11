// Auto-generated from packages/iso-duration/src/schema.ts
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

// Scratch slots for the shared until-scan kernels (`__uScan_*`, see
// compiler emit/v2/shared-helpers.ts). A kernel returns the new offset and
// deposits its secondary outputs here; the call site reads them immediately
// after the call returns. Parsing is synchronous and kernels are leaf calls,
// so a slot cannot be clobbered between write and read.
let __uFail = 0;
let __uLast = 0;
let __uDepth = 0;
let __uComments: [number, number][] | null = null;
let __uLastCommentEnd = -1;

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

function __skipWs(input: string, off: number, len: number): number {
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  return off;
}

// --- Inferred types ---
export type DateUnit_ast = { type: "years"; value: string } | { type: "months"; value: string } | { type: "weeks"; value: string } | { type: "days"; value: string };
export type DateUnit_source = string;
export type TimeUnit_ast = { type: "hours"; value: string } | { type: "minutes"; value: string } | { type: "seconds"; value: string };
export type TimeUnit_source = string;
export type Duration_ast = { type: "duration"; date: DateUnit_ast[] } | { type: "duration"; date: DateUnit_ast[]; time: TimeUnit_ast[] };
export type Duration_source = string;

function parseDateUnit__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 89)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "DateUnit#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "DateUnit#0", value: value };
}

function parseDateUnit__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 77)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "DateUnit#1", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "DateUnit#1", value: value };
}

function parseDateUnit__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 87)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "DateUnit#2", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "DateUnit#2", value: value };
}

function parseDateUnit__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 68)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "DateUnit#3", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "DateUnit#3", value: value };
}

function parseDateUnit(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  off = __skipWs(input, off, len);
state.pos = off;
  if (off >= len) return null;
  if (isDigit(input.charCodeAt(off))) {
  { const r = parseDateUnit__alt0(state); if (r !== null) return r; }
  { const r = parseDateUnit__alt1(state); if (r !== null) return r; }
  { const r = parseDateUnit__alt2(state); if (r !== null) return r; }
  return parseDateUnit__alt3(state);
}
  return null;
}

function parseTimeUnit__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 72)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "TimeUnit#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "TimeUnit#0", value: value };
}

function parseTimeUnit__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 77)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "TimeUnit#1", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "TimeUnit#1", value: value };
}

function parseTimeUnit__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 83)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "TimeUnit#2", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "TimeUnit#2", value: value };
}

function parseTimeUnit(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  off = __skipWs(input, off, len);
state.pos = off;
  if (off >= len) return null;
  if (isDigit(input.charCodeAt(off))) {
  { const r = parseTimeUnit__alt0(state); if (r !== null) return r; }
  { const r = parseTimeUnit__alt1(state); if (r !== null) return r; }
  return parseTimeUnit__alt2(state);
}
  return null;
}

function parseDuration__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 80)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  const __date_start = off;
  const date: unknown[] = [];
  const __date_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __date_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseDateUnit(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__date_prevItemEnd >= 0 && __date_iws !== null) __date_iws.push(input.slice(__date_prevItemEnd, __itemStart));
    date.push(__cand);
    __date_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (date.length < 1) { state.pos = entryOff; return null; }
  const __date_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Duration#0", __ws: __ws, __litPres: __litPres, date_iws: __date_iws, date: date };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Duration#0", date: date };
}

function parseDuration__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 80)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  const __date_start = off;
  const date: unknown[] = [];
  const __date_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __date_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseDateUnit(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__date_prevItemEnd >= 0 && __date_iws !== null) __date_iws.push(input.slice(__date_prevItemEnd, __itemStart));
    date.push(__cand);
    __date_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  const __date_end = off;
  const __wsStart_2 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 84)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_3 = off;
  off = __skipWs(input, off, len);
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  const __time_start = off;
  const time: unknown[] = [];
  const __time_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __time_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseTimeUnit(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__time_prevItemEnd >= 0 && __time_iws !== null) __time_iws.push(input.slice(__time_prevItemEnd, __itemStart));
    time.push(__cand);
    __time_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (time.length < 1) { state.pos = entryOff; return null; }
  const __time_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Duration#1", __ws: __ws, __litPres: __litPres, date_iws: __date_iws, time_iws: __time_iws, date: date, time: time };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Duration#1", date: date, time: time };
}

function parseDuration(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  off = __skipWs(input, off, len);
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 80) {
  { const r = parseDuration__alt1(state); if (r !== null) return r; }
  return parseDuration__alt0(state);
}
  return null;
}

const __defaultTarget: string | undefined = "ast";

function __build_DateUnit_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "years", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "years", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_DateUnit_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.value, __indentCol) ?? "") + "Y";
}

function __build_DateUnit_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "months", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "months", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_DateUnit_1_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.value, __indentCol) ?? "") + "M";
}

function __build_DateUnit_2_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "weeks", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "weeks", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_DateUnit_2_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.value, __indentCol) ?? "") + "W";
}

function __build_DateUnit_3_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "days", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "days", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_DateUnit_3_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.value, __indentCol) ?? "") + "D";
}

function __build_TimeUnit_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "hours", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "hours", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_TimeUnit_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.value, __indentCol) ?? "") + "H";
}

function __build_TimeUnit_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "minutes", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "minutes", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_TimeUnit_1_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.value, __indentCol) ?? "") + "M";
}

function __build_TimeUnit_2_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "seconds", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "seconds", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_TimeUnit_2_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.value, __indentCol) ?? "") + "S";
}

function __build_Duration_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "duration", date: __renderSlot_ast(captures.date, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, date_iws: captures.date_iws } }) : { type: "duration", date: __renderSlot_ast(captures.date, __indentCol) });
}

function __build_Duration_0_source(captures: any, __indentCol: number = 0): any {
  return "P" + (Array.isArray(captures.date) ? captures.date.map((c: any) => __renderSlot_source(c, __indentCol)).join(" ") : (__renderSlot_source(captures.date, __indentCol) ?? ""));
}

function __build_Duration_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "duration", date: __renderSlot_ast(captures.date, __indentCol), time: __renderSlot_ast(captures.time, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, date_iws: captures.date_iws, time_iws: captures.time_iws } }) : { type: "duration", date: __renderSlot_ast(captures.date, __indentCol), time: __renderSlot_ast(captures.time, __indentCol) });
}

function __build_Duration_1_source(captures: any, __indentCol: number = 0): any {
  return "P" + (captures.date == null ? "" : (Array.isArray(captures.date) ? captures.date.map((c: any) => __renderSlot_source(c, __indentCol)).join(" ") : (__renderSlot_source(captures.date, __indentCol) ?? ""))) + "T" + (Array.isArray(captures.time) ? captures.time.map((c: any) => __renderSlot_source(c, __indentCol)).join(" ") : (__renderSlot_source(captures.time, __indentCol) ?? ""));
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "DateUnit#0": return __build_DateUnit_0_ast(captures, __indentCol);
    case "DateUnit#1": return __build_DateUnit_1_ast(captures, __indentCol);
    case "DateUnit#2": return __build_DateUnit_2_ast(captures, __indentCol);
    case "DateUnit#3": return __build_DateUnit_3_ast(captures, __indentCol);
    case "TimeUnit#0": return __build_TimeUnit_0_ast(captures, __indentCol);
    case "TimeUnit#1": return __build_TimeUnit_1_ast(captures, __indentCol);
    case "TimeUnit#2": return __build_TimeUnit_2_ast(captures, __indentCol);
    case "Duration#0": return __build_Duration_0_ast(captures, __indentCol);
    case "Duration#1": return __build_Duration_1_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "DateUnit#0": return __build_DateUnit_0_source(captures, __indentCol);
    case "DateUnit#1": return __build_DateUnit_1_source(captures, __indentCol);
    case "DateUnit#2": return __build_DateUnit_2_source(captures, __indentCol);
    case "DateUnit#3": return __build_DateUnit_3_source(captures, __indentCol);
    case "TimeUnit#0": return __build_TimeUnit_0_source(captures, __indentCol);
    case "TimeUnit#1": return __build_TimeUnit_1_source(captures, __indentCol);
    case "TimeUnit#2": return __build_TimeUnit_2_source(captures, __indentCol);
    case "Duration#0": return __build_Duration_0_source(captures, __indentCol);
    case "Duration#1": return __build_Duration_1_source(captures, __indentCol);
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

export function render(input: string, options: { target: "ast"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Duration_ast;
export function render(input: string, options: { target: "source"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Duration_source;
export function render(input: string, options?: { target?: undefined; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Duration_ast;
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

function __rebuild_DateUnit_0(captures: any): string {
  return __rebuildSlot(captures.value) + "Y";
}

function __rebuild_DateUnit_1(captures: any): string {
  return __rebuildSlot(captures.value) + "M";
}

function __rebuild_DateUnit_2(captures: any): string {
  return __rebuildSlot(captures.value) + "W";
}

function __rebuild_DateUnit_3(captures: any): string {
  return __rebuildSlot(captures.value) + "D";
}

function __rebuild_TimeUnit_0(captures: any): string {
  return __rebuildSlot(captures.value) + "H";
}

function __rebuild_TimeUnit_1(captures: any): string {
  return __rebuildSlot(captures.value) + "M";
}

function __rebuild_TimeUnit_2(captures: any): string {
  return __rebuildSlot(captures.value) + "S";
}

function __rebuild_Duration_0(captures: any): string {
  return "P" + __rebuildSlotIws(captures.date, captures.date_iws, " ");
}

function __rebuild_Duration_1(captures: any): string {
  return (captures.date == null ? "" : "P" + __rebuildSlotIws(captures.date, captures.date_iws, " ")) + "T" + __rebuildSlotIws(captures.time, captures.time_iws, " ");
}

function __invert_DateUnit_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "years")) {
    throw new Error("stringify: field \"type\" expected \"years\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_DateUnit_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "Y";
}

function __invert_DateUnit_1_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "months")) {
    throw new Error("stringify: field \"type\" expected \"months\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_DateUnit_1(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "M";
}

function __invert_DateUnit_2_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "weeks")) {
    throw new Error("stringify: field \"type\" expected \"weeks\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_DateUnit_2(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "W";
}

function __invert_DateUnit_3_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "days")) {
    throw new Error("stringify: field \"type\" expected \"days\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_DateUnit_3(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "D";
}

function __invert_TimeUnit_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "hours")) {
    throw new Error("stringify: field \"type\" expected \"hours\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_TimeUnit_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "H";
}

function __invert_TimeUnit_1_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "minutes")) {
    throw new Error("stringify: field \"type\" expected \"minutes\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_TimeUnit_1(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "M";
}

function __invert_TimeUnit_2_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "seconds")) {
    throw new Error("stringify: field \"type\" expected \"seconds\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_TimeUnit_2(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "S";
}

function __invert_Duration_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "duration")) {
    throw new Error("stringify: field \"type\" expected \"duration\", got " + JSON.stringify(value.type));
  }
  captures.date = ((Array.isArray(value.date) ? value.date : [value.date]).map((__e: any) => __dispatchInverse_DateUnit_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Duration_0(captures, __indentCol);
  }
  return "P" + __rebuildSlotIws(captures.date, captures.date_iws, " ");
}

function __invert_Duration_1_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "duration")) {
    throw new Error("stringify: field \"type\" expected \"duration\", got " + JSON.stringify(value.type));
  }
  captures.date = ((Array.isArray(value.date) ? value.date : [value.date]).map((__e: any) => __dispatchInverse_DateUnit_ast(__e, __indentCol)));
  captures.time = ((Array.isArray(value.time) ? value.time : [value.time]).map((__e: any) => __dispatchInverse_TimeUnit_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Duration_1(captures, __indentCol);
  }
  return (captures.date == null ? "" : "P" + __rebuildSlotIws(captures.date, captures.date_iws, " ")) + "T" + __rebuildSlotIws(captures.time, captures.time_iws, " ");
}

function __invert_DateUnit_0_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf("Y", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"Y\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_DateUnit_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "Y";
}

function __invert_DateUnit_1_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf("M", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"M\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_DateUnit_1(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "M";
}

function __invert_DateUnit_2_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf("W", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"W\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_DateUnit_2(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "W";
}

function __invert_DateUnit_3_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf("D", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"D\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_DateUnit_3(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "D";
}

function __invert_TimeUnit_0_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf("H", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"H\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_TimeUnit_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "H";
}

function __invert_TimeUnit_1_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf("M", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"M\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_TimeUnit_1(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "M";
}

function __invert_TimeUnit_2_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf("S", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"S\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_TimeUnit_2(captures, __indentCol);
  }
  return __rebuildSlot(captures.value) + "S";
}

function __invert_Duration_0_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("P", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"P\" in template body");
  }
  __pos += 1;
  captures.date = (Array.isArray(__s.slice(__pos)) ? __s.slice(__pos).map((__e: any) => __dispatchInverse_DateUnit_source(__e, __indentCol)) : __scanRepeatsList_DateUnit_source(__s.slice(__pos), __indentCol));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Duration_0(captures, __indentCol);
  }
  return "P" + __rebuildSlotIws(captures.date, captures.date_iws, " ");
}

function __invert_Duration_1_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("P", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"P\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf("T", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"T\" after capture date");
    }
    captures.date = (Array.isArray(__s.slice(__pos, __end)) ? __s.slice(__pos, __end).map((__e: any) => __dispatchInverse_DateUnit_source(__e, __indentCol)) : __scanRepeatsList_DateUnit_source(__s.slice(__pos, __end), __indentCol));
    __pos = __end + 1;
  }
  captures.time = (Array.isArray(__s.slice(__pos)) ? __s.slice(__pos).map((__e: any) => __dispatchInverse_TimeUnit_source(__e, __indentCol)) : __scanRepeatsList_TimeUnit_source(__s.slice(__pos), __indentCol));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Duration_1(captures, __indentCol);
  }
  return (captures.date == null ? "" : "P" + __rebuildSlotIws(captures.date, captures.date_iws, " ")) + "T" + __rebuildSlotIws(captures.time, captures.time_iws, " ");
}

function __dispatchInverse_DateUnit_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "years")) return __invert_DateUnit_0_ast(value, __indentCol);
    if (Object.is(value.type, "months")) return __invert_DateUnit_1_ast(value, __indentCol);
    if (Object.is(value.type, "weeks")) return __invert_DateUnit_2_ast(value, __indentCol);
    if (Object.is(value.type, "days")) return __invert_DateUnit_3_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_TimeUnit_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "hours")) return __invert_TimeUnit_0_ast(value, __indentCol);
    if (Object.is(value.type, "minutes")) return __invert_TimeUnit_1_ast(value, __indentCol);
    if (Object.is(value.type, "seconds")) return __invert_TimeUnit_2_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Duration_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "duration") && !("time" in value)) return __invert_Duration_0_ast(value, __indentCol);
    if (Object.is(value.type, "duration") && "time" in value) return __invert_Duration_1_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Duration_ast(value, 0);
}

function __dispatchInverse_DateUnit_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf("Y") >= 0) { try { return __invert_DateUnit_0_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("M") >= 0) { try { return __invert_DateUnit_1_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("W") >= 0) { try { return __invert_DateUnit_2_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("D") >= 0) { try { return __invert_DateUnit_3_source(value, __indentCol); } catch (_e) { /* try next */ } }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_TimeUnit_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf("H") >= 0) { try { return __invert_TimeUnit_0_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("M") >= 0) { try { return __invert_TimeUnit_1_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("S") >= 0) { try { return __invert_TimeUnit_2_source(value, __indentCol); } catch (_e) { /* try next */ } }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Duration_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf("T") >= 0) { try { return __invert_Duration_1_source(value, __indentCol); } catch (_e) { /* try next */ } }
    try { return __invert_Duration_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Duration_source(value, 0);
}

function __invertSlotFor_DateUnit_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_DateUnit_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_DateUnit_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_DateUnit_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_DateUnit_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_DateUnit_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_DateUnit_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_TimeUnit_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_TimeUnit_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_TimeUnit_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_TimeUnit_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_TimeUnit_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_TimeUnit_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_TimeUnit_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Duration_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Duration_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Duration_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Duration_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Duration_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Duration_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Duration_ast(v, __indentCol); } catch (_e) { return String(v); }
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

function __invertSlotFor_DateUnit_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_DateUnit_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_DateUnit_source(v[i], __indentCol);
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
    try { return __dispatchInverse_DateUnit_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_DateUnit_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_DateUnit_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_DateUnit_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_TimeUnit_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_TimeUnit_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_TimeUnit_source(v[i], __indentCol);
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
    try { return __dispatchInverse_TimeUnit_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_TimeUnit_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_TimeUnit_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_TimeUnit_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Duration_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Duration_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Duration_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Duration_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Duration_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Duration_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Duration_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __scanRepeatsList_DateUnit_source(__chunk: string, __indentCol: number = 0): string[] {
  const __TERMS: readonly string[] = ["Y", "M", "W", "D"];
  const __out: string[] = [];
  let __pos = 0;
  while (__pos < __chunk.length) {
    while (__pos < __chunk.length && /\s/.test(__chunk.charAt(__pos))) __pos++;
    if (__pos >= __chunk.length) break;
    let __next = -1;
    let __termLen = 0;
    for (const __t of __TERMS) {
      const __i = __chunk.indexOf(__t, __pos);
      if (__i < 0) continue;
      if (__next < 0 || __i < __next || (__i === __next && __t.length > __termLen)) {
        __next = __i;
        __termLen = __t.length;
      }
    }
    if (__next < 0) {
      throw new Error("stringify: __scanRepeatsList_DateUnit_source: no terminator literal found at pos " + __pos + " of " + __chunk.length);
    }
    const __slice = __chunk.slice(__pos, __next + __termLen);
    __out.push(__dispatchInverse_DateUnit_source(__slice, __indentCol));
    __pos = __next + __termLen;
  }
  return __out;
}

function __scanRepeatsList_TimeUnit_source(__chunk: string, __indentCol: number = 0): string[] {
  const __TERMS: readonly string[] = ["H", "M", "S"];
  const __out: string[] = [];
  let __pos = 0;
  while (__pos < __chunk.length) {
    while (__pos < __chunk.length && /\s/.test(__chunk.charAt(__pos))) __pos++;
    if (__pos >= __chunk.length) break;
    let __next = -1;
    let __termLen = 0;
    for (const __t of __TERMS) {
      const __i = __chunk.indexOf(__t, __pos);
      if (__i < 0) continue;
      if (__next < 0 || __i < __next || (__i === __next && __t.length > __termLen)) {
        __next = __i;
        __termLen = __t.length;
      }
    }
    if (__next < 0) {
      throw new Error("stringify: __scanRepeatsList_TimeUnit_source: no terminator literal found at pos " + __pos + " of " + __chunk.length);
    }
    const __slice = __chunk.slice(__pos, __next + __termLen);
    __out.push(__dispatchInverse_TimeUnit_source(__slice, __indentCol));
    __pos = __next + __termLen;
  }
  return __out;
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

export function stringify(value: Duration_ast, options: { target: "ast" }): string;
export function stringify(value: Duration_source, options: { target: "source" }): string;
export function stringify(value: Duration_ast, options?: { target?: undefined }): string;
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

function __fusedRender_DateUnit_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 89)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    out.push("Y");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_DateUnit_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 77)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    out.push("M");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_DateUnit_2_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 87)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    out.push("W");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_DateUnit_3_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 68)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    out.push("D");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_TimeUnit_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 72)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    out.push("H");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_TimeUnit_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 77)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    out.push("M");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_TimeUnit_2_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 83)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    out.push("S");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Duration_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 80)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    off = __skipWs(input, off, len);
    const __slotBuf_date: string[] = [];
    let __slotMatched_date = false;
    // recursive repeats span (DateUnit) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        const __bufLenBefore = __slotBuf_date.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_date.push(" ");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          switch (__c0) {
            case 43: case 45: case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57:
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_date.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_DateUnit_0_source(state, __slotBuf_date)) { __itemMatched = true; off = state.pos; }
              }
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_date.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_DateUnit_1_source(state, __slotBuf_date)) { __itemMatched = true; off = state.pos; }
              }
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_date.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_DateUnit_2_source(state, __slotBuf_date)) { __itemMatched = true; off = state.pos; }
              }
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_date.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_DateUnit_3_source(state, __slotBuf_date)) { __itemMatched = true; off = state.pos; }
              }
              break;
          }
        }
        if (!__itemMatched) {
          __slotBuf_date.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_date = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("P");
    for (let __i = 0; __i < __slotBuf_date.length; __i++) out.push(__slotBuf_date[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Duration_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 80)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    off = __skipWs(input, off, len);
    const __slotBuf_date: string[] = [];
    let __slotMatched_date = false;
    // recursive repeats span (DateUnit) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        const __bufLenBefore = __slotBuf_date.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_date.push(" ");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          switch (__c0) {
            case 43: case 45: case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57:
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_date.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_DateUnit_0_source(state, __slotBuf_date)) { __itemMatched = true; off = state.pos; }
              }
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_date.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_DateUnit_1_source(state, __slotBuf_date)) { __itemMatched = true; off = state.pos; }
              }
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_date.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_DateUnit_2_source(state, __slotBuf_date)) { __itemMatched = true; off = state.pos; }
              }
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_date.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_DateUnit_3_source(state, __slotBuf_date)) { __itemMatched = true; off = state.pos; }
              }
              break;
          }
        }
        if (!__itemMatched) {
          __slotBuf_date.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_date = true;
        if (off === __loopStart) break;
      }
    }
    off = __skipWs(input, off, len);
    if (!(input.charCodeAt(off) === 84)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    off = __skipWs(input, off, len);
    const __slotBuf_time: string[] = [];
    let __slotMatched_time = false;
    // recursive repeats span (TimeUnit) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        const __bufLenBefore = __slotBuf_time.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_time.push(" ");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          switch (__c0) {
            case 43: case 45: case 48: case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57:
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_time.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_TimeUnit_0_source(state, __slotBuf_time)) { __itemMatched = true; off = state.pos; }
              }
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_time.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_TimeUnit_1_source(state, __slotBuf_time)) { __itemMatched = true; off = state.pos; }
              }
              if (!__itemMatched) {
                state.pos = __offBeforeItem;
                __slotBuf_time.length = __bufLenBefore + (__count > 0 ? 1 : 0);
                if (__fusedRender_TimeUnit_2_source(state, __slotBuf_time)) { __itemMatched = true; off = state.pos; }
              }
              break;
          }
        }
        if (!__itemMatched) {
          __slotBuf_time.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_time = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("P");
    if (__slotMatched_date) for (let __i = 0; __i < __slotBuf_date.length; __i++) out.push(__slotBuf_date[__i]);
    out.push("T");
    for (let __i = 0; __i < __slotBuf_time.length; __i++) out.push(__slotBuf_time[__i]);
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "DateUnit#0": __fusedRender_DateUnit_0_source,
  "DateUnit#1": __fusedRender_DateUnit_1_source,
  "DateUnit#2": __fusedRender_DateUnit_2_source,
  "DateUnit#3": __fusedRender_DateUnit_3_source,
  "TimeUnit#0": __fusedRender_TimeUnit_0_source,
  "TimeUnit#1": __fusedRender_TimeUnit_1_source,
  "TimeUnit#2": __fusedRender_TimeUnit_2_source,
  "Duration#0": __fusedRender_Duration_0_source,
  "Duration#1": __fusedRender_Duration_1_source,
};

function __fusedRenderStructured_DateUnit_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 89)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "years", value: value };
}

function __fusedRenderStructured_DateUnit_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 77)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "months", value: value };
}

function __fusedRenderStructured_DateUnit_2_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 87)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "weeks", value: value };
}

function __fusedRenderStructured_DateUnit_3_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 68)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "days", value: value };
}

function __fusedRenderStructured_TimeUnit_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 72)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "hours", value: value };
}

function __fusedRenderStructured_TimeUnit_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 77)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "minutes", value: value };
}

function __fusedRenderStructured_TimeUnit_2_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 83)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "seconds", value: value };
}

function __fusedRenderStructured_Duration_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 80)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  off = __skipWs(input, off, len);
  const date: unknown[] = [];
  while (true) {
    const __loopStart = off;
    off = __skipWs(input, off, len);
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      switch (__c0) {
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
        __cand = __fusedRenderStructuredDispatch_DateUnit_ast(state);
          break;
        }
      }
    }
    if (__cand === null) break;
    date.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  if (date.length < 1) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "duration", date: date };
}

function __fusedRenderStructured_Duration_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 80)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  off = __skipWs(input, off, len);
  const date: unknown[] = [];
  while (true) {
    const __loopStart = off;
    off = __skipWs(input, off, len);
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      switch (__c0) {
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
        __cand = __fusedRenderStructuredDispatch_DateUnit_ast(state);
          break;
        }
      }
    }
    if (__cand === null) break;
    date.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  off = __skipWs(input, off, len);
  if (!(input.charCodeAt(off) === 84)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  off = __skipWs(input, off, len);
  const time: unknown[] = [];
  while (true) {
    const __loopStart = off;
    off = __skipWs(input, off, len);
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      switch (__c0) {
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
        __cand = __fusedRenderStructuredDispatch_TimeUnit_ast(state);
          break;
        }
      }
    }
    if (__cand === null) break;
    time.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  if (time.length < 1) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "duration", date: date, time: time };
}

function __fusedRenderStructuredDispatch_DateUnit_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_DateUnit_0_ast(state); if (r0 !== null) return r0;
  const r1 = __fusedRenderStructured_DateUnit_1_ast(state); if (r1 !== null) return r1;
  const r2 = __fusedRenderStructured_DateUnit_2_ast(state); if (r2 !== null) return r2;
  const r3 = __fusedRenderStructured_DateUnit_3_ast(state); if (r3 !== null) return r3;
  return null;
}

function __fusedRenderStructuredDispatch_TimeUnit_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_TimeUnit_0_ast(state); if (r0 !== null) return r0;
  const r1 = __fusedRenderStructured_TimeUnit_1_ast(state); if (r1 !== null) return r1;
  const r2 = __fusedRenderStructured_TimeUnit_2_ast(state); if (r2 !== null) return r2;
  return null;
}

const __fusedRenderStructuredTable_ast: Record<string, (state: State) => unknown> = {
  "DateUnit#0": __fusedRenderStructured_DateUnit_0_ast,
  "DateUnit#1": __fusedRenderStructured_DateUnit_1_ast,
  "DateUnit#2": __fusedRenderStructured_DateUnit_2_ast,
  "DateUnit#3": __fusedRenderStructured_DateUnit_3_ast,
  "TimeUnit#0": __fusedRenderStructured_TimeUnit_0_ast,
  "TimeUnit#1": __fusedRenderStructured_TimeUnit_1_ast,
  "TimeUnit#2": __fusedRenderStructured_TimeUnit_2_ast,
  "Duration#0": __fusedRenderStructured_Duration_0_ast,
  "Duration#1": __fusedRenderStructured_Duration_1_ast,
};

const __rootProductionKey: string = "Duration#0";

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
  
  const result = parseDuration(state);
  
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
  const __result = parseDuration(__state);
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
  module: "@parser2/iso-duration",
  exportName: 'validate',
};
