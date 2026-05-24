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
    const __struct: any = { type: "wildcard" };
    if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
    return __struct;
  }
  return { type: "wildcard" };
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
    const __struct: any = { type: "step", step: step };
    if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
    return __struct;
  }
  return { type: "step", step: step };
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
    const __struct: any = { type: "value", value: value };
    if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
    return __struct;
  }
  return { type: "value", value: value };
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
    const __struct: any = { type: "range", start: start, end: end };
    if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
    return __struct;
  }
  return { type: "range", start: start, end: end };
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
    const __struct: any = value;
    if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
    return __struct;
  }
  return value;
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
    const __struct: any = { type: "command", words: words };
    if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
    return __struct;
  }
  return { type: "command", words: words };
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
    const __struct: any = { type: "cron", minute: minute, hour: hour, dayOfMonth: dayOfMonth, month: month, dayOfWeek: dayOfWeek, command: command };
    if (__struct && typeof __struct === 'object' && !Array.isArray(__struct)) __struct.source = makeSource(state, entryOff, off);
    return __struct;
  }
  return { type: "cron", minute: minute, hour: hour, dayOfMonth: dayOfMonth, month: month, dayOfWeek: dayOfWeek, command: command };
}

function stringify_CronField_wildcard_source(s: any): string {
  return "*";
}

function stringify_CronField_step_source(s: any): string {
  return "*/" + __renderSlot_source(s["step"]);
}

function stringify_CronField_value_source(s: any): string {
  return __renderSlot_source(s["value"]);
}

function stringify_CronField_range_source(s: any): string {
  return __renderSlot_source(s["start"]) + "-" + __renderSlot_source(s["end"]);
}

function stringify_CronField_source(s: any): string {
  switch (s.type) {
    case "wildcard": return stringify_CronField_wildcard_source(s);
    case "step": return stringify_CronField_step_source(s);
    case "value": return stringify_CronField_value_source(s);
    case "range": return stringify_CronField_range_source(s);
  }
  throw new Error("stringify: no production matches structure shape for node CronField (target source)");
}

function stringify_CommandWord_source(s: any): string {
  if (true) return __renderSlot_source(s);
  throw new Error("stringify: no production matches structure shape for node CommandWord (target source)");
}

function stringify_Command_source(s: any): string {
  return __renderSlot_source(s["words"]);
}

function stringify_Cron_source(s: any): string {
  return __renderSlot_source(s["minute"]) + " " + __renderSlot_source(s["hour"]) + " " + __renderSlot_source(s["dayOfMonth"]) + " " + __renderSlot_source(s["month"]) + " " + __renderSlot_source(s["dayOfWeek"]) + (s["command"] == null ? "" : " " + __renderSlot_source(s["command"]));
}

function __dispatchStringify_source(s: any): string {
  if (typeof s !== "object" || s === null) throw new Error("stringify: structure must be an object");
  switch (s.type) {
    case "wildcard": return stringify_CronField_wildcard_source(s);
    case "step": return stringify_CronField_step_source(s);
    case "value": return stringify_CronField_value_source(s);
    case "range": return stringify_CronField_range_source(s);
    case undefined: return stringify_CommandWord_source(s);
    case "command": return stringify_Command_source(s);
    case "cron": return stringify_Cron_source(s);
  }
  throw new Error("stringify: no node type for structure.type='" + (s as any).type + "' under target='source'");
}

export function stringify(s: unknown, options?: { target?: string }): string {
  const target = options?.target ?? "source";
  if (target === "source") return __dispatchStringify_source(s as any);
  throw new Error("stringify: unknown target '" + target + "'");
}

function __renderSlot_source(v: any): string {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string") return v;
  if (t === "number") return String(v);
  if (t === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) out += __renderSlot_source(v[i]);
    return out;
  }
  return __dispatchStringify_source(v);
}

export function render(input: string, options?: { target?: string; mode?: 'fast' | 'raws' }): string {
  const target = options?.target ?? "source";
  const parsed = options?.mode ? parse(input, { mode: options.mode }) : parse(input);
  return stringify(parsed, { target });
}

export function parse(input: string, options?: ParseOptions): unknown {
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
