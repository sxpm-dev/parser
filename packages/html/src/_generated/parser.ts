// Auto-generated from packages/html/src/schema.ts
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

function parseHtmlDocument(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlDocument#0", children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlDocument#0", children: children };
}

function parseDoctype__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off)) || input.charCodeAt(off) === 0x5c))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __keyword_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __keyword_end = off;
  const keyword = input.slice(__keyword_start, __keyword_end);
  if (!(keyword.toLowerCase() === "doctype")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Doctype#0", keyword: keyword, name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Doctype#0", keyword: keyword, name: name };
}

function parseDoctype__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off)) || input.charCodeAt(off) === 0x5c))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __keyword_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __keyword_end = off;
  const keyword = input.slice(__keyword_start, __keyword_end);
  if (!(keyword.toLowerCase() === "doctype")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Doctype#1", keyword: keyword, name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Doctype#1", keyword: keyword, name: name };
}

function parseDoctype(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 60) {
  { const r = parseDoctype__alt0(state); if (r !== null) return r; }
  return parseDoctype__alt1(state);
}
  return null;
}

function parseComment(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("<!--", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let data: string = '';
  let __data_start = off;
  let __data_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __data_start = off;
    let __lastNonWs = off;
    let __depth = 0;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__depth === 0 && ((__c === 45 && input.startsWith("-->", off)))) break;
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
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __data_start;
    if (__lastNonWs === __data_start) {
      off = __emptyAnchor;
      data = '';
    } else {
      off = __lastNonWs;
      data = input.slice(__data_start, __lastNonWs);
    }
    __data_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("-->", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Comment#0", data: data };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Comment#0", data: data };
}

function parseHtmlElement__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "script" || tag.toLowerCase() === "style" || tag.toLowerCase() === "textarea" || tag.toLowerCase() === "title")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let children: string = '';
  let __children_start = off;
  let __children_end = off;
  {
    __children_start = off;
    let __earliest = len;
    for (let __i = __children_start; __i < len; __i++) {
      const __c = input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < len && input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    off = __earliest;
    __children_end = off;
    children = input.slice(__children_start, __children_end);
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __closeTag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __closeTag_end = off;
  const closeTag = input.slice(__closeTag_start, __closeTag_end);
  if (!(closeTag.toLowerCase() === "script" || closeTag.toLowerCase() === "style" || closeTag.toLowerCase() === "textarea" || closeTag.toLowerCase() === "title")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#0", tag: tag, attrs: attrs, children: children, closeTag: closeTag };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#0", tag: tag, attrs: attrs, children: children, closeTag: closeTag };
}

function parseHtmlElement__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "area" || tag.toLowerCase() === "base" || tag.toLowerCase() === "br" || tag.toLowerCase() === "col" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "img" || tag.toLowerCase() === "input" || tag.toLowerCase() === "link" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "param" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "wbr")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#1", tag: tag, attrs: attrs };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#1", tag: tag, attrs: attrs };
}

function parseHtmlElement__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "area" || tag.toLowerCase() === "base" || tag.toLowerCase() === "br" || tag.toLowerCase() === "col" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "img" || tag.toLowerCase() === "input" || tag.toLowerCase() === "link" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "param" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "wbr")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47 && input.charCodeAt(off + 1) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#2", tag: tag, attrs: attrs };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#2", tag: tag, attrs: attrs };
}

function parseHtmlElement__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47 && input.charCodeAt(off + 1) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#3", tag: tag, attrs: attrs };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#3", tag: tag, attrs: attrs };
}

function parseHtmlElement__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "li")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</menu>", off) || input.startsWith("</li>", off) || input.startsWith("</ol>", off) || input.startsWith("</ul>", off) || input.startsWith("<li>", off) || input.startsWith("<li ", off) || input.startsWith("<li/", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</li>", off)) { off += 5; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#4", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#4", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt5(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "dt" || tag.toLowerCase() === "dd")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</dt>", off) || input.startsWith("</dd>", off) || input.startsWith("</dl>", off) || input.startsWith("<dt>", off) || input.startsWith("<dt ", off) || input.startsWith("<dt/", off) || input.startsWith("<dd>", off) || input.startsWith("<dd ", off) || input.startsWith("<dd/", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</dt>", off)) { off += 5; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</dd>", off)) { off += 5; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#5", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#5", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt6(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "tr")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</tbody>", off) || input.startsWith("</thead>", off) || input.startsWith("</tfoot>", off) || input.startsWith("</table>", off) || input.startsWith("<tbody>", off) || input.startsWith("<tbody ", off) || input.startsWith("<thead>", off) || input.startsWith("<thead ", off) || input.startsWith("<tfoot>", off) || input.startsWith("<tfoot ", off) || input.startsWith("</tr>", off) || input.startsWith("<tr>", off) || input.startsWith("<tr ", off) || input.startsWith("<tr/", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</tr>", off)) { off += 5; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#6", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#6", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt7(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "td" || tag.toLowerCase() === "th")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</tbody>", off) || input.startsWith("</thead>", off) || input.startsWith("</tfoot>", off) || input.startsWith("</table>", off) || input.startsWith("<tbody>", off) || input.startsWith("<tbody ", off) || input.startsWith("<thead>", off) || input.startsWith("<thead ", off) || input.startsWith("<tfoot>", off) || input.startsWith("<tfoot ", off) || input.startsWith("</td>", off) || input.startsWith("</th>", off) || input.startsWith("</tr>", off) || input.startsWith("<td>", off) || input.startsWith("<td ", off) || input.startsWith("<td/", off) || input.startsWith("<th>", off) || input.startsWith("<th ", off) || input.startsWith("<th/", off) || input.startsWith("<tr>", off) || input.startsWith("<tr ", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</td>", off)) { off += 5; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</th>", off)) { off += 5; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#7", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#7", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt8(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "p")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("<blockquote>", off) || input.startsWith("<blockquote ", off) || input.startsWith("<section>", off) || input.startsWith("<section ", off) || input.startsWith("<article>", off) || input.startsWith("<article ", off) || input.startsWith("<address>", off) || input.startsWith("<address ", off) || input.startsWith("<header>", off) || input.startsWith("<header ", off) || input.startsWith("<footer>", off) || input.startsWith("<footer ", off) || input.startsWith("<table>", off) || input.startsWith("<table ", off) || input.startsWith("<aside>", off) || input.startsWith("<aside ", off) || input.startsWith("<form>", off) || input.startsWith("<form ", off) || input.startsWith("<div>", off) || input.startsWith("<div ", off) || input.startsWith("<pre>", off) || input.startsWith("<pre ", off) || input.startsWith("<nav>", off) || input.startsWith("<nav ", off) || input.startsWith("</p>", off) || input.startsWith("<ul>", off) || input.startsWith("<ul ", off) || input.startsWith("<ol>", off) || input.startsWith("<ol ", off) || input.startsWith("<dl>", off) || input.startsWith("<dl ", off) || input.startsWith("<h1>", off) || input.startsWith("<h1 ", off) || input.startsWith("<h2>", off) || input.startsWith("<h2 ", off) || input.startsWith("<h3>", off) || input.startsWith("<h3 ", off) || input.startsWith("<h4>", off) || input.startsWith("<h4 ", off) || input.startsWith("<h5>", off) || input.startsWith("<h5 ", off) || input.startsWith("<h6>", off) || input.startsWith("<h6 ", off) || input.startsWith("<hr>", off) || input.startsWith("<hr ", off) || input.startsWith("<hr/", off) || input.startsWith("<p>", off) || input.startsWith("<p ", off) || input.startsWith("<p/", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</p>", off)) { off += 4; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#8", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#8", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt9(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "option" || tag.toLowerCase() === "optgroup")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</optgroup>", off) || input.startsWith("</datalist>", off) || input.startsWith("<optgroup>", off) || input.startsWith("<optgroup ", off) || input.startsWith("</option>", off) || input.startsWith("</select>", off) || input.startsWith("<option>", off) || input.startsWith("<option ", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</option>", off)) { off += 9; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</optgroup>", off)) { off += 11; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#9", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#9", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt10(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "html")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</html>", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</html>", off)) { off += 7; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#10", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#10", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt11(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "head")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</head>", off) || input.startsWith("<body>", off) || input.startsWith("<body ", off) || input.startsWith("<body/", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</head>", off)) { off += 7; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#11", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#11", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt12(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "tbody")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</tbody>", off) || input.startsWith("</table>", off) || input.startsWith("<tbody>", off) || input.startsWith("<tbody ", off) || input.startsWith("<tfoot>", off) || input.startsWith("<tfoot ", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</tbody>", off)) { off += 8; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#12", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#12", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt13(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "thead")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</thead>", off) || input.startsWith("</table>", off) || input.startsWith("<tbody>", off) || input.startsWith("<tbody ", off) || input.startsWith("<tfoot>", off) || input.startsWith("<tfoot ", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</thead>", off)) { off += 8; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#13", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#13", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt14(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "tfoot")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</tfoot>", off) || input.startsWith("</table>", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</tfoot>", off)) { off += 8; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#14", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#14", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt15(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "body")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    if (off < len) {
      const __sb = input.charCodeAt(off);
      if (__sb === 60 && (input.startsWith("</body>", off) || input.startsWith("</html>", off))) break;
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
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (input.startsWith("</body>", off)) { off += 7; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#15", tag: tag, attrs: attrs, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#15", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElement__alt16(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __attrs_start = off;
  const attrs: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseAttribute(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    attrs.push(__cand);
    if (off === __loopStart) break;
  }
  const __attrs_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __children_start = off;
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 60) {
        __cand = parseComment(state);
        if (__cand === null) { __cand = parseDoctype(state); }
        if (__cand === null) { __cand = parseHtmlElement(state); }
      } else {
        __cand = parseTextNode(state);
      }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    children.push(__cand);
    if (off === __loopStart) break;
  }
  const __children_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __closeTag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __closeTag_end = off;
  const closeTag = input.slice(__closeTag_start, __closeTag_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "HtmlElement#16", tag: tag, attrs: attrs, children: children, closeTag: closeTag };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "HtmlElement#16", tag: tag, attrs: attrs, children: children, closeTag: closeTag };
}

function parseHtmlElement(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 60) {
  { const r = parseHtmlElement__alt0(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt5(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt7(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt9(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt4(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt6(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt8(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt10(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt11(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt12(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt13(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt14(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt15(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt1(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt2(state); if (r !== null) return r; }
  { const r = parseHtmlElement__alt16(state); if (r !== null) return r; }
  return parseHtmlElement__alt3(state);
}
  return null;
}

function parseTextNode(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let value: string = '';
  let __value_start = off;
  let __value_end = off;
  {
    __value_start = off;
    let __earliest = len;
    for (let __i = __value_start; __i < len; __i++) {
      const __c = input.charCodeAt(__i);
      if (__c === 60) { __earliest = __i; break; }
    }
    off = __earliest;
    __value_end = off;
    value = input.slice(__value_start, __value_end);
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "TextNode#0", value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "TextNode#0", value: value };
}

function parseAttribute__alt0(state: State): unknown {
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
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 34)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
      if (__depth === 0 && (__c === 34)) break;
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
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    if (off >= len || __depth !== 0) {
      if (off > state.maxOff) state.maxOff = off;
      state.pos = entryOff;
      return null;
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
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 34)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Attribute#0", name: name, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Attribute#0", name: name, value: value };
}

function parseAttribute__alt1(state: State): unknown {
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
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 39)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
      if (__depth === 0 && (__c === 39)) break;
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
      if (__c === 0x5c && off + 1 < len) {
        __lastNonWs = off + 2;
        off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    if (off >= len || __depth !== 0) {
      if (off > state.maxOff) state.maxOff = off;
      state.pos = entryOff;
      return null;
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
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 39)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Attribute#1", name: name, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Attribute#1", name: name, value: value };
}

function parseAttribute__alt2(state: State): unknown {
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
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let value: string = '';
  let __value_start = off;
  let __value_end = off;
  {
    __value_start = off;
    let __earliest = len;
    for (let __i = __value_start; __i < len; __i++) {
      const __c = input.charCodeAt(__i);
      if (__c === 34 || __c === 39 || __c === 32 || __c === 9 || __c === 10 || __c === 13 || __c === 12 || __c === 62) { __earliest = __i; break; }
      if (__c === 47 && ((__i + 1 < len && input.charCodeAt(__i + 1) === 62))) { __earliest = __i; break; }
    }
    off = __earliest;
    __value_end = off;
    value = input.slice(__value_start, __value_end);
    if (value.length === 0) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Attribute#2", name: name, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Attribute#2", name: name, value: value };
}

function parseAttribute__alt3(state: State): unknown {
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
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Attribute#3", name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Attribute#3", name: name };
}

function parseAttribute(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  { const r = parseAttribute__alt0(state); if (r !== null) return r; }
  { const r = parseAttribute__alt1(state); if (r !== null) return r; }
  { const r = parseAttribute__alt2(state); if (r !== null) return r; }
  return parseAttribute__alt3(state);
}
  return null;
}

const __defaultTarget: string | undefined = undefined;

function __build_HtmlDocument_0_ast(captures: any): any {
  return { nodeName: "#document", mode: "no-quirks", childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlDocument_0_source(captures: any): any {
  return String((captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))));
}

function __build_Doctype_0_ast(captures: any): any {
  return { _kind: "doctype", _keyword: __renderSlot_ast(captures.keyword), nodeName: "#documentType", name: __renderSlot_ast(captures.name), publicId: "", systemId: "", parentNode: null };
}

function __build_Doctype_0_source(captures: any): any {
  return "<!" + (__renderSlot_source(captures.keyword) ?? "") + " " + (__renderSlot_source(captures.name) ?? "") + ">";
}

function __build_Doctype_1_ast(captures: any): any {
  return { _kind: "doctype-incomplete", _keyword: __renderSlot_ast(captures.keyword), nodeName: "#documentType", name: __renderSlot_ast(captures.name), publicId: "", systemId: "", parentNode: null };
}

function __build_Doctype_1_source(captures: any): any {
  return "<!" + (__renderSlot_source(captures.keyword) ?? "") + " " + (__renderSlot_source(captures.name) ?? "");
}

function __build_Comment_0_ast(captures: any): any {
  return { nodeName: "#comment", data: __renderSlot_ast(captures.data), parentNode: null };
}

function __build_Comment_0_source(captures: any): any {
  return "<!--" + (__renderSlot_source(captures.data) ?? "") + "-->";
}

function __build_HtmlElement_0_ast(captures: any): any {
  return { _kind: "element-rawtext", _closeTag: __renderSlot_ast(captures.closeTag), nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: [{ nodeName: "#text", value: __renderSlot_ast(captures.children), parentNode: null }], parentNode: null };
}

function __build_HtmlElement_0_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (__renderSlot_source(captures.children) ?? "") + "</" + (__renderSlot_source(captures.closeTag) ?? "") + ">";
}

function __build_HtmlElement_1_ast(captures: any): any {
  return { _kind: "element-void", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: [], parentNode: null };
}

function __build_HtmlElement_1_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">";
}

function __build_HtmlElement_2_ast(captures: any): any {
  return { _kind: "element-void-selfclose", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: [], parentNode: null };
}

function __build_HtmlElement_2_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + " />";
}

function __build_HtmlElement_3_ast(captures: any): any {
  return { _kind: "element-selfclose-recovery", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: [], parentNode: null };
}

function __build_HtmlElement_3_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + "/>";
}

function __build_HtmlElement_4_ast(captures: any): any {
  return { _kind: "element-li", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_4_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</li>";
}

function __build_HtmlElement_5_ast(captures: any): any {
  return { _kind: "element-dt-dd", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_5_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</dt>";
}

function __build_HtmlElement_6_ast(captures: any): any {
  return { _kind: "element-tr", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_6_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</tr>";
}

function __build_HtmlElement_7_ast(captures: any): any {
  return { _kind: "element-td-th", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_7_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</td>";
}

function __build_HtmlElement_8_ast(captures: any): any {
  return { _kind: "element-p", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_8_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</p>";
}

function __build_HtmlElement_9_ast(captures: any): any {
  return { _kind: "element-option", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_9_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</option>";
}

function __build_HtmlElement_10_ast(captures: any): any {
  return { _kind: "element-html", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_10_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</html>";
}

function __build_HtmlElement_11_ast(captures: any): any {
  return { _kind: "element-head", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_11_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</head>";
}

function __build_HtmlElement_12_ast(captures: any): any {
  return { _kind: "element-tbody", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_12_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</tbody>";
}

function __build_HtmlElement_13_ast(captures: any): any {
  return { _kind: "element-thead", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_13_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</thead>";
}

function __build_HtmlElement_14_ast(captures: any): any {
  return { _kind: "element-tfoot", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_14_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</tfoot>";
}

function __build_HtmlElement_15_ast(captures: any): any {
  return { _kind: "element-body", nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_15_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</body>";
}

function __build_HtmlElement_16_ast(captures: any): any {
  return { _kind: "element", _closeTag: __renderSlot_ast(captures.closeTag), nodeName: __renderSlot_ast(captures.tag), tagName: __renderSlot_ast(captures.tag), namespaceURI: "http://www.w3.org/1999/xhtml", attrs: __renderSlot_ast(captures.attrs), childNodes: __renderSlot_ast(captures.children), parentNode: null };
}

function __build_HtmlElement_16_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))) + "</" + (__renderSlot_source(captures.closeTag) ?? "") + ">";
}

function __build_TextNode_0_ast(captures: any): any {
  return { nodeName: "#text", value: __renderSlot_ast(captures.value), parentNode: null };
}

function __build_TextNode_0_source(captures: any): any {
  return String((__renderSlot_source(captures.value) ?? ""));
}

function __build_Attribute_0_ast(captures: any): any {
  return { _quote: "double", name: __renderSlot_ast(captures.name), value: __renderSlot_ast(captures.value) };
}

function __build_Attribute_0_source(captures: any): any {
  return (__renderSlot_source(captures.name) ?? "") + "=\"" + (__renderSlot_source(captures.value) ?? "") + "\"";
}

function __build_Attribute_1_ast(captures: any): any {
  return { _quote: "single", name: __renderSlot_ast(captures.name), value: __renderSlot_ast(captures.value) };
}

function __build_Attribute_1_source(captures: any): any {
  return (__renderSlot_source(captures.name) ?? "") + "='" + (__renderSlot_source(captures.value) ?? "") + "'";
}

function __build_Attribute_2_ast(captures: any): any {
  return { _quote: "none", name: __renderSlot_ast(captures.name), value: __renderSlot_ast(captures.value) };
}

function __build_Attribute_2_source(captures: any): any {
  return (__renderSlot_source(captures.name) ?? "") + "=" + (__renderSlot_source(captures.value) ?? "");
}

function __build_Attribute_3_ast(captures: any): any {
  return { name: __renderSlot_ast(captures.name), value: "" };
}

function __build_Attribute_3_source(captures: any): any {
  return String((__renderSlot_source(captures.name) ?? ""));
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "HtmlDocument#0": return __build_HtmlDocument_0_ast(captures);
    case "Doctype#0": return __build_Doctype_0_ast(captures);
    case "Doctype#1": return __build_Doctype_1_ast(captures);
    case "Comment#0": return __build_Comment_0_ast(captures);
    case "HtmlElement#0": return __build_HtmlElement_0_ast(captures);
    case "HtmlElement#1": return __build_HtmlElement_1_ast(captures);
    case "HtmlElement#2": return __build_HtmlElement_2_ast(captures);
    case "HtmlElement#3": return __build_HtmlElement_3_ast(captures);
    case "HtmlElement#4": return __build_HtmlElement_4_ast(captures);
    case "HtmlElement#5": return __build_HtmlElement_5_ast(captures);
    case "HtmlElement#6": return __build_HtmlElement_6_ast(captures);
    case "HtmlElement#7": return __build_HtmlElement_7_ast(captures);
    case "HtmlElement#8": return __build_HtmlElement_8_ast(captures);
    case "HtmlElement#9": return __build_HtmlElement_9_ast(captures);
    case "HtmlElement#10": return __build_HtmlElement_10_ast(captures);
    case "HtmlElement#11": return __build_HtmlElement_11_ast(captures);
    case "HtmlElement#12": return __build_HtmlElement_12_ast(captures);
    case "HtmlElement#13": return __build_HtmlElement_13_ast(captures);
    case "HtmlElement#14": return __build_HtmlElement_14_ast(captures);
    case "HtmlElement#15": return __build_HtmlElement_15_ast(captures);
    case "HtmlElement#16": return __build_HtmlElement_16_ast(captures);
    case "TextNode#0": return __build_TextNode_0_ast(captures);
    case "Attribute#0": return __build_Attribute_0_ast(captures);
    case "Attribute#1": return __build_Attribute_1_ast(captures);
    case "Attribute#2": return __build_Attribute_2_ast(captures);
    case "Attribute#3": return __build_Attribute_3_ast(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "HtmlDocument#0": return __build_HtmlDocument_0_source(captures);
    case "Doctype#0": return __build_Doctype_0_source(captures);
    case "Doctype#1": return __build_Doctype_1_source(captures);
    case "Comment#0": return __build_Comment_0_source(captures);
    case "HtmlElement#0": return __build_HtmlElement_0_source(captures);
    case "HtmlElement#1": return __build_HtmlElement_1_source(captures);
    case "HtmlElement#2": return __build_HtmlElement_2_source(captures);
    case "HtmlElement#3": return __build_HtmlElement_3_source(captures);
    case "HtmlElement#4": return __build_HtmlElement_4_source(captures);
    case "HtmlElement#5": return __build_HtmlElement_5_source(captures);
    case "HtmlElement#6": return __build_HtmlElement_6_source(captures);
    case "HtmlElement#7": return __build_HtmlElement_7_source(captures);
    case "HtmlElement#8": return __build_HtmlElement_8_source(captures);
    case "HtmlElement#9": return __build_HtmlElement_9_source(captures);
    case "HtmlElement#10": return __build_HtmlElement_10_source(captures);
    case "HtmlElement#11": return __build_HtmlElement_11_source(captures);
    case "HtmlElement#12": return __build_HtmlElement_12_source(captures);
    case "HtmlElement#13": return __build_HtmlElement_13_source(captures);
    case "HtmlElement#14": return __build_HtmlElement_14_source(captures);
    case "HtmlElement#15": return __build_HtmlElement_15_source(captures);
    case "HtmlElement#16": return __build_HtmlElement_16_source(captures);
    case "TextNode#0": return __build_TextNode_0_source(captures);
    case "Attribute#0": return __build_Attribute_0_source(captures);
    case "Attribute#1": return __build_Attribute_1_source(captures);
    case "Attribute#2": return __build_Attribute_2_source(captures);
    case "Attribute#3": return __build_Attribute_3_source(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'source'");
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

function __renderSlot_source(v: any): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_source(v[i]));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_source(v);
  }
  return v;
}

const __renderDispatch: Record<string, (captures: any) => any> = {
  "ast": (captures: any) => __dispatchRender_ast(captures),
  "source": (captures: any) => __dispatchRender_source(captures),
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

function __rebuild_HtmlDocument_0(captures: any): string {
  return String((captures.children == null ? "" : __rebuildSlot(captures.children, " ")));
}

function __rebuild_Doctype_0(captures: any): string {
  return "<!" + __rebuildSlot(captures.keyword) + " " + __rebuildSlot(captures.name) + ">";
}

function __rebuild_Doctype_1(captures: any): string {
  return "<!" + __rebuildSlot(captures.keyword) + " " + __rebuildSlot(captures.name);
}

function __rebuild_Comment_0(captures: any): string {
  return "<!--" + __rebuildSlot(captures.data) + "-->";
}

function __rebuild_HtmlElement_0(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + ">" + __rebuildSlot(captures.children) + "</" + __rebuildSlot(captures.closeTag) + ">";
}

function __rebuild_HtmlElement_1(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + ">";
}

function __rebuild_HtmlElement_2(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + " " + "/>";
}

function __rebuild_HtmlElement_3(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + "/>";
}

function __rebuild_HtmlElement_4(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</li>";
}

function __rebuild_HtmlElement_5(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</dt>" + "</dd>";
}

function __rebuild_HtmlElement_6(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</tr>";
}

function __rebuild_HtmlElement_7(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</td>" + "</th>";
}

function __rebuild_HtmlElement_8(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</p>";
}

function __rebuild_HtmlElement_9(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</option>" + "</optgroup>";
}

function __rebuild_HtmlElement_10(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</html>";
}

function __rebuild_HtmlElement_11(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</head>";
}

function __rebuild_HtmlElement_12(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</tbody>";
}

function __rebuild_HtmlElement_13(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</thead>";
}

function __rebuild_HtmlElement_14(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</tfoot>";
}

function __rebuild_HtmlElement_15(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</body>";
}

function __rebuild_HtmlElement_16(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + (captures.attrs == null ? "" : __rebuildSlot(captures.attrs, " ")) + (captures.children == null ? "" : ">" + __rebuildSlot(captures.children, " ")) + "</" + __rebuildSlot(captures.closeTag) + ">";
}

function __rebuild_TextNode_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_Attribute_0(captures: any): string {
  return __rebuildSlot(captures.name) + "=" + "\"" + __rebuildSlot(captures.value) + "\"";
}

function __rebuild_Attribute_1(captures: any): string {
  return __rebuildSlot(captures.name) + "=" + "'" + __rebuildSlot(captures.value) + "'";
}

function __rebuild_Attribute_2(captures: any): string {
  return __rebuildSlot(captures.name) + "=" + __rebuildSlot(captures.value);
}

function __rebuild_Attribute_3(captures: any): string {
  return String(__rebuildSlot(captures.name));
}

function __invert_HtmlDocument_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.nodeName, "#document")) {
    throw new Error("stringify: field \"nodeName\" expected \"#document\", got " + JSON.stringify(value.nodeName));
  }
  if (!Object.is(value.mode, "no-quirks")) {
    throw new Error("stringify: field \"mode\" expected \"no-quirks\", got " + JSON.stringify(value.mode));
  }
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlDocument_0(captures);
}

function __invert_Doctype_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "doctype")) {
    throw new Error("stringify: field \"_kind\" expected \"doctype\", got " + JSON.stringify(value._kind));
  }
  captures.keyword = __invertSlotLeaf_ast(value._keyword);
  if (!Object.is(value.nodeName, "#documentType")) {
    throw new Error("stringify: field \"nodeName\" expected \"#documentType\", got " + JSON.stringify(value.nodeName));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  if (!Object.is(value.publicId, "")) {
    throw new Error("stringify: field \"publicId\" expected \"\", got " + JSON.stringify(value.publicId));
  }
  if (!Object.is(value.systemId, "")) {
    throw new Error("stringify: field \"systemId\" expected \"\", got " + JSON.stringify(value.systemId));
  }
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_Doctype_0(captures);
}

function __invert_Doctype_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "doctype-incomplete")) {
    throw new Error("stringify: field \"_kind\" expected \"doctype-incomplete\", got " + JSON.stringify(value._kind));
  }
  captures.keyword = __invertSlotLeaf_ast(value._keyword);
  if (!Object.is(value.nodeName, "#documentType")) {
    throw new Error("stringify: field \"nodeName\" expected \"#documentType\", got " + JSON.stringify(value.nodeName));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  if (!Object.is(value.publicId, "")) {
    throw new Error("stringify: field \"publicId\" expected \"\", got " + JSON.stringify(value.publicId));
  }
  if (!Object.is(value.systemId, "")) {
    throw new Error("stringify: field \"systemId\" expected \"\", got " + JSON.stringify(value.systemId));
  }
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_Doctype_1(captures);
}

function __invert_Comment_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.nodeName, "#comment")) {
    throw new Error("stringify: field \"nodeName\" expected \"#comment\", got " + JSON.stringify(value.nodeName));
  }
  captures.data = __invertSlotLeaf_ast(value.data);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_Comment_0(captures);
}

function __invert_HtmlElement_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-rawtext")) {
    throw new Error("stringify: field \"_kind\" expected \"element-rawtext\", got " + JSON.stringify(value._kind));
  }
  captures.closeTag = __invertSlotLeaf_ast(value._closeTag);
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  if (!Array.isArray(value.childNodes) || value.childNodes.length !== 1) {
    throw new Error("stringify: expected array of length 1, got " + (Array.isArray(value.childNodes) ? ("length " + value.childNodes.length) : typeof value.childNodes));
  }
  if (value.childNodes[0] === null || typeof value.childNodes[0] !== "object" || Array.isArray(value.childNodes[0])) {
    throw new Error("stringify: expected object value, got " + typeof value.childNodes[0]);
  }
  if (!Object.is(value.childNodes[0].nodeName, "#text")) {
    throw new Error("stringify: field \"nodeName\" expected \"#text\", got " + JSON.stringify(value.childNodes[0].nodeName));
  }
  captures.children = __invertSlotLeaf_ast(value.childNodes[0].value);
  if (!Object.is(value.childNodes[0].parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.childNodes[0].parentNode));
  }
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_0(captures);
}

function __invert_HtmlElement_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-void")) {
    throw new Error("stringify: field \"_kind\" expected \"element-void\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  if (!Array.isArray(value.childNodes) || value.childNodes.length !== 0) {
    throw new Error("stringify: expected array of length 0, got " + (Array.isArray(value.childNodes) ? ("length " + value.childNodes.length) : typeof value.childNodes));
  }
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_1(captures);
}

function __invert_HtmlElement_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-void-selfclose")) {
    throw new Error("stringify: field \"_kind\" expected \"element-void-selfclose\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  if (!Array.isArray(value.childNodes) || value.childNodes.length !== 0) {
    throw new Error("stringify: expected array of length 0, got " + (Array.isArray(value.childNodes) ? ("length " + value.childNodes.length) : typeof value.childNodes));
  }
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_2(captures);
}

function __invert_HtmlElement_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-selfclose-recovery")) {
    throw new Error("stringify: field \"_kind\" expected \"element-selfclose-recovery\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  if (!Array.isArray(value.childNodes) || value.childNodes.length !== 0) {
    throw new Error("stringify: expected array of length 0, got " + (Array.isArray(value.childNodes) ? ("length " + value.childNodes.length) : typeof value.childNodes));
  }
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_3(captures);
}

function __invert_HtmlElement_4_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-li")) {
    throw new Error("stringify: field \"_kind\" expected \"element-li\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_4(captures);
}

function __invert_HtmlElement_5_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-dt-dd")) {
    throw new Error("stringify: field \"_kind\" expected \"element-dt-dd\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_5(captures);
}

function __invert_HtmlElement_6_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-tr")) {
    throw new Error("stringify: field \"_kind\" expected \"element-tr\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_6(captures);
}

function __invert_HtmlElement_7_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-td-th")) {
    throw new Error("stringify: field \"_kind\" expected \"element-td-th\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_7(captures);
}

function __invert_HtmlElement_8_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-p")) {
    throw new Error("stringify: field \"_kind\" expected \"element-p\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_8(captures);
}

function __invert_HtmlElement_9_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-option")) {
    throw new Error("stringify: field \"_kind\" expected \"element-option\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_9(captures);
}

function __invert_HtmlElement_10_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-html")) {
    throw new Error("stringify: field \"_kind\" expected \"element-html\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_10(captures);
}

function __invert_HtmlElement_11_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-head")) {
    throw new Error("stringify: field \"_kind\" expected \"element-head\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_11(captures);
}

function __invert_HtmlElement_12_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-tbody")) {
    throw new Error("stringify: field \"_kind\" expected \"element-tbody\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_12(captures);
}

function __invert_HtmlElement_13_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-thead")) {
    throw new Error("stringify: field \"_kind\" expected \"element-thead\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_13(captures);
}

function __invert_HtmlElement_14_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-tfoot")) {
    throw new Error("stringify: field \"_kind\" expected \"element-tfoot\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_14(captures);
}

function __invert_HtmlElement_15_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element-body")) {
    throw new Error("stringify: field \"_kind\" expected \"element-body\", got " + JSON.stringify(value._kind));
  }
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_15(captures);
}

function __invert_HtmlElement_16_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._kind, "element")) {
    throw new Error("stringify: field \"_kind\" expected \"element\", got " + JSON.stringify(value._kind));
  }
  captures.closeTag = __invertSlotLeaf_ast(value._closeTag);
  captures.tag = __invertSlotLeaf_ast(value.nodeName);
  captures.tag = __invertSlotLeaf_ast(value.tagName);
  if (!Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml")) {
    throw new Error("stringify: field \"namespaceURI\" expected \"http://www.w3.org/1999/xhtml\", got " + JSON.stringify(value.namespaceURI));
  }
  captures.attrs = __invertSlotFor_Attribute_ast(value.attrs);
  captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(value.childNodes);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_HtmlElement_16(captures);
}

function __invert_TextNode_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.nodeName, "#text")) {
    throw new Error("stringify: field \"nodeName\" expected \"#text\", got " + JSON.stringify(value.nodeName));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  if (!Object.is(value.parentNode, null)) {
    throw new Error("stringify: field \"parentNode\" expected null, got " + JSON.stringify(value.parentNode));
  }
  return __rebuild_TextNode_0(captures);
}

function __invert_Attribute_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._quote, "double")) {
    throw new Error("stringify: field \"_quote\" expected \"double\", got " + JSON.stringify(value._quote));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_Attribute_0(captures);
}

function __invert_Attribute_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._quote, "single")) {
    throw new Error("stringify: field \"_quote\" expected \"single\", got " + JSON.stringify(value._quote));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_Attribute_1(captures);
}

function __invert_Attribute_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value._quote, "none")) {
    throw new Error("stringify: field \"_quote\" expected \"none\", got " + JSON.stringify(value._quote));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_Attribute_2(captures);
}

function __invert_Attribute_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  if (!Object.is(value.value, "")) {
    throw new Error("stringify: field \"value\" expected \"\", got " + JSON.stringify(value.value));
  }
  return __rebuild_Attribute_3(captures);
}

function __invert_HtmlDocument_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos >= __s.length) {
    captures.children = null;
  } else {
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos));
    __pos = __s.length;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlDocument_0(captures);
}

function __invert_Doctype_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<!", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<!\" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture keyword");
    }
    captures.keyword = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \">\" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Doctype_0(captures);
}

function __invert_Doctype_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<!", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<!\" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture keyword");
    }
    captures.keyword = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.name = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Doctype_1(captures);
}

function __invert_Comment_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<!--", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<!--\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("-->", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"-->\" after capture data");
    }
    captures.data = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 3;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Comment_0(captures);
}

function __invert_HtmlElement_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \">\" after capture tag");
    }
    captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf("</", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</\" after capture children");
    }
    captures.children = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \">\" after capture closeTag");
    }
    captures.closeTag = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_0(captures);
}

function __invert_HtmlElement_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \">\" after capture tag");
    }
    captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_1(captures);
}

function __invert_HtmlElement_2_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(" />", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" />\" after capture tag");
    }
    captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 3;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_2(captures);
}

function __invert_HtmlElement_3_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf("/>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"/>\" after capture tag");
    }
    captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_3(captures);
}

function __invert_HtmlElement_4_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</li>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</li>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_4(captures);
}

function __invert_HtmlElement_5_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</dt>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</dt>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_5(captures);
}

function __invert_HtmlElement_6_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</tr>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</tr>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_6(captures);
}

function __invert_HtmlElement_7_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</td>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</td>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_7(captures);
}

function __invert_HtmlElement_8_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</p>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</p>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_8(captures);
}

function __invert_HtmlElement_9_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</option>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</option>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 9;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_9(captures);
}

function __invert_HtmlElement_10_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</html>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</html>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_10(captures);
}

function __invert_HtmlElement_11_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</head>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</head>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_11(captures);
}

function __invert_HtmlElement_12_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</tbody>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</tbody>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 8;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_12(captures);
}

function __invert_HtmlElement_13_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</thead>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</thead>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 8;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_13(captures);
}

function __invert_HtmlElement_14_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</tfoot>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</tfoot>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 8;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_14(captures);
}

function __invert_HtmlElement_15_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.children = null;
    } else {
      captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  {
    const __end = __s.indexOf("</body>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</body>\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_15(captures);
}

function __invert_HtmlElement_16_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \">\" after capture tag");
    }
    captures.tag = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf("</", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</\" after capture children");
    }
    captures.children = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \">\" after capture closeTag");
    }
    captures.closeTag = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_HtmlElement_16(captures);
}

function __invert_TextNode_0_source(value: any): string {
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
  return __rebuild_TextNode_0(captures);
}

function __invert_Attribute_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf("=\"", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"=\\\"\" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("\"", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\"\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Attribute_0(captures);
}

function __invert_Attribute_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf("='", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"='\" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("'", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"'\" after capture value");
    }
    captures.value = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Attribute_1(captures);
}

function __invert_Attribute_2_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf("=", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"=\" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Attribute_2(captures);
}

function __invert_Attribute_3_source(value: any): string {
  const captures: any = {};
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
  return __rebuild_Attribute_3(captures);
}

function __dispatchInverse_HtmlDocument_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.nodeName, "#document") && Object.is(value.mode, "no-quirks") && Object.is(value.parentNode, null)) return __invert_HtmlDocument_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Doctype_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value._kind, "doctype") && Object.is(value.nodeName, "#documentType") && Object.is(value.publicId, "") && Object.is(value.systemId, "") && Object.is(value.parentNode, null)) return __invert_Doctype_0_ast(value);
    if (Object.is(value._kind, "doctype-incomplete") && Object.is(value.nodeName, "#documentType") && Object.is(value.publicId, "") && Object.is(value.systemId, "") && Object.is(value.parentNode, null)) return __invert_Doctype_1_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Comment_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.nodeName, "#comment") && Object.is(value.parentNode, null)) return __invert_Comment_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_HtmlElement_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value._kind, "element-rawtext") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_0_ast(value);
    if (Object.is(value._kind, "element-void") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_1_ast(value);
    if (Object.is(value._kind, "element-void-selfclose") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_2_ast(value);
    if (Object.is(value._kind, "element-selfclose-recovery") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_3_ast(value);
    if (Object.is(value._kind, "element-li") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_4_ast(value);
    if (Object.is(value._kind, "element-dt-dd") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_5_ast(value);
    if (Object.is(value._kind, "element-tr") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_6_ast(value);
    if (Object.is(value._kind, "element-td-th") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_7_ast(value);
    if (Object.is(value._kind, "element-p") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_8_ast(value);
    if (Object.is(value._kind, "element-option") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_9_ast(value);
    if (Object.is(value._kind, "element-html") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_10_ast(value);
    if (Object.is(value._kind, "element-head") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_11_ast(value);
    if (Object.is(value._kind, "element-tbody") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_12_ast(value);
    if (Object.is(value._kind, "element-thead") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_13_ast(value);
    if (Object.is(value._kind, "element-tfoot") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_14_ast(value);
    if (Object.is(value._kind, "element-body") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_15_ast(value);
    if (Object.is(value._kind, "element") && Object.is(value.namespaceURI, "http://www.w3.org/1999/xhtml") && Object.is(value.parentNode, null)) return __invert_HtmlElement_16_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_TextNode_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.nodeName, "#text") && Object.is(value.parentNode, null)) return __invert_TextNode_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Attribute_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value._quote, "double")) return __invert_Attribute_0_ast(value);
    if (Object.is(value._quote, "single")) return __invert_Attribute_1_ast(value);
    if (Object.is(value._quote, "none")) return __invert_Attribute_2_ast(value);
    if (Object.is(value.value, "")) return __invert_Attribute_3_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_HtmlDocument_ast(value);
}

function __dispatchInverse_HtmlDocument_source(value: any): string {
  if (typeof value === "string") {
    return __invert_HtmlDocument_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Doctype_source(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("<!")) return __invert_Doctype_0_source(value);
    if (value.startsWith("<!")) return __invert_Doctype_1_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Comment_source(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("<!--")) return __invert_Comment_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_HtmlElement_source(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("<")) return __invert_HtmlElement_0_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_1_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_2_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_3_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_4_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_5_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_6_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_7_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_8_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_9_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_10_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_11_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_12_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_13_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_14_source(value);
    if (value.startsWith("<")) return __invert_HtmlElement_15_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_TextNode_source(value: any): string {
  if (typeof value === "string") {
    return __invert_TextNode_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Attribute_source(value: any): string {
  if (typeof value === "string") {
    if (value.indexOf("=\"") >= 0) return __invert_Attribute_0_source(value);
    if (value.indexOf("='") >= 0) return __invert_Attribute_1_source(value);
    return __invert_Attribute_2_source(value);
    return __invert_Attribute_3_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_HtmlDocument_source(value);
}

function __invertSlotFor_HtmlDocument_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_HtmlDocument_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_HtmlDocument_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_HtmlDocument_ast(v);
  return String(v);
}

function __invertSlotFor_Doctype_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Doctype_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Doctype_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Doctype_ast(v);
  return String(v);
}

function __invertSlotFor_Comment_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Comment_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Comment_ast(v);
  return String(v);
}

function __invertSlotFor_HtmlElement_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_HtmlElement_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_HtmlElement_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_HtmlElement_ast(v);
  return String(v);
}

function __invertSlotFor_TextNode_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_TextNode_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_TextNode_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_TextNode_ast(v);
  return String(v);
}

function __invertSlotFor_Attribute_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Attribute_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Attribute_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Attribute_ast(v);
  return String(v);
}

function __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Doctype_ast(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Comment_ast(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_HtmlElement_ast(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_TextNode_ast(v); } catch (_e) { /* try next role */ }
    return v;
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_Doctype_ast(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Comment_ast(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_HtmlElement_ast(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_TextNode_ast(v); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: Doctype, Comment, HtmlElement, TextNode; value: " + JSON.stringify(v) + ")");
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

function __invertSlotFor_HtmlDocument_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_HtmlDocument_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_HtmlDocument_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_HtmlDocument_source(v);
  return String(v);
}

function __invertSlotFor_Doctype_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Doctype_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Doctype_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Doctype_source(v);
  return String(v);
}

function __invertSlotFor_Comment_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Comment_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Comment_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Comment_source(v);
  return String(v);
}

function __invertSlotFor_HtmlElement_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_HtmlElement_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_HtmlElement_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_HtmlElement_source(v);
  return String(v);
}

function __invertSlotFor_TextNode_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_TextNode_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_TextNode_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_TextNode_source(v);
  return String(v);
}

function __invertSlotFor_Attribute_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Attribute_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Attribute_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Attribute_source(v);
  return String(v);
}

function __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Doctype_source(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Comment_source(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_HtmlElement_source(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_TextNode_source(v); } catch (_e) { /* try next role */ }
    return v;
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_Doctype_Comment_HtmlElement_TextNode_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_Doctype_source(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_Comment_source(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_HtmlElement_source(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_TextNode_source(v); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: Doctype, Comment, HtmlElement, TextNode; value: " + JSON.stringify(v) + ")");
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
  const result = parseHtmlDocument(state);
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
  const __result = parseHtmlDocument(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/html",
  exportName: 'validate',
};
