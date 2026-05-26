// Auto-generated from packages/css-color/src/schema.ts
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

function validatorErrorAt(input: string, offset: number): SyntaxError {
  let lineStart = offset;
  while (lineStart > 0 && input.charCodeAt(lineStart - 1) !== 0x0a && input.charCodeAt(lineStart - 1) !== 0x0d) lineStart--;
  let lineEnd = offset;
  while (lineEnd < input.length && input.charCodeAt(lineEnd) !== 0x0a && input.charCodeAt(lineEnd) !== 0x0d) lineEnd++;
  let line = 1;
  for (let i = 0; i < lineStart; i++) if (input.charCodeAt(i) === 0x0a) line++;
  const source = input.slice(lineStart, lineEnd);
  const gutter = String(line);
  const column = Math.max(0, offset - lineStart);
  return new SyntaxError(`Invalid value at position ${offset}
${gutter} | ${source}
${' '.repeat(gutter.length)} | ${' '.repeat(column)}^`);
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

function parseCssColorValue__alt0(state: State): unknown {
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

function parseCssColorValue__alt1(state: State): unknown {
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
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CssColorValue#1", value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CssColorValue#1", value: value };
}

function parseCssColorValue__alt2(state: State): unknown {
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
    __cand = parseNumericColorFunctionToken(state);
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

function parseCssColorValue__alt3(state: State): unknown {
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
    __cand = parseColorFunctionToken(state);
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

function parseCssColorValue__alt4(state: State): unknown {
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

function parseCssColorValue(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 35) {
  return parseCssColorValue__alt1(state);
}
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  { const r = parseCssColorValue__alt2(state); if (r !== null) return r; }
  { const r = parseCssColorValue__alt3(state); if (r !== null) return r; }
  { const r = parseCssColorValue__alt4(state); if (r !== null) return r; }
  return parseCssColorValue__alt0(state);
}
  return null;
}

function parseNumericColorFunctionToken__alt0(state: State): unknown {
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

function parseNumericColorFunctionToken__alt1(state: State): unknown {
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

function parseNumericColorFunctionToken__alt2(state: State): unknown {
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

function parseNumericColorFunctionToken__alt3(state: State): unknown {
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

function parseNumericColorFunctionToken(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 47) {
  return parseNumericColorFunctionToken__alt2(state);
}
  if (input.charCodeAt(off) === 44) {
  return parseNumericColorFunctionToken__alt3(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = parseNumericColorFunctionToken__alt0(state); if (r !== null) return r; }
  return parseNumericColorFunctionToken__alt1(state);
}
  return null;
}

function parseColorFunctionToken__alt0(state: State): unknown {
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

function parseColorFunctionToken__alt1(state: State): unknown {
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

function parseColorFunctionToken__alt2(state: State): unknown {
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

function parseColorFunctionToken__alt3(state: State): unknown {
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

function parseColorFunctionToken__alt4(state: State): unknown {
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

function parseColorFunctionToken__alt5(state: State): unknown {
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

function parseColorFunctionToken(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 47) {
  return parseColorFunctionToken__alt4(state);
}
  if (input.charCodeAt(off) === 44) {
  return parseColorFunctionToken__alt5(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = parseColorFunctionToken__alt0(state); if (r !== null) return r; }
  return parseColorFunctionToken__alt1(state);
}
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  return parseColorFunctionToken__alt2(state);
}
  if ((input.charCodeAt(off) === 0x22 || input.charCodeAt(off) === 0x27)) {
  return parseColorFunctionToken__alt3(state);
}
  return null;
}

function parseCssColor(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __value_start = off;
  const value = parseCssColorValue(state);
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

const __defaultTarget: string | undefined = undefined;

function __build_CssColorValue_0_ast(captures: any): any {
  return { type: "color-keyword", value: __renderSlot_ast(captures.value) };
}

function __build_CssColorValue_1_ast(captures: any): any {
  return { type: "hash-color", value: __renderSlot_ast(captures.value) };
}

function __build_CssColorValue_2_ast(captures: any): any {
  return { type: "rgb-color-function", name: __renderSlot_ast(captures.name), args: __renderSlot_ast(captures.args) };
}

function __build_CssColorValue_3_ast(captures: any): any {
  return { type: "color-function", name: __renderSlot_ast(captures.name), args: __renderSlot_ast(captures.args) };
}

function __build_CssColorValue_4_ast(captures: any): any {
  return { type: "var-function", name: __renderSlot_ast(captures.name), args: __renderSlot_ast(captures.args) };
}

function __build_NumericColorFunctionToken_0_ast(captures: any): any {
  return { type: "percentage", value: __renderSlot_ast(captures.value) };
}

function __build_NumericColorFunctionToken_1_ast(captures: any): any {
  return { type: "number", value: __renderSlot_ast(captures.value) };
}

function __build_NumericColorFunctionToken_2_ast(captures: any): any {
  return { type: "separator", value: "/" };
}

function __build_NumericColorFunctionToken_3_ast(captures: any): any {
  return { type: "separator", value: "," };
}

function __build_ColorFunctionToken_0_ast(captures: any): any {
  return { type: "percentage", value: __renderSlot_ast(captures.value) };
}

function __build_ColorFunctionToken_1_ast(captures: any): any {
  return { type: "number", value: __renderSlot_ast(captures.value) };
}

function __build_ColorFunctionToken_2_ast(captures: any): any {
  return { type: "ident", value: __renderSlot_ast(captures.value) };
}

function __build_ColorFunctionToken_3_ast(captures: any): any {
  return { type: "string", value: __renderSlot_ast(captures.value) };
}

function __build_ColorFunctionToken_4_ast(captures: any): any {
  return { type: "separator", value: "/" };
}

function __build_ColorFunctionToken_5_ast(captures: any): any {
  return { type: "separator", value: "," };
}

function __build_CssColor_0_ast(captures: any): any {
  return { type: "css-color", value: __renderSlot_ast(captures.value) };
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "CssColorValue#0": return __build_CssColorValue_0_ast(captures);
    case "CssColorValue#1": return __build_CssColorValue_1_ast(captures);
    case "CssColorValue#2": return __build_CssColorValue_2_ast(captures);
    case "CssColorValue#3": return __build_CssColorValue_3_ast(captures);
    case "CssColorValue#4": return __build_CssColorValue_4_ast(captures);
    case "NumericColorFunctionToken#0": return __build_NumericColorFunctionToken_0_ast(captures);
    case "NumericColorFunctionToken#1": return __build_NumericColorFunctionToken_1_ast(captures);
    case "NumericColorFunctionToken#2": return __build_NumericColorFunctionToken_2_ast(captures);
    case "NumericColorFunctionToken#3": return __build_NumericColorFunctionToken_3_ast(captures);
    case "ColorFunctionToken#0": return __build_ColorFunctionToken_0_ast(captures);
    case "ColorFunctionToken#1": return __build_ColorFunctionToken_1_ast(captures);
    case "ColorFunctionToken#2": return __build_ColorFunctionToken_2_ast(captures);
    case "ColorFunctionToken#3": return __build_ColorFunctionToken_3_ast(captures);
    case "ColorFunctionToken#4": return __build_ColorFunctionToken_4_ast(captures);
    case "ColorFunctionToken#5": return __build_ColorFunctionToken_5_ast(captures);
    case "CssColor#0": return __build_CssColor_0_ast(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __renderSlot_ast(v: any): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_ast(v[i]));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_ast(v);
  }
  return v;
}

const __renderDispatch: Record<string, (captures: any) => any> = {
  "ast": (captures: any) => __dispatchRender_ast(captures),
};

export function render(input: string, options?: { type?: string; mode?: ParseMode }): unknown {
  const target = options?.type ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.type or set defaultTarget on the schema");
  }
  const fn = __renderDispatch[target];
  if (!fn) {
    throw new Error("render: unknown target '" + target + "'");
  }
  const captures = options && options.mode ? __parse(input, { mode: options.mode }) : __parse(input);
  return fn(captures);
}

function __rebuildSlot(v: any, joinSep: string = ""): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) {
      if (i > 0 && joinSep.length > 0) out += joinSep;
      out += __rebuildSlot(v[i]);
    }
    return out;
  }
  return String(v);
}

function __rebuild_CssColorValue_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_CssColorValue_1(captures: any): string {
  return "#" + __rebuildSlot(captures.value);
}

function __rebuild_CssColorValue_2(captures: any): string {
  return __rebuildSlot(captures.name) + "(" + __rebuildSlot(captures.args, " ") + " " + ")";
}

function __rebuild_CssColorValue_3(captures: any): string {
  return __rebuildSlot(captures.name) + "(" + __rebuildSlot(captures.args, " ") + " " + ")";
}

function __rebuild_CssColorValue_4(captures: any): string {
  return __rebuildSlot(captures.name) + "(" + __rebuildSlot(captures.args) + ")";
}

function __rebuild_NumericColorFunctionToken_0(captures: any): string {
  return __rebuildSlot(captures.value) + "%";
}

function __rebuild_NumericColorFunctionToken_1(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_NumericColorFunctionToken_2(captures: any): string {
  return "/";
}

function __rebuild_NumericColorFunctionToken_3(captures: any): string {
  return ",";
}

function __rebuild_ColorFunctionToken_0(captures: any): string {
  return __rebuildSlot(captures.value) + "%";
}

function __rebuild_ColorFunctionToken_1(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_ColorFunctionToken_2(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_ColorFunctionToken_3(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_ColorFunctionToken_4(captures: any): string {
  return "/";
}

function __rebuild_ColorFunctionToken_5(captures: any): string {
  return ",";
}

function __rebuild_CssColor_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __invert_CssColorValue_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "color-keyword")) {
    throw new Error("stringify: field \"type\" expected \"color-keyword\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_CssColorValue_0(captures);
}

function __invert_CssColorValue_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "hash-color")) {
    throw new Error("stringify: field \"type\" expected \"hash-color\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_CssColorValue_1(captures);
}

function __invert_CssColorValue_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "rgb-color-function")) {
    throw new Error("stringify: field \"type\" expected \"rgb-color-function\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.args = __invertSlotFor_NumericColorFunctionToken_ast(value.args);
  return __rebuild_CssColorValue_2(captures);
}

function __invert_CssColorValue_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "color-function")) {
    throw new Error("stringify: field \"type\" expected \"color-function\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.args = __invertSlotFor_ColorFunctionToken_ast(value.args);
  return __rebuild_CssColorValue_3(captures);
}

function __invert_CssColorValue_4_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "var-function")) {
    throw new Error("stringify: field \"type\" expected \"var-function\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.args = __invertSlotLeaf_ast(value.args);
  return __rebuild_CssColorValue_4(captures);
}

function __invert_NumericColorFunctionToken_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "percentage")) {
    throw new Error("stringify: field \"type\" expected \"percentage\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_NumericColorFunctionToken_0(captures);
}

function __invert_NumericColorFunctionToken_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "number")) {
    throw new Error("stringify: field \"type\" expected \"number\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_NumericColorFunctionToken_1(captures);
}

function __invert_NumericColorFunctionToken_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "separator")) {
    throw new Error("stringify: field \"type\" expected \"separator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "/")) {
    throw new Error("stringify: field \"value\" expected \"/\", got " + JSON.stringify(value.value));
  }
  return __rebuild_NumericColorFunctionToken_2(captures);
}

function __invert_NumericColorFunctionToken_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "separator")) {
    throw new Error("stringify: field \"type\" expected \"separator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, ",")) {
    throw new Error("stringify: field \"value\" expected \",\", got " + JSON.stringify(value.value));
  }
  return __rebuild_NumericColorFunctionToken_3(captures);
}

function __invert_ColorFunctionToken_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "percentage")) {
    throw new Error("stringify: field \"type\" expected \"percentage\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_ColorFunctionToken_0(captures);
}

function __invert_ColorFunctionToken_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "number")) {
    throw new Error("stringify: field \"type\" expected \"number\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_ColorFunctionToken_1(captures);
}

function __invert_ColorFunctionToken_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "ident")) {
    throw new Error("stringify: field \"type\" expected \"ident\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_ColorFunctionToken_2(captures);
}

function __invert_ColorFunctionToken_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "string")) {
    throw new Error("stringify: field \"type\" expected \"string\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_ColorFunctionToken_3(captures);
}

function __invert_ColorFunctionToken_4_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "separator")) {
    throw new Error("stringify: field \"type\" expected \"separator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "/")) {
    throw new Error("stringify: field \"value\" expected \"/\", got " + JSON.stringify(value.value));
  }
  return __rebuild_ColorFunctionToken_4(captures);
}

function __invert_ColorFunctionToken_5_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "separator")) {
    throw new Error("stringify: field \"type\" expected \"separator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, ",")) {
    throw new Error("stringify: field \"value\" expected \",\", got " + JSON.stringify(value.value));
  }
  return __rebuild_ColorFunctionToken_5(captures);
}

function __invert_CssColor_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "css-color")) {
    throw new Error("stringify: field \"type\" expected \"css-color\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotFor_CssColorValue_ast(value.value);
  return __rebuild_CssColor_0(captures);
}

function __dispatchInverse_CssColorValue_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "color-keyword")) return __invert_CssColorValue_0_ast(value);
    if (Object.is(value.type, "hash-color")) return __invert_CssColorValue_1_ast(value);
    if (Object.is(value.type, "rgb-color-function")) return __invert_CssColorValue_2_ast(value);
    if (Object.is(value.type, "color-function")) return __invert_CssColorValue_3_ast(value);
    if (Object.is(value.type, "var-function")) return __invert_CssColorValue_4_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_NumericColorFunctionToken_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "percentage")) return __invert_NumericColorFunctionToken_0_ast(value);
    if (Object.is(value.type, "number")) return __invert_NumericColorFunctionToken_1_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, "/")) return __invert_NumericColorFunctionToken_2_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, ",")) return __invert_NumericColorFunctionToken_3_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ColorFunctionToken_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "percentage")) return __invert_ColorFunctionToken_0_ast(value);
    if (Object.is(value.type, "number")) return __invert_ColorFunctionToken_1_ast(value);
    if (Object.is(value.type, "ident")) return __invert_ColorFunctionToken_2_ast(value);
    if (Object.is(value.type, "string")) return __invert_ColorFunctionToken_3_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, "/")) return __invert_ColorFunctionToken_4_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, ",")) return __invert_ColorFunctionToken_5_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_CssColor_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "css-color")) return __invert_CssColor_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_CssColor_ast(value);
}

function __invertSlotFor_CssColorValue_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_CssColorValue_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CssColorValue_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CssColorValue_ast(v);
  return String(v);
}

function __invertSlotFor_NumericColorFunctionToken_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_NumericColorFunctionToken_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_NumericColorFunctionToken_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_NumericColorFunctionToken_ast(v);
  return String(v);
}

function __invertSlotFor_ColorFunctionToken_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_ColorFunctionToken_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_ColorFunctionToken_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_ColorFunctionToken_ast(v);
  return String(v);
}

function __invertSlotFor_CssColor_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_CssColor_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CssColor_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CssColor_ast(v);
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

const __inverseDispatch: Record<string, (value: any) => string> = {
  "ast": __dispatchInverse_ast,
};

export function stringify(value: unknown, options?: { type?: string }): string {
  const target = options?.type ?? __defaultTarget;
  if (!target) {
    throw new Error("stringify: missing target; pass options.type or set defaultTarget on the schema");
  }
  const fn = __inverseDispatch[target];
  if (!fn) {
    throw new Error("stringify: unknown target '" + target + "'");
  }
  return fn(value);
}

function __parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode,
    lineStarts: mode === 'raws' ? computeLineStarts(input) : [],
  };
  const result = parseCssColor(state);
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
  };
  const __result = parseCssColor(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: 'unknown',
  exportName: 'validate',
};
