// Auto-generated from packages/css-length-percentage/src/schema.ts
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
  return new SyntaxError(`parse failed at position ${offset}
${gutter} | ${source}
${' '.repeat(gutter.length)} | ${' '.repeat(column)}^`);
}

function parseLengthPercentageItem__alt0(state: State): unknown {
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

function parseLengthPercentageItem__alt1(state: State): unknown {
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

function parseLengthPercentageItem__alt2(state: State): unknown {
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

function parseLengthPercentageItem__alt3(state: State): unknown {
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

function parseLengthPercentageItem__alt4(state: State): unknown {
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

function parseLengthPercentageItem__alt5(state: State): unknown {
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
    __cand = parseLengthFunctionToken(state);
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

function parseLengthPercentageItem__alt6(state: State): unknown {
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

function parseLengthPercentageItem__alt7(state: State): unknown {
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

function parseLengthPercentageItem(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 45) {
  { const r = parseLengthPercentageItem__alt1(state); if (r !== null) return r; }
  return parseLengthPercentageItem__alt3(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = parseLengthPercentageItem__alt0(state); if (r !== null) return r; }
  { const r = parseLengthPercentageItem__alt2(state); if (r !== null) return r; }
  return parseLengthPercentageItem__alt4(state);
}
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  { const r = parseLengthPercentageItem__alt5(state); if (r !== null) return r; }
  { const r = parseLengthPercentageItem__alt6(state); if (r !== null) return r; }
  return parseLengthPercentageItem__alt7(state);
}
  return null;
}

function parseLengthFunctionToken__alt0(state: State): unknown {
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

function parseLengthFunctionToken__alt1(state: State): unknown {
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

function parseLengthFunctionToken__alt2(state: State): unknown {
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

function parseLengthFunctionToken__alt3(state: State): unknown {
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

function parseLengthFunctionToken__alt4(state: State): unknown {
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

function parseLengthFunctionToken__alt5(state: State): unknown {
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

function parseLengthFunctionToken__alt6(state: State): unknown {
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

function parseLengthFunctionToken__alt7(state: State): unknown {
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

function parseLengthFunctionToken(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 45) {
  return parseLengthFunctionToken__alt3(state);
}
  if (input.charCodeAt(off) === 43) {
  return parseLengthFunctionToken__alt4(state);
}
  if (input.charCodeAt(off) === 42) {
  return parseLengthFunctionToken__alt5(state);
}
  if (input.charCodeAt(off) === 47) {
  return parseLengthFunctionToken__alt6(state);
}
  if (input.charCodeAt(off) === 44) {
  return parseLengthFunctionToken__alt7(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = parseLengthFunctionToken__alt0(state); if (r !== null) return r; }
  { const r = parseLengthFunctionToken__alt1(state); if (r !== null) return r; }
  return parseLengthFunctionToken__alt2(state);
}
  return null;
}

function parseCssLengthPercentage(state: State): unknown {
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
    __cand = parseLengthPercentageItem(state);
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

const __defaultTarget: string | undefined = undefined;

function __build_LengthPercentageItem_0_ast(captures: any): any {
  return { type: "dimension", value: __renderSlot_ast(captures.value), unit: __renderSlot_ast(captures.unit) };
}

function __build_LengthPercentageItem_1_ast(captures: any): any {
  return { type: "dimension", value: "-10", unit: __renderSlot_ast(captures.unit) };
}

function __build_LengthPercentageItem_2_ast(captures: any): any {
  return { type: "percentage", value: __renderSlot_ast(captures.value) };
}

function __build_LengthPercentageItem_3_ast(captures: any): any {
  return { type: "percentage", value: "-50" };
}

function __build_LengthPercentageItem_4_ast(captures: any): any {
  return { type: "zero", value: __renderSlot_ast(captures.value) };
}

function __build_LengthPercentageItem_5_ast(captures: any): any {
  return { type: "length-function", name: __renderSlot_ast(captures.name), args: __renderSlot_ast(captures.args) };
}

function __build_LengthPercentageItem_6_ast(captures: any): any {
  return { type: "var-function", name: __renderSlot_ast(captures.name), args: __renderSlot_ast(captures.args) };
}

function __build_LengthPercentageItem_7_ast(captures: any): any {
  return { type: "length-keyword", value: __renderSlot_ast(captures.value) };
}

function __build_LengthFunctionToken_0_ast(captures: any): any {
  return { type: "dimension", value: __renderSlot_ast(captures.value), unit: __renderSlot_ast(captures.unit) };
}

function __build_LengthFunctionToken_1_ast(captures: any): any {
  return { type: "percentage", value: __renderSlot_ast(captures.value) };
}

function __build_LengthFunctionToken_2_ast(captures: any): any {
  return { type: "zero", value: __renderSlot_ast(captures.value) };
}

function __build_LengthFunctionToken_3_ast(captures: any): any {
  return { type: "operator", value: "-" };
}

function __build_LengthFunctionToken_4_ast(captures: any): any {
  return { type: "operator", value: "+" };
}

function __build_LengthFunctionToken_5_ast(captures: any): any {
  return { type: "operator", value: "*" };
}

function __build_LengthFunctionToken_6_ast(captures: any): any {
  return { type: "operator", value: "/" };
}

function __build_LengthFunctionToken_7_ast(captures: any): any {
  return { type: "separator", value: "," };
}

function __build_CssLengthPercentage_0_ast(captures: any): any {
  return { type: "css-length-percentage", items: __renderSlot_ast(captures.items) };
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "LengthPercentageItem#0": return __build_LengthPercentageItem_0_ast(captures);
    case "LengthPercentageItem#1": return __build_LengthPercentageItem_1_ast(captures);
    case "LengthPercentageItem#2": return __build_LengthPercentageItem_2_ast(captures);
    case "LengthPercentageItem#3": return __build_LengthPercentageItem_3_ast(captures);
    case "LengthPercentageItem#4": return __build_LengthPercentageItem_4_ast(captures);
    case "LengthPercentageItem#5": return __build_LengthPercentageItem_5_ast(captures);
    case "LengthPercentageItem#6": return __build_LengthPercentageItem_6_ast(captures);
    case "LengthPercentageItem#7": return __build_LengthPercentageItem_7_ast(captures);
    case "LengthFunctionToken#0": return __build_LengthFunctionToken_0_ast(captures);
    case "LengthFunctionToken#1": return __build_LengthFunctionToken_1_ast(captures);
    case "LengthFunctionToken#2": return __build_LengthFunctionToken_2_ast(captures);
    case "LengthFunctionToken#3": return __build_LengthFunctionToken_3_ast(captures);
    case "LengthFunctionToken#4": return __build_LengthFunctionToken_4_ast(captures);
    case "LengthFunctionToken#5": return __build_LengthFunctionToken_5_ast(captures);
    case "LengthFunctionToken#6": return __build_LengthFunctionToken_6_ast(captures);
    case "LengthFunctionToken#7": return __build_LengthFunctionToken_7_ast(captures);
    case "CssLengthPercentage#0": return __build_CssLengthPercentage_0_ast(captures);
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

function __rebuild_LengthPercentageItem_0(captures: any): string {
  return __rebuildSlot(captures.value) + __rebuildSlot(captures.unit);
}

function __rebuild_LengthPercentageItem_1(captures: any): string {
  return "-" + __rebuildSlot(captures.value) + __rebuildSlot(captures.unit);
}

function __rebuild_LengthPercentageItem_2(captures: any): string {
  return __rebuildSlot(captures.value) + "%";
}

function __rebuild_LengthPercentageItem_3(captures: any): string {
  return "-" + __rebuildSlot(captures.value) + "%";
}

function __rebuild_LengthPercentageItem_4(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_LengthPercentageItem_5(captures: any): string {
  return __rebuildSlot(captures.name) + "(" + __rebuildSlot(captures.args, " ") + " " + ")";
}

function __rebuild_LengthPercentageItem_6(captures: any): string {
  return __rebuildSlot(captures.name) + "(" + __rebuildSlot(captures.args) + ")";
}

function __rebuild_LengthPercentageItem_7(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_LengthFunctionToken_0(captures: any): string {
  return __rebuildSlot(captures.value) + __rebuildSlot(captures.unit);
}

function __rebuild_LengthFunctionToken_1(captures: any): string {
  return __rebuildSlot(captures.value) + "%";
}

function __rebuild_LengthFunctionToken_2(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_LengthFunctionToken_3(captures: any): string {
  return "-";
}

function __rebuild_LengthFunctionToken_4(captures: any): string {
  return "+";
}

function __rebuild_LengthFunctionToken_5(captures: any): string {
  return "*";
}

function __rebuild_LengthFunctionToken_6(captures: any): string {
  return "/";
}

function __rebuild_LengthFunctionToken_7(captures: any): string {
  return ",";
}

function __rebuild_CssLengthPercentage_0(captures: any): string {
  return String(__rebuildSlot(captures.items, " "));
}

function __invert_LengthPercentageItem_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "dimension")) {
    throw new Error("stringify: field \"type\" expected \"dimension\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  captures.unit = __invertSlotLeaf_ast(value.unit);
  return __rebuild_LengthPercentageItem_0(captures);
}

function __invert_LengthPercentageItem_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "dimension")) {
    throw new Error("stringify: field \"type\" expected \"dimension\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "-10")) {
    throw new Error("stringify: field \"value\" expected \"-10\", got " + JSON.stringify(value.value));
  }
  captures.unit = __invertSlotLeaf_ast(value.unit);
  return __rebuild_LengthPercentageItem_1(captures);
}

function __invert_LengthPercentageItem_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "percentage")) {
    throw new Error("stringify: field \"type\" expected \"percentage\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_LengthPercentageItem_2(captures);
}

function __invert_LengthPercentageItem_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "percentage")) {
    throw new Error("stringify: field \"type\" expected \"percentage\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "-50")) {
    throw new Error("stringify: field \"value\" expected \"-50\", got " + JSON.stringify(value.value));
  }
  return __rebuild_LengthPercentageItem_3(captures);
}

function __invert_LengthPercentageItem_4_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "zero")) {
    throw new Error("stringify: field \"type\" expected \"zero\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_LengthPercentageItem_4(captures);
}

function __invert_LengthPercentageItem_5_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "length-function")) {
    throw new Error("stringify: field \"type\" expected \"length-function\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.args = __invertSlotFor_LengthFunctionToken_ast(value.args);
  return __rebuild_LengthPercentageItem_5(captures);
}

function __invert_LengthPercentageItem_6_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "var-function")) {
    throw new Error("stringify: field \"type\" expected \"var-function\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.args = __invertSlotLeaf_ast(value.args);
  return __rebuild_LengthPercentageItem_6(captures);
}

function __invert_LengthPercentageItem_7_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "length-keyword")) {
    throw new Error("stringify: field \"type\" expected \"length-keyword\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_LengthPercentageItem_7(captures);
}

function __invert_LengthFunctionToken_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "dimension")) {
    throw new Error("stringify: field \"type\" expected \"dimension\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  captures.unit = __invertSlotLeaf_ast(value.unit);
  return __rebuild_LengthFunctionToken_0(captures);
}

function __invert_LengthFunctionToken_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "percentage")) {
    throw new Error("stringify: field \"type\" expected \"percentage\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_LengthFunctionToken_1(captures);
}

function __invert_LengthFunctionToken_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "zero")) {
    throw new Error("stringify: field \"type\" expected \"zero\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_LengthFunctionToken_2(captures);
}

function __invert_LengthFunctionToken_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "operator")) {
    throw new Error("stringify: field \"type\" expected \"operator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "-")) {
    throw new Error("stringify: field \"value\" expected \"-\", got " + JSON.stringify(value.value));
  }
  return __rebuild_LengthFunctionToken_3(captures);
}

function __invert_LengthFunctionToken_4_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "operator")) {
    throw new Error("stringify: field \"type\" expected \"operator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "+")) {
    throw new Error("stringify: field \"value\" expected \"+\", got " + JSON.stringify(value.value));
  }
  return __rebuild_LengthFunctionToken_4(captures);
}

function __invert_LengthFunctionToken_5_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "operator")) {
    throw new Error("stringify: field \"type\" expected \"operator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "*")) {
    throw new Error("stringify: field \"value\" expected \"*\", got " + JSON.stringify(value.value));
  }
  return __rebuild_LengthFunctionToken_5(captures);
}

function __invert_LengthFunctionToken_6_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "operator")) {
    throw new Error("stringify: field \"type\" expected \"operator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "/")) {
    throw new Error("stringify: field \"value\" expected \"/\", got " + JSON.stringify(value.value));
  }
  return __rebuild_LengthFunctionToken_6(captures);
}

function __invert_LengthFunctionToken_7_ast(value: any): string {
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
  return __rebuild_LengthFunctionToken_7(captures);
}

function __invert_CssLengthPercentage_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "css-length-percentage")) {
    throw new Error("stringify: field \"type\" expected \"css-length-percentage\", got " + JSON.stringify(value.type));
  }
  captures.items = __invertSlotFor_LengthPercentageItem_ast(value.items);
  return __rebuild_CssLengthPercentage_0(captures);
}

function __dispatchInverse_LengthPercentageItem_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "dimension")) return __invert_LengthPercentageItem_0_ast(value);
    if (Object.is(value.type, "dimension") && Object.is(value.value, "-10")) return __invert_LengthPercentageItem_1_ast(value);
    if (Object.is(value.type, "percentage")) return __invert_LengthPercentageItem_2_ast(value);
    if (Object.is(value.type, "percentage") && Object.is(value.value, "-50")) return __invert_LengthPercentageItem_3_ast(value);
    if (Object.is(value.type, "zero")) return __invert_LengthPercentageItem_4_ast(value);
    if (Object.is(value.type, "length-function")) return __invert_LengthPercentageItem_5_ast(value);
    if (Object.is(value.type, "var-function")) return __invert_LengthPercentageItem_6_ast(value);
    if (Object.is(value.type, "length-keyword")) return __invert_LengthPercentageItem_7_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_LengthFunctionToken_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "dimension")) return __invert_LengthFunctionToken_0_ast(value);
    if (Object.is(value.type, "percentage")) return __invert_LengthFunctionToken_1_ast(value);
    if (Object.is(value.type, "zero")) return __invert_LengthFunctionToken_2_ast(value);
    if (Object.is(value.type, "operator") && Object.is(value.value, "-")) return __invert_LengthFunctionToken_3_ast(value);
    if (Object.is(value.type, "operator") && Object.is(value.value, "+")) return __invert_LengthFunctionToken_4_ast(value);
    if (Object.is(value.type, "operator") && Object.is(value.value, "*")) return __invert_LengthFunctionToken_5_ast(value);
    if (Object.is(value.type, "operator") && Object.is(value.value, "/")) return __invert_LengthFunctionToken_6_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, ",")) return __invert_LengthFunctionToken_7_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_CssLengthPercentage_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "css-length-percentage")) return __invert_CssLengthPercentage_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_CssLengthPercentage_ast(value);
}

function __invertSlotFor_LengthPercentageItem_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_LengthPercentageItem_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_LengthPercentageItem_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_LengthPercentageItem_ast(v);
  return String(v);
}

function __invertSlotFor_LengthFunctionToken_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_LengthFunctionToken_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_LengthFunctionToken_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_LengthFunctionToken_ast(v);
  return String(v);
}

function __invertSlotFor_CssLengthPercentage_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_CssLengthPercentage_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CssLengthPercentage_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CssLengthPercentage_ast(v);
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
  const result = parseCssLengthPercentage(state);
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
  return result;
}

export function validate(input: string, options?: ParseOptions): void {
  const state: State = {
    input,
    len: input.length,
    pos: 0,
    maxOff: 0,
    mode: 'fast',
    lineStarts: [],
  };
  const result = parseCssLengthPercentage(state);
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/css-length-percentage",
  exportName: 'validate',
};
