// Auto-generated from packages/css-color/src/schema.ts
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

function parseCssColorValue__alt0(state: State): unknown {
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
  const __value_s = __off;
  let value;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __value_s);
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
        __off - __value_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__value_s) | 32) === 0x75
        && (__input.charCodeAt(__value_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__value_s + 2) | 32) === 0x6c
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
  value = __input.slice(__value_s, __off);
  const __value_lc = value.toLowerCase();
  if (!(__value_lc === "aliceblue" || __value_lc === "black" || __value_lc === "blue" || __value_lc === "currentcolor" || __value_lc === "green" || __value_lc === "inherit" || __value_lc === "initial" || __value_lc === "red" || __value_lc === "revert" || __value_lc === "revert-layer" || __value_lc === "transparent" || __value_lc === "unset" || __value_lc === "white" || __value_lc === "yellow")) { state.off = __off; throw new SyntaxError("expected one of aliceblue, black, blue, currentcolor, green, inherit, initial, red, revert, revert-layer, transparent, unset, white, yellow at position " + __value_s); }
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "CssColorValue#0", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseCssColorValue__alt1(state: State): unknown {
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
  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after literal at position " + __off); }
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
      if (__depth === 0 && (__c === 41 || __c === 44 || __c === 47)) break;
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
  if (!isHexString(value)) { state.off = __off; throw new SyntaxError("expected hex string at position " + state.__lastCaptureStart); }
  if (!(value.length === 3 || value.length === 4 || value.length === 6 || value.length === 8)) { state.off = __off; throw new SyntaxError("expected length 3, 4, 6, 8 at position " + state.__lastCaptureStart); }
  __consumedEnd = state.__lastCaptureEnd;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "CssColorValue#1", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseCssColorValue__alt2(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "rgb" || __name_lc === "rgba")) { state.off = __off; throw new SyntaxError("expected one of rgb, rgba at position " + __name_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __args_startOff = __off;
  let __prevEnd_args = __args_startOff;
  const args: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 41) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseNumericColorFunctionToken(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_args);
    args.push(__child);
    if (__off === __before) break;
    __prevEnd_args = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_args;
  }
  if (args.length < 1) { state.off = __off; throw new SyntaxError("expected at least 1 NumericColorFunctionToken"); }
  __consumedEnd = __prevEnd_args;
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
  const __captures: Record<string, unknown> = { __production: "CssColorValue#2", name: name, args: args };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseCssColorValue__alt3(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "color" || __name_lc === "color-mix" || __name_lc === "hsl" || __name_lc === "hsla" || __name_lc === "hwb" || __name_lc === "lab" || __name_lc === "lch" || __name_lc === "light-dark" || __name_lc === "oklab" || __name_lc === "oklch")) { state.off = __off; throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + __name_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __args_startOff = __off;
  let __prevEnd_args = __args_startOff;
  const args: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 41) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseColorFunctionToken(state); __off = state.off;
    attachRawsBefore(state, __child, __prevEnd_args);
    args.push(__child);
    if (__off === __before) break;
    __prevEnd_args = (__child as { source?: { end?: { offset?: number } } })?.source?.end?.offset ?? __prevEnd_args;
  }
  if (args.length < 1) { state.off = __off; throw new SyntaxError("expected at least 1 ColorFunctionToken"); }
  __consumedEnd = __prevEnd_args;
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
  const __captures: Record<string, unknown> = { __production: "CssColorValue#3", name: name, args: args };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseCssColorValue__alt4(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "var")) { state.off = __off; throw new SyntaxError("expected one of var at position " + __name_s); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  let args = '';
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
      if (__depth === 0 && (__c === 41)) break;
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
      args = '';
    } else {
      state.__lastCaptureStart = __startOff;
      state.__lastCaptureEnd = __lastNonWs;
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    args = __input.slice(__startOff, __lastNonWs);
    }
  }
  if (args.endsWith(",")) { state.off = __off; throw new SyntaxError("captured value ends with rejected suffix ','"); }
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
  const __captures: Record<string, unknown> = { __production: "CssColorValue#4", name: name, args: args };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseCssColorValue(state: State): unknown {
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
    return parseCssColorValue__alt1(state);
  } else if ((isCssIdentStart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c)) {
    state.off = __peek;
    { const r = trySpeculate(state, parseCssColorValue__alt0); if (r !== null) return r; }
    { const r = trySpeculate(state, parseCssColorValue__alt2); if (r !== null) return r; }
    { const r = trySpeculate(state, parseCssColorValue__alt3); if (r !== null) return r; }
    return parseCssColorValue__alt4(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseNumericColorFunctionToken__alt0(state: State): unknown {
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
  const __value_s = __off;
  let value;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  value = __input.slice(__value_s, __off);
  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after token at position " + __off); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 37)) { state.off = __off; throw new SyntaxError("expected " + "%" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "NumericColorFunctionToken#0", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseNumericColorFunctionToken__alt1(state: State): unknown {
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
  const __value_s = __off;
  let value;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  value = __input.slice(__value_s, __off);
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "NumericColorFunctionToken#1", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseNumericColorFunctionToken__alt2(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 47)) { state.off = __off; throw new SyntaxError("expected " + "/" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "NumericColorFunctionToken#2" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseNumericColorFunctionToken__alt3(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 44)) { state.off = __off; throw new SyntaxError("expected " + "," + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "NumericColorFunctionToken#3" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseNumericColorFunctionToken(state: State): unknown {
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
  if (__byte0 === 47) {
    return parseNumericColorFunctionToken__alt2(state);
  } else if (__byte0 === 44) {
    return parseNumericColorFunctionToken__alt3(state);
  } else if (isDigit(__input.charCodeAt(__peek))) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      if (__peek < __len && __input.charCodeAt(__peek) === 0x2e && __peek + 1 < __len && isDigit(__input.charCodeAt(__peek + 1))) {
        __peek++;
        while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      }
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 37) {
      return parseNumericColorFunctionToken__alt0(state);
    }
    return parseNumericColorFunctionToken__alt1(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseColorFunctionToken__alt0(state: State): unknown {
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
  const __value_s = __off;
  let value;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  value = __input.slice(__value_s, __off);
  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after token at position " + __off); }
  __consumedEnd = __off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 37)) { state.off = __off; throw new SyntaxError("expected " + "%" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "ColorFunctionToken#0", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseColorFunctionToken__alt1(state: State): unknown {
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
  const __value_s = __off;
  let value;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  value = __input.slice(__value_s, __off);
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "ColorFunctionToken#1", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseColorFunctionToken__alt2(state: State): unknown {
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
  const __value_s = __off;
  let value;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __value_s);
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
        __off - __value_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__value_s) | 32) === 0x75
        && (__input.charCodeAt(__value_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__value_s + 2) | 32) === 0x6c
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
  value = __input.slice(__value_s, __off);
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "ColorFunctionToken#2", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseColorFunctionToken__alt3(state: State): unknown {
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
  const __value_s = __off;
  let value;
  if (!((__input.charCodeAt(__off) === 0x22 || __input.charCodeAt(__off) === 0x27))) throw new SyntaxError("expected string at position " + __value_s);
    {
      const __quote = __input.charCodeAt(__off);
      __off++;
      while (__off < __len) {
        const __ch = __input.charCodeAt(__off);
        if (__ch === 0x5c) { __off += 2; continue; }
        if (__ch === __quote) { __off++; break; }
        if (__ch === 0x0a || __ch === 0x0d) break;
        __off++;
      }
    }
  value = __input.slice(__value_s, __off);
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "ColorFunctionToken#3", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseColorFunctionToken__alt4(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 47)) { state.off = __off; throw new SyntaxError("expected " + "/" + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "ColorFunctionToken#4" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseColorFunctionToken__alt5(state: State): unknown {
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
  if (!(__input.charCodeAt(__off) === 44)) { state.off = __off; throw new SyntaxError("expected " + "," + " at position " + __off); }
  __off += 1;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "ColorFunctionToken#5" };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseColorFunctionToken(state: State): unknown {
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
  if (__byte0 === 47) {
    return parseColorFunctionToken__alt4(state);
  } else if (__byte0 === 44) {
    return parseColorFunctionToken__alt5(state);
  } else if (isDigit(__input.charCodeAt(__peek))) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      if (__peek < __len && __input.charCodeAt(__peek) === 0x2e && __peek + 1 < __len && isDigit(__input.charCodeAt(__peek + 1))) {
        __peek++;
        while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      }
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 37) {
      return parseColorFunctionToken__alt0(state);
    }
    return parseColorFunctionToken__alt1(state);
  } else if ((isCssIdentStart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c)) {
    return parseColorFunctionToken__alt2(state);
  } else if ((__input.charCodeAt(__peek) === 0x22 || __input.charCodeAt(__peek) === 0x27)) {
    return parseColorFunctionToken__alt3(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseCssColor(state: State): unknown {
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
  state.off = __off;
  const value = parseCssColorValue(state);
  __off = state.off;
  __consumedEnd = __off;
  const __endOff = __consumedEnd;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const __captures: Record<string, unknown> = { __production: "CssColor#0", value: value };
  __captures.source = makeSource(state, __startOff, __endOff);
  return __captures;
}

function parseCssColorValueFast__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;
  let value;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __value_s);
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
        __off - __value_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__value_s) | 32) === 0x75
        && (__input.charCodeAt(__value_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__value_s + 2) | 32) === 0x6c
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
  value = __input.slice(__value_s, __off);
  const __value_lc = value.toLowerCase();
  if (!(__value_lc === "aliceblue" || __value_lc === "black" || __value_lc === "blue" || __value_lc === "currentcolor" || __value_lc === "green" || __value_lc === "inherit" || __value_lc === "initial" || __value_lc === "red" || __value_lc === "revert" || __value_lc === "revert-layer" || __value_lc === "transparent" || __value_lc === "unset" || __value_lc === "white" || __value_lc === "yellow")) { state.off = __off; throw new SyntaxError("expected one of aliceblue, black, blue, currentcolor, green, inherit, initial, red, revert, revert-layer, transparent, unset, white, yellow at position " + __value_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "CssColorValue#0", value: value };
}

function parseCssColorValueFast__alt1(state: State): unknown {
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
  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after literal at position " + __off); }
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
      if (__depth === 0 && (__c === 41 || __c === 44 || __c === 47)) break;
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
  if (!isHexString(value)) { state.off = __off; throw new SyntaxError("expected hex string at position " + state.__lastCaptureStart); }
  if (!(value.length === 3 || value.length === 4 || value.length === 6 || value.length === 8)) { state.off = __off; throw new SyntaxError("expected length 3, 4, 6, 8 at position " + state.__lastCaptureStart); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "CssColorValue#1", value: value };
}

function parseCssColorValueFast__alt2(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "rgb" || __name_lc === "rgba")) { state.off = __off; throw new SyntaxError("expected one of rgb, rgba at position " + __name_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;

  const args: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 41) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseNumericColorFunctionTokenFast(state); __off = state.off;
    args.push(__child);
    if (__off === __before) break;
  }
  if (args.length < 1) { state.off = __off; throw new SyntaxError("expected at least 1 NumericColorFunctionToken"); }
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
  return { __production: "CssColorValue#2", name: name, args: args };
}

function parseCssColorValueFast__alt3(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "color" || __name_lc === "color-mix" || __name_lc === "hsl" || __name_lc === "hsla" || __name_lc === "hwb" || __name_lc === "lab" || __name_lc === "lch" || __name_lc === "light-dark" || __name_lc === "oklab" || __name_lc === "oklch")) { state.off = __off; throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + __name_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;

  const args: unknown[] = [];
  while (true) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    if (__input.charCodeAt(__off) === 41) {  break; }
    const __before = __off;
    state.off = __off; const __child = parseColorFunctionTokenFast(state); __off = state.off;
    args.push(__child);
    if (__off === __before) break;
  }
  if (args.length < 1) { state.off = __off; throw new SyntaxError("expected at least 1 ColorFunctionToken"); }
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
  return { __production: "CssColorValue#3", name: name, args: args };
}

function parseCssColorValueFast__alt4(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "var")) { state.off = __off; throw new SyntaxError("expected one of var at position " + __name_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  let args = '';
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
      if (__depth === 0 && (__c === 41)) break;
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
      args = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    args = __input.slice(__startOff, __lastNonWs);
    }
  }
  if (args.endsWith(",")) { state.off = __off; throw new SyntaxError("captured value ends with rejected suffix ','"); }
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
  return { __production: "CssColorValue#4", name: name, args: args };
}

function parseCssColorValueFast(state: State): unknown {
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
    return parseCssColorValueFast__alt1(state);
  } else if ((isCssIdentStart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c)) {
    state.off = __peek;
    { const r = trySpeculate(state, parseCssColorValueFast__alt0); if (r !== null) return r; }
    { const r = trySpeculate(state, parseCssColorValueFast__alt2); if (r !== null) return r; }
    { const r = trySpeculate(state, parseCssColorValueFast__alt3); if (r !== null) return r; }
    return parseCssColorValueFast__alt4(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseNumericColorFunctionTokenFast__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;
  let value;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  value = __input.slice(__value_s, __off);
  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after token at position " + __off); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 37)) { state.off = __off; throw new SyntaxError("expected " + "%" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "NumericColorFunctionToken#0", value: value };
}

function parseNumericColorFunctionTokenFast__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;
  let value;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  value = __input.slice(__value_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "NumericColorFunctionToken#1", value: value };
}

function parseNumericColorFunctionTokenFast__alt2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 47)) { state.off = __off; throw new SyntaxError("expected " + "/" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "NumericColorFunctionToken#2" };
}

function parseNumericColorFunctionTokenFast__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 44)) { state.off = __off; throw new SyntaxError("expected " + "," + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "NumericColorFunctionToken#3" };
}

function parseNumericColorFunctionTokenFast(state: State): unknown {
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
  if (__byte0 === 47) {
    return parseNumericColorFunctionTokenFast__alt2(state);
  } else if (__byte0 === 44) {
    return parseNumericColorFunctionTokenFast__alt3(state);
  } else if (isDigit(__input.charCodeAt(__peek))) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      if (__peek < __len && __input.charCodeAt(__peek) === 0x2e && __peek + 1 < __len && isDigit(__input.charCodeAt(__peek + 1))) {
        __peek++;
        while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      }
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 37) {
      return parseNumericColorFunctionTokenFast__alt0(state);
    }
    return parseNumericColorFunctionTokenFast__alt1(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseColorFunctionTokenFast__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;
  let value;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  value = __input.slice(__value_s, __off);
  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after token at position " + __off); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 37)) { state.off = __off; throw new SyntaxError("expected " + "%" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "ColorFunctionToken#0", value: value };
}

function parseColorFunctionTokenFast__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;
  let value;
  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  value = __input.slice(__value_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "ColorFunctionToken#1", value: value };
}

function parseColorFunctionTokenFast__alt2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;
  let value;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __value_s);
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
        __off - __value_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__value_s) | 32) === 0x75
        && (__input.charCodeAt(__value_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__value_s + 2) | 32) === 0x6c
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
  value = __input.slice(__value_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "ColorFunctionToken#2", value: value };
}

function parseColorFunctionTokenFast__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;
  let value;
  if (!((__input.charCodeAt(__off) === 0x22 || __input.charCodeAt(__off) === 0x27))) throw new SyntaxError("expected string at position " + __value_s);
    {
      const __quote = __input.charCodeAt(__off);
      __off++;
      while (__off < __len) {
        const __ch = __input.charCodeAt(__off);
        if (__ch === 0x5c) { __off += 2; continue; }
        if (__ch === __quote) { __off++; break; }
        if (__ch === 0x0a || __ch === 0x0d) break;
        __off++;
      }
    }
  value = __input.slice(__value_s, __off);
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "ColorFunctionToken#3", value: value };
}

function parseColorFunctionTokenFast__alt4(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 47)) { state.off = __off; throw new SyntaxError("expected " + "/" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "ColorFunctionToken#4" };
}

function parseColorFunctionTokenFast__alt5(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 44)) { state.off = __off; throw new SyntaxError("expected " + "," + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "ColorFunctionToken#5" };
}

function parseColorFunctionTokenFast(state: State): unknown {
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
  if (__byte0 === 47) {
    return parseColorFunctionTokenFast__alt4(state);
  } else if (__byte0 === 44) {
    return parseColorFunctionTokenFast__alt5(state);
  } else if (isDigit(__input.charCodeAt(__peek))) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      if (__peek < __len && __input.charCodeAt(__peek) === 0x2e && __peek + 1 < __len && isDigit(__input.charCodeAt(__peek + 1))) {
        __peek++;
        while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      }
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 37) {
      return parseColorFunctionTokenFast__alt0(state);
    }
    return parseColorFunctionTokenFast__alt1(state);
  } else if ((isCssIdentStart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c)) {
    return parseColorFunctionTokenFast__alt2(state);
  } else if ((__input.charCodeAt(__peek) === 0x22 || __input.charCodeAt(__peek) === 0x27)) {
    return parseColorFunctionTokenFast__alt3(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function parseCssColorFast(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  const value = parseCssColorValueFast(state);
  __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return { __production: "CssColor#0", value: value };
}

function validateCssColorValue__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;
  let value;
  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __value_s);
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
        __off - __value_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__value_s) | 32) === 0x75
        && (__input.charCodeAt(__value_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__value_s + 2) | 32) === 0x6c
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
  value = __input.slice(__value_s, __off);
  const __value_lc = value.toLowerCase();
  if (!(__value_lc === "aliceblue" || __value_lc === "black" || __value_lc === "blue" || __value_lc === "currentcolor" || __value_lc === "green" || __value_lc === "inherit" || __value_lc === "initial" || __value_lc === "red" || __value_lc === "revert" || __value_lc === "revert-layer" || __value_lc === "transparent" || __value_lc === "unset" || __value_lc === "white" || __value_lc === "yellow")) { state.off = __off; throw new SyntaxError("expected one of aliceblue, black, blue, currentcolor, green, inherit, initial, red, revert, revert-layer, transparent, unset, white, yellow at position " + __value_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateCssColorValue__alt1(state: State): unknown {
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
  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after literal at position " + __off); }
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
      if (__depth === 0 && (__c === 41 || __c === 44 || __c === 47)) break;
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
  if (!isHexString(value)) { state.off = __off; throw new SyntaxError("expected hex string at position " + state.__lastCaptureStart); }
  if (!(value.length === 3 || value.length === 4 || value.length === 6 || value.length === 8)) { state.off = __off; throw new SyntaxError("expected length 3, 4, 6, 8 at position " + state.__lastCaptureStart); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateCssColorValue__alt2(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "rgb" || __name_lc === "rgba")) { state.off = __off; throw new SyntaxError("expected one of rgb, rgba at position " + __name_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  let __count_args = 0;
  while (!(__input.charCodeAt(__off) === 41)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateNumericColorFunctionToken(state); __off = state.off;
    __count_args++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  if (__count_args < 1) { state.off = __off; throw new SyntaxError("expected at least 1 NumericColorFunctionToken"); }
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

function validateCssColorValue__alt3(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "color" || __name_lc === "color-mix" || __name_lc === "hsl" || __name_lc === "hsla" || __name_lc === "hwb" || __name_lc === "lab" || __name_lc === "lch" || __name_lc === "light-dark" || __name_lc === "oklab" || __name_lc === "oklch")) { state.off = __off; throw new SyntaxError("expected one of color, color-mix, hsl, hsla, hwb, lab, lch, light-dark, oklab, oklch at position " + __name_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  let __count_args = 0;
  while (!(__input.charCodeAt(__off) === 41)) {
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
    const __before = __off;
    state.off = __off; validateColorFunctionToken(state); __off = state.off;
    __count_args++;
    if (__off === __before) break;
    while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  }
  if (__count_args < 1) { state.off = __off; throw new SyntaxError("expected at least 1 ColorFunctionToken"); }
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

function validateCssColorValue__alt4(state: State): unknown {
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
  const __name_lc = name.toLowerCase();
  if (!(__name_lc === "var")) { state.off = __off; throw new SyntaxError("expected one of var at position " + __name_s); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 40)) { state.off = __off; throw new SyntaxError("expected " + "(" + " at position " + __off); }
  __off += 1;
  let args = '';
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
      if (__depth === 0 && (__c === 41)) break;
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
      args = '';
    } else {
      // Rewind __off to the trim boundary so trailing whitespace and
      // trailing comments (which were consumed during the scan) remain
      // available for the parent's next iteration. Matches tokenized's
      // captureUntil which rewinds state.pos past trailing comment tokens.
      __off = __lastNonWs;
    args = __input.slice(__startOff, __lastNonWs);
    }
  }
  if (args.endsWith(",")) { state.off = __off; throw new SyntaxError("captured value ends with rejected suffix ','"); }
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

function validateCssColorValue(state: State): unknown {
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
    return validateCssColorValue__alt1(state);
  } else if ((isCssIdentStart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c)) {
    state.off = __peek;
    { const r = trySpeculate(state, validateCssColorValue__alt0); if (r !== null) return r; }
    { const r = trySpeculate(state, validateCssColorValue__alt2); if (r !== null) return r; }
    { const r = trySpeculate(state, validateCssColorValue__alt3); if (r !== null) return r; }
    return validateCssColorValue__alt4(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function validateNumericColorFunctionToken__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;

  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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

  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after token at position " + __off); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 37)) { state.off = __off; throw new SyntaxError("expected " + "%" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateNumericColorFunctionToken__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;

  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  state.off = __off;
  return;
}

function validateNumericColorFunctionToken__alt2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 47)) { state.off = __off; throw new SyntaxError("expected " + "/" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateNumericColorFunctionToken__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 44)) { state.off = __off; throw new SyntaxError("expected " + "," + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateNumericColorFunctionToken(state: State): unknown {
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
  if (__byte0 === 47) {
    return validateNumericColorFunctionToken__alt2(state);
  } else if (__byte0 === 44) {
    return validateNumericColorFunctionToken__alt3(state);
  } else if (isDigit(__input.charCodeAt(__peek))) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      if (__peek < __len && __input.charCodeAt(__peek) === 0x2e && __peek + 1 < __len && isDigit(__input.charCodeAt(__peek + 1))) {
        __peek++;
        while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      }
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 37) {
      return validateNumericColorFunctionToken__alt0(state);
    }
    return validateNumericColorFunctionToken__alt1(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function validateColorFunctionToken__alt0(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;

  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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

  if (__off < __len && isAsciiWs(__input.charCodeAt(__off))) { state.off = __off; throw new SyntaxError("expected no whitespace after token at position " + __off); }
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 37)) { state.off = __off; throw new SyntaxError("expected " + "%" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateColorFunctionToken__alt1(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;

  if (!(isDigit(__input.charCodeAt(__off)))) throw new SyntaxError("expected number at position " + __value_s);
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
  state.off = __off;
  return;
}

function validateColorFunctionToken__alt2(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;

  if (!((isCssIdentStart(__input.charCodeAt(__off)) || __input.charCodeAt(__off) === 0x5c))) throw new SyntaxError("expected ident at position " + __value_s);
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
        __off - __value_s === 3
        && __off < __len
        && __input.charCodeAt(__off) === 0x28
        && (__input.charCodeAt(__value_s) | 32) === 0x75
        && (__input.charCodeAt(__value_s + 1) | 32) === 0x72
        && (__input.charCodeAt(__value_s + 2) | 32) === 0x6c
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
  state.off = __off;
  return;
}

function validateColorFunctionToken__alt3(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  const __value_s = __off;

  if (!((__input.charCodeAt(__off) === 0x22 || __input.charCodeAt(__off) === 0x27))) throw new SyntaxError("expected string at position " + __value_s);
    {
      const __quote = __input.charCodeAt(__off);
      __off++;
      while (__off < __len) {
        const __ch = __input.charCodeAt(__off);
        if (__ch === 0x5c) { __off += 2; continue; }
        if (__ch === __quote) { __off++; break; }
        if (__ch === 0x0a || __ch === 0x0d) break;
        __off++;
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

function validateColorFunctionToken__alt4(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 47)) { state.off = __off; throw new SyntaxError("expected " + "/" + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateColorFunctionToken__alt5(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  if (!(__input.charCodeAt(__off) === 44)) { state.off = __off; throw new SyntaxError("expected " + "," + " at position " + __off); }
  __off += 1;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

function validateColorFunctionToken(state: State): unknown {
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
  if (__byte0 === 47) {
    return validateColorFunctionToken__alt4(state);
  } else if (__byte0 === 44) {
    return validateColorFunctionToken__alt5(state);
  } else if (isDigit(__input.charCodeAt(__peek))) {
      while (__peek < __len) {
        const __c = __input.charCodeAt(__peek);
        if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
        break;
      }
      if (!(__peek < __len && isDigit(__input.charCodeAt(__peek)))) throw new SyntaxError('peek-scan: prefix mismatch at ' + __peek);
      __peek++;
      while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      if (__peek < __len && __input.charCodeAt(__peek) === 0x2e && __peek + 1 < __len && isDigit(__input.charCodeAt(__peek + 1))) {
        __peek++;
        while (__peek < __len && isDigit(__input.charCodeAt(__peek))) __peek++;
      }
    // Skip ws before the discriminator.
    while (__peek < __len) {
      const __c = __input.charCodeAt(__peek);
      if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { __peek++; continue; }
      break;
    }
    if (__input.charCodeAt(__peek) === 37) {
      return validateColorFunctionToken__alt0(state);
    }
    return validateColorFunctionToken__alt1(state);
  } else if ((isCssIdentStart(__input.charCodeAt(__peek)) || __input.charCodeAt(__peek) === 0x5c)) {
    return validateColorFunctionToken__alt2(state);
  } else if ((__input.charCodeAt(__peek) === 0x22 || __input.charCodeAt(__peek) === 0x27)) {
    return validateColorFunctionToken__alt3(state);
  }
  throw new SyntaxError('no production matched at position ' + __peek);
}

function validateCssColor(state: State): unknown {
  const __input = state.input;
  const __len = __input.length;
  let __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  validateCssColorValue(state);
  __off = state.off;
  while (__off < __len) {
    const __ws_c = __input.charCodeAt(__off);
    if (__ws_c === 0x20 || __ws_c === 0x09 || __ws_c === 0x0a || __ws_c === 0x0d) { __off++; continue; }
    break;
  }
  state.off = __off;
  return;
}

const __defaultTarget: string | undefined = undefined;

function __build_CssColorValue_0_ast(captures: any): any {
  return { type: "color-keyword", value: __renderSlot_ast(captures.value) };
}

function __build_CssColorValue_1_ast(captures: any): any {
  return { type: "hash-color", value: __renderSlot_ast(captures.value) };
}

function __build_CssColorValue_2_ast(captures: any): any {
  return { type: "rgb-color-function", name: __renderSlot_ast(captures.name), args: __renderSlot_ast(captures.args) };
}

function __build_CssColorValue_3_ast(captures: any): any {
  return { type: "color-function", name: __renderSlot_ast(captures.name), args: __renderSlot_ast(captures.args) };
}

function __build_CssColorValue_4_ast(captures: any): any {
  return { type: "var-function", name: __renderSlot_ast(captures.name), args: __renderSlot_ast(captures.args) };
}

function __build_NumericColorFunctionToken_0_ast(captures: any): any {
  return { type: "percentage", value: __renderSlot_ast(captures.value) };
}

function __build_NumericColorFunctionToken_1_ast(captures: any): any {
  return { type: "number", value: __renderSlot_ast(captures.value) };
}

function __build_NumericColorFunctionToken_2_ast(captures: any): any {
  return { type: "separator", value: "/" };
}

function __build_NumericColorFunctionToken_3_ast(captures: any): any {
  return { type: "separator", value: "," };
}

function __build_ColorFunctionToken_0_ast(captures: any): any {
  return { type: "percentage", value: __renderSlot_ast(captures.value) };
}

function __build_ColorFunctionToken_1_ast(captures: any): any {
  return { type: "number", value: __renderSlot_ast(captures.value) };
}

function __build_ColorFunctionToken_2_ast(captures: any): any {
  return { type: "ident", value: __renderSlot_ast(captures.value) };
}

function __build_ColorFunctionToken_3_ast(captures: any): any {
  return { type: "string", value: __renderSlot_ast(captures.value) };
}

function __build_ColorFunctionToken_4_ast(captures: any): any {
  return { type: "separator", value: "/" };
}

function __build_ColorFunctionToken_5_ast(captures: any): any {
  return { type: "separator", value: "," };
}

function __build_CssColor_0_ast(captures: any): any {
  return { type: "css-color", value: __renderSlot_ast(captures.value) };
}

function __dispatchRender_ast(captures: any): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "CssColorValue#0": return __build_CssColorValue_0_ast(captures);
    case "CssColorValue#1": return __build_CssColorValue_1_ast(captures);
    case "CssColorValue#2": return __build_CssColorValue_2_ast(captures);
    case "CssColorValue#3": return __build_CssColorValue_3_ast(captures);
    case "CssColorValue#4": return __build_CssColorValue_4_ast(captures);
    case "NumericColorFunctionToken#0": return __build_NumericColorFunctionToken_0_ast(captures);
    case "NumericColorFunctionToken#1": return __build_NumericColorFunctionToken_1_ast(captures);
    case "NumericColorFunctionToken#2": return __build_NumericColorFunctionToken_2_ast(captures);
    case "NumericColorFunctionToken#3": return __build_NumericColorFunctionToken_3_ast(captures);
    case "ColorFunctionToken#0": return __build_ColorFunctionToken_0_ast(captures);
    case "ColorFunctionToken#1": return __build_ColorFunctionToken_1_ast(captures);
    case "ColorFunctionToken#2": return __build_ColorFunctionToken_2_ast(captures);
    case "ColorFunctionToken#3": return __build_ColorFunctionToken_3_ast(captures);
    case "ColorFunctionToken#4": return __build_ColorFunctionToken_4_ast(captures);
    case "ColorFunctionToken#5": return __build_ColorFunctionToken_5_ast(captures);
    case "CssColor#0": return __build_CssColor_0_ast(captures);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
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

const __renderDispatch: Record<string, (captures: any) => any> = {
  "ast": (captures: any) => __dispatchRender_ast(captures),
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

function __rebuild_CssColorValue_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_CssColorValue_1(captures: any): string {
  return "#" + __rebuildSlot(captures.value);
}

function __rebuild_CssColorValue_2(captures: any): string {
  return __rebuildSlot(captures.name) + "(" + __rebuildSlot(captures.args, " ") + " " + ")";
}

function __rebuild_CssColorValue_3(captures: any): string {
  return __rebuildSlot(captures.name) + "(" + __rebuildSlot(captures.args, " ") + " " + ")";
}

function __rebuild_CssColorValue_4(captures: any): string {
  return __rebuildSlot(captures.name) + "(" + __rebuildSlot(captures.args) + ")";
}

function __rebuild_NumericColorFunctionToken_0(captures: any): string {
  return __rebuildSlot(captures.value) + "%";
}

function __rebuild_NumericColorFunctionToken_1(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_NumericColorFunctionToken_2(captures: any): string {
  return "/";
}

function __rebuild_NumericColorFunctionToken_3(captures: any): string {
  return ",";
}

function __rebuild_ColorFunctionToken_0(captures: any): string {
  return __rebuildSlot(captures.value) + "%";
}

function __rebuild_ColorFunctionToken_1(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_ColorFunctionToken_2(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_ColorFunctionToken_3(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __rebuild_ColorFunctionToken_4(captures: any): string {
  return "/";
}

function __rebuild_ColorFunctionToken_5(captures: any): string {
  return ",";
}

function __rebuild_CssColor_0(captures: any): string {
  return String(__rebuildSlot(captures.value));
}

function __invert_CssColorValue_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "color-keyword")) {
    throw new Error("stringify: field \"type\" expected \"color-keyword\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_CssColorValue_0(captures);
}

function __invert_CssColorValue_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "hash-color")) {
    throw new Error("stringify: field \"type\" expected \"hash-color\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_CssColorValue_1(captures);
}

function __invert_CssColorValue_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "rgb-color-function")) {
    throw new Error("stringify: field \"type\" expected \"rgb-color-function\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.args = __invertSlotFor_NumericColorFunctionToken_ast(value.args);
  return __rebuild_CssColorValue_2(captures);
}

function __invert_CssColorValue_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "color-function")) {
    throw new Error("stringify: field \"type\" expected \"color-function\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.args = __invertSlotFor_ColorFunctionToken_ast(value.args);
  return __rebuild_CssColorValue_3(captures);
}

function __invert_CssColorValue_4_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "var-function")) {
    throw new Error("stringify: field \"type\" expected \"var-function\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  captures.args = __invertSlotLeaf_ast(value.args);
  return __rebuild_CssColorValue_4(captures);
}

function __invert_NumericColorFunctionToken_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "percentage")) {
    throw new Error("stringify: field \"type\" expected \"percentage\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_NumericColorFunctionToken_0(captures);
}

function __invert_NumericColorFunctionToken_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "number")) {
    throw new Error("stringify: field \"type\" expected \"number\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_NumericColorFunctionToken_1(captures);
}

function __invert_NumericColorFunctionToken_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "separator")) {
    throw new Error("stringify: field \"type\" expected \"separator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "/")) {
    throw new Error("stringify: field \"value\" expected \"/\", got " + JSON.stringify(value.value));
  }
  return __rebuild_NumericColorFunctionToken_2(captures);
}

function __invert_NumericColorFunctionToken_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "separator")) {
    throw new Error("stringify: field \"type\" expected \"separator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, ",")) {
    throw new Error("stringify: field \"value\" expected \",\", got " + JSON.stringify(value.value));
  }
  return __rebuild_NumericColorFunctionToken_3(captures);
}

function __invert_ColorFunctionToken_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "percentage")) {
    throw new Error("stringify: field \"type\" expected \"percentage\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_ColorFunctionToken_0(captures);
}

function __invert_ColorFunctionToken_1_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "number")) {
    throw new Error("stringify: field \"type\" expected \"number\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_ColorFunctionToken_1(captures);
}

function __invert_ColorFunctionToken_2_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "ident")) {
    throw new Error("stringify: field \"type\" expected \"ident\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_ColorFunctionToken_2(captures);
}

function __invert_ColorFunctionToken_3_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "string")) {
    throw new Error("stringify: field \"type\" expected \"string\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotLeaf_ast(value.value);
  return __rebuild_ColorFunctionToken_3(captures);
}

function __invert_ColorFunctionToken_4_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "separator")) {
    throw new Error("stringify: field \"type\" expected \"separator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, "/")) {
    throw new Error("stringify: field \"value\" expected \"/\", got " + JSON.stringify(value.value));
  }
  return __rebuild_ColorFunctionToken_4(captures);
}

function __invert_ColorFunctionToken_5_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "separator")) {
    throw new Error("stringify: field \"type\" expected \"separator\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.value, ",")) {
    throw new Error("stringify: field \"value\" expected \",\", got " + JSON.stringify(value.value));
  }
  return __rebuild_ColorFunctionToken_5(captures);
}

function __invert_CssColor_0_ast(value: any): string {
  const captures: any = {};
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "css-color")) {
    throw new Error("stringify: field \"type\" expected \"css-color\", got " + JSON.stringify(value.type));
  }
  captures.value = __invertSlotFor_CssColorValue_ast(value.value);
  return __rebuild_CssColor_0(captures);
}

function __dispatchInverse_CssColorValue_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "color-keyword")) return __invert_CssColorValue_0_ast(value);
    if (Object.is(value.type, "hash-color")) return __invert_CssColorValue_1_ast(value);
    if (Object.is(value.type, "rgb-color-function")) return __invert_CssColorValue_2_ast(value);
    if (Object.is(value.type, "color-function")) return __invert_CssColorValue_3_ast(value);
    if (Object.is(value.type, "var-function")) return __invert_CssColorValue_4_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_NumericColorFunctionToken_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "percentage")) return __invert_NumericColorFunctionToken_0_ast(value);
    if (Object.is(value.type, "number")) return __invert_NumericColorFunctionToken_1_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, "/")) return __invert_NumericColorFunctionToken_2_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, ",")) return __invert_NumericColorFunctionToken_3_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ColorFunctionToken_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "percentage")) return __invert_ColorFunctionToken_0_ast(value);
    if (Object.is(value.type, "number")) return __invert_ColorFunctionToken_1_ast(value);
    if (Object.is(value.type, "ident")) return __invert_ColorFunctionToken_2_ast(value);
    if (Object.is(value.type, "string")) return __invert_ColorFunctionToken_3_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, "/")) return __invert_ColorFunctionToken_4_ast(value);
    if (Object.is(value.type, "separator") && Object.is(value.value, ",")) return __invert_ColorFunctionToken_5_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_CssColor_ast(value: any): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "css-color")) return __invert_CssColor_0_ast(value);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_CssColor_ast(value);
}

function __invertSlotFor_CssColorValue_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CssColorValue_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CssColorValue_ast(v);
  return String(v);
}

function __invertSlotFor_NumericColorFunctionToken_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_NumericColorFunctionToken_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_NumericColorFunctionToken_ast(v);
  return String(v);
}

function __invertSlotFor_ColorFunctionToken_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_ColorFunctionToken_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_ColorFunctionToken_ast(v);
  return String(v);
}

function __invertSlotFor_CssColor_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotFor_CssColor_ast(v[i]);
      if (r != null) out.push(r);
    }
    return out;
  }
  if (typeof v === "object") return __dispatchInverse_CssColor_ast(v);
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

const __inverseDispatch: Record<string, (value: any) => string> = {
  "ast": __dispatchInverse_ast,
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
    const result = mode === 'raws' ? parseCssColor(state) : parseCssColorFast(state);
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
    validateCssColor(state);
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
  module: "@parser2/css-color",
  exportName: 'validate',
};

