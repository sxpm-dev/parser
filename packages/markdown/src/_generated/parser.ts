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
  const __struct: Record<string, unknown> = { type: "document", children: children };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "heading", depth: 6, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "heading", depth: 5, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "heading", depth: 4, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "heading", depth: 3, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "heading", depth: 2, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "heading", depth: 1, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "heading", depth: 1, text: text, style: "setext" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "heading", depth: 2, text: text, style: "setext" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  const __struct: Record<string, unknown> = { type: "thematic-break" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  const __struct: Record<string, unknown> = { type: "thematic-break", marker: "*" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  const __struct: Record<string, unknown> = { type: "thematic-break", marker: "_" };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "task-list-item", checked: true, marker: "x", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "task-list-item", checked: false, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, marker: "+", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "list-item", ordered: false, marker: "*", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "list-item", ordered: true, index: index, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "blockquote", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("```", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "code-block", lang: lang, text: body };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("```", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "code-block", text: body };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("**", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "bold", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 42) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "italic", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("~~", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "strikethrough", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 96) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "inline-code", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "link", label: label, url: url };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "reference-link", label: label, id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "image", alt: alt, url: url };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "reference-image", alt: alt, id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  const __struct: Record<string, unknown> = { type: "entity", name: name };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  const __struct: Record<string, unknown> = { type: "table-delimiter", align: ["default", "default"] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  const __struct: Record<string, unknown> = { type: "table-delimiter", align: ["left", "right"] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "table-row", cells: [first, second] };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "definition", id: id, url: url };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "footnote-definition", id: id, text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "footnote-reference", id: id };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  const __struct: Record<string, unknown> = { type: "html", tag: tag, text: body, closingTag: closingTag };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 62) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "autolink", url: url };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
      return parseMarkdownLeaf__alt8(state);
    }
    else if (__input.charCodeAt(__peek) === 45 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeaf__alt13(state);
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
      return parseMarkdownLeaf__alt9(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeaf__alt15(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 42) {
      return parseMarkdownLeaf__alt20(state);
    }
    else {
      return parseMarkdownLeaf__alt21(state);
    }
  } else if (__byte0 === 95) {
    if (__input.startsWith("___", __peek)) {
      return parseMarkdownLeaf__alt10(state);
    }
  } else if (__byte0 === 43) {
    if (__input.charCodeAt(__peek) === 43 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeaf__alt14(state);
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("\n\n", __off) || __input.startsWith("\n#", __off) || __input.startsWith("\n>", __off) || __input.startsWith("\n- ", __off) || __input.startsWith("\n-\n", __off) || __input.startsWith("\n+ ", __off) || __input.startsWith("\n* ", __off) || __input.startsWith("\n```", __off) || __input.startsWith("\n|", __off) || __input.startsWith("\n---", __off) || __input.startsWith("\n***", __off) || __input.startsWith("\n___", __off) || __input.startsWith("\n===", __off) || __input.startsWith("\n[", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  const __struct: Record<string, unknown> = { type: "paragraph", text: text };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  return { type: "document", children: children };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "heading", depth: 6, text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "heading", depth: 5, text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "heading", depth: 4, text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "heading", depth: 3, text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "heading", depth: 2, text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "heading", depth: 1, text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "heading", depth: 1, text: text, style: "setext" };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "heading", depth: 2, text: text, style: "setext" };
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
  if (!(__input.startsWith("---", __off))) { state.off = __off; throw new SyntaxError("expected " + "---" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "thematic-break" };
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
  if (!(__input.startsWith("***", __off))) { state.off = __off; throw new SyntaxError("expected " + "***" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "thematic-break", marker: "*" };
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
  if (!(__input.startsWith("___", __off))) { state.off = __off; throw new SyntaxError("expected " + "___" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "thematic-break", marker: "_" };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "task-list-item", checked: true, marker: "x", text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "task-list-item", checked: false, text: text };
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
  if (!(__input.charCodeAt(__off) === 45 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "- " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "list-item", ordered: false, text: text };
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
  if (!(__input.charCodeAt(__off) === 43 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "+ " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "list-item", ordered: false, marker: "+", text: text };
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
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "* " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "list-item", ordered: false, marker: "*", text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "list-item", ordered: true, index: index, text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "blockquote", text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("```", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "code-block", lang: lang, text: body };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("```", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "code-block", text: body };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("**", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "bold", text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 42) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "italic", text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("~~", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "strikethrough", text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 96) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "inline-code", text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "link", label: label, url: url };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "reference-link", label: label, id: id };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "image", alt: alt, url: url };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "reference-image", alt: alt, id: id };
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
  return { type: "entity", name: name };
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
  return { type: "table-delimiter", align: ["default", "default"] };
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
  return { type: "table-delimiter", align: ["left", "right"] };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "table-row", cells: [first, second] };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "definition", id: id, url: url };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "footnote-definition", id: id, text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "footnote-reference", id: id };
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
  return { type: "html", tag: tag, text: body, closingTag: closingTag };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 62) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "autolink", url: url };
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
      return parseMarkdownLeafFast__alt8(state);
    }
    else if (__input.charCodeAt(__peek) === 45 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeafFast__alt13(state);
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
      return parseMarkdownLeafFast__alt9(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeafFast__alt15(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 42) {
      return parseMarkdownLeafFast__alt20(state);
    }
    else {
      return parseMarkdownLeafFast__alt21(state);
    }
  } else if (__byte0 === 95) {
    if (__input.startsWith("___", __peek)) {
      return parseMarkdownLeafFast__alt10(state);
    }
  } else if (__byte0 === 43) {
    if (__input.charCodeAt(__peek) === 43 && __input.charCodeAt(__peek + 1) === 32) {
      return parseMarkdownLeafFast__alt14(state);
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("\n\n", __off) || __input.startsWith("\n#", __off) || __input.startsWith("\n>", __off) || __input.startsWith("\n- ", __off) || __input.startsWith("\n-\n", __off) || __input.startsWith("\n+ ", __off) || __input.startsWith("\n* ", __off) || __input.startsWith("\n```", __off) || __input.startsWith("\n|", __off) || __input.startsWith("\n---", __off) || __input.startsWith("\n***", __off) || __input.startsWith("\n___", __off) || __input.startsWith("\n===", __off) || __input.startsWith("\n[", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "paragraph", text: text };
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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

function validateMarkdownLeaf__alt9(state: State): unknown {
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

function validateMarkdownLeaf__alt10(state: State): unknown {
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  if (!(__input.charCodeAt(__off) === 45 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "- " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  if (!(__input.charCodeAt(__off) === 43 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "+ " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  if (!(__input.charCodeAt(__off) === 42 && __input.charCodeAt(__off + 1) === 32)) { state.off = __off; throw new SyntaxError("expected " + "* " + " at position " + __off); }
  __off += 2;
  let text = '';
  {
    // __preWsOff captures the offset at entry — used (with leading-comment
    // tracking) to rewind __lastCaptureStart/End when the until captures
    // nothing. Anchor = end of the last leading comment if any, else
    // __preWsOff (matches tokenized's state.ends[state.pos - 1] anchor).
    const __preWsOff = __off;
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("```", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("```", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("**", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 42) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("~~", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 96) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 41) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 124) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 10) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 93) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 62) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
      return validateMarkdownLeaf__alt8(state);
    }
    else if (__input.charCodeAt(__peek) === 45 && __input.charCodeAt(__peek + 1) === 32) {
      return validateMarkdownLeaf__alt13(state);
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
      return validateMarkdownLeaf__alt9(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 32) {
      return validateMarkdownLeaf__alt15(state);
    }
    else if (__input.charCodeAt(__peek) === 42 && __input.charCodeAt(__peek + 1) === 42) {
      return validateMarkdownLeaf__alt20(state);
    }
    else {
      return validateMarkdownLeaf__alt21(state);
    }
  } else if (__byte0 === 95) {
    if (__input.startsWith("___", __peek)) {
      return validateMarkdownLeaf__alt10(state);
    }
  } else if (__byte0 === 43) {
    if (__input.charCodeAt(__peek) === 43 && __input.charCodeAt(__peek + 1) === 32) {
      return validateMarkdownLeaf__alt14(state);
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
    let __lastLeadingCommentEnd = -1;
    // Skip leading whitespace and comments from the capture's view.
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__input.startsWith("\n\n", __off) || __input.startsWith("\n#", __off) || __input.startsWith("\n>", __off) || __input.startsWith("\n- ", __off) || __input.startsWith("\n-\n", __off) || __input.startsWith("\n+ ", __off) || __input.startsWith("\n* ", __off) || __input.startsWith("\n```", __off) || __input.startsWith("\n|", __off) || __input.startsWith("\n---", __off) || __input.startsWith("\n***", __off) || __input.startsWith("\n___", __off) || __input.startsWith("\n===", __off) || __input.startsWith("\n[", __off)) break;
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
  return { type: "html", tag: __pre_tag, text: body, closingTag: closingTag };
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

function stringify_MarkdownDocument_source(s: any): string {
  return __renderSlot_source(s["children"]);
}

function stringify_MarkdownDocument_html(s: any): string {
  return __renderSlot_html(s["children"]);
}

function stringify_MarkdownLeaf_heading_source(s: any): string {
  if (s["depth"] === 6 && s["style"] === undefined) return "###### " + __renderSlot_source(s["text"]);
  if (s["depth"] === 5 && s["style"] === undefined) return "##### " + __renderSlot_source(s["text"]);
  if (s["depth"] === 4 && s["style"] === undefined) return "#### " + __renderSlot_source(s["text"]);
  if (s["depth"] === 3 && s["style"] === undefined) return "### " + __renderSlot_source(s["text"]);
  if (s["depth"] === 2 && s["style"] === undefined) return "## " + __renderSlot_source(s["text"]);
  if (s["depth"] === 1 && s["style"] === undefined) return "# " + __renderSlot_source(s["text"]);
  if (s["depth"] === 1 && s["style"] === "setext") return __renderSlot_source(s["text"]) + " ===";
  if (s["depth"] === 2 && s["style"] === "setext") return __renderSlot_source(s["text"]) + " ---";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target source, type heading)");
}

function stringify_MarkdownLeaf_thematic_break_source(s: any): string {
  if (s["marker"] === undefined) return "---";
  if (s["marker"] === "*") return "***";
  if (s["marker"] === "_") return "___";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target source, type thematic-break)");
}

function stringify_MarkdownLeaf_task_list_item_source(s: any): string {
  if (s["checked"] === true && s["marker"] === "x") return "- [x] " + __renderSlot_source(s["text"]);
  if (s["checked"] === false && s["marker"] === undefined) return "- [ ] " + __renderSlot_source(s["text"]);
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target source, type task-list-item)");
}

function stringify_MarkdownLeaf_list_item_source(s: any): string {
  if (s["ordered"] === false && s["marker"] === undefined && s["index"] === undefined) return "- " + __renderSlot_source(s["text"]);
  if (s["ordered"] === false && s["marker"] === "+" && s["index"] === undefined) return "+ " + __renderSlot_source(s["text"]);
  if (s["ordered"] === false && s["marker"] === "*" && s["index"] === undefined) return "* " + __renderSlot_source(s["text"]);
  if (s["ordered"] === true && s["index"] !== undefined && s["marker"] === undefined) return __renderSlot_source(s["index"]) + ". " + __renderSlot_source(s["text"]);
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target source, type list-item)");
}

function stringify_MarkdownLeaf_blockquote_source(s: any): string {
  return "> " + __renderSlot_source(s["text"]);
}

function stringify_MarkdownLeaf_code_block_source(s: any): string {
  if (s["lang"] !== undefined) return "```" + __renderSlot_source(s["lang"]) + " " + __renderSlot_source(s["text"]) + " ```";
  if (s["lang"] === undefined) return "```\n" + __renderSlot_source(s["text"]) + " ```";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target source, type code-block)");
}

function stringify_MarkdownLeaf_bold_source(s: any): string {
  return "**" + __renderSlot_source(s["text"]) + "**";
}

function stringify_MarkdownLeaf_italic_source(s: any): string {
  return "*" + __renderSlot_source(s["text"]) + "*";
}

function stringify_MarkdownLeaf_strikethrough_source(s: any): string {
  return "~~" + __renderSlot_source(s["text"]) + "~~";
}

function stringify_MarkdownLeaf_inline_code_source(s: any): string {
  return "`" + __renderSlot_source(s["text"]) + "`";
}

function stringify_MarkdownLeaf_link_source(s: any): string {
  return "[" + __renderSlot_source(s["label"]) + "](" + __renderSlot_source(s["url"]) + ")";
}

function stringify_MarkdownLeaf_reference_link_source(s: any): string {
  return "[" + __renderSlot_source(s["label"]) + "][" + __renderSlot_source(s["id"]) + "]";
}

function stringify_MarkdownLeaf_image_source(s: any): string {
  return "![" + __renderSlot_source(s["alt"]) + "](" + __renderSlot_source(s["url"]) + ")";
}

function stringify_MarkdownLeaf_reference_image_source(s: any): string {
  return "![" + __renderSlot_source(s["alt"]) + "][" + __renderSlot_source(s["id"]) + "]";
}

function stringify_MarkdownLeaf_entity_source(s: any): string {
  return "&" + __renderSlot_source(s["name"]) + ";";
}

function stringify_MarkdownLeaf_table_delimiter_source(s: any): string {
  if (true) return "| --- | --- |";
  if (true) return "|:---|---:|";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target source, type table-delimiter)");
}

function stringify_MarkdownLeaf_table_row_source(s: any): string {
  return "| " + __renderSlot_source(s["cells"][0]) + " | " + __renderSlot_source(s["cells"][1]) + " |";
}

function stringify_MarkdownLeaf_definition_source(s: any): string {
  return "[" + __renderSlot_source(s["id"]) + "]: " + __renderSlot_source(s["url"]);
}

function stringify_MarkdownLeaf_footnote_definition_source(s: any): string {
  return "[^" + __renderSlot_source(s["id"]) + "]: " + __renderSlot_source(s["text"]);
}

function stringify_MarkdownLeaf_footnote_reference_source(s: any): string {
  return "[^" + __renderSlot_source(s["id"]) + "]";
}

function stringify_MarkdownLeaf_html_source(s: any): string {
  return "<" + __renderSlot_source(s["tag"]) + ">" + __renderSlot_source(s["text"]) + "</" + __renderSlot_source(s["closingTag"]) + ">";
}

function stringify_MarkdownLeaf_autolink_source(s: any): string {
  return "<" + __renderSlot_source(s["url"]) + ">";
}

function stringify_MarkdownLeaf_source(s: any): string {
  switch (s.type) {
    case "heading": return stringify_MarkdownLeaf_heading_source(s);
    case "thematic-break": return stringify_MarkdownLeaf_thematic_break_source(s);
    case "task-list-item": return stringify_MarkdownLeaf_task_list_item_source(s);
    case "list-item": return stringify_MarkdownLeaf_list_item_source(s);
    case "blockquote": return stringify_MarkdownLeaf_blockquote_source(s);
    case "code-block": return stringify_MarkdownLeaf_code_block_source(s);
    case "bold": return stringify_MarkdownLeaf_bold_source(s);
    case "italic": return stringify_MarkdownLeaf_italic_source(s);
    case "strikethrough": return stringify_MarkdownLeaf_strikethrough_source(s);
    case "inline-code": return stringify_MarkdownLeaf_inline_code_source(s);
    case "link": return stringify_MarkdownLeaf_link_source(s);
    case "reference-link": return stringify_MarkdownLeaf_reference_link_source(s);
    case "image": return stringify_MarkdownLeaf_image_source(s);
    case "reference-image": return stringify_MarkdownLeaf_reference_image_source(s);
    case "entity": return stringify_MarkdownLeaf_entity_source(s);
    case "table-delimiter": return stringify_MarkdownLeaf_table_delimiter_source(s);
    case "table-row": return stringify_MarkdownLeaf_table_row_source(s);
    case "definition": return stringify_MarkdownLeaf_definition_source(s);
    case "footnote-definition": return stringify_MarkdownLeaf_footnote_definition_source(s);
    case "footnote-reference": return stringify_MarkdownLeaf_footnote_reference_source(s);
    case "html": return stringify_MarkdownLeaf_html_source(s);
    case "autolink": return stringify_MarkdownLeaf_autolink_source(s);
  }
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target source)");
}

function stringify_MarkdownLeaf_heading_html(s: any): string {
  if (s["depth"] === 6 && s["style"] === undefined) return "<h6>" + __renderSlot_html(s["text"]) + "</h6>";
  if (s["depth"] === 5 && s["style"] === undefined) return "<h5>" + __renderSlot_html(s["text"]) + "</h5>";
  if (s["depth"] === 4 && s["style"] === undefined) return "<h4>" + __renderSlot_html(s["text"]) + "</h4>";
  if (s["depth"] === 3 && s["style"] === undefined) return "<h3>" + __renderSlot_html(s["text"]) + "</h3>";
  if (s["depth"] === 2 && s["style"] === undefined) return "<h2>" + __renderSlot_html(s["text"]) + "</h2>";
  if (s["depth"] === 1 && s["style"] === undefined) return "<h1>" + __renderSlot_html(s["text"]) + "</h1>";
  if (s["depth"] === 1 && s["style"] === "setext") return "<h1>" + __renderSlot_html(s["text"]) + "</h1>";
  if (s["depth"] === 2 && s["style"] === "setext") return "<h2>" + __renderSlot_html(s["text"]) + "</h2>";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target html, type heading)");
}

function stringify_MarkdownLeaf_thematic_break_html(s: any): string {
  if (s["marker"] === undefined) return "<hr>";
  if (s["marker"] === "*") return "<hr>";
  if (s["marker"] === "_") return "<hr>";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target html, type thematic-break)");
}

function stringify_MarkdownLeaf_task_list_item_html(s: any): string {
  if (s["checked"] === true && s["marker"] === "x") return "<li><input type=\"checkbox\" checked>" + __renderSlot_html(s["text"]) + "</li>";
  if (s["checked"] === false && s["marker"] === undefined) return "<li><input type=\"checkbox\">" + __renderSlot_html(s["text"]) + "</li>";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target html, type task-list-item)");
}

function stringify_MarkdownLeaf_list_item_html(s: any): string {
  if (s["ordered"] === false && s["marker"] === undefined && s["index"] === undefined) return "<li>" + __renderSlot_html(s["text"]) + "</li>";
  if (s["ordered"] === false && s["marker"] === "+" && s["index"] === undefined) return "<li>" + __renderSlot_html(s["text"]) + "</li>";
  if (s["ordered"] === false && s["marker"] === "*" && s["index"] === undefined) return "<li>" + __renderSlot_html(s["text"]) + "</li>";
  if (s["ordered"] === true && s["index"] !== undefined && s["marker"] === undefined) return "<li>" + __renderSlot_html(s["text"]) + "</li>";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target html, type list-item)");
}

function stringify_MarkdownLeaf_blockquote_html(s: any): string {
  return "<blockquote>" + __renderSlot_html(s["text"]) + "</blockquote>";
}

function stringify_MarkdownLeaf_code_block_html(s: any): string {
  if (s["lang"] !== undefined) return "<pre><code class=\"lang-" + __renderSlot_html(s["lang"]) + "\">" + __renderSlot_html(s["text"]) + "</code></pre>";
  if (s["lang"] === undefined) return "<pre><code>" + __renderSlot_html(s["text"]) + "</code></pre>";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target html, type code-block)");
}

function stringify_MarkdownLeaf_bold_html(s: any): string {
  return "<strong>" + __renderSlot_html(s["text"]) + "</strong>";
}

function stringify_MarkdownLeaf_italic_html(s: any): string {
  return "<em>" + __renderSlot_html(s["text"]) + "</em>";
}

function stringify_MarkdownLeaf_strikethrough_html(s: any): string {
  return "<s>" + __renderSlot_html(s["text"]) + "</s>";
}

function stringify_MarkdownLeaf_inline_code_html(s: any): string {
  return "<code>" + __renderSlot_html(s["text"]) + "</code>";
}

function stringify_MarkdownLeaf_link_html(s: any): string {
  return "<a href=\"" + __renderSlot_html(s["url"]) + "\">" + __renderSlot_html(s["label"]) + "</a>";
}

function stringify_MarkdownLeaf_reference_link_html(s: any): string {
  return "<a href=\"#" + __renderSlot_html(s["id"]) + "\">" + __renderSlot_html(s["label"]) + "</a>";
}

function stringify_MarkdownLeaf_image_html(s: any): string {
  return "<img src=\"" + __renderSlot_html(s["url"]) + "\" alt=\"" + __renderSlot_html(s["alt"]) + "\">";
}

function stringify_MarkdownLeaf_reference_image_html(s: any): string {
  return "<img src=\"#" + __renderSlot_html(s["id"]) + "\" alt=\"" + __renderSlot_html(s["alt"]) + "\">";
}

function stringify_MarkdownLeaf_entity_html(s: any): string {
  return "&" + __renderSlot_html(s["name"]) + ";";
}

function stringify_MarkdownLeaf_table_delimiter_html(s: any): string {
  if (true) return "";
  if (true) return "";
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target html, type table-delimiter)");
}

function stringify_MarkdownLeaf_table_row_html(s: any): string {
  return "<tr><td>" + __renderSlot_html(s["cells"][0]) + "</td><td>" + __renderSlot_html(s["cells"][1]) + "</td></tr>";
}

function stringify_MarkdownLeaf_definition_html(s: any): string {
  return "";
}

function stringify_MarkdownLeaf_footnote_definition_html(s: any): string {
  return "<div class=\"footnote\" id=\"fn" + __renderSlot_html(s["id"]) + "\">" + __renderSlot_html(s["text"]) + "</div>";
}

function stringify_MarkdownLeaf_footnote_reference_html(s: any): string {
  return "<sup><a href=\"#fn" + __renderSlot_html(s["id"]) + "\">" + __renderSlot_html(s["id"]) + "</a></sup>";
}

function stringify_MarkdownLeaf_html_html(s: any): string {
  return "<" + __renderSlot_html(s["tag"]) + ">" + __renderSlot_html(s["text"]) + "</" + __renderSlot_html(s["closingTag"]) + ">";
}

function stringify_MarkdownLeaf_autolink_html(s: any): string {
  return "<a href=\"" + __renderSlot_html(s["url"]) + "\">" + __renderSlot_html(s["url"]) + "</a>";
}

function stringify_MarkdownLeaf_html(s: any): string {
  switch (s.type) {
    case "heading": return stringify_MarkdownLeaf_heading_html(s);
    case "thematic-break": return stringify_MarkdownLeaf_thematic_break_html(s);
    case "task-list-item": return stringify_MarkdownLeaf_task_list_item_html(s);
    case "list-item": return stringify_MarkdownLeaf_list_item_html(s);
    case "blockquote": return stringify_MarkdownLeaf_blockquote_html(s);
    case "code-block": return stringify_MarkdownLeaf_code_block_html(s);
    case "bold": return stringify_MarkdownLeaf_bold_html(s);
    case "italic": return stringify_MarkdownLeaf_italic_html(s);
    case "strikethrough": return stringify_MarkdownLeaf_strikethrough_html(s);
    case "inline-code": return stringify_MarkdownLeaf_inline_code_html(s);
    case "link": return stringify_MarkdownLeaf_link_html(s);
    case "reference-link": return stringify_MarkdownLeaf_reference_link_html(s);
    case "image": return stringify_MarkdownLeaf_image_html(s);
    case "reference-image": return stringify_MarkdownLeaf_reference_image_html(s);
    case "entity": return stringify_MarkdownLeaf_entity_html(s);
    case "table-delimiter": return stringify_MarkdownLeaf_table_delimiter_html(s);
    case "table-row": return stringify_MarkdownLeaf_table_row_html(s);
    case "definition": return stringify_MarkdownLeaf_definition_html(s);
    case "footnote-definition": return stringify_MarkdownLeaf_footnote_definition_html(s);
    case "footnote-reference": return stringify_MarkdownLeaf_footnote_reference_html(s);
    case "html": return stringify_MarkdownLeaf_html_html(s);
    case "autolink": return stringify_MarkdownLeaf_autolink_html(s);
  }
  throw new Error("stringify: no production matches structure shape for node MarkdownLeaf (target html)");
}

function stringify_MarkdownParagraph_source(s: any): string {
  return __renderSlot_source(s["text"]);
}

function stringify_MarkdownParagraph_html(s: any): string {
  return "<p>" + __renderSlot_html(s["text"]) + "</p>";
}

function __dispatchStringify_source(s: any): string {
  if (typeof s !== "object" || s === null) throw new Error("stringify: structure must be an object");
  switch (s.type) {
    case "document": return stringify_MarkdownDocument_source(s);
    case "heading": return stringify_MarkdownLeaf_heading_source(s);
    case "thematic-break": return stringify_MarkdownLeaf_thematic_break_source(s);
    case "task-list-item": return stringify_MarkdownLeaf_task_list_item_source(s);
    case "list-item": return stringify_MarkdownLeaf_list_item_source(s);
    case "blockquote": return stringify_MarkdownLeaf_blockquote_source(s);
    case "code-block": return stringify_MarkdownLeaf_code_block_source(s);
    case "bold": return stringify_MarkdownLeaf_bold_source(s);
    case "italic": return stringify_MarkdownLeaf_italic_source(s);
    case "strikethrough": return stringify_MarkdownLeaf_strikethrough_source(s);
    case "inline-code": return stringify_MarkdownLeaf_inline_code_source(s);
    case "link": return stringify_MarkdownLeaf_link_source(s);
    case "reference-link": return stringify_MarkdownLeaf_reference_link_source(s);
    case "image": return stringify_MarkdownLeaf_image_source(s);
    case "reference-image": return stringify_MarkdownLeaf_reference_image_source(s);
    case "entity": return stringify_MarkdownLeaf_entity_source(s);
    case "table-delimiter": return stringify_MarkdownLeaf_table_delimiter_source(s);
    case "table-row": return stringify_MarkdownLeaf_table_row_source(s);
    case "definition": return stringify_MarkdownLeaf_definition_source(s);
    case "footnote-definition": return stringify_MarkdownLeaf_footnote_definition_source(s);
    case "footnote-reference": return stringify_MarkdownLeaf_footnote_reference_source(s);
    case "html": return stringify_MarkdownLeaf_html_source(s);
    case "autolink": return stringify_MarkdownLeaf_autolink_source(s);
    case "paragraph": return stringify_MarkdownParagraph_source(s);
  }
  throw new Error("stringify: no node type for structure.type='" + (s as any).type + "' under target='source'");
}

function __dispatchStringify_html(s: any): string {
  if (typeof s !== "object" || s === null) throw new Error("stringify: structure must be an object");
  switch (s.type) {
    case "document": return stringify_MarkdownDocument_html(s);
    case "heading": return stringify_MarkdownLeaf_heading_html(s);
    case "thematic-break": return stringify_MarkdownLeaf_thematic_break_html(s);
    case "task-list-item": return stringify_MarkdownLeaf_task_list_item_html(s);
    case "list-item": return stringify_MarkdownLeaf_list_item_html(s);
    case "blockquote": return stringify_MarkdownLeaf_blockquote_html(s);
    case "code-block": return stringify_MarkdownLeaf_code_block_html(s);
    case "bold": return stringify_MarkdownLeaf_bold_html(s);
    case "italic": return stringify_MarkdownLeaf_italic_html(s);
    case "strikethrough": return stringify_MarkdownLeaf_strikethrough_html(s);
    case "inline-code": return stringify_MarkdownLeaf_inline_code_html(s);
    case "link": return stringify_MarkdownLeaf_link_html(s);
    case "reference-link": return stringify_MarkdownLeaf_reference_link_html(s);
    case "image": return stringify_MarkdownLeaf_image_html(s);
    case "reference-image": return stringify_MarkdownLeaf_reference_image_html(s);
    case "entity": return stringify_MarkdownLeaf_entity_html(s);
    case "table-delimiter": return stringify_MarkdownLeaf_table_delimiter_html(s);
    case "table-row": return stringify_MarkdownLeaf_table_row_html(s);
    case "definition": return stringify_MarkdownLeaf_definition_html(s);
    case "footnote-definition": return stringify_MarkdownLeaf_footnote_definition_html(s);
    case "footnote-reference": return stringify_MarkdownLeaf_footnote_reference_html(s);
    case "html": return stringify_MarkdownLeaf_html_html(s);
    case "autolink": return stringify_MarkdownLeaf_autolink_html(s);
    case "paragraph": return stringify_MarkdownParagraph_html(s);
  }
  throw new Error("stringify: no node type for structure.type='" + (s as any).type + "' under target='html'");
}

export function stringify(s: unknown, options?: { target?: string }): string {
  const target = options?.target ?? "source";
  if (target === "source") return __dispatchStringify_source(s as any);
  if (target === "html") return __dispatchStringify_html(s as any);
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

function __renderSlot_html(v: any): string {
  if (v === null || v === undefined) return "";
  const t = typeof v;
  if (t === "string") return v;
  if (t === "number") return String(v);
  if (t === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) {
    let out = "";
    for (let i = 0; i < v.length; i++) out += __renderSlot_html(v[i]);
    return out;
  }
  return __dispatchStringify_html(v);
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

