// Auto-generated from packages/yaml-block/src/schema.ts
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
export type YamlScalar_ast = string;
export type YamlScalar_source = string;
export type YamlMappingEntry_ast = { type: "entry"; key: string; value: YamlMapping_ast | YamlSequence_ast | YamlScalar_ast };
export type YamlMappingEntry_source = string;
export type YamlMapping_ast = { type: "mapping"; entries: YamlMappingEntry_ast[] };
export type YamlMapping_source = string;
export type YamlSequenceItem_ast = { type: "item"; value: YamlMapping_ast | YamlSequence_ast | YamlScalar_ast };
export type YamlSequenceItem_source = string;
export type YamlSequence_ast = { type: "sequence"; items: YamlSequenceItem_ast[] };
export type YamlSequence_source = string;
export type YamlNode_ast = YamlMapping_ast | YamlSequence_ast | YamlScalar_ast;
export type YamlNode_source = string;
export type YamlBlock_ast = YamlNode_ast;
export type YamlBlock_source = string;

function parseYamlScalar(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  let value: string = '';
  let __value_start = off;
  let __value_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __value_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && (__c === 10)) break;
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
      off++;
    }
    const __emptyAnchor = __value_start;
    if (__lastNonWs === __value_start) {
      off = __emptyAnchor;
      value = '';
    } else {
      off = __lastNonWs;
      value = input.slice(__value_start, __lastNonWs);
    }
    __value_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "YamlScalar#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "YamlScalar#0", value: value };
}

function parseYamlMappingEntry(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __key_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __key_end = off;
  const key = input.slice(__key_start, __key_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  const __litPre_2 = off;
  if (input.charCodeAt(off) === 32) { off += 1; }
  if (__litPres !== null) __litPres.push(off > __litPre_2);
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  state.pos = off;
  const __value_start = off;
  let value: unknown = null;
  {
    let __r: unknown = null;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      __r = parseYamlMapping(state);
      if (__r === null) { __r = parseYamlSequence(state); }
      if (__r === null) { __r = parseYamlScalar(state); }
    }
    value = __r;
  }
  if (value === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __value_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "YamlMappingEntry#0", __ws: __ws, __litPres: __litPres, key: key, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "YamlMappingEntry#0", key: key, value: value };
}

function parseYamlMapping(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  const __entries_start = off;
  const entries: unknown[] = [];
  state.pos = off;
  skipBlankLines(state);
  skipHorizontalWs(state);
  off = state.pos;
  const __indentCol = columnAt(state, off);
  const __parentCol = state.indentStackTop > 0 ? state.indentStack[state.indentStackTop - 1] : -1;
  let __indentPushed = false;
  if (__indentCol > __parentCol) {
    if (state.indentStackTop >= 16) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    state.indentStack[state.indentStackTop++] = __indentCol;
    __indentPushed = true;
  }
  while (true) {
    const __loopStart = off;
    if (__indentPushed) {
      state.pos = off;
      skipBlankLines(state);
      skipHorizontalWs(state);
      off = state.pos;
      if (off >= len) break;
      const __col = columnAt(state, off);
      if (__col !== __indentCol) break;
    }
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseYamlMappingEntry(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    entries.push(__cand);
    if (off === __loopStart) break;
  }
  if (__indentPushed) state.indentStackTop--;
  if (entries.length < 1) { state.pos = entryOff; return null; }
  const __entries_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "YamlMapping#0", __ws: __ws, __litPres: __litPres, entries: entries };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "YamlMapping#0", entries: entries };
}

function parseYamlSequenceItem(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 45 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  state.pos = off;
  const __value_start = off;
  let value: unknown = null;
  {
    let __r: unknown = null;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      __r = parseYamlMapping(state);
      if (__r === null) { __r = parseYamlSequence(state); }
      if (__r === null) { __r = parseYamlScalar(state); }
    }
    value = __r;
  }
  if (value === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __value_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "YamlSequenceItem#0", __ws: __ws, __litPres: __litPres, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "YamlSequenceItem#0", value: value };
}

function parseYamlSequence(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  const __items_start = off;
  const items: unknown[] = [];
  state.pos = off;
  skipBlankLines(state);
  skipHorizontalWs(state);
  off = state.pos;
  const __indentCol = columnAt(state, off);
  const __parentCol = state.indentStackTop > 0 ? state.indentStack[state.indentStackTop - 1] : -1;
  let __indentPushed = false;
  if (__indentCol > __parentCol) {
    if (state.indentStackTop >= 16) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    state.indentStack[state.indentStackTop++] = __indentCol;
    __indentPushed = true;
  }
  while (true) {
    const __loopStart = off;
    if (__indentPushed) {
      state.pos = off;
      skipBlankLines(state);
      skipHorizontalWs(state);
      off = state.pos;
      if (off >= len) break;
      const __col = columnAt(state, off);
      if (__col !== __indentCol) break;
    }
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseYamlSequenceItem(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    items.push(__cand);
    if (off === __loopStart) break;
  }
  if (__indentPushed) state.indentStackTop--;
  if (items.length < 1) { state.pos = entryOff; return null; }
  const __items_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "YamlSequence#0", __ws: __ws, __litPres: __litPres, items: items };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "YamlSequence#0", items: items };
}

function parseYamlNode(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  state.pos = off;
  const __node_start = off;
  let node: unknown = null;
  {
    let __r: unknown = null;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      __r = parseYamlMapping(state);
      if (__r === null) { __r = parseYamlSequence(state); }
      if (__r === null) { __r = parseYamlScalar(state); }
    }
    node = __r;
  }
  if (node === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __node_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "YamlNode#0", __ws: __ws, __litPres: __litPres, node: node };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "YamlNode#0", node: node };
}

function parseYamlBlock(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  state.pos = off;
  const __root_start = off;
  const root = parseYamlNode(state);
  if (root === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __root_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "YamlBlock#0", __ws: __ws, __litPres: __litPres, root: root };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "YamlBlock#0", root: root };
}

const __defaultTarget: string | undefined = undefined;

function __build_YamlScalar_0_ast(captures: any, __indentCol: number = 0): any {
  return __renderSlot_ast(captures.value, __indentCol);
}

function __build_YamlScalar_0_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.value, __indentCol) ?? ""));
}

function __build_YamlMappingEntry_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "entry", key: __renderSlot_ast(captures.key, __indentCol), value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "entry", key: __renderSlot_ast(captures.key, __indentCol), value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_YamlMappingEntry_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.key, __indentCol) ?? "") + ": " + (__renderSlot_source(captures.value, __indentCol) ?? "");
}

function __build_YamlMapping_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "mapping", entries: __renderSlot_ast(captures.entries, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "mapping", entries: __renderSlot_ast(captures.entries, __indentCol) });
}

function __build_YamlMapping_0_source(captures: any, __indentCol: number = 0): any {
  return String((Array.isArray(captures.entries) ? (__indentCol > 0 ? "\n" + " ".repeat(__indentCol) : "") + captures.entries.map((c: any) => __renderSlot_source(c, (__indentCol + 2))).join(("\n" + " ".repeat(__indentCol))) : (__renderSlot_source(captures.entries, (__indentCol + 2)) ?? "")));
}

function __build_YamlSequenceItem_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "item", value: __renderSlot_ast(captures.value, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "item", value: __renderSlot_ast(captures.value, __indentCol) });
}

function __build_YamlSequenceItem_0_source(captures: any, __indentCol: number = 0): any {
  return "- " + (__renderSlot_source(captures.value, __indentCol) ?? "");
}

function __build_YamlSequence_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "sequence", items: __renderSlot_ast(captures.items, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "sequence", items: __renderSlot_ast(captures.items, __indentCol) });
}

function __build_YamlSequence_0_source(captures: any, __indentCol: number = 0): any {
  return String((Array.isArray(captures.items) ? (__indentCol > 0 ? "\n" + " ".repeat(__indentCol) : "") + captures.items.map((c: any) => __renderSlot_source(c, (__indentCol + 2))).join(("\n" + " ".repeat(__indentCol))) : (__renderSlot_source(captures.items, (__indentCol + 2)) ?? "")));
}

function __build_YamlNode_0_ast(captures: any, __indentCol: number = 0): any {
  return __renderSlot_ast(captures.node, __indentCol);
}

function __build_YamlNode_0_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.node, __indentCol) ?? ""));
}

function __build_YamlBlock_0_ast(captures: any, __indentCol: number = 0): any {
  return __renderSlot_ast(captures.root, __indentCol);
}

function __build_YamlBlock_0_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.root, __indentCol) ?? ""));
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "YamlScalar#0": return __build_YamlScalar_0_ast(captures, __indentCol);
    case "YamlMappingEntry#0": return __build_YamlMappingEntry_0_ast(captures, __indentCol);
    case "YamlMapping#0": return __build_YamlMapping_0_ast(captures, __indentCol);
    case "YamlSequenceItem#0": return __build_YamlSequenceItem_0_ast(captures, __indentCol);
    case "YamlSequence#0": return __build_YamlSequence_0_ast(captures, __indentCol);
    case "YamlNode#0": return __build_YamlNode_0_ast(captures, __indentCol);
    case "YamlBlock#0": return __build_YamlBlock_0_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "YamlScalar#0": return __build_YamlScalar_0_source(captures, __indentCol);
    case "YamlMappingEntry#0": return __build_YamlMappingEntry_0_source(captures, __indentCol);
    case "YamlMapping#0": return __build_YamlMapping_0_source(captures, __indentCol);
    case "YamlSequenceItem#0": return __build_YamlSequenceItem_0_source(captures, __indentCol);
    case "YamlSequence#0": return __build_YamlSequence_0_source(captures, __indentCol);
    case "YamlNode#0": return __build_YamlNode_0_source(captures, __indentCol);
    case "YamlBlock#0": return __build_YamlBlock_0_source(captures, __indentCol);
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

export function render(input: string, options: { target: "ast"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): YamlBlock_ast;
export function render(input: string, options: { target: "source"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): YamlBlock_source;
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

function __rebuild_YamlScalar_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_YamlMappingEntry_0(captures: any): string {
  return __rebuildSlot(captures.key) + ":" + " " + __rebuildSlot(captures.value);
}

function __rebuild_YamlMapping_0(captures: any, __indentCol: number = 0): string {
  return String(__rebuildSlot(captures.entries, "\n" + " ".repeat(__indentCol), __indentCol > 0));
}

function __rebuild_YamlSequenceItem_0(captures: any): string {
  return "- " + __rebuildSlot(captures.value);
}

function __rebuild_YamlSequence_0(captures: any, __indentCol: number = 0): string {
  return String(__rebuildSlot(captures.items, "\n" + " ".repeat(__indentCol), __indentCol > 0));
}

function __rebuild_YamlNode_0(captures: any): string {
  return String(__rebuildSlot(captures.node));
}

function __rebuild_YamlBlock_0(captures: any): string {
  return String(__rebuildSlot(captures.root));
}

function __invert_YamlScalar_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  captures.value = __invertSlotLeaf_ast(value);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlScalar_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.value));
}

function __invert_YamlMappingEntry_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "entry")) {
    throw new Error("stringify: field \"type\" expected \"entry\", got " + JSON.stringify(value.type));
  }
  captures.key = __invertSlotLeaf_ast(value.key);
  captures.value = __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_ast(value.value, __indentCol);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlMappingEntry_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.key) + ": " + __rebuildSlot(captures.value);
}

function __invert_YamlMapping_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "mapping")) {
    throw new Error("stringify: field \"type\" expected \"mapping\", got " + JSON.stringify(value.type));
  }
  captures.entries = ((Array.isArray(value.entries) ? value.entries : [value.entries]).map((__e: any) => __dispatchInverse_YamlMappingEntry_ast(__e, __indentCol + 2)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlMapping_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.entries, "\n" + " ".repeat(__indentCol), __indentCol > 0));
}

function __invert_YamlSequenceItem_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "item")) {
    throw new Error("stringify: field \"type\" expected \"item\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_ast(value.value, __indentCol);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlSequenceItem_0(captures, __indentCol);
  }
  return "- " + __rebuildSlot(captures.value);
}

function __invert_YamlSequence_0_ast(value: any, __indentCol: number = 0): string {
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
  if (!Object.is(value.type, "sequence")) {
    throw new Error("stringify: field \"type\" expected \"sequence\", got " + JSON.stringify(value.type));
  }
  captures.items = ((Array.isArray(value.items) ? value.items : [value.items]).map((__e: any) => __dispatchInverse_YamlSequenceItem_ast(__e, __indentCol + 2)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlSequence_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.items, "\n" + " ".repeat(__indentCol), __indentCol > 0));
}

function __invert_YamlNode_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  captures.node = __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_ast(value, __indentCol);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlNode_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.node));
}

function __invert_YamlBlock_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  captures.root = __invertSlotFor_YamlNode_ast(value, __indentCol);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlBlock_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.root));
}

function __invert_YamlScalar_0_source(value: any, __indentCol: number = 0): string {
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
    return __rebuild_YamlScalar_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.value));
}

function __invert_YamlMappingEntry_0_source(value: any, __indentCol: number = 0): string {
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
      throw new Error("stringify: expected separator \": \" after capture key");
    }
    captures.key = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  captures.value = __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_source(__s.slice(__pos), __indentCol);
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlMappingEntry_0(captures, __indentCol);
  }
  return __rebuildSlot(captures.key) + ": " + __rebuildSlot(captures.value);
}

function __invert_YamlMapping_0_source(value: any, __indentCol: number = 0): string {
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
  captures.entries = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : [__s.slice(__pos)]).map((__e: any) => __dispatchInverse_YamlMappingEntry_source(__e, __indentCol + 2)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlMapping_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.entries, "\n" + " ".repeat(__indentCol), __indentCol > 0));
}

function __invert_YamlSequenceItem_0_source(value: any, __indentCol: number = 0): string {
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
  if (__s.indexOf("- ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"- \" in template body");
  }
  __pos += 2;
  captures.value = __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_source(__s.slice(__pos), __indentCol);
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlSequenceItem_0(captures, __indentCol);
  }
  return "- " + __rebuildSlot(captures.value);
}

function __invert_YamlSequence_0_source(value: any, __indentCol: number = 0): string {
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
  captures.items = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : [__s.slice(__pos)]).map((__e: any) => __dispatchInverse_YamlSequenceItem_source(__e, __indentCol + 2)));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlSequence_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.items, "\n" + " ".repeat(__indentCol), __indentCol > 0));
}

function __invert_YamlNode_0_source(value: any, __indentCol: number = 0): string {
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
  captures.node = __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_source(__s.slice(__pos), __indentCol);
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlNode_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.node));
}

function __invert_YamlBlock_0_source(value: any, __indentCol: number = 0): string {
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
  captures.root = __invertSlotFor_YamlNode_source(__s.slice(__pos), __indentCol);
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_YamlBlock_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.root));
}

function __dispatchInverse_YamlScalar_ast(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    return __invert_YamlScalar_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlMappingEntry_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "entry")) return __invert_YamlMappingEntry_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlMapping_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "mapping")) return __invert_YamlMapping_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlSequenceItem_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "item")) return __invert_YamlSequenceItem_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlSequence_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "sequence")) return __invert_YamlSequence_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlNode_ast(value: any, __indentCol: number = 0): string {
  if (value !== undefined) {
    return __invert_YamlNode_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlBlock_ast(value: any, __indentCol: number = 0): string {
  if (value !== undefined) {
    return __invert_YamlBlock_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_YamlBlock_ast(value, 0);
}

function __dispatchInverse_YamlScalar_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_YamlScalar_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlMappingEntry_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf(": ") >= 0) { try { return __invert_YamlMappingEntry_0_source(value, __indentCol); } catch (_e) { /* try next */ } }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlMapping_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_YamlMapping_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlSequenceItem_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("- ")) return __invert_YamlSequenceItem_0_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlSequence_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_YamlSequence_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlNode_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_YamlNode_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_YamlBlock_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_YamlBlock_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_YamlBlock_source(value, 0);
}

function __invertSlotFor_YamlScalar_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlScalar_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlScalar_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlMappingEntry_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlMappingEntry_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlMappingEntry_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlMappingEntry_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlMappingEntry_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlMappingEntry_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlMappingEntry_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlMapping_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlMapping_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlMapping_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlSequenceItem_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlSequenceItem_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlSequenceItem_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlSequenceItem_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlSequenceItem_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlSequenceItem_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlSequenceItem_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlSequence_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlSequence_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlSequence_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlNode_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlNode_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlNode_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlNode_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlNode_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlNode_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlNode_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlBlock_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlBlock_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlBlock_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlBlock_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlBlock_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlBlock_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlBlock_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: YamlMapping, YamlSequence, YamlScalar; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_YamlMapping_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_ast(v, __indentCol); } catch (_e) { /* try next role */ }
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

function __invertSlotFor_YamlScalar_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlScalar_source(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlScalar_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlMappingEntry_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlMappingEntry_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlMappingEntry_source(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlMappingEntry_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlMappingEntry_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlMappingEntry_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlMappingEntry_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlMapping_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlMapping_source(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlMapping_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlSequenceItem_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlSequenceItem_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlSequenceItem_source(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlSequenceItem_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlSequenceItem_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlSequenceItem_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlSequenceItem_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlSequence_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlSequence_source(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlSequence_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlNode_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlNode_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlNode_source(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlNode_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlNode_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlNode_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlNode_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_YamlBlock_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlBlock_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_YamlBlock_source(v[i], __indentCol);
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
    try { return __dispatchInverse_YamlBlock_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlBlock_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_YamlBlock_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_YamlBlock_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_YamlMapping_YamlSequence_YamlScalar_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: YamlMapping, YamlSequence, YamlScalar; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_YamlMapping_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlSequence_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_YamlScalar_source(v, __indentCol); } catch (_e) { /* try next role */ }
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
  "source": __dispatchInverse_source,
};

export function stringify(value: YamlBlock_ast, options: { target: "ast" }): string;
export function stringify(value: YamlBlock_source, options: { target: "source" }): string;
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

function __fusedRender_YamlScalar_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let value: string = '';
    let __value_start = off;
    let __value_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __value_start = off;
      let __lastNonWs = off;
      let __depth = 0;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__depth === 0 && (__c === 10)) break;
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
        off++;
      }
      const __emptyAnchor = __value_start;
      if (__lastNonWs === __value_start) {
        off = __emptyAnchor;
        value = '';
      } else {
        off = __lastNonWs;
        value = input.slice(__value_start, __lastNonWs);
      }
      __value_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(value ?? ""));
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "YamlScalar#0": __fusedRender_YamlScalar_0_source,
};

const __rootProductionKey: string = "YamlBlock#0";

function __fusedRenderDispatchLookup(target: string): Record<string, (state: State, out: string[]) => boolean> | null {
  switch (target) {
    case "source": return __fusedRenderDispatch_source;
    default: return null;
  }
}

function __fusedRenderStructuredTableLookup(target: string): Record<string, (state: State) => unknown> | null {
  switch (target) {
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
  
  const result = parseYamlBlock(state);
  
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
  const __result = parseYamlBlock(__state);
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
  module: "@parser2/yaml-block",
  exportName: 'validate',
};
