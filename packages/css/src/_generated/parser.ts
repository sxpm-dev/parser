// Auto-generated from packages/css/src/schema.ts
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

// ── Inlined validator: CssColor (prefix __v0_) ──

function __v0_parseCssColorValue__alt0(state: State): unknown {
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
  if (!(value.toLowerCase() === "aliceblue" || value.toLowerCase() === "black" || value.toLowerCase() === "blue" || value.toLowerCase() === "currentcolor" || value.toLowerCase() === "green" || value.toLowerCase() === "inherit" || value.toLowerCase() === "initial" || value.toLowerCase() === "red" || value.toLowerCase() === "revert" || value.toLowerCase() === "revert-layer" || value.toLowerCase() === "transparent" || value.toLowerCase() === "unset" || value.toLowerCase() === "white" || value.toLowerCase() === "yellow")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#0", value: value };
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
  if (!(input.charCodeAt(off) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
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
    const __captures: any = { __production: "CssColorValue#1", value: value };
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
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "rgb" || name.toLowerCase() === "rgba")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __args_start = off;
  const args: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = __v0_parseNumericColorFunctionToken(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    args.push(__cand);
    if (off === __loopStart) break;
  }
  if (args.length < 1) { state.pos = entryOff; return null; }
  const __args_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#2", name: name, args: args };
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
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "color" || name.toLowerCase() === "color-mix" || name.toLowerCase() === "hsl" || name.toLowerCase() === "hsla" || name.toLowerCase() === "hwb" || name.toLowerCase() === "lab" || name.toLowerCase() === "lch" || name.toLowerCase() === "light-dark" || name.toLowerCase() === "oklab" || name.toLowerCase() === "oklch")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __args_start = off;
  const args: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = __v0_parseColorFunctionToken(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    args.push(__cand);
    if (off === __loopStart) break;
  }
  if (args.length < 1) { state.pos = entryOff; return null; }
  const __args_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#3", name: name, args: args };
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
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "var")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
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
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#4", name: name, args: args };
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "NumericColorFunctionToken#0", value: value };
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
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
    const __captures: any = { __production: "NumericColorFunctionToken#1", value: value };
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
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "NumericColorFunctionToken#2" };
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
  if (!(input.charCodeAt(off) === 44)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "NumericColorFunctionToken#3" };
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#0", value: value };
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
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
    const __captures: any = { __production: "ColorFunctionToken#1", value: value };
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
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#2", value: value };
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
    const __captures: any = { __production: "ColorFunctionToken#3", value: value };
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
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#4" };
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
  if (!(input.charCodeAt(off) === 44)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ColorFunctionToken#5" };
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
  state.pos = off;
  const __value_start = off;
  const value = __v0_parseCssColorValue(state);
  if (value === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __value_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColor#0", value: value };
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
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
    const __captures: any = { __production: "LengthPercentageItem#0", value: value, unit: unit };
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
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
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
    const __captures: any = { __production: "LengthPercentageItem#1", value: value, unit: unit };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#1", value: value, unit: unit };
}

function __v1_parseLengthPercentageItem__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#2", value: value };
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
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#3", value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "LengthPercentageItem#3", value: value };
}

function __v1_parseLengthPercentageItem__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  if (!(value.toLowerCase() === "0")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#4", value: value };
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
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "calc" || name.toLowerCase() === "clamp" || name.toLowerCase() === "max" || name.toLowerCase() === "min")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __args_start = off;
  const args: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = __v1_parseLengthFunctionToken(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    args.push(__cand);
    if (off === __loopStart) break;
  }
  if (args.length < 1) { state.pos = entryOff; return null; }
  const __args_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#5", name: name, args: args };
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
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  if (!(name.toLowerCase() === "var")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
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
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthPercentageItem#6", name: name, args: args };
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
    const __captures: any = { __production: "LengthPercentageItem#7", value: value };
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
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
    const __captures: any = { __production: "LengthFunctionToken#0", value: value, unit: unit };
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  if (off + 1 < len && input.charCodeAt(off) === 0x2e && isDigit(input.charCodeAt(off + 1))) {
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
  }
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 37)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#1", value: value };
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __value_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __value_end = off;
  const value = input.slice(__value_start, __value_end);
  if (!(value.toLowerCase() === "0")) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#2", value: value };
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
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#3" };
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
  if (!(input.charCodeAt(off) === 43)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#4" };
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
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#5" };
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
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#6" };
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
  if (!(input.charCodeAt(off) === 44)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "LengthFunctionToken#7" };
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
  const __items_start = off;
  const items: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = __v1_parseLengthPercentageItem(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    items.push(__cand);
    if (off === __loopStart) break;
  }
  if (items.length < 1) { state.pos = entryOff; return null; }
  if (items.length > 4) { state.pos = entryOff; return null; }
  const __items_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssLengthPercentage#0", items: items };
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
    const __captures: any = { __production: "Comment#0", text: text };
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
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Declaration#0", prop: prop, value: value, important: important };
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
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Declaration#1", prop: prop, value: value };
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
  const __nodes_start = off;
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    // Skip ws before the separator. v1 always allows ws around seps.
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      // Skip ws after the separator.
      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    }
    let __cand: unknown = null;
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
    nodes.push(__cand);
    if (off === __loopStart) break;
  }
  const __nodes_end = off;
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
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Rule#0", selector: selector, nodes: nodes };
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
  const __nodes_start = off;
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    // Skip ws before the separator. v1 always allows ws around seps.
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      // Skip ws after the separator.
      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    }
    let __cand: unknown = null;
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
    nodes.push(__cand);
    if (off === __loopStart) break;
  }
  const __nodes_end = off;
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
  if (state.mode === 'raws') {
    const __captures: any = { __production: "AtRule#0", name: name, params: params, nodes: nodes };
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
  if (state.mode === 'raws') {
    const __captures: any = { __production: "AtRule#1", name: name, params: params };
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
  const __nodes_start = off;
  const nodes: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    // Skip ws before the separator. v1 always allows ws around seps.
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 59) {
      __sepConsumed = true;
      off += 1;
      // Skip ws after the separator.
      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    }
    let __cand: unknown = null;
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
    nodes.push(__cand);
    if (off === __loopStart) break;
  }
  const __nodes_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Stylesheet#0", nodes: nodes };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Stylesheet#0", nodes: nodes };
}

const __defaultTarget: string | undefined = undefined;

function __build_Comment_0_ast(captures: any, __indentCol: number = 0): any {
  return { type: "comment", text: __renderSlot_ast(captures.text, __indentCol) };
}

function __build_Comment_0_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.text, __indentCol) ?? ""));
}

function __build_Declaration_0_ast(captures: any, __indentCol: number = 0): any {
  return { type: "decl", prop: __renderSlot_ast(captures.prop, __indentCol), value: __renderSlot_ast(captures.value, __indentCol), important: true, _important: __renderSlot_ast(captures.important, __indentCol) };
}

function __build_Declaration_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.prop, __indentCol) ?? "") + ": " + (__renderSlot_source(captures.value, __indentCol) ?? "") + " !" + (__renderSlot_source(captures.important, __indentCol) ?? "") + ";";
}

function __build_Declaration_1_ast(captures: any, __indentCol: number = 0): any {
  return { type: "decl", prop: __renderSlot_ast(captures.prop, __indentCol), value: __renderSlot_ast(captures.value, __indentCol) };
}

function __build_Declaration_1_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.prop, __indentCol) ?? "") + ": " + (__renderSlot_source(captures.value, __indentCol) ?? "") + ";";
}

function __build_Rule_0_ast(captures: any, __indentCol: number = 0): any {
  return { type: "rule", selector: __renderSlot_ast(captures.selector, __indentCol), nodes: __renderSlot_ast(captures.nodes, __indentCol) };
}

function __build_Rule_0_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.selector, __indentCol) ?? "") + " {" + (captures.nodes == null ? "" : (Array.isArray(captures.nodes) ? captures.nodes.map((c: any) => __renderSlot_source(c, __indentCol)).join(";") : (__renderSlot_source(captures.nodes, __indentCol) ?? ""))) + "}";
}

function __build_AtRule_0_ast(captures: any, __indentCol: number = 0): any {
  return { type: "atrule", name: __renderSlot_ast(captures.name, __indentCol), params: __renderSlot_ast(captures.params, __indentCol), nodes: __renderSlot_ast(captures.nodes, __indentCol) };
}

function __build_AtRule_0_source(captures: any, __indentCol: number = 0): any {
  return "@" + (__renderSlot_source(captures.name, __indentCol) ?? "") + " " + (__renderSlot_source(captures.params, __indentCol) ?? "") + " {" + (captures.nodes == null ? "" : (Array.isArray(captures.nodes) ? captures.nodes.map((c: any) => __renderSlot_source(c, __indentCol)).join(";") : (__renderSlot_source(captures.nodes, __indentCol) ?? ""))) + "}";
}

function __build_AtRule_1_ast(captures: any, __indentCol: number = 0): any {
  return { type: "atrule", name: __renderSlot_ast(captures.name, __indentCol), params: __renderSlot_ast(captures.params, __indentCol) };
}

function __build_AtRule_1_source(captures: any, __indentCol: number = 0): any {
  return "@" + (__renderSlot_source(captures.name, __indentCol) ?? "") + " " + (__renderSlot_source(captures.params, __indentCol) ?? "") + ";";
}

function __build_Stylesheet_0_ast(captures: any, __indentCol: number = 0): any {
  return { type: "root", nodes: __renderSlot_ast(captures.nodes, __indentCol) };
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

export function render(input: string, options?: { target?: string; mode?: ParseMode }): unknown {
  const target = options?.target ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.target or set defaultTarget on the schema");
  }
  if (target !== 'ast') {
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

function __rebuild_Comment_0(captures: any): string {
  return String(__rebuildSlot(captures.text));
}

function __rebuild_Declaration_0(captures: any): string {
  return __rebuildSlot(captures.prop) + ":" + " " + __rebuildSlot(captures.value) + " " + "!" + __rebuildSlot(captures.important) + ";";
}

function __rebuild_Declaration_1(captures: any): string {
  return __rebuildSlot(captures.prop) + ":" + " " + __rebuildSlot(captures.value) + ";";
}

function __rebuild_Rule_0(captures: any): string {
  return __rebuildSlot(captures.selector) + " " + "{" + (captures.nodes == null ? "" : " " + __rebuildSlot(captures.nodes, ";")) + " " + "}";
}

function __rebuild_AtRule_0(captures: any): string {
  return "@" + __rebuildSlot(captures.name) + " " + __rebuildSlot(captures.params) + " " + "{" + (captures.nodes == null ? "" : " " + __rebuildSlot(captures.nodes, ";")) + " " + "}";
}

function __rebuild_AtRule_1(captures: any): string {
  return "@" + __rebuildSlot(captures.name) + " " + __rebuildSlot(captures.params) + ";";
}

function __rebuild_Stylesheet_0(captures: any): string {
  return String((captures.nodes == null ? "" : __rebuildSlot(captures.nodes, ";")));
}

function __invert_Comment_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "comment")) {
    throw new Error("stringify: field \"type\" expected \"comment\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_Comment_0(captures, __indentCol);
}

function __invert_Declaration_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
  return __rebuild_Declaration_0(captures, __indentCol);
}

function __invert_Declaration_1_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "decl")) {
    throw new Error("stringify: field \"type\" expected \"decl\", got " + JSON.stringify(value.type));
  }
  captures.prop = __invertSlotLeaf_ast(value.prop);
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_Declaration_1(captures, __indentCol);
}

function __invert_Rule_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "rule")) {
    throw new Error("stringify: field \"type\" expected \"rule\", got " + JSON.stringify(value.type));
  }
  captures.selector = __invertSlotLeaf_ast(value.selector);
  captures.nodes = __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(value.nodes, __indentCol);
  return __rebuild_Rule_0(captures, __indentCol);
}

function __invert_AtRule_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "atrule")) {
    throw new Error("stringify: field \"type\" expected \"atrule\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.params = __invertSlotLeaf_ast(value.params);
  captures.nodes = __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(value.nodes, __indentCol);
  return __rebuild_AtRule_0(captures, __indentCol);
}

function __invert_AtRule_1_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "atrule")) {
    throw new Error("stringify: field \"type\" expected \"atrule\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.params = __invertSlotLeaf_ast(value.params);
  return __rebuild_AtRule_1(captures, __indentCol);
}

function __invert_Stylesheet_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "root")) {
    throw new Error("stringify: field \"type\" expected \"root\", got " + JSON.stringify(value.type));
  }
  captures.nodes = __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(value.nodes, __indentCol);
  return __rebuild_Stylesheet_0(captures, __indentCol);
}

function __invert_Comment_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Comment_0(captures, __indentCol);
}

function __invert_Declaration_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
  return __rebuild_Declaration_0(captures, __indentCol);
}

function __invert_Declaration_1_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
  return __rebuild_Declaration_1(captures, __indentCol);
}

function __invert_Rule_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
    captures.nodes = __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(__s.slice(__pos, __end), __indentCol);
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Rule_0(captures, __indentCol);
}

function __invert_AtRule_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
    captures.nodes = __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(__s.slice(__pos, __end), __indentCol);
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_AtRule_0(captures, __indentCol);
}

function __invert_AtRule_1_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
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
  return __rebuild_AtRule_1(captures, __indentCol);
}

function __invert_Stylesheet_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos >= __s.length) {
    captures.nodes = null;
  } else {
    captures.nodes = __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(__s.slice(__pos), __indentCol);
    __pos = __s.length;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Stylesheet_0(captures, __indentCol);
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

function __dispatchInverse_Comment_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    return __invert_Comment_0_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Declaration_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf(" !") >= 0) return __invert_Declaration_0_source(value, __indentCol);
    return __invert_Declaration_1_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Rule_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.indexOf(" {") >= 0) return __invert_Rule_0_source(value, __indentCol);
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
    return __invert_Stylesheet_0_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Stylesheet_source(value, 0);
}

function __invertSlotFor_Comment_ast(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Comment_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Comment_ast(v, __indentCol);
  return String(v);
}

function __invertSlotFor_Declaration_ast(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Declaration_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Declaration_ast(v, __indentCol);
  return String(v);
}

function __invertSlotFor_Rule_ast(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Rule_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Rule_ast(v, __indentCol);
  return String(v);
}

function __invertSlotFor_AtRule_ast(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_AtRule_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_AtRule_ast(v, __indentCol);
  return String(v);
}

function __invertSlotFor_Stylesheet_ast(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Stylesheet_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Stylesheet_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Stylesheet_ast(v, __indentCol);
  return String(v);
}

function __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_Comment_AtRule_Rule_Declaration_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_Comment_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: Comment, AtRule, Rule, Declaration; value: " + JSON.stringify(v) + ")");
  }
  return String(v);
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

function __invertSlotFor_Comment_source(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Comment_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Comment_source(v, __indentCol);
  return String(v);
}

function __invertSlotFor_Declaration_source(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Declaration_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Declaration_source(v, __indentCol);
  return String(v);
}

function __invertSlotFor_Rule_source(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Rule_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Rule_source(v, __indentCol);
  return String(v);
}

function __invertSlotFor_AtRule_source(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_AtRule_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_AtRule_source(v, __indentCol);
  return String(v);
}

function __invertSlotFor_Stylesheet_source(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Stylesheet_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Stylesheet_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Stylesheet_source(v, __indentCol);
  return String(v);
}

function __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_Comment_AtRule_Rule_Declaration_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_Comment_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_AtRule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Rule_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Declaration_source(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: Comment, AtRule, Rule, Declaration; value: " + JSON.stringify(v) + ")");
  }
  return String(v);
}

function __invertSlotLeaf_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  return String(v);
}

const __inverseDispatch: Record<string, (value: any) => string> = {
  "ast": __dispatchInverse_ast,
  "source": __dispatchInverse_source,
};

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
    out.push(String(text ?? ""));
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

const __rootProductionKey: string = "Stylesheet#0";

function __fusedRenderDispatchLookup(target: string): Record<string, (state: State, out: string[]) => boolean> | null {
  switch (target) {
    case "source": return __fusedRenderDispatch_source;
    default: return null;
  }
}

function __renderFused(input: string, target: string): string | null {
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
  const result = parseStylesheet(state);
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
  return result;
}

export function validate(input: string, options?: ParseOptions): void {
  // Syntax check: parse in fast mode first (will throw SyntaxError on bad syntax).
  __parse(input, { mode: 'fast' });
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
