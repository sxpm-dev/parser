// Auto-generated from packages/html/src/schema.ts
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

function parseHtmlDocument(state: State): unknown {
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
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_0(state); __off = state.off;
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
  const __captures: Record<string, unknown> = { __production: "HtmlDocument#0", children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseDoctype__valid(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33)) { state.off = __off; throw new SyntaxError("expected " + "<!" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __keyword_s = __off;
  let keyword;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __keyword_s);
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
        __off - __keyword_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__keyword_s) | 32) === 0x75
        && (__input.charCodeAt(__keyword_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__keyword_s + 2) | 32) === 0x6c
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
  keyword = __input.slice(__keyword_s, __off);
  const __keyword_lc = keyword.toLowerCase();
  if (!(__keyword_lc === "doctype")) { state.off = __off; throw new SyntaxError("expected one of DOCTYPE at position " + __keyword_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
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
  const __captures: Record<string, unknown> = { __production: "Doctype#0", keyword: keyword, name: name };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseDoctype__recovery0(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33)) { state.off = __off; throw new SyntaxError("expected " + "<!" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __keyword_s = __off;
  let keyword;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __keyword_s);
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
        __off - __keyword_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__keyword_s) | 32) === 0x75
        && (__input.charCodeAt(__keyword_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__keyword_s + 2) | 32) === 0x6c
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
  keyword = __input.slice(__keyword_s, __off);
  const __keyword_lc = keyword.toLowerCase();
  if (!(__keyword_lc === "doctype")) { state.off = __off; throw new SyntaxError("expected one of DOCTYPE at position " + __keyword_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "Doctype#1", keyword: keyword, name: name };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseDoctype(state: State): unknown {
  const __recoverStart = state.off;
  try {
    return parseDoctype__valid(state);
  } catch (__validErr) {
    state.off = __recoverStart;
    const __r0 = trySpeculate(state, parseDoctype__recovery0);
    if (__r0 !== null) return __r0;
    state.off = __recoverStart;
    throw __validErr;
  }
}

function parseComment(state: State): unknown {
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
  if (!(__input.startsWith("<!--", __off))) { state.off = __off; throw new SyntaxError("expected " + "<!--" + " at position " + __off); }
  __off += 4;
  __consumedEnd = __off;
  let data = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && ((__c === 45 && __input.startsWith("-->", __off)))) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      data = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    data = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("-->", __off))) { state.off = __off; throw new SyntaxError("expected " + "-->" + " at position " + __off); }
  __off += 3;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "Comment#0", data: data };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt0(state: State): unknown {
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
  if (!(__tag_lc === "script" || __tag_lc === "style" || __tag_lc === "textarea" || __tag_lc === "title")) { state.off = __off; throw new SyntaxError("expected one of script, style, textarea, title at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
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
  let children = '';
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
    children = __input.slice(__startOff, __earliest);
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
  const __closeTag_s = __off;
  let closeTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closeTag = __input.slice(__closeTag_s, __off);
  const __closeTag_lc = closeTag.toLowerCase();
  if (!(__closeTag_lc === "script" || __closeTag_lc === "style" || __closeTag_lc === "textarea" || __closeTag_lc === "title")) { state.off = __off; throw new SyntaxError("expected one of script, style, textarea, title at position " + __closeTag_s); }
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
  const __captures: Record<string, unknown> = { __production: "HtmlElement#0", tag: tag, attrs: attrs, children: children, closeTag: closeTag };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt1(state: State): unknown {
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
  if (!(__tag_lc === "area" || __tag_lc === "base" || __tag_lc === "br" || __tag_lc === "col" || __tag_lc === "embed" || __tag_lc === "hr" || __tag_lc === "img" || __tag_lc === "input" || __tag_lc === "link" || __tag_lc === "meta" || __tag_lc === "param" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "wbr")) { state.off = __off; throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
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
  const __captures: Record<string, unknown> = { __production: "HtmlElement#1", tag: tag, attrs: attrs };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt2(state: State): unknown {
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
  if (!(__tag_lc === "area" || __tag_lc === "base" || __tag_lc === "br" || __tag_lc === "col" || __tag_lc === "embed" || __tag_lc === "hr" || __tag_lc === "img" || __tag_lc === "input" || __tag_lc === "link" || __tag_lc === "meta" || __tag_lc === "param" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "wbr")) { state.off = __off; throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62)) { state.off = __off; throw new SyntaxError("expected " + "/>" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#2", tag: tag, attrs: attrs };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt3(state: State): unknown {
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
  if (!(__tag_lc === "li")) { state.off = __off; throw new SyntaxError("expected one of li at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</li>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</menu>", __off) || __input.startsWith("</li>", __off) || __input.startsWith("</ol>", __off) || __input.startsWith("</ul>", __off))) break;
      if (__c2 === 108 && (__input.startsWith("<li>", __off) || __input.startsWith("<li ", __off) || __input.startsWith("<li/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_1(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</li>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#4", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt4(state: State): unknown {
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
  if (!(__tag_lc === "dt" || __tag_lc === "dd")) { state.off = __off; throw new SyntaxError("expected one of dt, dd at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</dt>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</dt>", __off) || __input.startsWith("</dd>", __off) || __input.startsWith("</dl>", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<dt>", __off) || __input.startsWith("<dt ", __off) || __input.startsWith("<dt/", __off) || __input.startsWith("<dd>", __off) || __input.startsWith("<dd ", __off) || __input.startsWith("<dd/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_2(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dt>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dd>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#5", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt5(state: State): unknown {
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
  if (!(__tag_lc === "tr")) { state.off = __off; throw new SyntaxError("expected one of tr at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tr>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off) || __input.startsWith("<tr/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_3(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tr>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#6", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt6(state: State): unknown {
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
  if (!(__tag_lc === "td" || __tag_lc === "th")) { state.off = __off; throw new SyntaxError("expected one of td, th at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</td>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</td>", __off) || __input.startsWith("</th>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<td>", __off) || __input.startsWith("<td ", __off) || __input.startsWith("<td/", __off) || __input.startsWith("<th>", __off) || __input.startsWith("<th ", __off) || __input.startsWith("<th/", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_4(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</td>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</th>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#7", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt7(state: State): unknown {
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
  if (!(__tag_lc === "p")) { state.off = __off; throw new SyntaxError("expected one of p at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</p>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</p>", __off))) break;
      if (__c2 === 97 && (__input.startsWith("<article>", __off) || __input.startsWith("<article ", __off) || __input.startsWith("<address>", __off) || __input.startsWith("<address ", __off) || __input.startsWith("<aside>", __off) || __input.startsWith("<aside ", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<blockquote>", __off) || __input.startsWith("<blockquote ", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<div>", __off) || __input.startsWith("<div ", __off) || __input.startsWith("<dl>", __off) || __input.startsWith("<dl ", __off))) break;
      if (__c2 === 102 && (__input.startsWith("<footer>", __off) || __input.startsWith("<footer ", __off) || __input.startsWith("<form>", __off) || __input.startsWith("<form ", __off))) break;
      if (__c2 === 104 && (__input.startsWith("<header>", __off) || __input.startsWith("<header ", __off) || __input.startsWith("<h1>", __off) || __input.startsWith("<h1 ", __off) || __input.startsWith("<h2>", __off) || __input.startsWith("<h2 ", __off) || __input.startsWith("<h3>", __off) || __input.startsWith("<h3 ", __off) || __input.startsWith("<h4>", __off) || __input.startsWith("<h4 ", __off) || __input.startsWith("<h5>", __off) || __input.startsWith("<h5 ", __off) || __input.startsWith("<h6>", __off) || __input.startsWith("<h6 ", __off) || __input.startsWith("<hr>", __off) || __input.startsWith("<hr ", __off) || __input.startsWith("<hr/", __off))) break;
      if (__c2 === 110 && (__input.startsWith("<nav>", __off) || __input.startsWith("<nav ", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<ol>", __off) || __input.startsWith("<ol ", __off))) break;
      if (__c2 === 112 && (__input.startsWith("<pre>", __off) || __input.startsWith("<pre ", __off) || __input.startsWith("<p>", __off) || __input.startsWith("<p ", __off) || __input.startsWith("<p/", __off))) break;
      if (__c2 === 115 && (__input.startsWith("<section>", __off) || __input.startsWith("<section ", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<table>", __off) || __input.startsWith("<table ", __off))) break;
      if (__c2 === 117 && (__input.startsWith("<ul>", __off) || __input.startsWith("<ul ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_5(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</p>", __off)) { __off += 4; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#8", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt8(state: State): unknown {
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
  if (!(__tag_lc === "option" || __tag_lc === "optgroup")) { state.off = __off; throw new SyntaxError("expected one of option, optgroup at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</option>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</optgroup>", __off) || __input.startsWith("</datalist>", __off) || __input.startsWith("</option>", __off) || __input.startsWith("</select>", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<optgroup>", __off) || __input.startsWith("<optgroup ", __off) || __input.startsWith("<option>", __off) || __input.startsWith("<option ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_6(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</option>", __off)) { __off += 9; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</optgroup>", __off)) { __off += 11; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#9", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt9(state: State): unknown {
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
  if (!(__tag_lc === "html")) { state.off = __off; throw new SyntaxError("expected one of html at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</html>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</html>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_7(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</html>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#10", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt10(state: State): unknown {
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
  if (!(__tag_lc === "head")) { state.off = __off; throw new SyntaxError("expected one of head at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</head>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</head>", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<body>", __off) || __input.startsWith("<body ", __off) || __input.startsWith("<body/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_8(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</head>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#11", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt11(state: State): unknown {
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
  if (!(__tag_lc === "tbody")) { state.off = __off; throw new SyntaxError("expected one of tbody at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tbody>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_9(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tbody>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#12", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt12(state: State): unknown {
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
  if (!(__tag_lc === "thead")) { state.off = __off; throw new SyntaxError("expected one of thead at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</thead>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</thead>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_10(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</thead>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#13", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt13(state: State): unknown {
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
  if (!(__tag_lc === "tfoot")) { state.off = __off; throw new SyntaxError("expected one of tfoot at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tfoot>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_11(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tfoot>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#14", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt14(state: State): unknown {
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
  if (!(__tag_lc === "body")) { state.off = __off; throw new SyntaxError("expected one of body at position " + __tag_s); }
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</body>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</body>", __off) || __input.startsWith("</html>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_12(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</body>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#15", tag: tag, attrs: attrs, children: children };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid__alt15(state: State): unknown {
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
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __children_startOff = __off;
  let __prevEnd_children = __children_startOff;
  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_13(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_children);
    children.push(__child);
    if (__off === __before) break;
    __prevEnd_children = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_children;
  }
  __consumedEnd = __prevEnd_children;
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
  const __closeTag_s = __off;
  let closeTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closeTag = __input.slice(__closeTag_s, __off);
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
  const __captures: Record<string, unknown> = { __production: "HtmlElement#16", tag: tag, attrs: attrs, children: children, closeTag: closeTag };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement__valid(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
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
  if (!(isCssIdentStart(__input.charCodeAt(__peek)))) return parseHtmlElement__valid__alt15(state);
  {
    const __identStart = __peek;
    __peek++;
    while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
    const __ident = __input.slice(__identStart, __peek).toLowerCase();
    if (__ident === "script") {
    return parseHtmlElement__valid__alt0(state);
  }
    if (__ident === "style") {
    return parseHtmlElement__valid__alt0(state);
  }
    if (__ident === "textarea") {
    return parseHtmlElement__valid__alt0(state);
  }
    if (__ident === "title") {
    return parseHtmlElement__valid__alt0(state);
  }
    if (__ident === "area") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "base") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "br") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "col") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "embed") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "hr") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "img") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "input") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "link") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "meta") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "param") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "source") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "track") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "wbr") {
    { const r = trySpeculate(state, parseHtmlElement__valid__alt1); if (r !== null) return r; }
    return parseHtmlElement__valid__alt2(state);
  }
    if (__ident === "li") {
    return parseHtmlElement__valid__alt3(state);
  }
    if (__ident === "dt") {
    return parseHtmlElement__valid__alt4(state);
  }
    if (__ident === "dd") {
    return parseHtmlElement__valid__alt4(state);
  }
    if (__ident === "tr") {
    return parseHtmlElement__valid__alt5(state);
  }
    if (__ident === "td") {
    return parseHtmlElement__valid__alt6(state);
  }
    if (__ident === "th") {
    return parseHtmlElement__valid__alt6(state);
  }
    if (__ident === "p") {
    return parseHtmlElement__valid__alt7(state);
  }
    if (__ident === "option") {
    return parseHtmlElement__valid__alt8(state);
  }
    if (__ident === "optgroup") {
    return parseHtmlElement__valid__alt8(state);
  }
    if (__ident === "html") {
    return parseHtmlElement__valid__alt9(state);
  }
    if (__ident === "head") {
    return parseHtmlElement__valid__alt10(state);
  }
    if (__ident === "tbody") {
    return parseHtmlElement__valid__alt11(state);
  }
    if (__ident === "thead") {
    return parseHtmlElement__valid__alt12(state);
  }
    if (__ident === "tfoot") {
    return parseHtmlElement__valid__alt13(state);
  }
    if (__ident === "body") {
    return parseHtmlElement__valid__alt14(state);
  }
    return parseHtmlElement__valid__alt15(state);
  }
}

function parseHtmlElement__recovery0(state: State): unknown {
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
  __consumedEnd = __off;
  const __attrs_startOff = __off;
  let __prevEnd_attrs = __attrs_startOff;
  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttribute(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_attrs);
    attrs.push(__child);
    if (__off === __before) break;
    __prevEnd_attrs = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_attrs;
  }
  __consumedEnd = __prevEnd_attrs;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62)) { state.off = __off; throw new SyntaxError("expected " + "/>" + " at position " + __off); }
  __off += 2;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "HtmlElement#3", tag: tag, attrs: attrs };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseHtmlElement(state: State): unknown {
  const __recoverStart = state.off;
  try {
    return parseHtmlElement__valid(state);
  } catch (__validErr) {
    state.off = __recoverStart;
    const __r0 = trySpeculate(state, parseHtmlElement__recovery0);
    if (__r0 !== null) return __r0;
    state.off = __recoverStart;
    throw __validErr;
  }
}

function parseTextNode(state: State): unknown {
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
  let value = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60) { __earliest = __i; break; }
    }
    __off = __earliest;
    state.__lastCaptureStart = __startOff;
    state.__lastCaptureEnd = __earliest;
    value = __input.slice(__startOff, __earliest);
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "TextNode#0", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseAttribute__alt0(state: State): unknown {
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
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 34)) { state.off = __off; throw new SyntaxError("expected " + "\"" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let value = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 34)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      value = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    value = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 34)) { state.off = __off; throw new SyntaxError("expected " + "\"" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "Attribute#0", name: name, value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseAttribute__alt1(state: State): unknown {
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
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 39)) { state.off = __off; throw new SyntaxError("expected " + "'" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let value = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 39)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      value = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    value = __input.slice(__startOff, __lastNonWs);
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 39)) { state.off = __off; throw new SyntaxError("expected " + "'" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "Attribute#1", name: name, value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseAttribute__alt2(state: State): unknown {
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
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let value = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 32 || __c === 9 || __c === 10 || __c === 13 || __c === 12 || __c === 62) { __earliest = __i; break; }
      if (__c === 47 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 62))) { __earliest = __i; break; }
    }
    __off = __earliest;
    state.__lastCaptureStart = __startOff;
    state.__lastCaptureEnd = __earliest;
    value = __input.slice(__startOff, __earliest);
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "Attribute#2", name: name, value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseAttribute__alt3(state: State): unknown {
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
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "Attribute#3", name: name };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseAttribute(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(__peek < __len && isCssIdentStart(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
    __peek++;
    while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
  // Skip ws before the discriminator.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
  if (__input.charCodeAt(__peek) === 61) {
    __peek = state.off;
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isCssIdentStart(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 61)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 34) {
      return parseAttribute__alt0(state);
    }
    if (__input.charCodeAt(__peek) === 39) {
      return parseAttribute__alt1(state);
    }
    return parseAttribute__alt2(state);
  }
  return parseAttribute__alt3(state);
}

function parseHtmlDocumentFast(state: State): unknown {
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
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_14(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlDocument#0", children: children };
}

function parseDoctypeFast__valid(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33)) { state.off = __off; throw new SyntaxError("expected " + "<!" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __keyword_s = __off;
  let keyword;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __keyword_s);
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
        __off - __keyword_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__keyword_s) | 32) === 0x75
        && (__input.charCodeAt(__keyword_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__keyword_s + 2) | 32) === 0x6c
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
  keyword = __input.slice(__keyword_s, __off);
  const __keyword_lc = keyword.toLowerCase();
  if (!(__keyword_lc === "doctype")) { state.off = __off; throw new SyntaxError("expected one of DOCTYPE at position " + __keyword_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
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
  return { __production: "Doctype#0", keyword: keyword, name: name };
}

function parseDoctypeFast__recovery0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33)) { state.off = __off; throw new SyntaxError("expected " + "<!" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __keyword_s = __off;
  let keyword;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __keyword_s);
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
        __off - __keyword_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__keyword_s) | 32) === 0x75
        && (__input.charCodeAt(__keyword_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__keyword_s + 2) | 32) === 0x6c
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
  keyword = __input.slice(__keyword_s, __off);
  const __keyword_lc = keyword.toLowerCase();
  if (!(__keyword_lc === "doctype")) { state.off = __off; throw new SyntaxError("expected one of DOCTYPE at position " + __keyword_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "Doctype#1", keyword: keyword, name: name };
}

function parseDoctypeFast(state: State): unknown {
  const __recoverStart = state.off;
  try {
    return parseDoctypeFast__valid(state);
  } catch (__validErr) {
    state.off = __recoverStart;
    const __r0 = trySpeculate(state, parseDoctypeFast__recovery0);
    if (__r0 !== null) return __r0;
    state.off = __recoverStart;
    throw __validErr;
  }
}

function parseCommentFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("<!--", __off))) { state.off = __off; throw new SyntaxError("expected " + "<!--" + " at position " + __off); }
  __off += 4;
  let data = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && ((__c === 45 && __input.startsWith("-->", __off)))) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      data = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    data = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("-->", __off))) { state.off = __off; throw new SyntaxError("expected " + "-->" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "Comment#0", data: data };
}

function parseHtmlElementFast__valid__alt0(state: State): unknown {
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
  if (!(__tag_lc === "script" || __tag_lc === "style" || __tag_lc === "textarea" || __tag_lc === "title")) { state.off = __off; throw new SyntaxError("expected one of script, style, textarea, title at position " + __tag_s); }

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
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
  let children = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    children = __input.slice(__startOff, __earliest);
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
  const __closeTag_s = __off;
  let closeTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closeTag = __input.slice(__closeTag_s, __off);
  const __closeTag_lc = closeTag.toLowerCase();
  if (!(__closeTag_lc === "script" || __closeTag_lc === "style" || __closeTag_lc === "textarea" || __closeTag_lc === "title")) { state.off = __off; throw new SyntaxError("expected one of script, style, textarea, title at position " + __closeTag_s); }
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
  return { __production: "HtmlElement#0", tag: tag, attrs: attrs, children: children, closeTag: closeTag };
}

function parseHtmlElementFast__valid__alt1(state: State): unknown {
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
  if (!(__tag_lc === "area" || __tag_lc === "base" || __tag_lc === "br" || __tag_lc === "col" || __tag_lc === "embed" || __tag_lc === "hr" || __tag_lc === "img" || __tag_lc === "input" || __tag_lc === "link" || __tag_lc === "meta" || __tag_lc === "param" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "wbr")) { state.off = __off; throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + __tag_s); }

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
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
  return { __production: "HtmlElement#1", tag: tag, attrs: attrs };
}

function parseHtmlElementFast__valid__alt2(state: State): unknown {
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
  if (!(__tag_lc === "area" || __tag_lc === "base" || __tag_lc === "br" || __tag_lc === "col" || __tag_lc === "embed" || __tag_lc === "hr" || __tag_lc === "img" || __tag_lc === "input" || __tag_lc === "link" || __tag_lc === "meta" || __tag_lc === "param" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "wbr")) { state.off = __off; throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + __tag_s); }

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62)) { state.off = __off; throw new SyntaxError("expected " + "/>" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#2", tag: tag, attrs: attrs };
}

function parseHtmlElementFast__valid__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "li")) { state.off = __off; throw new SyntaxError("expected one of li at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</li>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</menu>", __off) || __input.startsWith("</li>", __off) || __input.startsWith("</ol>", __off) || __input.startsWith("</ul>", __off))) break;
      if (__c2 === 108 && (__input.startsWith("<li>", __off) || __input.startsWith("<li ", __off) || __input.startsWith("<li/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_28(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</li>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#4", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt4(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "dt" || __tag_lc === "dd")) { state.off = __off; throw new SyntaxError("expected one of dt, dd at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</dt>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</dt>", __off) || __input.startsWith("</dd>", __off) || __input.startsWith("</dl>", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<dt>", __off) || __input.startsWith("<dt ", __off) || __input.startsWith("<dt/", __off) || __input.startsWith("<dd>", __off) || __input.startsWith("<dd ", __off) || __input.startsWith("<dd/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_29(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dt>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dd>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#5", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt5(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "tr")) { state.off = __off; throw new SyntaxError("expected one of tr at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tr>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off) || __input.startsWith("<tr/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_30(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tr>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#6", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt6(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "td" || __tag_lc === "th")) { state.off = __off; throw new SyntaxError("expected one of td, th at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</td>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</td>", __off) || __input.startsWith("</th>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<td>", __off) || __input.startsWith("<td ", __off) || __input.startsWith("<td/", __off) || __input.startsWith("<th>", __off) || __input.startsWith("<th ", __off) || __input.startsWith("<th/", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_31(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</td>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</th>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#7", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt7(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "p")) { state.off = __off; throw new SyntaxError("expected one of p at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</p>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</p>", __off))) break;
      if (__c2 === 97 && (__input.startsWith("<article>", __off) || __input.startsWith("<article ", __off) || __input.startsWith("<address>", __off) || __input.startsWith("<address ", __off) || __input.startsWith("<aside>", __off) || __input.startsWith("<aside ", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<blockquote>", __off) || __input.startsWith("<blockquote ", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<div>", __off) || __input.startsWith("<div ", __off) || __input.startsWith("<dl>", __off) || __input.startsWith("<dl ", __off))) break;
      if (__c2 === 102 && (__input.startsWith("<footer>", __off) || __input.startsWith("<footer ", __off) || __input.startsWith("<form>", __off) || __input.startsWith("<form ", __off))) break;
      if (__c2 === 104 && (__input.startsWith("<header>", __off) || __input.startsWith("<header ", __off) || __input.startsWith("<h1>", __off) || __input.startsWith("<h1 ", __off) || __input.startsWith("<h2>", __off) || __input.startsWith("<h2 ", __off) || __input.startsWith("<h3>", __off) || __input.startsWith("<h3 ", __off) || __input.startsWith("<h4>", __off) || __input.startsWith("<h4 ", __off) || __input.startsWith("<h5>", __off) || __input.startsWith("<h5 ", __off) || __input.startsWith("<h6>", __off) || __input.startsWith("<h6 ", __off) || __input.startsWith("<hr>", __off) || __input.startsWith("<hr ", __off) || __input.startsWith("<hr/", __off))) break;
      if (__c2 === 110 && (__input.startsWith("<nav>", __off) || __input.startsWith("<nav ", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<ol>", __off) || __input.startsWith("<ol ", __off))) break;
      if (__c2 === 112 && (__input.startsWith("<pre>", __off) || __input.startsWith("<pre ", __off) || __input.startsWith("<p>", __off) || __input.startsWith("<p ", __off) || __input.startsWith("<p/", __off))) break;
      if (__c2 === 115 && (__input.startsWith("<section>", __off) || __input.startsWith("<section ", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<table>", __off) || __input.startsWith("<table ", __off))) break;
      if (__c2 === 117 && (__input.startsWith("<ul>", __off) || __input.startsWith("<ul ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_32(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</p>", __off)) { __off += 4; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#8", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt8(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "option" || __tag_lc === "optgroup")) { state.off = __off; throw new SyntaxError("expected one of option, optgroup at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</option>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</optgroup>", __off) || __input.startsWith("</datalist>", __off) || __input.startsWith("</option>", __off) || __input.startsWith("</select>", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<optgroup>", __off) || __input.startsWith("<optgroup ", __off) || __input.startsWith("<option>", __off) || __input.startsWith("<option ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_33(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</option>", __off)) { __off += 9; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</optgroup>", __off)) { __off += 11; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#9", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt9(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "html")) { state.off = __off; throw new SyntaxError("expected one of html at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</html>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</html>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_34(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</html>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#10", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt10(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "head")) { state.off = __off; throw new SyntaxError("expected one of head at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</head>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</head>", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<body>", __off) || __input.startsWith("<body ", __off) || __input.startsWith("<body/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_35(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</head>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#11", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt11(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "tbody")) { state.off = __off; throw new SyntaxError("expected one of tbody at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tbody>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_36(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tbody>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#12", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt12(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "thead")) { state.off = __off; throw new SyntaxError("expected one of thead at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</thead>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</thead>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_37(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</thead>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#13", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt13(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "tfoot")) { state.off = __off; throw new SyntaxError("expected one of tfoot at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tfoot>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_38(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tfoot>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#14", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt14(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "body")) { state.off = __off; throw new SyntaxError("expected one of body at position " + __tag_s); }
  __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</body>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</body>", __off) || __input.startsWith("</html>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_39(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</body>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#15", tag: tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt15(state: State): unknown {
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

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_40(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
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
  const __closeTag_s = __off;
  let closeTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closeTag = __input.slice(__closeTag_s, __off);
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
  return { __production: "HtmlElement#16", tag: tag, attrs: attrs, children: children, closeTag: closeTag };
}

function parseHtmlElementFast__valid(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
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
  if (!(isCssIdentStart(__input.charCodeAt(__peek)))) return parseHtmlElementFast__valid__alt15(state);
  {
    const __identStart = __peek;
    __peek++;
    while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
    const __tagOrig = __input.slice(__identStart, __peek);
    const __ident = __tagOrig.toLowerCase();
    if (__ident === "script") {
    state.off = __peek; return parseHtmlElementFast__valid__alt0__body(state, __tagOrig);
  }
    if (__ident === "style") {
    state.off = __peek; return parseHtmlElementFast__valid__alt0__body(state, __tagOrig);
  }
    if (__ident === "textarea") {
    state.off = __peek; return parseHtmlElementFast__valid__alt0__body(state, __tagOrig);
  }
    if (__ident === "title") {
    state.off = __peek; return parseHtmlElementFast__valid__alt0__body(state, __tagOrig);
  }
    if (__ident === "area") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "base") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "br") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "col") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "embed") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "hr") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "img") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "input") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "link") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "meta") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "param") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "source") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "track") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "wbr") {
    { const r = trySpeculate(state, parseHtmlElementFast__valid__alt1); if (r !== null) return r; }
    return parseHtmlElementFast__valid__alt2(state);
  }
    if (__ident === "li") {
    state.off = __peek; return parseHtmlElementFast__valid__alt3__body(state, __tagOrig);
  }
    if (__ident === "dt") {
    state.off = __peek; return parseHtmlElementFast__valid__alt4__body(state, __tagOrig);
  }
    if (__ident === "dd") {
    state.off = __peek; return parseHtmlElementFast__valid__alt4__body(state, __tagOrig);
  }
    if (__ident === "tr") {
    state.off = __peek; return parseHtmlElementFast__valid__alt5__body(state, __tagOrig);
  }
    if (__ident === "td") {
    state.off = __peek; return parseHtmlElementFast__valid__alt6__body(state, __tagOrig);
  }
    if (__ident === "th") {
    state.off = __peek; return parseHtmlElementFast__valid__alt6__body(state, __tagOrig);
  }
    if (__ident === "p") {
    state.off = __peek; return parseHtmlElementFast__valid__alt7__body(state, __tagOrig);
  }
    if (__ident === "option") {
    state.off = __peek; return parseHtmlElementFast__valid__alt8__body(state, __tagOrig);
  }
    if (__ident === "optgroup") {
    state.off = __peek; return parseHtmlElementFast__valid__alt8__body(state, __tagOrig);
  }
    if (__ident === "html") {
    state.off = __peek; return parseHtmlElementFast__valid__alt9__body(state, __tagOrig);
  }
    if (__ident === "head") {
    state.off = __peek; return parseHtmlElementFast__valid__alt10__body(state, __tagOrig);
  }
    if (__ident === "tbody") {
    state.off = __peek; return parseHtmlElementFast__valid__alt11__body(state, __tagOrig);
  }
    if (__ident === "thead") {
    state.off = __peek; return parseHtmlElementFast__valid__alt12__body(state, __tagOrig);
  }
    if (__ident === "tfoot") {
    state.off = __peek; return parseHtmlElementFast__valid__alt13__body(state, __tagOrig);
  }
    if (__ident === "body") {
    state.off = __peek; return parseHtmlElementFast__valid__alt14__body(state, __tagOrig);
  }
    state.off = __peek; return parseHtmlElementFast__valid__alt15__body(state, __tagOrig);
  }
}

function parseHtmlElementFast__recovery0(state: State): unknown {
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

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62)) { state.off = __off; throw new SyntaxError("expected " + "/>" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#3", tag: tag, attrs: attrs };
}

function parseHtmlElementFast(state: State): unknown {
  const __recoverStart = state.off;
  try {
    return parseHtmlElementFast__valid(state);
  } catch (__validErr) {
    state.off = __recoverStart;
    const __r0 = trySpeculate(state, parseHtmlElementFast__recovery0);
    if (__r0 !== null) return __r0;
    state.off = __recoverStart;
    throw __validErr;
  }
}

function parseTextNodeFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let value = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60) { __earliest = __i; break; }
    }
    __off = __earliest;
    value = __input.slice(__startOff, __earliest);
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "TextNode#0", value: value };
}

function parseAttributeFast__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 34)) { state.off = __off; throw new SyntaxError("expected " + "\"" + " at position " + __off); }
  __off += 1;
  let value = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 34)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      value = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    value = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 34)) { state.off = __off; throw new SyntaxError("expected " + "\"" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "Attribute#0", name: name, value: value };
}

function parseAttributeFast__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 39)) { state.off = __off; throw new SyntaxError("expected " + "'" + " at position " + __off); }
  __off += 1;
  let value = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 39)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      value = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    value = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 39)) { state.off = __off; throw new SyntaxError("expected " + "'" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "Attribute#1", name: name, value: value };
}

function parseAttributeFast__alt2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let value = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 32 || __c === 9 || __c === 10 || __c === 13 || __c === 12 || __c === 62) { __earliest = __i; break; }
      if (__c === 47 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 62))) { __earliest = __i; break; }
    }
    __off = __earliest;
    value = __input.slice(__startOff, __earliest);
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "Attribute#2", name: name, value: value };
}

function parseAttributeFast__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;
  let name;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  name = __input.slice(__name_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "Attribute#3", name: name };
}

function parseAttributeFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(__peek < __len && isCssIdentStart(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
    __peek++;
    while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
  // Skip ws before the discriminator.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
  if (__input.charCodeAt(__peek) === 61) {
    __peek = state.off;
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isCssIdentStart(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 61)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 34) {
      return parseAttributeFast__alt0(state);
    }
    if (__input.charCodeAt(__peek) === 39) {
      return parseAttributeFast__alt1(state);
    }
    return parseAttributeFast__alt2(state);
  }
  return parseAttributeFast__alt3(state);
}

function validateHtmlDocument(state: State): unknown {
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
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_41(state); __off = state.off;
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

function validateDoctype__valid(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33)) { state.off = __off; throw new SyntaxError("expected " + "<!" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __keyword_s = __off;
  let keyword;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __keyword_s);
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
        __off - __keyword_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__keyword_s) | 32) === 0x75
        && (__input.charCodeAt(__keyword_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__keyword_s + 2) | 32) === 0x6c
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
  keyword = __input.slice(__keyword_s, __off);
  const __keyword_lc = keyword.toLowerCase();
  if (!(__keyword_lc === "doctype")) { state.off = __off; throw new SyntaxError("expected one of DOCTYPE at position " + __keyword_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
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

function validateDoctype__recovery0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33)) { state.off = __off; throw new SyntaxError("expected " + "<!" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __keyword_s = __off;
  let keyword;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __keyword_s);
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
        __off - __keyword_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__keyword_s) | 32) === 0x75
        && (__input.charCodeAt(__keyword_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__keyword_s + 2) | 32) === 0x6c
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
  keyword = __input.slice(__keyword_s, __off);
  const __keyword_lc = keyword.toLowerCase();
  if (!(__keyword_lc === "doctype")) { state.off = __off; throw new SyntaxError("expected one of DOCTYPE at position " + __keyword_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateDoctype(state: State): unknown {
  const __recoverStart = state.off;
  try {
    return validateDoctype__valid(state);
  } catch (__validErr) {
    state.off = __recoverStart;
    const __r0 = trySpeculate(state, validateDoctype__recovery0);
    if (__r0 !== null) return __r0;
    state.off = __recoverStart;
    throw __validErr;
  }
}

function validateComment(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("<!--", __off))) { state.off = __off; throw new SyntaxError("expected " + "<!--" + " at position " + __off); }
  __off += 4;
  let data = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && ((__c === 45 && __input.startsWith("-->", __off)))) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      data = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    data = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.startsWith("-->", __off))) { state.off = __off; throw new SyntaxError("expected " + "-->" + " at position " + __off); }
  __off += 3;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt0(state: State): unknown {
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
  if (!(__tag_lc === "script" || __tag_lc === "style" || __tag_lc === "textarea" || __tag_lc === "title")) { state.off = __off; throw new SyntaxError("expected one of script, style, textarea, title at position " + __tag_s); }
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
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
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let children = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    children = __input.slice(__startOff, __earliest);
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
  const __closeTag_s = __off;
  let closeTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closeTag = __input.slice(__closeTag_s, __off);
  const __closeTag_lc = closeTag.toLowerCase();
  if (!(__closeTag_lc === "script" || __closeTag_lc === "style" || __closeTag_lc === "textarea" || __closeTag_lc === "title")) { state.off = __off; throw new SyntaxError("expected one of script, style, textarea, title at position " + __closeTag_s); }
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

function validateHtmlElement__valid__alt1(state: State): unknown {
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
  if (!(__tag_lc === "area" || __tag_lc === "base" || __tag_lc === "br" || __tag_lc === "col" || __tag_lc === "embed" || __tag_lc === "hr" || __tag_lc === "img" || __tag_lc === "input" || __tag_lc === "link" || __tag_lc === "meta" || __tag_lc === "param" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "wbr")) { state.off = __off; throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + __tag_s); }
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
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

function validateHtmlElement__valid__alt2(state: State): unknown {
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
  if (!(__tag_lc === "area" || __tag_lc === "base" || __tag_lc === "br" || __tag_lc === "col" || __tag_lc === "embed" || __tag_lc === "hr" || __tag_lc === "img" || __tag_lc === "input" || __tag_lc === "link" || __tag_lc === "meta" || __tag_lc === "param" || __tag_lc === "source" || __tag_lc === "track" || __tag_lc === "wbr")) { state.off = __off; throw new SyntaxError("expected one of area, base, br, col, embed, hr, img, input, link, meta, param, source, track, wbr at position " + __tag_s); }
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
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
  if (!(__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62)) { state.off = __off; throw new SyntaxError("expected " + "/>" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "li")) { state.off = __off; throw new SyntaxError("expected one of li at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</li>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</menu>", __off) || __input.startsWith("</li>", __off) || __input.startsWith("</ol>", __off) || __input.startsWith("</ul>", __off))) break;
      if (__c2 === 108 && (__input.startsWith("<li>", __off) || __input.startsWith("<li ", __off) || __input.startsWith("<li/", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_55(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</li>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt4(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "dt" || __tag_lc === "dd")) { state.off = __off; throw new SyntaxError("expected one of dt, dd at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</dt>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</dt>", __off) || __input.startsWith("</dd>", __off) || __input.startsWith("</dl>", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<dt>", __off) || __input.startsWith("<dt ", __off) || __input.startsWith("<dt/", __off) || __input.startsWith("<dd>", __off) || __input.startsWith("<dd ", __off) || __input.startsWith("<dd/", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_56(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dt>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dd>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt5(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "tr")) { state.off = __off; throw new SyntaxError("expected one of tr at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</tr>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off) || __input.startsWith("<tr/", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_57(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tr>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt6(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "td" || __tag_lc === "th")) { state.off = __off; throw new SyntaxError("expected one of td, th at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</td>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</td>", __off) || __input.startsWith("</th>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<td>", __off) || __input.startsWith("<td ", __off) || __input.startsWith("<td/", __off) || __input.startsWith("<th>", __off) || __input.startsWith("<th ", __off) || __input.startsWith("<th/", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_58(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</td>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</th>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt7(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "p")) { state.off = __off; throw new SyntaxError("expected one of p at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</p>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</p>", __off))) break;
      if (__c2 === 97 && (__input.startsWith("<article>", __off) || __input.startsWith("<article ", __off) || __input.startsWith("<address>", __off) || __input.startsWith("<address ", __off) || __input.startsWith("<aside>", __off) || __input.startsWith("<aside ", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<blockquote>", __off) || __input.startsWith("<blockquote ", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<div>", __off) || __input.startsWith("<div ", __off) || __input.startsWith("<dl>", __off) || __input.startsWith("<dl ", __off))) break;
      if (__c2 === 102 && (__input.startsWith("<footer>", __off) || __input.startsWith("<footer ", __off) || __input.startsWith("<form>", __off) || __input.startsWith("<form ", __off))) break;
      if (__c2 === 104 && (__input.startsWith("<header>", __off) || __input.startsWith("<header ", __off) || __input.startsWith("<h1>", __off) || __input.startsWith("<h1 ", __off) || __input.startsWith("<h2>", __off) || __input.startsWith("<h2 ", __off) || __input.startsWith("<h3>", __off) || __input.startsWith("<h3 ", __off) || __input.startsWith("<h4>", __off) || __input.startsWith("<h4 ", __off) || __input.startsWith("<h5>", __off) || __input.startsWith("<h5 ", __off) || __input.startsWith("<h6>", __off) || __input.startsWith("<h6 ", __off) || __input.startsWith("<hr>", __off) || __input.startsWith("<hr ", __off) || __input.startsWith("<hr/", __off))) break;
      if (__c2 === 110 && (__input.startsWith("<nav>", __off) || __input.startsWith("<nav ", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<ol>", __off) || __input.startsWith("<ol ", __off))) break;
      if (__c2 === 112 && (__input.startsWith("<pre>", __off) || __input.startsWith("<pre ", __off) || __input.startsWith("<p>", __off) || __input.startsWith("<p ", __off) || __input.startsWith("<p/", __off))) break;
      if (__c2 === 115 && (__input.startsWith("<section>", __off) || __input.startsWith("<section ", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<table>", __off) || __input.startsWith("<table ", __off))) break;
      if (__c2 === 117 && (__input.startsWith("<ul>", __off) || __input.startsWith("<ul ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_59(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</p>", __off)) { __off += 4; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt8(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "option" || __tag_lc === "optgroup")) { state.off = __off; throw new SyntaxError("expected one of option, optgroup at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</option>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</optgroup>", __off) || __input.startsWith("</datalist>", __off) || __input.startsWith("</option>", __off) || __input.startsWith("</select>", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<optgroup>", __off) || __input.startsWith("<optgroup ", __off) || __input.startsWith("<option>", __off) || __input.startsWith("<option ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_60(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</option>", __off)) { __off += 9; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</optgroup>", __off)) { __off += 11; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt9(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "html")) { state.off = __off; throw new SyntaxError("expected one of html at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</html>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</html>", __off))) break;
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_61(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</html>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt10(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "head")) { state.off = __off; throw new SyntaxError("expected one of head at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</head>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</head>", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<body>", __off) || __input.startsWith("<body ", __off) || __input.startsWith("<body/", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_62(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</head>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt11(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "tbody")) { state.off = __off; throw new SyntaxError("expected one of tbody at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</tbody>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_63(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tbody>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt12(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "thead")) { state.off = __off; throw new SyntaxError("expected one of thead at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</thead>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</thead>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_64(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</thead>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt13(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "tfoot")) { state.off = __off; throw new SyntaxError("expected one of tfoot at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</tfoot>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off))) break;
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_65(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tfoot>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt14(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
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
  if (!(__tag_lc === "body")) { state.off = __off; throw new SyntaxError("expected one of body at position " + __tag_s); }
  __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</body>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</body>", __off) || __input.startsWith("</html>", __off))) break;
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_66(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</body>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt15(state: State): unknown {
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

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __tag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
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
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  let __count_children = 0;
  while (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_67(state); __off = state.off;
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
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) { state.off = __off; throw new SyntaxError("expected " + "</" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __closeTag_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
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

function validateHtmlElement__valid(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
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
  if (!(isCssIdentStart(__input.charCodeAt(__peek)))) return validateHtmlElement__valid__alt15(state);
  {
    const __identStart = __peek;
    __peek++;
    while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
    const __tagOrig = __input.slice(__identStart, __peek);
    const __ident = __tagOrig.toLowerCase();
    if (__ident === "script") {
    state.off = __peek; return validateHtmlElement__valid__alt0__body(state, __tagOrig);
  }
    if (__ident === "style") {
    state.off = __peek; return validateHtmlElement__valid__alt0__body(state, __tagOrig);
  }
    if (__ident === "textarea") {
    state.off = __peek; return validateHtmlElement__valid__alt0__body(state, __tagOrig);
  }
    if (__ident === "title") {
    state.off = __peek; return validateHtmlElement__valid__alt0__body(state, __tagOrig);
  }
    if (__ident === "area") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "base") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "br") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "col") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "embed") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "hr") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "img") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "input") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "link") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "meta") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "param") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "source") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "track") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "wbr") {
    { const r = trySpeculate(state, validateHtmlElement__valid__alt1); if (r !== null) return r; }
    return validateHtmlElement__valid__alt2(state);
  }
    if (__ident === "li") {
    state.off = __peek; return validateHtmlElement__valid__alt3__body(state, __tagOrig);
  }
    if (__ident === "dt") {
    state.off = __peek; return validateHtmlElement__valid__alt4__body(state, __tagOrig);
  }
    if (__ident === "dd") {
    state.off = __peek; return validateHtmlElement__valid__alt4__body(state, __tagOrig);
  }
    if (__ident === "tr") {
    state.off = __peek; return validateHtmlElement__valid__alt5__body(state, __tagOrig);
  }
    if (__ident === "td") {
    state.off = __peek; return validateHtmlElement__valid__alt6__body(state, __tagOrig);
  }
    if (__ident === "th") {
    state.off = __peek; return validateHtmlElement__valid__alt6__body(state, __tagOrig);
  }
    if (__ident === "p") {
    state.off = __peek; return validateHtmlElement__valid__alt7__body(state, __tagOrig);
  }
    if (__ident === "option") {
    state.off = __peek; return validateHtmlElement__valid__alt8__body(state, __tagOrig);
  }
    if (__ident === "optgroup") {
    state.off = __peek; return validateHtmlElement__valid__alt8__body(state, __tagOrig);
  }
    if (__ident === "html") {
    state.off = __peek; return validateHtmlElement__valid__alt9__body(state, __tagOrig);
  }
    if (__ident === "head") {
    state.off = __peek; return validateHtmlElement__valid__alt10__body(state, __tagOrig);
  }
    if (__ident === "tbody") {
    state.off = __peek; return validateHtmlElement__valid__alt11__body(state, __tagOrig);
  }
    if (__ident === "thead") {
    state.off = __peek; return validateHtmlElement__valid__alt12__body(state, __tagOrig);
  }
    if (__ident === "tfoot") {
    state.off = __peek; return validateHtmlElement__valid__alt13__body(state, __tagOrig);
  }
    if (__ident === "body") {
    state.off = __peek; return validateHtmlElement__valid__alt14__body(state, __tagOrig);
  }
    state.off = __peek; return validateHtmlElement__valid__alt15__body(state, __tagOrig);
  }
}

function validateHtmlElement__recovery0(state: State): unknown {
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

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __tag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
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
  if (!(__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 62)) { state.off = __off; throw new SyntaxError("expected " + "/>" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement(state: State): unknown {
  const __recoverStart = state.off;
  try {
    return validateHtmlElement__valid(state);
  } catch (__validErr) {
    state.off = __recoverStart;
    const __r0 = trySpeculate(state, validateHtmlElement__recovery0);
    if (__r0 !== null) return __r0;
    state.off = __recoverStart;
    throw __validErr;
  }
}

function validateTextNode(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let value = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60) { __earliest = __i; break; }
    }
    __off = __earliest;
    value = __input.slice(__startOff, __earliest);
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateAttribute__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 34)) { state.off = __off; throw new SyntaxError("expected " + "\"" + " at position " + __off); }
  __off += 1;
  let value = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 34)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      value = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    value = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 34)) { state.off = __off; throw new SyntaxError("expected " + "\"" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateAttribute__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 39)) { state.off = __off; throw new SyntaxError("expected " + "'" + " at position " + __off); }
  __off += 1;
  let value = '';
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
    let __lastNonWs = __off;
    let __depth = 0;
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 39)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __preWsOff;
      __off = __emptyAnchor;
      value = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    value = __input.slice(__startOff, __lastNonWs);
    }
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 39)) { state.off = __off; throw new SyntaxError("expected " + "'" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateAttribute__alt2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 61)) { state.off = __off; throw new SyntaxError("expected " + "=" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let value = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 32 || __c === 9 || __c === 10 || __c === 13 || __c === 12 || __c === 62) { __earliest = __i; break; }
      if (__c === 47 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 62))) { __earliest = __i; break; }
    }
    __off = __earliest;
    value = __input.slice(__startOff, __earliest);
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateAttribute__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __name_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __name_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;

  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateAttribute(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __peek = state.off;
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (!(__peek < __len && isCssIdentStart(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
    __peek++;
    while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
  // Skip ws before the discriminator.
  while (__peek < __len) {
    const __c = __input.charCodeAt(__peek);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
    break;
  }
  if (__input.charCodeAt(__peek) === 61) {
    __peek = state.off;
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isCssIdentStart(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isCssIdentPart(__input.charCodeAt(__peek))) __peek++;
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__input.charCodeAt(__peek) === 61)) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek += 1;
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 34) {
      return validateAttribute__alt0(state);
    }
    if (__input.charCodeAt(__peek) === 39) {
      return validateAttribute__alt1(state);
    }
    return validateAttribute__alt2(state);
  }
  return validateAttribute__alt3(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_4(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_5(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_6(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_7(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_8(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_9(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_10(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_11(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_12(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_raws_Doctype_Comment_HtmlElement_TextNode_13(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElement(state);
  return parseTextNode(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_14(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_15(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_16(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_17(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_18(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_19(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_20(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_21(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_22(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_23(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_24(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_25(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_26(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_27(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function parseHtmlElementFast__valid__alt0__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
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
  let children = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    children = __input.slice(__startOff, __earliest);
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
  const __closeTag_s = __off;
  let closeTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closeTag = __input.slice(__closeTag_s, __off);
  const __closeTag_lc = closeTag.toLowerCase();
  if (!(__closeTag_lc === "script" || __closeTag_lc === "style" || __closeTag_lc === "textarea" || __closeTag_lc === "title")) { state.off = __off; throw new SyntaxError("expected one of script, style, textarea, title at position " + __closeTag_s); }
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
  return { __production: "HtmlElement#0", tag: __pre_tag, attrs: attrs, children: children, closeTag: closeTag };
}

function parseHtmlElementFast__valid__alt3__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</li>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</menu>", __off) || __input.startsWith("</li>", __off) || __input.startsWith("</ol>", __off) || __input.startsWith("</ul>", __off))) break;
      if (__c2 === 108 && (__input.startsWith("<li>", __off) || __input.startsWith("<li ", __off) || __input.startsWith("<li/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_15(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</li>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#4", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt4__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</dt>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</dt>", __off) || __input.startsWith("</dd>", __off) || __input.startsWith("</dl>", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<dt>", __off) || __input.startsWith("<dt ", __off) || __input.startsWith("<dt/", __off) || __input.startsWith("<dd>", __off) || __input.startsWith("<dd ", __off) || __input.startsWith("<dd/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_16(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dt>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dd>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#5", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt5__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tr>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off) || __input.startsWith("<tr/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_17(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tr>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#6", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt6__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</td>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</td>", __off) || __input.startsWith("</th>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<td>", __off) || __input.startsWith("<td ", __off) || __input.startsWith("<td/", __off) || __input.startsWith("<th>", __off) || __input.startsWith("<th ", __off) || __input.startsWith("<th/", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_18(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</td>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</th>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#7", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt7__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</p>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</p>", __off))) break;
      if (__c2 === 97 && (__input.startsWith("<article>", __off) || __input.startsWith("<article ", __off) || __input.startsWith("<address>", __off) || __input.startsWith("<address ", __off) || __input.startsWith("<aside>", __off) || __input.startsWith("<aside ", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<blockquote>", __off) || __input.startsWith("<blockquote ", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<div>", __off) || __input.startsWith("<div ", __off) || __input.startsWith("<dl>", __off) || __input.startsWith("<dl ", __off))) break;
      if (__c2 === 102 && (__input.startsWith("<footer>", __off) || __input.startsWith("<footer ", __off) || __input.startsWith("<form>", __off) || __input.startsWith("<form ", __off))) break;
      if (__c2 === 104 && (__input.startsWith("<header>", __off) || __input.startsWith("<header ", __off) || __input.startsWith("<h1>", __off) || __input.startsWith("<h1 ", __off) || __input.startsWith("<h2>", __off) || __input.startsWith("<h2 ", __off) || __input.startsWith("<h3>", __off) || __input.startsWith("<h3 ", __off) || __input.startsWith("<h4>", __off) || __input.startsWith("<h4 ", __off) || __input.startsWith("<h5>", __off) || __input.startsWith("<h5 ", __off) || __input.startsWith("<h6>", __off) || __input.startsWith("<h6 ", __off) || __input.startsWith("<hr>", __off) || __input.startsWith("<hr ", __off) || __input.startsWith("<hr/", __off))) break;
      if (__c2 === 110 && (__input.startsWith("<nav>", __off) || __input.startsWith("<nav ", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<ol>", __off) || __input.startsWith("<ol ", __off))) break;
      if (__c2 === 112 && (__input.startsWith("<pre>", __off) || __input.startsWith("<pre ", __off) || __input.startsWith("<p>", __off) || __input.startsWith("<p ", __off) || __input.startsWith("<p/", __off))) break;
      if (__c2 === 115 && (__input.startsWith("<section>", __off) || __input.startsWith("<section ", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<table>", __off) || __input.startsWith("<table ", __off))) break;
      if (__c2 === 117 && (__input.startsWith("<ul>", __off) || __input.startsWith("<ul ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_19(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</p>", __off)) { __off += 4; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#8", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt8__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</option>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</optgroup>", __off) || __input.startsWith("</datalist>", __off) || __input.startsWith("</option>", __off) || __input.startsWith("</select>", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<optgroup>", __off) || __input.startsWith("<optgroup ", __off) || __input.startsWith("<option>", __off) || __input.startsWith("<option ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_20(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</option>", __off)) { __off += 9; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</optgroup>", __off)) { __off += 11; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#9", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt9__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</html>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</html>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_21(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</html>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#10", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt10__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</head>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</head>", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<body>", __off) || __input.startsWith("<body ", __off) || __input.startsWith("<body/", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_22(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</head>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#11", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt11__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tbody>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_23(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tbody>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#12", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt12__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</thead>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</thead>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_24(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</thead>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#13", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt13__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</tfoot>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_25(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tfoot>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#14", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt14__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.startsWith("</body>", __off)) {  break; }
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</body>", __off) || __input.startsWith("</html>", __off))) break;
    }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_26(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</body>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "HtmlElement#15", tag: __pre_tag, attrs: attrs, children: children };
}

function parseHtmlElementFast__valid__alt15__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;

  const attrs: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 62) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseAttributeFast(state); __off = state.off;
    attrs.push(__child);
    if (__off === __before) break;
  }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;

  const children: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_27(state); __off = state.off;
    children.push(__child);
    if (__off === __before) break;
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
  const __closeTag_s = __off;
  let closeTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closeTag = __input.slice(__closeTag_s, __off);
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
  return { __production: "HtmlElement#16", tag: __pre_tag, attrs: attrs, children: children, closeTag: closeTag };
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_28(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_29(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_30(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_31(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_32(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_33(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_34(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_35(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_36(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_37(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_38(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_39(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_fast_Doctype_Comment_HtmlElement_TextNode_40(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return parseDoctypeFast(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return parseHtmlElementFast(state);
  return parseTextNodeFast(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_41(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_42(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_43(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_44(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_45(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_46(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_47(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_48(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_49(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_50(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_51(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_52(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_53(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_54(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function validateHtmlElement__valid__alt0__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
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
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let children = '';
  {
    const __startOff = __off;
    let __earliest = __len;
    for (let __i = __startOff; __i < __len; __i++) {
      const __c = __input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < __len && __input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    __off = __earliest;
    children = __input.slice(__startOff, __earliest);
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
  const __closeTag_s = __off;
  let closeTag;
  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
    __off++;
    while (__off < __len && isCssIdentPart(__input.charCodeAt(__off))) __off++;
  closeTag = __input.slice(__closeTag_s, __off);
  const __closeTag_lc = closeTag.toLowerCase();
  if (!(__closeTag_lc === "script" || __closeTag_lc === "style" || __closeTag_lc === "textarea" || __closeTag_lc === "title")) { state.off = __off; throw new SyntaxError("expected one of script, style, textarea, title at position " + __closeTag_s); }
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

function validateHtmlElement__valid__alt3__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</li>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</menu>", __off) || __input.startsWith("</li>", __off) || __input.startsWith("</ol>", __off) || __input.startsWith("</ul>", __off))) break;
      if (__c2 === 108 && (__input.startsWith("<li>", __off) || __input.startsWith("<li ", __off) || __input.startsWith("<li/", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_42(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</li>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt4__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</dt>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</dt>", __off) || __input.startsWith("</dd>", __off) || __input.startsWith("</dl>", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<dt>", __off) || __input.startsWith("<dt ", __off) || __input.startsWith("<dt/", __off) || __input.startsWith("<dd>", __off) || __input.startsWith("<dd ", __off) || __input.startsWith("<dd/", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_43(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dt>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</dd>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt5__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</tr>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off) || __input.startsWith("<tr/", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_44(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tr>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt6__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</td>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</thead>", __off) || __input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off) || __input.startsWith("</td>", __off) || __input.startsWith("</th>", __off) || __input.startsWith("</tr>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<thead>", __off) || __input.startsWith("<thead ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off) || __input.startsWith("<td>", __off) || __input.startsWith("<td ", __off) || __input.startsWith("<td/", __off) || __input.startsWith("<th>", __off) || __input.startsWith("<th ", __off) || __input.startsWith("<th/", __off) || __input.startsWith("<tr>", __off) || __input.startsWith("<tr ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_45(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</td>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</th>", __off)) { __off += 5; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt7__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</p>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</p>", __off))) break;
      if (__c2 === 97 && (__input.startsWith("<article>", __off) || __input.startsWith("<article ", __off) || __input.startsWith("<address>", __off) || __input.startsWith("<address ", __off) || __input.startsWith("<aside>", __off) || __input.startsWith("<aside ", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<blockquote>", __off) || __input.startsWith("<blockquote ", __off))) break;
      if (__c2 === 100 && (__input.startsWith("<div>", __off) || __input.startsWith("<div ", __off) || __input.startsWith("<dl>", __off) || __input.startsWith("<dl ", __off))) break;
      if (__c2 === 102 && (__input.startsWith("<footer>", __off) || __input.startsWith("<footer ", __off) || __input.startsWith("<form>", __off) || __input.startsWith("<form ", __off))) break;
      if (__c2 === 104 && (__input.startsWith("<header>", __off) || __input.startsWith("<header ", __off) || __input.startsWith("<h1>", __off) || __input.startsWith("<h1 ", __off) || __input.startsWith("<h2>", __off) || __input.startsWith("<h2 ", __off) || __input.startsWith("<h3>", __off) || __input.startsWith("<h3 ", __off) || __input.startsWith("<h4>", __off) || __input.startsWith("<h4 ", __off) || __input.startsWith("<h5>", __off) || __input.startsWith("<h5 ", __off) || __input.startsWith("<h6>", __off) || __input.startsWith("<h6 ", __off) || __input.startsWith("<hr>", __off) || __input.startsWith("<hr ", __off) || __input.startsWith("<hr/", __off))) break;
      if (__c2 === 110 && (__input.startsWith("<nav>", __off) || __input.startsWith("<nav ", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<ol>", __off) || __input.startsWith("<ol ", __off))) break;
      if (__c2 === 112 && (__input.startsWith("<pre>", __off) || __input.startsWith("<pre ", __off) || __input.startsWith("<p>", __off) || __input.startsWith("<p ", __off) || __input.startsWith("<p/", __off))) break;
      if (__c2 === 115 && (__input.startsWith("<section>", __off) || __input.startsWith("<section ", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<table>", __off) || __input.startsWith("<table ", __off))) break;
      if (__c2 === 117 && (__input.startsWith("<ul>", __off) || __input.startsWith("<ul ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_46(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</p>", __off)) { __off += 4; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt8__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</option>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</optgroup>", __off) || __input.startsWith("</datalist>", __off) || __input.startsWith("</option>", __off) || __input.startsWith("</select>", __off))) break;
      if (__c2 === 111 && (__input.startsWith("<optgroup>", __off) || __input.startsWith("<optgroup ", __off) || __input.startsWith("<option>", __off) || __input.startsWith("<option ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_47(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</option>", __off)) { __off += 9; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __beforeSpan6 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</optgroup>", __off)) { __off += 11; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan6) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt9__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</html>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</html>", __off))) break;
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_48(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</html>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt10__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</head>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</head>", __off))) break;
      if (__c2 === 98 && (__input.startsWith("<body>", __off) || __input.startsWith("<body ", __off) || __input.startsWith("<body/", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_49(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</head>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt11__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</tbody>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</tbody>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_50(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tbody>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt12__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</thead>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60) {
      const __c2 = __input.charCodeAt(__off + 1);
      if (__c2 === 47 && (__input.startsWith("</thead>", __off) || __input.startsWith("</table>", __off))) break;
      if (__c2 === 116 && (__input.startsWith("<tbody>", __off) || __input.startsWith("<tbody ", __off) || __input.startsWith("<tfoot>", __off) || __input.startsWith("<tfoot ", __off))) break;
    }
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_51(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</thead>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt13__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</tfoot>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</tfoot>", __off) || __input.startsWith("</table>", __off))) break;
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_52(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</tfoot>", __off)) { __off += 8; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt14__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __consumedEnd = __off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let __count_children = 0;
  while (!(__input.startsWith("</body>", __off))) {
    {
      const __c = __input.charCodeAt(__off);
      if (__c === 60 && (__input.startsWith("</body>", __off) || __input.startsWith("</html>", __off))) break;
    }
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_53(state); __off = state.off;
    __count_children++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (__input.startsWith("</body>", __off)) { __off += 7; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateHtmlElement__valid__alt15__body(state: State, __pre_tag: string): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  let __count_attrs = 0;
  while (!(__input.charCodeAt(__off) === 62)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateAttribute(state); __off = state.off;
    __count_attrs++;
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
  if (!(__input.charCodeAt(__off) === 62)) { state.off = __off; throw new SyntaxError("expected " + ">" + " at position " + __off); }
  __off += 1;
  let __count_children = 0;
  while (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_54(state); __off = state.off;
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
  if (!(__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 47)) { state.off = __off; throw new SyntaxError("expected " + "</" + " at position " + __off); }
  __off += 2;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __closeTag_s = __off;

  if (!(isCssIdentStart(__input.charCodeAt(__off)))) throw new SyntaxError("expected ident at position " + __closeTag_s);
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

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_55(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_56(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_57(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_58(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_59(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_60(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_61(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_62(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_63(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_64(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_65(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_66(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
}

function __roleDispatch_validate_Doctype_Comment_HtmlElement_TextNode_67(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  // Skip ws to first non-ws byte for dispatch.
  let __off = state.off;
  while (__off < __len) {
    const __c = __input.charCodeAt(__off);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  if (__input.startsWith("<!--", __off)) return validateComment(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) === 33) return validateDoctype(state);
  if (__input.charCodeAt(__off) === 60 && __input.charCodeAt(__off + 1) !== 47) return validateHtmlElement(state);
  return validateTextNode(state);
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
    const result = mode === 'raws' ? parseHtmlDocument(state) : parseHtmlDocumentFast(state);
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
    __parse(input, options);
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
    validateHtmlDocument(state);
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
  module: "@parser2/html",
  exportName: 'validate',
};

