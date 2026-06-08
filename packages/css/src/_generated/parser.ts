// Auto-generated from packages/css/src/schema.ts
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
export type Comment_ast = { type: "comment"; text: string };
export type Comment_json = null;
export type Comment_source = string;
export type Declaration_ast = { type: "decl"; prop: string; value: string; important: true; _important: string } | { type: "decl"; prop: string; value: string };
export type Declaration_json = null | Record<string, string>;
export type Declaration_source = string;
export type Rule_ast = { type: "rule"; selector: string; nodes: (Comment_ast | AtRule_ast | Rule_ast | Declaration_ast)[] };
export type Rule_json = Record<string, Record<string, unknown>>;
export type Rule_source = string;
export type AtRule_ast = { type: "atrule"; name: string; params: string; nodes: (Comment_ast | AtRule_ast | Rule_ast | Declaration_ast)[] } | { type: "atrule"; name: string; params: string };
export type AtRule_json = null;
export type AtRule_source = string;
export type Stylesheet_ast = { type: "root"; nodes: (Comment_ast | AtRule_ast | Rule_ast | Declaration_ast)[] };
export type Stylesheet_json = Record<string, unknown>;
export type Stylesheet_source = string;

// ── Inlined validator: CssColor (prefix __v0_) ──

function __v0_parseCssColorValue__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  if (!(value.toLowerCase() === "aliceblue" || value.toLowerCase() === "black" || value.toLowerCase() === "blue" || value.toLowerCase() === "currentcolor" || value.toLowerCase() === "green" || value.toLowerCase() === "inherit" || value.toLowerCase() === "initial" || value.toLowerCase() === "red" || value.toLowerCase() === "revert" || value.toLowerCase() === "revert-layer" || value.toLowerCase() === "transparent" || value.toLowerCase() === "unset" || value.toLowerCase() === "white" || value.toLowerCase() === "yellow")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CssColorValue#0", value: value };
}

function __v0_parseCssColorValue__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && isHexDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isHexDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  if (!(value.length === 3 || value.length === 4 || value.length === 6 || value.length === 8)) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#1", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CssColorValue#1", value: value };
}

function __v0_parseCssColorValue__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "rgb" || name.toLowerCase() === "rgba")) { state.pos = entryOff; return null; }
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __args_start = off;
  const args: unknown[] = [];
  const __args_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __args_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = __v0_parseNumericColorFunctionToken(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__args_prevItemEnd >= 0 && __args_iws !== null) __args_iws.push(input.slice(__args_prevItemEnd, __itemStart));
    args.push(__cand);
    __args_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (args.length < 1) { state.pos = entryOff; return null; }
  const __args_end = off;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#2", __ws: __ws, __litPres: __litPres, args_iws: __args_iws, name: name, args: args };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CssColorValue#2", name: name, args: args };
}

function __v0_parseCssColorValue__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "color" || name.toLowerCase() === "color-mix" || name.toLowerCase() === "hsl" || name.toLowerCase() === "hsla" || name.toLowerCase() === "hwb" || name.toLowerCase() === "lab" || name.toLowerCase() === "lch" || name.toLowerCase() === "light-dark" || name.toLowerCase() === "oklab" || name.toLowerCase() === "oklch")) { state.pos = entryOff; return null; }
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __args_start = off;
  const args: unknown[] = [];
  const __args_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __args_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = __v0_parseColorFunctionToken(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__args_prevItemEnd >= 0 && __args_iws !== null) __args_iws.push(input.slice(__args_prevItemEnd, __itemStart));
    args.push(__cand);
    __args_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (args.length < 1) { state.pos = entryOff; return null; }
  const __args_end = off;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#3", __ws: __ws, __litPres: __litPres, args_iws: __args_iws, name: name, args: args };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CssColorValue#3", name: name, args: args };
}

function __v0_parseCssColorValue__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "var")) { state.pos = entryOff; return null; }
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let args: string = '';
  let __args_start = off;
  let __args_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __args_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,1,0,1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 41)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __args_start;
    if (__lastNonWs === __args_start) {
      off = __emptyAnchor;
      args = '';
    } else {
      off = __lastNonWs;
      args = input.slice(__args_start, __lastNonWs);
    }
    __args_end = off;
    if (args.endsWith(",")) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  }
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#4", __ws: __ws, __litPres: __litPres, name: name, args: args };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CssColorValue#4", name: name, args: args };
}

function __v0_parseCssColorValue(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 35) {
  return __v0_parseCssColorValue__alt1(state);
}
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  { const r = __v0_parseCssColorValue__alt2(state); if (r !== null) return r; }
  { const r = __v0_parseCssColorValue__alt3(state); if (r !== null) return r; }
  { const r = __v0_parseCssColorValue__alt4(state); if (r !== null) return r; }
  return __v0_parseCssColorValue__alt0(state);
}
  return null;
}

function __v0_parseNumericColorFunctionToken__alt0(state: State): unknown {
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
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "NumericColorFunctionToken#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "NumericColorFunctionToken#0", value: value };
}

function __v0_parseNumericColorFunctionToken__alt1(state: State): unknown {
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
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "NumericColorFunctionToken#1", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "NumericColorFunctionToken#1", value: value };
}

function __v0_parseNumericColorFunctionToken__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "NumericColorFunctionToken#2", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "NumericColorFunctionToken#2" };
}

function __v0_parseNumericColorFunctionToken__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 44)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "NumericColorFunctionToken#3", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "NumericColorFunctionToken#3" };
}

function __v0_parseNumericColorFunctionToken(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 47) {
  return __v0_parseNumericColorFunctionToken__alt2(state);
}
  if (input.charCodeAt(off) === 44) {
  return __v0_parseNumericColorFunctionToken__alt3(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = __v0_parseNumericColorFunctionToken__alt0(state); if (r !== null) return r; }
  return __v0_parseNumericColorFunctionToken__alt1(state);
}
  return null;
}

function __v0_parseColorFunctionToken__alt0(state: State): unknown {
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
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ColorFunctionToken#0", value: value };
}

function __v0_parseColorFunctionToken__alt1(state: State): unknown {
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
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#1", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ColorFunctionToken#1", value: value };
}

function __v0_parseColorFunctionToken__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#2", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ColorFunctionToken#2", value: value };
}

function __v0_parseColorFunctionToken__alt3(state: State): unknown {
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
    const __captures: any = { __production: "ColorFunctionToken#3", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ColorFunctionToken#3", value: value };
}

function __v0_parseColorFunctionToken__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#4", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ColorFunctionToken#4" };
}

function __v0_parseColorFunctionToken__alt5(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 44)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#5", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ColorFunctionToken#5" };
}

function __v0_parseColorFunctionToken(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 47) {
  return __v0_parseColorFunctionToken__alt4(state);
}
  if (input.charCodeAt(off) === 44) {
  return __v0_parseColorFunctionToken__alt5(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = __v0_parseColorFunctionToken__alt0(state); if (r !== null) return r; }
  return __v0_parseColorFunctionToken__alt1(state);
}
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  return __v0_parseColorFunctionToken__alt2(state);
}
  if ((input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27)) {
  return __v0_parseColorFunctionToken__alt3(state);
}
  return null;
}

function __v0_parseCssColor(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  state.pos = off;
  const __value_start = off;
  const value = __v0_parseCssColorValue(state);
  if (value === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __value_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColor#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CssColor#0", value: value };
}

// ── Inlined validator: CssLengthPercentage (prefix __v1_) ──

function __v1_parseLengthPercentageItem__alt0(state: State): unknown {
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
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __unit_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __unit_end = off;
  const unit = input.slice(__unit_start, __unit_end);
  if (!(unit.toLowerCase() === "cap" || unit.toLowerCase() === "ch" || unit.toLowerCase() === "cm" || unit.toLowerCase() === "dvh" || unit.toLowerCase() === "dvw" || unit.toLowerCase() === "em" || unit.toLowerCase() === "ex" || unit.toLowerCase() === "ic" || unit.toLowerCase() === "in" || unit.toLowerCase() === "lh" || unit.toLowerCase() === "lvh" || unit.toLowerCase() === "lvw" || unit.toLowerCase() === "mm" || unit.toLowerCase() === "pc" || unit.toLowerCase() === "pt" || unit.toLowerCase() === "px" || unit.toLowerCase() === "q" || unit.toLowerCase() === "rem" || unit.toLowerCase() === "rlh" || unit.toLowerCase() === "svh" || unit.toLowerCase() === "svw" || unit.toLowerCase() === "vb" || unit.toLowerCase() === "vh" || unit.toLowerCase() === "vi" || unit.toLowerCase() === "vmax" || unit.toLowerCase() === "vmin" || unit.toLowerCase() === "vw")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#0", __ws: __ws, __litPres: __litPres, value: value, unit: unit };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#0", value: value, unit: unit };
}

function __v1_parseLengthPercentageItem__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __unit_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __unit_end = off;
  const unit = input.slice(__unit_start, __unit_end);
  if (!(unit.toLowerCase() === "cap" || unit.toLowerCase() === "ch" || unit.toLowerCase() === "cm" || unit.toLowerCase() === "dvh" || unit.toLowerCase() === "dvw" || unit.toLowerCase() === "em" || unit.toLowerCase() === "ex" || unit.toLowerCase() === "ic" || unit.toLowerCase() === "in" || unit.toLowerCase() === "lh" || unit.toLowerCase() === "lvh" || unit.toLowerCase() === "lvw" || unit.toLowerCase() === "mm" || unit.toLowerCase() === "pc" || unit.toLowerCase() === "pt" || unit.toLowerCase() === "px" || unit.toLowerCase() === "q" || unit.toLowerCase() === "rem" || unit.toLowerCase() === "rlh" || unit.toLowerCase() === "svh" || unit.toLowerCase() === "svw" || unit.toLowerCase() === "vb" || unit.toLowerCase() === "vh" || unit.toLowerCase() === "vi" || unit.toLowerCase() === "vmax" || unit.toLowerCase() === "vmin" || unit.toLowerCase() === "vw")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#1", __ws: __ws, __litPres: __litPres, unit: unit };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#1", unit: unit };
}

function __v1_parseLengthPercentageItem__alt2(state: State): unknown {
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
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#2", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#2", value: value };
}

function __v1_parseLengthPercentageItem__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#3", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#3" };
}

function __v1_parseLengthPercentageItem__alt4(state: State): unknown {
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
  if (!(value.toLowerCase() === "0")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#4", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#4", value: value };
}

function __v1_parseLengthPercentageItem__alt5(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "calc" || name.toLowerCase() === "clamp" || name.toLowerCase() === "max" || name.toLowerCase() === "min")) { state.pos = entryOff; return null; }
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __args_start = off;
  const args: unknown[] = [];
  const __args_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __args_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = __v1_parseLengthFunctionToken(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__args_prevItemEnd >= 0 && __args_iws !== null) __args_iws.push(input.slice(__args_prevItemEnd, __itemStart));
    args.push(__cand);
    __args_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (args.length < 1) { state.pos = entryOff; return null; }
  const __args_end = off;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#5", __ws: __ws, __litPres: __litPres, args_iws: __args_iws, name: name, args: args };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#5", name: name, args: args };
}

function __v1_parseLengthPercentageItem__alt6(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "var")) { state.pos = entryOff; return null; }
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let args: string = '';
  let __args_start = off;
  let __args_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __args_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 41)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __args_start;
    if (__lastNonWs === __args_start) {
      off = __emptyAnchor;
      args = '';
    } else {
      off = __lastNonWs;
      args = input.slice(__args_start, __lastNonWs);
    }
    __args_end = off;
    if (args.endsWith(",")) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  }
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#6", __ws: __ws, __litPres: __litPres, name: name, args: args };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#6", name: name, args: args };
}

function __v1_parseLengthPercentageItem__alt7(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  if (!(value.toLowerCase() === "auto" || value.toLowerCase() === "fit-content" || value.toLowerCase() === "max-content" || value.toLowerCase() === "min-content")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#7", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#7", value: value };
}

function __v1_parseLengthPercentageItem(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 45) {
  { const r = __v1_parseLengthPercentageItem__alt1(state); if (r !== null) return r; }
  return __v1_parseLengthPercentageItem__alt3(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = __v1_parseLengthPercentageItem__alt0(state); if (r !== null) return r; }
  { const r = __v1_parseLengthPercentageItem__alt4(state); if (r !== null) return r; }
  return __v1_parseLengthPercentageItem__alt2(state);
}
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  { const r = __v1_parseLengthPercentageItem__alt5(state); if (r !== null) return r; }
  { const r = __v1_parseLengthPercentageItem__alt6(state); if (r !== null) return r; }
  return __v1_parseLengthPercentageItem__alt7(state);
}
  return null;
}

function __v1_parseLengthFunctionToken__alt0(state: State): unknown {
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
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __unit_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __unit_end = off;
  const unit = input.slice(__unit_start, __unit_end);
  if (!(unit.toLowerCase() === "cap" || unit.toLowerCase() === "ch" || unit.toLowerCase() === "cm" || unit.toLowerCase() === "dvh" || unit.toLowerCase() === "dvw" || unit.toLowerCase() === "em" || unit.toLowerCase() === "ex" || unit.toLowerCase() === "ic" || unit.toLowerCase() === "in" || unit.toLowerCase() === "lh" || unit.toLowerCase() === "lvh" || unit.toLowerCase() === "lvw" || unit.toLowerCase() === "mm" || unit.toLowerCase() === "pc" || unit.toLowerCase() === "pt" || unit.toLowerCase() === "px" || unit.toLowerCase() === "q" || unit.toLowerCase() === "rem" || unit.toLowerCase() === "rlh" || unit.toLowerCase() === "svh" || unit.toLowerCase() === "svw" || unit.toLowerCase() === "vb" || unit.toLowerCase() === "vh" || unit.toLowerCase() === "vi" || unit.toLowerCase() === "vmax" || unit.toLowerCase() === "vmin" || unit.toLowerCase() === "vw")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#0", __ws: __ws, __litPres: __litPres, value: value, unit: unit };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthFunctionToken#0", value: value, unit: unit };
}

function __v1_parseLengthFunctionToken__alt1(state: State): unknown {
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
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#1", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthFunctionToken#1", value: value };
}

function __v1_parseLengthFunctionToken__alt2(state: State): unknown {
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
  if (!(value.toLowerCase() === "0")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#2", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthFunctionToken#2", value: value };
}

function __v1_parseLengthFunctionToken__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#3", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthFunctionToken#3" };
}

function __v1_parseLengthFunctionToken__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 43)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#4", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthFunctionToken#4" };
}

function __v1_parseLengthFunctionToken__alt5(state: State): unknown {
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
    const __captures: any = { __production: "LengthFunctionToken#5", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthFunctionToken#5" };
}

function __v1_parseLengthFunctionToken__alt6(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#6", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthFunctionToken#6" };
}

function __v1_parseLengthFunctionToken__alt7(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 44)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#7", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthFunctionToken#7" };
}

function __v1_parseLengthFunctionToken(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 45) {
  return __v1_parseLengthFunctionToken__alt3(state);
}
  if (input.charCodeAt(off) === 43) {
  return __v1_parseLengthFunctionToken__alt4(state);
}
  if (input.charCodeAt(off) === 42) {
  return __v1_parseLengthFunctionToken__alt5(state);
}
  if (input.charCodeAt(off) === 47) {
  return __v1_parseLengthFunctionToken__alt6(state);
}
  if (input.charCodeAt(off) === 44) {
  return __v1_parseLengthFunctionToken__alt7(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = __v1_parseLengthFunctionToken__alt0(state); if (r !== null) return r; }
  { const r = __v1_parseLengthFunctionToken__alt2(state); if (r !== null) return r; }
  return __v1_parseLengthFunctionToken__alt1(state);
}
  return null;
}

function __v1_parseCssLengthPercentage(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  const __items_start = off;
  const items: unknown[] = [];
  const __items_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __items_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = __v1_parseLengthPercentageItem(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__items_prevItemEnd >= 0 && __items_iws !== null) __items_iws.push(input.slice(__items_prevItemEnd, __itemStart));
    items.push(__cand);
    __items_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (items.length < 1) { state.pos = entryOff; return null; }
  if (items.length > 4) { state.pos = entryOff; return null; }
  const __items_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssLengthPercentage#0", __ws: __ws, __litPres: __litPres, items_iws: __items_iws, items: items };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CssLengthPercentage#0", items: items };
}

function __validator_0(input: string): void {
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
  const __r = __v0_parseCssColor(__state);
  if (__r === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}
function __validator_1(input: string): void {
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
  const __r = __v1_parseCssLengthPercentage(__state);
  if (__r === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

// ── End inlined validators ──

function parseComment(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off + 1 < len && input.charCodeAt(off) === 0x2f && input.charCodeAt(off + 1) === 0x2a)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __text_start = off;
  off += 2;
  while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
  if (off < len) off += 2;
  const __text_end = off;
  let __text_ts = __text_start + 2;
  let __text_te = __text_end - 2;
  while (__text_ts < __text_te) {
    const __lc = input.charCodeAt(__text_ts);
    if (__lc !== 0x20 && __lc !== 0x09 && __lc !== 0x0a && __lc !== 0x0d) break;
    __text_ts++;
  }
  while (__text_te > __text_ts) {
    const __tc = input.charCodeAt(__text_te - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __text_te--;
  }
  const text = input.slice(__text_ts, __text_te);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Comment#0", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Comment#0", text: text };
}

function parseDeclaration__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  let prop: string = '';
  let __prop_start = off;
  let __prop_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __prop_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __prop_start;
    if (__lastNonWs === __prop_start) {
      off = __emptyAnchor;
      prop = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        prop = input.slice(__prop_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __prop_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        prop = __buf;
      }
    }
    __prop_end = off;
  }
  const __wsStart_1 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let value: string = '';
  let __value_start = off;
  let __value_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __value_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 59 || __c === 125 || __c === 33)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __value_start;
    if (__lastNonWs === __value_start) {
      off = __emptyAnchor;
      value = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        value = input.slice(__value_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __value_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        value = __buf;
      }
    }
    __value_end = off;
  }
  const __wsStart_3 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_4 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __important_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __important_end = off;
  const important = input.slice(__important_start, __important_end);
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  const __litPre_5 = off;
  if (input.charCodeAt(off) === 59) { off += 1; }
  if (__litPres !== null) __litPres.push(off > __litPre_5);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Declaration#0", __ws: __ws, __litPres: __litPres, prop: prop, value: value, important: important };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Declaration#0", prop: prop, value: value, important: important };
}

function parseDeclaration__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  let prop: string = '';
  let __prop_start = off;
  let __prop_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __prop_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __prop_start;
    if (__lastNonWs === __prop_start) {
      off = __emptyAnchor;
      prop = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        prop = input.slice(__prop_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __prop_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        prop = __buf;
      }
    }
    __prop_end = off;
  }
  const __wsStart_1 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let value: string = '';
  let __value_start = off;
  let __value_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __value_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __value_start;
    if (__lastNonWs === __value_start) {
      off = __emptyAnchor;
      value = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        value = input.slice(__value_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __value_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        value = __buf;
      }
    }
    __value_end = off;
  }
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  const __litPre_3 = off;
  if (input.charCodeAt(off) === 59) { off += 1; }
  if (__litPres !== null) __litPres.push(off > __litPre_3);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Declaration#1", __ws: __ws, __litPres: __litPres, prop: prop, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Declaration#1", prop: prop, value: value };
}

function parseDeclaration(state: State): unknown {
  { const r = parseDeclaration__alt0(state); if (r !== null) return r; }
  return parseDeclaration__alt1(state);
}

function parseRule(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  let selector: string = '';
  let __selector_start = off;
  let __selector_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __selector_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 123 || __c === 59)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __selector_start;
    if (__lastNonWs === __selector_start) {
      off = __emptyAnchor;
      selector = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        selector = input.slice(__selector_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __selector_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        selector = __buf;
      }
    }
    __selector_end = off;
    if (selector.endsWith(":") || selector.endsWith(",") || selector.endsWith(">") || selector.endsWith("+") || selector.endsWith("~")) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    if (selector.length === 0) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  }
  const __wsStart_1 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 123)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __nodes_start = off;
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __nodes_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __nodes_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    // Skip ws (and comments when declared) before the separator.
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      // Skip ws (and comments) after the separator.
      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    }
    let __cand: unknown = null;
    const __itemStart = off;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 47) {
        __cand = parseComment(state);
      } else if (__c0 === 64) {
        __cand = parseAtRule(state);
      } else {
        __cand = parseRule(state);
        if (__cand === null) { __cand = parseDeclaration(state); }
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__nodes_prevItemEnd >= 0 && __nodes_iws !== null) __nodes_iws.push(input.slice(__nodes_prevItemEnd, __itemStart));
    nodes.push(__cand);
    __nodes_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (!__sepConsumed) { off = __preSweep; }
  const __nodes_end = off;
  const __wsStart_3 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 125)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Rule#0", __ws: __ws, __litPres: __litPres, nodes_iws: __nodes_iws, selector: selector, nodes: nodes };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Rule#0", selector: selector, nodes: nodes };
}

function parseAtRule__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 64)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  const __wsStart_2 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let params: string = '';
  let __params_start = off;
  let __params_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __params_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 59 || __c === 123)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __params_start;
    if (__lastNonWs === __params_start) {
      off = __emptyAnchor;
      params = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        params = input.slice(__params_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __params_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        params = __buf;
      }
    }
    __params_end = off;
  }
  const __wsStart_3 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 123)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  const __nodes_start = off;
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __nodes_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __nodes_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    // Skip ws (and comments when declared) before the separator.
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      // Skip ws (and comments) after the separator.
      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    }
    let __cand: unknown = null;
    const __itemStart = off;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 47) {
        __cand = parseComment(state);
      } else if (__c0 === 64) {
        __cand = parseAtRule(state);
      } else {
        __cand = parseRule(state);
        if (__cand === null) { __cand = parseDeclaration(state); }
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__nodes_prevItemEnd >= 0 && __nodes_iws !== null) __nodes_iws.push(input.slice(__nodes_prevItemEnd, __itemStart));
    nodes.push(__cand);
    __nodes_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (!__sepConsumed) { off = __preSweep; }
  const __nodes_end = off;
  const __wsStart_5 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  if (!(input.charCodeAt(off) === 125)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "AtRule#0", __ws: __ws, __litPres: __litPres, nodes_iws: __nodes_iws, name: name, params: params, nodes: nodes };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "AtRule#0", name: name, params: params, nodes: nodes };
}

function parseAtRule__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 64)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  const __wsStart_2 = off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
      off += 2;
      while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
      if (off < len) off += 2;
      continue;
    }

    break;
  }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let params: string = '';
  let __params_start = off;
  let __params_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __params_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 59 || __c === 123 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __params_start;
    if (__lastNonWs === __params_start) {
      off = __emptyAnchor;
      params = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        params = input.slice(__params_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __params_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        params = __buf;
      }
    }
    __params_end = off;
  }
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  const __litPre_3 = off;
  if (input.charCodeAt(off) === 59) { off += 1; }
  if (__litPres !== null) __litPres.push(off > __litPre_3);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "AtRule#1", __ws: __ws, __litPres: __litPres, name: name, params: params };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "AtRule#1", name: name, params: params };
}

function parseAtRule(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 64) {
  { const r = parseAtRule__alt0(state); if (r !== null) return r; }
  return parseAtRule__alt1(state);
}
  return null;
}

function parseStylesheet(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  const __nodes_start = off;
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __nodes_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __nodes_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    // Skip ws (and comments when declared) before the separator.
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      // Skip ws (and comments) after the separator.
      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    }
    let __cand: unknown = null;
    const __itemStart = off;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 47) {
        __cand = parseComment(state);
      } else if (__c0 === 64) {
        __cand = parseAtRule(state);
      } else {
        __cand = parseRule(state);
        if (__cand === null) { __cand = parseDeclaration(state); }
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__nodes_prevItemEnd >= 0 && __nodes_iws !== null) __nodes_iws.push(input.slice(__nodes_prevItemEnd, __itemStart));
    nodes.push(__cand);
    __nodes_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (!__sepConsumed) { off = __preSweep; }
  const __nodes_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Stylesheet#0", __ws: __ws, __litPres: __litPres, nodes_iws: __nodes_iws, nodes: nodes };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Stylesheet#0", nodes: nodes };
}

const __defaultTarget: string | undefined = undefined;

function __build_Comment_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "comment", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "comment", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_Comment_0_json(captures: any, __indentCol: number = 0): any {
  return null;
}

function __build_Comment_0_source(captures: any, __indentCol: number = 0): any {
  return "/* " + (__renderSlot_source(captures.text, __indentCol) ?? "") + " */";
}

function __build_Declaration_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "decl", prop: __renderSlot_ast(captures.prop, __indentCol), value: __renderSlot_ast(captures.value, __indentCol), important: true, _important: __renderSlot_ast(captures.important, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "decl", prop: __renderSlot_ast(captures.prop, __indentCol), value: __renderSlot_ast(captures.value, __indentCol), important: true, _important: __renderSlot_ast(captures.important, __indentCol) });
}

function __build_Declaration_0_json(captures: any, __indentCol: number = 0): any {
  return null;
}

function __build_Declaration_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.prop, __indentCol) ?? "") + ": " + (__renderSlot_source(captures.value, __indentCol) ?? "") + " !" + (__renderSlot_source(captures.important, __indentCol) ?? "") + ";";
}

function __build_Declaration_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "decl", prop: __renderSlot_ast(captures.prop, __indentCol), value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "decl", prop: __renderSlot_ast(captures.prop, __indentCol), value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_Declaration_1_json(captures: any, __indentCol: number = 0): any {
  return ({ [__renderSlot_json(captures.prop, __indentCol)]: __renderSlot_json(captures.value, __indentCol) });
}

function __build_Declaration_1_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.prop, __indentCol) ?? "") + ": " + (__renderSlot_source(captures.value, __indentCol) ?? "") + ";";
}

function __build_Rule_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "rule", selector: __renderSlot_ast(captures.selector, __indentCol), nodes: __renderSlot_ast(captures.nodes, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, nodes_iws: captures.nodes_iws } }) : { type: "rule", selector: __renderSlot_ast(captures.selector, __indentCol), nodes: __renderSlot_ast(captures.nodes, __indentCol) });
}

function __build_Rule_0_json(captures: any, __indentCol: number = 0): any {
  return ({ [__renderSlot_json(captures.selector, __indentCol)]: ((): any => {
  const __m: Record<string, unknown> = {};
  const __a = __renderSlot_json(captures.nodes, __indentCol);
  if (Array.isArray(__a)) {
    for (let __i = 0; __i < __a.length; __i++) {
      const __it = __a[__i];
      if (__it && typeof __it === "object") Object.assign(__m, __it);
    }
  }
  return __m;
})() });
}

function __build_Rule_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.selector, __indentCol) ?? "") + " {" + (captures.nodes == null ? "" : (Array.isArray(captures.nodes) ? captures.nodes.map((c: any) => __renderSlot_source(c, __indentCol)).join(";") : (__renderSlot_source(captures.nodes, __indentCol) ?? ""))) + "}";
}

function __build_AtRule_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "atrule", name: __renderSlot_ast(captures.name, __indentCol), params: __renderSlot_ast(captures.params, __indentCol), nodes: __renderSlot_ast(captures.nodes, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, nodes_iws: captures.nodes_iws } }) : { type: "atrule", name: __renderSlot_ast(captures.name, __indentCol), params: __renderSlot_ast(captures.params, __indentCol), nodes: __renderSlot_ast(captures.nodes, __indentCol) });
}

function __build_AtRule_0_json(captures: any, __indentCol: number = 0): any {
  return null;
}

function __build_AtRule_0_source(captures: any, __indentCol: number = 0): any {
  return "@" + (__renderSlot_source(captures.name, __indentCol) ?? "") + " " + (__renderSlot_source(captures.params, __indentCol) ?? "") + " {" + (captures.nodes == null ? "" : (Array.isArray(captures.nodes) ? captures.nodes.map((c: any) => __renderSlot_source(c, __indentCol)).join(";") : (__renderSlot_source(captures.nodes, __indentCol) ?? ""))) + "}";
}

function __build_AtRule_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "atrule", name: __renderSlot_ast(captures.name, __indentCol), params: __renderSlot_ast(captures.params, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "atrule", name: __renderSlot_ast(captures.name, __indentCol), params: __renderSlot_ast(captures.params, __indentCol) });
}

function __build_AtRule_1_json(captures: any, __indentCol: number = 0): any {
  return null;
}

function __build_AtRule_1_source(captures: any, __indentCol: number = 0): any {
  return "@" + (__renderSlot_source(captures.name, __indentCol) ?? "") + " " + (__renderSlot_source(captures.params, __indentCol) ?? "") + ";";
}

function __build_Stylesheet_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "root", nodes: __renderSlot_ast(captures.nodes, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, nodes_iws: captures.nodes_iws } }) : { type: "root", nodes: __renderSlot_ast(captures.nodes, __indentCol) });
}

function __build_Stylesheet_0_json(captures: any, __indentCol: number = 0): any {
  return ((): any => {
  const __m: Record<string, unknown> = {};
  const __a = __renderSlot_json(captures.nodes, __indentCol);
  if (Array.isArray(__a)) {
    for (let __i = 0; __i < __a.length; __i++) {
      const __it = __a[__i];
      if (__it && typeof __it === "object") Object.assign(__m, __it);
    }
  }
  return __m;
})();
}

function __build_Stylesheet_0_source(captures: any, __indentCol: number = 0): any {
  return String((captures.nodes == null ? "" : (Array.isArray(captures.nodes) ? captures.nodes.map((c: any) => __renderSlot_source(c, __indentCol)).join(";") : (__renderSlot_source(captures.nodes, __indentCol) ?? ""))));
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "Comment#0": return __build_Comment_0_ast(captures, __indentCol);
    case "Declaration#0": return __build_Declaration_0_ast(captures, __indentCol);
    case "Declaration#1": return __build_Declaration_1_ast(captures, __indentCol);
    case "Rule#0": return __build_Rule_0_ast(captures, __indentCol);
    case "AtRule#0": return __build_AtRule_0_ast(captures, __indentCol);
    case "AtRule#1": return __build_AtRule_1_ast(captures, __indentCol);
    case "Stylesheet#0": return __build_Stylesheet_0_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_json(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'json')");
  }
  switch (captures.__production) {
    case "Comment#0": return __build_Comment_0_json(captures, __indentCol);
    case "Declaration#0": return __build_Declaration_0_json(captures, __indentCol);
    case "Declaration#1": return __build_Declaration_1_json(captures, __indentCol);
    case "Rule#0": return __build_Rule_0_json(captures, __indentCol);
    case "AtRule#0": return __build_AtRule_0_json(captures, __indentCol);
    case "AtRule#1": return __build_AtRule_1_json(captures, __indentCol);
    case "Stylesheet#0": return __build_Stylesheet_0_json(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'json'");
}

function __dispatchRender_source(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "Comment#0": return __build_Comment_0_source(captures, __indentCol);
    case "Declaration#0": return __build_Declaration_0_source(captures, __indentCol);
    case "Declaration#1": return __build_Declaration_1_source(captures, __indentCol);
    case "Rule#0": return __build_Rule_0_source(captures, __indentCol);
    case "AtRule#0": return __build_AtRule_0_source(captures, __indentCol);
    case "AtRule#1": return __build_AtRule_1_source(captures, __indentCol);
    case "Stylesheet#0": return __build_Stylesheet_0_source(captures, __indentCol);
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

function __renderSlot_json(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_json(v[i], __indentCol));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_json(v, __indentCol);
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
  "json": (captures: any) => __dispatchRender_json(captures),
  "source": (captures: any) => __dispatchRender_source(captures),
};

export function render(input: string, options: { target: "ast"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Stylesheet_ast;
export function render(input: string, options: { target: "json"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Stylesheet_json;
export function render(input: string, options: { target: "source"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Stylesheet_source;
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

function __rebuild_Comment_0(captures: any): string {
  return String(__rebuildSlot(captures.text));
}

function __rebuild_Declaration_0(captures: any): string {
  return __rebuildSlot(captures.prop) + ":" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.value) + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "!" + __rebuildSlot(captures.important) + ";";
}

function __rebuild_Declaration_1(captures: any): string {
  return __rebuildSlot(captures.prop) + ":" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.value) + ";";
}

function __rebuild_Rule_0(captures: any): string {
  return __rebuildSlot(captures.selector) + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + "{" + (captures.nodes == null ? (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : "") : (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")) + (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : " ") + "}";
}

function __rebuild_AtRule_0(captures: any): string {
  return "@" + __rebuildSlot(captures.name) + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.params) + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "{" + (captures.nodes == null ? (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : "") : (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : " ") + __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")) + (captures.__ws && captures.__ws[3] !== undefined ? captures.__ws[3] : " ") + "}";
}

function __rebuild_AtRule_1(captures: any): string {
  return "@" + __rebuildSlot(captures.name) + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.params) + ";";
}

function __rebuild_Stylesheet_0(captures: any): string {
  return String((captures.nodes == null ? "" : __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")));
}

function __invert_Comment_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "comment")) {
    throw new Error("stringify: field \"type\" expected \"comment\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Comment_0(captures, __indentCol);
  }
  return "/* " + __rebuildSlot(captures.text) + " */";
}

function __invert_Declaration_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "decl")) {
    throw new Error("stringify: field \"type\" expected \"decl\", got " + JSON.stringify(value.type));
  }
  captures.prop = __invertSlotLeaf_ast(value.prop);
  captures.value = __invertSlotLeaf_ast(value.value);
  if (!Object.is(value.important, true)) {
    throw new Error("stringify: field \"important\" expected true, got " + JSON.stringify(value.important));
  }
  captures.important = __invertSlotLeaf_ast(value._important);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Declaration_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.prop) + ": " + __rebuildSlot(captures.value) + " !" + __rebuildSlot(captures.important) + ";";
}

function __invert_Declaration_1_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "decl")) {
    throw new Error("stringify: field \"type\" expected \"decl\", got " + JSON.stringify(value.type));
  }
  captures.prop = __invertSlotLeaf_ast(value.prop);
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Declaration_1(captures, __indentCol);
  }
  return __rebuildSlot(captures.prop) + ": " + __rebuildSlot(captures.value) + ";";
}

function __invert_Rule_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "rule")) {
    throw new Error("stringify: field \"type\" expected \"rule\", got " + JSON.stringify(value.type));
  }
  captures.selector = __invertSlotLeaf_ast(value.selector);
  captures.nodes = ((Array.isArray(value.nodes) ? value.nodes : value.nodes.split(";").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Rule_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.selector) + (captures.nodes == null ? "" : " {" + __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")) + "}";
}

function __invert_AtRule_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "atrule")) {
    throw new Error("stringify: field \"type\" expected \"atrule\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.params = __invertSlotLeaf_ast(value.params);
  captures.nodes = ((Array.isArray(value.nodes) ? value.nodes : value.nodes.split(";").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_AtRule_0(captures, __indentCol);
  }
  return "@" + __rebuildSlot(captures.name) + " " + __rebuildSlot(captures.params) + (captures.nodes == null ? "" : " {" + __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")) + "}";
}

function __invert_AtRule_1_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "atrule")) {
    throw new Error("stringify: field \"type\" expected \"atrule\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.params = __invertSlotLeaf_ast(value.params);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_AtRule_1(captures, __indentCol);
  }
  return "@" + __rebuildSlot(captures.name) + " " + __rebuildSlot(captures.params) + ";";
}

function __invert_Stylesheet_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "root")) {
    throw new Error("stringify: field \"type\" expected \"root\", got " + JSON.stringify(value.type));
  }
  captures.nodes = ((Array.isArray(value.nodes) ? value.nodes : value.nodes.split(";").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Stylesheet_0(captures, __indentCol);
  }
  return String((captures.nodes == null ? "" : __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")));
}

function __invert_Comment_0_json(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, null)) {
    throw new Error("stringify: expected scalar null, got " + JSON.stringify(value));
  }
  return "/* foo */";
}

function __invert_Declaration_0_json(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, null)) {
    throw new Error("stringify: expected scalar null, got " + JSON.stringify(value));
  }
  return "color: red !important;";
}

function __invert_Declaration_1_json(value: any, __indentCol: number = 0): string {
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
    throw new Error("stringify: expected single-entry object for dynKey 'prop', got " + typeof value);
  }
  {
    const __dkKeys = Object.keys(value);
    if (__dkKeys.length !== 1) {
      throw new Error("stringify: expected single-entry object for dynKey 'prop', got " + __dkKeys.length + " keys");
    }
    const __dkKey = __dkKeys[0]!;
    const __dkVal = (value as Record<string, unknown>)[__dkKey];
    captures.prop = __dkKey;
  captures.value = __invertSlotLeaf_json(__dkVal);
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Declaration_1(captures, __indentCol);
  }
  return __rebuildSlot(captures.prop) + ": " + __rebuildSlot(captures.value) + ";";
}

function __invert_Rule_0_json(value: any, __indentCol: number = 0): string {
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
    throw new Error("stringify: expected single-entry object for dynKey 'selector', got " + typeof value);
  }
  {
    const __dkKeys = Object.keys(value);
    if (__dkKeys.length !== 1) {
      throw new Error("stringify: expected single-entry object for dynKey 'selector', got " + __dkKeys.length + " keys");
    }
    const __dkKey = __dkKeys[0]!;
    const __dkVal = (value as Record<string, unknown>)[__dkKey];
    captures.selector = __dkKey;
  if (__dkVal === null || typeof __dkVal !== "object" || Array.isArray(__dkVal)) {
    throw new Error("stringify: expected object for merge 'nodes', got " + typeof __dkVal);
  }
  {
    const __mEntries = Object.entries(__dkVal as Record<string, unknown>);
    const __mArr: any[] = [];
    for (let __mI = 0; __mI < __mEntries.length; __mI++) {
      const __mK = __mEntries[__mI]![0];
      const __mV = __mEntries[__mI]![1];
      const __mWrapped: any = { [__mK]: __mV };
      __mArr.push(__invertMergeEntry_Comment_AtRule_Rule_Declaration_json(__mWrapped, __mV, __indentCol));
    }
    captures.nodes = __mArr;
  }
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Rule_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.selector) + (captures.nodes == null ? "" : " {" + __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")) + "}";
}

function __invert_AtRule_0_json(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, null)) {
    throw new Error("stringify: expected scalar null, got " + JSON.stringify(value));
  }
  return "@media screen { color: red }";
}

function __invert_AtRule_1_json(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, null)) {
    throw new Error("stringify: expected scalar null, got " + JSON.stringify(value));
  }
  return "@charset \"UTF-8\";";
}

function __invert_Stylesheet_0_json(value: any, __indentCol: number = 0): string {
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
    throw new Error("stringify: expected object for merge 'nodes', got " + typeof value);
  }
  {
    const __mEntries = Object.entries(value as Record<string, unknown>);
    const __mArr: any[] = [];
    for (let __mI = 0; __mI < __mEntries.length; __mI++) {
      const __mK = __mEntries[__mI]![0];
      const __mV = __mEntries[__mI]![1];
      const __mWrapped: any = { [__mK]: __mV };
      __mArr.push(__invertMergeEntry_Comment_AtRule_Rule_Declaration_json(__mWrapped, __mV, __indentCol));
    }
    captures.nodes = __mArr;
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Stylesheet_0(captures, __indentCol);
  }
  return String((captures.nodes == null ? "" : __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")));
}

function __invert_Comment_0_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("/* ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"/* \" in template body");
  }
  __pos += 3;
  {
    const __end = __s.indexOf(" */", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" */\" after capture text");
    }
    captures.text = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 3;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Comment_0(captures, __indentCol);
  }
  return "/* " + __rebuildSlot(captures.text) + " */";
}

function __invert_Declaration_0_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf(": ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \": \" after capture prop");
    }
    captures.prop = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(" !", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" !\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(";", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \";\" after capture important");
    }
    captures.important = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Declaration_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.prop) + ": " + __rebuildSlot(captures.value) + " !" + __rebuildSlot(captures.important) + ";";
}

function __invert_Declaration_1_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf(": ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \": \" after capture prop");
    }
    captures.prop = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(";", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \";\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Declaration_1(captures, __indentCol);
  }
  return __rebuildSlot(captures.prop) + ": " + __rebuildSlot(captures.value) + ";";
}

function __invert_Rule_0_source(value: any, __indentCol: number = 0): string {
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
    const __end = __s.indexOf(" {", __pos);
    if (__end < 0) {
      captures.selector = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.nodes = null;
    } else {
      captures.selector = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 2;
    }
  }
  {
    const __end = __s.indexOf("}", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"}\" after capture nodes");
    }
    captures.nodes = ((Array.isArray(__s.slice(__pos, __end)) ? __s.slice(__pos, __end) : __s.slice(__pos, __end).split(";").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(__e, __indentCol)));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Rule_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.selector) + (captures.nodes == null ? "" : " {" + __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")) + "}";
}

function __invert_AtRule_0_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("@", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"@\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" {", __pos);
    if (__end < 0) {
      captures.params = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.nodes = null;
    } else {
      captures.params = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 2;
    }
  }
  {
    const __end = __s.indexOf("}", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"}\" after capture nodes");
    }
    captures.nodes = ((Array.isArray(__s.slice(__pos, __end)) ? __s.slice(__pos, __end) : __s.slice(__pos, __end).split(";").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(__e, __indentCol)));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_AtRule_0(captures, __indentCol);
  }
  return "@" + __rebuildSlot(captures.name) + " " + __rebuildSlot(captures.params) + (captures.nodes == null ? "" : " {" + __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")) + "}";
}

function __invert_AtRule_1_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("@", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"@\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(";", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \";\" after capture params");
    }
    captures.params = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_AtRule_1(captures, __indentCol);
  }
  return "@" + __rebuildSlot(captures.name) + " " + __rebuildSlot(captures.params) + ";";
}

function __invert_Stylesheet_0_source(value: any, __indentCol: number = 0): string {
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
  if (__pos >= __s.length) {
    captures.nodes = null;
  } else {
    captures.nodes = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : __s.slice(__pos).split(";").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(__e, __indentCol)));
    __pos = __s.length;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Stylesheet_0(captures, __indentCol);
  }
  return String((captures.nodes == null ? "" : __rebuildSlotIws(captures.nodes, captures.nodes_iws, ";")));
}

function __dispatchInverse_Comment_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "comment")) return __invert_Comment_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Declaration_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "decl") && Object.is(value.important, true)) return __invert_Declaration_0_ast(value, __indentCol);
    if (Object.is(value.type, "decl")) return __invert_Declaration_1_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Rule_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "rule")) return __invert_Rule_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_AtRule_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "atrule") && "nodes" in value) return __invert_AtRule_0_ast(value, __indentCol);
    if (Object.is(value.type, "atrule") && !("nodes" in value)) return __invert_AtRule_1_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Stylesheet_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "root")) return __invert_Stylesheet_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Stylesheet_ast(value, 0);
}

function __dispatchInverse_Comment_json(value: any, __indentCol: number = 0): string {
  throw new Error("stringify: no productions declared for node 'Comment' target 'json'");
}

function __dispatchInverse_Declaration_json(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const __dkKeys = Object.keys(value);
    if (__dkKeys.length === 1) {
      const __dkV = (value as Record<string, unknown>)[__dkKeys[0]!];
      if (typeof __dkV === "string") return __invert_Declaration_1_json(value, __indentCol);
    }
  }
  throw new Error("stringify: no production matches for target 'json' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Rule_json(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    const __dkKeys = Object.keys(value);
    if (__dkKeys.length === 1) {
      const __dkV = (value as Record<string, unknown>)[__dkKeys[0]!];
      if (__dkV !== null && typeof __dkV === "object" && !Array.isArray(__dkV)) return __invert_Rule_0_json(value, __indentCol);
    }
  }
  throw new Error("stringify: no production matches for target 'json' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_AtRule_json(value: any, __indentCol: number = 0): string {
  throw new Error("stringify: no productions declared for node 'AtRule' target 'json'");
}

function __dispatchInverse_Stylesheet_json(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return __invert_Stylesheet_0_json(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'json' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_json(value: any): string {
  return __dispatchInverse_Stylesheet_json(value, 0);
}

function __dispatchInverse_Comment_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("/* ")) return __invert_Comment_0_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Declaration_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf(" !") >= 0) { try { return __invert_Declaration_0_source(value, __indentCol); } catch (_e) { /* try next */ } }
    try { return __invert_Declaration_1_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Rule_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf(" {") >= 0) { try { return __invert_Rule_0_source(value, __indentCol); } catch (_e) { /* try next */ } }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_AtRule_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("@")) return __invert_AtRule_0_source(value, __indentCol);
    if (value.startsWith("@")) return __invert_AtRule_1_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Stylesheet_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_Stylesheet_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Stylesheet_source(value, 0);
}

function __invertSlotFor_Comment_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Comment_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Comment_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Declaration_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Declaration_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Declaration_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Rule_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Rule_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Rule_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_AtRule_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_AtRule_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_AtRule_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Stylesheet_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Stylesheet_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Stylesheet_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Stylesheet_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Stylesheet_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Stylesheet_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Stylesheet_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: Comment, AtRule, Rule, Declaration; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { /* try next role */ }
  return String(v);
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

function __invertSlotFor_Comment_json(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Comment_json(v[i], __indentCol);
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
    try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Comment_json(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Declaration_json(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Declaration_json(v[i], __indentCol);
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
    try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Declaration_json(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Rule_json(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Rule_json(v[i], __indentCol);
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
    try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Rule_json(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_AtRule_json(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_AtRule_json(v[i], __indentCol);
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
    try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_AtRule_json(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Stylesheet_json(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Stylesheet_json(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Stylesheet_json(v[i], __indentCol);
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
    try { return __dispatchInverse_Stylesheet_json(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Stylesheet_json(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Stylesheet_json(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Stylesheet_json(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_Comment_AtRule_Rule_Declaration_json(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_Comment_AtRule_Rule_Declaration_json(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: Comment, AtRule, Rule, Declaration; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_Comment_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_json(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_json(v, __indentCol); } catch (_e) { /* try next role */ }
  return String(v);
}

function __invertMergeEntry_Comment_AtRule_Rule_Declaration_json(__mWrapped: any, __mV: any, __indentCol: number = 0): string {
  if (typeof __mV === "string") {
  return __dispatchInverse_Declaration_json(__mWrapped, __indentCol);
  }
  if (__mV !== null && typeof __mV === "object" && !Array.isArray(__mV)) {
  return __dispatchInverse_Rule_json(__mWrapped, __indentCol);
  }
  throw new Error("stringify: merge entry value type not handled by any production (Comment, AtRule, Rule, Declaration; entry value type: " + typeof __mV + ")");
}

function __invertSlotLeaf_json(v: any): any {
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
      const r = __invertSlotLeaf_json(v[i]);
      if (r !== null && r !== undefined) out.push(r);
    }
    return out;
  }
  return String(v);
}

function __invertSlotFor_Comment_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Comment_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Comment_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Declaration_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Declaration_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Declaration_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Rule_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Rule_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Rule_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_AtRule_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_AtRule_source(v[i], __indentCol);
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
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_AtRule_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Stylesheet_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Stylesheet_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Stylesheet_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Stylesheet_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Stylesheet_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Stylesheet_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Stylesheet_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: Comment, AtRule, Rule, Declaration; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { /* try next role */ }
  return String(v);
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
  "json": __dispatchInverse_json,
  "source": __dispatchInverse_source,
};

export function stringify(value: Stylesheet_ast, options: { target: "ast" }): string;
export function stringify(value: Stylesheet_json, options: { target: "json" }): string;
export function stringify(value: Stylesheet_source, options: { target: "source" }): string;
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

function __fusedRender_Comment_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off + 1 < len && input.charCodeAt(off) === 0x2f && input.charCodeAt(off + 1) === 0x2a)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __text_start = off;
    off += 2;
    while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
    if (off < len) off += 2;
    const __text_end = off;
    let __text_ts = __text_start + 2;
    let __text_te = __text_end - 2;
    while (__text_ts < __text_te) {
      const __lc = input.charCodeAt(__text_ts);
      if (__lc !== 0x20 && __lc !== 0x09 && __lc !== 0x0a && __lc !== 0x0d) break;
      __text_ts++;
    }
    while (__text_te > __text_ts) {
      const __tc = input.charCodeAt(__text_te - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __text_te--;
    }
    const text = input.slice(__text_ts, __text_te);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("/* ");
    out.push(String(text ?? ""));
    out.push(" */");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Declaration_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let prop: string = '';
    let __prop_start = off;
    let __prop_end = off;
    {
      let __lastLeadingCommentEnd = -1;
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          off += 2;
          while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
          if (off < len) off += 2;
          __lastLeadingCommentEnd = off;
          continue;
        }
        break;
      }
      __prop_start = off;
      let __lastNonWs = off;
      let __depth = 0;
      const __comments: [number, number][] = [];
      const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
        if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
          __depth++; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
          if (__depth === 0) break;
          __depth--; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x22 || __c === 0x27) {
          const __q = __c;
          off++;
          while (off < len) {
            const __sc = input.charCodeAt(off);
            if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__sc === __q) { off++; break; }
            if (__sc === 0x0a || __sc === 0x0d) break;
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__depth === 0 && (__c === 0x75 || __c === 0x55)
          && off + 3 < len
          && (input.charCodeAt(off + 1) | 32) === 0x72
          && (input.charCodeAt(off + 2) | 32) === 0x6c
          && input.charCodeAt(off + 3) === 0x28) {
          off += 4;
          while (off < len) {
            const __uc = input.charCodeAt(off);
            if (__uc === 0x29) { off++; break; }
            if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__uc === 0x22 || __uc === 0x27) {
              const __uq = __uc;
              off++;
              while (off < len) {
                const __usc = input.charCodeAt(off);
                if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
                if (__usc === __uq) { off++; break; }
                if (__usc === 0x0a || __usc === 0x0d) break;
                off++;
              }
              continue;
            }
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          let __ce = off + 2;
          while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
          if (__ce < len) {
            __comments.push([off, __ce + 2]);
            off = __ce + 2;
            continue;
          }
        }
        if (__c === 0x5c && off + 1 < len) {
          __lastNonWs = off + 2;
          off += 2;
          continue;
        }
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        if (__depth === 0 && __KB[__c] === 0) {
          // unknown char (depth 0, no stop, no opener) — fail production
          if (off > state.maxOff) state.maxOff = off;
          state.pos = entryOff;
          return null;
        }
        off++;
      }
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __prop_start;
      if (__lastNonWs === __prop_start) {
        off = __emptyAnchor;
        prop = '';
      } else {
        off = __lastNonWs;
        if (__comments.length === 0) {
          prop = input.slice(__prop_start, __lastNonWs);
        } else {
          let __buf = '';
          let __cursor = __prop_start;
          for (let __i = 0; __i < __comments.length; __i++) {
            const __cs = __comments[__i][0];
            const __ce = __comments[__i][1];
            if (__ce > __lastNonWs) break;
            const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
            const __after = __ce < len ? input.charCodeAt(__ce) : -1;
            const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
            const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
            if (!(__isWsBefore || __isWsAfter)) continue;
            __buf += input.slice(__cursor, __cs);
            __cursor = __ce;
          }
          __buf += input.slice(__cursor, __lastNonWs);
          prop = __buf;
        }
      }
      __prop_end = off;
    }
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    let value: string = '';
    let __value_start = off;
    let __value_end = off;
    {
      let __lastLeadingCommentEnd = -1;
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          off += 2;
          while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
          if (off < len) off += 2;
          __lastLeadingCommentEnd = off;
          continue;
        }
        break;
      }
      __value_start = off;
      let __lastNonWs = off;
      let __depth = 0;
      const __comments: [number, number][] = [];
      const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__depth === 0 && (__c === 59 || __c === 125 || __c === 33)) break;
        if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
          __depth++; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
          if (__depth === 0) break;
          __depth--; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x22 || __c === 0x27) {
          const __q = __c;
          off++;
          while (off < len) {
            const __sc = input.charCodeAt(off);
            if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__sc === __q) { off++; break; }
            if (__sc === 0x0a || __sc === 0x0d) break;
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__depth === 0 && (__c === 0x75 || __c === 0x55)
          && off + 3 < len
          && (input.charCodeAt(off + 1) | 32) === 0x72
          && (input.charCodeAt(off + 2) | 32) === 0x6c
          && input.charCodeAt(off + 3) === 0x28) {
          off += 4;
          while (off < len) {
            const __uc = input.charCodeAt(off);
            if (__uc === 0x29) { off++; break; }
            if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__uc === 0x22 || __uc === 0x27) {
              const __uq = __uc;
              off++;
              while (off < len) {
                const __usc = input.charCodeAt(off);
                if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
                if (__usc === __uq) { off++; break; }
                if (__usc === 0x0a || __usc === 0x0d) break;
                off++;
              }
              continue;
            }
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          let __ce = off + 2;
          while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
          if (__ce < len) {
            __comments.push([off, __ce + 2]);
            off = __ce + 2;
            continue;
          }
        }
        if (__c === 0x5c && off + 1 < len) {
          __lastNonWs = off + 2;
          off += 2;
          continue;
        }
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        if (__depth === 0 && __KB[__c] === 0) {
          // unknown char (depth 0, no stop, no opener) — fail production
          if (off > state.maxOff) state.maxOff = off;
          state.pos = entryOff;
          return null;
        }
        off++;
      }
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __value_start;
      if (__lastNonWs === __value_start) {
        off = __emptyAnchor;
        value = '';
      } else {
        off = __lastNonWs;
        if (__comments.length === 0) {
          value = input.slice(__value_start, __lastNonWs);
        } else {
          let __buf = '';
          let __cursor = __value_start;
          for (let __i = 0; __i < __comments.length; __i++) {
            const __cs = __comments[__i][0];
            const __ce = __comments[__i][1];
            if (__ce > __lastNonWs) break;
            const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
            const __after = __ce < len ? input.charCodeAt(__ce) : -1;
            const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
            const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
            if (!(__isWsBefore || __isWsAfter)) continue;
            __buf += input.slice(__cursor, __cs);
            __cursor = __ce;
          }
          __buf += input.slice(__cursor, __lastNonWs);
          value = __buf;
        }
      }
      __value_end = off;
    }
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __important_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __important_end = off;
    const important = input.slice(__important_start, __important_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (input.charCodeAt(off) === 59) { off += 1; }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(prop ?? ""));
    out.push(": ");
    out.push(String(value ?? ""));
    out.push(" !");
    out.push(String(important ?? ""));
    out.push(";");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Declaration_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let prop: string = '';
    let __prop_start = off;
    let __prop_end = off;
    {
      let __lastLeadingCommentEnd = -1;
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          off += 2;
          while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
          if (off < len) off += 2;
          __lastLeadingCommentEnd = off;
          continue;
        }
        break;
      }
      __prop_start = off;
      let __lastNonWs = off;
      let __depth = 0;
      const __comments: [number, number][] = [];
      const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
        if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
          __depth++; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
          if (__depth === 0) break;
          __depth--; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x22 || __c === 0x27) {
          const __q = __c;
          off++;
          while (off < len) {
            const __sc = input.charCodeAt(off);
            if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__sc === __q) { off++; break; }
            if (__sc === 0x0a || __sc === 0x0d) break;
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__depth === 0 && (__c === 0x75 || __c === 0x55)
          && off + 3 < len
          && (input.charCodeAt(off + 1) | 32) === 0x72
          && (input.charCodeAt(off + 2) | 32) === 0x6c
          && input.charCodeAt(off + 3) === 0x28) {
          off += 4;
          while (off < len) {
            const __uc = input.charCodeAt(off);
            if (__uc === 0x29) { off++; break; }
            if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__uc === 0x22 || __uc === 0x27) {
              const __uq = __uc;
              off++;
              while (off < len) {
                const __usc = input.charCodeAt(off);
                if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
                if (__usc === __uq) { off++; break; }
                if (__usc === 0x0a || __usc === 0x0d) break;
                off++;
              }
              continue;
            }
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          let __ce = off + 2;
          while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
          if (__ce < len) {
            __comments.push([off, __ce + 2]);
            off = __ce + 2;
            continue;
          }
        }
        if (__c === 0x5c && off + 1 < len) {
          __lastNonWs = off + 2;
          off += 2;
          continue;
        }
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        if (__depth === 0 && __KB[__c] === 0) {
          // unknown char (depth 0, no stop, no opener) — fail production
          if (off > state.maxOff) state.maxOff = off;
          state.pos = entryOff;
          return null;
        }
        off++;
      }
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __prop_start;
      if (__lastNonWs === __prop_start) {
        off = __emptyAnchor;
        prop = '';
      } else {
        off = __lastNonWs;
        if (__comments.length === 0) {
          prop = input.slice(__prop_start, __lastNonWs);
        } else {
          let __buf = '';
          let __cursor = __prop_start;
          for (let __i = 0; __i < __comments.length; __i++) {
            const __cs = __comments[__i][0];
            const __ce = __comments[__i][1];
            if (__ce > __lastNonWs) break;
            const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
            const __after = __ce < len ? input.charCodeAt(__ce) : -1;
            const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
            const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
            if (!(__isWsBefore || __isWsAfter)) continue;
            __buf += input.slice(__cursor, __cs);
            __cursor = __ce;
          }
          __buf += input.slice(__cursor, __lastNonWs);
          prop = __buf;
        }
      }
      __prop_end = off;
    }
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    let value: string = '';
    let __value_start = off;
    let __value_end = off;
    {
      let __lastLeadingCommentEnd = -1;
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          off += 2;
          while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
          if (off < len) off += 2;
          __lastLeadingCommentEnd = off;
          continue;
        }
        break;
      }
      __value_start = off;
      let __lastNonWs = off;
      let __depth = 0;
      const __comments: [number, number][] = [];
      const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__depth === 0 && (__c === 59 || __c === 125)) break;
        if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
          __depth++; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
          if (__depth === 0) break;
          __depth--; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x22 || __c === 0x27) {
          const __q = __c;
          off++;
          while (off < len) {
            const __sc = input.charCodeAt(off);
            if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__sc === __q) { off++; break; }
            if (__sc === 0x0a || __sc === 0x0d) break;
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__depth === 0 && (__c === 0x75 || __c === 0x55)
          && off + 3 < len
          && (input.charCodeAt(off + 1) | 32) === 0x72
          && (input.charCodeAt(off + 2) | 32) === 0x6c
          && input.charCodeAt(off + 3) === 0x28) {
          off += 4;
          while (off < len) {
            const __uc = input.charCodeAt(off);
            if (__uc === 0x29) { off++; break; }
            if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__uc === 0x22 || __uc === 0x27) {
              const __uq = __uc;
              off++;
              while (off < len) {
                const __usc = input.charCodeAt(off);
                if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
                if (__usc === __uq) { off++; break; }
                if (__usc === 0x0a || __usc === 0x0d) break;
                off++;
              }
              continue;
            }
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          let __ce = off + 2;
          while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
          if (__ce < len) {
            __comments.push([off, __ce + 2]);
            off = __ce + 2;
            continue;
          }
        }
        if (__c === 0x5c && off + 1 < len) {
          __lastNonWs = off + 2;
          off += 2;
          continue;
        }
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        if (__depth === 0 && __KB[__c] === 0) {
          // unknown char (depth 0, no stop, no opener) — fail production
          if (off > state.maxOff) state.maxOff = off;
          state.pos = entryOff;
          return null;
        }
        off++;
      }
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __value_start;
      if (__lastNonWs === __value_start) {
        off = __emptyAnchor;
        value = '';
      } else {
        off = __lastNonWs;
        if (__comments.length === 0) {
          value = input.slice(__value_start, __lastNonWs);
        } else {
          let __buf = '';
          let __cursor = __value_start;
          for (let __i = 0; __i < __comments.length; __i++) {
            const __cs = __comments[__i][0];
            const __ce = __comments[__i][1];
            if (__ce > __lastNonWs) break;
            const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
            const __after = __ce < len ? input.charCodeAt(__ce) : -1;
            const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
            const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
            if (!(__isWsBefore || __isWsAfter)) continue;
            __buf += input.slice(__cursor, __cs);
            __cursor = __ce;
          }
          __buf += input.slice(__cursor, __lastNonWs);
          value = __buf;
        }
      }
      __value_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (input.charCodeAt(off) === 59) { off += 1; }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(prop ?? ""));
    out.push(": ");
    out.push(String(value ?? ""));
    out.push(";");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Rule_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let selector: string = '';
    let __selector_start = off;
    let __selector_end = off;
    {
      let __lastLeadingCommentEnd = -1;
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          off += 2;
          while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
          if (off < len) off += 2;
          __lastLeadingCommentEnd = off;
          continue;
        }
        break;
      }
      __selector_start = off;
      let __lastNonWs = off;
      let __depth = 0;
      const __comments: [number, number][] = [];
      const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__depth === 0 && (__c === 123 || __c === 59)) break;
        if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
          __depth++; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
          if (__depth === 0) break;
          __depth--; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x22 || __c === 0x27) {
          const __q = __c;
          off++;
          while (off < len) {
            const __sc = input.charCodeAt(off);
            if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__sc === __q) { off++; break; }
            if (__sc === 0x0a || __sc === 0x0d) break;
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__depth === 0 && (__c === 0x75 || __c === 0x55)
          && off + 3 < len
          && (input.charCodeAt(off + 1) | 32) === 0x72
          && (input.charCodeAt(off + 2) | 32) === 0x6c
          && input.charCodeAt(off + 3) === 0x28) {
          off += 4;
          while (off < len) {
            const __uc = input.charCodeAt(off);
            if (__uc === 0x29) { off++; break; }
            if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__uc === 0x22 || __uc === 0x27) {
              const __uq = __uc;
              off++;
              while (off < len) {
                const __usc = input.charCodeAt(off);
                if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
                if (__usc === __uq) { off++; break; }
                if (__usc === 0x0a || __usc === 0x0d) break;
                off++;
              }
              continue;
            }
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          let __ce = off + 2;
          while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
          if (__ce < len) {
            __comments.push([off, __ce + 2]);
            off = __ce + 2;
            continue;
          }
        }
        if (__c === 0x5c && off + 1 < len) {
          __lastNonWs = off + 2;
          off += 2;
          continue;
        }
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        if (__depth === 0 && __KB[__c] === 0) {
          // unknown char (depth 0, no stop, no opener) — fail production
          if (off > state.maxOff) state.maxOff = off;
          state.pos = entryOff;
          return null;
        }
        off++;
      }
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __selector_start;
      if (__lastNonWs === __selector_start) {
        off = __emptyAnchor;
        selector = '';
      } else {
        off = __lastNonWs;
        if (__comments.length === 0) {
          selector = input.slice(__selector_start, __lastNonWs);
        } else {
          let __buf = '';
          let __cursor = __selector_start;
          for (let __i = 0; __i < __comments.length; __i++) {
            const __cs = __comments[__i][0];
            const __ce = __comments[__i][1];
            if (__ce > __lastNonWs) break;
            const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
            const __after = __ce < len ? input.charCodeAt(__ce) : -1;
            const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
            const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
            if (!(__isWsBefore || __isWsAfter)) continue;
            __buf += input.slice(__cursor, __cs);
            __cursor = __ce;
          }
          __buf += input.slice(__cursor, __lastNonWs);
          selector = __buf;
        }
      }
      __selector_end = off;
      if (selector.endsWith(":") || selector.endsWith(",") || selector.endsWith(">") || selector.endsWith("+") || selector.endsWith("~")) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
      if (selector.length === 0) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    }
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(input.charCodeAt(off) === 123)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_nodes: string[] = [];
    let __slotMatched_nodes = false;
    // recursive repeats span (Comment, AtRule, Rule, Declaration) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 59) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_nodes.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_nodes.push(";");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 47) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Comment_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 64) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_AtRule_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_AtRule_1_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Rule_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_1_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_nodes.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_nodes = true;
        if (off === __loopStart) break;
      }
    }
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(input.charCodeAt(off) === 125)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(selector ?? ""));
    out.push(" {");
    if (__slotMatched_nodes) for (let __i = 0; __i < __slotBuf_nodes.length; __i++) out.push(__slotBuf_nodes[__i]);
    out.push("}");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_AtRule_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 64)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __name_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __name_end = off;
    const name = input.slice(__name_start, __name_end);
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    let params: string = '';
    let __params_start = off;
    let __params_end = off;
    {
      let __lastLeadingCommentEnd = -1;
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          off += 2;
          while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
          if (off < len) off += 2;
          __lastLeadingCommentEnd = off;
          continue;
        }
        break;
      }
      __params_start = off;
      let __lastNonWs = off;
      let __depth = 0;
      const __comments: [number, number][] = [];
      const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__depth === 0 && (__c === 59 || __c === 123)) break;
        if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
          __depth++; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
          if (__depth === 0) break;
          __depth--; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x22 || __c === 0x27) {
          const __q = __c;
          off++;
          while (off < len) {
            const __sc = input.charCodeAt(off);
            if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__sc === __q) { off++; break; }
            if (__sc === 0x0a || __sc === 0x0d) break;
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__depth === 0 && (__c === 0x75 || __c === 0x55)
          && off + 3 < len
          && (input.charCodeAt(off + 1) | 32) === 0x72
          && (input.charCodeAt(off + 2) | 32) === 0x6c
          && input.charCodeAt(off + 3) === 0x28) {
          off += 4;
          while (off < len) {
            const __uc = input.charCodeAt(off);
            if (__uc === 0x29) { off++; break; }
            if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__uc === 0x22 || __uc === 0x27) {
              const __uq = __uc;
              off++;
              while (off < len) {
                const __usc = input.charCodeAt(off);
                if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
                if (__usc === __uq) { off++; break; }
                if (__usc === 0x0a || __usc === 0x0d) break;
                off++;
              }
              continue;
            }
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          let __ce = off + 2;
          while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
          if (__ce < len) {
            __comments.push([off, __ce + 2]);
            off = __ce + 2;
            continue;
          }
        }
        if (__c === 0x5c && off + 1 < len) {
          __lastNonWs = off + 2;
          off += 2;
          continue;
        }
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        if (__depth === 0 && __KB[__c] === 0) {
          // unknown char (depth 0, no stop, no opener) — fail production
          if (off > state.maxOff) state.maxOff = off;
          state.pos = entryOff;
          return null;
        }
        off++;
      }
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __params_start;
      if (__lastNonWs === __params_start) {
        off = __emptyAnchor;
        params = '';
      } else {
        off = __lastNonWs;
        if (__comments.length === 0) {
          params = input.slice(__params_start, __lastNonWs);
        } else {
          let __buf = '';
          let __cursor = __params_start;
          for (let __i = 0; __i < __comments.length; __i++) {
            const __cs = __comments[__i][0];
            const __ce = __comments[__i][1];
            if (__ce > __lastNonWs) break;
            const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
            const __after = __ce < len ? input.charCodeAt(__ce) : -1;
            const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
            const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
            if (!(__isWsBefore || __isWsAfter)) continue;
            __buf += input.slice(__cursor, __cs);
            __cursor = __ce;
          }
          __buf += input.slice(__cursor, __lastNonWs);
          params = __buf;
        }
      }
      __params_end = off;
    }
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(input.charCodeAt(off) === 123)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_nodes: string[] = [];
    let __slotMatched_nodes = false;
    // recursive repeats span (Comment, AtRule, Rule, Declaration) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 59) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_nodes.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_nodes.push(";");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 47) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Comment_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 64) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_AtRule_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_AtRule_1_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Rule_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_1_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_nodes.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_nodes = true;
        if (off === __loopStart) break;
      }
    }
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(input.charCodeAt(off) === 125)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("@");
    out.push(String(name ?? ""));
    out.push(" ");
    out.push(String(params ?? ""));
    out.push(" {");
    if (__slotMatched_nodes) for (let __i = 0; __i < __slotBuf_nodes.length; __i++) out.push(__slotBuf_nodes[__i]);
    out.push("}");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_AtRule_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 64)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __name_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __name_end = off;
    const name = input.slice(__name_start, __name_end);
    while (off < len) {
      const c = input.charCodeAt(off);
      if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
      if (c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        continue;
      }
      break;
    }
    let params: string = '';
    let __params_start = off;
    let __params_end = off;
    {
      let __lastLeadingCommentEnd = -1;
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          off += 2;
          while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
          if (off < len) off += 2;
          __lastLeadingCommentEnd = off;
          continue;
        }
        break;
      }
      __params_start = off;
      let __lastNonWs = off;
      let __depth = 0;
      const __comments: [number, number][] = [];
      const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__depth === 0 && (__c === 59 || __c === 123 || __c === 125)) break;
        if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
          __depth++; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
          if (__depth === 0) break;
          __depth--; off++;
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x22 || __c === 0x27) {
          const __q = __c;
          off++;
          while (off < len) {
            const __sc = input.charCodeAt(off);
            if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__sc === __q) { off++; break; }
            if (__sc === 0x0a || __sc === 0x0d) break;
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__depth === 0 && (__c === 0x75 || __c === 0x55)
          && off + 3 < len
          && (input.charCodeAt(off + 1) | 32) === 0x72
          && (input.charCodeAt(off + 2) | 32) === 0x6c
          && input.charCodeAt(off + 3) === 0x28) {
          off += 4;
          while (off < len) {
            const __uc = input.charCodeAt(off);
            if (__uc === 0x29) { off++; break; }
            if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
            if (__uc === 0x22 || __uc === 0x27) {
              const __uq = __uc;
              off++;
              while (off < len) {
                const __usc = input.charCodeAt(off);
                if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
                if (__usc === __uq) { off++; break; }
                if (__usc === 0x0a || __usc === 0x0d) break;
                off++;
              }
              continue;
            }
            off++;
          }
          __lastNonWs = off;
          continue;
        }
        if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
          let __ce = off + 2;
          while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
          if (__ce < len) {
            __comments.push([off, __ce + 2]);
            off = __ce + 2;
            continue;
          }
        }
        if (__c === 0x5c && off + 1 < len) {
          __lastNonWs = off + 2;
          off += 2;
          continue;
        }
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        if (__depth === 0 && __KB[__c] === 0) {
          // unknown char (depth 0, no stop, no opener) — fail production
          if (off > state.maxOff) state.maxOff = off;
          state.pos = entryOff;
          return null;
        }
        off++;
      }
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __params_start;
      if (__lastNonWs === __params_start) {
        off = __emptyAnchor;
        params = '';
      } else {
        off = __lastNonWs;
        if (__comments.length === 0) {
          params = input.slice(__params_start, __lastNonWs);
        } else {
          let __buf = '';
          let __cursor = __params_start;
          for (let __i = 0; __i < __comments.length; __i++) {
            const __cs = __comments[__i][0];
            const __ce = __comments[__i][1];
            if (__ce > __lastNonWs) break;
            const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
            const __after = __ce < len ? input.charCodeAt(__ce) : -1;
            const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
            const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
            if (!(__isWsBefore || __isWsAfter)) continue;
            __buf += input.slice(__cursor, __cs);
            __cursor = __ce;
          }
          __buf += input.slice(__cursor, __lastNonWs);
          params = __buf;
        }
      }
      __params_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (input.charCodeAt(off) === 59) { off += 1; }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("@");
    out.push(String(name ?? ""));
    out.push(" ");
    out.push(String(params ?? ""));
    out.push(";");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Stylesheet_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_nodes: string[] = [];
    let __slotMatched_nodes = false;
    // recursive repeats span (Comment, AtRule, Rule, Declaration) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 59) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_nodes.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_nodes.push(";");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 47) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Comment_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 64) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_AtRule_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_AtRule_1_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Rule_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_0_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_nodes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_1_source(state, __slotBuf_nodes)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_nodes.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_nodes = true;
        if (off === __loopStart) break;
      }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    if (__slotMatched_nodes) for (let __i = 0; __i < __slotBuf_nodes.length; __i++) out.push(__slotBuf_nodes[__i]);
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "Comment#0": __fusedRender_Comment_0_source,
  "Declaration#0": __fusedRender_Declaration_0_source,
  "Declaration#1": __fusedRender_Declaration_1_source,
  "Rule#0": __fusedRender_Rule_0_source,
  "AtRule#0": __fusedRender_AtRule_0_source,
  "AtRule#1": __fusedRender_AtRule_1_source,
  "Stylesheet#0": __fusedRender_Stylesheet_0_source,
};

function __fusedRenderStructured_Comment_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off + 1 < len && input.charCodeAt(off) === 0x2f && input.charCodeAt(off + 1) === 0x2a)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __text_start = off;
  off += 2;
  while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
  if (off < len) off += 2;
  const __text_end = off;
  let __text_ts = __text_start + 2;
  let __text_te = __text_end - 2;
  while (__text_ts < __text_te) {
    const __lc = input.charCodeAt(__text_ts);
    if (__lc !== 0x20 && __lc !== 0x09 && __lc !== 0x0a && __lc !== 0x0d) break;
    __text_ts++;
  }
  while (__text_te > __text_ts) {
    const __tc = input.charCodeAt(__text_te - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __text_te--;
  }
  const text = input.slice(__text_ts, __text_te);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "comment", text: text };
}

function __fusedRenderStructured_Declaration_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let prop: string = '';
  let __prop_start = off;
  let __prop_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __prop_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __prop_start;
    if (__lastNonWs === __prop_start) {
      off = __emptyAnchor;
      prop = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        prop = input.slice(__prop_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __prop_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        prop = __buf;
      }
    }
    __prop_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let value: string = '';
  let __value_start = off;
  let __value_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __value_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 59 || __c === 125 || __c === 33)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __value_start;
    if (__lastNonWs === __value_start) {
      off = __emptyAnchor;
      value = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        value = input.slice(__value_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __value_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        value = __buf;
      }
    }
    __value_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __important_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __important_end = off;
  const important = input.slice(__important_start, __important_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.charCodeAt(off) === 59) { off += 1; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "decl", prop: prop, value: value, important: true, _important: important };
}

function __fusedRenderStructured_Declaration_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let prop: string = '';
  let __prop_start = off;
  let __prop_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __prop_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __prop_start;
    if (__lastNonWs === __prop_start) {
      off = __emptyAnchor;
      prop = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        prop = input.slice(__prop_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __prop_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        prop = __buf;
      }
    }
    __prop_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let value: string = '';
  let __value_start = off;
  let __value_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __value_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __value_start;
    if (__lastNonWs === __value_start) {
      off = __emptyAnchor;
      value = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        value = input.slice(__value_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __value_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        value = __buf;
      }
    }
    __value_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.charCodeAt(off) === 59) { off += 1; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "decl", prop: prop, value: value };
}

function __fusedRenderStructured_Rule_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let selector: string = '';
  let __selector_start = off;
  let __selector_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __selector_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 123 || __c === 59)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __selector_start;
    if (__lastNonWs === __selector_start) {
      off = __emptyAnchor;
      selector = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        selector = input.slice(__selector_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __selector_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        selector = __buf;
      }
    }
    __selector_end = off;
    if (selector.endsWith(":") || selector.endsWith(",") || selector.endsWith(">") || selector.endsWith("+") || selector.endsWith("~")) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    if (selector.length === 0) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 123)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    }
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 47) {
        __cand = __fusedRenderStructuredDispatch_Comment_ast(state);
      } else if (__c0 === 64) {
        __cand = __fusedRenderStructuredDispatch_AtRule_ast(state);
      } else {
        __cand = __fusedRenderStructuredDispatch_Rule_ast(state);
        if (__cand === null) __cand = __fusedRenderStructuredDispatch_Declaration_ast(state);
      }
    }
    if (__cand === null) break;
    nodes.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 125)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "rule", selector: selector, nodes: nodes };
}

function __fusedRenderStructured_AtRule_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 64)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let params: string = '';
  let __params_start = off;
  let __params_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __params_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 59 || __c === 123)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __params_start;
    if (__lastNonWs === __params_start) {
      off = __emptyAnchor;
      params = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        params = input.slice(__params_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __params_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        params = __buf;
      }
    }
    __params_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 123)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    }
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 47) {
        __cand = __fusedRenderStructuredDispatch_Comment_ast(state);
      } else if (__c0 === 64) {
        __cand = __fusedRenderStructuredDispatch_AtRule_ast(state);
      } else {
        __cand = __fusedRenderStructuredDispatch_Rule_ast(state);
        if (__cand === null) __cand = __fusedRenderStructuredDispatch_Declaration_ast(state);
      }
    }
    if (__cand === null) break;
    nodes.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 125)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "atrule", name: name, params: params, nodes: nodes };
}

function __fusedRenderStructured_AtRule_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 64)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let params: string = '';
  let __params_start = off;
  let __params_end = off;
  {
    let __lastLeadingCommentEnd = -1;
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      if (__c0 === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        off += 2;
        while (off < len && !(input.charCodeAt(off) === 0x2a && off + 1 < len && input.charCodeAt(off + 1) === 0x2f)) off++;
        if (off < len) off += 2;
        __lastLeadingCommentEnd = off;
        continue;
      }
      break;
    }
    __params_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    const __KB = [0,0,0,0,0,0,0,0,0,1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 59 || __c === 123 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) {
        __depth++; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; off++;
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        off++;
        while (off < len) {
          const __sc = input.charCodeAt(off);
          if (__sc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__sc === __q) { off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__depth === 0 && (__c === 0x75 || __c === 0x55)
        && off + 3 < len
        && (input.charCodeAt(off + 1) | 32) === 0x72
        && (input.charCodeAt(off + 2) | 32) === 0x6c
        && input.charCodeAt(off + 3) === 0x28) {
        off += 4;
        while (off < len) {
          const __uc = input.charCodeAt(off);
          if (__uc === 0x29) { off++; break; }
          if (__uc === 0x5c && off + 1 < len) { off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            off++;
            while (off < len) {
              const __usc = input.charCodeAt(off);
              if (__usc === 0x5c && off + 1 < len) { off += 2; continue; }
              if (__usc === __uq) { off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              off++;
            }
            continue;
          }
          off++;
        }
        __lastNonWs = off;
        continue;
      }
      if (__c === 0x2f && off + 1 < len && input.charCodeAt(off + 1) === 0x2a) {
        let __ce = off + 2;
        while (__ce < len && !(input.charCodeAt(__ce) === 0x2a && __ce + 1 < len && input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < len) {
          __comments.push([off, __ce + 2]);
          off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      if (__depth === 0 && __KB[__c] === 0) {
        // unknown char (depth 0, no stop, no opener) — fail production
        if (off > state.maxOff) state.maxOff = off;
        state.pos = entryOff;
        return null;
      }
      off++;
    }
    const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __params_start;
    if (__lastNonWs === __params_start) {
      off = __emptyAnchor;
      params = '';
    } else {
      off = __lastNonWs;
      if (__comments.length === 0) {
        params = input.slice(__params_start, __lastNonWs);
      } else {
        let __buf = '';
        let __cursor = __params_start;
        for (let __i = 0; __i < __comments.length; __i++) {
          const __cs = __comments[__i][0];
          const __ce = __comments[__i][1];
          if (__ce > __lastNonWs) break;
          const __before = __cs > 0 ? input.charCodeAt(__cs - 1) : -1;
          const __after = __ce < len ? input.charCodeAt(__ce) : -1;
          const __isWsBefore = __before === 0x20 || __before === 0x09 || __before === 0x0a || __before === 0x0d;
          const __isWsAfter = __after === 0x20 || __after === 0x09 || __after === 0x0a || __after === 0x0d;
          if (!(__isWsBefore || __isWsAfter)) continue;
          __buf += input.slice(__cursor, __cs);
          __cursor = __ce;
        }
        __buf += input.slice(__cursor, __lastNonWs);
        params = __buf;
      }
    }
    __params_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.charCodeAt(off) === 59) { off += 1; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "atrule", name: name, params: params };
}

function __fusedRenderStructured_Stylesheet_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    }
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 47) {
        __cand = __fusedRenderStructuredDispatch_Comment_ast(state);
      } else if (__c0 === 64) {
        __cand = __fusedRenderStructuredDispatch_AtRule_ast(state);
      } else {
        __cand = __fusedRenderStructuredDispatch_Rule_ast(state);
        if (__cand === null) __cand = __fusedRenderStructuredDispatch_Declaration_ast(state);
      }
    }
    if (__cand === null) break;
    nodes.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "root", nodes: nodes };
}

function __fusedRenderStructuredDispatch_AtRule_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_AtRule_0_ast(state); if (r0 !== null) return r0;
  const r1 = __fusedRenderStructured_AtRule_1_ast(state); if (r1 !== null) return r1;
  return null;
}

function __fusedRenderStructuredDispatch_Comment_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_Comment_0_ast(state); if (r0 !== null) return r0;
  return null;
}

function __fusedRenderStructuredDispatch_Declaration_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_Declaration_0_ast(state); if (r0 !== null) return r0;
  const r1 = __fusedRenderStructured_Declaration_1_ast(state); if (r1 !== null) return r1;
  return null;
}

function __fusedRenderStructuredDispatch_Rule_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_Rule_0_ast(state); if (r0 !== null) return r0;
  return null;
}

const __fusedRenderStructuredTable_ast: Record<string, (state: State) => unknown> = {
  "Comment#0": __fusedRenderStructured_Comment_0_ast,
  "Declaration#0": __fusedRenderStructured_Declaration_0_ast,
  "Declaration#1": __fusedRenderStructured_Declaration_1_ast,
  "Rule#0": __fusedRenderStructured_Rule_0_ast,
  "AtRule#0": __fusedRenderStructured_AtRule_0_ast,
  "AtRule#1": __fusedRenderStructured_AtRule_1_ast,
  "Stylesheet#0": __fusedRenderStructured_Stylesheet_0_ast,
};

const __rootProductionKey: string = "Stylesheet#0";

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
  
  const result = parseStylesheet(state);
  
  while (state.pos < state.len) {
    const __c = input.charCodeAt(state.pos);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { state.pos++; continue; }
    if (__c === 0x2f && state.pos + 1 < state.len && input.charCodeAt(state.pos + 1) === 0x2a) {
      state.pos += 2;
      while (state.pos < state.len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < state.len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
      if (state.pos < state.len) state.pos += 2;
      continue;
    }

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
  // Syntax check: parse in fast mode first (will throw SyntaxError on bad syntax).
  // Recovery diagnostics surface here (single flush) — the raws-mode walk
  // call below intentionally suppresses onDiagnostic to avoid double-flush.
  __parse(input, { mode: 'fast', onDiagnostic: options?.onDiagnostic });
  // Validation check: only runs when opt-in.
  if (!options?.validate) return;
  // Parse in raws mode to get source offsets for error reporting.
  const __rawsAst = __parse(input, { mode: 'raws' });
  __walkAndValidate(input, __rawsAst);
}

function __walkAndValidate(input: string, node: unknown): void {
  if (node === null || node === undefined) return;
  if (Array.isArray(node)) {
    for (const child of node) __walkAndValidate(input, child);
    return;
  }
  if (typeof node !== 'object') return;
  const __n = node as Record<string, unknown>;
  const __prod = typeof __n['__production'] === 'string' ? __n['__production'] : '';
  if (__prod === "Declaration" || __prod.startsWith("Declaration#")) {
    if (["accent-color", "border-block-color", "border-block-end-color", "border-block-start-color", "border-bottom-color", "border-color", "border-inline-color", "border-inline-end-color", "border-inline-start-color", "border-left-color", "border-right-color", "border-top-color", "caret-color", "color", "column-rule-color", "fill", "flood-color", "lighting-color", "outline-color", "stop-color", "stroke", "text-decoration-color"].includes(__n["prop"])) {
      try { __validator_0(String(__n["value"] ?? '')); }
      catch (__e) {
        const __off = (__n.source && __n.source.start && typeof __n.source.start.offset === 'number')
          ? __n.source.start.offset : 0;
        throw validatorErrorAt(input, __off, __e);
      }
    }
    if (["block-size", "border-block-end-width", "border-block-start-width", "border-block-width", "border-bottom-width", "border-inline-end-width", "border-inline-start-width", "border-inline-width", "border-left-width", "border-right-width", "border-spacing", "border-top-width", "border-width", "bottom", "column-gap", "column-width", "flex-basis", "font-size", "gap", "height", "inline-size", "inset", "inset-block", "inset-block-end", "inset-block-start", "inset-inline", "inset-inline-end", "inset-inline-start", "left", "letter-spacing", "margin", "margin-block", "margin-block-end", "margin-block-start", "margin-bottom", "margin-inline", "margin-inline-end", "margin-inline-start", "margin-left", "margin-right", "margin-top", "max-block-size", "max-height", "max-inline-size", "max-width", "min-block-size", "min-height", "min-inline-size", "min-width", "outline-offset", "outline-width", "padding", "padding-block", "padding-block-end", "padding-block-start", "padding-bottom", "padding-inline", "padding-inline-end", "padding-inline-start", "padding-left", "padding-right", "padding-top", "right", "row-gap", "scroll-margin", "scroll-padding", "top", "width", "word-spacing"].includes(__n["prop"])) {
      try { __validator_1(String(__n["value"] ?? '')); }
      catch (__e) {
        const __off = (__n.source && __n.source.start && typeof __n.source.start.offset === 'number')
          ? __n.source.start.offset : 0;
        throw validatorErrorAt(input, __off, __e);
      }
    }
  }
  // Recurse into all object-valued children.
  for (const __key in __n) {
    const __child = __n[__key];
    if (__child !== null && typeof __child === 'object') __walkAndValidate(input, __child);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/css",
  exportName: 'validate',
};
