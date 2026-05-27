// Auto-generated from packages/arn/src/schema.ts
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

function parseArnResource__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __kind_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __kind_end = off;
  const kind = input.slice(__kind_start, __kind_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
    const __captures: any = { __production: "ArnResource#0", kind: kind, name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ArnResource#0", kind: kind, name: name };
}

function parseArnResource__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __kind_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __kind_end = off;
  const kind = input.slice(__kind_start, __kind_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
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
    const __captures: any = { __production: "ArnResource#1", kind: kind, name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ArnResource#1", kind: kind, name: name };
}

function parseArnResource__alt2(state: State): unknown {
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
    const __captures: any = { __production: "ArnResource#2", name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "ArnResource#2", name: name };
}

function parseArnResource(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if ((isCssIdentStart(input.charCodeAt(off)))) {
  { const r = parseArnResource__alt0(state); if (r !== null) return r; }
  { const r = parseArnResource__alt1(state); if (r !== null) return r; }
  return parseArnResource__alt2(state);
}
  return null;
}

function parseArn(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("arn", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __partition_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __partition_end = off;
  const partition = input.slice(__partition_start, __partition_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __service_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __service_end = off;
  const service = input.slice(__service_start, __service_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __region_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __region_end = off;
  const region = input.slice(__region_start, __region_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __account_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __account_end = off;
  const account = input.slice(__account_start, __account_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __resource_start = off;
  const resource = parseArnResource(state);
  if (resource === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __resource_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Arn#0", partition: partition, service: service, region: region, account: account, resource: resource };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Arn#0", partition: partition, service: service, region: region, account: account, resource: resource };
}

const __defaultTarget: string | undefined = undefined;

function __build_ArnResource_0_ast(captures: any): any {
  return { type: "resource", kind: __renderSlot_ast(captures.kind), name: __renderSlot_ast(captures.name), separator: ":" };
}

function __build_ArnResource_0_source(captures: any): any {
  return (__renderSlot_source(captures.kind) ?? "") + ":" + (__renderSlot_source(captures.name) ?? "");
}

function __build_ArnResource_1_ast(captures: any): any {
  return { type: "resource", kind: __renderSlot_ast(captures.kind), name: __renderSlot_ast(captures.name), separator: "/" };
}

function __build_ArnResource_1_source(captures: any): any {
  return (__renderSlot_source(captures.kind) ?? "") + "/" + (__renderSlot_source(captures.name) ?? "");
}

function __build_ArnResource_2_ast(captures: any): any {
  return { type: "resource", name: __renderSlot_ast(captures.name) };
}

function __build_ArnResource_2_source(captures: any): any {
  return String((__renderSlot_source(captures.name) ?? ""));
}

function __build_Arn_0_ast(captures: any): any {
  return { type: "arn", partition: __renderSlot_ast(captures.partition), service: __renderSlot_ast(captures.service), region: __renderSlot_ast(captures.region), account: __renderSlot_ast(captures.account), resource: __renderSlot_ast(captures.resource) };
}

function __build_Arn_0_source(captures: any): any {
  return "arn:" + (__renderSlot_source(captures.partition) ?? "") + ":" + (__renderSlot_source(captures.service) ?? "") + ":" + (__renderSlot_source(captures.region) ?? "") + ":" + (__renderSlot_source(captures.account) ?? "") + ":" + (__renderSlot_source(captures.resource) ?? "");
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "ArnResource#0": return __build_ArnResource_0_ast(captures);
    case "ArnResource#1": return __build_ArnResource_1_ast(captures);
    case "ArnResource#2": return __build_ArnResource_2_ast(captures);
    case "Arn#0": return __build_Arn_0_ast(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "ArnResource#0": return __build_ArnResource_0_source(captures);
    case "ArnResource#1": return __build_ArnResource_1_source(captures);
    case "ArnResource#2": return __build_ArnResource_2_source(captures);
    case "Arn#0": return __build_Arn_0_source(captures);
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

function __rebuild_ArnResource_0(captures: any): string {
  return __rebuildSlot(captures.kind) + ":" + __rebuildSlot(captures.name);
}

function __rebuild_ArnResource_1(captures: any): string {
  return __rebuildSlot(captures.kind) + "/" + __rebuildSlot(captures.name);
}

function __rebuild_ArnResource_2(captures: any): string {
  return String(__rebuildSlot(captures.name));
}

function __rebuild_Arn_0(captures: any): string {
  return "arn" + ":" + __rebuildSlot(captures.partition) + ":" + __rebuildSlot(captures.service) + ":" + __rebuildSlot(captures.region) + ":" + __rebuildSlot(captures.account) + ":" + __rebuildSlot(captures.resource);
}

function __invert_ArnResource_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "resource")) {
    throw new Error("stringify: field \"type\" expected \"resource\", got " + JSON.stringify(value.type));
  }
  captures.kind = __invertSlotLeaf_ast(value.kind);
  captures.name = __invertSlotLeaf_ast(value.name);
  if (!Object.is(value.separator, ":")) {
    throw new Error("stringify: field \"separator\" expected \":\", got " + JSON.stringify(value.separator));
  }
  return __rebuild_ArnResource_0(captures);
}

function __invert_ArnResource_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "resource")) {
    throw new Error("stringify: field \"type\" expected \"resource\", got " + JSON.stringify(value.type));
  }
  captures.kind = __invertSlotLeaf_ast(value.kind);
  captures.name = __invertSlotLeaf_ast(value.name);
  if (!Object.is(value.separator, "/")) {
    throw new Error("stringify: field \"separator\" expected \"/\", got " + JSON.stringify(value.separator));
  }
  return __rebuild_ArnResource_1(captures);
}

function __invert_ArnResource_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "resource")) {
    throw new Error("stringify: field \"type\" expected \"resource\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  return __rebuild_ArnResource_2(captures);
}

function __invert_Arn_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "arn")) {
    throw new Error("stringify: field \"type\" expected \"arn\", got " + JSON.stringify(value.type));
  }
  captures.partition = __invertSlotLeaf_ast(value.partition);
  captures.service = __invertSlotLeaf_ast(value.service);
  captures.region = __invertSlotLeaf_ast(value.region);
  captures.account = __invertSlotLeaf_ast(value.account);
  captures.resource = __invertSlotFor_ArnResource_ast(value.resource);
  return __rebuild_Arn_0(captures);
}

function __invert_ArnResource_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(":", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \":\" after capture kind");
    }
    captures.kind = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.name = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_ArnResource_0(captures);
}

function __invert_ArnResource_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf("/", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"/\" after capture kind");
    }
    captures.kind = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.name = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_ArnResource_1(captures);
}

function __invert_ArnResource_2_source(value: any): string {
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
  return __rebuild_ArnResource_2(captures);
}

function __invert_Arn_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("arn:", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"arn:\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf(":", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \":\" after capture partition");
    }
    captures.partition = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(":", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \":\" after capture service");
    }
    captures.service = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(":", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \":\" after capture region");
    }
    captures.region = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(":", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \":\" after capture account");
    }
    captures.account = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.resource = __invertSlotFor_ArnResource_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  return __rebuild_Arn_0(captures);
}

function __dispatchInverse_ArnResource_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "resource") && Object.is(value.separator, ":")) return __invert_ArnResource_0_ast(value);
    if (Object.is(value.type, "resource") && Object.is(value.separator, "/")) return __invert_ArnResource_1_ast(value);
    if (Object.is(value.type, "resource")) return __invert_ArnResource_2_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Arn_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "arn")) return __invert_Arn_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Arn_ast(value);
}

function __dispatchInverse_ArnResource_source(value: any): string {
  if (typeof value === "string") {
    if (value.indexOf(":") >= 0) return __invert_ArnResource_0_source(value);
    if (value.indexOf("/") >= 0) return __invert_ArnResource_1_source(value);
    return __invert_ArnResource_2_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Arn_source(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("arn:")) return __invert_Arn_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Arn_source(value);
}

function __invertSlotFor_ArnResource_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_ArnResource_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_ArnResource_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_ArnResource_ast(v);
  return String(v);
}

function __invertSlotFor_Arn_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Arn_ast(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Arn_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Arn_ast(v);
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

function __invertSlotFor_ArnResource_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_ArnResource_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_ArnResource_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_ArnResource_source(v);
  return String(v);
}

function __invertSlotFor_Arn_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") {
    try { return __dispatchInverse_Arn_source(v); } catch (_e) { return v; }
  }
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Arn_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Arn_source(v);
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

function __fusedRender_ArnResource_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __kind_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __kind_end = off;
    const kind = input.slice(__kind_start, __kind_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __name_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __name_end = off;
    const name = input.slice(__name_start, __name_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(kind ?? ""));
    out.push(":");
    out.push(String(name ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_ArnResource_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __kind_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __kind_end = off;
    const kind = input.slice(__kind_start, __kind_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __name_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __name_end = off;
    const name = input.slice(__name_start, __name_end);
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(kind ?? ""));
    out.push("/");
    out.push(String(name ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_ArnResource_2_source(state: State, out: string[]): boolean {
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
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(name ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_Arn_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("arn", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __partition_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __partition_end = off;
    const partition = input.slice(__partition_start, __partition_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __service_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __service_end = off;
    const service = input.slice(__service_start, __service_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __region_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __region_end = off;
    const region = input.slice(__region_start, __region_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __account_start = off;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __account_end = off;
    const account = input.slice(__account_start, __account_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_resource: string[] = [];
    let __slotMatched_resource = false;
    // recursive span (ArnResource) — fused dispatch
    {
      const __offBefore = off;
      state.pos = off;
      if (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 45) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 65) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 66) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 67) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 68) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 69) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 70) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 71) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 72) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 73) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 74) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 75) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 76) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 77) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 78) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 79) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 80) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 81) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 82) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 83) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 84) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 85) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 86) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 87) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 88) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 89) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 90) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 95) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 97) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 98) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 99) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 100) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 101) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 102) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 103) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 104) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 105) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 106) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 107) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 108) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 109) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 110) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 111) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 112) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 113) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 114) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 115) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 116) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 117) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 118) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 119) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 120) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 121) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
        else if (__c0 === 122) {
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_0_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_1_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
          if (!__slotMatched_resource) {
            state.pos = __offBefore;
            __slotBuf_resource.length = 0;
            if (__fusedRender_ArnResource_2_source(state, __slotBuf_resource)) { __slotMatched_resource = true; off = state.pos; }
          }
        }
      }
      if (!__slotMatched_resource) __slotBuf_resource.length = 0;
      if (!__slotMatched_resource) { state.pos = entryOff; return null; }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("arn:");
    out.push(String(partition ?? ""));
    out.push(":");
    out.push(String(service ?? ""));
    out.push(":");
    out.push(String(region ?? ""));
    out.push(":");
    out.push(String(account ?? ""));
    out.push(":");
    for (let __i = 0; __i < __slotBuf_resource.length; __i++) out.push(__slotBuf_resource[__i]);
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "ArnResource#0": __fusedRender_ArnResource_0_source,
  "ArnResource#1": __fusedRender_ArnResource_1_source,
  "ArnResource#2": __fusedRender_ArnResource_2_source,
  "Arn#0": __fusedRender_Arn_0_source,
};

const __rootProductionKey: string = "Arn#0";

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
  const result = parseArn(state);
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
  const __result = parseArn(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/arn",
  exportName: 'validate',
};
