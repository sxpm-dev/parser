// Auto-generated from packages/cron/src/schema.ts
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
export type CronField_ast = { type: "wildcard" } | { type: "step"; step: string } | { type: "value"; value: string } | { type: "range"; start: string; end: string };
export type CronField_source = string;
export type CommandWord_ast = string;
export type CommandWord_source = string;
export type Command_ast = { type: "command"; words: CommandWord_ast[] };
export type Command_source = string;
export type Cron_ast = { type: "cron"; minute: CronField_ast; hour: CronField_ast; dayOfMonth: CronField_ast; month: CronField_ast; dayOfWeek: CronField_ast; command: Command_ast | null };
export type Cron_source = string;

function parseCronField__alt0(state: State): unknown {
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
    const __captures: any = { __production: "CronField#0", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CronField#0" };
}

function parseCronField__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __step_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __step_end = off;
  const step = input.slice(__step_start, __step_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CronField#1", __ws: __ws, __litPres: __litPres, step: step };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CronField#1", step: step };
}

function parseCronField__alt2(state: State): unknown {
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
    const __captures: any = { __production: "CronField#2", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CronField#2", value: value };
}

function parseCronField__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __start_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __start_end = off;
  const start = input.slice(__start_start, __start_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __end_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __end_end = off;
  const end = input.slice(__end_start, __end_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CronField#3", __ws: __ws, __litPres: __litPres, start: start, end: end };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CronField#3", start: start, end: end };
}

function parseCronField(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 42) {
  { const r = parseCronField__alt1(state); if (r !== null) return r; }
  return parseCronField__alt0(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = parseCronField__alt3(state); if (r !== null) return r; }
  return parseCronField__alt2(state);
}
  return null;
}

function parseCommandWord(state: State): unknown {
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
    const __captures: any = { __production: "CommandWord#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CommandWord#0", value: value };
}

function parseCommand(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  const __words_start = off;
  const words: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseCommandWord(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    words.push(__cand);
    if (off === __loopStart) break;
  }
  if (words.length < 1) { state.pos = entryOff; return null; }
  const __words_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Command#0", __ws: __ws, __litPres: __litPres, words: words };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Command#0", words: words };
}

function parseCron(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  state.pos = off;
  const __minute_start = off;
  const minute = parseCronField(state);
  if (minute === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __minute_end = off;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  state.pos = off;
  const __hour_start = off;
  const hour = parseCronField(state);
  if (hour === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __hour_end = off;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  state.pos = off;
  const __dayOfMonth_start = off;
  const dayOfMonth = parseCronField(state);
  if (dayOfMonth === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __dayOfMonth_end = off;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  state.pos = off;
  const __month_start = off;
  const month = parseCronField(state);
  if (month === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __month_end = off;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  state.pos = off;
  const __dayOfWeek_start = off;
  const dayOfWeek = parseCronField(state);
  if (dayOfWeek === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __dayOfWeek_end = off;
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  state.pos = off;
  const __command_start = off;
  const command = parseCommand(state);
  off = state.pos;
  const __command_end = off;

  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Cron#0", __ws: __ws, __litPres: __litPres, minute: minute, hour: hour, dayOfMonth: dayOfMonth, month: month, dayOfWeek: dayOfWeek, command: command };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Cron#0", minute: minute, hour: hour, dayOfMonth: dayOfMonth, month: month, dayOfWeek: dayOfWeek, command: command };
}

const __defaultTarget: string | undefined = undefined;

function __build_CronField_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "wildcard" }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "wildcard" });
}

function __build_CronField_0_source(captures: any, __indentCol: number = 0): any {
  return String("*");
}

function __build_CronField_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "step", step: __renderSlot_ast(captures.step, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "step", step: __renderSlot_ast(captures.step, __indentCol) });
}

function __build_CronField_1_source(captures: any, __indentCol: number = 0): any {
  return "*/" + (__renderSlot_source(captures.step, __indentCol) ?? "");
}

function __build_CronField_2_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "value", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "value", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_CronField_2_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.value, __indentCol) ?? ""));
}

function __build_CronField_3_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "range", start: __renderSlot_ast(captures.start, __indentCol), end: __renderSlot_ast(captures.end, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "range", start: __renderSlot_ast(captures.start, __indentCol), end: __renderSlot_ast(captures.end, __indentCol) });
}

function __build_CronField_3_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.start, __indentCol) ?? "") + "-" + (__renderSlot_source(captures.end, __indentCol) ?? "");
}

function __build_CommandWord_0_ast(captures: any, __indentCol: number = 0): any {
  return __renderSlot_ast(captures.value, __indentCol);
}

function __build_CommandWord_0_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.value, __indentCol) ?? ""));
}

function __build_Command_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "command", words: __renderSlot_ast(captures.words, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "command", words: __renderSlot_ast(captures.words, __indentCol) });
}

function __build_Command_0_source(captures: any, __indentCol: number = 0): any {
  return String((Array.isArray(captures.words) ? captures.words.map((c: any) => __renderSlot_source(c, __indentCol)).join(" ") : (__renderSlot_source(captures.words, __indentCol) ?? "")));
}

function __build_Cron_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "cron", minute: __renderSlot_ast(captures.minute, __indentCol), hour: __renderSlot_ast(captures.hour, __indentCol), dayOfMonth: __renderSlot_ast(captures.dayOfMonth, __indentCol), month: __renderSlot_ast(captures.month, __indentCol), dayOfWeek: __renderSlot_ast(captures.dayOfWeek, __indentCol), command: __renderSlot_ast(captures.command, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "cron", minute: __renderSlot_ast(captures.minute, __indentCol), hour: __renderSlot_ast(captures.hour, __indentCol), dayOfMonth: __renderSlot_ast(captures.dayOfMonth, __indentCol), month: __renderSlot_ast(captures.month, __indentCol), dayOfWeek: __renderSlot_ast(captures.dayOfWeek, __indentCol), command: __renderSlot_ast(captures.command, __indentCol) });
}

function __build_Cron_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.minute, __indentCol) ?? "") + " " + (__renderSlot_source(captures.hour, __indentCol) ?? "") + " " + (__renderSlot_source(captures.dayOfMonth, __indentCol) ?? "") + " " + (__renderSlot_source(captures.month, __indentCol) ?? "") + " " + (__renderSlot_source(captures.dayOfWeek, __indentCol) ?? "") + (captures.command == null ? "" : " " + (__renderSlot_source(captures.command, __indentCol) ?? ""));
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "CronField#0": return __build_CronField_0_ast(captures, __indentCol);
    case "CronField#1": return __build_CronField_1_ast(captures, __indentCol);
    case "CronField#2": return __build_CronField_2_ast(captures, __indentCol);
    case "CronField#3": return __build_CronField_3_ast(captures, __indentCol);
    case "CommandWord#0": return __build_CommandWord_0_ast(captures, __indentCol);
    case "Command#0": return __build_Command_0_ast(captures, __indentCol);
    case "Cron#0": return __build_Cron_0_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "CronField#0": return __build_CronField_0_source(captures, __indentCol);
    case "CronField#1": return __build_CronField_1_source(captures, __indentCol);
    case "CronField#2": return __build_CronField_2_source(captures, __indentCol);
    case "CronField#3": return __build_CronField_3_source(captures, __indentCol);
    case "CommandWord#0": return __build_CommandWord_0_source(captures, __indentCol);
    case "Command#0": return __build_Command_0_source(captures, __indentCol);
    case "Cron#0": return __build_Cron_0_source(captures, __indentCol);
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

export function render(input: string, options: { target: "ast"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Cron_ast;
export function render(input: string, options: { target: "source"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Cron_source;
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

function __rebuild_CronField_0(captures: any): string {
  return "*";
}

function __rebuild_CronField_1(captures: any): string {
  return "*" + "/" + __rebuildSlot(captures.step);
}

function __rebuild_CronField_2(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_CronField_3(captures: any): string {
  return __rebuildSlot(captures.start) + "-" + __rebuildSlot(captures.end);
}

function __rebuild_CommandWord_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_Command_0(captures: any): string {
  return String(__rebuildSlot(captures.words, " "));
}

function __rebuild_Cron_0(captures: any): string {
  return __rebuildSlot(captures.minute) + " " + __rebuildSlot(captures.hour) + " " + __rebuildSlot(captures.dayOfMonth) + " " + __rebuildSlot(captures.month) + " " + __rebuildSlot(captures.dayOfWeek) + (captures.command == null ? "" : " " + __rebuildSlot(captures.command));
}

function __invert_CronField_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "wildcard")) {
    throw new Error("stringify: field \"type\" expected \"wildcard\", got " + JSON.stringify(value.type));
  }
  return "*";
}

function __invert_CronField_1_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "step")) {
    throw new Error("stringify: field \"type\" expected \"step\", got " + JSON.stringify(value.type));
  }
  captures.step = __invertSlotLeaf_ast(value.step);
  return "*/" + __rebuildSlot(captures.step);
}

function __invert_CronField_2_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "value")) {
    throw new Error("stringify: field \"type\" expected \"value\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return String(__rebuildSlot(captures.value));
}

function __invert_CronField_3_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "range")) {
    throw new Error("stringify: field \"type\" expected \"range\", got " + JSON.stringify(value.type));
  }
  captures.start = __invertSlotLeaf_ast(value.start);
  captures.end = __invertSlotLeaf_ast(value.end);
  return __rebuildSlot(captures.start) + "-" + __rebuildSlot(captures.end);
}

function __invert_CommandWord_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  captures.value = __invertSlotLeaf_ast(value);
  return String(__rebuildSlot(captures.value));
}

function __invert_Command_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "command")) {
    throw new Error("stringify: field \"type\" expected \"command\", got " + JSON.stringify(value.type));
  }
  captures.words = ((Array.isArray(value.words) ? value.words : [value.words]).map((__e: any) => __dispatchInverse_CommandWord_ast(__e, __indentCol)));
  return String(__rebuildSlot(captures.words, " "));
}

function __invert_Cron_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "cron")) {
    throw new Error("stringify: field \"type\" expected \"cron\", got " + JSON.stringify(value.type));
  }
  captures.minute = __invertSlotFor_CronField_ast(value.minute, __indentCol);
  captures.hour = __invertSlotFor_CronField_ast(value.hour, __indentCol);
  captures.dayOfMonth = __invertSlotFor_CronField_ast(value.dayOfMonth, __indentCol);
  captures.month = __invertSlotFor_CronField_ast(value.month, __indentCol);
  captures.dayOfWeek = __invertSlotFor_CronField_ast(value.dayOfWeek, __indentCol);
  captures.command = __invertSlotFor_Command_ast(value.command, __indentCol);
  return __rebuildSlot(captures.minute) + " " + __rebuildSlot(captures.hour) + " " + __rebuildSlot(captures.dayOfMonth) + " " + __rebuildSlot(captures.month) + " " + __rebuildSlot(captures.dayOfWeek) + (captures.command == null ? "" : " " + __rebuildSlot(captures.command));
}

function __invert_CronField_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
  return "*";
}

function __invert_CronField_1_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("*/", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"*/\" in template body");
  }
  __pos += 2;
  captures.step = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return "*/" + __rebuildSlot(captures.step);
}

function __invert_CronField_2_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
  return String(__rebuildSlot(captures.value));
}

function __invert_CronField_3_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf("-", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"-\" after capture start");
    }
    captures.start = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.end = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuildSlot(captures.start) + "-" + __rebuildSlot(captures.end);
}

function __invert_CommandWord_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
  return String(__rebuildSlot(captures.value));
}

function __invert_Command_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.words = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : [__s.slice(__pos)]).map((__e: any) => __dispatchInverse_CommandWord_source(__e, __indentCol)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return String(__rebuildSlot(captures.words, " "));
}

function __invert_Cron_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture minute");
    }
    captures.minute = __invertSlotFor_CronField_source(__s.slice(__pos, __end), __indentCol);
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture hour");
    }
    captures.hour = __invertSlotFor_CronField_source(__s.slice(__pos, __end), __indentCol);
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture dayOfMonth");
    }
    captures.dayOfMonth = __invertSlotFor_CronField_source(__s.slice(__pos, __end), __indentCol);
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture month");
    }
    captures.month = __invertSlotFor_CronField_source(__s.slice(__pos, __end), __indentCol);
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      captures.dayOfWeek = __invertSlotFor_CronField_source(__s.slice(__pos), __indentCol);
      __pos = __s.length;
    captures.command = null;
    } else {
      captures.dayOfWeek = __invertSlotFor_CronField_source(__s.slice(__pos, __end), __indentCol);
      __pos = __end + 1;
    }
  }
  if (__pos >= __s.length) {
    captures.command = null;
  } else {
    captures.command = __invertSlotFor_Command_source(__s.slice(__pos), __indentCol);
    __pos = __s.length;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuildSlot(captures.minute) + " " + __rebuildSlot(captures.hour) + " " + __rebuildSlot(captures.dayOfMonth) + " " + __rebuildSlot(captures.month) + " " + __rebuildSlot(captures.dayOfWeek) + (captures.command == null ? "" : " " + __rebuildSlot(captures.command));
}

function __dispatchInverse_CronField_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "wildcard")) return __invert_CronField_0_ast(value, __indentCol);
    if (Object.is(value.type, "step")) return __invert_CronField_1_ast(value, __indentCol);
    if (Object.is(value.type, "value")) return __invert_CronField_2_ast(value, __indentCol);
    if (Object.is(value.type, "range")) return __invert_CronField_3_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_CommandWord_ast(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    return __invert_CommandWord_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Command_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "command")) return __invert_Command_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Cron_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "cron")) return __invert_Cron_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Cron_ast(value, 0);
}

function __dispatchInverse_CronField_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("*/")) return __invert_CronField_1_source(value, __indentCol);
    if (value.startsWith("*")) return __invert_CronField_0_source(value, __indentCol);
    if (value.indexOf("-") >= 0) { try { return __invert_CronField_3_source(value, __indentCol); } catch (_e) { /* try next */ } }
    try { return __invert_CronField_2_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_CommandWord_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_CommandWord_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Command_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_Command_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Cron_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf(" ") >= 0) { try { return __invert_Cron_0_source(value, __indentCol); } catch (_e) { /* try next */ } }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Cron_source(value, 0);
}

function __invertSlotFor_CronField_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_CronField_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_CronField_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_CronField_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_CronField_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_CronField_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_CronField_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_CommandWord_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_CommandWord_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_CommandWord_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_CommandWord_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_CommandWord_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_CommandWord_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_CommandWord_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Command_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Command_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Command_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Command_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Command_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Command_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Command_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Cron_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Cron_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Cron_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Cron_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Cron_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Cron_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Cron_ast(v, __indentCol); } catch (_e) { return String(v); }
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

function __invertSlotFor_CronField_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_CronField_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_CronField_source(v[i], __indentCol);
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
    try { return __dispatchInverse_CronField_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_CronField_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_CronField_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_CronField_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_CommandWord_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_CommandWord_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_CommandWord_source(v[i], __indentCol);
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
    try { return __dispatchInverse_CommandWord_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_CommandWord_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_CommandWord_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_CommandWord_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Command_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Command_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Command_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Command_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Command_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Command_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Command_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Cron_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Cron_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Cron_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Cron_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Cron_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Cron_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Cron_source(v, __indentCol); } catch (_e) { return String(v); }
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

export function stringify(value: Cron_ast, options: { target: "ast" }): string;
export function stringify(value: Cron_source, options: { target: "source" }): string;
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

function __fusedRender_CronField_0_source(state: State, out: string[]): boolean {
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

function __fusedRender_CronField_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __step_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __step_end = off;
    const step = input.slice(__step_start, __step_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("*/");
    out.push(String(step ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_CronField_2_source(state: State, out: string[]): boolean {
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

function __fusedRender_CronField_3_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __start_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __start_end = off;
    const start = input.slice(__start_start, __start_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __end_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __end_end = off;
    const end = input.slice(__end_start, __end_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(start ?? ""));
    out.push("-");
    out.push(String(end ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_CommandWord_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Command_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_words: string[] = [];
    let __slotMatched_words = false;
    // recursive repeats span (CommandWord) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        const __bufLenBefore = __slotBuf_words.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_words.push(" ");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 65) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 66) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 67) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 68) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 69) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 71) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 72) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 73) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 74) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 75) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 76) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 77) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 78) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 79) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 80) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 81) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 82) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 83) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 84) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 85) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 86) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 88) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 89) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 90) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 97) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 98) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 99) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 100) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 101) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 102) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 103) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 104) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 105) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 106) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 107) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 108) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 109) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 110) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 111) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 112) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 113) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 114) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 115) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 116) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 117) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 118) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 119) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 120) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 121) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 122) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_words.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_CommandWord_0_source(state, __slotBuf_words)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_words.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_words = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    for (let __i = 0; __i < __slotBuf_words.length; __i++) out.push(__slotBuf_words[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Cron_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_minute: string[] = [];
    let __slotMatched_minute = false;
    // recursive span (CronField) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 42) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_1_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_0_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 43) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 45) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 48) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 49) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 50) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 51) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 52) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 53) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 54) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 55) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 56) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
        else if (__c0 === 57) {
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
          if (!__slotMatched_minute) {
            state.pos = __offBefore;
            __slotBuf_minute.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_minute)) { __slotMatched_minute = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_minute) __slotBuf_minute.length = 0;
      if (!__slotMatched_minute) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_hour: string[] = [];
    let __slotMatched_hour = false;
    // recursive span (CronField) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 42) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_1_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_0_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 43) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 45) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 48) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 49) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 50) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 51) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 52) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 53) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 54) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 55) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 56) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
        else if (__c0 === 57) {
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
          if (!__slotMatched_hour) {
            state.pos = __offBefore;
            __slotBuf_hour.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_hour)) { __slotMatched_hour = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_hour) __slotBuf_hour.length = 0;
      if (!__slotMatched_hour) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_dayOfMonth: string[] = [];
    let __slotMatched_dayOfMonth = false;
    // recursive span (CronField) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 42) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_1_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_0_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 43) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 45) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 48) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 49) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 50) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 51) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 52) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 53) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 54) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 55) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 56) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
        else if (__c0 === 57) {
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfMonth) {
            state.pos = __offBefore;
            __slotBuf_dayOfMonth.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfMonth)) { __slotMatched_dayOfMonth = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_dayOfMonth) __slotBuf_dayOfMonth.length = 0;
      if (!__slotMatched_dayOfMonth) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_month: string[] = [];
    let __slotMatched_month = false;
    // recursive span (CronField) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 42) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_1_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_0_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 43) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 45) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 48) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 49) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 50) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 51) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 52) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 53) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 54) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 55) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 56) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
        else if (__c0 === 57) {
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
          if (!__slotMatched_month) {
            state.pos = __offBefore;
            __slotBuf_month.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_month)) { __slotMatched_month = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_month) __slotBuf_month.length = 0;
      if (!__slotMatched_month) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_dayOfWeek: string[] = [];
    let __slotMatched_dayOfWeek = false;
    // recursive span (CronField) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 42) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_1_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_0_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 43) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 45) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 48) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 49) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 50) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 51) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 52) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 53) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 54) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 55) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 56) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
        else if (__c0 === 57) {
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_3_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
          if (!__slotMatched_dayOfWeek) {
            state.pos = __offBefore;
            __slotBuf_dayOfWeek.length = 0;
            if (__fusedRender_CronField_2_source(state, __slotBuf_dayOfWeek)) { __slotMatched_dayOfWeek = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_dayOfWeek) __slotBuf_dayOfWeek.length = 0;
      if (!__slotMatched_dayOfWeek) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_command: string[] = [];
    let __slotMatched_command = false;
    // recursive span (Command) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (!__slotMatched_command) {
          state.pos = __offBefore;
          __slotBuf_command.length = 0;
          if (__fusedRender_Command_0_source(state, __slotBuf_command)) { __slotMatched_command = true; off = state.pos; }
        }
      }
      if (!__slotMatched_command) __slotBuf_command.length = 0;
      if (!__slotMatched_command) { off = __offBefore; state.pos = __offBefore; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    for (let __i = 0; __i < __slotBuf_minute.length; __i++) out.push(__slotBuf_minute[__i]);
    out.push(" ");
    for (let __i = 0; __i < __slotBuf_hour.length; __i++) out.push(__slotBuf_hour[__i]);
    out.push(" ");
    for (let __i = 0; __i < __slotBuf_dayOfMonth.length; __i++) out.push(__slotBuf_dayOfMonth[__i]);
    out.push(" ");
    for (let __i = 0; __i < __slotBuf_month.length; __i++) out.push(__slotBuf_month[__i]);
    out.push(" ");
    for (let __i = 0; __i < __slotBuf_dayOfWeek.length; __i++) out.push(__slotBuf_dayOfWeek[__i]);
    if (__slotMatched_command) { out.push(" "); for (let __i = 0; __i < __slotBuf_command.length; __i++) out.push(__slotBuf_command[__i]); }
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "CronField#0": __fusedRender_CronField_0_source,
  "CronField#1": __fusedRender_CronField_1_source,
  "CronField#2": __fusedRender_CronField_2_source,
  "CronField#3": __fusedRender_CronField_3_source,
  "CommandWord#0": __fusedRender_CommandWord_0_source,
  "Command#0": __fusedRender_Command_0_source,
  "Cron#0": __fusedRender_Cron_0_source,
};

function __fusedRenderStructured_CronField_0_ast(state: State): unknown {
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

function __fusedRenderStructured_CronField_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __step_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __step_end = off;
  const step = input.slice(__step_start, __step_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "step", step: step };
}

function __fusedRenderStructured_CronField_2_ast(state: State): unknown {
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
  return { type: "value", value: value };
}

function __fusedRenderStructured_CronField_3_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __start_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __start_end = off;
  const start = input.slice(__start_start, __start_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __end_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __end_end = off;
  const end = input.slice(__end_start, __end_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "range", start: start, end: end };
}

const __fusedRenderStructuredTable_ast: Record<string, (state: State) => unknown> = {
  "CronField#0": __fusedRenderStructured_CronField_0_ast,
  "CronField#1": __fusedRenderStructured_CronField_1_ast,
  "CronField#2": __fusedRenderStructured_CronField_2_ast,
  "CronField#3": __fusedRenderStructured_CronField_3_ast,
};

const __rootProductionKey: string = "Cron#0";

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
  
  const result = parseCron(state);
  
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
  const __result = parseCron(__state);
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
  module: "@parser2/cron",
  exportName: 'validate',
};
