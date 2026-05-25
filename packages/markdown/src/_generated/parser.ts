// Auto-generated from packages/markdown/src/schema.ts
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

function parseMarkdownDocument(state: State): unknown {
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
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__off >= __len) {  break; }
    const __before = __off;
    state.off = __off; const __child = tryRoles(state, [parseMarkdownLeaf, parseMarkdownParagraph]); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownDocument#0", children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt0(state: State): unknown {
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
  if (!(__input.startsWith("######", __off))) { state.off = __off; throw new SyntaxError("expected " + "######" + " at position " + __off); }
  __off += 6;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#0", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt1(state: State): unknown {
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
  if (!(__input.startsWith("#####", __off))) { state.off = __off; throw new SyntaxError("expected " + "#####" + " at position " + __off); }
  __off += 5;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#1", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt2(state: State): unknown {
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
  if (!(__input.startsWith("####", __off))) { state.off = __off; throw new SyntaxError("expected " + "####" + " at position " + __off); }
  __off += 4;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#2", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt3(state: State): unknown {
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
  if (!(__input.startsWith("###", __off))) { state.off = __off; throw new SyntaxError("expected " + "###" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#3", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt4(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 35 && __input.charCodeAt(__off + 1) === 35)) { state.off = __off; throw new SyntaxError("expected " + "##" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#4", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt5(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 35)) { state.off = __off; throw new SyntaxError("expected " + "#" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#5", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt6(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  const __softStart = state.off;
  const __startOff = __off;
  let __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("===", __off))) { { state.off = __softStart; return null; } }
  __off += 3;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#6", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt7(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  const __softStart = state.off;
  const __startOff = __off;
  let __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { { state.off = __softStart; return null; } }
  __off += 3;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#7", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt8(state: State): unknown {
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
  if (!(__input.startsWith("***", __off))) { state.off = __off; throw new SyntaxError("expected " + "***" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#8" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt9(state: State): unknown {
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
  if (!(__input.startsWith("___", __off))) { state.off = __off; throw new SyntaxError("expected " + "___" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#9" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt10(state: State): unknown {
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
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#10" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt11(state: State): unknown {
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
  if (!(__input.startsWith("- [x]", __off))) { state.off = __off; throw new SyntaxError("expected " + "- [x]" + " at position " + __off); }
  __off += 5;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#11", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt12(state: State): unknown {
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
  if (!(__input.startsWith("- [ ]", __off))) { state.off = __off; throw new SyntaxError("expected " + "- [ ]" + " at position " + __off); }
  __off += 5;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#12", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt13(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 43 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "+ " + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#13", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt14(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "* " + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#14", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt15(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 45 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "- " + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#15", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt16(state: State): unknown {
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
  const __index_s = __off;
  let index;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __index_s);
    __off++;
    while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
    if (__off < __len && __input.charCodeAt(__off) === 0x2e && __off + 1 < __len && isDigit(__input.charCodeAt(__off + 1))) {
      __off++;
      while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
    }
    {
      const __ec = __off < __len ? __input.charCodeAt(__off) : 0;
      if (__ec === 0x65 || __ec === 0x45) {
        let __j = __off + 1;
        if (__j < __len && (__input.charCodeAt(__j) === 0x2b || __input.charCodeAt(__j) === 0x2d)) __j++;
        if (__j < __len && isDigit(__input.charCodeAt(__j))) {
          __off = __j;
          while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
        }
      }
    }
  index = __input.slice(__index_s, __off);
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 46)) { state.off = __off; throw new SyntaxError("expected " + "." + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#16", index: index, text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt17(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#17", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt18(state: State): unknown {
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
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __lang_s = __off;
  let lang;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __lang_s);
    {
      const __c0 = __input.charCodeAt(__off);
      __off++;
      if (__c0 === 0x5c) {
        if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
          let __n = 0;
          while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
          if (__off < __len) {
            const __w = __input.charCodeAt(__off);
            if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
          }
        } else if (__off < __len) {
          __off++;
        }
      }
      while (__off < __len) {
        const __c2 = __input.charCodeAt(__off);
        if (__c2 === 0x5c) {
          __off++;
          if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
            let __n = 0;
            while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
            if (__off < __len) {
              const __w = __input.charCodeAt(__off);
              if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
            }
          } else if (__off < __len) {
            __off++;
          }
          continue;
        }
        if (!isCssIdentPart(__c2)) break;
        __off++;
      }
      // Raw url(...) tokenization (matches tokenized backend).
      if (
        __off - __lang_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__lang_s) | 32) === 0x75
        && (__input.charCodeAt(__lang_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__lang_s + 2) | 32) === 0x6c
      ) {
        __off++;
        while (__off < __len) {
          const __cu = __input.charCodeAt(__off);
          if (__cu === 0x29) { __off++; break; }
          if (__cu === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__cu === 0x22 || __cu === 0x27) {
            const __q = __cu;
            __off++;
            while (__off < __len) {
              const __ch = __input.charCodeAt(__off);
              if (__ch === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__ch === __q) { __off++; break; }
              if (__ch === 0x0a || __ch === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
      }
    }
  lang = __input.slice(__lang_s, __off);
  __consumedEnd = __off;
  let body = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 96 && __input.startsWith("```", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      body = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    body = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#18", lang: lang, body: body };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt19(state: State): unknown {
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
  if (!(__input.startsWith("```\n", __off))) { state.off = __off; throw new SyntaxError("expected " + "```\n" + " at position " + __off); }
  __off += 4;
  __consumedEnd = __off;
  let body = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 96 && __input.startsWith("```", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      body = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    body = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#19", body: body };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt20(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 42)) { state.off = __off; throw new SyntaxError("expected " + "**" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 42 && __input.startsWith("**", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 42)) { state.off = __off; throw new SyntaxError("expected " + "**" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#20", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt21(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 42)) { state.off = __off; throw new SyntaxError("expected " + "*" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 42) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42)) { state.off = __off; throw new SyntaxError("expected " + "*" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#21", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt22(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 126 && __input.charCodeAt(__off + 1) === 126)) { state.off = __off; throw new SyntaxError("expected " + "~~" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 126 && __input.startsWith("~~", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 126 && __input.charCodeAt(__off + 1) === 126)) { state.off = __off; throw new SyntaxError("expected " + "~~" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#22", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt23(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 96)) { state.off = __off; throw new SyntaxError("expected " + "`" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 96) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 96)) { state.off = __off; throw new SyntaxError("expected " + "`" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#23", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt24(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let label = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      label = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    label = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      url = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 41)) { state.off = __off; throw new SyntaxError("expected " + ")" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#24", label: label, url: url };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt25(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let label = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      label = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    label = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93 && __input.charCodeAt(__off + 1) === 91)) { state.off = __off; throw new SyntaxError("expected " + "][" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      id = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#25", label: label, id: id };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt26(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let alt = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      alt = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    alt = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      url = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 41)) { state.off = __off; throw new SyntaxError("expected " + ")" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#26", alt: alt, url: url };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt27(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let alt = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      alt = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    alt = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93 && __input.charCodeAt(__off + 1) === 91)) { state.off = __off; throw new SyntaxError("expected " + "][" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      id = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#27", alt: alt, id: id };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt28(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 38)) { state.off = __off; throw new SyntaxError("expected " + "&" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __name_s);
    {
      const __c0 = __input.charCodeAt(__off);
      __off++;
      if (__c0 === 0x5c) {
        if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
          let __n = 0;
          while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
          if (__off < __len) {
            const __w = __input.charCodeAt(__off);
            if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
          }
        } else if (__off < __len) {
          __off++;
        }
      }
      while (__off < __len) {
        const __c2 = __input.charCodeAt(__off);
        if (__c2 === 0x5c) {
          __off++;
          if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
            let __n = 0;
            while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
            if (__off < __len) {
              const __w = __input.charCodeAt(__off);
              if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
            }
          } else if (__off < __len) {
            __off++;
          }
          continue;
        }
        if (!isCssIdentPart(__c2)) break;
        __off++;
      }
      // Raw url(...) tokenization (matches tokenized backend).
      if (
        __off - __name_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__name_s) | 32) === 0x75
        && (__input.charCodeAt(__name_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__name_s + 2) | 32) === 0x6c
      ) {
        __off++;
        while (__off < __len) {
          const __cu = __input.charCodeAt(__off);
          if (__cu === 0x29) { __off++; break; }
          if (__cu === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__cu === 0x22 || __cu === 0x27) {
            const __q = __cu;
            __off++;
            while (__off < __len) {
              const __ch = __input.charCodeAt(__off);
              if (__ch === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__ch === __q) { __off++; break; }
              if (__ch === 0x0a || __ch === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
      }
    }
  name = __input.slice(__name_s, __off);
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 59)) { state.off = __off; throw new SyntaxError("expected " + ";" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#28", name: name };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt29(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#29" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt30(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
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
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
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
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#30" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt31(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let first = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      first = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    first = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let second = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      second = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    second = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#31", first: first, second: second };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt32(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      id = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      url = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#32", id: id, url: url };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt33(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 91 && __input.charCodeAt(__off + 1) === 94)) { state.off = __off; throw new SyntaxError("expected " + "[^" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      id = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#33", id: id, text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt34(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 91 && __input.charCodeAt(__off + 1) === 94)) { state.off = __off; throw new SyntaxError("expected " + "[^" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      id = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#34", id: id };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt35(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 60)) { state.off = __off; throw new SyntaxError("expected " + "<" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __tag_s = __off;
  let tag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __tag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  tag = __input.slice(__tag_s, __off);
  const __tag_lc = tag.toLowerCase();
  if (!(__tag_lc === "div" || __tag_lc === "span" || __tag_lc === "p" || __tag_lc === "pre" || __tag_lc === "code" || __tag_lc === "blockquote" || __tag_lc === "a" || __tag_lc === "img" || __tag_lc === "br" || __tag_lc === "hr" || __tag_lc === "ul" || __tag_lc === "ol" || __tag_lc === "li" || __tag_lc === "dl" || __tag_lc === "dt" || __tag_lc === "dd" || __tag_lc === "table" || __tag_lc === "thead" || __tag_lc === "tbody" || __tag_lc === "tfoot" || __tag_lc === "tr" || __tag_lc === "td" || __tag_lc === "th" || __tag_lc === "caption" || __tag_lc === "figure" || __tag_lc === "figcaption" || __tag_lc === "section" || __tag_lc === "article" || __tag_lc === "header" || __tag_lc === "footer" || __tag_lc === "nav" || __tag_lc === "aside" || __tag_lc === "main" || __tag_lc === "address" || __tag_lc === "details" || __tag_lc === "summary" || __tag_lc === "h1" || __tag_lc === "h2" || __tag_lc === "h3" || __tag_lc === "h4" || __tag_lc === "h5" || __tag_lc === "h6" || __tag_lc === "em" || __tag_lc === "strong" || __tag_lc === "i" || __tag_lc === "b" || __tag_lc === "u" || __tag_lc === "s" || __tag_lc === "small" || __tag_lc === "sub" || __tag_lc === "sup" || __tag_lc === "kbd" || __tag_lc === "var" || __tag_lc === "samp" || __tag_lc === "cite" || __tag_lc === "q" || __tag_lc === "dfn" || __tag_lc === "abbr" || __tag_lc === "time" || __tag_lc === "mark" || __tag_lc === "ruby" || __tag_lc === "rt" || __tag_lc === "rp" || __tag_lc === "bdi" || __tag_lc === "bdo" || __tag_lc === "wbr" || __tag_lc === "form" || __tag_lc === "input" || __tag_lc === "button" || __tag_lc === "select" || __tag_lc === "option" || __tag_lc === "optgroup" || __tag_lc === "textarea" || __tag_lc === "label" || __tag_lc === "fieldset" || __tag_lc === "legend" || __tag_lc === "datalist" || __tag_lc === "output" || __tag_lc === "progress" || __tag_lc === "meter" || __tag_lc === "video" || __tag_lc === "audio" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "canvas" || __tag_lc === "svg" || __tag_lc === "math" || __tag_lc === "iframe" || __tag_lc === "embed" || __tag_lc === "object" || __tag_lc === "param" || __tag_lc === "picture" || __tag_lc === "script" || __tag_lc === "style" || __tag_lc === "noscript" || __tag_lc === "template" || __tag_lc === "html" || __tag_lc === "head" || __tag_lc === "body" || __tag_lc === "title" || __tag_lc === "meta" || __tag_lc === "link" || __tag_lc === "base")) { state.off = __off; throw new SyntaxError("expected one of div, span, p, pre, code, blockquote, a, img, br, hr, ul, ol, li, dl, dt, dd, table, thead, tbody, tfoot, tr, td, th, caption, figure, figcaption, section, article, header, footer, nav, aside, main, address, details, summary, h1, h2, h3, h4, h5, h6, em, strong, i, b, u, s, small, sub, sup, kbd, var, samp, cite, q, dfn, abbr, time, mark, ruby, rt, rp, bdi, bdo, wbr, form, input, button, select, option, optgroup, textarea, label, fieldset, legend, datalist, output, progress, meter, video, audio, source, track, canvas, svg, math, iframe, embed, object, param, picture, script, style, noscript, template, html, head, body, title, meta, link, base at position " + __tag_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let body = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    state.__lastCaptureStart = __startOff;
    state.__lastCaptureEnd = __earliest;
    body = __input.slice(__startOff, __earliest);
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) { state.off = __off; throw new SyntaxError("expected " + "</" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __closingTag_s = __off;
  let closingTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closingTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closingTag = __input.slice(__closingTag_s, __off);
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#35", tag: tag, body: body, closingTag: closingTag };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf__alt36(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 60)) { state.off = __off; throw new SyntaxError("expected " + "<" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 62) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      url = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownLeaf#36", url: url };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownLeaf(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
  // Skip leading ws before discriminating on first span.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
    const __byte0 = __input.charCodeAt(__peek);
  if (__byte0 === 35) {
    if (__input.startsWith("######", __peek)) {
      return parseMarkdownLeaf__alt0(state);
    }
    else if (__input.startsWith("#####", __peek)) {
      return parseMarkdownLeaf__alt1(state);
    }
    else if (__input.startsWith("####", __peek)) {
      return parseMarkdownLeaf__alt2(state);
    }
    else if (__input.startsWith("###", __peek)) {
      return parseMarkdownLeaf__alt3(state);
    }
    else if (__input.charCodeAt(__peek) === 35 && __input.charCodeAt(__peek + 1) === 35) {
      return parseMarkdownLeaf__alt4(state);
    }
    else {
      return parseMarkdownLeaf__alt5(state);
    }
  } else if (__byte0 === 45) {
    if (__input.startsWith("- [x]", __peek)) {
      return parseMarkdownLeaf__alt11(state);
    }
    else if (__input.startsWith("- [ ]", __peek)) {
      return parseMarkdownLeaf__alt12(state);
    }
    else if (__input.startsWith("---", __peek)) {
      return parseMarkdownLeaf__alt10(state);
    }
    else if (__input.charCodeAt(__peek) === 45 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeaf__alt15(state);
    }
  } else if (__byte0 === 96) {
    if (__input.startsWith("```\n", __peek)) {
      return parseMarkdownLeaf__alt19(state);
    }
    else if (__input.startsWith("```", __peek)) {
      return parseMarkdownLeaf__alt18(state);
    }
    else {
      return parseMarkdownLeaf__alt23(state);
    }
  } else if (__byte0 === 42) {
    if (__input.startsWith("***", __peek)) {
      return parseMarkdownLeaf__alt8(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeaf__alt14(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 42) {
      return parseMarkdownLeaf__alt20(state);
    }
    else {
      return parseMarkdownLeaf__alt21(state);
    }
  } else if (__byte0 === 95) {
    if (__input.startsWith("___", __peek)) {
      return parseMarkdownLeaf__alt9(state);
    }
  } else if (__byte0 === 43) {
    if (__input.charCodeAt(__peek) === 43 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeaf__alt13(state);
    }
  } else if (__byte0 === 126) {
    if (__input.charCodeAt(__peek) === 126 && __input.charCodeAt(__peek + 1) === 126) {
      return parseMarkdownLeaf__alt22(state);
    }
  } else if (__byte0 === 91) {
    if (__input.charCodeAt(__peek) === 91 && __input.charCodeAt(__peek + 1) === 94) {
      state.off = __peek;
      { const r = trySpeculate(state, parseMarkdownLeaf__alt33); if (r !== null) return r; }
      return parseMarkdownLeaf__alt34(state);
    }
    else {
      state.off = __peek;
      { const r = trySpeculate(state, parseMarkdownLeaf__alt24); if (r !== null) return r; }
      { const r = trySpeculate(state, parseMarkdownLeaf__alt25); if (r !== null) return r; }
      return parseMarkdownLeaf__alt32(state);
    }
  } else if (__byte0 === 62) {
    return parseMarkdownLeaf__alt17(state);
  } else if (__byte0 === 33) {
    state.off = __peek;
    { const r = trySpeculate(state, parseMarkdownLeaf__alt26); if (r !== null) return r; }
    return parseMarkdownLeaf__alt27(state);
  } else if (__byte0 === 38) {
    return parseMarkdownLeaf__alt28(state);
  } else if (__byte0 === 124) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 124)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.startsWith("---", __peek)) {
      return parseMarkdownLeaf__alt29(state);
    }
    if (__input.charCodeAt(__peek) === 58) {
      return parseMarkdownLeaf__alt30(state);
    }
    return parseMarkdownLeaf__alt31(state);
  } else if (__byte0 === 60) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 60)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(isCssIdentStart(__input.charCodeAt(__peek)))) return parseMarkdownLeaf__alt36(state);
    {
      const __identStart = __peek;
      __peek++;
      while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
      const __ident = __input.slice(__identStart, __peek).toLowerCase();
      if (__ident === "div") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "span") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "p") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "pre") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "code") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "blockquote") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "a") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "img") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "br") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "hr") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "ul") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "ol") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "li") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "dl") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "dt") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "dd") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "table") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "thead") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "tbody") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "tfoot") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "tr") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "td") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "th") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "caption") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "figure") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "figcaption") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "section") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "article") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "header") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "footer") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "nav") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "aside") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "main") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "address") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "details") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "summary") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "h1") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "h2") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "h3") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "h4") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "h5") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "h6") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "em") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "strong") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "i") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "b") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "u") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "s") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "small") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "sub") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "sup") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "kbd") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "var") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "samp") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "cite") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "q") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "dfn") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "abbr") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "time") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "mark") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "ruby") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "rt") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "rp") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "bdi") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "bdo") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "wbr") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "form") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "input") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "button") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "select") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "option") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "optgroup") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "textarea") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "label") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "fieldset") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "legend") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "datalist") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "output") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "progress") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "meter") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "video") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "audio") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "source") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "track") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "canvas") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "svg") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "math") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "iframe") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "embed") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "object") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "param") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "picture") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "script") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "style") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "noscript") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "template") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "html") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "head") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "body") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "title") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "meta") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "link") {
      return parseMarkdownLeaf__alt35(state);
    }
      if (__ident === "base") {
      return parseMarkdownLeaf__alt35(state);
    }
      return parseMarkdownLeaf__alt36(state);
    }
  } else if (isDigit(__input.charCodeAt(__peek))) {
    return parseMarkdownLeaf__alt16(state);
  }
  { state.off = __peek; const r = parseMarkdownLeaf__alt6(state); if (r !== null) return r; }
  { state.off = __peek; const r = parseMarkdownLeaf__alt7(state); if (r !== null) return r; }
  state.off = __peek;
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseMarkdownParagraph(state: State): unknown {
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
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __c2 = -1;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 10 && ((__c2 = __off + 1 < __len ? __input.charCodeAt(__off + 1) : -1), ((__c2 === 96 && (__input.startsWith("\n```", __off))) || (__c2 === 45 && (__input.startsWith("\n---", __off) || __input.startsWith("\n- ", __off) || __input.startsWith("\n-\n", __off))) || (__c2 === 42 && (__input.startsWith("\n***", __off) || __input.startsWith("\n* ", __off))) || (__c2 === 95 && (__input.startsWith("\n___", __off))) || (__c2 === 61 && (__input.startsWith("\n===", __off))) || (__c2 === 43 && (__input.startsWith("\n+ ", __off))) || __c2 === 10 || __c2 === 35 || __c2 === 62 || __c2 === 124 || __c2 === 91)))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      text = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "MarkdownParagraph#0", text: text };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseMarkdownDocumentFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__off >= __len) {  break; }
    const __before = __off;
    state.off = __off; const __child = tryRoles(state, [parseMarkdownLeafFast, parseMarkdownParagraphFast]); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownDocument#0", children: children };
}

function parseMarkdownLeafFast__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("######", __off))) { state.off = __off; throw new SyntaxError("expected " + "######" + " at position " + __off); }
  __off += 6;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#0", text: text };
}

function parseMarkdownLeafFast__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("#####", __off))) { state.off = __off; throw new SyntaxError("expected " + "#####" + " at position " + __off); }
  __off += 5;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#1", text: text };
}

function parseMarkdownLeafFast__alt2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("####", __off))) { state.off = __off; throw new SyntaxError("expected " + "####" + " at position " + __off); }
  __off += 4;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#2", text: text };
}

function parseMarkdownLeafFast__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("###", __off))) { state.off = __off; throw new SyntaxError("expected " + "###" + " at position " + __off); }
  __off += 3;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#3", text: text };
}

function parseMarkdownLeafFast__alt4(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 35 && __input.charCodeAt(__off + 1) === 35)) { state.off = __off; throw new SyntaxError("expected " + "##" + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#4", text: text };
}

function parseMarkdownLeafFast__alt5(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 35)) { state.off = __off; throw new SyntaxError("expected " + "#" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#5", text: text };
}

function parseMarkdownLeafFast__alt6(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  const __softStart = state.off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("===", __off))) { { state.off = __softStart; return null; } }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#6", text: text };
}

function parseMarkdownLeafFast__alt7(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  const __softStart = state.off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { { state.off = __softStart; return null; } }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#7", text: text };
}

function parseMarkdownLeafFast__alt8(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("***", __off))) { state.off = __off; throw new SyntaxError("expected " + "***" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#8" };
}

function parseMarkdownLeafFast__alt9(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("___", __off))) { state.off = __off; throw new SyntaxError("expected " + "___" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#9" };
}

function parseMarkdownLeafFast__alt10(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#10" };
}

function parseMarkdownLeafFast__alt11(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("- [x]", __off))) { state.off = __off; throw new SyntaxError("expected " + "- [x]" + " at position " + __off); }
  __off += 5;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#11", text: text };
}

function parseMarkdownLeafFast__alt12(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("- [ ]", __off))) { state.off = __off; throw new SyntaxError("expected " + "- [ ]" + " at position " + __off); }
  __off += 5;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#12", text: text };
}

function parseMarkdownLeafFast__alt13(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 43 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "+ " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#13", text: text };
}

function parseMarkdownLeafFast__alt14(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "* " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#14", text: text };
}

function parseMarkdownLeafFast__alt15(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "- " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#15", text: text };
}

function parseMarkdownLeafFast__alt16(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __index_s = __off;
  let index;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __index_s);
    __off++;
    while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
    if (__off < __len && __input.charCodeAt(__off) === 0x2e && __off + 1 < __len && isDigit(__input.charCodeAt(__off + 1))) {
      __off++;
      while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
    }
    {
      const __ec = __off < __len ? __input.charCodeAt(__off) : 0;
      if (__ec === 0x65 || __ec === 0x45) {
        let __j = __off + 1;
        if (__j < __len && (__input.charCodeAt(__j) === 0x2b || __input.charCodeAt(__j) === 0x2d)) __j++;
        if (__j < __len && isDigit(__input.charCodeAt(__j))) {
          __off = __j;
          while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
        }
      }
    }
  index = __input.slice(__index_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 46)) { state.off = __off; throw new SyntaxError("expected " + "." + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#16", index: index, text: text };
}

function parseMarkdownLeafFast__alt17(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#17", text: text };
}

function parseMarkdownLeafFast__alt18(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __lang_s = __off;
  let lang;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __lang_s);
    {
      const __c0 = __input.charCodeAt(__off);
      __off++;
      if (__c0 === 0x5c) {
        if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
          let __n = 0;
          while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
          if (__off < __len) {
            const __w = __input.charCodeAt(__off);
            if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
          }
        } else if (__off < __len) {
          __off++;
        }
      }
      while (__off < __len) {
        const __c2 = __input.charCodeAt(__off);
        if (__c2 === 0x5c) {
          __off++;
          if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
            let __n = 0;
            while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
            if (__off < __len) {
              const __w = __input.charCodeAt(__off);
              if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
            }
          } else if (__off < __len) {
            __off++;
          }
          continue;
        }
        if (!isCssIdentPart(__c2)) break;
        __off++;
      }
      // Raw url(...) tokenization (matches tokenized backend).
      if (
        __off - __lang_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__lang_s) | 32) === 0x75
        && (__input.charCodeAt(__lang_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__lang_s + 2) | 32) === 0x6c
      ) {
        __off++;
        while (__off < __len) {
          const __cu = __input.charCodeAt(__off);
          if (__cu === 0x29) { __off++; break; }
          if (__cu === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__cu === 0x22 || __cu === 0x27) {
            const __q = __cu;
            __off++;
            while (__off < __len) {
              const __ch = __input.charCodeAt(__off);
              if (__ch === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__ch === __q) { __off++; break; }
              if (__ch === 0x0a || __ch === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
      }
    }
  lang = __input.slice(__lang_s, __off);
  let body = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 96 && __input.startsWith("```", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      body = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    body = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#18", lang: lang, body: body };
}

function parseMarkdownLeafFast__alt19(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```\n", __off))) { state.off = __off; throw new SyntaxError("expected " + "```\n" + " at position " + __off); }
  __off += 4;
  let body = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 96 && __input.startsWith("```", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      body = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    body = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#19", body: body };
}

function parseMarkdownLeafFast__alt20(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 42)) { state.off = __off; throw new SyntaxError("expected " + "**" + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 42 && __input.startsWith("**", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 42)) { state.off = __off; throw new SyntaxError("expected " + "**" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#20", text: text };
}

function parseMarkdownLeafFast__alt21(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42)) { state.off = __off; throw new SyntaxError("expected " + "*" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 42) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42)) { state.off = __off; throw new SyntaxError("expected " + "*" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#21", text: text };
}

function parseMarkdownLeafFast__alt22(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 126 && __input.charCodeAt(__off + 1) === 126)) { state.off = __off; throw new SyntaxError("expected " + "~~" + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 126 && __input.startsWith("~~", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 126 && __input.charCodeAt(__off + 1) === 126)) { state.off = __off; throw new SyntaxError("expected " + "~~" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#22", text: text };
}

function parseMarkdownLeafFast__alt23(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 96)) { state.off = __off; throw new SyntaxError("expected " + "`" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 96) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 96)) { state.off = __off; throw new SyntaxError("expected " + "`" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#23", text: text };
}

function parseMarkdownLeafFast__alt24(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let label = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      label = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    label = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      url = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 41)) { state.off = __off; throw new SyntaxError("expected " + ")" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#24", label: label, url: url };
}

function parseMarkdownLeafFast__alt25(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let label = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      label = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    label = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93 && __input.charCodeAt(__off + 1) === 91)) { state.off = __off; throw new SyntaxError("expected " + "][" + " at position " + __off); }
  __off += 2;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#25", label: label, id: id };
}

function parseMarkdownLeafFast__alt26(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let alt = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      alt = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    alt = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      url = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 41)) { state.off = __off; throw new SyntaxError("expected " + ")" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#26", alt: alt, url: url };
}

function parseMarkdownLeafFast__alt27(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let alt = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      alt = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    alt = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93 && __input.charCodeAt(__off + 1) === 91)) { state.off = __off; throw new SyntaxError("expected " + "][" + " at position " + __off); }
  __off += 2;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#27", alt: alt, id: id };
}

function parseMarkdownLeafFast__alt28(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 38)) { state.off = __off; throw new SyntaxError("expected " + "&" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __name_s);
    {
      const __c0 = __input.charCodeAt(__off);
      __off++;
      if (__c0 === 0x5c) {
        if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
          let __n = 0;
          while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
          if (__off < __len) {
            const __w = __input.charCodeAt(__off);
            if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
          }
        } else if (__off < __len) {
          __off++;
        }
      }
      while (__off < __len) {
        const __c2 = __input.charCodeAt(__off);
        if (__c2 === 0x5c) {
          __off++;
          if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
            let __n = 0;
            while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
            if (__off < __len) {
              const __w = __input.charCodeAt(__off);
              if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
            }
          } else if (__off < __len) {
            __off++;
          }
          continue;
        }
        if (!isCssIdentPart(__c2)) break;
        __off++;
      }
      // Raw url(...) tokenization (matches tokenized backend).
      if (
        __off - __name_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__name_s) | 32) === 0x75
        && (__input.charCodeAt(__name_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__name_s + 2) | 32) === 0x6c
      ) {
        __off++;
        while (__off < __len) {
          const __cu = __input.charCodeAt(__off);
          if (__cu === 0x29) { __off++; break; }
          if (__cu === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__cu === 0x22 || __cu === 0x27) {
            const __q = __cu;
            __off++;
            while (__off < __len) {
              const __ch = __input.charCodeAt(__off);
              if (__ch === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__ch === __q) { __off++; break; }
              if (__ch === 0x0a || __ch === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
      }
    }
  name = __input.slice(__name_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 59)) { state.off = __off; throw new SyntaxError("expected " + ";" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#28", name: name };
}

function parseMarkdownLeafFast__alt29(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#29" };
}

function parseMarkdownLeafFast__alt30(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
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
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
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
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#30" };
}

function parseMarkdownLeafFast__alt31(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  let first = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      first = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    first = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  let second = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      second = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    second = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#31", first: first, second: second };
}

function parseMarkdownLeafFast__alt32(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      url = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#32", id: id, url: url };
}

function parseMarkdownLeafFast__alt33(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91 && __input.charCodeAt(__off + 1) === 94)) { state.off = __off; throw new SyntaxError("expected " + "[^" + " at position " + __off); }
  __off += 2;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#33", id: id, text: text };
}

function parseMarkdownLeafFast__alt34(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91 && __input.charCodeAt(__off + 1) === 94)) { state.off = __off; throw new SyntaxError("expected " + "[^" + " at position " + __off); }
  __off += 2;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#34", id: id };
}

function parseMarkdownLeafFast__alt35(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60)) { state.off = __off; throw new SyntaxError("expected " + "<" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __tag_s = __off;
  let tag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __tag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  tag = __input.slice(__tag_s, __off);
  const __tag_lc = tag.toLowerCase();
  if (!(__tag_lc === "div" || __tag_lc === "span" || __tag_lc === "p" || __tag_lc === "pre" || __tag_lc === "code" || __tag_lc === "blockquote" || __tag_lc === "a" || __tag_lc === "img" || __tag_lc === "br" || __tag_lc === "hr" || __tag_lc === "ul" || __tag_lc === "ol" || __tag_lc === "li" || __tag_lc === "dl" || __tag_lc === "dt" || __tag_lc === "dd" || __tag_lc === "table" || __tag_lc === "thead" || __tag_lc === "tbody" || __tag_lc === "tfoot" || __tag_lc === "tr" || __tag_lc === "td" || __tag_lc === "th" || __tag_lc === "caption" || __tag_lc === "figure" || __tag_lc === "figcaption" || __tag_lc === "section" || __tag_lc === "article" || __tag_lc === "header" || __tag_lc === "footer" || __tag_lc === "nav" || __tag_lc === "aside" || __tag_lc === "main" || __tag_lc === "address" || __tag_lc === "details" || __tag_lc === "summary" || __tag_lc === "h1" || __tag_lc === "h2" || __tag_lc === "h3" || __tag_lc === "h4" || __tag_lc === "h5" || __tag_lc === "h6" || __tag_lc === "em" || __tag_lc === "strong" || __tag_lc === "i" || __tag_lc === "b" || __tag_lc === "u" || __tag_lc === "s" || __tag_lc === "small" || __tag_lc === "sub" || __tag_lc === "sup" || __tag_lc === "kbd" || __tag_lc === "var" || __tag_lc === "samp" || __tag_lc === "cite" || __tag_lc === "q" || __tag_lc === "dfn" || __tag_lc === "abbr" || __tag_lc === "time" || __tag_lc === "mark" || __tag_lc === "ruby" || __tag_lc === "rt" || __tag_lc === "rp" || __tag_lc === "bdi" || __tag_lc === "bdo" || __tag_lc === "wbr" || __tag_lc === "form" || __tag_lc === "input" || __tag_lc === "button" || __tag_lc === "select" || __tag_lc === "option" || __tag_lc === "optgroup" || __tag_lc === "textarea" || __tag_lc === "label" || __tag_lc === "fieldset" || __tag_lc === "legend" || __tag_lc === "datalist" || __tag_lc === "output" || __tag_lc === "progress" || __tag_lc === "meter" || __tag_lc === "video" || __tag_lc === "audio" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "canvas" || __tag_lc === "svg" || __tag_lc === "math" || __tag_lc === "iframe" || __tag_lc === "embed" || __tag_lc === "object" || __tag_lc === "param" || __tag_lc === "picture" || __tag_lc === "script" || __tag_lc === "style" || __tag_lc === "noscript" || __tag_lc === "template" || __tag_lc === "html" || __tag_lc === "head" || __tag_lc === "body" || __tag_lc === "title" || __tag_lc === "meta" || __tag_lc === "link" || __tag_lc === "base")) { state.off = __off; throw new SyntaxError("expected one of div, span, p, pre, code, blockquote, a, img, br, hr, ul, ol, li, dl, dt, dd, table, thead, tbody, tfoot, tr, td, th, caption, figure, figcaption, section, article, header, footer, nav, aside, main, address, details, summary, h1, h2, h3, h4, h5, h6, em, strong, i, b, u, s, small, sub, sup, kbd, var, samp, cite, q, dfn, abbr, time, mark, ruby, rt, rp, bdi, bdo, wbr, form, input, button, select, option, optgroup, textarea, label, fieldset, legend, datalist, output, progress, meter, video, audio, source, track, canvas, svg, math, iframe, embed, object, param, picture, script, style, noscript, template, html, head, body, title, meta, link, base at position " + __tag_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let body = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    body = __input.slice(__startOff, __earliest);
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) { state.off = __off; throw new SyntaxError("expected " + "</" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __closingTag_s = __off;
  let closingTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closingTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closingTag = __input.slice(__closingTag_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#35", tag: tag, body: body, closingTag: closingTag };
}

function parseMarkdownLeafFast__alt36(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60)) { state.off = __off; throw new SyntaxError("expected " + "<" + " at position " + __off); }
  __off += 1;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 62) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      url = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#36", url: url };
}

function parseMarkdownLeafFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
  // Skip leading ws before discriminating on first span.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
    const __byte0 = __input.charCodeAt(__peek);
  if (__byte0 === 35) {
    if (__input.startsWith("######", __peek)) {
      return parseMarkdownLeafFast__alt0(state);
    }
    else if (__input.startsWith("#####", __peek)) {
      return parseMarkdownLeafFast__alt1(state);
    }
    else if (__input.startsWith("####", __peek)) {
      return parseMarkdownLeafFast__alt2(state);
    }
    else if (__input.startsWith("###", __peek)) {
      return parseMarkdownLeafFast__alt3(state);
    }
    else if (__input.charCodeAt(__peek) === 35 && __input.charCodeAt(__peek + 1) === 35) {
      return parseMarkdownLeafFast__alt4(state);
    }
    else {
      return parseMarkdownLeafFast__alt5(state);
    }
  } else if (__byte0 === 45) {
    if (__input.startsWith("- [x]", __peek)) {
      return parseMarkdownLeafFast__alt11(state);
    }
    else if (__input.startsWith("- [ ]", __peek)) {
      return parseMarkdownLeafFast__alt12(state);
    }
    else if (__input.startsWith("---", __peek)) {
      return parseMarkdownLeafFast__alt10(state);
    }
    else if (__input.charCodeAt(__peek) === 45 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeafFast__alt15(state);
    }
  } else if (__byte0 === 96) {
    if (__input.startsWith("```\n", __peek)) {
      return parseMarkdownLeafFast__alt19(state);
    }
    else if (__input.startsWith("```", __peek)) {
      return parseMarkdownLeafFast__alt18(state);
    }
    else {
      return parseMarkdownLeafFast__alt23(state);
    }
  } else if (__byte0 === 42) {
    if (__input.startsWith("***", __peek)) {
      return parseMarkdownLeafFast__alt8(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeafFast__alt14(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 42) {
      return parseMarkdownLeafFast__alt20(state);
    }
    else {
      return parseMarkdownLeafFast__alt21(state);
    }
  } else if (__byte0 === 95) {
    if (__input.startsWith("___", __peek)) {
      return parseMarkdownLeafFast__alt9(state);
    }
  } else if (__byte0 === 43) {
    if (__input.charCodeAt(__peek) === 43 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeafFast__alt13(state);
    }
  } else if (__byte0 === 126) {
    if (__input.charCodeAt(__peek) === 126 && __input.charCodeAt(__peek + 1) === 126) {
      return parseMarkdownLeafFast__alt22(state);
    }
  } else if (__byte0 === 91) {
    if (__input.charCodeAt(__peek) === 91 && __input.charCodeAt(__peek + 1) === 94) {
      state.off = __peek;
      { const r = trySpeculate(state, parseMarkdownLeafFast__alt33); if (r !== null) return r; }
      return parseMarkdownLeafFast__alt34(state);
    }
    else {
      state.off = __peek;
      { const r = trySpeculate(state, parseMarkdownLeafFast__alt24); if (r !== null) return r; }
      { const r = trySpeculate(state, parseMarkdownLeafFast__alt25); if (r !== null) return r; }
      return parseMarkdownLeafFast__alt32(state);
    }
  } else if (__byte0 === 62) {
    return parseMarkdownLeafFast__alt17(state);
  } else if (__byte0 === 33) {
    state.off = __peek;
    { const r = trySpeculate(state, parseMarkdownLeafFast__alt26); if (r !== null) return r; }
    return parseMarkdownLeafFast__alt27(state);
  } else if (__byte0 === 38) {
    return parseMarkdownLeafFast__alt28(state);
  } else if (__byte0 === 124) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 124)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.startsWith("---", __peek)) {
      return parseMarkdownLeafFast__alt29(state);
    }
    if (__input.charCodeAt(__peek) === 58) {
      return parseMarkdownLeafFast__alt30(state);
    }
    return parseMarkdownLeafFast__alt31(state);
  } else if (__byte0 === 60) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 60)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(isCssIdentStart(__input.charCodeAt(__peek)))) return parseMarkdownLeafFast__alt36(state);
    {
      const __identStart = __peek;
      __peek++;
      while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
      const __tagOrig = __input.slice(__identStart, __peek);
      const __ident = __tagOrig.toLowerCase();
      if (__ident === "div") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "span") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "p") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "pre") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "code") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "blockquote") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "a") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "img") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "br") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "hr") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "ul") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "ol") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "li") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "dl") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "dt") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "dd") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "table") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "thead") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "tbody") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "tfoot") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "tr") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "td") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "th") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "caption") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "figure") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "figcaption") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "section") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "article") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "header") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "footer") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "nav") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "aside") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "main") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "address") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "details") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "summary") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "h1") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "h2") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "h3") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "h4") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "h5") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "h6") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "em") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "strong") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "i") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "b") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "u") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "s") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "small") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "sub") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "sup") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "kbd") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "var") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "samp") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "cite") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "q") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "dfn") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "abbr") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "time") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "mark") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "ruby") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "rt") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "rp") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "bdi") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "bdo") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "wbr") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "form") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "input") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "button") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "select") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "option") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "optgroup") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "textarea") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "label") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "fieldset") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "legend") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "datalist") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "output") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "progress") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "meter") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "video") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "audio") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "source") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "track") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "canvas") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "svg") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "math") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "iframe") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "embed") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "object") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "param") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "picture") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "script") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "style") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "noscript") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "template") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "html") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "head") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "body") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "title") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "meta") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "link") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      if (__ident === "base") {
      state.off = __peek; return parseMarkdownLeafFast__alt35__body(state, __tagOrig);
    }
      return parseMarkdownLeafFast__alt36(state);
    }
  } else if (isDigit(__input.charCodeAt(__peek))) {
    return parseMarkdownLeafFast__alt16(state);
  }
  { state.off = __peek; const r = parseMarkdownLeafFast__alt6(state); if (r !== null) return r; }
  { state.off = __peek; const r = parseMarkdownLeafFast__alt7(state); if (r !== null) return r; }
  state.off = __peek;
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseMarkdownParagraphFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __c2 = -1;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 10 && ((__c2 = __off + 1 < __len ? __input.charCodeAt(__off + 1) : -1), ((__c2 === 96 && (__input.startsWith("\n```", __off))) || (__c2 === 45 && (__input.startsWith("\n---", __off) || __input.startsWith("\n- ", __off) || __input.startsWith("\n-\n", __off))) || (__c2 === 42 && (__input.startsWith("\n***", __off) || __input.startsWith("\n* ", __off))) || (__c2 === 95 && (__input.startsWith("\n___", __off))) || (__c2 === 61 && (__input.startsWith("\n===", __off))) || (__c2 === 43 && (__input.startsWith("\n+ ", __off))) || __c2 === 10 || __c2 === 35 || __c2 === 62 || __c2 === 124 || __c2 === 91)))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownParagraph#0", text: text };
}

function validateMarkdownDocument(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __count_children = 0;
  while (!(__off >= __len)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; tryRoles(state, [validateMarkdownLeaf, validateMarkdownParagraph]); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("######", __off))) { state.off = __off; throw new SyntaxError("expected " + "######" + " at position " + __off); }
  __off += 6;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("#####", __off))) { state.off = __off; throw new SyntaxError("expected " + "#####" + " at position " + __off); }
  __off += 5;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("####", __off))) { state.off = __off; throw new SyntaxError("expected " + "####" + " at position " + __off); }
  __off += 4;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("###", __off))) { state.off = __off; throw new SyntaxError("expected " + "###" + " at position " + __off); }
  __off += 3;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt4(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 35 && __input.charCodeAt(__off + 1) === 35)) { state.off = __off; throw new SyntaxError("expected " + "##" + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt5(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 35)) { state.off = __off; throw new SyntaxError("expected " + "#" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt6(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  const __softStart = state.off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("===", __off))) { { state.off = __softStart; return null; } }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt7(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  const __softStart = state.off;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { { state.off = __softStart; return null; } }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt8(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("***", __off))) { state.off = __off; throw new SyntaxError("expected " + "***" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt9(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("___", __off))) { state.off = __off; throw new SyntaxError("expected " + "___" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt10(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt11(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("- [x]", __off))) { state.off = __off; throw new SyntaxError("expected " + "- [x]" + " at position " + __off); }
  __off += 5;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt12(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("- [ ]", __off))) { state.off = __off; throw new SyntaxError("expected " + "- [ ]" + " at position " + __off); }
  __off += 5;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt13(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 43 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "+ " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt14(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "* " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt15(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 45 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "- " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt16(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __index_s = __off;

  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __index_s);
    __off++;
    while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
    if (__off < __len && __input.charCodeAt(__off) === 0x2e && __off + 1 < __len && isDigit(__input.charCodeAt(__off + 1))) {
      __off++;
      while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
    }
    {
      const __ec = __off < __len ? __input.charCodeAt(__off) : 0;
      if (__ec === 0x65 || __ec === 0x45) {
        let __j = __off + 1;
        if (__j < __len && (__input.charCodeAt(__j) === 0x2b || __input.charCodeAt(__j) === 0x2d)) __j++;
        if (__j < __len && isDigit(__input.charCodeAt(__j))) {
          __off = __j;
          while (__off < __len && isDigit(__input.charCodeAt(__off))) __off++;
        }
      }
    }

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 46)) { state.off = __off; throw new SyntaxError("expected " + "." + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt17(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt18(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __lang_s = __off;

  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __lang_s);
    {
      const __c0 = __input.charCodeAt(__off);
      __off++;
      if (__c0 === 0x5c) {
        if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
          let __n = 0;
          while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
          if (__off < __len) {
            const __w = __input.charCodeAt(__off);
            if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
          }
        } else if (__off < __len) {
          __off++;
        }
      }
      while (__off < __len) {
        const __c2 = __input.charCodeAt(__off);
        if (__c2 === 0x5c) {
          __off++;
          if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
            let __n = 0;
            while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
            if (__off < __len) {
              const __w = __input.charCodeAt(__off);
              if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
            }
          } else if (__off < __len) {
            __off++;
          }
          continue;
        }
        if (!isCssIdentPart(__c2)) break;
        __off++;
      }
      // Raw url(...) tokenization (matches tokenized backend).
      if (
        __off - __lang_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__lang_s) | 32) === 0x75
        && (__input.charCodeAt(__lang_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__lang_s + 2) | 32) === 0x6c
      ) {
        __off++;
        while (__off < __len) {
          const __cu = __input.charCodeAt(__off);
          if (__cu === 0x29) { __off++; break; }
          if (__cu === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__cu === 0x22 || __cu === 0x27) {
            const __q = __cu;
            __off++;
            while (__off < __len) {
              const __ch = __input.charCodeAt(__off);
              if (__ch === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__ch === __q) { __off++; break; }
              if (__ch === 0x0a || __ch === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
      }
    }

  let body = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 96 && __input.startsWith("```", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      body = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    body = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt19(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```\n", __off))) { state.off = __off; throw new SyntaxError("expected " + "```\n" + " at position " + __off); }
  __off += 4;
  let body = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 96 && __input.startsWith("```", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      body = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    body = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("```", __off))) { state.off = __off; throw new SyntaxError("expected " + "```" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt20(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 42)) { state.off = __off; throw new SyntaxError("expected " + "**" + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 42 && __input.startsWith("**", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 42)) { state.off = __off; throw new SyntaxError("expected " + "**" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt21(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42)) { state.off = __off; throw new SyntaxError("expected " + "*" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 42) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 42)) { state.off = __off; throw new SyntaxError("expected " + "*" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt22(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 126 && __input.charCodeAt(__off + 1) === 126)) { state.off = __off; throw new SyntaxError("expected " + "~~" + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 126 && __input.startsWith("~~", __off))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 126 && __input.charCodeAt(__off + 1) === 126)) { state.off = __off; throw new SyntaxError("expected " + "~~" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt23(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 96)) { state.off = __off; throw new SyntaxError("expected " + "`" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 96) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 96)) { state.off = __off; throw new SyntaxError("expected " + "`" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt24(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let label = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      label = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    label = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      url = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 41)) { state.off = __off; throw new SyntaxError("expected " + ")" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt25(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let label = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      label = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    label = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93 && __input.charCodeAt(__off + 1) === 91)) { state.off = __off; throw new SyntaxError("expected " + "][" + " at position " + __off); }
  __off += 2;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt26(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let alt = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      alt = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    alt = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      url = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 41)) { state.off = __off; throw new SyntaxError("expected " + ")" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt27(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let alt = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      alt = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    alt = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93 && __input.charCodeAt(__off + 1) === 91)) { state.off = __off; throw new SyntaxError("expected " + "][" + " at position " + __off); }
  __off += 2;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt28(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 38)) { state.off = __off; throw new SyntaxError("expected " + "&" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;

  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __name_s);
    {
      const __c0 = __input.charCodeAt(__off);
      __off++;
      if (__c0 === 0x5c) {
        if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
          let __n = 0;
          while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
          if (__off < __len) {
            const __w = __input.charCodeAt(__off);
            if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
          }
        } else if (__off < __len) {
          __off++;
        }
      }
      while (__off < __len) {
        const __c2 = __input.charCodeAt(__off);
        if (__c2 === 0x5c) {
          __off++;
          if (__off < __len && isHexDigit(__input.charCodeAt(__off))) {
            let __n = 0;
            while (__off < __len && __n < 6 && isHexDigit(__input.charCodeAt(__off))) { __off++; __n++; }
            if (__off < __len) {
              const __w = __input.charCodeAt(__off);
              if (__w === 0x20 || __w === 0x09 || __w === 0x0a || __w === 0x0d) __off++;
            }
          } else if (__off < __len) {
            __off++;
          }
          continue;
        }
        if (!isCssIdentPart(__c2)) break;
        __off++;
      }
      // Raw url(...) tokenization (matches tokenized backend).
      if (
        __off - __name_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__name_s) | 32) === 0x75
        && (__input.charCodeAt(__name_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__name_s + 2) | 32) === 0x6c
      ) {
        __off++;
        while (__off < __len) {
          const __cu = __input.charCodeAt(__off);
          if (__cu === 0x29) { __off++; break; }
          if (__cu === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__cu === 0x22 || __cu === 0x27) {
            const __q = __cu;
            __off++;
            while (__off < __len) {
              const __ch = __input.charCodeAt(__off);
              if (__ch === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__ch === __q) { __off++; break; }
              if (__ch === 0x0a || __ch === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
      }
    }

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 59)) { state.off = __off; throw new SyntaxError("expected " + ";" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt29(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt30(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
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
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
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
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt31(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  let first = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      first = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    first = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  let second = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      second = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    second = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 124)) { state.off = __off; throw new SyntaxError("expected " + "|" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt32(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91)) { state.off = __off; throw new SyntaxError("expected " + "[" + " at position " + __off); }
  __off += 1;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      url = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt33(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91 && __input.charCodeAt(__off + 1) === 94)) { state.off = __off; throw new SyntaxError("expected " + "[^" + " at position " + __off); }
  __off += 2;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt34(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 91 && __input.charCodeAt(__off + 1) === 94)) { state.off = __off; throw new SyntaxError("expected " + "[^" + " at position " + __off); }
  __off += 2;
  let id = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      id = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    id = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 93)) { state.off = __off; throw new SyntaxError("expected " + "]" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt35(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60)) { state.off = __off; throw new SyntaxError("expected " + "<" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __tag_s = __off;
  let tag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __tag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  tag = __input.slice(__tag_s, __off);
  const __tag_lc = tag.toLowerCase();
  if (!(__tag_lc === "div" || __tag_lc === "span" || __tag_lc === "p" || __tag_lc === "pre" || __tag_lc === "code" || __tag_lc === "blockquote" || __tag_lc === "a" || __tag_lc === "img" || __tag_lc === "br" || __tag_lc === "hr" || __tag_lc === "ul" || __tag_lc === "ol" || __tag_lc === "li" || __tag_lc === "dl" || __tag_lc === "dt" || __tag_lc === "dd" || __tag_lc === "table" || __tag_lc === "thead" || __tag_lc === "tbody" || __tag_lc === "tfoot" || __tag_lc === "tr" || __tag_lc === "td" || __tag_lc === "th" || __tag_lc === "caption" || __tag_lc === "figure" || __tag_lc === "figcaption" || __tag_lc === "section" || __tag_lc === "article" || __tag_lc === "header" || __tag_lc === "footer" || __tag_lc === "nav" || __tag_lc === "aside" || __tag_lc === "main" || __tag_lc === "address" || __tag_lc === "details" || __tag_lc === "summary" || __tag_lc === "h1" || __tag_lc === "h2" || __tag_lc === "h3" || __tag_lc === "h4" || __tag_lc === "h5" || __tag_lc === "h6" || __tag_lc === "em" || __tag_lc === "strong" || __tag_lc === "i" || __tag_lc === "b" || __tag_lc === "u" || __tag_lc === "s" || __tag_lc === "small" || __tag_lc === "sub" || __tag_lc === "sup" || __tag_lc === "kbd" || __tag_lc === "var" || __tag_lc === "samp" || __tag_lc === "cite" || __tag_lc === "q" || __tag_lc === "dfn" || __tag_lc === "abbr" || __tag_lc === "time" || __tag_lc === "mark" || __tag_lc === "ruby" || __tag_lc === "rt" || __tag_lc === "rp" || __tag_lc === "bdi" || __tag_lc === "bdo" || __tag_lc === "wbr" || __tag_lc === "form" || __tag_lc === "input" || __tag_lc === "button" || __tag_lc === "select" || __tag_lc === "option" || __tag_lc === "optgroup" || __tag_lc === "textarea" || __tag_lc === "label" || __tag_lc === "fieldset" || __tag_lc === "legend" || __tag_lc === "datalist" || __tag_lc === "output" || __tag_lc === "progress" || __tag_lc === "meter" || __tag_lc === "video" || __tag_lc === "audio" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "canvas" || __tag_lc === "svg" || __tag_lc === "math" || __tag_lc === "iframe" || __tag_lc === "embed" || __tag_lc === "object" || __tag_lc === "param" || __tag_lc === "picture" || __tag_lc === "script" || __tag_lc === "style" || __tag_lc === "noscript" || __tag_lc === "template" || __tag_lc === "html" || __tag_lc === "head" || __tag_lc === "body" || __tag_lc === "title" || __tag_lc === "meta" || __tag_lc === "link" || __tag_lc === "base")) { state.off = __off; throw new SyntaxError("expected one of div, span, p, pre, code, blockquote, a, img, br, hr, ul, ol, li, dl, dt, dd, table, thead, tbody, tfoot, tr, td, th, caption, figure, figcaption, section, article, header, footer, nav, aside, main, address, details, summary, h1, h2, h3, h4, h5, h6, em, strong, i, b, u, s, small, sub, sup, kbd, var, samp, cite, q, dfn, abbr, time, mark, ruby, rt, rp, bdi, bdo, wbr, form, input, button, select, option, optgroup, textarea, label, fieldset, legend, datalist, output, progress, meter, video, audio, source, track, canvas, svg, math, iframe, embed, object, param, picture, script, style, noscript, template, html, head, body, title, meta, link, base at position " + __tag_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let body = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    body = __input.slice(__startOff, __earliest);
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) { state.off = __off; throw new SyntaxError("expected " + "</" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __closingTag_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closingTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf__alt36(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60)) { state.off = __off; throw new SyntaxError("expected " + "<" + " at position " + __off); }
  __off += 1;
  let url = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 62) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      url = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    url = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateMarkdownLeaf(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
  // Skip leading ws before discriminating on first span.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
    const __byte0 = __input.charCodeAt(__peek);
  if (__byte0 === 35) {
    if (__input.startsWith("######", __peek)) {
      return validateMarkdownLeaf__alt0(state);
    }
    else if (__input.startsWith("#####", __peek)) {
      return validateMarkdownLeaf__alt1(state);
    }
    else if (__input.startsWith("####", __peek)) {
      return validateMarkdownLeaf__alt2(state);
    }
    else if (__input.startsWith("###", __peek)) {
      return validateMarkdownLeaf__alt3(state);
    }
    else if (__input.charCodeAt(__peek) === 35 && __input.charCodeAt(__peek + 1) === 35) {
      return validateMarkdownLeaf__alt4(state);
    }
    else {
      return validateMarkdownLeaf__alt5(state);
    }
  } else if (__byte0 === 45) {
    if (__input.startsWith("- [x]", __peek)) {
      return validateMarkdownLeaf__alt11(state);
    }
    else if (__input.startsWith("- [ ]", __peek)) {
      return validateMarkdownLeaf__alt12(state);
    }
    else if (__input.startsWith("---", __peek)) {
      return validateMarkdownLeaf__alt10(state);
    }
    else if (__input.charCodeAt(__peek) === 45 && __input.charCodeAt(__peek + 1) === 32) {
      return validateMarkdownLeaf__alt15(state);
    }
  } else if (__byte0 === 96) {
    if (__input.startsWith("```\n", __peek)) {
      return validateMarkdownLeaf__alt19(state);
    }
    else if (__input.startsWith("```", __peek)) {
      return validateMarkdownLeaf__alt18(state);
    }
    else {
      return validateMarkdownLeaf__alt23(state);
    }
  } else if (__byte0 === 42) {
    if (__input.startsWith("***", __peek)) {
      return validateMarkdownLeaf__alt8(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 32) {
      return validateMarkdownLeaf__alt14(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 42) {
      return validateMarkdownLeaf__alt20(state);
    }
    else {
      return validateMarkdownLeaf__alt21(state);
    }
  } else if (__byte0 === 95) {
    if (__input.startsWith("___", __peek)) {
      return validateMarkdownLeaf__alt9(state);
    }
  } else if (__byte0 === 43) {
    if (__input.charCodeAt(__peek) === 43 && __input.charCodeAt(__peek + 1) === 32) {
      return validateMarkdownLeaf__alt13(state);
    }
  } else if (__byte0 === 126) {
    if (__input.charCodeAt(__peek) === 126 && __input.charCodeAt(__peek + 1) === 126) {
      return validateMarkdownLeaf__alt22(state);
    }
  } else if (__byte0 === 91) {
    if (__input.charCodeAt(__peek) === 91 && __input.charCodeAt(__peek + 1) === 94) {
      state.off = __peek;
      { const r = trySpeculate(state, validateMarkdownLeaf__alt33); if (r !== null) return r; }
      return validateMarkdownLeaf__alt34(state);
    }
    else {
      state.off = __peek;
      { const r = trySpeculate(state, validateMarkdownLeaf__alt24); if (r !== null) return r; }
      { const r = trySpeculate(state, validateMarkdownLeaf__alt25); if (r !== null) return r; }
      return validateMarkdownLeaf__alt32(state);
    }
  } else if (__byte0 === 62) {
    return validateMarkdownLeaf__alt17(state);
  } else if (__byte0 === 33) {
    state.off = __peek;
    { const r = trySpeculate(state, validateMarkdownLeaf__alt26); if (r !== null) return r; }
    return validateMarkdownLeaf__alt27(state);
  } else if (__byte0 === 38) {
    return validateMarkdownLeaf__alt28(state);
  } else if (__byte0 === 124) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 124)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.startsWith("---", __peek)) {
      return validateMarkdownLeaf__alt29(state);
    }
    if (__input.charCodeAt(__peek) === 58) {
      return validateMarkdownLeaf__alt30(state);
    }
    return validateMarkdownLeaf__alt31(state);
  } else if (__byte0 === 60) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 60)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(isCssIdentStart(__input.charCodeAt(__peek)))) return validateMarkdownLeaf__alt36(state);
    {
      const __identStart = __peek;
      __peek++;
      while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
      const __tagOrig = __input.slice(__identStart, __peek);
      const __ident = __tagOrig.toLowerCase();
      if (__ident === "div") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "span") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "p") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "pre") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "code") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "blockquote") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "a") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "img") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "br") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "hr") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "ul") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "ol") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "li") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "dl") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "dt") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "dd") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "table") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "thead") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "tbody") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "tfoot") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "tr") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "td") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "th") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "caption") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "figure") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "figcaption") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "section") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "article") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "header") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "footer") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "nav") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "aside") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "main") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "address") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "details") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "summary") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "h1") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "h2") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "h3") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "h4") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "h5") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "h6") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "em") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "strong") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "i") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "b") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "u") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "s") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "small") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "sub") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "sup") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "kbd") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "var") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "samp") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "cite") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "q") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "dfn") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "abbr") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "time") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "mark") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "ruby") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "rt") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "rp") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "bdi") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "bdo") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "wbr") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "form") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "input") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "button") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "select") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "option") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "optgroup") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "textarea") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "label") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "fieldset") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "legend") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "datalist") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "output") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "progress") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "meter") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "video") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "audio") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "source") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "track") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "canvas") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "svg") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "math") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "iframe") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "embed") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "object") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "param") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "picture") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "script") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "style") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "noscript") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "template") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "html") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "head") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "body") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "title") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "meta") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "link") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      if (__ident === "base") {
      state.off = __peek; return validateMarkdownLeaf__alt35__body(state, __tagOrig);
    }
      return validateMarkdownLeaf__alt36(state);
    }
  } else if (isDigit(__input.charCodeAt(__peek))) {
    return validateMarkdownLeaf__alt16(state);
  }
  { state.off = __peek; const r = validateMarkdownLeaf__alt6(state); if (r !== null) return r; }
  { state.off = __peek; const r = validateMarkdownLeaf__alt7(state); if (r !== null) return r; }
  state.off = __peek;
  throw new SyntaxError('no production matched at position ' + __peek);
}

function validateMarkdownParagraph(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __c2 = -1;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if ((__c === 10 && ((__c2 = __off + 1 < __len ? __input.charCodeAt(__off + 1) : -1), ((__c2 === 96 && (__input.startsWith("\n```", __off))) || (__c2 === 45 && (__input.startsWith("\n---", __off) || __input.startsWith("\n- ", __off) || __input.startsWith("\n-\n", __off))) || (__c2 === 42 && (__input.startsWith("\n***", __off) || __input.startsWith("\n* ", __off))) || (__c2 === 95 && (__input.startsWith("\n___", __off))) || (__c2 === 61 && (__input.startsWith("\n===", __off))) || (__c2 === 43 && (__input.startsWith("\n+ ", __off))) || __c2 === 10 || __c2 === 35 || __c2 === 62 || __c2 === 124 || __c2 === 91)))) break;
      __off++;
    }
    let __lastNonWs = __off;
    while (__lastNonWs > __startOff) {
      const __tc = __input.charCodeAt(__lastNonWs - 1);
      if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
      __lastNonWs--;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      text = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    text = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function parseMarkdownLeafFast__alt35__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let body = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    body = __input.slice(__startOff, __earliest);
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) { state.off = __off; throw new SyntaxError("expected " + "</" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __closingTag_s = __off;
  let closingTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closingTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closingTag = __input.slice(__closingTag_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "MarkdownLeaf#35", tag: __pre_tag, body: body, closingTag: closingTag };
}

function validateMarkdownLeaf__alt35__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let body = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    body = __input.slice(__startOff, __earliest);
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) { state.off = __off; throw new SyntaxError("expected " + "</" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __closingTag_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closingTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

const __defaultTarget: string | undefined = undefined;

function __build_MarkdownDocument_0_ast(captures: any): any {
  return { type: "document", children: __renderSlot_ast(captures.children) };
}

function __build_MarkdownDocument_0_html(captures: any): any {
  return String((captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_html).join(" ") : (__renderSlot_html(captures.children) ?? ""))));
}

function __build_MarkdownDocument_0_source(captures: any): any {
  return String((captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map(__renderSlot_source).join(" ") : (__renderSlot_source(captures.children) ?? ""))));
}

function __build_MarkdownLeaf_0_ast(captures: any): any {
  return { type: "heading", depth: 6, text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_0_html(captures: any): any {
  return "<h6>" + (__renderSlot_html(captures.text) ?? "") + "</h6>";
}

function __build_MarkdownLeaf_0_source(captures: any): any {
  return "###### " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_1_ast(captures: any): any {
  return { type: "heading", depth: 5, text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_1_html(captures: any): any {
  return "<h5>" + (__renderSlot_html(captures.text) ?? "") + "</h5>";
}

function __build_MarkdownLeaf_1_source(captures: any): any {
  return "##### " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_2_ast(captures: any): any {
  return { type: "heading", depth: 4, text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_2_html(captures: any): any {
  return "<h4>" + (__renderSlot_html(captures.text) ?? "") + "</h4>";
}

function __build_MarkdownLeaf_2_source(captures: any): any {
  return "#### " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_3_ast(captures: any): any {
  return { type: "heading", depth: 3, text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_3_html(captures: any): any {
  return "<h3>" + (__renderSlot_html(captures.text) ?? "") + "</h3>";
}

function __build_MarkdownLeaf_3_source(captures: any): any {
  return "### " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_4_ast(captures: any): any {
  return { type: "heading", depth: 2, text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_4_html(captures: any): any {
  return "<h2>" + (__renderSlot_html(captures.text) ?? "") + "</h2>";
}

function __build_MarkdownLeaf_4_source(captures: any): any {
  return "## " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_5_ast(captures: any): any {
  return { type: "heading", depth: 1, text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_5_html(captures: any): any {
  return "<h1>" + (__renderSlot_html(captures.text) ?? "") + "</h1>";
}

function __build_MarkdownLeaf_5_source(captures: any): any {
  return "# " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_6_ast(captures: any): any {
  return { type: "heading", depth: 1, text: __renderSlot_ast(captures.text), style: "setext" };
}

function __build_MarkdownLeaf_6_html(captures: any): any {
  return "<h1>" + (__renderSlot_html(captures.text) ?? "") + "</h1>";
}

function __build_MarkdownLeaf_6_source(captures: any): any {
  return (__renderSlot_source(captures.text) ?? "") + " ===";
}

function __build_MarkdownLeaf_7_ast(captures: any): any {
  return { type: "heading", depth: 2, text: __renderSlot_ast(captures.text), style: "setext" };
}

function __build_MarkdownLeaf_7_html(captures: any): any {
  return "<h2>" + (__renderSlot_html(captures.text) ?? "") + "</h2>";
}

function __build_MarkdownLeaf_7_source(captures: any): any {
  return (__renderSlot_source(captures.text) ?? "") + " ---";
}

function __build_MarkdownLeaf_8_ast(captures: any): any {
  return { type: "thematic-break", marker: "*" };
}

function __build_MarkdownLeaf_8_html(captures: any): any {
  return String("<hr>");
}

function __build_MarkdownLeaf_8_source(captures: any): any {
  return String("***");
}

function __build_MarkdownLeaf_9_ast(captures: any): any {
  return { type: "thematic-break", marker: "_" };
}

function __build_MarkdownLeaf_9_html(captures: any): any {
  return String("<hr>");
}

function __build_MarkdownLeaf_9_source(captures: any): any {
  return String("___");
}

function __build_MarkdownLeaf_10_ast(captures: any): any {
  return { type: "thematic-break" };
}

function __build_MarkdownLeaf_10_html(captures: any): any {
  return String("<hr>");
}

function __build_MarkdownLeaf_10_source(captures: any): any {
  return String("---");
}

function __build_MarkdownLeaf_11_ast(captures: any): any {
  return { type: "task-list-item", checked: true, marker: "x", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_11_html(captures: any): any {
  return "<li><input type=\"checkbox\" checked>" + (__renderSlot_html(captures.text) ?? "") + "</li>";
}

function __build_MarkdownLeaf_11_source(captures: any): any {
  return "- [x] " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_12_ast(captures: any): any {
  return { type: "task-list-item", checked: false, text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_12_html(captures: any): any {
  return "<li><input type=\"checkbox\">" + (__renderSlot_html(captures.text) ?? "") + "</li>";
}

function __build_MarkdownLeaf_12_source(captures: any): any {
  return "- [ ] " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_13_ast(captures: any): any {
  return { type: "list-item", ordered: false, marker: "+", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_13_html(captures: any): any {
  return "<li>" + (__renderSlot_html(captures.text) ?? "") + "</li>";
}

function __build_MarkdownLeaf_13_source(captures: any): any {
  return "+ " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_14_ast(captures: any): any {
  return { type: "list-item", ordered: false, marker: "*", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_14_html(captures: any): any {
  return "<li>" + (__renderSlot_html(captures.text) ?? "") + "</li>";
}

function __build_MarkdownLeaf_14_source(captures: any): any {
  return "* " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_15_ast(captures: any): any {
  return { type: "list-item", ordered: false, text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_15_html(captures: any): any {
  return "<li>" + (__renderSlot_html(captures.text) ?? "") + "</li>";
}

function __build_MarkdownLeaf_15_source(captures: any): any {
  return "- " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_16_ast(captures: any): any {
  return { type: "list-item", ordered: true, index: __renderSlot_ast(captures.index), text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_16_html(captures: any): any {
  return "<li>" + (__renderSlot_html(captures.text) ?? "") + "</li>";
}

function __build_MarkdownLeaf_16_source(captures: any): any {
  return (__renderSlot_source(captures.index) ?? "") + ". " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_17_ast(captures: any): any {
  return { type: "blockquote", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_17_html(captures: any): any {
  return "<blockquote>" + (__renderSlot_html(captures.text) ?? "") + "</blockquote>";
}

function __build_MarkdownLeaf_17_source(captures: any): any {
  return "> " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_18_ast(captures: any): any {
  return { type: "code-block", lang: __renderSlot_ast(captures.lang), text: __renderSlot_ast(captures.body) };
}

function __build_MarkdownLeaf_18_html(captures: any): any {
  return "<pre><code class=\"lang-" + (__renderSlot_html(captures.lang) ?? "") + "\">" + (__renderSlot_html(captures.body) ?? "") + "</code></pre>";
}

function __build_MarkdownLeaf_18_source(captures: any): any {
  return "```" + (__renderSlot_source(captures.lang) ?? "") + " " + (__renderSlot_source(captures.body) ?? "") + " ```";
}

function __build_MarkdownLeaf_19_ast(captures: any): any {
  return { type: "code-block", text: __renderSlot_ast(captures.body) };
}

function __build_MarkdownLeaf_19_html(captures: any): any {
  return "<pre><code>" + (__renderSlot_html(captures.body) ?? "") + "</code></pre>";
}

function __build_MarkdownLeaf_19_source(captures: any): any {
  return "```\n" + (__renderSlot_source(captures.body) ?? "") + " ```";
}

function __build_MarkdownLeaf_20_ast(captures: any): any {
  return { type: "bold", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_20_html(captures: any): any {
  return "<strong>" + (__renderSlot_html(captures.text) ?? "") + "</strong>";
}

function __build_MarkdownLeaf_20_source(captures: any): any {
  return "**" + (__renderSlot_source(captures.text) ?? "") + "**";
}

function __build_MarkdownLeaf_21_ast(captures: any): any {
  return { type: "italic", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_21_html(captures: any): any {
  return "<em>" + (__renderSlot_html(captures.text) ?? "") + "</em>";
}

function __build_MarkdownLeaf_21_source(captures: any): any {
  return "*" + (__renderSlot_source(captures.text) ?? "") + "*";
}

function __build_MarkdownLeaf_22_ast(captures: any): any {
  return { type: "strikethrough", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_22_html(captures: any): any {
  return "<s>" + (__renderSlot_html(captures.text) ?? "") + "</s>";
}

function __build_MarkdownLeaf_22_source(captures: any): any {
  return "~~" + (__renderSlot_source(captures.text) ?? "") + "~~";
}

function __build_MarkdownLeaf_23_ast(captures: any): any {
  return { type: "inline-code", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_23_html(captures: any): any {
  return "<code>" + (__renderSlot_html(captures.text) ?? "") + "</code>";
}

function __build_MarkdownLeaf_23_source(captures: any): any {
  return "`" + (__renderSlot_source(captures.text) ?? "") + "`";
}

function __build_MarkdownLeaf_24_ast(captures: any): any {
  return { type: "link", label: __renderSlot_ast(captures.label), url: __renderSlot_ast(captures.url) };
}

function __build_MarkdownLeaf_24_html(captures: any): any {
  return "<a href=\"" + (__renderSlot_html(captures.url) ?? "") + "\">" + (__renderSlot_html(captures.label) ?? "") + "</a>";
}

function __build_MarkdownLeaf_24_source(captures: any): any {
  return "[" + (__renderSlot_source(captures.label) ?? "") + "](" + (__renderSlot_source(captures.url) ?? "") + ")";
}

function __build_MarkdownLeaf_25_ast(captures: any): any {
  return { type: "reference-link", label: __renderSlot_ast(captures.label), id: __renderSlot_ast(captures.id) };
}

function __build_MarkdownLeaf_25_html(captures: any): any {
  return "<a href=\"#" + (__renderSlot_html(captures.id) ?? "") + "\">" + (__renderSlot_html(captures.label) ?? "") + "</a>";
}

function __build_MarkdownLeaf_25_source(captures: any): any {
  return "[" + (__renderSlot_source(captures.label) ?? "") + "][" + (__renderSlot_source(captures.id) ?? "") + "]";
}

function __build_MarkdownLeaf_26_ast(captures: any): any {
  return { type: "image", alt: __renderSlot_ast(captures.alt), url: __renderSlot_ast(captures.url) };
}

function __build_MarkdownLeaf_26_html(captures: any): any {
  return "<img src=\"" + (__renderSlot_html(captures.url) ?? "") + "\" alt=\"" + (__renderSlot_html(captures.alt) ?? "") + "\">";
}

function __build_MarkdownLeaf_26_source(captures: any): any {
  return "![" + (__renderSlot_source(captures.alt) ?? "") + "](" + (__renderSlot_source(captures.url) ?? "") + ")";
}

function __build_MarkdownLeaf_27_ast(captures: any): any {
  return { type: "reference-image", alt: __renderSlot_ast(captures.alt), id: __renderSlot_ast(captures.id) };
}

function __build_MarkdownLeaf_27_html(captures: any): any {
  return "<img src=\"#" + (__renderSlot_html(captures.id) ?? "") + "\" alt=\"" + (__renderSlot_html(captures.alt) ?? "") + "\">";
}

function __build_MarkdownLeaf_27_source(captures: any): any {
  return "![" + (__renderSlot_source(captures.alt) ?? "") + "][" + (__renderSlot_source(captures.id) ?? "") + "]";
}

function __build_MarkdownLeaf_28_ast(captures: any): any {
  return { type: "entity", name: __renderSlot_ast(captures.name) };
}

function __build_MarkdownLeaf_28_html(captures: any): any {
  return "&" + (__renderSlot_html(captures.name) ?? "") + ";";
}

function __build_MarkdownLeaf_28_source(captures: any): any {
  return "&" + (__renderSlot_source(captures.name) ?? "") + ";";
}

function __build_MarkdownLeaf_29_ast(captures: any): any {
  return { type: "table-delimiter", variant: "plain", align: ["default", "default"] };
}

function __build_MarkdownLeaf_29_html(captures: any): any {
  return "";
}

function __build_MarkdownLeaf_29_source(captures: any): any {
  return String("| --- | --- |");
}

function __build_MarkdownLeaf_30_ast(captures: any): any {
  return { type: "table-delimiter", variant: "aligned", align: ["left", "right"] };
}

function __build_MarkdownLeaf_30_html(captures: any): any {
  return "";
}

function __build_MarkdownLeaf_30_source(captures: any): any {
  return String("|:---|---:|");
}

function __build_MarkdownLeaf_31_ast(captures: any): any {
  return { type: "table-row", cells: [__renderSlot_ast(captures.first), __renderSlot_ast(captures.second)] };
}

function __build_MarkdownLeaf_31_html(captures: any): any {
  return "<tr><td>" + (__renderSlot_html(captures.first) ?? "") + "</td><td>" + (__renderSlot_html(captures.second) ?? "") + "</td></tr>";
}

function __build_MarkdownLeaf_31_source(captures: any): any {
  return "| " + (__renderSlot_source(captures.first) ?? "") + " | " + (__renderSlot_source(captures.second) ?? "") + " |";
}

function __build_MarkdownLeaf_32_ast(captures: any): any {
  return { type: "definition", id: __renderSlot_ast(captures.id), url: __renderSlot_ast(captures.url) };
}

function __build_MarkdownLeaf_32_html(captures: any): any {
  return "";
}

function __build_MarkdownLeaf_32_source(captures: any): any {
  return "[" + (__renderSlot_source(captures.id) ?? "") + "]: " + (__renderSlot_source(captures.url) ?? "");
}

function __build_MarkdownLeaf_33_ast(captures: any): any {
  return { type: "footnote-definition", id: __renderSlot_ast(captures.id), text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownLeaf_33_html(captures: any): any {
  return "<div class=\"footnote\" id=\"fn" + (__renderSlot_html(captures.id) ?? "") + "\">" + (__renderSlot_html(captures.text) ?? "") + "</div>";
}

function __build_MarkdownLeaf_33_source(captures: any): any {
  return "[^" + (__renderSlot_source(captures.id) ?? "") + "]: " + (__renderSlot_source(captures.text) ?? "");
}

function __build_MarkdownLeaf_34_ast(captures: any): any {
  return { type: "footnote-reference", id: __renderSlot_ast(captures.id) };
}

function __build_MarkdownLeaf_34_html(captures: any): any {
  return "<sup><a href=\"#fn" + (__renderSlot_html(captures.id) ?? "") + "\">" + (__renderSlot_html(captures.id) ?? "") + "</a></sup>";
}

function __build_MarkdownLeaf_34_source(captures: any): any {
  return "[^" + (__renderSlot_source(captures.id) ?? "") + "]";
}

function __build_MarkdownLeaf_35_ast(captures: any): any {
  return { type: "html", tag: __renderSlot_ast(captures.tag), text: __renderSlot_ast(captures.body), closingTag: __renderSlot_ast(captures.closingTag) };
}

function __build_MarkdownLeaf_35_html(captures: any): any {
  return "<" + (__renderSlot_html(captures.tag) ?? "") + ">" + (__renderSlot_html(captures.body) ?? "") + "</" + (__renderSlot_html(captures.closingTag) ?? "") + ">";
}

function __build_MarkdownLeaf_35_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.tag) ?? "") + ">" + (__renderSlot_source(captures.body) ?? "") + "</" + (__renderSlot_source(captures.closingTag) ?? "") + ">";
}

function __build_MarkdownLeaf_36_ast(captures: any): any {
  return { type: "autolink", url: __renderSlot_ast(captures.url) };
}

function __build_MarkdownLeaf_36_html(captures: any): any {
  return "<a class=\"autolink\" href=\"" + (__renderSlot_html(captures.url) ?? "") + "\">" + (__renderSlot_html(captures.url) ?? "") + "</a>";
}

function __build_MarkdownLeaf_36_source(captures: any): any {
  return "<" + (__renderSlot_source(captures.url) ?? "") + ">";
}

function __build_MarkdownParagraph_0_ast(captures: any): any {
  return { type: "paragraph", text: __renderSlot_ast(captures.text) };
}

function __build_MarkdownParagraph_0_html(captures: any): any {
  return "<p>" + (__renderSlot_html(captures.text) ?? "") + "</p>";
}

function __build_MarkdownParagraph_0_source(captures: any): any {
  return String((__renderSlot_source(captures.text) ?? ""));
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "MarkdownDocument#0": return __build_MarkdownDocument_0_ast(captures);
    case "MarkdownLeaf#0": return __build_MarkdownLeaf_0_ast(captures);
    case "MarkdownLeaf#1": return __build_MarkdownLeaf_1_ast(captures);
    case "MarkdownLeaf#2": return __build_MarkdownLeaf_2_ast(captures);
    case "MarkdownLeaf#3": return __build_MarkdownLeaf_3_ast(captures);
    case "MarkdownLeaf#4": return __build_MarkdownLeaf_4_ast(captures);
    case "MarkdownLeaf#5": return __build_MarkdownLeaf_5_ast(captures);
    case "MarkdownLeaf#6": return __build_MarkdownLeaf_6_ast(captures);
    case "MarkdownLeaf#7": return __build_MarkdownLeaf_7_ast(captures);
    case "MarkdownLeaf#8": return __build_MarkdownLeaf_8_ast(captures);
    case "MarkdownLeaf#9": return __build_MarkdownLeaf_9_ast(captures);
    case "MarkdownLeaf#10": return __build_MarkdownLeaf_10_ast(captures);
    case "MarkdownLeaf#11": return __build_MarkdownLeaf_11_ast(captures);
    case "MarkdownLeaf#12": return __build_MarkdownLeaf_12_ast(captures);
    case "MarkdownLeaf#13": return __build_MarkdownLeaf_13_ast(captures);
    case "MarkdownLeaf#14": return __build_MarkdownLeaf_14_ast(captures);
    case "MarkdownLeaf#15": return __build_MarkdownLeaf_15_ast(captures);
    case "MarkdownLeaf#16": return __build_MarkdownLeaf_16_ast(captures);
    case "MarkdownLeaf#17": return __build_MarkdownLeaf_17_ast(captures);
    case "MarkdownLeaf#18": return __build_MarkdownLeaf_18_ast(captures);
    case "MarkdownLeaf#19": return __build_MarkdownLeaf_19_ast(captures);
    case "MarkdownLeaf#20": return __build_MarkdownLeaf_20_ast(captures);
    case "MarkdownLeaf#21": return __build_MarkdownLeaf_21_ast(captures);
    case "MarkdownLeaf#22": return __build_MarkdownLeaf_22_ast(captures);
    case "MarkdownLeaf#23": return __build_MarkdownLeaf_23_ast(captures);
    case "MarkdownLeaf#24": return __build_MarkdownLeaf_24_ast(captures);
    case "MarkdownLeaf#25": return __build_MarkdownLeaf_25_ast(captures);
    case "MarkdownLeaf#26": return __build_MarkdownLeaf_26_ast(captures);
    case "MarkdownLeaf#27": return __build_MarkdownLeaf_27_ast(captures);
    case "MarkdownLeaf#28": return __build_MarkdownLeaf_28_ast(captures);
    case "MarkdownLeaf#29": return __build_MarkdownLeaf_29_ast(captures);
    case "MarkdownLeaf#30": return __build_MarkdownLeaf_30_ast(captures);
    case "MarkdownLeaf#31": return __build_MarkdownLeaf_31_ast(captures);
    case "MarkdownLeaf#32": return __build_MarkdownLeaf_32_ast(captures);
    case "MarkdownLeaf#33": return __build_MarkdownLeaf_33_ast(captures);
    case "MarkdownLeaf#34": return __build_MarkdownLeaf_34_ast(captures);
    case "MarkdownLeaf#35": return __build_MarkdownLeaf_35_ast(captures);
    case "MarkdownLeaf#36": return __build_MarkdownLeaf_36_ast(captures);
    case "MarkdownParagraph#0": return __build_MarkdownParagraph_0_ast(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_html(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'html')");
  }
  switch (captures.__production) {
    case "MarkdownDocument#0": return __build_MarkdownDocument_0_html(captures);
    case "MarkdownLeaf#0": return __build_MarkdownLeaf_0_html(captures);
    case "MarkdownLeaf#1": return __build_MarkdownLeaf_1_html(captures);
    case "MarkdownLeaf#2": return __build_MarkdownLeaf_2_html(captures);
    case "MarkdownLeaf#3": return __build_MarkdownLeaf_3_html(captures);
    case "MarkdownLeaf#4": return __build_MarkdownLeaf_4_html(captures);
    case "MarkdownLeaf#5": return __build_MarkdownLeaf_5_html(captures);
    case "MarkdownLeaf#6": return __build_MarkdownLeaf_6_html(captures);
    case "MarkdownLeaf#7": return __build_MarkdownLeaf_7_html(captures);
    case "MarkdownLeaf#8": return __build_MarkdownLeaf_8_html(captures);
    case "MarkdownLeaf#9": return __build_MarkdownLeaf_9_html(captures);
    case "MarkdownLeaf#10": return __build_MarkdownLeaf_10_html(captures);
    case "MarkdownLeaf#11": return __build_MarkdownLeaf_11_html(captures);
    case "MarkdownLeaf#12": return __build_MarkdownLeaf_12_html(captures);
    case "MarkdownLeaf#13": return __build_MarkdownLeaf_13_html(captures);
    case "MarkdownLeaf#14": return __build_MarkdownLeaf_14_html(captures);
    case "MarkdownLeaf#15": return __build_MarkdownLeaf_15_html(captures);
    case "MarkdownLeaf#16": return __build_MarkdownLeaf_16_html(captures);
    case "MarkdownLeaf#17": return __build_MarkdownLeaf_17_html(captures);
    case "MarkdownLeaf#18": return __build_MarkdownLeaf_18_html(captures);
    case "MarkdownLeaf#19": return __build_MarkdownLeaf_19_html(captures);
    case "MarkdownLeaf#20": return __build_MarkdownLeaf_20_html(captures);
    case "MarkdownLeaf#21": return __build_MarkdownLeaf_21_html(captures);
    case "MarkdownLeaf#22": return __build_MarkdownLeaf_22_html(captures);
    case "MarkdownLeaf#23": return __build_MarkdownLeaf_23_html(captures);
    case "MarkdownLeaf#24": return __build_MarkdownLeaf_24_html(captures);
    case "MarkdownLeaf#25": return __build_MarkdownLeaf_25_html(captures);
    case "MarkdownLeaf#26": return __build_MarkdownLeaf_26_html(captures);
    case "MarkdownLeaf#27": return __build_MarkdownLeaf_27_html(captures);
    case "MarkdownLeaf#28": return __build_MarkdownLeaf_28_html(captures);
    case "MarkdownLeaf#29": return __build_MarkdownLeaf_29_html(captures);
    case "MarkdownLeaf#30": return __build_MarkdownLeaf_30_html(captures);
    case "MarkdownLeaf#31": return __build_MarkdownLeaf_31_html(captures);
    case "MarkdownLeaf#32": return __build_MarkdownLeaf_32_html(captures);
    case "MarkdownLeaf#33": return __build_MarkdownLeaf_33_html(captures);
    case "MarkdownLeaf#34": return __build_MarkdownLeaf_34_html(captures);
    case "MarkdownLeaf#35": return __build_MarkdownLeaf_35_html(captures);
    case "MarkdownLeaf#36": return __build_MarkdownLeaf_36_html(captures);
    case "MarkdownParagraph#0": return __build_MarkdownParagraph_0_html(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'html'");
}

function __dispatchRender_source(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "MarkdownDocument#0": return __build_MarkdownDocument_0_source(captures);
    case "MarkdownLeaf#0": return __build_MarkdownLeaf_0_source(captures);
    case "MarkdownLeaf#1": return __build_MarkdownLeaf_1_source(captures);
    case "MarkdownLeaf#2": return __build_MarkdownLeaf_2_source(captures);
    case "MarkdownLeaf#3": return __build_MarkdownLeaf_3_source(captures);
    case "MarkdownLeaf#4": return __build_MarkdownLeaf_4_source(captures);
    case "MarkdownLeaf#5": return __build_MarkdownLeaf_5_source(captures);
    case "MarkdownLeaf#6": return __build_MarkdownLeaf_6_source(captures);
    case "MarkdownLeaf#7": return __build_MarkdownLeaf_7_source(captures);
    case "MarkdownLeaf#8": return __build_MarkdownLeaf_8_source(captures);
    case "MarkdownLeaf#9": return __build_MarkdownLeaf_9_source(captures);
    case "MarkdownLeaf#10": return __build_MarkdownLeaf_10_source(captures);
    case "MarkdownLeaf#11": return __build_MarkdownLeaf_11_source(captures);
    case "MarkdownLeaf#12": return __build_MarkdownLeaf_12_source(captures);
    case "MarkdownLeaf#13": return __build_MarkdownLeaf_13_source(captures);
    case "MarkdownLeaf#14": return __build_MarkdownLeaf_14_source(captures);
    case "MarkdownLeaf#15": return __build_MarkdownLeaf_15_source(captures);
    case "MarkdownLeaf#16": return __build_MarkdownLeaf_16_source(captures);
    case "MarkdownLeaf#17": return __build_MarkdownLeaf_17_source(captures);
    case "MarkdownLeaf#18": return __build_MarkdownLeaf_18_source(captures);
    case "MarkdownLeaf#19": return __build_MarkdownLeaf_19_source(captures);
    case "MarkdownLeaf#20": return __build_MarkdownLeaf_20_source(captures);
    case "MarkdownLeaf#21": return __build_MarkdownLeaf_21_source(captures);
    case "MarkdownLeaf#22": return __build_MarkdownLeaf_22_source(captures);
    case "MarkdownLeaf#23": return __build_MarkdownLeaf_23_source(captures);
    case "MarkdownLeaf#24": return __build_MarkdownLeaf_24_source(captures);
    case "MarkdownLeaf#25": return __build_MarkdownLeaf_25_source(captures);
    case "MarkdownLeaf#26": return __build_MarkdownLeaf_26_source(captures);
    case "MarkdownLeaf#27": return __build_MarkdownLeaf_27_source(captures);
    case "MarkdownLeaf#28": return __build_MarkdownLeaf_28_source(captures);
    case "MarkdownLeaf#29": return __build_MarkdownLeaf_29_source(captures);
    case "MarkdownLeaf#30": return __build_MarkdownLeaf_30_source(captures);
    case "MarkdownLeaf#31": return __build_MarkdownLeaf_31_source(captures);
    case "MarkdownLeaf#32": return __build_MarkdownLeaf_32_source(captures);
    case "MarkdownLeaf#33": return __build_MarkdownLeaf_33_source(captures);
    case "MarkdownLeaf#34": return __build_MarkdownLeaf_34_source(captures);
    case "MarkdownLeaf#35": return __build_MarkdownLeaf_35_source(captures);
    case "MarkdownLeaf#36": return __build_MarkdownLeaf_36_source(captures);
    case "MarkdownParagraph#0": return __build_MarkdownParagraph_0_source(captures);
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

function __renderSlot_html(v: any): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_html(v[i]));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_html(v);
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
  "html": (captures: any) => __dispatchRender_html(captures),
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

function __rebuild_MarkdownDocument_0(captures: any): string {
  return String((captures.children == null ? "" : __rebuildSlot(captures.children, " ")));
}

function __rebuild_MarkdownLeaf_0(captures: any): string {
  return "######" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_1(captures: any): string {
  return "#####" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_2(captures: any): string {
  return "####" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_3(captures: any): string {
  return "###" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_4(captures: any): string {
  return "##" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_5(captures: any): string {
  return "#" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_6(captures: any): string {
  return __rebuildSlot(captures.text) + " " + "===";
}

function __rebuild_MarkdownLeaf_7(captures: any): string {
  return __rebuildSlot(captures.text) + " " + "---";
}

function __rebuild_MarkdownLeaf_8(captures: any): string {
  return "***";
}

function __rebuild_MarkdownLeaf_9(captures: any): string {
  return "___";
}

function __rebuild_MarkdownLeaf_10(captures: any): string {
  return "---";
}

function __rebuild_MarkdownLeaf_11(captures: any): string {
  return "- [x]" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_12(captures: any): string {
  return "- [ ]" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_13(captures: any): string {
  return "+ " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_14(captures: any): string {
  return "* " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_15(captures: any): string {
  return "- " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_16(captures: any): string {
  return __rebuildSlot(captures.index) + "." + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_17(captures: any): string {
  return ">" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_18(captures: any): string {
  return "```" + __rebuildSlot(captures.lang) + " " + __rebuildSlot(captures.body) + " " + "```";
}

function __rebuild_MarkdownLeaf_19(captures: any): string {
  return "```\n" + __rebuildSlot(captures.body) + " " + "```";
}

function __rebuild_MarkdownLeaf_20(captures: any): string {
  return "**" + __rebuildSlot(captures.text) + "**";
}

function __rebuild_MarkdownLeaf_21(captures: any): string {
  return "*" + __rebuildSlot(captures.text) + "*";
}

function __rebuild_MarkdownLeaf_22(captures: any): string {
  return "~~" + __rebuildSlot(captures.text) + "~~";
}

function __rebuild_MarkdownLeaf_23(captures: any): string {
  return "`" + __rebuildSlot(captures.text) + "`";
}

function __rebuild_MarkdownLeaf_24(captures: any): string {
  return "[" + __rebuildSlot(captures.label) + "]" + "(" + __rebuildSlot(captures.url) + ")";
}

function __rebuild_MarkdownLeaf_25(captures: any): string {
  return "[" + __rebuildSlot(captures.label) + "][" + __rebuildSlot(captures.id) + "]";
}

function __rebuild_MarkdownLeaf_26(captures: any): string {
  return "!" + "[" + __rebuildSlot(captures.alt) + "]" + "(" + __rebuildSlot(captures.url) + ")";
}

function __rebuild_MarkdownLeaf_27(captures: any): string {
  return "!" + "[" + __rebuildSlot(captures.alt) + "][" + __rebuildSlot(captures.id) + "]";
}

function __rebuild_MarkdownLeaf_28(captures: any): string {
  return "&" + __rebuildSlot(captures.name) + ";";
}

function __rebuild_MarkdownLeaf_29(captures: any): string {
  return "|" + " " + "---" + " " + "|" + " " + "---" + " " + "|";
}

function __rebuild_MarkdownLeaf_30(captures: any): string {
  return "|" + ":" + "---" + "|" + "---" + ":" + "|";
}

function __rebuild_MarkdownLeaf_31(captures: any): string {
  return "|" + " " + __rebuildSlot(captures.first) + " " + "|" + " " + __rebuildSlot(captures.second) + " " + "|";
}

function __rebuild_MarkdownLeaf_32(captures: any): string {
  return "[" + __rebuildSlot(captures.id) + "]" + ":" + " " + __rebuildSlot(captures.url);
}

function __rebuild_MarkdownLeaf_33(captures: any): string {
  return "[^" + __rebuildSlot(captures.id) + "]" + ":" + " " + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_34(captures: any): string {
  return "[^" + __rebuildSlot(captures.id) + "]";
}

function __rebuild_MarkdownLeaf_35(captures: any): string {
  return "<" + __rebuildSlot(captures.tag) + ">" + __rebuildSlot(captures.body) + "</" + __rebuildSlot(captures.closingTag) + ">";
}

function __rebuild_MarkdownLeaf_36(captures: any): string {
  return "<" + __rebuildSlot(captures.url) + ">";
}

function __rebuild_MarkdownParagraph_0(captures: any): string {
  return String(__rebuildSlot(captures.text));
}

function __invert_MarkdownDocument_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "document")) {
    throw new Error("stringify: field \"type\" expected \"document\", got " + JSON.stringify(value.type));
  }
  captures.children = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_ast(value.children);
  return __rebuild_MarkdownDocument_0(captures);
}

function __invert_MarkdownLeaf_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "heading")) {
    throw new Error("stringify: field \"type\" expected \"heading\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.depth, 6)) {
    throw new Error("stringify: field \"depth\" expected 6, got " + JSON.stringify(value.depth));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_0(captures);
}

function __invert_MarkdownLeaf_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "heading")) {
    throw new Error("stringify: field \"type\" expected \"heading\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.depth, 5)) {
    throw new Error("stringify: field \"depth\" expected 5, got " + JSON.stringify(value.depth));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_1(captures);
}

function __invert_MarkdownLeaf_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "heading")) {
    throw new Error("stringify: field \"type\" expected \"heading\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.depth, 4)) {
    throw new Error("stringify: field \"depth\" expected 4, got " + JSON.stringify(value.depth));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_2(captures);
}

function __invert_MarkdownLeaf_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "heading")) {
    throw new Error("stringify: field \"type\" expected \"heading\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.depth, 3)) {
    throw new Error("stringify: field \"depth\" expected 3, got " + JSON.stringify(value.depth));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_3(captures);
}

function __invert_MarkdownLeaf_4_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "heading")) {
    throw new Error("stringify: field \"type\" expected \"heading\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.depth, 2)) {
    throw new Error("stringify: field \"depth\" expected 2, got " + JSON.stringify(value.depth));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_4(captures);
}

function __invert_MarkdownLeaf_5_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "heading")) {
    throw new Error("stringify: field \"type\" expected \"heading\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.depth, 1)) {
    throw new Error("stringify: field \"depth\" expected 1, got " + JSON.stringify(value.depth));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_5(captures);
}

function __invert_MarkdownLeaf_6_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "heading")) {
    throw new Error("stringify: field \"type\" expected \"heading\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.depth, 1)) {
    throw new Error("stringify: field \"depth\" expected 1, got " + JSON.stringify(value.depth));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (!Object.is(value.style, "setext")) {
    throw new Error("stringify: field \"style\" expected \"setext\", got " + JSON.stringify(value.style));
  }
  return __rebuild_MarkdownLeaf_6(captures);
}

function __invert_MarkdownLeaf_7_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "heading")) {
    throw new Error("stringify: field \"type\" expected \"heading\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.depth, 2)) {
    throw new Error("stringify: field \"depth\" expected 2, got " + JSON.stringify(value.depth));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (!Object.is(value.style, "setext")) {
    throw new Error("stringify: field \"style\" expected \"setext\", got " + JSON.stringify(value.style));
  }
  return __rebuild_MarkdownLeaf_7(captures);
}

function __invert_MarkdownLeaf_8_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "thematic-break")) {
    throw new Error("stringify: field \"type\" expected \"thematic-break\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.marker, "*")) {
    throw new Error("stringify: field \"marker\" expected \"*\", got " + JSON.stringify(value.marker));
  }
  return __rebuild_MarkdownLeaf_8(captures);
}

function __invert_MarkdownLeaf_9_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "thematic-break")) {
    throw new Error("stringify: field \"type\" expected \"thematic-break\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.marker, "_")) {
    throw new Error("stringify: field \"marker\" expected \"_\", got " + JSON.stringify(value.marker));
  }
  return __rebuild_MarkdownLeaf_9(captures);
}

function __invert_MarkdownLeaf_10_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "thematic-break")) {
    throw new Error("stringify: field \"type\" expected \"thematic-break\", got " + JSON.stringify(value.type));
  }
  return __rebuild_MarkdownLeaf_10(captures);
}

function __invert_MarkdownLeaf_11_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "task-list-item")) {
    throw new Error("stringify: field \"type\" expected \"task-list-item\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.checked, true)) {
    throw new Error("stringify: field \"checked\" expected true, got " + JSON.stringify(value.checked));
  }
  if (!Object.is(value.marker, "x")) {
    throw new Error("stringify: field \"marker\" expected \"x\", got " + JSON.stringify(value.marker));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_11(captures);
}

function __invert_MarkdownLeaf_12_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "task-list-item")) {
    throw new Error("stringify: field \"type\" expected \"task-list-item\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.checked, false)) {
    throw new Error("stringify: field \"checked\" expected false, got " + JSON.stringify(value.checked));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_12(captures);
}

function __invert_MarkdownLeaf_13_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "list-item")) {
    throw new Error("stringify: field \"type\" expected \"list-item\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.ordered, false)) {
    throw new Error("stringify: field \"ordered\" expected false, got " + JSON.stringify(value.ordered));
  }
  if (!Object.is(value.marker, "+")) {
    throw new Error("stringify: field \"marker\" expected \"+\", got " + JSON.stringify(value.marker));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_13(captures);
}

function __invert_MarkdownLeaf_14_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "list-item")) {
    throw new Error("stringify: field \"type\" expected \"list-item\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.ordered, false)) {
    throw new Error("stringify: field \"ordered\" expected false, got " + JSON.stringify(value.ordered));
  }
  if (!Object.is(value.marker, "*")) {
    throw new Error("stringify: field \"marker\" expected \"*\", got " + JSON.stringify(value.marker));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_14(captures);
}

function __invert_MarkdownLeaf_15_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "list-item")) {
    throw new Error("stringify: field \"type\" expected \"list-item\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.ordered, false)) {
    throw new Error("stringify: field \"ordered\" expected false, got " + JSON.stringify(value.ordered));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_15(captures);
}

function __invert_MarkdownLeaf_16_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "list-item")) {
    throw new Error("stringify: field \"type\" expected \"list-item\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.ordered, true)) {
    throw new Error("stringify: field \"ordered\" expected true, got " + JSON.stringify(value.ordered));
  }
  captures.index = __invertSlotLeaf_ast(value.index);
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_16(captures);
}

function __invert_MarkdownLeaf_17_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "blockquote")) {
    throw new Error("stringify: field \"type\" expected \"blockquote\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_17(captures);
}

function __invert_MarkdownLeaf_18_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "code-block")) {
    throw new Error("stringify: field \"type\" expected \"code-block\", got " + JSON.stringify(value.type));
  }
  captures.lang = __invertSlotLeaf_ast(value.lang);
  captures.body = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_18(captures);
}

function __invert_MarkdownLeaf_19_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "code-block")) {
    throw new Error("stringify: field \"type\" expected \"code-block\", got " + JSON.stringify(value.type));
  }
  captures.body = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_19(captures);
}

function __invert_MarkdownLeaf_20_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "bold")) {
    throw new Error("stringify: field \"type\" expected \"bold\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_20(captures);
}

function __invert_MarkdownLeaf_21_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "italic")) {
    throw new Error("stringify: field \"type\" expected \"italic\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_21(captures);
}

function __invert_MarkdownLeaf_22_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "strikethrough")) {
    throw new Error("stringify: field \"type\" expected \"strikethrough\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_22(captures);
}

function __invert_MarkdownLeaf_23_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "inline-code")) {
    throw new Error("stringify: field \"type\" expected \"inline-code\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_23(captures);
}

function __invert_MarkdownLeaf_24_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "link")) {
    throw new Error("stringify: field \"type\" expected \"link\", got " + JSON.stringify(value.type));
  }
  captures.label = __invertSlotLeaf_ast(value.label);
  captures.url = __invertSlotLeaf_ast(value.url);
  return __rebuild_MarkdownLeaf_24(captures);
}

function __invert_MarkdownLeaf_25_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "reference-link")) {
    throw new Error("stringify: field \"type\" expected \"reference-link\", got " + JSON.stringify(value.type));
  }
  captures.label = __invertSlotLeaf_ast(value.label);
  captures.id = __invertSlotLeaf_ast(value.id);
  return __rebuild_MarkdownLeaf_25(captures);
}

function __invert_MarkdownLeaf_26_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "image")) {
    throw new Error("stringify: field \"type\" expected \"image\", got " + JSON.stringify(value.type));
  }
  captures.alt = __invertSlotLeaf_ast(value.alt);
  captures.url = __invertSlotLeaf_ast(value.url);
  return __rebuild_MarkdownLeaf_26(captures);
}

function __invert_MarkdownLeaf_27_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "reference-image")) {
    throw new Error("stringify: field \"type\" expected \"reference-image\", got " + JSON.stringify(value.type));
  }
  captures.alt = __invertSlotLeaf_ast(value.alt);
  captures.id = __invertSlotLeaf_ast(value.id);
  return __rebuild_MarkdownLeaf_27(captures);
}

function __invert_MarkdownLeaf_28_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "entity")) {
    throw new Error("stringify: field \"type\" expected \"entity\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  return __rebuild_MarkdownLeaf_28(captures);
}

function __invert_MarkdownLeaf_29_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "table-delimiter")) {
    throw new Error("stringify: field \"type\" expected \"table-delimiter\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.variant, "plain")) {
    throw new Error("stringify: field \"variant\" expected \"plain\", got " + JSON.stringify(value.variant));
  }
  if (!Array.isArray(value.align) || value.align.length !== 2) {
    throw new Error("stringify: expected array of length 2, got " + (Array.isArray(value.align) ? ("length " + value.align.length) : typeof value.align));
  }
  if (!Object.is(value.align[0], "default")) {
    throw new Error("stringify: expected scalar \"default\", got " + JSON.stringify(value.align[0]));
  }
  if (!Object.is(value.align[1], "default")) {
    throw new Error("stringify: expected scalar \"default\", got " + JSON.stringify(value.align[1]));
  }
  return __rebuild_MarkdownLeaf_29(captures);
}

function __invert_MarkdownLeaf_30_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "table-delimiter")) {
    throw new Error("stringify: field \"type\" expected \"table-delimiter\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.variant, "aligned")) {
    throw new Error("stringify: field \"variant\" expected \"aligned\", got " + JSON.stringify(value.variant));
  }
  if (!Array.isArray(value.align) || value.align.length !== 2) {
    throw new Error("stringify: expected array of length 2, got " + (Array.isArray(value.align) ? ("length " + value.align.length) : typeof value.align));
  }
  if (!Object.is(value.align[0], "left")) {
    throw new Error("stringify: expected scalar \"left\", got " + JSON.stringify(value.align[0]));
  }
  if (!Object.is(value.align[1], "right")) {
    throw new Error("stringify: expected scalar \"right\", got " + JSON.stringify(value.align[1]));
  }
  return __rebuild_MarkdownLeaf_30(captures);
}

function __invert_MarkdownLeaf_31_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "table-row")) {
    throw new Error("stringify: field \"type\" expected \"table-row\", got " + JSON.stringify(value.type));
  }
  if (!Array.isArray(value.cells) || value.cells.length !== 2) {
    throw new Error("stringify: expected array of length 2, got " + (Array.isArray(value.cells) ? ("length " + value.cells.length) : typeof value.cells));
  }
  captures.first = __invertSlotLeaf_ast(value.cells[0]);
  captures.second = __invertSlotLeaf_ast(value.cells[1]);
  return __rebuild_MarkdownLeaf_31(captures);
}

function __invert_MarkdownLeaf_32_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "definition")) {
    throw new Error("stringify: field \"type\" expected \"definition\", got " + JSON.stringify(value.type));
  }
  captures.id = __invertSlotLeaf_ast(value.id);
  captures.url = __invertSlotLeaf_ast(value.url);
  return __rebuild_MarkdownLeaf_32(captures);
}

function __invert_MarkdownLeaf_33_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "footnote-definition")) {
    throw new Error("stringify: field \"type\" expected \"footnote-definition\", got " + JSON.stringify(value.type));
  }
  captures.id = __invertSlotLeaf_ast(value.id);
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownLeaf_33(captures);
}

function __invert_MarkdownLeaf_34_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "footnote-reference")) {
    throw new Error("stringify: field \"type\" expected \"footnote-reference\", got " + JSON.stringify(value.type));
  }
  captures.id = __invertSlotLeaf_ast(value.id);
  return __rebuild_MarkdownLeaf_34(captures);
}

function __invert_MarkdownLeaf_35_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "html")) {
    throw new Error("stringify: field \"type\" expected \"html\", got " + JSON.stringify(value.type));
  }
  captures.tag = __invertSlotLeaf_ast(value.tag);
  captures.body = __invertSlotLeaf_ast(value.text);
  captures.closingTag = __invertSlotLeaf_ast(value.closingTag);
  return __rebuild_MarkdownLeaf_35(captures);
}

function __invert_MarkdownLeaf_36_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "autolink")) {
    throw new Error("stringify: field \"type\" expected \"autolink\", got " + JSON.stringify(value.type));
  }
  captures.url = __invertSlotLeaf_ast(value.url);
  return __rebuild_MarkdownLeaf_36(captures);
}

function __invert_MarkdownParagraph_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "paragraph")) {
    throw new Error("stringify: field \"type\" expected \"paragraph\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  return __rebuild_MarkdownParagraph_0(captures);
}

function __invert_MarkdownDocument_0_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos >= __s.length) {
    captures.children = null;
  } else {
    captures.children = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_html(__s.slice(__pos));
    __pos = __s.length;
  }
  return __rebuild_MarkdownDocument_0(captures);
}

function __invert_MarkdownLeaf_0_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<h6>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<h6>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</h6>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</h6>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_0(captures);
}

function __invert_MarkdownLeaf_1_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<h5>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<h5>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</h5>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</h5>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_1(captures);
}

function __invert_MarkdownLeaf_2_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<h4>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<h4>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</h4>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</h4>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_2(captures);
}

function __invert_MarkdownLeaf_3_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<h3>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<h3>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</h3>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</h3>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_3(captures);
}

function __invert_MarkdownLeaf_4_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<h2>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<h2>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</h2>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</h2>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_4(captures);
}

function __invert_MarkdownLeaf_5_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<h1>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<h1>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</h1>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</h1>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_5(captures);
}

function __invert_MarkdownLeaf_6_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<h1>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<h1>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</h1>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</h1>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_6(captures);
}

function __invert_MarkdownLeaf_7_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<h2>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<h2>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</h2>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</h2>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_7(captures);
}

function __invert_MarkdownLeaf_8_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<hr>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<hr>\" in template body");
  }
  __pos += 4;
  return __rebuild_MarkdownLeaf_8(captures);
}

function __invert_MarkdownLeaf_9_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<hr>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<hr>\" in template body");
  }
  __pos += 4;
  return __rebuild_MarkdownLeaf_9(captures);
}

function __invert_MarkdownLeaf_10_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<hr>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<hr>\" in template body");
  }
  __pos += 4;
  return __rebuild_MarkdownLeaf_10(captures);
}

function __invert_MarkdownLeaf_11_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<li><input type=\"checkbox\" checked>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<li><input type=\\\"checkbox\\\" checked>\" in template body");
  }
  __pos += 35;
  {
    const __end = __s.indexOf("</li>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</li>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_11(captures);
}

function __invert_MarkdownLeaf_12_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<li><input type=\"checkbox\">", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<li><input type=\\\"checkbox\\\">\" in template body");
  }
  __pos += 27;
  {
    const __end = __s.indexOf("</li>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</li>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_12(captures);
}

function __invert_MarkdownLeaf_13_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<li>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<li>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</li>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</li>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_13(captures);
}

function __invert_MarkdownLeaf_14_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<li>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<li>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</li>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</li>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_14(captures);
}

function __invert_MarkdownLeaf_15_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<li>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<li>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</li>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</li>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_15(captures);
}

function __invert_MarkdownLeaf_16_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<li>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<li>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</li>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</li>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_16(captures);
}

function __invert_MarkdownLeaf_17_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<blockquote>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<blockquote>\" in template body");
  }
  __pos += 12;
  {
    const __end = __s.indexOf("</blockquote>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</blockquote>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 13;
  }
  return __rebuild_MarkdownLeaf_17(captures);
}

function __invert_MarkdownLeaf_18_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<pre><code class=\"lang-", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<pre><code class=\\\"lang-\" in template body");
  }
  __pos += 23;
  {
    const __end = __s.indexOf("\">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\">\" after capture lang");
    }
    captures.lang = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("</code></pre>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</code></pre>\" after capture body");
    }
    captures.body = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 13;
  }
  return __rebuild_MarkdownLeaf_18(captures);
}

function __invert_MarkdownLeaf_19_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<pre><code>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<pre><code>\" in template body");
  }
  __pos += 11;
  {
    const __end = __s.indexOf("</code></pre>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</code></pre>\" after capture body");
    }
    captures.body = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 13;
  }
  return __rebuild_MarkdownLeaf_19(captures);
}

function __invert_MarkdownLeaf_20_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<strong>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<strong>\" in template body");
  }
  __pos += 8;
  {
    const __end = __s.indexOf("</strong>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</strong>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 9;
  }
  return __rebuild_MarkdownLeaf_20(captures);
}

function __invert_MarkdownLeaf_21_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<em>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<em>\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf("</em>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</em>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 5;
  }
  return __rebuild_MarkdownLeaf_21(captures);
}

function __invert_MarkdownLeaf_22_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<s>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<s>\" in template body");
  }
  __pos += 3;
  {
    const __end = __s.indexOf("</s>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</s>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownLeaf_22(captures);
}

function __invert_MarkdownLeaf_23_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<code>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<code>\" in template body");
  }
  __pos += 6;
  {
    const __end = __s.indexOf("</code>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</code>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  return __rebuild_MarkdownLeaf_23(captures);
}

function __invert_MarkdownLeaf_24_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<a href=\"", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<a href=\\\"\" in template body");
  }
  __pos += 9;
  {
    const __end = __s.indexOf("\">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\">\" after capture url");
    }
    captures.url = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("</a>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</a>\" after capture label");
    }
    captures.label = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownLeaf_24(captures);
}

function __invert_MarkdownLeaf_25_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<a href=\"#", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<a href=\\\"#\" in template body");
  }
  __pos += 10;
  {
    const __end = __s.indexOf("\">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\">\" after capture id");
    }
    captures.id = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("</a>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</a>\" after capture label");
    }
    captures.label = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownLeaf_25(captures);
}

function __invert_MarkdownLeaf_26_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<img src=\"", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<img src=\\\"\" in template body");
  }
  __pos += 10;
  {
    const __end = __s.indexOf("\" alt=\"", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\" alt=\\\"\" after capture url");
    }
    captures.url = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  {
    const __end = __s.indexOf("\">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\">\" after capture alt");
    }
    captures.alt = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  return __rebuild_MarkdownLeaf_26(captures);
}

function __invert_MarkdownLeaf_27_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<img src=\"#", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<img src=\\\"#\" in template body");
  }
  __pos += 11;
  {
    const __end = __s.indexOf("\" alt=\"", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\" alt=\\\"\" after capture id");
    }
    captures.id = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 7;
  }
  {
    const __end = __s.indexOf("\">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\">\" after capture alt");
    }
    captures.alt = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  return __rebuild_MarkdownLeaf_27(captures);
}

function __invert_MarkdownLeaf_28_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("&", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"&\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(";", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \";\" after capture name");
    }
    captures.name = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_28(captures);
}

function __invert_MarkdownLeaf_29_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  return __rebuild_MarkdownLeaf_29(captures);
}

function __invert_MarkdownLeaf_30_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  return __rebuild_MarkdownLeaf_30(captures);
}

function __invert_MarkdownLeaf_31_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<tr><td>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<tr><td>\" in template body");
  }
  __pos += 8;
  {
    const __end = __s.indexOf("</td><td>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</td><td>\" after capture first");
    }
    captures.first = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 9;
  }
  {
    const __end = __s.indexOf("</td></tr>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</td></tr>\" after capture second");
    }
    captures.second = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 10;
  }
  return __rebuild_MarkdownLeaf_31(captures);
}

function __invert_MarkdownLeaf_32_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  return __rebuild_MarkdownLeaf_32(captures);
}

function __invert_MarkdownLeaf_33_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<div class=\"footnote\" id=\"fn", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<div class=\\\"footnote\\\" id=\\\"fn\" in template body");
  }
  __pos += 28;
  {
    const __end = __s.indexOf("\">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\">\" after capture id");
    }
    captures.id = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("</div>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</div>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 6;
  }
  return __rebuild_MarkdownLeaf_33(captures);
}

function __invert_MarkdownLeaf_34_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<sup><a href=\"#fn", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<sup><a href=\\\"#fn\" in template body");
  }
  __pos += 17;
  {
    const __end = __s.indexOf("\">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\">\" after capture id");
    }
    captures.id = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("</a></sup>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</a></sup>\" after capture id");
    }
    captures.id = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 10;
  }
  return __rebuild_MarkdownLeaf_34(captures);
}

function __invert_MarkdownLeaf_35_html(value: any): string {
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
    captures.tag = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf("</", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</\" after capture body");
    }
    captures.body = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \">\" after capture closingTag");
    }
    captures.closingTag = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_35(captures);
}

function __invert_MarkdownLeaf_36_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<a class=\"autolink\" href=\"", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<a class=\\\"autolink\\\" href=\\\"\" in template body");
  }
  __pos += 26;
  {
    const __end = __s.indexOf("\">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"\\\">\" after capture url");
    }
    captures.url = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("</a>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</a>\" after capture url");
    }
    captures.url = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownLeaf_36(captures);
}

function __invert_MarkdownParagraph_0_html(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<p>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<p>\" in template body");
  }
  __pos += 3;
  {
    const __end = __s.indexOf("</p>", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"</p>\" after capture text");
    }
    captures.text = __invertSlotLeaf_html(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownParagraph_0(captures);
}

function __invert_MarkdownDocument_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos >= __s.length) {
    captures.children = null;
  } else {
    captures.children = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_source(__s.slice(__pos));
    __pos = __s.length;
  }
  return __rebuild_MarkdownDocument_0(captures);
}

function __invert_MarkdownLeaf_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("###### ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"###### \" in template body");
  }
  __pos += 7;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_0(captures);
}

function __invert_MarkdownLeaf_1_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("##### ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"##### \" in template body");
  }
  __pos += 6;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_1(captures);
}

function __invert_MarkdownLeaf_2_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("#### ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"#### \" in template body");
  }
  __pos += 5;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_2(captures);
}

function __invert_MarkdownLeaf_3_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("### ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"### \" in template body");
  }
  __pos += 4;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_3(captures);
}

function __invert_MarkdownLeaf_4_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("## ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"## \" in template body");
  }
  __pos += 3;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_4(captures);
}

function __invert_MarkdownLeaf_5_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("# ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"# \" in template body");
  }
  __pos += 2;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_5(captures);
}

function __invert_MarkdownLeaf_6_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(" ===", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" ===\" after capture text");
    }
    captures.text = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownLeaf_6(captures);
}

function __invert_MarkdownLeaf_7_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(" ---", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" ---\" after capture text");
    }
    captures.text = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownLeaf_7(captures);
}

function __invert_MarkdownLeaf_8_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("***", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"***\" in template body");
  }
  __pos += 3;
  return __rebuild_MarkdownLeaf_8(captures);
}

function __invert_MarkdownLeaf_9_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("___", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"___\" in template body");
  }
  __pos += 3;
  return __rebuild_MarkdownLeaf_9(captures);
}

function __invert_MarkdownLeaf_10_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("---", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"---\" in template body");
  }
  __pos += 3;
  return __rebuild_MarkdownLeaf_10(captures);
}

function __invert_MarkdownLeaf_11_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("- [x] ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"- [x] \" in template body");
  }
  __pos += 6;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_11(captures);
}

function __invert_MarkdownLeaf_12_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("- [ ] ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"- [ ] \" in template body");
  }
  __pos += 6;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_12(captures);
}

function __invert_MarkdownLeaf_13_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("+ ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"+ \" in template body");
  }
  __pos += 2;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_13(captures);
}

function __invert_MarkdownLeaf_14_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("* ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"* \" in template body");
  }
  __pos += 2;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_14(captures);
}

function __invert_MarkdownLeaf_15_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("- ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"- \" in template body");
  }
  __pos += 2;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_15(captures);
}

function __invert_MarkdownLeaf_16_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  {
    const __end = __s.indexOf(". ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \". \" after capture index");
    }
    captures.index = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_16(captures);
}

function __invert_MarkdownLeaf_17_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("> ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"> \" in template body");
  }
  __pos += 2;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_17(captures);
}

function __invert_MarkdownLeaf_18_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("```", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"```\" in template body");
  }
  __pos += 3;
  {
    const __end = __s.indexOf(" ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" \" after capture lang");
    }
    captures.lang = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  {
    const __end = __s.indexOf(" ```", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" ```\" after capture body");
    }
    captures.body = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownLeaf_18(captures);
}

function __invert_MarkdownLeaf_19_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("```\n", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"```\\n\" in template body");
  }
  __pos += 4;
  {
    const __end = __s.indexOf(" ```", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" ```\" after capture body");
    }
    captures.body = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 4;
  }
  return __rebuild_MarkdownLeaf_19(captures);
}

function __invert_MarkdownLeaf_20_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("**", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"**\" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf("**", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"**\" after capture text");
    }
    captures.text = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  return __rebuild_MarkdownLeaf_20(captures);
}

function __invert_MarkdownLeaf_21_source(value: any): string {
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
  {
    const __end = __s.indexOf("*", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"*\" after capture text");
    }
    captures.text = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_21(captures);
}

function __invert_MarkdownLeaf_22_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("~~", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"~~\" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf("~~", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"~~\" after capture text");
    }
    captures.text = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  return __rebuild_MarkdownLeaf_22(captures);
}

function __invert_MarkdownLeaf_23_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("`", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"`\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf("`", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"`\" after capture text");
    }
    captures.text = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_23(captures);
}

function __invert_MarkdownLeaf_24_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("[", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"[\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf("](", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"](\" after capture label");
    }
    captures.label = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(")", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \")\" after capture url");
    }
    captures.url = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_24(captures);
}

function __invert_MarkdownLeaf_25_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("[", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"[\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf("][", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"][\" after capture label");
    }
    captures.label = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("]", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"]\" after capture id");
    }
    captures.id = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_25(captures);
}

function __invert_MarkdownLeaf_26_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("![", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"![\" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf("](", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"](\" after capture alt");
    }
    captures.alt = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(")", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \")\" after capture url");
    }
    captures.url = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_26(captures);
}

function __invert_MarkdownLeaf_27_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("![", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"![\" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf("][", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"][\" after capture alt");
    }
    captures.alt = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf("]", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"]\" after capture id");
    }
    captures.id = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_27(captures);
}

function __invert_MarkdownLeaf_28_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("&", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"&\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf(";", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \";\" after capture name");
    }
    captures.name = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_28(captures);
}

function __invert_MarkdownLeaf_29_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("| --- | --- |", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"| --- | --- |\" in template body");
  }
  __pos += 13;
  return __rebuild_MarkdownLeaf_29(captures);
}

function __invert_MarkdownLeaf_30_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("|:---|---:|", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"|:---|---:|\" in template body");
  }
  __pos += 11;
  return __rebuild_MarkdownLeaf_30(captures);
}

function __invert_MarkdownLeaf_31_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("| ", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"| \" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf(" | ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" | \" after capture first");
    }
    captures.first = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 3;
  }
  {
    const __end = __s.indexOf(" |", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \" |\" after capture second");
    }
    captures.second = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  return __rebuild_MarkdownLeaf_31(captures);
}

function __invert_MarkdownLeaf_32_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("[", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"[\" in template body");
  }
  __pos += 1;
  {
    const __end = __s.indexOf("]: ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"]: \" after capture id");
    }
    captures.id = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 3;
  }
  captures.url = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_32(captures);
}

function __invert_MarkdownLeaf_33_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("[^", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"[^\" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf("]: ", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"]: \" after capture id");
    }
    captures.id = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 3;
  }
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownLeaf_33(captures);
}

function __invert_MarkdownLeaf_34_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("[^", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"[^\" in template body");
  }
  __pos += 2;
  {
    const __end = __s.indexOf("]", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \"]\" after capture id");
    }
    captures.id = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_34(captures);
}

function __invert_MarkdownLeaf_35_source(value: any): string {
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
      throw new Error("stringify: expected separator \"</\" after capture body");
    }
    captures.body = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 2;
  }
  {
    const __end = __s.indexOf(">", __pos);
    if (__end < 0) {
      throw new Error("stringify: expected separator \">\" after capture closingTag");
    }
    captures.closingTag = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_35(captures);
}

function __invert_MarkdownLeaf_36_source(value: any): string {
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
      throw new Error("stringify: expected separator \">\" after capture url");
    }
    captures.url = __invertSlotLeaf_source(__s.slice(__pos, __end));
    __pos = __end + 1;
  }
  return __rebuild_MarkdownLeaf_36(captures);
}

function __invert_MarkdownParagraph_0_source(value: any): string {
  const captures: any = {};
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  return __rebuild_MarkdownParagraph_0(captures);
}

function __dispatchInverse_MarkdownDocument_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "document")) return __invert_MarkdownDocument_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownLeaf_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "code-block") && "lang" in value) return __invert_MarkdownLeaf_18_ast(value);
    if (Object.is(value.type, "code-block") && !("lang" in value)) return __invert_MarkdownLeaf_19_ast(value);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 6)) return __invert_MarkdownLeaf_0_ast(value);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 5)) return __invert_MarkdownLeaf_1_ast(value);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 4)) return __invert_MarkdownLeaf_2_ast(value);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 3)) return __invert_MarkdownLeaf_3_ast(value);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 2)) return __invert_MarkdownLeaf_4_ast(value);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 1)) return __invert_MarkdownLeaf_5_ast(value);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 1) && Object.is(value.style, "setext")) return __invert_MarkdownLeaf_6_ast(value);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 2) && Object.is(value.style, "setext")) return __invert_MarkdownLeaf_7_ast(value);
    if (Object.is(value.type, "thematic-break") && Object.is(value.marker, "*")) return __invert_MarkdownLeaf_8_ast(value);
    if (Object.is(value.type, "thematic-break") && Object.is(value.marker, "_")) return __invert_MarkdownLeaf_9_ast(value);
    if (Object.is(value.type, "thematic-break")) return __invert_MarkdownLeaf_10_ast(value);
    if (Object.is(value.type, "task-list-item") && Object.is(value.checked, true) && Object.is(value.marker, "x")) return __invert_MarkdownLeaf_11_ast(value);
    if (Object.is(value.type, "task-list-item") && Object.is(value.checked, false)) return __invert_MarkdownLeaf_12_ast(value);
    if (Object.is(value.type, "list-item") && Object.is(value.ordered, false) && Object.is(value.marker, "+")) return __invert_MarkdownLeaf_13_ast(value);
    if (Object.is(value.type, "list-item") && Object.is(value.ordered, false) && Object.is(value.marker, "*")) return __invert_MarkdownLeaf_14_ast(value);
    if (Object.is(value.type, "list-item") && Object.is(value.ordered, false)) return __invert_MarkdownLeaf_15_ast(value);
    if (Object.is(value.type, "list-item") && Object.is(value.ordered, true)) return __invert_MarkdownLeaf_16_ast(value);
    if (Object.is(value.type, "blockquote")) return __invert_MarkdownLeaf_17_ast(value);
    if (Object.is(value.type, "bold")) return __invert_MarkdownLeaf_20_ast(value);
    if (Object.is(value.type, "italic")) return __invert_MarkdownLeaf_21_ast(value);
    if (Object.is(value.type, "strikethrough")) return __invert_MarkdownLeaf_22_ast(value);
    if (Object.is(value.type, "inline-code")) return __invert_MarkdownLeaf_23_ast(value);
    if (Object.is(value.type, "link")) return __invert_MarkdownLeaf_24_ast(value);
    if (Object.is(value.type, "reference-link")) return __invert_MarkdownLeaf_25_ast(value);
    if (Object.is(value.type, "image")) return __invert_MarkdownLeaf_26_ast(value);
    if (Object.is(value.type, "reference-image")) return __invert_MarkdownLeaf_27_ast(value);
    if (Object.is(value.type, "entity")) return __invert_MarkdownLeaf_28_ast(value);
    if (Object.is(value.type, "table-delimiter") && Object.is(value.variant, "plain")) return __invert_MarkdownLeaf_29_ast(value);
    if (Object.is(value.type, "table-delimiter") && Object.is(value.variant, "aligned")) return __invert_MarkdownLeaf_30_ast(value);
    if (Object.is(value.type, "table-row")) return __invert_MarkdownLeaf_31_ast(value);
    if (Object.is(value.type, "definition")) return __invert_MarkdownLeaf_32_ast(value);
    if (Object.is(value.type, "footnote-definition")) return __invert_MarkdownLeaf_33_ast(value);
    if (Object.is(value.type, "footnote-reference")) return __invert_MarkdownLeaf_34_ast(value);
    if (Object.is(value.type, "html")) return __invert_MarkdownLeaf_35_ast(value);
    if (Object.is(value.type, "autolink")) return __invert_MarkdownLeaf_36_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownParagraph_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "paragraph")) return __invert_MarkdownParagraph_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_MarkdownDocument_ast(value);
}

function __dispatchInverse_MarkdownDocument_html(value: any): string {
  if (typeof value === "string") {
    return __invert_MarkdownDocument_0_html(value);
  }
  throw new Error("stringify: no production matches for target 'html' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownLeaf_html(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("<li><input type=\"checkbox\" checked>")) return __invert_MarkdownLeaf_11_html(value);
    if (value.startsWith("<div class=\"footnote\" id=\"fn")) return __invert_MarkdownLeaf_33_html(value);
    if (value.startsWith("<li><input type=\"checkbox\">")) return __invert_MarkdownLeaf_12_html(value);
    if (value.startsWith("<a class=\"autolink\" href=\"")) return __invert_MarkdownLeaf_36_html(value);
    if (value.startsWith("<pre><code class=\"lang-")) return __invert_MarkdownLeaf_18_html(value);
    if (value.startsWith("<sup><a href=\"#fn")) return __invert_MarkdownLeaf_34_html(value);
    if (value.startsWith("<blockquote>")) return __invert_MarkdownLeaf_17_html(value);
    if (value.startsWith("<pre><code>")) return __invert_MarkdownLeaf_19_html(value);
    if (value.startsWith("<img src=\"#")) return __invert_MarkdownLeaf_27_html(value);
    if (value.startsWith("<a href=\"#")) return __invert_MarkdownLeaf_25_html(value);
    if (value.startsWith("<img src=\"")) return __invert_MarkdownLeaf_26_html(value);
    if (value.startsWith("<a href=\"")) return __invert_MarkdownLeaf_24_html(value);
    if (value.startsWith("<strong>")) return __invert_MarkdownLeaf_20_html(value);
    if (value.startsWith("<tr><td>")) return __invert_MarkdownLeaf_31_html(value);
    if (value.startsWith("<code>")) return __invert_MarkdownLeaf_23_html(value);
    if (value.startsWith("<h6>")) return __invert_MarkdownLeaf_0_html(value);
    if (value.startsWith("<h5>")) return __invert_MarkdownLeaf_1_html(value);
    if (value.startsWith("<h4>")) return __invert_MarkdownLeaf_2_html(value);
    if (value.startsWith("<h3>")) return __invert_MarkdownLeaf_3_html(value);
    if (value.startsWith("<h2>")) return __invert_MarkdownLeaf_4_html(value);
    if (value.startsWith("<h1>")) return __invert_MarkdownLeaf_5_html(value);
    if (value.startsWith("<hr>")) return __invert_MarkdownLeaf_8_html(value);
    if (value.startsWith("<li>")) return __invert_MarkdownLeaf_13_html(value);
    if (value.startsWith("<em>")) return __invert_MarkdownLeaf_21_html(value);
    if (value.startsWith("<s>")) return __invert_MarkdownLeaf_22_html(value);
    if (value.startsWith("&")) return __invert_MarkdownLeaf_28_html(value);
    if (value.startsWith("<")) return __invert_MarkdownLeaf_35_html(value);
    return __invert_MarkdownLeaf_29_html(value);
  }
  throw new Error("stringify: no production matches for target 'html' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownParagraph_html(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("<p>")) return __invert_MarkdownParagraph_0_html(value);
  }
  throw new Error("stringify: no production matches for target 'html' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_html(value: any): string {
  return __dispatchInverse_MarkdownDocument_html(value);
}

function __dispatchInverse_MarkdownDocument_source(value: any): string {
  if (typeof value === "string") {
    return __invert_MarkdownDocument_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownLeaf_source(value: any): string {
  if (typeof value === "string") {
    if (value.startsWith("| --- | --- |")) return __invert_MarkdownLeaf_29_source(value);
    if (value.startsWith("|:---|---:|")) return __invert_MarkdownLeaf_30_source(value);
    if (value.startsWith("###### ")) return __invert_MarkdownLeaf_0_source(value);
    if (value.startsWith("##### ")) return __invert_MarkdownLeaf_1_source(value);
    if (value.startsWith("- [x] ")) return __invert_MarkdownLeaf_11_source(value);
    if (value.startsWith("- [ ] ")) return __invert_MarkdownLeaf_12_source(value);
    if (value.startsWith("#### ")) return __invert_MarkdownLeaf_2_source(value);
    if (value.startsWith("### ")) return __invert_MarkdownLeaf_3_source(value);
    if (value.indexOf(" ===") >= 0) return __invert_MarkdownLeaf_6_source(value);
    if (value.indexOf(" ---") >= 0) return __invert_MarkdownLeaf_7_source(value);
    if (value.startsWith("```\n")) return __invert_MarkdownLeaf_19_source(value);
    if (value.startsWith("## ")) return __invert_MarkdownLeaf_4_source(value);
    if (value.startsWith("***")) return __invert_MarkdownLeaf_8_source(value);
    if (value.startsWith("___")) return __invert_MarkdownLeaf_9_source(value);
    if (value.startsWith("---")) return __invert_MarkdownLeaf_10_source(value);
    if (value.startsWith("```")) return __invert_MarkdownLeaf_18_source(value);
    if (value.startsWith("# ")) return __invert_MarkdownLeaf_5_source(value);
    if (value.startsWith("+ ")) return __invert_MarkdownLeaf_13_source(value);
    if (value.startsWith("* ")) return __invert_MarkdownLeaf_14_source(value);
    if (value.startsWith("- ")) return __invert_MarkdownLeaf_15_source(value);
    if (value.indexOf(". ") >= 0) return __invert_MarkdownLeaf_16_source(value);
    if (value.startsWith("> ")) return __invert_MarkdownLeaf_17_source(value);
    if (value.startsWith("**")) return __invert_MarkdownLeaf_20_source(value);
    if (value.startsWith("~~")) return __invert_MarkdownLeaf_22_source(value);
    if (value.startsWith("![")) return __invert_MarkdownLeaf_26_source(value);
    if (value.startsWith("![")) return __invert_MarkdownLeaf_27_source(value);
    if (value.startsWith("| ")) return __invert_MarkdownLeaf_31_source(value);
    if (value.startsWith("[^")) return __invert_MarkdownLeaf_33_source(value);
    if (value.startsWith("[^")) return __invert_MarkdownLeaf_34_source(value);
    if (value.startsWith("*")) return __invert_MarkdownLeaf_21_source(value);
    if (value.startsWith("`")) return __invert_MarkdownLeaf_23_source(value);
    if (value.startsWith("[")) return __invert_MarkdownLeaf_24_source(value);
    if (value.startsWith("[")) return __invert_MarkdownLeaf_25_source(value);
    if (value.startsWith("&")) return __invert_MarkdownLeaf_28_source(value);
    if (value.startsWith("[")) return __invert_MarkdownLeaf_32_source(value);
    if (value.startsWith("<")) return __invert_MarkdownLeaf_35_source(value);
    if (value.startsWith("<")) return __invert_MarkdownLeaf_36_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownParagraph_source(value: any): string {
  if (typeof value === "string") {
    return __invert_MarkdownParagraph_0_source(value);
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_MarkdownDocument_source(value);
}

function __invertSlotFor_MarkdownDocument_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownDocument_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownDocument_ast(v);
  return String(v);
}

function __invertSlotFor_MarkdownLeaf_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownLeaf_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownLeaf_ast(v);
  return String(v);
}

function __invertSlotFor_MarkdownParagraph_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownParagraph_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownParagraph_ast(v);
  return String(v);
}

function __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_MarkdownLeaf_ast(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_ast(v); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: MarkdownLeaf, MarkdownParagraph; value: " + JSON.stringify(v) + ")");
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

function __invertSlotFor_MarkdownDocument_html(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownDocument_html(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownDocument_html(v);
  return String(v);
}

function __invertSlotFor_MarkdownLeaf_html(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownLeaf_html(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownLeaf_html(v);
  return String(v);
}

function __invertSlotFor_MarkdownParagraph_html(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownParagraph_html(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownParagraph_html(v);
  return String(v);
}

function __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_html(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_html(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_MarkdownLeaf_html(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_html(v); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: MarkdownLeaf, MarkdownParagraph; value: " + JSON.stringify(v) + ")");
  }
  return String(v);
}

function __invertSlotLeaf_html(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_html(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  return String(v);
}

function __invertSlotFor_MarkdownDocument_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownDocument_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownDocument_source(v);
  return String(v);
}

function __invertSlotFor_MarkdownLeaf_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownLeaf_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownLeaf_source(v);
  return String(v);
}

function __invertSlotFor_MarkdownParagraph_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_MarkdownParagraph_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownParagraph_source(v);
  return String(v);
}

function __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_source(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_MarkdownLeaf_source(v); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_source(v); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: MarkdownLeaf, MarkdownParagraph; value: " + JSON.stringify(v) + ")");
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
  "html": __dispatchInverse_html,
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
    const result = mode === 'raws' ? parseMarkdownDocument(state) : parseMarkdownDocumentFast(state);
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
    validateMarkdownDocument(state);
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
  module: "@parser2/markdown",
  exportName: 'validate',
};

