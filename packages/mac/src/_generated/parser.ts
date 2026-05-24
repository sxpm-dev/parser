// Auto-generated from packages/mac/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
/* eslint-disable */
// @ts-nocheck



type State = {
  readonly input: string;
  off: number;
  readonly mode: ParseMode;
  readonly lineStarts: number[];
  __lastCaptureStart: number;
  __lastCaptureEnd: number;
};

export type ParseMode = 'fast' | 'raws';
export type ParseOptions = {
  readonly mode?: ParseMode;
  readonly validate?: boolean;
};

type SourcePos = { readonly line: number; readonly column: number; readonly offset: number };
type SourceRange = { readonly start: SourcePos; readonly end: SourcePos };

function computeLineStarts(input: string): number[] {
  const starts = [0];
  for (let i = 0; i < input.length; i++) {
    if (input.charCodeAt(i) === 0x0a) starts.push(i + 1);
  }
  return starts;
}

function offsetToPos(state: State, offset: number): SourcePos {
  const starts = state.lineStarts;
  let lo = 0, hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid; else hi = mid - 1;
  }
  return { line: lo + 1, column: offset - starts[lo] + 1, offset };
}

function makeSource(state: State, startOff: number, endOff: number): SourceRange {
  const start = offsetToPos(state, startOff);
  const end = endOff > startOff
    ? { ...offsetToPos(state, endOff - 1), offset: endOff }
    : { ...offsetToPos(state, startOff), offset: endOff };
  return { start, end };
}

function isAsciiWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}

function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}

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

// Skip whitespace. Always emitted; called between every span where
// whitespace is allowed (default for whitespace: 'standard' schemas).
function skipWs(state: State): void {
  const input = state.input;
  const len = input.length;
  let off = state.off;
  while (off < len) {
    const c = input.charCodeAt(off);
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; }
    break;
  }
  state.off = off;
}

function isHexString(value: string): boolean {
  if (value.length === 0) return false;
  for (let i = 0; i < value.length; i++) {
    if (!isHexDigit(value.charCodeAt(i))) return false;
  }
  return true;
}

// Strip /* */ delimiters and trim. PostCSS stores the trimmed interior in
// .text and the leading/trailing whitespace inside the comment in raws.
function commentInterior(text: string): string {
  return text.slice(2, -2).trim();
}

function commentLeft(raw: string): string {
  const inner = raw.slice(2, -2);
  const match = inner.match(/^\s*/);
  return match ? match[0] : '';
}

function commentRight(raw: string): string {
  const inner = raw.slice(2, -2);
  if (inner.trim() === '') return '';
  const match = inner.match(/\s*$/);
  return match ? match[0] : '';
}

// Speculate: try fn; on throw rewind state.off and return null. Used for
// .optional() recursive spans and multi-role dispatch.
function trySpeculate(state: State, fn: (state: State) => unknown): unknown {
  const start = state.off;
  try {
    return fn(state);
  } catch {
    state.off = start;
    return null;
  }
}

function tryRoles(state: State, fns: readonly ((state: State) => unknown)[]): unknown {
  let lastError: unknown;
  const start = state.off;
  for (const fn of fns) {
    state.off = start;
    try {
      return fn(state);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError ?? new SyntaxError('no role matched');
}

function tryRolesOrNull(state: State, fns: readonly ((state: State) => unknown)[]): unknown {
  const start = state.off;
  for (const fn of fns) {
    state.off = start;
    try {
      return fn(state);
    } catch {
      // try next
    }
  }
  state.off = start;
  return null;
}

// Attach raws.before to a parsed child. Used in raws mode for repeated
// children — the body loop knows where the previous sibling ended (or where
// the body's opening token ended for the first child); raws.before is the
// source slice from that point up to this child's source.start.offset.
function attachRawsBefore(state: State, child: unknown, prevEnd: number): void {
  if (!child || typeof child !== 'object') return;
  const node = child as { raws?: Record<string, unknown>; source?: { start?: { offset?: number } } };
  const childStart = node.source?.start?.offset;
  if (typeof childStart !== 'number') return;
  if (!node.raws) node.raws = {};
  const slice = state.input.slice(prevEnd, childStart);
  if (prevEnd === 0 && /^\s*$/.test(slice)) {
    node.raws.before = '';
  } else {
    node.raws.before = slice;
  }
}

function decorateSyntaxError(input: string, error: unknown, state?: State): never {
  if (!(error instanceof SyntaxError)) throw error;
  if (hasSourceFrame(error.message)) throw error;
  const messageOffset = offsetFromMessage(error.message, -1);
  const offset = messageOffset >= 0
    ? messageOffset
    : state !== undefined
    ? state.off
    : offsetFromMessage(error.message, input.length);
  throw syntaxErrorWithFrame(input, error.message, offset);
}

function syntaxErrorWithFrame(input: string, message: string, offset: number): SyntaxError {
  const cleanMessage = stripPositionSuffix(message);
  let lineStart = offset;
  while (lineStart > 0) {
    const c = input.charCodeAt(lineStart - 1);
    if (c === 0x0a || c === 0x0d) break;
    lineStart--;
  }
  let lineEnd = offset;
  while (lineEnd < input.length) {
    const c = input.charCodeAt(lineEnd);
    if (c === 0x0a || c === 0x0d) break;
    lineEnd++;
  }
  let line = 1;
  for (let i = 0; i < lineStart; i++) if (input.charCodeAt(i) === 0x0a) line++;
  const source = input.slice(lineStart, lineEnd);
  const gutter = String(line);
  const column = Math.max(0, offset - lineStart);
  return new SyntaxError(`${cleanMessage} at position ${offset}
${gutter} | ${source}
${' '.repeat(gutter.length)} | ${' '.repeat(column)}^`);
}

function stripPositionSuffix(message: string): string {
  const marker = ' at position ';
  const index = message.lastIndexOf(marker);
  if (index < 0) return message;
  let pos = index + marker.length;
  if (pos >= message.length) return message;
  while (pos < message.length) {
    const c = message.charCodeAt(pos);
    if (c < 48 || c > 57) return message;
    pos++;
  }
  return message.slice(0, index);
}

function hasSourceFrame(message: string): boolean {
  return message.includes('\n') && message.includes(' | ');
}

function offsetFromMessage(message: string, fallback: number): number {
  const marker = 'position ';
  const index = message.indexOf(marker);
  if (index < 0) return fallback;
  let pos = index + marker.length;
  let value = 0;
  let found = false;
  while (pos < message.length) {
    const c = message.charCodeAt(pos);
    if (c < 48 || c > 57) break;
    found = true;
    value = value * 10 + c - 48;
    pos++;
  }
  return found ? value : fallback;
}

function parseMacAddress__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __startOff = __off;
  let __consumedEnd = __off;
  const __o1_s = __off;
  let o1;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o1_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o1 = __input.slice(__o1_s, __off);
  if (!(o1.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o1_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o2_s = __off;
  let o2;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o2_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o2 = __input.slice(__o2_s, __off);
  if (!(o2.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o2_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o3_s = __off;
  let o3;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o3_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o3 = __input.slice(__o3_s, __off);
  if (!(o3.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o3_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o4_s = __off;
  let o4;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o4_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o4 = __input.slice(__o4_s, __off);
  if (!(o4.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o4_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o5_s = __off;
  let o5;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o5_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o5 = __input.slice(__o5_s, __off);
  if (!(o5.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o5_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o6_s = __off;
  let o6;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o6_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o6 = __input.slice(__o6_s, __off);
  if (!(o6.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o6_s); }
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "mac-address", octets: [o1, o2, o3, o4, o5, o6], separator: ":" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMacAddress__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __startOff = __off;
  let __consumedEnd = __off;
  const __o1_s = __off;
  let o1;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o1_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o1 = __input.slice(__o1_s, __off);
  if (!(o1.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o1_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o2_s = __off;
  let o2;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o2_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o2 = __input.slice(__o2_s, __off);
  if (!(o2.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o2_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o3_s = __off;
  let o3;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o3_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o3 = __input.slice(__o3_s, __off);
  if (!(o3.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o3_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o4_s = __off;
  let o4;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o4_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o4 = __input.slice(__o4_s, __off);
  if (!(o4.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o4_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o5_s = __off;
  let o5;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o5_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o5 = __input.slice(__o5_s, __off);
  if (!(o5.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o5_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o6_s = __off;
  let o6;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o6_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o6 = __input.slice(__o6_s, __off);
  if (!(o6.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o6_s); }
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "mac-address", octets: [o1, o2, o3, o4, o5, o6], separator: "-" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseMacAddress(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(__peek < __len && isHexDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
    __peek++;
    while (__peek < __len && isHexDigit(__input.charCodeAt(__peek))) __peek++;
  // Skip ws before the discriminator.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
  if (__input.charCodeAt(__peek) === 58) {
    return parseMacAddress__alt0(state);
  }
  if (__input.charCodeAt(__peek) === 45) {
    return parseMacAddress__alt1(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseMacAddressFast__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o1_s = __off;
  let o1;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o1_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o1 = __input.slice(__o1_s, __off);
  if (!(o1.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o1_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o2_s = __off;
  let o2;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o2_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o2 = __input.slice(__o2_s, __off);
  if (!(o2.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o2_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o3_s = __off;
  let o3;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o3_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o3 = __input.slice(__o3_s, __off);
  if (!(o3.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o3_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o4_s = __off;
  let o4;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o4_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o4 = __input.slice(__o4_s, __off);
  if (!(o4.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o4_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o5_s = __off;
  let o5;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o5_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o5 = __input.slice(__o5_s, __off);
  if (!(o5.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o5_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o6_s = __off;
  let o6;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o6_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o6 = __input.slice(__o6_s, __off);
  if (!(o6.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o6_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "mac-address", octets: [o1, o2, o3, o4, o5, o6], separator: ":" };
}

function parseMacAddressFast__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o1_s = __off;
  let o1;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o1_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o1 = __input.slice(__o1_s, __off);
  if (!(o1.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o1_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o2_s = __off;
  let o2;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o2_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o2 = __input.slice(__o2_s, __off);
  if (!(o2.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o2_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o3_s = __off;
  let o3;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o3_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o3 = __input.slice(__o3_s, __off);
  if (!(o3.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o3_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o4_s = __off;
  let o4;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o4_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o4 = __input.slice(__o4_s, __off);
  if (!(o4.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o4_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o5_s = __off;
  let o5;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o5_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o5 = __input.slice(__o5_s, __off);
  if (!(o5.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o5_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o6_s = __off;
  let o6;
  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o6_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;
  o6 = __input.slice(__o6_s, __off);
  if (!(o6.length === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o6_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "mac-address", octets: [o1, o2, o3, o4, o5, o6], separator: "-" };
}

function parseMacAddressFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(__peek < __len && isHexDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
    __peek++;
    while (__peek < __len && isHexDigit(__input.charCodeAt(__peek))) __peek++;
  // Skip ws before the discriminator.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
  if (__input.charCodeAt(__peek) === 58) {
    return parseMacAddressFast__alt0(state);
  }
  if (__input.charCodeAt(__peek) === 45) {
    return parseMacAddressFast__alt1(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function validateMacAddress__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o1_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o1_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o1_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o1_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o2_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o2_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o2_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o2_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o3_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o3_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o3_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o3_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o4_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o4_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o4_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o4_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o5_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o5_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o5_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o5_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o6_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o6_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o6_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o6_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMacAddress__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o1_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o1_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o1_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o1_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o2_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o2_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o2_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o2_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o3_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o3_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o3_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o3_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o4_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o4_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o4_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o4_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o5_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o5_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o5_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o5_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45)) { state.off = __off; throw new SyntaxError("expected " + "-" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __o6_s = __off;

  if (!(isHexDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected hex at position " + __o6_s);
    __off++;
    while (__off < __len && isHexDigit(__input.charCodeAt(__off))) __off++;

  if (!((__off - __o6_s) === 2)) { state.off = __off; throw new SyntaxError("expected length 2 at position " + __o6_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMacAddress(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(__peek < __len && isHexDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
    __peek++;
    while (__peek < __len && isHexDigit(__input.charCodeAt(__peek))) __peek++;
  // Skip ws before the discriminator.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
  if (__input.charCodeAt(__peek) === 58) {
    return validateMacAddress__alt0(state);
  }
  if (__input.charCodeAt(__peek) === 45) {
    return validateMacAddress__alt1(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function stringify_MacAddress_mac_address_source(s: any): string {
  if (s["separator"] === ":") return __renderSlot_source(s["octets"][0]) + ":" + __renderSlot_source(s["octets"][1]) + ":" + __renderSlot_source(s["octets"][2]) + ":" + __renderSlot_source(s["octets"][3]) + ":" + __renderSlot_source(s["octets"][4]) + ":" + __renderSlot_source(s["octets"][5]);
  if (s["separator"] === "-") return __renderSlot_source(s["octets"][0]) + "-" + __renderSlot_source(s["octets"][1]) + "-" + __renderSlot_source(s["octets"][2]) + "-" + __renderSlot_source(s["octets"][3]) + "-" + __renderSlot_source(s["octets"][4]) + "-" + __renderSlot_source(s["octets"][5]);
  throw new Error("stringify: no production matches structure shape for node MacAddress (target source, type mac-address)");
}

function stringify_MacAddress_source(s: any): string {
  switch (s.type) {
    case "mac-address": return stringify_MacAddress_mac_address_source(s);
  }
  throw new Error("stringify: no production matches structure shape for node MacAddress (target source)");
}

function __dispatchStringify_source(s: any): string {
  if (typeof s !== "object" || s === null) throw new Error("stringify: structure must be an object");
  switch (s.type) {
    case "mac-address": return stringify_MacAddress_mac_address_source(s);
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
  const lineStarts = mode === 'raws' ? computeLineStarts(input) : [];
  const state: State = {
    input,
    off: 0,
    mode,
    lineStarts,
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    const result = mode === 'raws' ? parseMacAddress(state) : parseMacAddressFast(state);
    if (state.off !== input.length) {
      throw syntaxErrorWithFrame(input, `unexpected trailing input at position ${state.off}`, state.off);
    }
    return result;
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, state);
    }
    throw error;
  }
}

export function validate(input: string, options?: ParseOptions): void {
  if (options?.validate === true && false) {
    parse(input, options);
    return;
  }
  const state: State = {
    input,
    off: 0,
    mode: 'fast',
    lineStarts: [],
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    validateMacAddress(state);
    if (state.off !== input.length) {
      throw syntaxErrorWithFrame(input, `unexpected trailing input at position ${state.off}`, state.off);
    }
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, state);
    }
    throw error;
  }
}

// Attach package identity so another package's validation metadata can refer
// to this generated validator while codegen still emits static imports.
(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/mac",
  exportName: 'validate',
};

