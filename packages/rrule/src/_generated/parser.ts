// Auto-generated from packages/rrule/src/schema.ts
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
export type FreqValue_ast = "SECONDLY" | "MINUTELY" | "HOURLY" | "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
export type FreqValue_source = string;
export type Weekday_ast = "SU" | "MO" | "TU" | "WE" | "TH" | "FR" | "SA";
export type Weekday_source = string;
export type NumValue_ast = string;
export type NumValue_source = string;
export type Part_ast = { type: "bymonthday"; days: NumValue_ast[] } | { type: "bymonth"; months: NumValue_ast[] } | { type: "byminute"; minutes: NumValue_ast[] } | { type: "byhour"; hours: NumValue_ast[] } | { type: "byday"; days: Weekday_ast[] } | { type: "freq"; value: FreqValue_ast } | { type: "count"; value: string } | { type: "interval"; value: string } | { type: "until"; value: string } | { type: "wkst"; value: Weekday_ast };
export type Part_source = string;
export type Rule_ast = { type: "rule"; parts: Part_ast[] };
export type Rule_source = string;

function parseFreqValue__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("SECONDLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 8;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "FreqValue#0", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "FreqValue#0" };
}

function parseFreqValue__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("MINUTELY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 8;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "FreqValue#1", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "FreqValue#1" };
}

function parseFreqValue__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("HOURLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "FreqValue#2", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "FreqValue#2" };
}

function parseFreqValue__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("DAILY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "FreqValue#3", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "FreqValue#3" };
}

function parseFreqValue__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("WEEKLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "FreqValue#4", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "FreqValue#4" };
}

function parseFreqValue__alt5(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("MONTHLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 7;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "FreqValue#5", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "FreqValue#5" };
}

function parseFreqValue__alt6(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("YEARLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "FreqValue#6", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "FreqValue#6" };
}

function parseFreqValue(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 83) {
  return parseFreqValue__alt0(state);
}
  if (input.charCodeAt(off) === 77) {
  if (off + 1 < len && input.charCodeAt(off + 1) === 73) {
    return parseFreqValue__alt1(state);
  }
  if (off + 1 < len && input.charCodeAt(off + 1) === 79) {
    return parseFreqValue__alt5(state);
  }
  return null;
}
  if (input.charCodeAt(off) === 72) {
  return parseFreqValue__alt2(state);
}
  if (input.charCodeAt(off) === 68) {
  return parseFreqValue__alt3(state);
}
  if (input.charCodeAt(off) === 87) {
  return parseFreqValue__alt4(state);
}
  if (input.charCodeAt(off) === 89) {
  return parseFreqValue__alt6(state);
}
  return null;
}

function parseWeekday__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 83 && input.charCodeAt(off + 1) === 85)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Weekday#0", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Weekday#0" };
}

function parseWeekday__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 77 && input.charCodeAt(off + 1) === 79)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Weekday#1", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Weekday#1" };
}

function parseWeekday__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 84 && input.charCodeAt(off + 1) === 85)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Weekday#2", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Weekday#2" };
}

function parseWeekday__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 87 && input.charCodeAt(off + 1) === 69)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Weekday#3", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Weekday#3" };
}

function parseWeekday__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 84 && input.charCodeAt(off + 1) === 72)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Weekday#4", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Weekday#4" };
}

function parseWeekday__alt5(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 70 && input.charCodeAt(off + 1) === 82)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Weekday#5", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Weekday#5" };
}

function parseWeekday__alt6(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 83 && input.charCodeAt(off + 1) === 65)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Weekday#6", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Weekday#6" };
}

function parseWeekday(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 83) {
  if (off + 1 < len && input.charCodeAt(off + 1) === 85) {
    return parseWeekday__alt0(state);
  }
  if (off + 1 < len && input.charCodeAt(off + 1) === 65) {
    return parseWeekday__alt6(state);
  }
  return null;
}
  if (input.charCodeAt(off) === 77) {
  return parseWeekday__alt1(state);
}
  if (input.charCodeAt(off) === 84) {
  if (off + 1 < len && input.charCodeAt(off + 1) === 85) {
    return parseWeekday__alt2(state);
  }
  if (off + 1 < len && input.charCodeAt(off + 1) === 72) {
    return parseWeekday__alt4(state);
  }
  return null;
}
  if (input.charCodeAt(off) === 87) {
  return parseWeekday__alt3(state);
}
  if (input.charCodeAt(off) === 70) {
  return parseWeekday__alt5(state);
}
  return null;
}

function parseNumValue(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __n_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __n_end = off;
  const n = input.slice(__n_start, __n_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "NumValue#0", __ws: __ws, __litPres: __litPres, n: n };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "NumValue#0", n: n };
}

function parsePart__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("BYMONTHDAY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 10;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __days_start = off;
  const days: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __days_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __prevItemEnd = -1;
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
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseNumValue(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__prevItemEnd >= 0 && __days_iws !== null) __days_iws.push(input.slice(__prevItemEnd, __itemStart));
    days.push(__cand);
    __prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (days.length < 1) { state.pos = entryOff; return null; }
  const __days_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Part#0", __ws: __ws, __litPres: __litPres, days_iws: __days_iws, days: days };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#0", days: days };
}

function parsePart__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("BYMONTH", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 7;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __months_start = off;
  const months: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __months_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __prevItemEnd = -1;
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
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseNumValue(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__prevItemEnd >= 0 && __months_iws !== null) __months_iws.push(input.slice(__prevItemEnd, __itemStart));
    months.push(__cand);
    __prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (months.length < 1) { state.pos = entryOff; return null; }
  const __months_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Part#1", __ws: __ws, __litPres: __litPres, months_iws: __months_iws, months: months };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#1", months: months };
}

function parsePart__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("BYMINUTE", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 8;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __minutes_start = off;
  const minutes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __minutes_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __prevItemEnd = -1;
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
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseNumValue(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__prevItemEnd >= 0 && __minutes_iws !== null) __minutes_iws.push(input.slice(__prevItemEnd, __itemStart));
    minutes.push(__cand);
    __prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (minutes.length < 1) { state.pos = entryOff; return null; }
  const __minutes_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Part#2", __ws: __ws, __litPres: __litPres, minutes_iws: __minutes_iws, minutes: minutes };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#2", minutes: minutes };
}

function parsePart__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("BYHOUR", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __hours_start = off;
  const hours: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __hours_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __prevItemEnd = -1;
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
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseNumValue(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__prevItemEnd >= 0 && __hours_iws !== null) __hours_iws.push(input.slice(__prevItemEnd, __itemStart));
    hours.push(__cand);
    __prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (hours.length < 1) { state.pos = entryOff; return null; }
  const __hours_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Part#3", __ws: __ws, __litPres: __litPres, hours_iws: __hours_iws, hours: hours };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#3", hours: hours };
}

function parsePart__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("BYDAY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __days_start = off;
  const days: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __days_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __prevItemEnd = -1;
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
    let __cand: unknown = null;
    const __itemStart = off;
    state.pos = off;
    __cand = parseWeekday(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__prevItemEnd >= 0 && __days_iws !== null) __days_iws.push(input.slice(__prevItemEnd, __itemStart));
    days.push(__cand);
    __prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (days.length < 1) { state.pos = entryOff; return null; }
  const __days_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Part#4", __ws: __ws, __litPres: __litPres, days_iws: __days_iws, days: days };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#4", days: days };
}

function parsePart__alt5(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("FREQ", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  state.pos = off;
  const __value_start = off;
  const value = parseFreqValue(state);
  if (value === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __value_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Part#5", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#5", value: value };
}

function parsePart__alt6(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("COUNT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
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
    const __captures: any = { __production: "Part#6", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#6", value: value };
}

function parsePart__alt7(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("INTERVAL", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 8;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
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
    const __captures: any = { __production: "Part#7", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#7", value: value };
}

function parsePart__alt8(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("UNTIL", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
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
    const __captures: any = { __production: "Part#8", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#8", value: value };
}

function parsePart__alt9(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("WKST", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  state.pos = off;
  const __value_start = off;
  const value = parseWeekday(state);
  if (value === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __value_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Part#9", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Part#9", value: value };
}

function parsePart(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 66) {
  if (off + 2 < len && input.charCodeAt(off + 2) === 77) {
    if (off + 3 < len && input.charCodeAt(off + 3) === 79) {
      if (off + 7 < len && input.charCodeAt(off + 7) === 68) {
        return parsePart__alt0(state);
      }
      if (off + 7 <= len) { return parsePart__alt1(state); }
      return null;
    }
    if (off + 3 < len && input.charCodeAt(off + 3) === 73) {
      return parsePart__alt2(state);
    }
    return null;
  }
  if (off + 2 < len && input.charCodeAt(off + 2) === 72) {
    return parsePart__alt3(state);
  }
  if (off + 2 < len && input.charCodeAt(off + 2) === 68) {
    return parsePart__alt4(state);
  }
  return null;
}
  if (input.charCodeAt(off) === 70) {
  return parsePart__alt5(state);
}
  if (input.charCodeAt(off) === 67) {
  return parsePart__alt6(state);
}
  if (input.charCodeAt(off) === 73) {
  return parsePart__alt7(state);
}
  if (input.charCodeAt(off) === 85) {
  return parsePart__alt8(state);
}
  if (input.charCodeAt(off) === 87) {
  return parsePart__alt9(state);
}
  return null;
}

function parseRule(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  const __parts_start = off;
  const parts: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  const __parts_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __prevItemEnd = -1;
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
    state.pos = off;
    __cand = parsePart(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__prevItemEnd >= 0 && __parts_iws !== null) __parts_iws.push(input.slice(__prevItemEnd, __itemStart));
    parts.push(__cand);
    __prevItemEnd = off;
    if (off === __loopStart) break;
  }
  if (parts.length < 1) { state.pos = entryOff; return null; }
  const __parts_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Rule#0", __ws: __ws, __litPres: __litPres, parts_iws: __parts_iws, parts: parts };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Rule#0", parts: parts };
}

const __defaultTarget: string | undefined = "ast";

function __build_FreqValue_0_ast(captures: any, __indentCol: number = 0): any {
  return "SECONDLY";
}

function __build_FreqValue_0_source(captures: any, __indentCol: number = 0): any {
  return String("SECONDLY");
}

function __build_FreqValue_1_ast(captures: any, __indentCol: number = 0): any {
  return "MINUTELY";
}

function __build_FreqValue_1_source(captures: any, __indentCol: number = 0): any {
  return String("MINUTELY");
}

function __build_FreqValue_2_ast(captures: any, __indentCol: number = 0): any {
  return "HOURLY";
}

function __build_FreqValue_2_source(captures: any, __indentCol: number = 0): any {
  return String("HOURLY");
}

function __build_FreqValue_3_ast(captures: any, __indentCol: number = 0): any {
  return "DAILY";
}

function __build_FreqValue_3_source(captures: any, __indentCol: number = 0): any {
  return String("DAILY");
}

function __build_FreqValue_4_ast(captures: any, __indentCol: number = 0): any {
  return "WEEKLY";
}

function __build_FreqValue_4_source(captures: any, __indentCol: number = 0): any {
  return String("WEEKLY");
}

function __build_FreqValue_5_ast(captures: any, __indentCol: number = 0): any {
  return "MONTHLY";
}

function __build_FreqValue_5_source(captures: any, __indentCol: number = 0): any {
  return String("MONTHLY");
}

function __build_FreqValue_6_ast(captures: any, __indentCol: number = 0): any {
  return "YEARLY";
}

function __build_FreqValue_6_source(captures: any, __indentCol: number = 0): any {
  return String("YEARLY");
}

function __build_Weekday_0_ast(captures: any, __indentCol: number = 0): any {
  return "SU";
}

function __build_Weekday_0_source(captures: any, __indentCol: number = 0): any {
  return String("SU");
}

function __build_Weekday_1_ast(captures: any, __indentCol: number = 0): any {
  return "MO";
}

function __build_Weekday_1_source(captures: any, __indentCol: number = 0): any {
  return String("MO");
}

function __build_Weekday_2_ast(captures: any, __indentCol: number = 0): any {
  return "TU";
}

function __build_Weekday_2_source(captures: any, __indentCol: number = 0): any {
  return String("TU");
}

function __build_Weekday_3_ast(captures: any, __indentCol: number = 0): any {
  return "WE";
}

function __build_Weekday_3_source(captures: any, __indentCol: number = 0): any {
  return String("WE");
}

function __build_Weekday_4_ast(captures: any, __indentCol: number = 0): any {
  return "TH";
}

function __build_Weekday_4_source(captures: any, __indentCol: number = 0): any {
  return String("TH");
}

function __build_Weekday_5_ast(captures: any, __indentCol: number = 0): any {
  return "FR";
}

function __build_Weekday_5_source(captures: any, __indentCol: number = 0): any {
  return String("FR");
}

function __build_Weekday_6_ast(captures: any, __indentCol: number = 0): any {
  return "SA";
}

function __build_Weekday_6_source(captures: any, __indentCol: number = 0): any {
  return String("SA");
}

function __build_NumValue_0_ast(captures: any, __indentCol: number = 0): any {
  return __renderSlot_ast(captures.n, __indentCol);
}

function __build_NumValue_0_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.n, __indentCol) ?? ""));
}

function __build_Part_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "bymonthday", days: __renderSlot_ast(captures.days, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, days_iws: captures.days_iws } }) : { type: "bymonthday", days: __renderSlot_ast(captures.days, __indentCol) });
}

function __build_Part_0_source(captures: any, __indentCol: number = 0): any {
  return "BYMONTHDAY=" + (Array.isArray(captures.days) ? captures.days.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.days, __indentCol) ?? ""));
}

function __build_Part_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "bymonth", months: __renderSlot_ast(captures.months, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, months_iws: captures.months_iws } }) : { type: "bymonth", months: __renderSlot_ast(captures.months, __indentCol) });
}

function __build_Part_1_source(captures: any, __indentCol: number = 0): any {
  return "BYMONTH=" + (Array.isArray(captures.months) ? captures.months.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.months, __indentCol) ?? ""));
}

function __build_Part_2_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "byminute", minutes: __renderSlot_ast(captures.minutes, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, minutes_iws: captures.minutes_iws } }) : { type: "byminute", minutes: __renderSlot_ast(captures.minutes, __indentCol) });
}

function __build_Part_2_source(captures: any, __indentCol: number = 0): any {
  return "BYMINUTE=" + (Array.isArray(captures.minutes) ? captures.minutes.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.minutes, __indentCol) ?? ""));
}

function __build_Part_3_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "byhour", hours: __renderSlot_ast(captures.hours, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, hours_iws: captures.hours_iws } }) : { type: "byhour", hours: __renderSlot_ast(captures.hours, __indentCol) });
}

function __build_Part_3_source(captures: any, __indentCol: number = 0): any {
  return "BYHOUR=" + (Array.isArray(captures.hours) ? captures.hours.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.hours, __indentCol) ?? ""));
}

function __build_Part_4_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "byday", days: __renderSlot_ast(captures.days, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, days_iws: captures.days_iws } }) : { type: "byday", days: __renderSlot_ast(captures.days, __indentCol) });
}

function __build_Part_4_source(captures: any, __indentCol: number = 0): any {
  return "BYDAY=" + (Array.isArray(captures.days) ? captures.days.map((c: any) => __renderSlot_source(c, __indentCol)).join(",") : (__renderSlot_source(captures.days, __indentCol) ?? ""));
}

function __build_Part_5_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "freq", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "freq", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_Part_5_source(captures: any, __indentCol: number = 0): any {
  return "FREQ=" + (__renderSlot_source(captures.value, __indentCol) ?? "");
}

function __build_Part_6_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "count", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "count", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_Part_6_source(captures: any, __indentCol: number = 0): any {
  return "COUNT=" + (__renderSlot_source(captures.value, __indentCol) ?? "");
}

function __build_Part_7_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "interval", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "interval", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_Part_7_source(captures: any, __indentCol: number = 0): any {
  return "INTERVAL=" + (__renderSlot_source(captures.value, __indentCol) ?? "");
}

function __build_Part_8_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "until", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "until", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_Part_8_source(captures: any, __indentCol: number = 0): any {
  return "UNTIL=" + (__renderSlot_source(captures.value, __indentCol) ?? "");
}

function __build_Part_9_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "wkst", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "wkst", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_Part_9_source(captures: any, __indentCol: number = 0): any {
  return "WKST=" + (__renderSlot_source(captures.value, __indentCol) ?? "");
}

function __build_Rule_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "rule", parts: __renderSlot_ast(captures.parts, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, parts_iws: captures.parts_iws } }) : { type: "rule", parts: __renderSlot_ast(captures.parts, __indentCol) });
}

function __build_Rule_0_source(captures: any, __indentCol: number = 0): any {
  return String((Array.isArray(captures.parts) ? captures.parts.map((c: any) => __renderSlot_source(c, __indentCol)).join(";") : (__renderSlot_source(captures.parts, __indentCol) ?? "")));
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "FreqValue#0": return __build_FreqValue_0_ast(captures, __indentCol);
    case "FreqValue#1": return __build_FreqValue_1_ast(captures, __indentCol);
    case "FreqValue#2": return __build_FreqValue_2_ast(captures, __indentCol);
    case "FreqValue#3": return __build_FreqValue_3_ast(captures, __indentCol);
    case "FreqValue#4": return __build_FreqValue_4_ast(captures, __indentCol);
    case "FreqValue#5": return __build_FreqValue_5_ast(captures, __indentCol);
    case "FreqValue#6": return __build_FreqValue_6_ast(captures, __indentCol);
    case "Weekday#0": return __build_Weekday_0_ast(captures, __indentCol);
    case "Weekday#1": return __build_Weekday_1_ast(captures, __indentCol);
    case "Weekday#2": return __build_Weekday_2_ast(captures, __indentCol);
    case "Weekday#3": return __build_Weekday_3_ast(captures, __indentCol);
    case "Weekday#4": return __build_Weekday_4_ast(captures, __indentCol);
    case "Weekday#5": return __build_Weekday_5_ast(captures, __indentCol);
    case "Weekday#6": return __build_Weekday_6_ast(captures, __indentCol);
    case "NumValue#0": return __build_NumValue_0_ast(captures, __indentCol);
    case "Part#0": return __build_Part_0_ast(captures, __indentCol);
    case "Part#1": return __build_Part_1_ast(captures, __indentCol);
    case "Part#2": return __build_Part_2_ast(captures, __indentCol);
    case "Part#3": return __build_Part_3_ast(captures, __indentCol);
    case "Part#4": return __build_Part_4_ast(captures, __indentCol);
    case "Part#5": return __build_Part_5_ast(captures, __indentCol);
    case "Part#6": return __build_Part_6_ast(captures, __indentCol);
    case "Part#7": return __build_Part_7_ast(captures, __indentCol);
    case "Part#8": return __build_Part_8_ast(captures, __indentCol);
    case "Part#9": return __build_Part_9_ast(captures, __indentCol);
    case "Rule#0": return __build_Rule_0_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "FreqValue#0": return __build_FreqValue_0_source(captures, __indentCol);
    case "FreqValue#1": return __build_FreqValue_1_source(captures, __indentCol);
    case "FreqValue#2": return __build_FreqValue_2_source(captures, __indentCol);
    case "FreqValue#3": return __build_FreqValue_3_source(captures, __indentCol);
    case "FreqValue#4": return __build_FreqValue_4_source(captures, __indentCol);
    case "FreqValue#5": return __build_FreqValue_5_source(captures, __indentCol);
    case "FreqValue#6": return __build_FreqValue_6_source(captures, __indentCol);
    case "Weekday#0": return __build_Weekday_0_source(captures, __indentCol);
    case "Weekday#1": return __build_Weekday_1_source(captures, __indentCol);
    case "Weekday#2": return __build_Weekday_2_source(captures, __indentCol);
    case "Weekday#3": return __build_Weekday_3_source(captures, __indentCol);
    case "Weekday#4": return __build_Weekday_4_source(captures, __indentCol);
    case "Weekday#5": return __build_Weekday_5_source(captures, __indentCol);
    case "Weekday#6": return __build_Weekday_6_source(captures, __indentCol);
    case "NumValue#0": return __build_NumValue_0_source(captures, __indentCol);
    case "Part#0": return __build_Part_0_source(captures, __indentCol);
    case "Part#1": return __build_Part_1_source(captures, __indentCol);
    case "Part#2": return __build_Part_2_source(captures, __indentCol);
    case "Part#3": return __build_Part_3_source(captures, __indentCol);
    case "Part#4": return __build_Part_4_source(captures, __indentCol);
    case "Part#5": return __build_Part_5_source(captures, __indentCol);
    case "Part#6": return __build_Part_6_source(captures, __indentCol);
    case "Part#7": return __build_Part_7_source(captures, __indentCol);
    case "Part#8": return __build_Part_8_source(captures, __indentCol);
    case "Part#9": return __build_Part_9_source(captures, __indentCol);
    case "Rule#0": return __build_Rule_0_source(captures, __indentCol);
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

export function render(input: string, options: { target: "ast"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Rule_ast;
export function render(input: string, options: { target: "source"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Rule_source;
export function render(input: string, options?: { target?: undefined; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): Rule_ast;
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

function __rebuild_FreqValue_0(captures: any): string {
  return "SECONDLY";
}

function __rebuild_FreqValue_1(captures: any): string {
  return "MINUTELY";
}

function __rebuild_FreqValue_2(captures: any): string {
  return "HOURLY";
}

function __rebuild_FreqValue_3(captures: any): string {
  return "DAILY";
}

function __rebuild_FreqValue_4(captures: any): string {
  return "WEEKLY";
}

function __rebuild_FreqValue_5(captures: any): string {
  return "MONTHLY";
}

function __rebuild_FreqValue_6(captures: any): string {
  return "YEARLY";
}

function __rebuild_Weekday_0(captures: any): string {
  return "SU";
}

function __rebuild_Weekday_1(captures: any): string {
  return "MO";
}

function __rebuild_Weekday_2(captures: any): string {
  return "TU";
}

function __rebuild_Weekday_3(captures: any): string {
  return "WE";
}

function __rebuild_Weekday_4(captures: any): string {
  return "TH";
}

function __rebuild_Weekday_5(captures: any): string {
  return "FR";
}

function __rebuild_Weekday_6(captures: any): string {
  return "SA";
}

function __rebuild_NumValue_0(captures: any): string {
  return String(__rebuildSlot(captures.n));
}

function __rebuild_Part_0(captures: any): string {
  return "BYMONTHDAY" + "=" + __rebuildSlotIws(captures.days, captures.days_iws, ",");
}

function __rebuild_Part_1(captures: any): string {
  return "BYMONTH" + "=" + __rebuildSlotIws(captures.months, captures.months_iws, ",");
}

function __rebuild_Part_2(captures: any): string {
  return "BYMINUTE" + "=" + __rebuildSlotIws(captures.minutes, captures.minutes_iws, ",");
}

function __rebuild_Part_3(captures: any): string {
  return "BYHOUR" + "=" + __rebuildSlotIws(captures.hours, captures.hours_iws, ",");
}

function __rebuild_Part_4(captures: any): string {
  return "BYDAY" + "=" + __rebuildSlotIws(captures.days, captures.days_iws, ",");
}

function __rebuild_Part_5(captures: any): string {
  return "FREQ" + "=" + __rebuildSlot(captures.value);
}

function __rebuild_Part_6(captures: any): string {
  return "COUNT" + "=" + __rebuildSlot(captures.value);
}

function __rebuild_Part_7(captures: any): string {
  return "INTERVAL" + "=" + __rebuildSlot(captures.value);
}

function __rebuild_Part_8(captures: any): string {
  return "UNTIL" + "=" + __rebuildSlot(captures.value);
}

function __rebuild_Part_9(captures: any): string {
  return "WKST" + "=" + __rebuildSlot(captures.value);
}

function __rebuild_Rule_0(captures: any): string {
  return String(__rebuildSlotIws(captures.parts, captures.parts_iws, ";"));
}

function __invert_FreqValue_0_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "SECONDLY")) {
    throw new Error("stringify: expected scalar \"SECONDLY\", got " + JSON.stringify(value));
  }
  return "SECONDLY";
}

function __invert_FreqValue_1_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "MINUTELY")) {
    throw new Error("stringify: expected scalar \"MINUTELY\", got " + JSON.stringify(value));
  }
  return "MINUTELY";
}

function __invert_FreqValue_2_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "HOURLY")) {
    throw new Error("stringify: expected scalar \"HOURLY\", got " + JSON.stringify(value));
  }
  return "HOURLY";
}

function __invert_FreqValue_3_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "DAILY")) {
    throw new Error("stringify: expected scalar \"DAILY\", got " + JSON.stringify(value));
  }
  return "DAILY";
}

function __invert_FreqValue_4_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "WEEKLY")) {
    throw new Error("stringify: expected scalar \"WEEKLY\", got " + JSON.stringify(value));
  }
  return "WEEKLY";
}

function __invert_FreqValue_5_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "MONTHLY")) {
    throw new Error("stringify: expected scalar \"MONTHLY\", got " + JSON.stringify(value));
  }
  return "MONTHLY";
}

function __invert_FreqValue_6_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "YEARLY")) {
    throw new Error("stringify: expected scalar \"YEARLY\", got " + JSON.stringify(value));
  }
  return "YEARLY";
}

function __invert_Weekday_0_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "SU")) {
    throw new Error("stringify: expected scalar \"SU\", got " + JSON.stringify(value));
  }
  return "SU";
}

function __invert_Weekday_1_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "MO")) {
    throw new Error("stringify: expected scalar \"MO\", got " + JSON.stringify(value));
  }
  return "MO";
}

function __invert_Weekday_2_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "TU")) {
    throw new Error("stringify: expected scalar \"TU\", got " + JSON.stringify(value));
  }
  return "TU";
}

function __invert_Weekday_3_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "WE")) {
    throw new Error("stringify: expected scalar \"WE\", got " + JSON.stringify(value));
  }
  return "WE";
}

function __invert_Weekday_4_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "TH")) {
    throw new Error("stringify: expected scalar \"TH\", got " + JSON.stringify(value));
  }
  return "TH";
}

function __invert_Weekday_5_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "FR")) {
    throw new Error("stringify: expected scalar \"FR\", got " + JSON.stringify(value));
  }
  return "FR";
}

function __invert_Weekday_6_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "SA")) {
    throw new Error("stringify: expected scalar \"SA\", got " + JSON.stringify(value));
  }
  return "SA";
}

function __invert_NumValue_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  captures.n = __invertSlotLeaf_ast(value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_NumValue_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.n));
}

function __invert_Part_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "bymonthday")) {
    throw new Error("stringify: field \"type\" expected \"bymonthday\", got " + JSON.stringify(value.type));
  }
  captures.days = ((Array.isArray(value.days) ? value.days : value.days.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_NumValue_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_0(captures, __indentCol);
  }
  return "BYMONTHDAY=" + __rebuildSlotIws(captures.days, captures.days_iws, ",");
}

function __invert_Part_1_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "bymonth")) {
    throw new Error("stringify: field \"type\" expected \"bymonth\", got " + JSON.stringify(value.type));
  }
  captures.months = ((Array.isArray(value.months) ? value.months : value.months.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_NumValue_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_1(captures, __indentCol);
  }
  return "BYMONTH=" + __rebuildSlotIws(captures.months, captures.months_iws, ",");
}

function __invert_Part_2_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "byminute")) {
    throw new Error("stringify: field \"type\" expected \"byminute\", got " + JSON.stringify(value.type));
  }
  captures.minutes = ((Array.isArray(value.minutes) ? value.minutes : value.minutes.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_NumValue_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_2(captures, __indentCol);
  }
  return "BYMINUTE=" + __rebuildSlotIws(captures.minutes, captures.minutes_iws, ",");
}

function __invert_Part_3_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "byhour")) {
    throw new Error("stringify: field \"type\" expected \"byhour\", got " + JSON.stringify(value.type));
  }
  captures.hours = ((Array.isArray(value.hours) ? value.hours : value.hours.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_NumValue_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_3(captures, __indentCol);
  }
  return "BYHOUR=" + __rebuildSlotIws(captures.hours, captures.hours_iws, ",");
}

function __invert_Part_4_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "byday")) {
    throw new Error("stringify: field \"type\" expected \"byday\", got " + JSON.stringify(value.type));
  }
  captures.days = ((Array.isArray(value.days) ? value.days : value.days.split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_Weekday_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_4(captures, __indentCol);
  }
  return "BYDAY=" + __rebuildSlotIws(captures.days, captures.days_iws, ",");
}

function __invert_Part_5_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "freq")) {
    throw new Error("stringify: field \"type\" expected \"freq\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotFor_FreqValue_ast(value.value, __indentCol);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_5(captures, __indentCol);
  }
  return "FREQ=" + __rebuildSlot(captures.value);
}

function __invert_Part_6_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "count")) {
    throw new Error("stringify: field \"type\" expected \"count\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_6(captures, __indentCol);
  }
  return "COUNT=" + __rebuildSlot(captures.value);
}

function __invert_Part_7_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "interval")) {
    throw new Error("stringify: field \"type\" expected \"interval\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_7(captures, __indentCol);
  }
  return "INTERVAL=" + __rebuildSlot(captures.value);
}

function __invert_Part_8_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "until")) {
    throw new Error("stringify: field \"type\" expected \"until\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_8(captures, __indentCol);
  }
  return "UNTIL=" + __rebuildSlot(captures.value);
}

function __invert_Part_9_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "wkst")) {
    throw new Error("stringify: field \"type\" expected \"wkst\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotFor_Weekday_ast(value.value, __indentCol);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_9(captures, __indentCol);
  }
  return "WKST=" + __rebuildSlot(captures.value);
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
  captures.parts = ((Array.isArray(value.parts) ? value.parts : value.parts.split(";").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_Part_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Rule_0(captures, __indentCol);
  }
  return String(__rebuildSlotIws(captures.parts, captures.parts_iws, ";"));
}

function __invert_FreqValue_0_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("SECONDLY", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"SECONDLY\" in template body");
  }
  __pos += 8;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_FreqValue_0(captures, __indentCol);
  }
  return "SECONDLY";
}

function __invert_FreqValue_1_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("MINUTELY", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"MINUTELY\" in template body");
  }
  __pos += 8;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_FreqValue_1(captures, __indentCol);
  }
  return "MINUTELY";
}

function __invert_FreqValue_2_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("HOURLY", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"HOURLY\" in template body");
  }
  __pos += 6;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_FreqValue_2(captures, __indentCol);
  }
  return "HOURLY";
}

function __invert_FreqValue_3_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("DAILY", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"DAILY\" in template body");
  }
  __pos += 5;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_FreqValue_3(captures, __indentCol);
  }
  return "DAILY";
}

function __invert_FreqValue_4_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("WEEKLY", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"WEEKLY\" in template body");
  }
  __pos += 6;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_FreqValue_4(captures, __indentCol);
  }
  return "WEEKLY";
}

function __invert_FreqValue_5_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("MONTHLY", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"MONTHLY\" in template body");
  }
  __pos += 7;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_FreqValue_5(captures, __indentCol);
  }
  return "MONTHLY";
}

function __invert_FreqValue_6_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("YEARLY", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"YEARLY\" in template body");
  }
  __pos += 6;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_FreqValue_6(captures, __indentCol);
  }
  return "YEARLY";
}

function __invert_Weekday_0_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("SU", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"SU\" in template body");
  }
  __pos += 2;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Weekday_0(captures, __indentCol);
  }
  return "SU";
}

function __invert_Weekday_1_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("MO", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"MO\" in template body");
  }
  __pos += 2;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Weekday_1(captures, __indentCol);
  }
  return "MO";
}

function __invert_Weekday_2_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("TU", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"TU\" in template body");
  }
  __pos += 2;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Weekday_2(captures, __indentCol);
  }
  return "TU";
}

function __invert_Weekday_3_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("WE", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"WE\" in template body");
  }
  __pos += 2;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Weekday_3(captures, __indentCol);
  }
  return "WE";
}

function __invert_Weekday_4_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("TH", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"TH\" in template body");
  }
  __pos += 2;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Weekday_4(captures, __indentCol);
  }
  return "TH";
}

function __invert_Weekday_5_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("FR", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"FR\" in template body");
  }
  __pos += 2;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Weekday_5(captures, __indentCol);
  }
  return "FR";
}

function __invert_Weekday_6_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("SA", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"SA\" in template body");
  }
  __pos += 2;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Weekday_6(captures, __indentCol);
  }
  return "SA";
}

function __invert_NumValue_0_source(value: any, __indentCol: number = 0): string {
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
  captures.n = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_NumValue_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.n));
}

function __invert_Part_0_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("BYMONTHDAY=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"BYMONTHDAY=\" in template body");
  }
  __pos += 11;
  captures.days = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : __s.slice(__pos).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_NumValue_source(__e, __indentCol)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_0(captures, __indentCol);
  }
  return "BYMONTHDAY=" + __rebuildSlotIws(captures.days, captures.days_iws, ",");
}

function __invert_Part_1_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("BYMONTH=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"BYMONTH=\" in template body");
  }
  __pos += 8;
  captures.months = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : __s.slice(__pos).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_NumValue_source(__e, __indentCol)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_1(captures, __indentCol);
  }
  return "BYMONTH=" + __rebuildSlotIws(captures.months, captures.months_iws, ",");
}

function __invert_Part_2_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("BYMINUTE=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"BYMINUTE=\" in template body");
  }
  __pos += 9;
  captures.minutes = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : __s.slice(__pos).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_NumValue_source(__e, __indentCol)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_2(captures, __indentCol);
  }
  return "BYMINUTE=" + __rebuildSlotIws(captures.minutes, captures.minutes_iws, ",");
}

function __invert_Part_3_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("BYHOUR=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"BYHOUR=\" in template body");
  }
  __pos += 7;
  captures.hours = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : __s.slice(__pos).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_NumValue_source(__e, __indentCol)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_3(captures, __indentCol);
  }
  return "BYHOUR=" + __rebuildSlotIws(captures.hours, captures.hours_iws, ",");
}

function __invert_Part_4_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("BYDAY=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"BYDAY=\" in template body");
  }
  __pos += 6;
  captures.days = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : __s.slice(__pos).split(",").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_Weekday_source(__e, __indentCol)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_4(captures, __indentCol);
  }
  return "BYDAY=" + __rebuildSlotIws(captures.days, captures.days_iws, ",");
}

function __invert_Part_5_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("FREQ=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"FREQ=\" in template body");
  }
  __pos += 5;
  captures.value = __invertSlotFor_FreqValue_source(__s.slice(__pos), __indentCol);
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_5(captures, __indentCol);
  }
  return "FREQ=" + __rebuildSlot(captures.value);
}

function __invert_Part_6_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("COUNT=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"COUNT=\" in template body");
  }
  __pos += 6;
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_6(captures, __indentCol);
  }
  return "COUNT=" + __rebuildSlot(captures.value);
}

function __invert_Part_7_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("INTERVAL=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"INTERVAL=\" in template body");
  }
  __pos += 9;
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_7(captures, __indentCol);
  }
  return "INTERVAL=" + __rebuildSlot(captures.value);
}

function __invert_Part_8_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("UNTIL=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"UNTIL=\" in template body");
  }
  __pos += 6;
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_8(captures, __indentCol);
  }
  return "UNTIL=" + __rebuildSlot(captures.value);
}

function __invert_Part_9_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("WKST=", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"WKST=\" in template body");
  }
  __pos += 5;
  captures.value = __invertSlotFor_Weekday_source(__s.slice(__pos), __indentCol);
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Part_9(captures, __indentCol);
  }
  return "WKST=" + __rebuildSlot(captures.value);
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
  captures.parts = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : __s.slice(__pos).split(";").map((__s: string) => __s.trim()).filter((__s: string) => __s.length > 0)).map((__e: any) => __dispatchInverse_Part_source(__e, __indentCol)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_Rule_0(captures, __indentCol);
  }
  return String(__rebuildSlotIws(captures.parts, captures.parts_iws, ";"));
}

function __dispatchInverse_FreqValue_ast(value: any, __indentCol: number = 0): string {
  if (Object.is(value, "SECONDLY")) return __invert_FreqValue_0_ast(value, __indentCol);
  if (Object.is(value, "MINUTELY")) return __invert_FreqValue_1_ast(value, __indentCol);
  if (Object.is(value, "HOURLY")) return __invert_FreqValue_2_ast(value, __indentCol);
  if (Object.is(value, "DAILY")) return __invert_FreqValue_3_ast(value, __indentCol);
  if (Object.is(value, "WEEKLY")) return __invert_FreqValue_4_ast(value, __indentCol);
  if (Object.is(value, "MONTHLY")) return __invert_FreqValue_5_ast(value, __indentCol);
  if (Object.is(value, "YEARLY")) return __invert_FreqValue_6_ast(value, __indentCol);
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Weekday_ast(value: any, __indentCol: number = 0): string {
  if (Object.is(value, "SU")) return __invert_Weekday_0_ast(value, __indentCol);
  if (Object.is(value, "MO")) return __invert_Weekday_1_ast(value, __indentCol);
  if (Object.is(value, "TU")) return __invert_Weekday_2_ast(value, __indentCol);
  if (Object.is(value, "WE")) return __invert_Weekday_3_ast(value, __indentCol);
  if (Object.is(value, "TH")) return __invert_Weekday_4_ast(value, __indentCol);
  if (Object.is(value, "FR")) return __invert_Weekday_5_ast(value, __indentCol);
  if (Object.is(value, "SA")) return __invert_Weekday_6_ast(value, __indentCol);
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_NumValue_ast(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    return __invert_NumValue_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Part_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "bymonthday")) return __invert_Part_0_ast(value, __indentCol);
    if (Object.is(value.type, "bymonth")) return __invert_Part_1_ast(value, __indentCol);
    if (Object.is(value.type, "byminute")) return __invert_Part_2_ast(value, __indentCol);
    if (Object.is(value.type, "byhour")) return __invert_Part_3_ast(value, __indentCol);
    if (Object.is(value.type, "byday")) return __invert_Part_4_ast(value, __indentCol);
    if (Object.is(value.type, "freq")) return __invert_Part_5_ast(value, __indentCol);
    if (Object.is(value.type, "count")) return __invert_Part_6_ast(value, __indentCol);
    if (Object.is(value.type, "interval")) return __invert_Part_7_ast(value, __indentCol);
    if (Object.is(value.type, "until")) return __invert_Part_8_ast(value, __indentCol);
    if (Object.is(value.type, "wkst")) return __invert_Part_9_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Rule_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "rule")) return __invert_Rule_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Rule_ast(value, 0);
}

function __dispatchInverse_FreqValue_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("SECONDLY")) return __invert_FreqValue_0_source(value, __indentCol);
    if (value.startsWith("MINUTELY")) return __invert_FreqValue_1_source(value, __indentCol);
    if (value.startsWith("MONTHLY")) return __invert_FreqValue_5_source(value, __indentCol);
    if (value.startsWith("HOURLY")) return __invert_FreqValue_2_source(value, __indentCol);
    if (value.startsWith("WEEKLY")) return __invert_FreqValue_4_source(value, __indentCol);
    if (value.startsWith("YEARLY")) return __invert_FreqValue_6_source(value, __indentCol);
    if (value.startsWith("DAILY")) return __invert_FreqValue_3_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Weekday_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("SU")) return __invert_Weekday_0_source(value, __indentCol);
    if (value.startsWith("MO")) return __invert_Weekday_1_source(value, __indentCol);
    if (value.startsWith("TU")) return __invert_Weekday_2_source(value, __indentCol);
    if (value.startsWith("WE")) return __invert_Weekday_3_source(value, __indentCol);
    if (value.startsWith("TH")) return __invert_Weekday_4_source(value, __indentCol);
    if (value.startsWith("FR")) return __invert_Weekday_5_source(value, __indentCol);
    if (value.startsWith("SA")) return __invert_Weekday_6_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_NumValue_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_NumValue_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Part_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("BYMONTHDAY=")) return __invert_Part_0_source(value, __indentCol);
    if (value.startsWith("BYMINUTE=")) return __invert_Part_2_source(value, __indentCol);
    if (value.startsWith("INTERVAL=")) return __invert_Part_7_source(value, __indentCol);
    if (value.startsWith("BYMONTH=")) return __invert_Part_1_source(value, __indentCol);
    if (value.startsWith("BYHOUR=")) return __invert_Part_3_source(value, __indentCol);
    if (value.startsWith("BYDAY=")) return __invert_Part_4_source(value, __indentCol);
    if (value.startsWith("COUNT=")) return __invert_Part_6_source(value, __indentCol);
    if (value.startsWith("UNTIL=")) return __invert_Part_8_source(value, __indentCol);
    if (value.startsWith("FREQ=")) return __invert_Part_5_source(value, __indentCol);
    if (value.startsWith("WKST=")) return __invert_Part_9_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Rule_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_Rule_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Rule_source(value, 0);
}

function __invertSlotFor_FreqValue_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_FreqValue_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_FreqValue_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_FreqValue_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_FreqValue_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_FreqValue_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_FreqValue_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Weekday_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Weekday_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Weekday_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Weekday_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Weekday_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Weekday_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Weekday_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_NumValue_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_NumValue_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_NumValue_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_NumValue_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_NumValue_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_NumValue_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_NumValue_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Part_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Part_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Part_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_Part_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Part_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Part_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Part_ast(v, __indentCol); } catch (_e) { return String(v); }
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

function __invertSlotFor_FreqValue_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_FreqValue_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_FreqValue_source(v[i], __indentCol);
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
    try { return __dispatchInverse_FreqValue_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_FreqValue_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_FreqValue_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_FreqValue_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Weekday_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Weekday_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Weekday_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Weekday_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Weekday_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Weekday_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Weekday_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_NumValue_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_NumValue_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_NumValue_source(v[i], __indentCol);
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
    try { return __dispatchInverse_NumValue_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_NumValue_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_NumValue_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_NumValue_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_Part_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_Part_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_Part_source(v[i], __indentCol);
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
    try { return __dispatchInverse_Part_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_Part_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_Part_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_Part_source(v, __indentCol); } catch (_e) { return String(v); }
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

export function stringify(value: Rule_ast, options: { target: "ast" }): string;
export function stringify(value: Rule_source, options: { target: "source" }): string;
export function stringify(value: Rule_ast, options?: { target?: undefined }): string;
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

function __fusedRender_FreqValue_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("SECONDLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 8;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("SECONDLY");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_FreqValue_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("MINUTELY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 8;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("MINUTELY");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_FreqValue_2_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("HOURLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("HOURLY");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_FreqValue_3_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("DAILY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("DAILY");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_FreqValue_4_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("WEEKLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("WEEKLY");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_FreqValue_5_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("MONTHLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 7;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("MONTHLY");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_FreqValue_6_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("YEARLY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("YEARLY");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Weekday_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 83 && input.charCodeAt(off + 1) === 85)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("SU");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Weekday_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 77 && input.charCodeAt(off + 1) === 79)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("MO");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Weekday_2_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 84 && input.charCodeAt(off + 1) === 85)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("TU");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Weekday_3_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 87 && input.charCodeAt(off + 1) === 69)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("WE");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Weekday_4_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 84 && input.charCodeAt(off + 1) === 72)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("TH");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Weekday_5_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 70 && input.charCodeAt(off + 1) === 82)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("FR");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Weekday_6_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 83 && input.charCodeAt(off + 1) === 65)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("SA");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_NumValue_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __n_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __n_end = off;
    const n = input.slice(__n_start, __n_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(n ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("BYMONTHDAY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 10;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_days: string[] = [];
    let __slotMatched_days = false;
    // recursive repeats span (NumValue) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_days.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_days.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 43) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 48) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 49) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 50) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 51) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 52) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 53) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 54) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 55) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 56) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 57) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_days.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_days = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("BYMONTHDAY=");
    for (let __i = 0; __i < __slotBuf_days.length; __i++) out.push(__slotBuf_days[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("BYMONTH", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 7;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_months: string[] = [];
    let __slotMatched_months = false;
    // recursive repeats span (NumValue) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_months.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_months.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 43) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 48) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 49) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 50) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 51) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 52) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 53) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 54) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 55) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 56) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 57) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_months.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_months)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_months.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_months = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("BYMONTH=");
    for (let __i = 0; __i < __slotBuf_months.length; __i++) out.push(__slotBuf_months[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_2_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("BYMINUTE", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 8;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_minutes: string[] = [];
    let __slotMatched_minutes = false;
    // recursive repeats span (NumValue) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_minutes.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_minutes.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 43) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 48) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 49) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 50) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 51) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 52) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 53) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 54) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 55) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 56) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 57) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_minutes.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_minutes)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_minutes.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_minutes = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("BYMINUTE=");
    for (let __i = 0; __i < __slotBuf_minutes.length; __i++) out.push(__slotBuf_minutes[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_3_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("BYHOUR", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_hours: string[] = [];
    let __slotMatched_hours = false;
    // recursive repeats span (NumValue) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_hours.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_hours.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 43) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 48) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 49) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 50) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 51) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 52) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 53) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 54) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 55) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 56) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 57) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_hours.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_NumValue_0_source(state, __slotBuf_hours)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_hours.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_hours = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("BYHOUR=");
    for (let __i = 0; __i < __slotBuf_hours.length; __i++) out.push(__slotBuf_hours[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_4_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("BYDAY", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_days: string[] = [];
    let __slotMatched_days = false;
    // recursive repeats span (Weekday) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 44) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_days.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_days.push(",");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Weekday_5_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 77) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Weekday_1_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 83) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Weekday_0_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Weekday_6_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 84) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Weekday_2_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Weekday_4_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_days.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Weekday_3_source(state, __slotBuf_days)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_days.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_days = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("BYDAY=");
    for (let __i = 0; __i < __slotBuf_days.length; __i++) out.push(__slotBuf_days[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_5_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("FREQ", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_value: string[] = [];
    let __slotMatched_value = false;
    // recursive span (FreqValue) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 68) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_FreqValue_3_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_FreqValue_2_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_FreqValue_1_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_FreqValue_5_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_FreqValue_0_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_FreqValue_4_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_FreqValue_6_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_value) __slotBuf_value.length = 0;
      if (!__slotMatched_value) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("FREQ=");
    for (let __i = 0; __i < __slotBuf_value.length; __i++) out.push(__slotBuf_value[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_6_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("COUNT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
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
    out.push("COUNT=");
    out.push(String(value ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_7_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("INTERVAL", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 8;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
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
    out.push("INTERVAL=");
    out.push(String(value ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_8_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("UNTIL", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
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
    out.push("UNTIL=");
    out.push(String(value ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Part_9_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("WKST", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_value: string[] = [];
    let __slotMatched_value = false;
    // recursive span (Weekday) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 70) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_Weekday_5_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_Weekday_1_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_Weekday_0_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_Weekday_6_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_Weekday_2_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_Weekday_4_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_value) {
            state.pos = __offBefore;
            __slotBuf_value.length = 0;
            if (__fusedRender_Weekday_3_source(state, __slotBuf_value)) { __slotMatched_value = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_value) __slotBuf_value.length = 0;
      if (!__slotMatched_value) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("WKST=");
    for (let __i = 0; __i < __slotBuf_value.length; __i++) out.push(__slotBuf_value[__i]);
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
    const __slotBuf_parts: string[] = [];
    let __slotMatched_parts = false;
    // recursive repeats span (Part) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 59) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_parts.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_parts.push(";");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 66) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_0_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_2_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_1_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_3_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_4_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 67) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_6_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_5_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 73) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_7_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 85) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_8_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_parts.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Part_9_source(state, __slotBuf_parts)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_parts.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_parts = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    for (let __i = 0; __i < __slotBuf_parts.length; __i++) out.push(__slotBuf_parts[__i]);
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "FreqValue#0": __fusedRender_FreqValue_0_source,
  "FreqValue#1": __fusedRender_FreqValue_1_source,
  "FreqValue#2": __fusedRender_FreqValue_2_source,
  "FreqValue#3": __fusedRender_FreqValue_3_source,
  "FreqValue#4": __fusedRender_FreqValue_4_source,
  "FreqValue#5": __fusedRender_FreqValue_5_source,
  "FreqValue#6": __fusedRender_FreqValue_6_source,
  "Weekday#0": __fusedRender_Weekday_0_source,
  "Weekday#1": __fusedRender_Weekday_1_source,
  "Weekday#2": __fusedRender_Weekday_2_source,
  "Weekday#3": __fusedRender_Weekday_3_source,
  "Weekday#4": __fusedRender_Weekday_4_source,
  "Weekday#5": __fusedRender_Weekday_5_source,
  "Weekday#6": __fusedRender_Weekday_6_source,
  "NumValue#0": __fusedRender_NumValue_0_source,
  "Part#0": __fusedRender_Part_0_source,
  "Part#1": __fusedRender_Part_1_source,
  "Part#2": __fusedRender_Part_2_source,
  "Part#3": __fusedRender_Part_3_source,
  "Part#4": __fusedRender_Part_4_source,
  "Part#5": __fusedRender_Part_5_source,
  "Part#6": __fusedRender_Part_6_source,
  "Part#7": __fusedRender_Part_7_source,
  "Part#8": __fusedRender_Part_8_source,
  "Part#9": __fusedRender_Part_9_source,
  "Rule#0": __fusedRender_Rule_0_source,
};

function __fusedRenderStructured_Part_6_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("COUNT", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
  return { type: "count", value: value };
}

function __fusedRenderStructured_Part_7_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("INTERVAL", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 8;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
  return { type: "interval", value: value };
}

function __fusedRenderStructured_Part_8_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("UNTIL", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
  return { type: "until", value: value };
}

const __fusedRenderStructuredTable_ast: Record<string, (state: State) => unknown> = {
  "Part#6": __fusedRenderStructured_Part_6_ast,
  "Part#7": __fusedRenderStructured_Part_7_ast,
  "Part#8": __fusedRenderStructured_Part_8_ast,
};

const __rootProductionKey: string = "Rule#0";

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
  
  const result = parseRule(state);
  
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
  const __result = parseRule(__state);
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
  module: "@parser2/rrule",
  exportName: 'validate',
};
