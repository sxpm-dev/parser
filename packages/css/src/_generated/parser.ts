// Auto-generated from packages/css/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
/* eslint-disable */
// @ts-nocheck

import { validate as __propertyValidator0 } from "@parser2/css-color";
import { validate as __propertyValidator1 } from "@parser2/css-length-percentage";



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
  const __text_s = __off;
  let text;
  if (!((__input.charCodeAt(__off) === 0x2f && __input.charCodeAt(__off + 1) === 0x2a))) throw new SyntaxError("expected comment at position " + __text_s);
    __off += 2;
    while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
    if (__off < __len) __off += 2;
  text = __input.slice(__text_s, __off);
  const text__interior = commentInterior(text);
  const __text_start = __text_s;
  const __text_end = __off;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "comment", text: text__interior, raws: { left: commentLeft(state.input.slice(__text_start, __text_end)), right: commentRight(state.input.slice(__text_start, __text_end)) } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseDeclaration__alt0(state: State): unknown {
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
  let prop = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      prop = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      prop = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      prop = __buf;
    }
    }
  }
  const __prop_start = state.__lastCaptureStart;
  const __prop_end = state.__lastCaptureEnd;
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let value = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 125 || __c === 33)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    if (__comments.length === 0) {
      value = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      value = __buf;
    }
    }
  }
  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  const __important_s = __off;
  let important;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __important_s);
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
        __off - __important_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__important_s) | 32) === 0x75
        && (__input.charCodeAt(__important_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__important_s + 2) | 32) === 0x6c
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
  important = __input.slice(__important_s, __off);
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (__input.charCodeAt(__off) === 59) { __off += 1; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "decl", prop: prop, value: value, important: true, raws: { between: state.input.slice(__prop_end, __value_start) } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseDeclaration__alt1(state: State): unknown {
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
  let prop = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      prop = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      prop = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      prop = __buf;
    }
    }
  }
  const __prop_start = state.__lastCaptureStart;
  const __prop_end = state.__lastCaptureEnd;
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let value = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    if (__comments.length === 0) {
      value = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      value = __buf;
    }
    }
  }
  const __value_start = state.__lastCaptureStart;
  const __value_end = state.__lastCaptureEnd;
  __consumedEnd = state.__lastCaptureEnd;
  const __beforeSpan3 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (__input.charCodeAt(__off) === 59) { __off += 1; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan3) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "decl", prop: prop, value: value, raws: { between: state.input.slice(__prop_end, __value_start) } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseDeclaration(state: State): unknown {
  { const r = trySpeculate(state, parseDeclaration__alt0); if (r !== null) return r; }
  return parseDeclaration__alt1(state);
}

function parseRule(state: State): unknown {
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
  let selector = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 123 || __c === 59)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      selector = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      selector = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      selector = __buf;
    }
    }
  }
  if (selector.endsWith(":")) { state.off = __off; throw new SyntaxError("captured value ends with rejected suffix ':'"); }
  const __selector_start = state.__lastCaptureStart;
  const __selector_end = state.__lastCaptureEnd;
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 123)) { state.off = __off; throw new SyntaxError("expected " + "{" + " at position " + __off); }
  __off += 1;
  const lbrace = "{";
  const __lbrace_start = __off - 1;
  const __lbrace_end = __off;
  __consumedEnd = __off;
  const __nodes_startOff = __off;
  let __prevEnd_nodes = __nodes_startOff;
  const nodes: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__input.charCodeAt(__off) === 125) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Comment_AtRule_Rule_Declaration_0(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_nodes);
    nodes.push(__child);
    if (__off === __before) break;
    __prevEnd_nodes = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_nodes;
  }
  __consumedEnd = __prevEnd_nodes;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 125)) { state.off = __off; throw new SyntaxError("expected " + "}" + " at position " + __off); }
  __off += 1;
  const rbrace = "}";
  const __rbrace_start = __off - 1;
  const __rbrace_end = __off;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "rule", selector: selector, nodes: nodes, raws: { between: state.input.slice(__selector_end, __lbrace_start), after: state.input.slice(__prevEnd_nodes, __rbrace_start), semicolon: (state.input.slice(__prevEnd_nodes - 1, __prevEnd_nodes) === ";") } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAtRule__alt0(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 64)) { state.off = __off; throw new SyntaxError("expected " + "@" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
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
  const __name_start = __name_s;
  const __name_end = __off;
  __consumedEnd = __off;
  let params = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 123)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      params = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      params = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      params = __buf;
    }
    }
  }
  const __params_start = state.__lastCaptureStart;
  const __params_end = state.__lastCaptureEnd;
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 123)) { state.off = __off; throw new SyntaxError("expected " + "{" + " at position " + __off); }
  __off += 1;
  const lbrace = "{";
  const __lbrace_start = __off - 1;
  const __lbrace_end = __off;
  __consumedEnd = __off;
  const __nodes_startOff = __off;
  let __prevEnd_nodes = __nodes_startOff;
  const nodes: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__input.charCodeAt(__off) === 125) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Comment_AtRule_Rule_Declaration_1(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_nodes);
    nodes.push(__child);
    if (__off === __before) break;
    __prevEnd_nodes = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_nodes;
  }
  __consumedEnd = __prevEnd_nodes;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 125)) { state.off = __off; throw new SyntaxError("expected " + "}" + " at position " + __off); }
  __off += 1;
  const rbrace = "}";
  const __rbrace_start = __off - 1;
  const __rbrace_end = __off;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "atrule", name: name, params: params, nodes: nodes, raws: { afterName: state.input.slice(__name_end, __params_start), between: state.input.slice(__params_end, __lbrace_start), after: state.input.slice(__prevEnd_nodes, __rbrace_start), semicolon: (state.input.slice(__prevEnd_nodes - 1, __prevEnd_nodes) === ";") } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAtRule__alt1(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 64)) { state.off = __off; throw new SyntaxError("expected " + "@" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
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
  const __name_start = __name_s;
  const __name_end = __off;
  __consumedEnd = __off;
  let params = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 123 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      params = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      params = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      params = __buf;
    }
    }
  }
  const __params_start = state.__lastCaptureStart;
  const __params_end = state.__lastCaptureEnd;
  __consumedEnd = state.__lastCaptureEnd;
  const __beforeSpan3 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  let semi: string | null = null;
  if (__input.charCodeAt(__off) === 59) {
    __off += 1;
    semi = ";";
  } else {
    __off = __consumedEnd;
  }
  const __semi_start = semi !== null ? __off - 1 : __consumedEnd;
  const __semi_end = semi !== null ? __off : __consumedEnd;
  if (__off > __beforeSpan3) __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "atrule", name: name, params: params, raws: { afterName: state.input.slice(__name_end, __params_start), between: state.input.slice(__params_end, __semi_start) } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
}

function parseAtRule(state: State): unknown {
  { const r = trySpeculate(state, parseAtRule__alt0); if (r !== null) return r; }
  return parseAtRule__alt1(state);
}

function parseStylesheet(state: State): unknown {
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
  const __nodes_startOff = __off;
  let __prevEnd_nodes = __nodes_startOff;
  const nodes: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__off >= __len) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_raws_Comment_AtRule_Rule_Declaration_2(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_nodes);
    nodes.push(__child);
    if (__off === __before) break;
    __prevEnd_nodes = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_nodes;
  }
  __consumedEnd = __prevEnd_nodes;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __struct: Record<string, unknown> = { type: "root", nodes: nodes, raws: { after: state.input.slice(__prevEnd_nodes, __endOff), semicolon: (state.input.slice(__prevEnd_nodes - 1, __prevEnd_nodes) === ";") } };
  __struct.source = makeSource(state, __startOff, __endOff);
  return __struct;
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
  let __consumedEnd = __off;
  const __text_s = __off;
  let text;
  if (!((__input.charCodeAt(__off) === 0x2f && __input.charCodeAt(__off + 1) === 0x2a))) throw new SyntaxError("expected comment at position " + __text_s);
    __off += 2;
    while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
    if (__off < __len) __off += 2;
  text = __input.slice(__text_s, __off);
  const text__interior = commentInterior(text);
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "comment", text: text__interior };
}

function parseDeclarationFast__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  let prop = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      prop = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      prop = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      prop = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let value = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 125 || __c === 33)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    if (__comments.length === 0) {
      value = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      value = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  const __important_s = __off;
  let important;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __important_s);
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
        __off - __important_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__important_s) | 32) === 0x75
        && (__input.charCodeAt(__important_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__important_s + 2) | 32) === 0x6c
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
  important = __input.slice(__important_s, __off);
  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (__input.charCodeAt(__off) === 59) { __off += 1; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "decl", prop: prop, value: value, important: true };
}

function parseDeclarationFast__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  let prop = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      prop = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      prop = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      prop = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let value = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    if (__comments.length === 0) {
      value = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      value = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __beforeSpan3 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (__input.charCodeAt(__off) === 59) { __off += 1; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan3) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "decl", prop: prop, value: value };
}

function parseDeclarationFast(state: State): unknown {
  { const r = trySpeculate(state, parseDeclarationFast__alt0); if (r !== null) return r; }
  return parseDeclarationFast__alt1(state);
}

function parseRuleFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  let selector = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 123 || __c === 59)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      selector = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      selector = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      selector = __buf;
    }
    }
  }
  if (selector.endsWith(":")) { state.off = __off; throw new SyntaxError("captured value ends with rejected suffix ':'"); }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 123)) { state.off = __off; throw new SyntaxError("expected " + "{" + " at position " + __off); }
  __off += 1;
  const lbrace = "{";
  __consumedEnd = __off;

  const nodes: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__input.charCodeAt(__off) === 125) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Comment_AtRule_Rule_Declaration_3(state); __off = state.off;
    nodes.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 125)) { state.off = __off; throw new SyntaxError("expected " + "}" + " at position " + __off); }
  __off += 1;
  const rbrace = "}";
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "rule", selector: selector, nodes: nodes };
}

function parseAtRuleFast__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  if (!(__input.charCodeAt(__off) === 64)) { state.off = __off; throw new SyntaxError("expected " + "@" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
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
  let params = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 123)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      params = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      params = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      params = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 123)) { state.off = __off; throw new SyntaxError("expected " + "{" + " at position " + __off); }
  __off += 1;
  const lbrace = "{";
  __consumedEnd = __off;

  const nodes: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__input.charCodeAt(__off) === 125) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Comment_AtRule_Rule_Declaration_4(state); __off = state.off;
    nodes.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 125)) { state.off = __off; throw new SyntaxError("expected " + "}" + " at position " + __off); }
  __off += 1;
  const rbrace = "}";
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "atrule", name: name, params: params, nodes: nodes };
}

function parseAtRuleFast__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  if (!(__input.charCodeAt(__off) === 64)) { state.off = __off; throw new SyntaxError("expected " + "@" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
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
  let params = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 123 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      params = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      params = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      params = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __beforeSpan3 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  let semi: string | null = null;
  if (__input.charCodeAt(__off) === 59) {
    __off += 1;
    semi = ";";
  } else {
    __off = __consumedEnd;
  }
  if (__off > __beforeSpan3) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "atrule", name: name, params: params };
}

function parseAtRuleFast(state: State): unknown {
  { const r = trySpeculate(state, parseAtRuleFast__alt0); if (r !== null) return r; }
  return parseAtRuleFast__alt1(state);
}

function parseStylesheetFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;

  const nodes: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__off >= __len) {  break; }
    const __before = __off;
    state.off = __off; const __child = __roleDispatch_fast_Comment_AtRule_Rule_Declaration_5(state); __off = state.off;
    nodes.push(__child);
    if (__off === __before) break;
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { type: "root", nodes: nodes };
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
  let __consumedEnd = __off;
  const __text_s = __off;

  if (!((__input.charCodeAt(__off) === 0x2f && __input.charCodeAt(__off + 1) === 0x2a))) throw new SyntaxError("expected comment at position " + __text_s);
    __off += 2;
    while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
    if (__off < __len) __off += 2;

  const text__interior = commentInterior(text);
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateDeclaration__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  let prop = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      prop = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      prop = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      prop = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let value = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 125 || __c === 33)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    if (__comments.length === 0) {
      value = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      value = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 33)) { state.off = __off; throw new SyntaxError("expected " + "!" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  const __important_s = __off;

  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __important_s);
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
        __off - __important_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__important_s) | 32) === 0x75
        && (__input.charCodeAt(__important_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__important_s + 2) | 32) === 0x6c
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

  __consumedEnd = __off;
  const __beforeSpan5 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (__input.charCodeAt(__off) === 59) { __off += 1; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan5) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateDeclaration__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  let prop = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 58 || __c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      prop = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      prop = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      prop = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 58)) { state.off = __off; throw new SyntaxError("expected " + ":" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let value = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
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
    if (__comments.length === 0) {
      value = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      value = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __beforeSpan3 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (__input.charCodeAt(__off) === 59) { __off += 1; } else { __off = __consumedEnd; }
  if (__off > __beforeSpan3) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateDeclaration(state: State): unknown {
  { const r = trySpeculate(state, validateDeclaration__alt0); if (r !== null) return r; }
  return validateDeclaration__alt1(state);
}

function validateRule(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  let selector = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 123 || __c === 59)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      selector = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      selector = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      selector = __buf;
    }
    }
  }
  if (selector.endsWith(":")) { state.off = __off; throw new SyntaxError("captured value ends with rejected suffix ':'"); }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 123)) { state.off = __off; throw new SyntaxError("expected " + "{" + " at position " + __off); }
  __off += 1;
  const lbrace = "{";
  __consumedEnd = __off;
  let __count_nodes = 0;
  while (!(__input.charCodeAt(__off) === 125)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__input.charCodeAt(__off) === 125) break;
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Comment_AtRule_Rule_Declaration_6(state); __off = state.off;
    __count_nodes++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 125)) { state.off = __off; throw new SyntaxError("expected " + "}" + " at position " + __off); }
  __off += 1;
  const rbrace = "}";
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateAtRule__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  if (!(__input.charCodeAt(__off) === 64)) { state.off = __off; throw new SyntaxError("expected " + "@" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
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

  __consumedEnd = __off;
  let params = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 123)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      params = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      params = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      params = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 123)) { state.off = __off; throw new SyntaxError("expected " + "{" + " at position " + __off); }
  __off += 1;
  const lbrace = "{";
  __consumedEnd = __off;
  let __count_nodes = 0;
  while (!(__input.charCodeAt(__off) === 125)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__input.charCodeAt(__off) === 125) break;
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Comment_AtRule_Rule_Declaration_7(state); __off = state.off;
    __count_nodes++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  if (!(__input.charCodeAt(__off) === 125)) { state.off = __off; throw new SyntaxError("expected " + "}" + " at position " + __off); }
  __off += 1;
  const rbrace = "}";
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateAtRule__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  if (!(__input.charCodeAt(__off) === 64)) { state.off = __off; throw new SyntaxError("expected " + "@" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
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

  __consumedEnd = __off;
  let params = '';
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
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        __off += 2;
        while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
        if (__off < __len) __off += 2;
        __lastLeadingCommentEnd = __off;
        continue;
      }
      break;
    }
    const __startOff = __off;
    let __lastNonWs = __off;
    let __depth = 0;
    const __comments: [number, number][] = [];
    while (__off < __len) {
      const __c = __input.charCodeAt(__off);
      if (__depth === 0 && (__c === 59 || __c === 123 || __c === 125)) break;
      if (__c === 0x28 || __c === 0x5b || __c === 0x7b) { __depth++; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue; }
      if (__c === 0x29 || __c === 0x5d || __c === 0x7d) {
        if (__depth === 0) break;
        __depth--; __off++; if (!isAsciiWs(__c)) __lastNonWs = __off; continue;
      }
      if (__c === 0x22 || __c === 0x27) {
        const __q = __c;
        __off++;
        while (__off < __len) {
          const __sc = __input.charCodeAt(__off);
          if (__sc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__sc === __q) { __off++; break; }
          if (__sc === 0x0a || __sc === 0x0d) break;
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__depth === 0
        && (__c === 0x75 || __c === 0x55)
        && __off + 3 < __len
        && (__input.charCodeAt(__off + 1) | 32) === 0x72
        && (__input.charCodeAt(__off + 2) | 32) === 0x6c
        && __input.charCodeAt(__off + 3) === 0x28) {
        __off += 4;
        while (__off < __len) {
          const __uc = __input.charCodeAt(__off);
          if (__uc === 0x29) { __off++; break; }
          if (__uc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
          if (__uc === 0x22 || __uc === 0x27) {
            const __uq = __uc;
            __off++;
            while (__off < __len) {
              const __usc = __input.charCodeAt(__off);
              if (__usc === 0x5c && __off + 1 < __len) { __off += 2; continue; }
              if (__usc === __uq) { __off++; break; }
              if (__usc === 0x0a || __usc === 0x0d) break;
              __off++;
            }
            continue;
          }
          __off++;
        }
        __lastNonWs = __off;
        continue;
      }
      if (__c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
        let __ce = __off + 2;
        while (__ce < __len && !(__input.charCodeAt(__ce) === 0x2a && __ce + 1 < __len && __input.charCodeAt(__ce + 1) === 0x2f)) __ce++;
        if (__ce < __len) {
          __comments.push([__off, __ce + 2]);
          __off = __ce + 2;
          continue;
        }
      }
      if (__c === 0x5c && __off + 1 < __len) {
        __lastNonWs = __off + 2;
        __off += 2;
        continue;
      }
      if (!isAsciiWs(__c)) __lastNonWs = __off + 1;
      __off++;
    }
    if (__lastNonWs === __startOff) {
      const __emptyAnchor = __lastLeadingCommentEnd >= 0 ? __lastLeadingCommentEnd : __preWsOff;
      state.__lastCaptureStart = __emptyAnchor;
      state.__lastCaptureEnd = __emptyAnchor;
      __off = __emptyAnchor;
      params = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    if (__comments.length === 0) {
      params = __input.slice(__startOff, __lastNonWs);
    } else {
      let __buf = '';
      let __cursor = __startOff;
      for (let __i = 0; __i < __comments.length; __i++) {
        const __cs = __comments[__i][0];
        const __ce = __comments[__i][1];
        if (__ce > __lastNonWs) break;
        const __before = __cs > 0 ? __input.charCodeAt(__cs - 1) : -1;
        const __after = __ce < __len ? __input.charCodeAt(__ce) : -1;
        if (!(isAsciiWs(__before) || isAsciiWs(__after))) continue;
        __buf += __input.slice(__cursor, __cs);
        __cursor = __ce;
      }
      __buf += __input.slice(__cursor, __lastNonWs);
      params = __buf;
    }
    }
  }
  __consumedEnd = state.__lastCaptureEnd;
  const __beforeSpan3 = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    if (__ws_c === 0x2f && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2a) {
      __off += 2;
      while (__off < __len && !(__input.charCodeAt(__off) === 0x2a && __off + 1 < __len && __input.charCodeAt(__off + 1) === 0x2f)) __off++;
      if (__off < __len) __off += 2;
      continue;
    }
    break;
  }
  let semi: string | null = null;
  if (__input.charCodeAt(__off) === 59) {
    __off += 1;
    semi = ";";
  } else {
    __off = __consumedEnd;
  }
  if (__off > __beforeSpan3) __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateAtRule(state: State): unknown {
  { const r = trySpeculate(state, validateAtRule__alt0); if (r !== null) return r; }
  return validateAtRule__alt1(state);
}

function validateStylesheet(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  let __consumedEnd = __off;
  let __count_nodes = 0;
  while (!(__off >= __len)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
    if (__off >= __len) break;
    const __before = __off;
    state.off = __off; __roleDispatch_validate_Comment_AtRule_Rule_Declaration_8(state); __off = state.off;
    __count_nodes++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    while (__input.charCodeAt(__off) === 59) { __off += 1; while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  } }
  }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function __roleDispatch_raws_Comment_AtRule_Rule_Declaration_0(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return parseComment(state);
  if (__input.charCodeAt(__off) === 64) return parseAtRule(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, parseRule);
    if (__block !== null) return __block;
  }
  return parseDeclaration(state);
}
}

function __roleDispatch_raws_Comment_AtRule_Rule_Declaration_1(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return parseComment(state);
  if (__input.charCodeAt(__off) === 64) return parseAtRule(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, parseRule);
    if (__block !== null) return __block;
  }
  return parseDeclaration(state);
}
}

function __roleDispatch_raws_Comment_AtRule_Rule_Declaration_2(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return parseComment(state);
  if (__input.charCodeAt(__off) === 64) return parseAtRule(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, parseRule);
    if (__block !== null) return __block;
  }
  return parseDeclaration(state);
}
}

function __roleDispatch_fast_Comment_AtRule_Rule_Declaration_3(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 64) return parseAtRuleFast(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, parseRuleFast);
    if (__block !== null) return __block;
  }
  return parseDeclarationFast(state);
}
}

function __roleDispatch_fast_Comment_AtRule_Rule_Declaration_4(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 64) return parseAtRuleFast(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, parseRuleFast);
    if (__block !== null) return __block;
  }
  return parseDeclarationFast(state);
}
}

function __roleDispatch_fast_Comment_AtRule_Rule_Declaration_5(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return parseCommentFast(state);
  if (__input.charCodeAt(__off) === 64) return parseAtRuleFast(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, parseRuleFast);
    if (__block !== null) return __block;
  }
  return parseDeclarationFast(state);
}
}

function __roleDispatch_validate_Comment_AtRule_Rule_Declaration_6(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return validateComment(state);
  if (__input.charCodeAt(__off) === 64) return validateAtRule(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, validateRule);
    if (__block !== null) return __block;
  }
  return validateDeclaration(state);
}
}

function __roleDispatch_validate_Comment_AtRule_Rule_Declaration_7(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return validateComment(state);
  if (__input.charCodeAt(__off) === 64) return validateAtRule(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, validateRule);
    if (__block !== null) return __block;
  }
  return validateDeclaration(state);
}
}

function __roleDispatch_validate_Comment_AtRule_Rule_Declaration_8(state: State): unknown {
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
  if (__input.charCodeAt(__off) === 47 && __input.charCodeAt(__off + 1) === 42) return validateComment(state);
  if (__input.charCodeAt(__off) === 64) return validateAtRule(state);
  {
  let __boundary = __off;
  let __depth = 0;
  while (__boundary < __len) {
    const __bc = __input.charCodeAt(__boundary);
    if (__bc === 0x22 || __bc === 0x27) {
      const __q = __bc;
      __boundary++;
      while (__boundary < __len) {
        const __sc = __input.charCodeAt(__boundary);
        if (__sc === 0x5c) { __boundary += 2; continue; }
        __boundary++;
        if (__sc === __q) break;
      }
      continue;
    }
    if (__bc === 0x2f && __input.charCodeAt(__boundary + 1) === 0x2a) {
      __boundary += 2;
      while (__boundary < __len && !(__input.charCodeAt(__boundary) === 0x2a && __input.charCodeAt(__boundary + 1) === 0x2f)) __boundary++;
      if (__boundary < __len) __boundary += 2;
      continue;
    }
    if (__bc === 0x5c) { __boundary += __boundary + 1 < __len ? 2 : 1; continue; }
    if (__depth === 0 && (__bc === 123 || __bc === 125 || __bc === 59)) break;
    if (__bc === 0x28 || __bc === 0x5b) __depth++;
    else if (__bc === 0x29 || __bc === 0x5d) {
      if (__depth === 0) break;
      __depth--;
    }
    __boundary++;
  }
  let __boundaryEnd = __boundary;
  while (__boundaryEnd > __off) {
    const __tc = __input.charCodeAt(__boundaryEnd - 1);
    if (__tc !== 0x20 && __tc !== 0x09 && __tc !== 0x0a && __tc !== 0x0d) break;
    __boundaryEnd--;
  }
  if (__input.charCodeAt(__boundary) === 123 && !(__boundaryEnd > __off && __input.charCodeAt(__boundaryEnd - 1) === 58)) {
    const __block = trySpeculate(state, validateRule);
    if (__block !== null) return __block;
  }
  return validateDeclaration(state);
}
}

type DirectState = {
  readonly input: string;
  readonly len: number;
  pos: number;
  scanStop: number;
  scanStopIdx: number;
  scanCaptureStart: number;
  scanCaptureEnd: number;
  scanColonIdx: number;
  scanBangIdx: number;
  scanHadComment: boolean;
  lastNodeStart: number;
  lastNodeEnd: number;
};

// Per-scan character-class tables. Each scan only cares about a handful of
// ASCII bytes (string/escape/comment openers, bracket pairs, and the
// scan-specific stop/pair markers). Any ASCII byte not flagged here is
// content — alphanumerics, hyphens, dots, spaces, commas — and the loop
// can skip it with a single bounds check + table lookup. Non-ASCII bytes
// (c >= 128) are also content. This collapses ~8 false branches per
// content char down to 2.
const __DIRECT_SCAN_BOUNDARY_CLASS = /* @__PURE__ */ buildDirectScanClass([
  0x60, 0x22, 0x27, 0x5c, 0x2f, 0x28, 0x29, 0x5b, 0x5d, 0x7b, 0x7d, 59, 123, 125
]);
const __DIRECT_SCAN_PAIR_CLASS = /* @__PURE__ */ buildDirectScanClass([
  0x60, 0x22, 0x27, 0x5c, 0x2f, 0x28, 0x29, 0x5b, 0x5d, 0x7b, 0x7d, 59, 123, 125, 58, 33
]);
const __DIRECT_SCAN_VALUE_CLASS = /* @__PURE__ */ buildDirectScanClass([
  0x60, 0x22, 0x27, 0x5c, 0x2f, 0x28, 0x29, 0x5b, 0x5d, 0x7b, 0x7d, 59, 125, 33
]);
function buildDirectScanClass(codes: readonly number[]): Uint8Array {
  const t = new Uint8Array(128);
  for (const code of codes) t[code] = 1;
  return t;
}

function parseDirectFast(input: string): unknown {
  const state: DirectState = {
    input,
    len: input.length,
    pos: 0,
    scanStop: -1,
    scanStopIdx: 0,
    scanCaptureStart: 0,
    scanCaptureEnd: 0,
    scanColonIdx: -1,
    scanBangIdx: -1,
    scanHadComment: false,
    lastNodeStart: 0,
    lastNodeEnd: 0,
  };
  const nodes = parseDirectRootChildren(state);
  skipDirectWsAndSeparators(state);
  if (state.pos !== state.len) throw new SyntaxError(`unexpected trailing character at position ${state.pos}`);
  return { type: "root", nodes: nodes };
}

function parseDirectRaws(input: string): unknown {
  const state: DirectState = {
    input,
    len: input.length,
    pos: 0,
    scanStop: -1,
    scanStopIdx: 0,
    scanCaptureStart: 0,
    scanCaptureEnd: 0,
    scanColonIdx: -1,
    scanBangIdx: -1,
    scanHadComment: false,
    lastNodeStart: 0,
    lastNodeEnd: 0,
  };
  const list = parseDirectRootChildrenRaws(state);
  skipDirectWsAndSeparators(state);
  if (state.pos !== state.len) throw new SyntaxError(`unexpected trailing character at position ${state.pos}`);
  const end = state.pos;
  return {
    type: "root", nodes: list.nodes, raws: { after: input.slice(list.prevEnd, end), semicolon: input.charCodeAt(list.prevEnd - 1) === 59 }
  };
}

function validateDirectFast(input: string): void {
  const state: DirectState = {
    input,
    len: input.length,
    pos: 0,
    scanStop: -1,
    scanStopIdx: 0,
    scanCaptureStart: 0,
    scanCaptureEnd: 0,
    scanColonIdx: -1,
    scanBangIdx: -1,
    scanHadComment: false,
    lastNodeStart: 0,
    lastNodeEnd: 0,
  };
  validateDirectRootChildren(state);
  skipDirectWsAndSeparators(state);
  if (state.pos !== state.len) throw new SyntaxError(`unexpected trailing character at position ${state.pos}`);
}

function validateDirectRootChildren(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== 59) break;
      state.pos++;
    }
    if (state.pos >= len) return;
    const c = input.charCodeAt(state.pos);
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[state.pos]}' at position ${state.pos}`);
    if (c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */) {
      validateDirectComment(state);
      continue;
    }
    if (c === 64) {
      validateDirectPrefixed(state);
      continue;
    }
    validateDirectBlockOrPair(state);
  }
}

function validateDirectChildren(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== 59) break;
      state.pos++;
    }
    if (state.pos >= len) {
      throw new SyntaxError(`expected '}' at position ${state.pos}`);
    }
    const c = input.charCodeAt(state.pos);
    if (c === 125) {
      state.pos++;
      return;
    }
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[state.pos]}' at position ${state.pos}`);
    if (c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */) {
      validateDirectComment(state);
      continue;
    }
    if (c === 64) {
      validateDirectPrefixed(state);
      continue;
    }
    validateDirectBlockOrPair(state);
  }
}

function validateDirectComment(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  state.pos += 2;
  while (state.pos < len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
  if (state.pos < len) state.pos += 2;
}

function validateDirectPrefixed(state: DirectState): void {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const nameStart = state.pos;
  readDirectIdent(state);
  if (state.pos === nameStart) throw new SyntaxError(`expected token of class 'ident' at position ${nameStart}`);
  scanDirectBoundary(state, 59, 123, 125);
  const scanStop = state.scanStop;
  state.pos = state.scanStopIdx;
  if (scanStop === 123) {
    state.pos++;
    validateDirectChildren(state);
    return;
  }
  if (scanStop === 59) state.pos++;
}


function validateDirectBlockOrPair(state: DirectState): void {
  const input = state.input;
  scanDirectPairBoundary(state, 123, 59, 125);
  if (state.scanStop === 123) {
    const rejectsBlock = (state.scanCaptureEnd > state.scanCaptureStart && input.charCodeAt(state.scanCaptureEnd - 1) === 58)
      || (state.scanColonIdx >= 0 && input.charCodeAt(state.scanCaptureStart) === 0x2d && state.scanCaptureStart + 1 < state.scanColonIdx && input.charCodeAt(state.scanCaptureStart + 1) === 0x2d);
    if (!rejectsBlock) {
      if (state.scanCaptureEnd <= state.scanCaptureStart) throw new SyntaxError(`expected selector at position ${state.pos}`);
      const selectorEnd = input.charCodeAt(state.scanCaptureEnd - 1);
      if (selectorEnd === 0x2c /* , */ || selectorEnd === 0x3e /* > */ || selectorEnd === 0x2b /* + */ || selectorEnd === 0x7e /* ~ */) {
        throw new SyntaxError(`expected selector after combinator at position ${state.scanCaptureEnd}`);
      }
      state.pos = state.scanStopIdx + 1;
      validateDirectChildren(state);
      return;
    }
  }
  const scanColonIdx = state.scanColonIdx;
  if (scanColonIdx < 0) {
    const found = state.scanStopIdx < state.len ? `'${input[state.scanStopIdx]}'` : 'end of input';
    directSyntaxError(state, `Unexpected ${found}`, state.scanStopIdx);
  }
  if (state.scanStop === 123) {
    state.pos = scanColonIdx + 1;
    validateDirectDeclarationRest(state);
    return;
  }
  state.pos = state.scanBangIdx >= 0 ? state.scanBangIdx : state.scanStopIdx;
  if (state.scanBangIdx >= 0) {
    validateDirectImportantDeclarationRest(state);
    return;
  }
  if (state.scanStop === 59) state.pos++;
}

function validateDirectDeclarationRest(state: DirectState): void {
  scanDirectValueBoundary(state, 59, 125, 33);
  state.pos = state.scanStopIdx;
  if (state.scanStop === 33) {
    validateDirectImportantDeclarationRest(state);
    return;
  }
  if (state.scanStop === 59) state.pos++;
}

function validateDirectImportantDeclarationRest(state: DirectState): void {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const importantStart = state.pos;
  readDirectIdent(state);
  if (state.pos === importantStart) throw new SyntaxError(`expected token of class 'ident' at position ${importantStart}`);
  skipDirectWs(state);
  if (input.charCodeAt(state.pos) === 59) state.pos++;
}

function parseDirectRootChildren(state: DirectState): unknown[] {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== 59) break;
      state.pos++;
    }
    if (state.pos >= len) return nodes;
    const c = input.charCodeAt(state.pos);
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[state.pos]}' at position ${state.pos}`);
    if (c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */) {
      nodes[nodes.length] = parseDirectComment(state);
      continue;
    }
    if (c === 64) {
      nodes[nodes.length] = parseDirectPrefixed(state);
      continue;
    }
    nodes[nodes.length] = parseDirectBlockOrPair(state);
  }
}

function parseDirectChildren(state: DirectState): unknown[] {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== 59) break;
      state.pos++;
    }
    if (state.pos >= len) {
      throw new SyntaxError(`expected '}' at position ${state.pos}`);
    }
    const c = input.charCodeAt(state.pos);
    if (c === 125) {
      state.pos++;
      return nodes;
    }
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[state.pos]}' at position ${state.pos}`);
    if (c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */) {
      nodes[nodes.length] = parseDirectComment(state);
      continue;
    }
    if (c === 64) {
      nodes[nodes.length] = parseDirectPrefixed(state);
      continue;
    }
    nodes[nodes.length] = parseDirectBlockOrPair(state);
  }
}

function parseDirectComment(state: DirectState): unknown {
  const input = state.input;
  const len = state.len;
  const start = state.pos;
  state.pos += 2;
  while (state.pos < len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
  if (state.pos < len) state.pos += 2;
  let textStart = start + 2;
  let textEnd = state.pos - 2;
  while (textStart < textEnd) {
    const lc = input.charCodeAt(textStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    textStart++;
  }
  while (textEnd > textStart) {
    const tc = input.charCodeAt(textEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    textEnd--;
  }
  return { type: "comment", text: input.slice(textStart, textEnd) };
}

function parseDirectPrefixed(state: DirectState): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const nameStart = state.pos;
  readDirectIdent(state);
  const name = input.slice(nameStart, state.pos);
  scanDirectBoundary(state, 59, 123, 125);
  const params = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
  const scanStop = state.scanStop;
  state.pos = state.scanStopIdx;
  if (scanStop === 123) {
    state.pos++;
    const nodes = parseDirectChildren(state);
    return { type: "atrule", name: name, params: params, nodes: nodes };
  }
  if (scanStop === 59) state.pos++;
  return { type: "atrule", name: name, params: params };
}


function parseDirectRootChildrenRaws(state: DirectState): { nodes: unknown[]; prevEnd: number } {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  let prevEnd = 0;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== 59) break;
      state.pos++;
    }
    if (state.pos >= len) return { nodes, prevEnd };
    const c = input.charCodeAt(state.pos);
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[state.pos]}' at position ${state.pos}`);
    const child = c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */
      ? parseDirectCommentRaws(state)
      : c === 64
      ? parseDirectPrefixedRaws(state)
      : parseDirectBlockOrPairRaws(state);
    directAttachRawsBefore(input, child, prevEnd, state.lastNodeStart);
    nodes[nodes.length] = child;
    prevEnd = state.lastNodeEnd;
  }
}

function parseDirectChildrenRaws(state: DirectState, bodyStart: number): { nodes: unknown[]; closeStart: number; prevEnd: number } {
  const nodes: unknown[] = [];
  const input = state.input;
  const len = state.len;
  let prevEnd = bodyStart;
  while (true) {
    while (state.pos < len) {
      const ws = input.charCodeAt(state.pos);
      if (ws !== 0x20 && ws !== 0x09 && ws !== 0x0a && ws !== 0x0d && ws !== 59) break;
      state.pos++;
    }
    if (state.pos >= len) {
      throw new SyntaxError(`expected '}' at position ${state.pos}`);
    }
    const c = input.charCodeAt(state.pos);
    if (c === 125) {
      const closeStart = state.pos;
      state.pos++;
      return { nodes, closeStart, prevEnd };
    }
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[state.pos]}' at position ${state.pos}`);
    const child = c === 0x2f /* / */ && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a /* * */
      ? parseDirectCommentRaws(state)
      : c === 64
      ? parseDirectPrefixedRaws(state)
      : parseDirectBlockOrPairRaws(state);
    directAttachRawsBefore(input, child, prevEnd, state.lastNodeStart);
    nodes[nodes.length] = child;
    prevEnd = state.lastNodeEnd;
  }
}

function parseDirectCommentRaws(state: DirectState): unknown {
  const input = state.input;
  const len = state.len;
  const start = state.pos;
  state.pos += 2;
  while (state.pos < len && !(input.charCodeAt(state.pos) === 0x2a && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2f)) state.pos++;
  if (state.pos < len) state.pos += 2;
  const raw = input.slice(start, state.pos);
  state.lastNodeStart = start;
  state.lastNodeEnd = state.pos;
  return { type: "comment", text: commentInterior(raw), raws: { left: commentLeft(raw), right: commentRight(raw) } };
}

function parseDirectPrefixedRaws(state: DirectState): unknown {
  const input = state.input;
  const start = state.pos;
  state.pos++;
  skipDirectWs(state);
  const nameStart = state.pos;
  readDirectIdent(state);
  const nameEnd = state.pos;
  const name = input.slice(nameStart, nameEnd);
  scanDirectBoundary(state, 59, 123, 125);
  const paramsStart = state.scanCaptureStart;
  const paramsEnd = state.scanCaptureEnd;
  const params = input.slice(paramsStart, paramsEnd);
  const scanStop = state.scanStop;
  const stopIdx = state.scanStopIdx;
  const afterName = paramsStart === paramsEnd ? '' : input.slice(nameEnd, paramsStart);
  const between = scanStop === 59 || scanStop === 123
    ? (paramsStart === paramsEnd ? input.slice(nameEnd, stopIdx) : input.slice(paramsEnd, stopIdx))
    : '';
  state.pos = stopIdx;
  if (scanStop === 123) {
    state.pos++;
    const body = parseDirectChildrenRaws(state, state.pos);
    state.lastNodeStart = start;
    state.lastNodeEnd = state.pos;
    return {
      type: "atrule", name: name, params: params, nodes: body.nodes, raws: { afterName, between, after: input.slice(body.prevEnd, body.closeStart), semicolon: input.charCodeAt(body.prevEnd - 1) === 59 }
    };
  }
  if (scanStop === 59) state.pos++;
  state.lastNodeStart = start;
  state.lastNodeEnd = scanStop === 59 ? state.pos : paramsEnd;
  return {
    type: "atrule", name: name, params: params, raws: { afterName, between }
  };
}


function parseDirectBlockOrPairRaws(state: DirectState): unknown {
  const input = state.input;
  const start = state.pos;
  scanDirectPairBoundary(state, 123, 59, 125);
  if (state.scanStop === 123) {
    const rejectsBlock = (state.scanCaptureEnd > state.scanCaptureStart && input.charCodeAt(state.scanCaptureEnd - 1) === 58)
      || (state.scanColonIdx >= 0 && input.charCodeAt(state.scanCaptureStart) === 0x2d && state.scanCaptureStart + 1 < state.scanColonIdx && input.charCodeAt(state.scanCaptureStart + 1) === 0x2d);
    if (!rejectsBlock) {
      const rawSelector = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
      const selector = state.scanHadComment ? directNormalizeSelector(rawSelector) : rawSelector;
      const selectorEnd = input.charCodeAt(state.scanCaptureEnd - 1);
      if (selectorEnd === 0x2c /* , */ || selectorEnd === 0x3e /* > */ || selectorEnd === 0x2b /* + */ || selectorEnd === 0x7e /* ~ */) {
        throw new SyntaxError(`expected selector after combinator at position ${state.scanCaptureEnd}`);
      }
      const selectorEndOffset = state.scanCaptureEnd;
      const openIdx = state.scanStopIdx;
      state.pos = openIdx + 1;
      const body = parseDirectChildrenRaws(state, state.pos);
      state.lastNodeStart = start;
      state.lastNodeEnd = state.pos;
      return {
        type: "rule", selector: selector, nodes: body.nodes, raws: { between: input.slice(selectorEndOffset, openIdx), after: input.slice(body.prevEnd, body.closeStart), semicolon: input.charCodeAt(body.prevEnd - 1) === 59 }
      };
    }
  }
  const scanColonIdx = state.scanColonIdx;
  if (scanColonIdx < 0) {
    const found = state.scanStopIdx < state.len ? `'${input[state.scanStopIdx]}'` : 'end of input';
    directSyntaxError(state, `Unexpected ${found}`, state.scanStopIdx);
  }
  const scanCaptureStart = state.scanCaptureStart;
  const propEnd = directTrimTriviaEnd(input, scanCaptureStart, scanColonIdx);
  const prop = input.slice(scanCaptureStart, propEnd);
  if (state.scanStop === 123) {
    state.pos = scanColonIdx + 1;
    return parseDirectDeclarationRestRaws(state, start, prop, propEnd);
  }
  const isCustomProp = prop.length > 1 && prop.charCodeAt(0) === 0x2d && prop.charCodeAt(1) === 0x2d;
  const rawRightEnd = isCustomProp
    ? directTrimWsEnd(input, scanColonIdx + 1, state.scanBangIdx >= 0 ? state.scanBangIdx : state.scanStopIdx)
    : state.scanBangIdx >= 0 ? state.scanBangIdx : state.scanCaptureEnd;
  const valueStart = directTrimValueStart(input, scanColonIdx + 1, rawRightEnd);
  const valueEnd = directTrimValueEnd(input, valueStart, rawRightEnd);
  const value = state.scanHadComment ? directStripComments(input.slice(valueStart, valueEnd)) : input.slice(valueStart, valueEnd);
  const betweenEnd = isCustomProp && value.length === '' ? directTrimWsEnd(input, scanColonIdx + 1, rawRightEnd) : valueStart;
  state.pos = state.scanBangIdx >= 0 ? state.scanBangIdx : state.scanStopIdx;
  if (state.scanBangIdx >= 0) return parseDirectImportantDeclarationRestRaws(state, start, prop, value, propEnd, betweenEnd);
  if (state.scanStop === 59) state.pos++;
  state.lastNodeStart = start;
  state.lastNodeEnd = state.scanStop === 59 ? state.pos : valueEnd;
  return { type: "decl", prop: prop, value: value, raws: { between: input.slice(propEnd, betweenEnd) } };
}

function parseDirectDeclarationRestRaws(state: DirectState, start: number, prop: string, propEnd: number): unknown {
  const input = state.input;
  const valueScanStart = state.pos;
  scanDirectValueBoundary(state, 59, 125, 33);
  const rawRightEnd = state.scanStop === 33 ? state.scanStopIdx : state.scanCaptureEnd;
  const valueStart = directTrimValueStart(input, valueScanStart, rawRightEnd);
  const valueEnd = directTrimValueEnd(input, valueStart, rawRightEnd);
  const value = state.scanHadComment ? directStripComments(input.slice(valueStart, valueEnd)) : input.slice(valueStart, valueEnd);
  const isCustomProp = prop.length > 1 && prop.charCodeAt(0) === 0x2d && prop.charCodeAt(1) === 0x2d;
  const betweenEnd = isCustomProp && value.length === '' ? directTrimWsEnd(input, valueScanStart, rawRightEnd) : valueStart;
  state.pos = state.scanStopIdx;
  if (state.scanStop === 33) {
    return parseDirectImportantDeclarationRestRaws(state, start, prop, value, propEnd, betweenEnd);
  }
  if (state.scanStop === 59) state.pos++;
  state.lastNodeStart = start;
  state.lastNodeEnd = state.scanStop === 59 ? state.pos : valueEnd;
  return { type: "decl", prop: prop, value: value, raws: { between: input.slice(propEnd, betweenEnd) } };
}

function parseDirectImportantDeclarationRestRaws(state: DirectState, start: number, prop: string, value: string, propEnd: number, valueStart: number): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWsAndComments(state);
  const importantStart = state.pos;
  readDirectIdent(state);
  if (state.pos === importantStart) throw new SyntaxError(`expected token of class 'ident' at position ${importantStart}`);
  skipDirectWsAndComments(state);
  if (input.charCodeAt(state.pos) === 59) state.pos++;
  state.lastNodeStart = start;
  state.lastNodeEnd = state.pos;
  return { type: "decl", prop: prop, value: value, important: true, raws: { between: input.slice(propEnd, valueStart) } };
}

function parseDirectBlockOrPair(state: DirectState): unknown {
  const input = state.input;
  scanDirectPairBoundary(state, 123, 59, 125);
  if (state.scanStop === 123) {
    const rejectsBlock = (state.scanCaptureEnd > state.scanCaptureStart && input.charCodeAt(state.scanCaptureEnd - 1) === 58)
      || (state.scanColonIdx >= 0 && input.charCodeAt(state.scanCaptureStart) === 0x2d && state.scanCaptureStart + 1 < state.scanColonIdx && input.charCodeAt(state.scanCaptureStart + 1) === 0x2d);
    if (!rejectsBlock) {
      const selector = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
      if (selector.length === 0) throw new SyntaxError(`expected selector at position ${state.pos}`);
      const selectorEnd = input.charCodeAt(state.scanCaptureEnd - 1);
      if (selectorEnd === 0x2c /* , */ || selectorEnd === 0x3e /* > */ || selectorEnd === 0x2b /* + */ || selectorEnd === 0x7e /* ~ */) {
        throw new SyntaxError(`expected selector after combinator at position ${state.scanCaptureEnd}`);
      }
      state.pos = state.scanStopIdx + 1;
      const nodes = parseDirectChildren(state);
      return { type: "rule", selector: selector, nodes: nodes };
    }
  }
  const scanColonIdx = state.scanColonIdx;
  if (scanColonIdx < 0) {
    const found = state.scanStopIdx < state.len ? `'${input[state.scanStopIdx]}'` : 'end of input';
    directSyntaxError(state, `Unexpected ${found}`, state.scanStopIdx);
  }
  const scanCaptureStart = state.scanCaptureStart;
  const scanCaptureEnd = state.scanCaptureEnd;
  const scanBangIdx = state.scanBangIdx;
  let pairLeftEnd = scanColonIdx;
  while (pairLeftEnd > scanCaptureStart) {
    const lc = input.charCodeAt(pairLeftEnd - 1);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    pairLeftEnd--;
  }
  const prop = input.slice(scanCaptureStart, pairLeftEnd);
  if (state.scanStop === 123) {
    state.pos = scanColonIdx + 1;
    return parseDirectDeclarationRest(state, prop);
  }
  let pairRightStart = scanColonIdx + 1;
  const rawRightEnd = scanBangIdx >= 0 ? scanBangIdx : scanCaptureEnd;
  while (pairRightStart < rawRightEnd) {
    const lc = input.charCodeAt(pairRightStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    pairRightStart++;
  }
  let pairRightEnd = rawRightEnd;
  while (pairRightEnd > pairRightStart) {
    const tc = input.charCodeAt(pairRightEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    pairRightEnd--;
  }
  const value = input.slice(pairRightStart, pairRightEnd);
  state.pos = scanBangIdx >= 0 ? scanBangIdx : state.scanStopIdx;
  if (scanBangIdx >= 0) return parseDirectImportantDeclarationRest(state, prop, value);
  if (state.scanStop === 59) state.pos++;
  return { type: "decl", prop: prop, value: value };
}

function parseDirectDeclarationRest(state: DirectState, prop: string): unknown {
  const input = state.input;
  scanDirectValueBoundary(state, 59, 125, 33);
  const value = input.slice(state.scanCaptureStart, state.scanCaptureEnd);
  state.pos = state.scanStopIdx;
  if (state.scanStop === 33) {
    return parseDirectImportantDeclarationRest(state, prop, value);
  }
  if (state.scanStop === 59) state.pos++;
  return { type: "decl", prop: prop, value: value };
}

function parseDirectImportantDeclarationRest(state: DirectState, prop: string, value: string): unknown {
  const input = state.input;
  state.pos++;
  skipDirectWs(state);
  const importantStart = state.pos;
  readDirectIdent(state);
  if (state.pos === importantStart) throw new SyntaxError(`expected token of class 'ident' at position ${importantStart}`);
  skipDirectWs(state);
  if (input.charCodeAt(state.pos) === 59) state.pos++;
  return { type: "decl", prop: prop, value: value, important: true };
}

function scanDirectBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
  let depth = 0;
  let hadComment = false;
  const cls = __DIRECT_SCAN_BOUNDARY_CLASS;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c >= 128 || cls[c] === 0) { pos++; continue; }
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[pos]}' at position ${pos}`);
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      pos = skipDirectString(input, pos, len);
      continue;
    }
    if (c === 0x5c /* \\ */) {
      pos += pos + 1 < len ? 2 : 1;
      continue;
    }
    if (depth > 0 && c === 0x2f /* / */ && pos + 1 < len && input.charCodeAt(pos + 1) === 0x2a /* * */) {
      const commentEnd = input.indexOf('*/', pos + 2);
      const lineEnd = input.indexOf('\n', pos + 2);
      if (commentEnd >= 0 && (lineEnd < 0 || commentEnd < lineEnd)) {
        hadComment = true;
        pos = commentEnd + 2;
        continue;
      }
    }
    if (depth === 0 && c === 0x2f /* / */ && pos + 1 < len && input.charCodeAt(pos + 1) === 0x2a /* * */) {
      if (depth === 0 && directCommentStartsOwnLine(input, startPos, pos)) break;
      hadComment = true;
      pos = skipDirectComment(input, pos, len);
      continue;
    }
    if (depth === 0) {
      if (c === stop0 || c === stop1 || c === stop2) break;
    }
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === 123) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === 125) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  const captureStart = directTrimTriviaStart(input, startPos, pos);
  const captureEnd = directTrimTriviaEnd(input, captureStart, pos);
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = captureStart;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = -1;
  state.scanBangIdx = -1;
  state.scanHadComment = hadComment;
}

function scanDirectPairBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
  let depth = 0;
  let colonIdx = -1;
  let bangIdx = -1;
  let hadComment = false;
  const cls = __DIRECT_SCAN_PAIR_CLASS;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c >= 128 || cls[c] === 0) { pos++; continue; }
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[pos]}' at position ${pos}`);
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      pos = skipDirectString(input, pos, len);
      continue;
    }
    if (c === 0x5c /* \\ */) {
      pos += pos + 1 < len ? 2 : 1;
      continue;
    }
    if (depth > 0 && c === 0x2f /* / */ && pos + 1 < len && input.charCodeAt(pos + 1) === 0x2a /* * */) {
      const commentEnd = input.indexOf('*/', pos + 2);
      const lineEnd = input.indexOf('\n', pos + 2);
      if (commentEnd >= 0 && (lineEnd < 0 || commentEnd < lineEnd)) {
        hadComment = true;
        pos = commentEnd + 2;
        continue;
      }
    }
    if (depth === 0 && c === 0x2f /* / */ && pos + 1 < len && input.charCodeAt(pos + 1) === 0x2a /* * */) {
      if (depth === 0 && colonIdx >= 0 && directCommentStartsOwnLine(input, startPos, pos)) break;
      hadComment = true;
      pos = skipDirectComment(input, pos, len);
      continue;
    }
    if (depth === 0) {
      if (colonIdx < 0 && c === 58) colonIdx = pos;
      if (colonIdx >= 0 && bangIdx < 0 && c === 33) bangIdx = pos;
      if (c === stop0 || c === stop1 || c === stop2) break;
    }
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === 123) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === 125) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  // Callers (parseDirectChildren / parseDirectRootChildren) always advance past
  // whitespace and separators before dispatching here, so the leading-trim
  // loop is dead. captureStart is always the entry pos.
  const captureEnd = directTrimTriviaEnd(input, startPos, pos);
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = startPos;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = colonIdx;
  state.scanBangIdx = bangIdx;
  state.scanHadComment = hadComment;
}

function scanDirectValueBoundary(state: DirectState, stop0: number, stop1: number, stop2: number): void {
  const input = state.input;
  const len = state.len;
  const startPos = state.pos;
  let pos = startPos;
  let depth = 0;
  let hadComment = false;
  const cls = __DIRECT_SCAN_VALUE_CLASS;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c >= 128 || cls[c] === 0) { pos++; continue; }
    if (c === 0x60 /* ` */) throw new SyntaxError(`Unexpected character '${input[pos]}' at position ${pos}`);
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      pos = skipDirectString(input, pos, len);
      continue;
    }
    if (c === 0x5c /* \\ */) {
      pos += pos + 1 < len ? 2 : 1;
      continue;
    }
    if (depth > 0 && c === 0x2f /* / */ && pos + 1 < len && input.charCodeAt(pos + 1) === 0x2a /* * */) {
      const commentEnd = input.indexOf('*/', pos + 2);
      const lineEnd = input.indexOf('\n', pos + 2);
      if (commentEnd >= 0 && (lineEnd < 0 || commentEnd < lineEnd)) {
        hadComment = true;
        pos = commentEnd + 2;
        continue;
      }
    }
    if (depth === 0 && c === 0x2f /* / */ && pos + 1 < len && input.charCodeAt(pos + 1) === 0x2a /* * */) {
      if (depth === 0 && directCommentStartsOwnLine(input, startPos, pos)) break;
      hadComment = true;
      pos = skipDirectComment(input, pos, len);
      continue;
    }
    if (depth === 0 && (c === stop0 || c === stop1 || c === stop2)) break;
    if (c === 0x28 /* ( */ || c === 0x5b /* [ */ || c === 123) depth++;
    else if (c === 0x29 /* ) */ || c === 0x5d /* ] */ || c === 125) {
      if (depth === 0) break;
      depth--;
    }
    pos++;
  }
  let captureStart = startPos;
  while (captureStart < pos) {
    const lc = input.charCodeAt(captureStart);
    if (lc !== 0x20 && lc !== 0x09 && lc !== 0x0a && lc !== 0x0d) break;
    captureStart++;
  }
  let captureEnd = pos;
  while (captureEnd > captureStart) {
    const tc = input.charCodeAt(captureEnd - 1);
    if (tc !== 0x20 && tc !== 0x09 && tc !== 0x0a && tc !== 0x0d) break;
    captureEnd--;
  }
  state.scanStop = pos < len ? input.charCodeAt(pos) : -1;
  state.scanStopIdx = pos;
  state.scanCaptureStart = captureStart;
  state.scanCaptureEnd = captureEnd;
  state.scanColonIdx = -1;
  state.scanBangIdx = -1;
  state.scanHadComment = hadComment;
}

function skipDirectString(input: string, pos: number, len: number): number {
  const quote = input.charCodeAt(pos);
  pos++;
  while (pos < len) {
    const c = input.charCodeAt(pos);
    if (c === 0x5c /* \\ */) { pos += 2; continue; }
    pos++;
    if (c === quote) break;
  }
  return pos;
}

function skipDirectComment(input: string, pos: number, len: number): number {
  pos += 2;
  while (pos < len && !(input.charCodeAt(pos) === 0x2a && pos + 1 < len && input.charCodeAt(pos + 1) === 0x2f)) pos++;
  return pos < len ? pos + 2 : pos;
}

function readDirectIdent(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len) {
    const c = input.charCodeAt(state.pos);
    if (c === 0x5c /* \\ */) {
      state.pos += state.pos + 1 < len ? 2 : 1;
      continue;
    }
    if (!((c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 45 || (c >= 48 && c <= 57))) break;
    state.pos++;
  }
}

function skipDirectWsAndSeparators(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len) {
    const c = input.charCodeAt(state.pos);
    if (isDirectWs(c) || c === 59) {
      state.pos++;
      continue;
    }
    break;
  }
}

function skipDirectWs(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len && isDirectWs(input.charCodeAt(state.pos))) state.pos++;
}

function skipDirectWsAndComments(state: DirectState): void {
  const input = state.input;
  const len = state.len;
  while (state.pos < len) {
    const c = input.charCodeAt(state.pos);
    if (isDirectWs(c)) {
      state.pos++;
      continue;
    }
    if (c === 0x2f && state.pos + 1 < len && input.charCodeAt(state.pos + 1) === 0x2a) {
      state.pos = skipDirectComment(input, state.pos, len);
      continue;
    }
    break;
  }
}

function directAttachRawsBefore(input: string, child: unknown, prevEnd: number, childStart: number): void {
  if (!child || typeof child !== 'object') return;
  const node = child as { raws?: Record<string, unknown> };
  if (!node.raws) node.raws = {};
  if (prevEnd === childStart) {
    node.raws.before = '';
    return;
  }
  if (prevEnd === 0) {
    let pos = 0;
    while (pos < childStart && isDirectWs(input.charCodeAt(pos))) pos++;
    if (pos === childStart) {
      node.raws.before = '';
      return;
    }
  }
  node.raws.before = input.slice(prevEnd, childStart);
}

function directTrimValueStart(input: string, start: number, end: number): number {
  return directTrimTriviaStart(input, start, end);
}

function directTrimValueEnd(input: string, start: number, end: number): number {
  return directTrimTriviaEnd(input, start, end);
}

function directTrimTriviaStart(input: string, start: number, end: number): number {
  let pos = start;
  while (pos < end) {
    const c = input.charCodeAt(pos);
    if (isDirectWs(c)) { pos++; continue; }
    if (c === 0x2f && pos + 1 < end && input.charCodeAt(pos + 1) === 0x2a) {
      pos = skipDirectComment(input, pos, end);
      continue;
    }
    break;
  }
  return pos;
}

function directTrimTriviaEnd(input: string, start: number, end: number): number {
  let pos = end;
  while (pos > start) {
    const c = input.charCodeAt(pos - 1);
    if (isDirectWs(c)) { pos--; continue; }
    if (c === 0x2f && pos - 2 >= start && input.charCodeAt(pos - 2) === 0x2a) {
      const commentStart = input.lastIndexOf('/*', pos - 2);
      if (commentStart >= start) {
        pos = commentStart;
        while (pos > start && isDirectWs(input.charCodeAt(pos - 1))) pos--;
        continue;
      }
    }
    break;
  }
  return pos;
}

function directTrimWsEnd(input: string, start: number, end: number): number {
  let pos = end;
  while (pos > start && isDirectWs(input.charCodeAt(pos - 1))) pos--;
  return pos;
}

function directStripComments(value: string): string {
  let out = '';
  let pos = 0;
  let idx = 0;
  while (idx < value.length) {
    const c = value.charCodeAt(idx);
    if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
      const next = skipDirectString(value, idx, value.length);
      out += value.slice(pos, idx);
      out += value.slice(idx, next);
      idx = next;
      pos = idx;
      continue;
    }
    if (c === 0x5c /* \\ */) {
      idx += idx + 1 < value.length ? 2 : 1;
      continue;
    }
    if (c === 0x2f && idx + 1 < value.length && value.charCodeAt(idx + 1) === 0x2a) {
      const commentStart = idx;
      idx = skipDirectComment(value, idx, value.length);
      const body = value.slice(commentStart + 2, Math.max(commentStart + 2, idx - 2));
      if (body.indexOf(';') >= 0 || body.indexOf('!') >= 0) {
        out += value.slice(pos, commentStart);
        pos = idx;
      }
      continue;
    }
    idx++;
  }
  return out + value.slice(pos);
}

function directNormalizeSelector(value: string): string {
  let idx = value.indexOf('/*');
  while (idx >= 0) {
    const end = value.indexOf('*/', idx + 2);
    if (end < 0) return value;
    const body = value.slice(idx + 2, end);
    if (body.indexOf('{') >= 0 || body.indexOf('}') >= 0) return directStripAllComments(value);
    idx = value.indexOf('/*', end + 2);
  }
  return value;
}

function directStripAllComments(value: string): string {
  let out = '';
  let pos = 0;
  let idx = value.indexOf('/*');
  while (idx >= 0) {
    out += value.slice(pos, idx);
    const end = value.indexOf('*/', idx + 2);
    if (end < 0) return out;
    pos = end + 2;
    idx = value.indexOf('/*', pos);
  }
  return out + value.slice(pos);
}

function directCommentStartsOwnLine(input: string, start: number, commentStart: number): boolean {
  let pos = commentStart - 1;
  while (pos >= start) {
    const c = input.charCodeAt(pos);
    if (c === 0x0a || c === 0x0d) return true;
    if (!isDirectWs(c)) return false;
    pos--;
  }
  return false;
}

function isDirectWs(c: number): boolean {
  return c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d;
}

function directSyntaxError(state: DirectState, message: string, offset: number): never {
  const input = state.input;
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
  throw new SyntaxError(`${message} at position ${offset}
${gutter} | ${source}
${' '.repeat(gutter.length)} | ${' '.repeat(column)}^`);
}

export function parse(input: string, options?: ParseOptions): unknown {
  const mode = options?.mode ?? 'fast';
  if (mode === 'fast') {
    const result = parseDirectFast(input);
    if (options?.validate === true) validateParsedProperties(input, result);
    return result;
  }
  if (mode === 'raws') {
    const result = parseDirectRaws(input);
    if (options?.validate === true) validateParsedProperties(input, result);
    return result;
  }
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
    const result = mode === 'raws' ? parseStylesheet(state) : parseStylesheetFast(state);
    if (state.off !== input.length) {
      throw syntaxErrorWithFrame(input, `unexpected trailing input at position ${state.off}`, state.off);
    }
  if (options?.validate === true) validateParsedProperties(input, result);
    return result;
  } catch (error) {
    if (error instanceof SyntaxError && !hasSourceFrame(error.message)) {
      throw decorateSyntaxError(input, error, state);
    }
    throw error;
  }
}

export function validate(input: string, options?: ParseOptions): void {
  if (options?.validate === true) {
    parse(input, options);
    return;
  }
  validateDirectFast(input);
  return;
  const state: State = {
    input,
    off: 0,
    mode: 'fast',
    lineStarts: [],
    __lastCaptureStart: 0,
    __lastCaptureEnd: 0,
  };
  try {
    validateStylesheet(state);
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
  module: "@parser2/css",
  exportName: 'validate',
};

const __validationSet0 = new Set<string>(["accent-color", "border-block-color", "border-block-end-color", "border-block-start-color", "border-bottom-color", "border-color", "border-inline-color", "border-inline-end-color", "border-inline-start-color", "border-left-color", "border-right-color", "border-top-color", "caret-color", "color", "column-rule-color", "fill", "flood-color", "lighting-color", "outline-color", "stop-color", "stroke", "text-decoration-color"]);
const __validationSet1 = new Set<string>(["block-size", "border-block-end-width", "border-block-start-width", "border-block-width", "border-bottom-width", "border-inline-end-width", "border-inline-start-width", "border-inline-width", "border-left-width", "border-right-width", "border-spacing", "border-top-width", "border-width", "bottom", "column-gap", "column-width", "flex-basis", "font-size", "gap", "height", "inline-size", "inset", "inset-block", "inset-block-end", "inset-block-start", "inset-inline", "inset-inline-end", "inset-inline-start", "left", "letter-spacing", "margin", "margin-block", "margin-block-end", "margin-block-start", "margin-bottom", "margin-inline", "margin-inline-end", "margin-inline-start", "margin-left", "margin-right", "margin-top", "max-block-size", "max-height", "max-inline-size", "max-width", "min-block-size", "min-height", "min-inline-size", "min-width", "outline-offset", "outline-width", "padding", "padding-block", "padding-block-end", "padding-block-start", "padding-bottom", "padding-inline", "padding-inline-end", "padding-inline-start", "padding-left", "padding-right", "padding-top", "right", "row-gap", "scroll-margin", "scroll-padding", "top", "width", "word-spacing"]);
function validateCachedProperty(
  cache: Map<string, true>,
  input: string,
  validatorId: number,
  value: string,
  validator: (input: string) => void,
  prop: string,
): void {
  const cacheKey = validatorId + '\0' + value;
  if (cache.has(cacheKey)) return;
  try {
    validator(value);
  } catch (error) {
    if (error instanceof SyntaxError) {
      const valueOffset = findPropertyValueOffset(input, prop, value);
      const nestedOffset = offsetFromMessage(error.message, 0);
      const nestedMessage = stripPositionSuffix(error.message.split('\n')[0] ?? error.message);
      throw syntaxErrorWithFrame(input, nestedMessage, valueOffset + nestedOffset);
    }
    throw error;
  }
  cache.set(cacheKey, true);
}

function validateParsedProperties(input: string, node: unknown): void {
  const cache = new Map<string, true>();
  visitValidationNode(input, node, cache);
}

function visitValidationNode(input: string, node: unknown, cache: Map<string, true>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const child of node) visitValidationNode(input, child, cache);
    return;
  }
  const record = node as Record<string, unknown>;
  if (record.type === "decl") {
      const matchValue = record["prop"];
      const value = record["value"];
      if (typeof matchValue === 'string' && typeof value === 'string') {
        const normalized = matchValue.toLowerCase();
        if (!normalized.startsWith('--') && __validationSet0.has(normalized)) {
          validateCachedProperty(cache, input, 0, value, __propertyValidator0, matchValue);
        }
      }
    }
  if (record.type === "decl") {
      const matchValue = record["prop"];
      const value = record["value"];
      if (typeof matchValue === 'string' && typeof value === 'string') {
        const normalized = matchValue.toLowerCase();
        if (!normalized.startsWith('--') && __validationSet1.has(normalized)) {
          validateCachedProperty(cache, input, 1, value, __propertyValidator1, matchValue);
        }
      }
    }
  const children = record.nodes;
  if (Array.isArray(children)) {
    for (const child of children) visitValidationNode(input, child, cache);
  }
}

function findPropertyValueOffset(input: string, prop: string, value: string): number {
  const valueIndex = input.indexOf(value);
  if (valueIndex >= 0) return valueIndex;
  const propIndex = input.indexOf(prop);
  if (propIndex < 0) return 0;
  const colonIndex = input.indexOf(':', propIndex + prop.length);
  if (colonIndex < 0) return propIndex;
  let pos = colonIndex + 1;
  while (pos < input.length && isAsciiWs(input.charCodeAt(pos))) pos++;
  return pos;
}

export function stringify(_value: unknown): string {
  throw new Error('stringify: not yet implemented for this schema slice');
}
