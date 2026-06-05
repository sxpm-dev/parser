// Auto-generated from packages/json/src/schema.ts
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

function parseJsonNull(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("null", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "JsonNull#0" };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "JsonNull#0" };
}

function parseJsonTrue(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("true", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "JsonTrue#0" };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "JsonTrue#0" };
}

function parseJsonFalse(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("false", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "JsonFalse#0" };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "JsonFalse#0" };
}

function parseJsonValue(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
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
      if (__c0 === 116) {
        __r = parseJsonTrue(state);
      } else if (__c0 === 102) {
        __r = parseJsonFalse(state);
      } else if (__c0 === 110) {
        __r = parseJsonNull(state);
      }
    }
    node = __r;
  }
  if (node === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __node_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "JsonValue#0", node: node };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "JsonValue#0", node: node };
}

const __defaultTarget: string | undefined = "ast";

function __build_JsonNull_0_ast(captures: any, __indentCol: number = 0): any {
  return null;
}

function __build_JsonNull_0_source(captures: any, __indentCol: number = 0): any {
  return "null";
}

function __build_JsonTrue_0_ast(captures: any, __indentCol: number = 0): any {
  return true;
}

function __build_JsonTrue_0_source(captures: any, __indentCol: number = 0): any {
  return "true";
}

function __build_JsonFalse_0_ast(captures: any, __indentCol: number = 0): any {
  return false;
}

function __build_JsonFalse_0_source(captures: any, __indentCol: number = 0): any {
  return "false";
}

function __build_JsonValue_0_ast(captures: any, __indentCol: number = 0): any {
  return __renderSlot_ast(captures.node, __indentCol);
}

function __build_JsonValue_0_source(captures: any, __indentCol: number = 0): any {
  return __renderSlot_source(captures.node, __indentCol);
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "JsonNull#0": return __build_JsonNull_0_ast(captures, __indentCol);
    case "JsonTrue#0": return __build_JsonTrue_0_ast(captures, __indentCol);
    case "JsonFalse#0": return __build_JsonFalse_0_ast(captures, __indentCol);
    case "JsonValue#0": return __build_JsonValue_0_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "JsonNull#0": return __build_JsonNull_0_source(captures, __indentCol);
    case "JsonTrue#0": return __build_JsonTrue_0_source(captures, __indentCol);
    case "JsonFalse#0": return __build_JsonFalse_0_source(captures, __indentCol);
    case "JsonValue#0": return __build_JsonValue_0_source(captures, __indentCol);
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
  // Fused fast path covers BOTH Template-bodied targets (e.g. 'source') AND
  // structurally-fused object-bodied targets (e.g. 'ast' for schemas whose
  // ast body is a structured object with statically resolvable refs). In
  // raws mode the captures path attaches a per-node `source: string` field
  // that the structured-fused emit does not synthesize — skip fusion so the
  // returned shape matches caller expectations.
  if (options?.mode !== 'raws') {
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

function __rebuild_JsonNull_0(captures: any): string {
  return "null";
}

function __rebuild_JsonTrue_0(captures: any): string {
  return "true";
}

function __rebuild_JsonFalse_0(captures: any): string {
  return "false";
}

function __rebuild_JsonValue_0(captures: any): string {
  return String(__rebuildSlot(captures.node));
}

function __invert_JsonNull_0_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, null)) {
    throw new Error("stringify: expected scalar null, got " + JSON.stringify(value));
  }
  return "null";
}

function __invert_JsonTrue_0_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, true)) {
    throw new Error("stringify: expected scalar true, got " + JSON.stringify(value));
  }
  return "true";
}

function __invert_JsonFalse_0_ast(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, false)) {
    throw new Error("stringify: expected scalar false, got " + JSON.stringify(value));
  }
  return "false";
}

function __invert_JsonValue_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  captures.node = __invertSlotMulti_JsonTrue_JsonFalse_JsonNull_ast(value, __indentCol);
  return __rebuild_JsonValue_0(captures, __indentCol);
}

function __invert_JsonNull_0_source(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "null")) {
    throw new Error("stringify: expected scalar \"null\", got " + JSON.stringify(value));
  }
  return "null";
}

function __invert_JsonTrue_0_source(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "true")) {
    throw new Error("stringify: expected scalar \"true\", got " + JSON.stringify(value));
  }
  return "true";
}

function __invert_JsonFalse_0_source(value: any, __indentCol: number = 0): string {
  if (!Object.is(value, "false")) {
    throw new Error("stringify: expected scalar \"false\", got " + JSON.stringify(value));
  }
  return "false";
}

function __invert_JsonValue_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  captures.node = __invertSlotMulti_JsonTrue_JsonFalse_JsonNull_source(value, __indentCol);
  return __rebuild_JsonValue_0(captures, __indentCol);
}

function __dispatchInverse_JsonNull_ast(value: any, __indentCol: number = 0): string {
  if (Object.is(value, null)) return __invert_JsonNull_0_ast(value, __indentCol);
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_JsonTrue_ast(value: any, __indentCol: number = 0): string {
  if (Object.is(value, true)) return __invert_JsonTrue_0_ast(value, __indentCol);
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_JsonFalse_ast(value: any, __indentCol: number = 0): string {
  if (Object.is(value, false)) return __invert_JsonFalse_0_ast(value, __indentCol);
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_JsonValue_ast(value: any, __indentCol: number = 0): string {
  if (value !== undefined) {
    return __invert_JsonValue_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_JsonValue_ast(value, 0);
}

function __dispatchInverse_JsonNull_source(value: any, __indentCol: number = 0): string {
  if (Object.is(value, "null")) return __invert_JsonNull_0_source(value, __indentCol);
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_JsonTrue_source(value: any, __indentCol: number = 0): string {
  if (Object.is(value, "true")) return __invert_JsonTrue_0_source(value, __indentCol);
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_JsonFalse_source(value: any, __indentCol: number = 0): string {
  if (Object.is(value, "false")) return __invert_JsonFalse_0_source(value, __indentCol);
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_JsonValue_source(value: any, __indentCol: number = 0): string {
  if (value !== undefined) {
    return __invert_JsonValue_0_source(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_JsonValue_source(value, 0);
}

function __invertSlotFor_JsonNull_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_JsonNull_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_JsonNull_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_JsonTrue_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_JsonTrue_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_JsonTrue_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_JsonFalse_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_JsonFalse_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_JsonFalse_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_JsonValue_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonValue_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_JsonValue_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_JsonValue_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonValue_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_JsonValue_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_JsonValue_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_JsonTrue_JsonFalse_JsonNull_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_JsonTrue_JsonFalse_JsonNull_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: JsonTrue, JsonFalse, JsonNull; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_JsonTrue_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_ast(v, __indentCol); } catch (_e) { /* try next role */ }
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

function __invertSlotFor_JsonNull_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_JsonNull_source(v[i], __indentCol);
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
    try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_JsonNull_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_JsonTrue_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_JsonTrue_source(v[i], __indentCol);
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
    try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_JsonTrue_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_JsonFalse_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_JsonFalse_source(v[i], __indentCol);
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
    try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_JsonFalse_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_JsonValue_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonValue_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_JsonValue_source(v[i], __indentCol);
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
    try { return __dispatchInverse_JsonValue_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonValue_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_JsonValue_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_JsonValue_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_JsonTrue_JsonFalse_JsonNull_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_JsonTrue_JsonFalse_JsonNull_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: JsonTrue, JsonFalse, JsonNull; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_JsonTrue_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonFalse_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_JsonNull_source(v, __indentCol); } catch (_e) { /* try next role */ }
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

const __rootProductionKey: string = "JsonValue#0";

function __fusedRenderDispatchLookup(target: string): Record<string, (state: State, out: string[]) => boolean> | null {
  switch (target) {
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
  const result = parseJsonValue(state);
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
    indentStack: new Int32Array(16),
    indentStackTop: 0,
  };
  const __result = parseJsonValue(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/json",
  exportName: 'validate',
};
