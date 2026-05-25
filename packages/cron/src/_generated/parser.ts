// Auto-generated from packages/cron/src/schema.ts
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

function parseCronField__alt0(state: State): unknown {
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
    const __captures: any = { __production: "CronField#0" };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CronField#0" };
}

function parseCronField__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __step_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __step_end = off;
  const step = input.slice(__step_start, __step_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CronField#1", step: step };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CronField#1", step: step };
}

function parseCronField__alt2(state: State): unknown {
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
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CronField#2", value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CronField#2", value: value };
}

function parseCronField__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __start_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __start_end = off;
  const start = input.slice(__start_start, __start_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 45)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && isDigit(input.charCodeAt(off)))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __end_start = off;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __end_end = off;
  const end = input.slice(__end_start, __end_end);
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "CronField#3", start: start, end: end };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CronField#3", start: start, end: end };
}

function parseCronField(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
state.pos = off;
  if (off >= len) return null;
  if (input.charCodeAt(off) === 42) {
  { const r = parseCronField__alt1(state); if (r !== null) return r; }
  return parseCronField__alt0(state);
}
  if (isDigit(input.charCodeAt(off))) {
  { const r = parseCronField__alt3(state); if (r !== null) return r; }
  return parseCronField__alt2(state);
}
  return null;
}

function parseCommandWord(state: State): unknown {
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
    const __captures: any = { __production: "CommandWord#0", value: value };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "CommandWord#0", value: value };
}

function parseCommand(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __words_start = off;
  const words: unknown[] = [];
  {
    state.pos = off;
    const __first = parseCommandWord(state);
    if (__first !== null) {
      words.push(__first);
      off = state.pos;
      while (true) {
        const __sepStart = off;
        // Required ws between children when no explicit separator.
    const __wsStart = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (off === __wsStart) break;
        state.pos = off;
        const __next = parseCommandWord(state);
        if (__next === null) { off = __sepStart; break; }
        words.push(__next);
        off = state.pos;
      }
    }
  }
  const __words_end = off;
  if (words.length < 1) { state.pos = entryOff; return null; }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Command#0", words: words };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Command#0", words: words };
}

function parseCron(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __minute_start = off;
  const minute = parseCronField(state);
  if (minute === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __minute_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __hour_start = off;
  const hour = parseCronField(state);
  if (hour === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __hour_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __dayOfMonth_start = off;
  const dayOfMonth = parseCronField(state);
  if (dayOfMonth === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __dayOfMonth_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __month_start = off;
  const month = parseCronField(state);
  if (month === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __month_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __dayOfWeek_start = off;
  const dayOfWeek = parseCronField(state);
  if (dayOfWeek === null) { state.pos = entryOff; return null; }
  off = state.pos;
  const __dayOfWeek_end = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  state.pos = off;
  const __command_start = off;
  const command = parseCommand(state);
  off = state.pos;
  const __command_end = off;

  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "Cron#0", minute: minute, hour: hour, dayOfMonth: dayOfMonth, month: month, dayOfWeek: dayOfWeek, command: command };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "Cron#0", minute: minute, hour: hour, dayOfMonth: dayOfMonth, month: month, dayOfWeek: dayOfWeek, command: command };
}

const __defaultTarget: string | undefined = undefined;

function __build_CronField_0_ast(captures: any): any {
  return { type: "wildcard" };
}

function __build_CronField_0_source(captures: any): any {
  return String("*");
}

function __build_CronField_1_ast(captures: any): any {
  return { type: "step", step: __renderSlot_ast(captures.step) };
}

function __build_CronField_1_source(captures: any): any {
  return "*/" + (__renderSlot_source(captures.step) ?? "");
}

function __build_CronField_2_ast(captures: any): any {
  return { type: "value", value: __renderSlot_ast(captures.value) };
}

function __build_CronField_2_source(captures: any): any {
  return String((__renderSlot_source(captures.value) ?? ""));
}

function __build_CronField_3_ast(captures: any): any {
  return { type: "range", start: __renderSlot_ast(captures.start), end: __renderSlot_ast(captures.end) };
}

function __build_CronField_3_source(captures: any): any {
  return (__renderSlot_source(captures.start) ?? "") + "-" + (__renderSlot_source(captures.end) ?? "");
}

function __build_CommandWord_0_ast(captures: any): any {
  return __renderSlot_ast(captures.value);
}

function __build_CommandWord_0_source(captures: any): any {
  return String((__renderSlot_source(captures.value) ?? ""));
}

function __build_Command_0_ast(captures: any): any {
  return { type: "command", words: __renderSlot_ast(captures.words) };
}

function __build_Command_0_source(captures: any): any {
  return String((Array.isArray(captures.words) ? captures.words.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.words) ?? "")));
}

function __build_Cron_0_ast(captures: any): any {
  return { type: "cron", minute: __renderSlot_ast(captures.minute), hour: __renderSlot_ast(captures.hour), dayOfMonth: __renderSlot_ast(captures.dayOfMonth), month: __renderSlot_ast(captures.month), dayOfWeek: __renderSlot_ast(captures.dayOfWeek), command: __renderSlot_ast(captures.command) };
}

function __build_Cron_0_source(captures: any): any {
  return (__renderSlot_source(captures.minute) ?? "") + " " + (__renderSlot_source(captures.hour) ?? "") + " " + (__renderSlot_source(captures.dayOfMonth) ?? "") + " " + (__renderSlot_source(captures.month) ?? "") + " " + (__renderSlot_source(captures.dayOfWeek) ?? "") + (captures.command == null ? "" : " " + (__renderSlot_source(captures.command) ?? ""));
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "CronField#0": return __build_CronField_0_ast(captures);
    case "CronField#1": return __build_CronField_1_ast(captures);
    case "CronField#2": return __build_CronField_2_ast(captures);
    case "CronField#3": return __build_CronField_3_ast(captures);
    case "CommandWord#0": return __build_CommandWord_0_ast(captures);
    case "Command#0": return __build_Command_0_ast(captures);
    case "Cron#0": return __build_Cron_0_ast(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_source(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "CronField#0": return __build_CronField_0_source(captures);
    case "CronField#1": return __build_CronField_1_source(captures);
    case "CronField#2": return __build_CronField_2_source(captures);
    case "CronField#3": return __build_CronField_3_source(captures);
    case "CommandWord#0": return __build_CommandWord_0_source(captures);
    case "Command#0": return __build_Command_0_source(captures);
    case "Cron#0": return __build_Cron_0_source(captures);
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

export function render(input: string, options?: { type?: string }): unknown {
  const target = options?.type ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.type or set defaultTarget on the schema");
  }
  const fn = __renderDispatch[target];
  if (!fn) {
    throw new Error("render: unknown target '" + target + "'");
  }
  const captures = __parse(input);
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

function __rebuild_CronField_0(captures: any): string {
  return "*";
}

function __rebuild_CronField_1(captures: any): string {
  return "*" + "/" + __rebuildSlot(captures.step);
}

function __rebuild_CronField_2(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_CronField_3(captures: any): string {
  return __rebuildSlot(captures.start) + "-" + __rebuildSlot(captures.end);
}

function __rebuild_CommandWord_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_Command_0(captures: any): string {
  return String(__rebuildSlot(captures.words, " "));
}

function __rebuild_Cron_0(captures: any): string {
  return __rebuildSlot(captures.minute) + " " + __rebuildSlot(captures.hour) + " " + __rebuildSlot(captures.dayOfMonth) + " " + __rebuildSlot(captures.month) + " " + __rebuildSlot(captures.dayOfWeek) + (captures.command == null ? "" : " " + __rebuildSlot(captures.command));
}

function __invert_CronField_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "wildcard")) {
    throw new Error("stringify: field \"type\" expected \"wildcard\", got " + JSON.stringify(value.type));
  }
  return __rebuild_CronField_0(captures);
}

function __invert_CronField_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "step")) {
    throw new Error("stringify: field \"type\" expected \"step\", got " + JSON.stringify(value.type));
  }
  captures.step = __invertSlotLeaf_ast(value.step);
  return __rebuild_CronField_1(captures);
}

function __invert_CronField_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "value")) {
    throw new Error("stringify: field \"type\" expected \"value\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_CronField_2(captures);
}

function __invert_CronField_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "range")) {
    throw new Error("stringify: field \"type\" expected \"range\", got " + JSON.stringify(value.type));
  }
  captures.start = __invertSlotLeaf_ast(value.start);
  captures.end = __invertSlotLeaf_ast(value.end);
  return __rebuild_CronField_3(captures);
}

function __invert_CommandWord_0_ast(value: any): string {
  const captures: any = {};
  captures.value = __invertSlotLeaf_ast(value);
  return __rebuild_CommandWord_0(captures);
}

function __invert_Command_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "command")) {
    throw new Error("stringify: field \"type\" expected \"command\", got " + JSON.stringify(value.type));
  }
  captures.words = __invertSlotFor_CommandWord_ast(value.words);
  return __rebuild_Command_0(captures);
}

function __invert_Cron_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "cron")) {
    throw new Error("stringify: field \"type\" expected \"cron\", got " + JSON.stringify(value.type));
  }
  captures.minute = __invertSlotFor_CronField_ast(value.minute);
  captures.hour = __invertSlotFor_CronField_ast(value.hour);
  captures.dayOfMonth = __invertSlotFor_CronField_ast(value.dayOfMonth);
  captures.month = __invertSlotFor_CronField_ast(value.month);
  captures.dayOfWeek = __invertSlotFor_CronField_ast(value.dayOfWeek);
  captures.command = __invertSlotFor_Command_ast(value.command);
  return __rebuild_Cron_0(captures);
}

function __invert_CronField_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("*", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"*\" in template body");
  }
  __pos += 1;
  return __rebuild_CronField_0(captures);
}

function __invert_CronField_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("*/", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"*/\" in template body");
  }
  __pos += 2;
  captures.step = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_CronField_1(captures);
}

function __invert_CronField_2_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_CronField_2(captures);
}

function __invert_CronField_3_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf("-", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"-\" after capture start");
    }
    captures.start = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  captures.end = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_CronField_3(captures);
}

function __invert_CommandWord_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.value = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_CommandWord_0(captures);
}

function __invert_Command_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.words = __invertSlotFor_CommandWord_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_Command_0(captures);
}

function __invert_Cron_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture minute");
    }
    captures.minute = __invertSlotFor_CronField_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture hour");
    }
    captures.hour = __invertSlotFor_CronField_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture dayOfMonth");
    }
    captures.dayOfMonth = __invertSlotFor_CronField_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture month");
    }
    captures.month = __invertSlotFor_CronField_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      captures.dayOfWeek = __invertSlotFor_CronField_source(__s.slice(__pos));
      __pos = __s.length;
    captures.command = null;
    } else {
      captures.dayOfWeek = __invertSlotFor_CronField_source(__s.slice(__pos, __end));
      __pos = __end + 1;
    }
  }
  if (__pos >= __s.length) {
    captures.command = null;
  } else {
    captures.command = __invertSlotFor_Command_source(__s.slice(__pos));
    __pos = __s.length;
  }
  return __rebuild_Cron_0(captures);
}

function __dispatchInverse_CronField_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "wildcard")) return __invert_CronField_0_ast(value);
    if (Object.is(value.type, "step")) return __invert_CronField_1_ast(value);
    if (Object.is(value.type, "value")) return __invert_CronField_2_ast(value);
    if (Object.is(value.type, "range")) return __invert_CronField_3_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_CommandWord_ast(value: any): string {
  if (typeof value === "string") {
    return __invert_CommandWord_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Command_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "command")) return __invert_Command_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Cron_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "cron")) return __invert_Cron_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_Cron_ast(value);
}

function __dispatchInverse_CronField_source(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("*/")) return __invert_CronField_1_source(value);
    if (value.startsWith("*")) return __invert_CronField_0_source(value);
    if (value.indexOf("-") >= 0) return __invert_CronField_3_source(value);
    return __invert_CronField_2_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_CommandWord_source(value: any): string {
  if (typeof value === "string") {
    return __invert_CommandWord_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Command_source(value: any): string {
  if (typeof value === "string") {
    return __invert_Command_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_Cron_source(value: any): string {
  if (typeof value === "string") {
    if (value.indexOf(" ") >= 0) return __invert_Cron_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_Cron_source(value);
}

function __invertSlotFor_CronField_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CronField_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CronField_ast(v);
  return String(v);
}

function __invertSlotFor_CommandWord_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CommandWord_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CommandWord_ast(v);
  return String(v);
}

function __invertSlotFor_Command_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Command_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Command_ast(v);
  return String(v);
}

function __invertSlotFor_Cron_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Cron_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Cron_ast(v);
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

function __invertSlotFor_CronField_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CronField_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CronField_source(v);
  return String(v);
}

function __invertSlotFor_CommandWord_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CommandWord_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CommandWord_source(v);
  return String(v);
}

function __invertSlotFor_Command_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Command_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Command_source(v);
  return String(v);
}

function __invertSlotFor_Cron_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_Cron_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_Cron_source(v);
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
  const result = parseCron(state);
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
  const result = parseCron(state);
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/cron",
  exportName: 'validate',
};
