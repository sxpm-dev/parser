// Auto-generated from packages/proto/src/schema.ts
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

function parseDeclaration__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("syntax", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Declaration#0", value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Declaration#0", value: value };
}

function parseDeclaration__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("package", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 7;
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
  const __version_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __version_end = off;
  const version = input.slice(__version_start, __version_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Declaration#1", name: name, version: version };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Declaration#1", name: name, version: version };
}

function parseDeclaration__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("message", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 7;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 123)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __fields_start = off;
  const fields: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseField(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    fields.push(__cand);
    if (off === __loopStart) break;
  }
  const __fields_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 125)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Declaration#2", name: name, fields: fields };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Declaration#2", name: name, fields: fields };
}

function parseDeclaration(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 115) {
  return parseDeclaration__alt0(state);
}
  if (input.charCodeAt(off) === 112) {
  return parseDeclaration__alt1(state);
}
  if (input.charCodeAt(off) === 109) {
  return parseDeclaration__alt2(state);
}
  return null;
}

function parseField(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __fieldType_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __fieldType_end = off;
  const fieldType = input.slice(__fieldType_start, __fieldType_end);
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
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __number_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __number_end = off;
  const number = input.slice(__number_start, __number_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Field#0", fieldType: fieldType, name: name, number: number };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Field#0", fieldType: fieldType, name: name, number: number };
}

function parseProtoFile(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __declarations_start = off;
  const declarations: unknown[] = [];
  while (true) {
    const __loopStart = off;
    let __cand: unknown = null;
    state.pos = off;
    __cand = parseDeclaration(state);
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    declarations.push(__cand);
    if (off === __loopStart) break;
  }
  if (declarations.length < 1) { state.pos = entryOff; return null; }
  const __declarations_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "ProtoFile#0", declarations: declarations };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ProtoFile#0", declarations: declarations };
}

const __defaultTarget: string | undefined = undefined;

function __build_Declaration_0_ast(captures: any): any {
  return { type: "syntax", value: __renderSlot_ast(captures.value) };
}

function __build_Declaration_0_source(captures: any): any {
  return "syntax = " + (__renderSlot_source(captures.value) ?? "") + ";";
}

function __build_Declaration_1_ast(captures: any): any {
  return { type: "package", name: [__renderSlot_ast(captures.name), __renderSlot_ast(captures.version)] };
}

function __build_Declaration_1_source(captures: any): any {
  return "package " + (__renderSlot_source(captures.name) ?? "") + "." + (__renderSlot_source(captures.version) ?? "") + ";";
}

function __build_Declaration_2_ast(captures: any): any {
  return { type: "message", name: __renderSlot_ast(captures.name), fields: __renderSlot_ast(captures.fields) };
}

function __build_Declaration_2_source(captures: any): any {
  return "message " + (__renderSlot_source(captures.name) ?? "") + " { " + (captures.fields == null ? "" : (Array.isArray(captures.fields) ? captures.fields.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.fields) ?? ""))) + " }";
}

function __build_Field_0_ast(captures: any): any {
  return { type: "field", fieldType: __renderSlot_ast(captures.fieldType), name: __renderSlot_ast(captures.name), number: __renderSlot_ast(captures.number) };
}

function __build_Field_0_source(captures: any): any {
  return (__renderSlot_source(captures.fieldType) ?? "") + " " + (__renderSlot_source(captures.name) ?? "") + " = " + (__renderSlot_source(captures.number) ?? "") + ";";
}

function __build_ProtoFile_0_ast(captures: any): any {
  return { type: "proto-file", declarations: __renderSlot_ast(captures.declarations) };
}

function __build_ProtoFile_0_source(captures: any): any {
  return String((Array.isArray(captures.declarations) ? captures.declarations.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.declarations) ?? "")));
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "Declaration#0": return __build_Declaration_0_ast(captures);
    case "Declaration#1": return __build_Declaration_1_ast(captures);
    case "Declaration#2": return __build_Declaration_2_ast(captures);
    case "Field#0": return __build_Field_0_ast(captures);
    case "ProtoFile#0": return __build_ProtoFile_0_ast(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "Declaration#0": return __build_Declaration_0_source(captures);
    case "Declaration#1": return __build_Declaration_1_source(captures);
    case "Declaration#2": return __build_Declaration_2_source(captures);
    case "Field#0": return __build_Field_0_source(captures);
    case "ProtoFile#0": return __build_ProtoFile_0_source(captures);
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

function __rebuild_Declaration_0(captures: any): string {
  return "syntax" + " " + "=" + " " + __rebuildSlot(captures.value) + ";";
}

function __rebuild_Declaration_1(captures: any): string {
  return "package" + " " + __rebuildSlot(captures.name) + "." + __rebuildSlot(captures.version) + ";";
}

function __rebuild_Declaration_2(captures: any): string {
  return "message" + " " + __rebuildSlot(captures.name) + " " + "{" + (captures.fields == null ? "" : " " + __rebuildSlot(captures.fields, " ")) + " " + "}";
}

function __rebuild_Field_0(captures: any): string {
  return __rebuildSlot(captures.fieldType) + " " + __rebuildSlot(captures.name) + " " + "=" + " " + __rebuildSlot(captures.number) + ";";
}

function __rebuild_ProtoFile_0(captures: any): string {
  return String(__rebuildSlot(captures.declarations, " "));
}

function __invert_Declaration_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "syntax")) {
    throw new Error("stringify: field \"type\" expected \"syntax\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_Declaration_0(captures);
}

function __invert_Declaration_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "package")) {
    throw new Error("stringify: field \"type\" expected \"package\", got " + JSON.stringify(value.type));
  }
  if (!Array.isArray(value.name) || value.name.length !== 2) {
    throw new Error("stringify: expected array of length 2, got " + (Array.isArray(value.name) ? ("length " + value.name.length) : typeof value.name));
  }
  captures.name = __invertSlotLeaf_ast(value.name[0]);
  captures.version = __invertSlotLeaf_ast(value.name[1]);
  return __rebuild_Declaration_1(captures);
}

function __invert_Declaration_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "message")) {
    throw new Error("stringify: field \"type\" expected \"message\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.fields = __invertSlotFor_Field_ast(value.fields);
  return __rebuild_Declaration_2(captures);
}

function __invert_Field_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "field")) {
    throw new Error("stringify: field \"type\" expected \"field\", got " + JSON.stringify(value.type));
  }
  captures.fieldType = __invertSlotLeaf_ast(value.fieldType);
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.number = __invertSlotLeaf_ast(value.number);
  return __rebuild_Field_0(captures);
}

function __invert_ProtoFile_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "proto-file")) {
    throw new Error("stringify: field \"type\" expected \"proto-file\", got " + JSON.stringify(value.type));
  }
  captures.declarations = __invertSlotFor_Declaration_ast(value.declarations);
  return __rebuild_ProtoFile_0(captures);
}

function __invert_Declaration_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("syntax = ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"syntax = \" in template body");
  }
  __pos += 9;
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
  return __rebuild_Declaration_0(captures);
}

function __invert_Declaration_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("package ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"package \" in template body");
  }
  __pos += 8;
  {
    const __end = __s.indexOf(".", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \".\" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(";", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \";\" after capture version");
    }
    captures.version = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Declaration_1(captures);
}

function __invert_Declaration_2_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("message ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"message \" in template body");
  }
  __pos += 8;
  {
    const __end = __s.indexOf(" { ", __pos);
    if (__end < 0) {
      captures.name = __invertSlotLeaf_source(__s.slice(__pos));
      __pos = __s.length;
    captures.fields = null;
    } else {
      captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
      __pos = __end + 3;
    }
  }
  {
    const __end = __s.indexOf(" }", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" }\" after capture fields");
    }
    captures.fields = __invertSlotFor_Field_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Declaration_2(captures);
}

function __invert_Field_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture fieldType");
    }
    captures.fieldType = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" = ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" = \" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 3;
  }
  {
    const __end = __s.indexOf(";", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \";\" after capture number");
    }
    captures.number = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Field_0(captures);
}

function __invert_ProtoFile_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.declarations = __invertSlotFor_Declaration_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_ProtoFile_0(captures);
}

function __dispatchInverse_Declaration_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "syntax")) return __invert_Declaration_0_ast(value);
    if (Object.is(value.type, "package")) return __invert_Declaration_1_ast(value);
    if (Object.is(value.type, "message")) return __invert_Declaration_2_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Field_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "field")) return __invert_Field_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ProtoFile_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "proto-file")) return __invert_ProtoFile_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_ProtoFile_ast(value);
}

function __dispatchInverse_Declaration_source(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("syntax = ")) return __invert_Declaration_0_source(value);
    if (value.startsWith("package ")) return __invert_Declaration_1_source(value);
    if (value.startsWith("message ")) return __invert_Declaration_2_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Field_source(value: any): string {
  if (typeof value === "string") {
    if (value.indexOf(" = ") >= 0) return __invert_Field_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ProtoFile_source(value: any): string {
  if (typeof value === "string") {
    return __invert_ProtoFile_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_ProtoFile_source(value);
}

function __invertSlotFor_Declaration_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Declaration_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Declaration_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Declaration_ast(v);
  return String(v);
}

function __invertSlotFor_Field_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Field_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Field_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Field_ast(v);
  return String(v);
}

function __invertSlotFor_ProtoFile_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_ProtoFile_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_ProtoFile_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_ProtoFile_ast(v);
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

function __invertSlotFor_Declaration_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Declaration_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Declaration_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Declaration_source(v);
  return String(v);
}

function __invertSlotFor_Field_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Field_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Field_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Field_source(v);
  return String(v);
}

function __invertSlotFor_ProtoFile_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_ProtoFile_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_ProtoFile_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_ProtoFile_source(v);
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

function __fusedRender_Declaration_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("syntax", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 61)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
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
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("syntax = ");
    out.push(String(value ?? ""));
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
    if (!(input.startsWith("package", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 7;
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
    const __version_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __version_end = off;
    const version = input.slice(__version_start, __version_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("package ");
    out.push(String(name ?? ""));
    out.push(".");
    out.push(String(version ?? ""));
    out.push(";");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Declaration_2_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("message", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 7;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __name_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __name_end = off;
    const name = input.slice(__name_start, __name_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 123)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_fields: string[] = [];
    let __slotMatched_fields = false;
    // recursive repeats span (Field) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        const __bufLenBefore = __slotBuf_fields.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_fields.push(" ");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 65) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 66) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 67) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 68) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 69) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 70) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 71) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 72) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 73) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 74) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 75) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 76) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 77) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 78) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 79) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 80) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 81) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 82) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 83) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 84) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 85) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 86) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 87) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 88) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 89) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 90) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 97) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 98) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 99) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 100) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 101) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 102) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 103) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 104) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 105) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 106) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 107) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 108) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 109) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 110) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 111) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 112) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 113) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 114) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 115) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 116) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 117) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 118) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 119) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 120) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 121) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 122) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_fields.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Field_0_source(state, __slotBuf_fields)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_fields.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_fields = true;
        if (off === __loopStart) break;
      }
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 125)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("message ");
    out.push(String(name ?? ""));
    out.push(" { ");
    if (__slotMatched_fields) for (let __i = 0; __i < __slotBuf_fields.length; __i++) out.push(__slotBuf_fields[__i]);
    out.push(" }");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Field_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __fieldType_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __fieldType_end = off;
    const fieldType = input.slice(__fieldType_start, __fieldType_end);
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
    if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __number_start = off;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __number_end = off;
    const number = input.slice(__number_start, __number_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(fieldType ?? ""));
    out.push(" ");
    out.push(String(name ?? ""));
    out.push(" = ");
    out.push(String(number ?? ""));
    out.push(";");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_ProtoFile_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_declarations: string[] = [];
    let __slotMatched_declarations = false;
    // recursive repeats span (Declaration) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        const __bufLenBefore = __slotBuf_declarations.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_declarations.push(" ");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 109) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_declarations.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_2_source(state, __slotBuf_declarations)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 112) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_declarations.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_1_source(state, __slotBuf_declarations)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 115) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_declarations.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_Declaration_0_source(state, __slotBuf_declarations)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_declarations.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_declarations = true;
        if (off === __loopStart) break;
      }
      if (__count < 1) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    for (let __i = 0; __i < __slotBuf_declarations.length; __i++) out.push(__slotBuf_declarations[__i]);
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "Declaration#0": __fusedRender_Declaration_0_source,
  "Declaration#1": __fusedRender_Declaration_1_source,
  "Declaration#2": __fusedRender_Declaration_2_source,
  "Field#0": __fusedRender_Field_0_source,
  "ProtoFile#0": __fusedRender_ProtoFile_0_source,
};

const __rootProductionKey: string = "ProtoFile#0";

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
  const result = parseProtoFile(state);
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
  const __result = parseProtoFile(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/proto",
  exportName: 'validate',
};
