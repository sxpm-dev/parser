// Auto-generated from packages/url/src/schema.ts
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

function parsePathSegment(state: State): unknown {
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
    const __captures: any = { __production: "PathSegment#0", value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "PathSegment#0", value: value };
}

function parseHost__alt0(state: State): unknown {
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
  if (!(input.charCodeAt(off) === 46)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tld_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tld_end = off;
  const tld = input.slice(__tld_start, __tld_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Host#0", name: name, tld: tld };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Host#0", name: name, tld: tld };
}

function parseHost__alt1(state: State): unknown {
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
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __port_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __port_end = off;
  const port = input.slice(__port_start, __port_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Host#1", name: name, port: port };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Host#1", name: name, port: port };
}

function parseHost(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  { const r = parseHost__alt0(state); if (r !== null) return r; }
  return parseHost__alt1(state);
}
  return null;
}

function parseQueryPair(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __key_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __key_end = off;
  const key = input.slice(__key_start, __key_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
    const __captures: any = { __production: "QueryPair#0", key: key, value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "QueryPair#0", key: key, value: value };
}

function parseQuery(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __pairs_start = off;
  const pairs: unknown[] = [];
  let __sepConsumed = false;
  let __preSweep = off;
  while (true) {
    const __loopStart = off;
    __preSweep = off;
    __sepConsumed = false;
    // Skip ws before the separator. v1 always allows ws around seps.
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    while (input.charCodeAt(off) === 38) {
      __sepConsumed = true;
      off += 1;
      // Skip ws after the separator.
      while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    }
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseQueryPair(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    pairs.push(__cand);
    if (off === __loopStart) break;
  }
  if (pairs.length < 1) { state.pos = entryOff; return null; }
  const __pairs_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Query#0", pairs: pairs };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Query#0", pairs: pairs };
}

function parseUrl__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __s1_start = off;
  const s1 = parsePathSegment(state);
  if (s1 === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __s1_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __s2_start = off;
  const s2 = parsePathSegment(state);
  if (s2 === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __s2_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 63)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __query_start = off;
  const query = parseQuery(state);
  if (query === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __query_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Url#0", s1: s1, s2: s2, query: query };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Url#0", s1: s1, s2: s2, query: query };
}

function parseUrl__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __protocol_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __protocol_end = off;
  const protocol = input.slice(__protocol_start, __protocol_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __host_start = off;
  const host = parseHost(state);
  if (host === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __host_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __s1_start = off;
  const s1 = parsePathSegment(state);
  if (s1 === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __s1_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Url#1", protocol: protocol, host: host, s1: s1 };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Url#1", protocol: protocol, host: host, s1: s1 };
}

function parseUrl(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 47) {
  return parseUrl__alt0(state);
}
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  return parseUrl__alt1(state);
}
  return null;
}

const __defaultTarget: string | undefined = undefined;

function __build_PathSegment_0_ast(captures: any): any {
  return __renderSlot_ast(captures.value);
}

function __build_PathSegment_0_source(captures: any): any {
  return String((__renderSlot_source(captures.value) ?? ""));
}

function __build_Host_0_ast(captures: any): any {
  return { type: "host", parts: [__renderSlot_ast(captures.name), __renderSlot_ast(captures.tld)] };
}

function __build_Host_0_source(captures: any): any {
  return (__renderSlot_source(captures.name) ?? "") + "." + (__renderSlot_source(captures.tld) ?? "");
}

function __build_Host_1_ast(captures: any): any {
  return { type: "host", parts: [__renderSlot_ast(captures.name)], port: __renderSlot_ast(captures.port) };
}

function __build_Host_1_source(captures: any): any {
  return (__renderSlot_source(captures.name) ?? "") + ":" + (__renderSlot_source(captures.port) ?? "");
}

function __build_QueryPair_0_ast(captures: any): any {
  return { type: "pair", key: __renderSlot_ast(captures.key), value: __renderSlot_ast(captures.value) };
}

function __build_QueryPair_0_source(captures: any): any {
  return (__renderSlot_source(captures.key) ?? "") + "=" + (__renderSlot_source(captures.value) ?? "");
}

function __build_Query_0_ast(captures: any): any {
  return { type: "query", pairs: __renderSlot_ast(captures.pairs) };
}

function __build_Query_0_source(captures: any): any {
  return String((Array.isArray(captures.pairs) ? captures.pairs.map(__renderSlot_source).join("&") : (__renderSlot_source(captures.pairs) ?? "")));
}

function __build_Url_0_ast(captures: any): any {
  return { type: "url", path: [__renderSlot_ast(captures.s1), __renderSlot_ast(captures.s2)], query: __renderSlot_ast(captures.query) };
}

function __build_Url_0_source(captures: any): any {
  return "/" + (__renderSlot_source(captures.s1) ?? "") + "/" + (__renderSlot_source(captures.s2) ?? "") + "?" + (__renderSlot_source(captures.query) ?? "");
}

function __build_Url_1_ast(captures: any): any {
  return { type: "url", protocol: __renderSlot_ast(captures.protocol), host: __renderSlot_ast(captures.host), path: [__renderSlot_ast(captures.s1)] };
}

function __build_Url_1_source(captures: any): any {
  return (__renderSlot_source(captures.protocol) ?? "") + "://" + (__renderSlot_source(captures.host) ?? "") + "/" + (__renderSlot_source(captures.s1) ?? "");
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "PathSegment#0": return __build_PathSegment_0_ast(captures);
    case "Host#0": return __build_Host_0_ast(captures);
    case "Host#1": return __build_Host_1_ast(captures);
    case "QueryPair#0": return __build_QueryPair_0_ast(captures);
    case "Query#0": return __build_Query_0_ast(captures);
    case "Url#0": return __build_Url_0_ast(captures);
    case "Url#1": return __build_Url_1_ast(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "PathSegment#0": return __build_PathSegment_0_source(captures);
    case "Host#0": return __build_Host_0_source(captures);
    case "Host#1": return __build_Host_1_source(captures);
    case "QueryPair#0": return __build_QueryPair_0_source(captures);
    case "Query#0": return __build_Query_0_source(captures);
    case "Url#0": return __build_Url_0_source(captures);
    case "Url#1": return __build_Url_1_source(captures);
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

function __rebuild_PathSegment_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_Host_0(captures: any): string {
  return __rebuildSlot(captures.name) + "." + __rebuildSlot(captures.tld);
}

function __rebuild_Host_1(captures: any): string {
  return __rebuildSlot(captures.name) + ":" + __rebuildSlot(captures.port);
}

function __rebuild_QueryPair_0(captures: any): string {
  return __rebuildSlot(captures.key) + "=" + __rebuildSlot(captures.value);
}

function __rebuild_Query_0(captures: any): string {
  return String(__rebuildSlot(captures.pairs, "&"));
}

function __rebuild_Url_0(captures: any): string {
  return "/" + __rebuildSlot(captures.s1) + "/" + __rebuildSlot(captures.s2) + "?" + __rebuildSlot(captures.query);
}

function __rebuild_Url_1(captures: any): string {
  return __rebuildSlot(captures.protocol) + ":" + "/" + "/" + __rebuildSlot(captures.host) + "/" + __rebuildSlot(captures.s1);
}

function __invert_PathSegment_0_ast(value: any): string {
  const captures: any = {};
  captures.value = __invertSlotLeaf_ast(value);
  return __rebuild_PathSegment_0(captures);
}

function __invert_Host_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "host")) {
    throw new Error("stringify: field \"type\" expected \"host\", got " + JSON.stringify(value.type));
  }
  if (!Array.isArray(value.parts) || value.parts.length !== 2) {
    throw new Error("stringify: expected array of length 2, got " + (Array.isArray(value.parts) ? ("length " + value.parts.length) : typeof value.parts));
  }
  captures.name = __invertSlotLeaf_ast(value.parts[0]);
  captures.tld = __invertSlotLeaf_ast(value.parts[1]);
  return __rebuild_Host_0(captures);
}

function __invert_Host_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "host")) {
    throw new Error("stringify: field \"type\" expected \"host\", got " + JSON.stringify(value.type));
  }
  if (!Array.isArray(value.parts) || value.parts.length !== 1) {
    throw new Error("stringify: expected array of length 1, got " + (Array.isArray(value.parts) ? ("length " + value.parts.length) : typeof value.parts));
  }
  captures.name = __invertSlotLeaf_ast(value.parts[0]);
  captures.port = __invertSlotLeaf_ast(value.port);
  return __rebuild_Host_1(captures);
}

function __invert_QueryPair_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "pair")) {
    throw new Error("stringify: field \"type\" expected \"pair\", got " + JSON.stringify(value.type));
  }
  captures.key = __invertSlotLeaf_ast(value.key);
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_QueryPair_0(captures);
}

function __invert_Query_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "query")) {
    throw new Error("stringify: field \"type\" expected \"query\", got " + JSON.stringify(value.type));
  }
  captures.pairs = __invertSlotFor_QueryPair_ast(value.pairs);
  return __rebuild_Query_0(captures);
}

function __invert_Url_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "url")) {
    throw new Error("stringify: field \"type\" expected \"url\", got " + JSON.stringify(value.type));
  }
  if (!Array.isArray(value.path) || value.path.length !== 2) {
    throw new Error("stringify: expected array of length 2, got " + (Array.isArray(value.path) ? ("length " + value.path.length) : typeof value.path));
  }
  captures.s1 = __invertSlotFor_PathSegment_ast(value.path[0]);
  captures.s2 = __invertSlotFor_PathSegment_ast(value.path[1]);
  captures.query = __invertSlotFor_Query_ast(value.query);
  return __rebuild_Url_0(captures);
}

function __invert_Url_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "url")) {
    throw new Error("stringify: field \"type\" expected \"url\", got " + JSON.stringify(value.type));
  }
  captures.protocol = __invertSlotLeaf_ast(value.protocol);
  captures.host = __invertSlotFor_Host_ast(value.host);
  if (!Array.isArray(value.path) || value.path.length !== 1) {
    throw new Error("stringify: expected array of length 1, got " + (Array.isArray(value.path) ? ("length " + value.path.length) : typeof value.path));
  }
  captures.s1 = __invertSlotFor_PathSegment_ast(value.path[0]);
  return __rebuild_Url_1(captures);
}

function __invert_PathSegment_0_source(value: any): string {
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
  return __rebuild_PathSegment_0(captures);
}

function __invert_Host_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(".", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \".\" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.tld = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Host_0(captures);
}

function __invert_Host_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(":", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \":\" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.port = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Host_1(captures);
}

function __invert_QueryPair_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf("=", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"=\" after capture key");
    }
    captures.key = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_QueryPair_0(captures);
}

function __invert_Query_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.pairs = __invertSlotFor_QueryPair_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Query_0(captures);
}

function __invert_Url_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("/", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"/\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf("/", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"/\" after capture s1");
    }
    captures.s1 = __invertSlotFor_PathSegment_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf("?", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"?\" after capture s2");
    }
    captures.s2 = __invertSlotFor_PathSegment_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.query = __invertSlotFor_Query_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Url_0(captures);
}

function __invert_Url_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf("://", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"://\" after capture protocol");
    }
    captures.protocol = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 3;
  }
  {
    const __end = __s.indexOf("/", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"/\" after capture host");
    }
    captures.host = __invertSlotFor_Host_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.s1 = __invertSlotFor_PathSegment_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Url_1(captures);
}

function __dispatchInverse_PathSegment_ast(value: any): string {
  if (value !== null && value !== undefined && !Array.isArray(value)) {
    return __invert_PathSegment_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Host_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "host") && !("port" in value)) return __invert_Host_0_ast(value);
    if (Object.is(value.type, "host") && "port" in value) return __invert_Host_1_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_QueryPair_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "pair")) return __invert_QueryPair_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Query_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "query")) return __invert_Query_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Url_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "url") && "query" in value && !("protocol" in value) && !("host" in value)) return __invert_Url_0_ast(value);
    if (Object.is(value.type, "url") && "protocol" in value && "host" in value && !("query" in value)) return __invert_Url_1_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Url_ast(value);
}

function __dispatchInverse_PathSegment_source(value: any): string {
  if (typeof value === "string") {
    return __invert_PathSegment_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Host_source(value: any): string {
  if (typeof value === "string") {
    if (value.indexOf(".") >= 0) return __invert_Host_0_source(value);
    if (value.indexOf(":") >= 0) return __invert_Host_1_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_QueryPair_source(value: any): string {
  if (typeof value === "string") {
    if (value.indexOf("=") >= 0) return __invert_QueryPair_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Query_source(value: any): string {
  if (typeof value === "string") {
    return __invert_Query_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Url_source(value: any): string {
  if (typeof value === "string") {
    if (value.indexOf("://") >= 0) return __invert_Url_1_source(value);
    if (value.startsWith("/")) return __invert_Url_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Url_source(value);
}

function __invertSlotFor_PathSegment_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_PathSegment_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_PathSegment_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_PathSegment_ast(v);
  return String(v);
}

function __invertSlotFor_Host_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Host_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Host_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Host_ast(v);
  return String(v);
}

function __invertSlotFor_QueryPair_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_QueryPair_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_QueryPair_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_QueryPair_ast(v);
  return String(v);
}

function __invertSlotFor_Query_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Query_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Query_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Query_ast(v);
  return String(v);
}

function __invertSlotFor_Url_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Url_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Url_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Url_ast(v);
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

function __invertSlotFor_PathSegment_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_PathSegment_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_PathSegment_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_PathSegment_source(v);
  return String(v);
}

function __invertSlotFor_Host_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Host_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Host_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Host_source(v);
  return String(v);
}

function __invertSlotFor_QueryPair_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_QueryPair_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_QueryPair_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_QueryPair_source(v);
  return String(v);
}

function __invertSlotFor_Query_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Query_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Query_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Query_source(v);
  return String(v);
}

function __invertSlotFor_Url_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Url_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Url_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Url_source(v);
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

function __fusedRender_PathSegment_0_source(state: State, out: string[]): boolean {
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

function __fusedRender_Host_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
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
    if (!(input.charCodeAt(off) === 46)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __tld_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __tld_end = off;
    const tld = input.slice(__tld_start, __tld_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(name ?? ""));
    out.push(".");
    out.push(String(tld ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Host_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
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
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __port_start = off;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __port_end = off;
    const port = input.slice(__port_start, __port_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(name ?? ""));
    out.push(":");
    out.push(String(port ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_QueryPair_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __key_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __key_end = off;
    const key = input.slice(__key_start, __key_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __value_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __value_end = off;
    const value = input.slice(__value_start, __value_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(key ?? ""));
    out.push("=");
    out.push(String(value ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Query_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_pairs: string[] = [];
    let __slotMatched_pairs = false;
    // recursive repeats span (QueryPair) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        while (input.charCodeAt(off) === 38) {
          off += 1;
          while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        }
        const __bufLenBefore = __slotBuf_pairs.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_pairs.push("&");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 65) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 66) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 67) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 68) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 69) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 71) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 72) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 73) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 74) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 75) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 76) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 77) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 78) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 79) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 80) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 81) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 82) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 83) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 84) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 85) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 86) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 88) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 89) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 90) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 97) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 98) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 99) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 100) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 101) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 102) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 103) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 104) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 105) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 106) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 107) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 108) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 109) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 110) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 111) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 112) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 113) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 114) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 115) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 116) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 117) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 118) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 119) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 120) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 121) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 122) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_pairs.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_QueryPair_0_source(state, __slotBuf_pairs)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_pairs.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_pairs = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    for (let __i = 0; __i < __slotBuf_pairs.length; __i++) out.push(__slotBuf_pairs[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Url_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_s1: string[] = [];
    let __slotMatched_s1 = false;
    // recursive span (PathSegment) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 45) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 65) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 66) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 67) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 68) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 69) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 70) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 71) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 73) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 74) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 75) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 76) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 78) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 79) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 80) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 81) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 82) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 85) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 86) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 88) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 90) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 95) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 97) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 98) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 99) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 100) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 101) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 102) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 103) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 104) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 105) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 106) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 107) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 108) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 109) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 110) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 111) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 112) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 113) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 114) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 115) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 116) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 117) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 118) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 119) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 120) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 121) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 122) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_s1) __slotBuf_s1.length = 0;
      if (!__slotMatched_s1) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_s2: string[] = [];
    let __slotMatched_s2 = false;
    // recursive span (PathSegment) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 45) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 65) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 66) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 67) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 68) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 69) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 70) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 71) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 73) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 74) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 75) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 76) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 78) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 79) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 80) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 81) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 82) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 85) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 86) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 88) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 90) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 95) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 97) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 98) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 99) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 100) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 101) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 102) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 103) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 104) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 105) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 106) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 107) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 108) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 109) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 110) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 111) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 112) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 113) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 114) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 115) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 116) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 117) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 118) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 119) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 120) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 121) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
        else if (__c0 === 122) {
          if (!__slotMatched_s2) {
            state.pos = __offBefore;
            __slotBuf_s2.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s2)) { __slotMatched_s2 = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_s2) __slotBuf_s2.length = 0;
      if (!__slotMatched_s2) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 63)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_query: string[] = [];
    let __slotMatched_query = false;
    // recursive span (Query) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (!__slotMatched_query) {
          state.pos = __offBefore;
          __slotBuf_query.length = 0;
          if (__fusedRender_Query_0_source(state, __slotBuf_query)) { __slotMatched_query = true; off = state.pos; }
        }
      }
      if (!__slotMatched_query) __slotBuf_query.length = 0;
      if (!__slotMatched_query) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("/");
    for (let __i = 0; __i < __slotBuf_s1.length; __i++) out.push(__slotBuf_s1[__i]);
    out.push("/");
    for (let __i = 0; __i < __slotBuf_s2.length; __i++) out.push(__slotBuf_s2[__i]);
    out.push("?");
    for (let __i = 0; __i < __slotBuf_query.length; __i++) out.push(__slotBuf_query[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Url_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __protocol_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __protocol_end = off;
    const protocol = input.slice(__protocol_start, __protocol_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_host: string[] = [];
    let __slotMatched_host = false;
    // recursive span (Host) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 45) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 65) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 66) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 67) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 68) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 69) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 70) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 71) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 73) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 74) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 75) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 76) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 78) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 79) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 80) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 81) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 82) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 85) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 86) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 88) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 90) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 95) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 97) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 98) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 99) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 100) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 101) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 102) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 103) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 104) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 105) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 106) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 107) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 108) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 109) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 110) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 111) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 112) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 113) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 114) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 115) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 116) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 117) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 118) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 119) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 120) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 121) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
        else if (__c0 === 122) {
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_0_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
          if (!__slotMatched_host) {
            state.pos = __offBefore;
            __slotBuf_host.length = 0;
            if (__fusedRender_Host_1_source(state, __slotBuf_host)) { __slotMatched_host = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_host) __slotBuf_host.length = 0;
      if (!__slotMatched_host) { state.pos = entryOff; return null; }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_s1: string[] = [];
    let __slotMatched_s1 = false;
    // recursive span (PathSegment) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 45) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 65) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 66) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 67) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 68) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 69) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 70) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 71) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 73) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 74) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 75) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 76) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 78) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 79) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 80) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 81) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 82) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 85) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 86) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 88) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 90) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 95) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 97) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 98) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 99) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 100) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 101) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 102) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 103) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 104) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 105) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 106) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 107) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 108) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 109) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 110) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 111) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 112) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 113) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 114) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 115) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 116) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 117) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 118) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 119) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 120) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 121) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
        else if (__c0 === 122) {
          if (!__slotMatched_s1) {
            state.pos = __offBefore;
            __slotBuf_s1.length = 0;
            if (__fusedRender_PathSegment_0_source(state, __slotBuf_s1)) { __slotMatched_s1 = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_s1) __slotBuf_s1.length = 0;
      if (!__slotMatched_s1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(protocol ?? ""));
    out.push("://");
    for (let __i = 0; __i < __slotBuf_host.length; __i++) out.push(__slotBuf_host[__i]);
    out.push("/");
    for (let __i = 0; __i < __slotBuf_s1.length; __i++) out.push(__slotBuf_s1[__i]);
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "PathSegment#0": __fusedRender_PathSegment_0_source,
  "Host#0": __fusedRender_Host_0_source,
  "Host#1": __fusedRender_Host_1_source,
  "QueryPair#0": __fusedRender_QueryPair_0_source,
  "Query#0": __fusedRender_Query_0_source,
  "Url#0": __fusedRender_Url_0_source,
  "Url#1": __fusedRender_Url_1_source,
};

const __rootProductionKey: string = "Url#0";

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
  const result = parseUrl(state);
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
  const __result = parseUrl(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/url",
  exportName: 'validate',
};
