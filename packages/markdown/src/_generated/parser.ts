// Auto-generated from packages/markdown/src/schema.ts
// Do not edit by hand. Re-run `npm run generate` to refresh.
// (v2 scannerless emit — see docs/scannerless-emit-v2.md)
/* eslint-disable */
// @ts-nocheck


export type ParseMode = 'fast' | 'raws';
// Emitted whenever a `.recovers({ drop, syncAt })` production matched.
// `code` distinguishes the diagnostic shape; `drop` is the schema-declared
// label; `start`/`end` are byte offsets into the parsed input demarcating
// the dropped region.
export type Diagnostic = {
  readonly code: string;
  readonly drop: string;
  readonly start: number;
  readonly end: number;
};
export type ParseOptions = {
  readonly mode?: ParseMode;
  readonly validate?: boolean;
  // Invoked once per recovered production, after the parse has succeeded.
  // Suppressed when the parse ultimately fails (a diagnostic for a region
  // inside an alt that the dispatcher later rolled back would be misleading
  // — only diagnostics from the production path that produced the final
  // result are surfaced).
  readonly onDiagnostic?: (d: Diagnostic) => void;
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
  // Recovery diagnostics accumulated during this parse. A recovery
  // production pushes one entry just before its successful return.
  // Speculation rewinds truncate the list back to a pre-entry snapshot
  // when the speculating alt returns null — see emitProduction.
  diagnostics: Diagnostic[];
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

// JSON-style escape decoder for `.string().coerce()` captures. The input
// slice INCLUDES the surrounding quote chars; this strips them, processes
// the standard escape set, and returns the parsed JS string. Schema-
// agnostic — used only when a string-class span explicitly opts in via
// `.coerce()`. String.fromCharCode is used for emitted escapes so the
// preamble template literal doesn't need backslash gymnastics.
function decodeJsonString(slice: string): string {
  const len = slice.length;
  if (len < 2) return slice;
  const out: string[] = [];
  let i = 1;
  const end = len - 1;
  while (i < end) {
    const c = slice.charCodeAt(i);
    if (c !== 0x5c) { out.push(slice[i]!); i++; continue; }
    if (i + 1 >= end) break;
    const esc = slice.charCodeAt(i + 1);
    switch (esc) {
      case 0x22: out.push(String.fromCharCode(0x22)); i += 2; break; // "
      case 0x27: out.push(String.fromCharCode(0x27)); i += 2; break; // '
      case 0x5c: out.push(String.fromCharCode(0x5c)); i += 2; break; // backslash
      case 0x2f: out.push(String.fromCharCode(0x2f)); i += 2; break; // /
      case 0x62: out.push(String.fromCharCode(0x08)); i += 2; break; // \b → 0x08
      case 0x66: out.push(String.fromCharCode(0x0c)); i += 2; break; // \f → 0x0c
      case 0x6e: out.push(String.fromCharCode(0x0a)); i += 2; break; // \n → 0x0a
      case 0x72: out.push(String.fromCharCode(0x0d)); i += 2; break; // \r → 0x0d
      case 0x74: out.push(String.fromCharCode(0x09)); i += 2; break; // \t → 0x09
      case 0x75: {
        // \uXXXX hex code unit.
        const hex = slice.slice(i + 2, i + 6);
        out.push(String.fromCharCode(parseInt(hex, 16)));
        i += 6;
        break;
      }
      default:
        out.push(slice[i + 1]!);
        i += 2;
    }
  }
  return out.join('');
}

// JSON-style escape encoder for the inverse of `.string().coerce()`. Given
// a JS string value, produces a double-quoted, escape-encoded source
// representation that matches `JSON.stringify(value)` for the basic set.
function encodeJsonString(value: string): string {
  let out = String.fromCharCode(0x22); // opening "
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c === 0x22) {
      out += String.fromCharCode(0x5c) + String.fromCharCode(0x22); // \"
    } else if (c === 0x5c) {
      out += String.fromCharCode(0x5c) + String.fromCharCode(0x5c); // \\
    } else if (c === 0x08) {
      out += String.fromCharCode(0x5c) + 'b';
    } else if (c === 0x09) {
      out += String.fromCharCode(0x5c) + 't';
    } else if (c === 0x0a) {
      out += String.fromCharCode(0x5c) + 'n';
    } else if (c === 0x0c) {
      out += String.fromCharCode(0x5c) + 'f';
    } else if (c === 0x0d) {
      out += String.fromCharCode(0x5c) + 'r';
    } else if (c < 0x20) {
      out += String.fromCharCode(0x5c) + 'u' + c.toString(16).padStart(4, '0');
    } else {
      out += value[i];
    }
  }
  out += String.fromCharCode(0x22); // closing "
  return out;
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

// --- Inferred types ---
export type MarkdownDocument_ast = { type: "document"; children: (MarkdownLeaf_ast | MarkdownParagraph_ast)[] };
export type MarkdownDocument_html = string;
export type MarkdownDocument_source = string;
export type MarkdownLeaf_ast = { type: "heading"; depth: 6; text: string } | { type: "heading"; depth: 5; text: string } | { type: "heading"; depth: 4; text: string } | { type: "heading"; depth: 3; text: string } | { type: "heading"; depth: 2; text: string } | { type: "heading"; depth: 1; text: string } | { type: "heading"; depth: 1; text: string; style: "setext" } | { type: "heading"; depth: 2; text: string; style: "setext" } | { type: "thematic-break"; marker: "*" } | { type: "thematic-break"; marker: "_" } | { type: "thematic-break" } | { type: "task-list-item"; checked: true; marker: "x"; text: string } | { type: "task-list-item"; checked: false; text: string } | { type: "list-item"; ordered: false; marker: "+"; text: string } | { type: "list-item"; ordered: false; marker: "*"; text: string } | { type: "list-item"; ordered: false; text: string } | { type: "list-item"; ordered: true; index: string; text: string } | { type: "blockquote"; text: string } | { type: "code-block"; lang: string; text: string } | { type: "code-block"; text: string } | { type: "bold"; text: string } | { type: "italic"; text: string } | { type: "strikethrough"; text: string } | { type: "inline-code"; text: string } | { type: "link"; label: string; url: string } | { type: "reference-link"; label: string; id: string } | { type: "image"; alt: string; url: string } | { type: "reference-image"; alt: string; id: string } | { type: "entity"; name: string } | { type: "table-delimiter"; variant: "plain"; align: ["default", "default"] } | { type: "table-delimiter"; variant: "aligned"; align: ["left", "right"] } | { type: "table-row"; cells: [string, string] } | { type: "definition"; id: string; url: string } | { type: "footnote-definition"; id: string; text: string } | { type: "footnote-reference"; id: string } | { type: "html"; tag: string; text: string; closingTag: string } | { type: "autolink"; url: string };
export type MarkdownLeaf_html = string;
export type MarkdownLeaf_source = string;
export type MarkdownParagraph_ast = { type: "paragraph"; text: string };
export type MarkdownParagraph_html = string;
export type MarkdownParagraph_source = string;

function parseMarkdownDocument(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  const __children_start = off;
  const children: unknown[] = [];
  const __children_iws: string[] | null = state.mode === 'raws' ? [] : null;
  let __children_prevItemEnd = -1;
  while (true) {
    const __loopStart = off;
    while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
    let __cand: unknown = null;
    const __itemStart = off;
    while (off < len) {
      const __wc = input.charCodeAt(off);
      if (__wc === 0x20 || __wc === 0x09 || __wc === 0x0a || __wc === 0x0d) { off++; continue; }
      break;
    }
    state.pos = off;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
      __cand = parseMarkdownLeaf(state);
      if (__cand === null) { __cand = parseMarkdownParagraph(state); }
    }
    if (__cand !== null) { off = state.pos; }
    if (__cand === null) break;
    if (__children_prevItemEnd >= 0 && __children_iws !== null) __children_iws.push(input.slice(__children_prevItemEnd, __itemStart));
    children.push(__cand);
    __children_prevItemEnd = off;
    if (off === __loopStart) break;
  }
  const __children_end = off;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownDocument#0", __ws: __ws, __litPres: __litPres, children_iws: __children_iws, children: children };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownDocument#0", children: children };
}

function parseMarkdownLeaf__alt0(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("######", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#0", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#0", text: text };
}

function parseMarkdownLeaf__alt1(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("#####", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#1", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#1", text: text };
}

function parseMarkdownLeaf__alt2(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("####", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#2", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#2", text: text };
}

function parseMarkdownLeaf__alt3(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("###", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#3", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#3", text: text };
}

function parseMarkdownLeaf__alt4(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 35 && input.charCodeAt(off + 1) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#4", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#4", text: text };
}

function parseMarkdownLeaf__alt5(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#5", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#5", text: text };
}

function parseMarkdownLeaf__alt6(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.startsWith("===", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#6", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#6", text: text };
}

function parseMarkdownLeaf__alt7(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#7", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#7", text: text };
}

function parseMarkdownLeaf__alt8(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("***", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#8", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#8" };
}

function parseMarkdownLeaf__alt9(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("___", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#9", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#9" };
}

function parseMarkdownLeaf__alt10(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#10", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#10" };
}

function parseMarkdownLeaf__alt11(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("- [x]", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#11", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#11", text: text };
}

function parseMarkdownLeaf__alt12(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("- [ ]", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#12", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#12", text: text };
}

function parseMarkdownLeaf__alt13(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 43 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#13", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#13", text: text };
}

function parseMarkdownLeaf__alt14(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#14", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#14", text: text };
}

function parseMarkdownLeaf__alt15(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 45 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#15", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#15", text: text };
}

function parseMarkdownLeaf__alt16(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __index_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __index_end = off;
  const index = input.slice(__index_start, __index_end);
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 46)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#16", __ws: __ws, __litPres: __litPres, index: index, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#16", index: index, text: text };
}

function parseMarkdownLeaf__alt17(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#17", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#17", text: text };
}

function parseMarkdownLeaf__alt18(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __lang_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __lang_end = off;
  const lang = input.slice(__lang_start, __lang_end);
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let body: string = '';
  let __body_start = off;
  let __body_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __body_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if ((__c === 96 && input.startsWith("```", off))) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __body_start;
    if (__lastNonWs === __body_start) {
      off = __emptyAnchor;
      body = '';
    } else {
      off = __lastNonWs;
      body = input.slice(__body_start, __lastNonWs);
    }
    __body_end = off;
  }
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#18", __ws: __ws, __litPres: __litPres, lang: lang, body: body };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#18", lang: lang, body: body };
}

function parseMarkdownLeaf__alt19(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.startsWith("```\n", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let body: string = '';
  let __body_start = off;
  let __body_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __body_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if ((__c === 96 && input.startsWith("```", off))) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __body_start;
    if (__lastNonWs === __body_start) {
      off = __emptyAnchor;
      body = '';
    } else {
      off = __lastNonWs;
      body = input.slice(__body_start, __lastNonWs);
    }
    __body_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#19", __ws: __ws, __litPres: __litPres, body: body };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#19", body: body };
}

function parseMarkdownLeaf__alt20(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if ((__c === 42 && input.startsWith("**", off))) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#20", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#20", text: text };
}

function parseMarkdownLeaf__alt21(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 42) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#21", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#21", text: text };
}

function parseMarkdownLeaf__alt22(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 126 && input.charCodeAt(off + 1) === 126)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if ((__c === 126 && input.startsWith("~~", off))) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 126 && input.charCodeAt(off + 1) === 126)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#22", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#22", text: text };
}

function parseMarkdownLeaf__alt23(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 96)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 96) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 96)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#23", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#23", text: text };
}

function parseMarkdownLeaf__alt24(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let label: string = '';
  let __label_start = off;
  let __label_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __label_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __label_start;
    if (__lastNonWs === __label_start) {
      off = __emptyAnchor;
      label = '';
    } else {
      off = __lastNonWs;
      label = input.slice(__label_start, __lastNonWs);
    }
    __label_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  let url: string = '';
  let __url_start = off;
  let __url_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __url_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 41) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __url_start;
    if (__lastNonWs === __url_start) {
      off = __emptyAnchor;
      url = '';
    } else {
      off = __lastNonWs;
      url = input.slice(__url_start, __lastNonWs);
    }
    __url_end = off;
  }
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#24", __ws: __ws, __litPres: __litPres, label: label, url: url };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#24", label: label, url: url };
}

function parseMarkdownLeaf__alt25(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let label: string = '';
  let __label_start = off;
  let __label_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __label_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __label_start;
    if (__lastNonWs === __label_start) {
      off = __emptyAnchor;
      label = '';
    } else {
      off = __lastNonWs;
      label = input.slice(__label_start, __lastNonWs);
    }
    __label_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 93 && input.charCodeAt(off + 1) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#25", __ws: __ws, __litPres: __litPres, label: label, id: id };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#25", label: label, id: id };
}

function parseMarkdownLeaf__alt26(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let alt: string = '';
  let __alt_start = off;
  let __alt_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __alt_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __alt_start;
    if (__lastNonWs === __alt_start) {
      off = __emptyAnchor;
      alt = '';
    } else {
      off = __lastNonWs;
      alt = input.slice(__alt_start, __lastNonWs);
    }
    __alt_end = off;
  }
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  let url: string = '';
  let __url_start = off;
  let __url_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __url_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 41) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __url_start;
    if (__lastNonWs === __url_start) {
      off = __emptyAnchor;
      url = '';
    } else {
      off = __lastNonWs;
      url = input.slice(__url_start, __lastNonWs);
    }
    __url_end = off;
  }
  const __wsStart_6 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_6, off));
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#26", __ws: __ws, __litPres: __litPres, alt: alt, url: url };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#26", alt: alt, url: url };
}

function parseMarkdownLeaf__alt27(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  let alt: string = '';
  let __alt_start = off;
  let __alt_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __alt_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __alt_start;
    if (__lastNonWs === __alt_start) {
      off = __emptyAnchor;
      alt = '';
    } else {
      off = __lastNonWs;
      alt = input.slice(__alt_start, __lastNonWs);
    }
    __alt_end = off;
  }
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 93 && input.charCodeAt(off + 1) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#27", __ws: __ws, __litPres: __litPres, alt: alt, id: id };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#27", alt: alt, id: id };
}

function parseMarkdownLeaf__alt28(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 38)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#28", __ws: __ws, __litPres: __litPres, name: name };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#28", name: name };
}

function parseMarkdownLeaf__alt29(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#29", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#29" };
}

function parseMarkdownLeaf__alt30(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_6 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_6, off));
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#30", __ws: __ws, __litPres: __litPres };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#30" };
}

function parseMarkdownLeaf__alt31(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let first: string = '';
  let __first_start = off;
  let __first_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __first_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 124) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __first_start;
    if (__lastNonWs === __first_start) {
      off = __emptyAnchor;
      first = '';
    } else {
      off = __lastNonWs;
      first = input.slice(__first_start, __lastNonWs);
    }
    __first_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  let second: string = '';
  let __second_start = off;
  let __second_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __second_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 124) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __second_start;
    if (__lastNonWs === __second_start) {
      off = __emptyAnchor;
      second = '';
    } else {
      off = __lastNonWs;
      second = input.slice(__second_start, __lastNonWs);
    }
    __second_end = off;
  }
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#31", __ws: __ws, __litPres: __litPres, first: first, second: second };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#31", first: first, second: second };
}

function parseMarkdownLeaf__alt32(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  let url: string = '';
  let __url_start = off;
  let __url_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __url_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __url_start;
    if (__lastNonWs === __url_start) {
      off = __emptyAnchor;
      url = '';
    } else {
      off = __lastNonWs;
      url = input.slice(__url_start, __lastNonWs);
    }
    __url_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#32", __ws: __ws, __litPres: __litPres, id: id, url: url };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#32", id: id, url: url };
}

function parseMarkdownLeaf__alt33(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 91 && input.charCodeAt(off + 1) === 94)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#33", __ws: __ws, __litPres: __litPres, id: id, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#33", id: id, text: text };
}

function parseMarkdownLeaf__alt34(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 91 && input.charCodeAt(off + 1) === 94)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#34", __ws: __ws, __litPres: __litPres, id: id };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#34", id: id };
}

function parseMarkdownLeaf__alt35(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "div" || tag.toLowerCase() === "span" || tag.toLowerCase() === "p" || tag.toLowerCase() === "pre" || tag.toLowerCase() === "code" || tag.toLowerCase() === "blockquote" || tag.toLowerCase() === "a" || tag.toLowerCase() === "img" || tag.toLowerCase() === "br" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "ul" || tag.toLowerCase() === "ol" || tag.toLowerCase() === "li" || tag.toLowerCase() === "dl" || tag.toLowerCase() === "dt" || tag.toLowerCase() === "dd" || tag.toLowerCase() === "table" || tag.toLowerCase() === "thead" || tag.toLowerCase() === "tbody" || tag.toLowerCase() === "tfoot" || tag.toLowerCase() === "tr" || tag.toLowerCase() === "td" || tag.toLowerCase() === "th" || tag.toLowerCase() === "caption" || tag.toLowerCase() === "figure" || tag.toLowerCase() === "figcaption" || tag.toLowerCase() === "section" || tag.toLowerCase() === "article" || tag.toLowerCase() === "header" || tag.toLowerCase() === "footer" || tag.toLowerCase() === "nav" || tag.toLowerCase() === "aside" || tag.toLowerCase() === "main" || tag.toLowerCase() === "address" || tag.toLowerCase() === "details" || tag.toLowerCase() === "summary" || tag.toLowerCase() === "h1" || tag.toLowerCase() === "h2" || tag.toLowerCase() === "h3" || tag.toLowerCase() === "h4" || tag.toLowerCase() === "h5" || tag.toLowerCase() === "h6" || tag.toLowerCase() === "em" || tag.toLowerCase() === "strong" || tag.toLowerCase() === "i" || tag.toLowerCase() === "b" || tag.toLowerCase() === "u" || tag.toLowerCase() === "s" || tag.toLowerCase() === "small" || tag.toLowerCase() === "sub" || tag.toLowerCase() === "sup" || tag.toLowerCase() === "kbd" || tag.toLowerCase() === "var" || tag.toLowerCase() === "samp" || tag.toLowerCase() === "cite" || tag.toLowerCase() === "q" || tag.toLowerCase() === "dfn" || tag.toLowerCase() === "abbr" || tag.toLowerCase() === "time" || tag.toLowerCase() === "mark" || tag.toLowerCase() === "ruby" || tag.toLowerCase() === "rt" || tag.toLowerCase() === "rp" || tag.toLowerCase() === "bdi" || tag.toLowerCase() === "bdo" || tag.toLowerCase() === "wbr" || tag.toLowerCase() === "form" || tag.toLowerCase() === "input" || tag.toLowerCase() === "button" || tag.toLowerCase() === "select" || tag.toLowerCase() === "option" || tag.toLowerCase() === "optgroup" || tag.toLowerCase() === "textarea" || tag.toLowerCase() === "label" || tag.toLowerCase() === "fieldset" || tag.toLowerCase() === "legend" || tag.toLowerCase() === "datalist" || tag.toLowerCase() === "output" || tag.toLowerCase() === "progress" || tag.toLowerCase() === "meter" || tag.toLowerCase() === "video" || tag.toLowerCase() === "audio" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "canvas" || tag.toLowerCase() === "svg" || tag.toLowerCase() === "math" || tag.toLowerCase() === "iframe" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "object" || tag.toLowerCase() === "param" || tag.toLowerCase() === "picture" || tag.toLowerCase() === "script" || tag.toLowerCase() === "style" || tag.toLowerCase() === "noscript" || tag.toLowerCase() === "template" || tag.toLowerCase() === "html" || tag.toLowerCase() === "head" || tag.toLowerCase() === "body" || tag.toLowerCase() === "title" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "link" || tag.toLowerCase() === "base")) { state.pos = entryOff; return null; }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_3 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_3, off));
  let body: string = '';
  let __body_start = off;
  let __body_end = off;
  {
    __body_start = off;
    let __earliest = len;
    for (let __i = __body_start; __i < len; __i++) {
      const __c = input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < len && input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    off = __earliest;
    __body_end = off;
    body = input.slice(__body_start, __body_end);
  }
  const __wsStart_4 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_4, off));
  if (!(input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  const __wsStart_5 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_5, off));
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __closingTag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __closingTag_end = off;
  const closingTag = input.slice(__closingTag_start, __closingTag_end);
  const __wsStart_6 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_6, off));
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#35", __ws: __ws, __litPres: __litPres, tag: tag, body: body, closingTag: closingTag };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#35", tag: tag, body: body, closingTag: closingTag };
}

function parseMarkdownLeaf__alt36(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  const __wsStart_1 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_1, off));
  let url: string = '';
  let __url_start = off;
  let __url_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __url_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 62) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __url_start;
    if (__lastNonWs === __url_start) {
      off = __emptyAnchor;
      url = '';
    } else {
      off = __lastNonWs;
      url = input.slice(__url_start, __lastNonWs);
    }
    __url_end = off;
  }
  const __wsStart_2 = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (__ws !== null) __ws.push(input.slice(__wsStart_2, off));
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownLeaf#36", __ws: __ws, __litPres: __litPres, url: url };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownLeaf#36", url: url };
}

function parseMarkdownLeaf(state: State): unknown {
  { const r = parseMarkdownLeaf__alt0(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt1(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt2(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt3(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt4(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt5(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt6(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt7(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt8(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt9(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt11(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt12(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt10(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt13(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt14(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt15(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt16(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt17(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt19(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt18(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt20(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt21(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt22(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt23(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt33(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt34(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt26(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt27(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt28(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt29(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt30(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt31(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt24(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt25(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt32(state); if (r !== null) return r; }
  { const r = parseMarkdownLeaf__alt35(state); if (r !== null) return r; }
  return parseMarkdownLeaf__alt36(state);
}

function parseMarkdownParagraph(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const __ws: string[] | null = state.mode === 'raws' ? [] : null;
  const __litPres: boolean[] | null = state.mode === 'raws' ? [] : null;
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    {
      let __acState = 0;
      const __acLen = input.length;
      let __acBest = -1;
      const __acMaxLen = 4;
      while (off < __acLen) {
        const __acC = input.charCodeAt(off);
        switch (__acState) {
          case 0: {
            if (__acC === 10) { __acState = 1; break; }
            else { break; }
          }
          case 1: {
            if (__acC === 10) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 2;
              break;
            }
            else if (__acC === 35) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 3;
              break;
            }
            else if (__acC === 42) { __acState = 10; break; }
            else if (__acC === 43) { __acState = 8; break; }
            else if (__acC === 45) { __acState = 5; break; }
            else if (__acC === 61) { __acState = 23; break; }
            else if (__acC === 62) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 4;
              break;
            }
            else if (__acC === 91) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 26;
              break;
            }
            else if (__acC === 95) { __acState = 20; break; }
            else if (__acC === 96) { __acState = 12; break; }
            else if (__acC === 124) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 15;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 2: {
            if (__acC === 10) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 2;
              break;
            }
            else if (__acC === 35) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 3;
              break;
            }
            else if (__acC === 42) { __acState = 10; break; }
            else if (__acC === 43) { __acState = 8; break; }
            else if (__acC === 45) { __acState = 5; break; }
            else if (__acC === 61) { __acState = 23; break; }
            else if (__acC === 62) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 4;
              break;
            }
            else if (__acC === 91) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 26;
              break;
            }
            else if (__acC === 95) { __acState = 20; break; }
            else if (__acC === 96) { __acState = 12; break; }
            else if (__acC === 124) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 15;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 3: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 4: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 5: {
            if (__acC === 10) {
              const __acStart = off - 2;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 7;
              break;
            }
            else if (__acC === 32) {
              const __acStart = off - 2;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 6;
              break;
            }
            else if (__acC === 45) { __acState = 16; break; }
            else { __acState = 0; continue; }
          }
          case 6: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 7: {
            if (__acC === 10) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 2;
              break;
            }
            else if (__acC === 35) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 3;
              break;
            }
            else if (__acC === 42) { __acState = 10; break; }
            else if (__acC === 43) { __acState = 8; break; }
            else if (__acC === 45) { __acState = 5; break; }
            else if (__acC === 61) { __acState = 23; break; }
            else if (__acC === 62) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 4;
              break;
            }
            else if (__acC === 91) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 26;
              break;
            }
            else if (__acC === 95) { __acState = 20; break; }
            else if (__acC === 96) { __acState = 12; break; }
            else if (__acC === 124) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 15;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 8: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 32) {
              const __acStart = off - 2;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 9;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 9: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 10: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 32) {
              const __acStart = off - 2;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 11;
              break;
            }
            else if (__acC === 42) { __acState = 18; break; }
            else { __acState = 0; continue; }
          }
          case 11: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 12: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 96) { __acState = 13; break; }
            else { __acState = 0; continue; }
          }
          case 13: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 96) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 14;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 14: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 15: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 16: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 45) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 17;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 17: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 18: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 42) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 19;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 19: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 20: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 95) { __acState = 21; break; }
            else { __acState = 0; continue; }
          }
          case 21: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 95) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 22;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 22: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 23: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 61) { __acState = 24; break; }
            else { __acState = 0; continue; }
          }
          case 24: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 61) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 25;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 25: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 26: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
        }
        off++;
        if (__acBest !== -1 && off >= __acBest + __acMaxLen) break;
      }
      off = __acBest === -1 ? __acLen : __acBest;
    }
    __lastNonWs = off;
    while (__lastNonWs > __text_start) {
      const __wc = input.charCodeAt(__lastNonWs - 1);
      if (__wc !== 0x20 && __wc !== 0x09 && __wc !== 0x0a && __wc !== 0x0d) break;
      __lastNonWs--;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  if (state.mode === 'raws') {
    const __captures: any = { __production: "MarkdownParagraph#0", __ws: __ws, __litPres: __litPres, text: text };
    if (__captures && typeof __captures === 'object' && !Array.isArray(__captures)) __captures.source = makeSource(state, entryOff, off);
    return __captures;
  }
  return { __production: "MarkdownParagraph#0", text: text };
}

const __defaultTarget: string | undefined = undefined;

function __build_MarkdownDocument_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "document", children: __renderSlot_ast(captures.children, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres, children_iws: captures.children_iws } }) : { type: "document", children: __renderSlot_ast(captures.children, __indentCol) });
}

function __build_MarkdownDocument_0_html(captures: any, __indentCol: number = 0): any {
  return String((captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map((c: any) => __renderSlot_html(c, __indentCol)).join(" ") : (__renderSlot_html(captures.children, __indentCol) ?? ""))));
}

function __build_MarkdownDocument_0_source(captures: any, __indentCol: number = 0): any {
  return String((captures.children == null ? "" : (Array.isArray(captures.children) ? captures.children.map((c: any) => __renderSlot_source(c, __indentCol)).join(" ") : (__renderSlot_source(captures.children, __indentCol) ?? ""))));
}

function __build_MarkdownLeaf_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "heading", depth: 6, text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "heading", depth: 6, text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_0_html(captures: any, __indentCol: number = 0): any {
  return "<h6>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</h6>";
}

function __build_MarkdownLeaf_0_source(captures: any, __indentCol: number = 0): any {
  return "###### " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_1_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "heading", depth: 5, text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "heading", depth: 5, text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_1_html(captures: any, __indentCol: number = 0): any {
  return "<h5>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</h5>";
}

function __build_MarkdownLeaf_1_source(captures: any, __indentCol: number = 0): any {
  return "##### " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_2_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "heading", depth: 4, text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "heading", depth: 4, text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_2_html(captures: any, __indentCol: number = 0): any {
  return "<h4>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</h4>";
}

function __build_MarkdownLeaf_2_source(captures: any, __indentCol: number = 0): any {
  return "#### " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_3_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "heading", depth: 3, text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "heading", depth: 3, text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_3_html(captures: any, __indentCol: number = 0): any {
  return "<h3>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</h3>";
}

function __build_MarkdownLeaf_3_source(captures: any, __indentCol: number = 0): any {
  return "### " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_4_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "heading", depth: 2, text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "heading", depth: 2, text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_4_html(captures: any, __indentCol: number = 0): any {
  return "<h2>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</h2>";
}

function __build_MarkdownLeaf_4_source(captures: any, __indentCol: number = 0): any {
  return "## " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_5_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "heading", depth: 1, text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "heading", depth: 1, text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_5_html(captures: any, __indentCol: number = 0): any {
  return "<h1>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</h1>";
}

function __build_MarkdownLeaf_5_source(captures: any, __indentCol: number = 0): any {
  return "# " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_6_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "heading", depth: 1, text: __renderSlot_ast(captures.text, __indentCol), style: "setext" }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "heading", depth: 1, text: __renderSlot_ast(captures.text, __indentCol), style: "setext" });
}

function __build_MarkdownLeaf_6_html(captures: any, __indentCol: number = 0): any {
  return "<h1>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</h1>";
}

function __build_MarkdownLeaf_6_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.text, __indentCol) ?? "") + " ===";
}

function __build_MarkdownLeaf_7_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "heading", depth: 2, text: __renderSlot_ast(captures.text, __indentCol), style: "setext" }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "heading", depth: 2, text: __renderSlot_ast(captures.text, __indentCol), style: "setext" });
}

function __build_MarkdownLeaf_7_html(captures: any, __indentCol: number = 0): any {
  return "<h2>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</h2>";
}

function __build_MarkdownLeaf_7_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.text, __indentCol) ?? "") + " ---";
}

function __build_MarkdownLeaf_8_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "thematic-break", marker: "*" }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "thematic-break", marker: "*" });
}

function __build_MarkdownLeaf_8_html(captures: any, __indentCol: number = 0): any {
  return String("<hr>");
}

function __build_MarkdownLeaf_8_source(captures: any, __indentCol: number = 0): any {
  return String("***");
}

function __build_MarkdownLeaf_9_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "thematic-break", marker: "_" }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "thematic-break", marker: "_" });
}

function __build_MarkdownLeaf_9_html(captures: any, __indentCol: number = 0): any {
  return String("<hr>");
}

function __build_MarkdownLeaf_9_source(captures: any, __indentCol: number = 0): any {
  return String("___");
}

function __build_MarkdownLeaf_10_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "thematic-break" }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "thematic-break" });
}

function __build_MarkdownLeaf_10_html(captures: any, __indentCol: number = 0): any {
  return String("<hr>");
}

function __build_MarkdownLeaf_10_source(captures: any, __indentCol: number = 0): any {
  return String("---");
}

function __build_MarkdownLeaf_11_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "task-list-item", checked: true, marker: "x", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "task-list-item", checked: true, marker: "x", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_11_html(captures: any, __indentCol: number = 0): any {
  return "<li><input type=\"checkbox\" checked>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</li>";
}

function __build_MarkdownLeaf_11_source(captures: any, __indentCol: number = 0): any {
  return "- [x] " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_12_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "task-list-item", checked: false, text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "task-list-item", checked: false, text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_12_html(captures: any, __indentCol: number = 0): any {
  return "<li><input type=\"checkbox\">" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</li>";
}

function __build_MarkdownLeaf_12_source(captures: any, __indentCol: number = 0): any {
  return "- [ ] " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_13_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "list-item", ordered: false, marker: "+", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "list-item", ordered: false, marker: "+", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_13_html(captures: any, __indentCol: number = 0): any {
  return "<li>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</li>";
}

function __build_MarkdownLeaf_13_source(captures: any, __indentCol: number = 0): any {
  return "+ " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_14_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "list-item", ordered: false, marker: "*", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "list-item", ordered: false, marker: "*", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_14_html(captures: any, __indentCol: number = 0): any {
  return "<li>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</li>";
}

function __build_MarkdownLeaf_14_source(captures: any, __indentCol: number = 0): any {
  return "* " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_15_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "list-item", ordered: false, text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "list-item", ordered: false, text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_15_html(captures: any, __indentCol: number = 0): any {
  return "<li>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</li>";
}

function __build_MarkdownLeaf_15_source(captures: any, __indentCol: number = 0): any {
  return "- " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_16_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "list-item", ordered: true, index: __renderSlot_ast(captures.index, __indentCol), text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "list-item", ordered: true, index: __renderSlot_ast(captures.index, __indentCol), text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_16_html(captures: any, __indentCol: number = 0): any {
  return "<li>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</li>";
}

function __build_MarkdownLeaf_16_source(captures: any, __indentCol: number = 0): any {
  return (__renderSlot_source(captures.index, __indentCol) ?? "") + ". " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_17_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "blockquote", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "blockquote", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_17_html(captures: any, __indentCol: number = 0): any {
  return "<blockquote>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</blockquote>";
}

function __build_MarkdownLeaf_17_source(captures: any, __indentCol: number = 0): any {
  return "> " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_18_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "code-block", lang: __renderSlot_ast(captures.lang, __indentCol), text: __renderSlot_ast(captures.body, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "code-block", lang: __renderSlot_ast(captures.lang, __indentCol), text: __renderSlot_ast(captures.body, __indentCol) });
}

function __build_MarkdownLeaf_18_html(captures: any, __indentCol: number = 0): any {
  return "<pre><code class=\"lang-" + (__renderSlot_html(captures.lang, __indentCol) ?? "") + "\">" + (__renderSlot_html(captures.body, __indentCol) ?? "") + "</code></pre>";
}

function __build_MarkdownLeaf_18_source(captures: any, __indentCol: number = 0): any {
  return "```" + (__renderSlot_source(captures.lang, __indentCol) ?? "") + " " + (__renderSlot_source(captures.body, __indentCol) ?? "") + " ```";
}

function __build_MarkdownLeaf_19_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "code-block", text: __renderSlot_ast(captures.body, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "code-block", text: __renderSlot_ast(captures.body, __indentCol) });
}

function __build_MarkdownLeaf_19_html(captures: any, __indentCol: number = 0): any {
  return "<pre><code>" + (__renderSlot_html(captures.body, __indentCol) ?? "") + "</code></pre>";
}

function __build_MarkdownLeaf_19_source(captures: any, __indentCol: number = 0): any {
  return "```\n" + (__renderSlot_source(captures.body, __indentCol) ?? "") + " ```";
}

function __build_MarkdownLeaf_20_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "bold", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "bold", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_20_html(captures: any, __indentCol: number = 0): any {
  return "<strong>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</strong>";
}

function __build_MarkdownLeaf_20_source(captures: any, __indentCol: number = 0): any {
  return "**" + (__renderSlot_source(captures.text, __indentCol) ?? "") + "**";
}

function __build_MarkdownLeaf_21_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "italic", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "italic", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_21_html(captures: any, __indentCol: number = 0): any {
  return "<em>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</em>";
}

function __build_MarkdownLeaf_21_source(captures: any, __indentCol: number = 0): any {
  return "*" + (__renderSlot_source(captures.text, __indentCol) ?? "") + "*";
}

function __build_MarkdownLeaf_22_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "strikethrough", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "strikethrough", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_22_html(captures: any, __indentCol: number = 0): any {
  return "<s>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</s>";
}

function __build_MarkdownLeaf_22_source(captures: any, __indentCol: number = 0): any {
  return "~~" + (__renderSlot_source(captures.text, __indentCol) ?? "") + "~~";
}

function __build_MarkdownLeaf_23_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "inline-code", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "inline-code", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_23_html(captures: any, __indentCol: number = 0): any {
  return "<code>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</code>";
}

function __build_MarkdownLeaf_23_source(captures: any, __indentCol: number = 0): any {
  return "`" + (__renderSlot_source(captures.text, __indentCol) ?? "") + "`";
}

function __build_MarkdownLeaf_24_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "link", label: __renderSlot_ast(captures.label, __indentCol), url: __renderSlot_ast(captures.url, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "link", label: __renderSlot_ast(captures.label, __indentCol), url: __renderSlot_ast(captures.url, __indentCol) });
}

function __build_MarkdownLeaf_24_html(captures: any, __indentCol: number = 0): any {
  return "<a href=\"" + (__renderSlot_html(captures.url, __indentCol) ?? "") + "\">" + (__renderSlot_html(captures.label, __indentCol) ?? "") + "</a>";
}

function __build_MarkdownLeaf_24_source(captures: any, __indentCol: number = 0): any {
  return "[" + (__renderSlot_source(captures.label, __indentCol) ?? "") + "](" + (__renderSlot_source(captures.url, __indentCol) ?? "") + ")";
}

function __build_MarkdownLeaf_25_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "reference-link", label: __renderSlot_ast(captures.label, __indentCol), id: __renderSlot_ast(captures.id, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "reference-link", label: __renderSlot_ast(captures.label, __indentCol), id: __renderSlot_ast(captures.id, __indentCol) });
}

function __build_MarkdownLeaf_25_html(captures: any, __indentCol: number = 0): any {
  return "<a href=\"#" + (__renderSlot_html(captures.id, __indentCol) ?? "") + "\">" + (__renderSlot_html(captures.label, __indentCol) ?? "") + "</a>";
}

function __build_MarkdownLeaf_25_source(captures: any, __indentCol: number = 0): any {
  return "[" + (__renderSlot_source(captures.label, __indentCol) ?? "") + "][" + (__renderSlot_source(captures.id, __indentCol) ?? "") + "]";
}

function __build_MarkdownLeaf_26_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "image", alt: __renderSlot_ast(captures.alt, __indentCol), url: __renderSlot_ast(captures.url, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "image", alt: __renderSlot_ast(captures.alt, __indentCol), url: __renderSlot_ast(captures.url, __indentCol) });
}

function __build_MarkdownLeaf_26_html(captures: any, __indentCol: number = 0): any {
  return "<img src=\"" + (__renderSlot_html(captures.url, __indentCol) ?? "") + "\" alt=\"" + (__renderSlot_html(captures.alt, __indentCol) ?? "") + "\">";
}

function __build_MarkdownLeaf_26_source(captures: any, __indentCol: number = 0): any {
  return "![" + (__renderSlot_source(captures.alt, __indentCol) ?? "") + "](" + (__renderSlot_source(captures.url, __indentCol) ?? "") + ")";
}

function __build_MarkdownLeaf_27_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "reference-image", alt: __renderSlot_ast(captures.alt, __indentCol), id: __renderSlot_ast(captures.id, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "reference-image", alt: __renderSlot_ast(captures.alt, __indentCol), id: __renderSlot_ast(captures.id, __indentCol) });
}

function __build_MarkdownLeaf_27_html(captures: any, __indentCol: number = 0): any {
  return "<img src=\"#" + (__renderSlot_html(captures.id, __indentCol) ?? "") + "\" alt=\"" + (__renderSlot_html(captures.alt, __indentCol) ?? "") + "\">";
}

function __build_MarkdownLeaf_27_source(captures: any, __indentCol: number = 0): any {
  return "![" + (__renderSlot_source(captures.alt, __indentCol) ?? "") + "][" + (__renderSlot_source(captures.id, __indentCol) ?? "") + "]";
}

function __build_MarkdownLeaf_28_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "entity", name: __renderSlot_ast(captures.name, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "entity", name: __renderSlot_ast(captures.name, __indentCol) });
}

function __build_MarkdownLeaf_28_html(captures: any, __indentCol: number = 0): any {
  return "&" + (__renderSlot_html(captures.name, __indentCol) ?? "") + ";";
}

function __build_MarkdownLeaf_28_source(captures: any, __indentCol: number = 0): any {
  return "&" + (__renderSlot_source(captures.name, __indentCol) ?? "") + ";";
}

function __build_MarkdownLeaf_29_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "table-delimiter", variant: "plain", align: ["default", "default"] }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "table-delimiter", variant: "plain", align: ["default", "default"] });
}

function __build_MarkdownLeaf_29_html(captures: any, __indentCol: number = 0): any {
  return "";
}

function __build_MarkdownLeaf_29_source(captures: any, __indentCol: number = 0): any {
  return String("| --- | --- |");
}

function __build_MarkdownLeaf_30_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "table-delimiter", variant: "aligned", align: ["left", "right"] }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "table-delimiter", variant: "aligned", align: ["left", "right"] });
}

function __build_MarkdownLeaf_30_html(captures: any, __indentCol: number = 0): any {
  return "";
}

function __build_MarkdownLeaf_30_source(captures: any, __indentCol: number = 0): any {
  return String("|:---|---:|");
}

function __build_MarkdownLeaf_31_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "table-row", cells: [__renderSlot_ast(captures.first, __indentCol), __renderSlot_ast(captures.second, __indentCol)] }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "table-row", cells: [__renderSlot_ast(captures.first, __indentCol), __renderSlot_ast(captures.second, __indentCol)] });
}

function __build_MarkdownLeaf_31_html(captures: any, __indentCol: number = 0): any {
  return "<tr><td>" + (__renderSlot_html(captures.first, __indentCol) ?? "") + "</td><td>" + (__renderSlot_html(captures.second, __indentCol) ?? "") + "</td></tr>";
}

function __build_MarkdownLeaf_31_source(captures: any, __indentCol: number = 0): any {
  return "| " + (__renderSlot_source(captures.first, __indentCol) ?? "") + " | " + (__renderSlot_source(captures.second, __indentCol) ?? "") + " |";
}

function __build_MarkdownLeaf_32_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "definition", id: __renderSlot_ast(captures.id, __indentCol), url: __renderSlot_ast(captures.url, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "definition", id: __renderSlot_ast(captures.id, __indentCol), url: __renderSlot_ast(captures.url, __indentCol) });
}

function __build_MarkdownLeaf_32_html(captures: any, __indentCol: number = 0): any {
  return "";
}

function __build_MarkdownLeaf_32_source(captures: any, __indentCol: number = 0): any {
  return "[" + (__renderSlot_source(captures.id, __indentCol) ?? "") + "]: " + (__renderSlot_source(captures.url, __indentCol) ?? "");
}

function __build_MarkdownLeaf_33_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "footnote-definition", id: __renderSlot_ast(captures.id, __indentCol), text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "footnote-definition", id: __renderSlot_ast(captures.id, __indentCol), text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownLeaf_33_html(captures: any, __indentCol: number = 0): any {
  return "<div class=\"footnote\" id=\"fn" + (__renderSlot_html(captures.id, __indentCol) ?? "") + "\">" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</div>";
}

function __build_MarkdownLeaf_33_source(captures: any, __indentCol: number = 0): any {
  return "[^" + (__renderSlot_source(captures.id, __indentCol) ?? "") + "]: " + (__renderSlot_source(captures.text, __indentCol) ?? "");
}

function __build_MarkdownLeaf_34_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "footnote-reference", id: __renderSlot_ast(captures.id, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "footnote-reference", id: __renderSlot_ast(captures.id, __indentCol) });
}

function __build_MarkdownLeaf_34_html(captures: any, __indentCol: number = 0): any {
  return "<sup><a href=\"#fn" + (__renderSlot_html(captures.id, __indentCol) ?? "") + "\">" + (__renderSlot_html(captures.id, __indentCol) ?? "") + "</a></sup>";
}

function __build_MarkdownLeaf_34_source(captures: any, __indentCol: number = 0): any {
  return "[^" + (__renderSlot_source(captures.id, __indentCol) ?? "") + "]";
}

function __build_MarkdownLeaf_35_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "html", tag: __renderSlot_ast(captures.tag, __indentCol), text: __renderSlot_ast(captures.body, __indentCol), closingTag: __renderSlot_ast(captures.closingTag, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "html", tag: __renderSlot_ast(captures.tag, __indentCol), text: __renderSlot_ast(captures.body, __indentCol), closingTag: __renderSlot_ast(captures.closingTag, __indentCol) });
}

function __build_MarkdownLeaf_35_html(captures: any, __indentCol: number = 0): any {
  return "<" + (__renderSlot_html(captures.tag, __indentCol) ?? "") + ">" + (__renderSlot_html(captures.body, __indentCol) ?? "") + "</" + (__renderSlot_html(captures.closingTag, __indentCol) ?? "") + ">";
}

function __build_MarkdownLeaf_35_source(captures: any, __indentCol: number = 0): any {
  return "<" + (__renderSlot_source(captures.tag, __indentCol) ?? "") + ">" + (__renderSlot_source(captures.body, __indentCol) ?? "") + "</" + (__renderSlot_source(captures.closingTag, __indentCol) ?? "") + ">";
}

function __build_MarkdownLeaf_36_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "autolink", url: __renderSlot_ast(captures.url, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "autolink", url: __renderSlot_ast(captures.url, __indentCol) });
}

function __build_MarkdownLeaf_36_html(captures: any, __indentCol: number = 0): any {
  return "<a class=\"autolink\" href=\"" + (__renderSlot_html(captures.url, __indentCol) ?? "") + "\">" + (__renderSlot_html(captures.url, __indentCol) ?? "") + "</a>";
}

function __build_MarkdownLeaf_36_source(captures: any, __indentCol: number = 0): any {
  return "<" + (__renderSlot_source(captures.url, __indentCol) ?? "") + ">";
}

function __build_MarkdownParagraph_0_ast(captures: any, __indentCol: number = 0): any {
  return (captures.__ws != null ? Object.assign({ type: "paragraph", text: __renderSlot_ast(captures.text, __indentCol) }, { raws: { __ws: captures.__ws, __litPres: captures.__litPres } }) : { type: "paragraph", text: __renderSlot_ast(captures.text, __indentCol) });
}

function __build_MarkdownParagraph_0_html(captures: any, __indentCol: number = 0): any {
  return "<p>" + (__renderSlot_html(captures.text, __indentCol) ?? "") + "</p>";
}

function __build_MarkdownParagraph_0_source(captures: any, __indentCol: number = 0): any {
  return String((__renderSlot_source(captures.text, __indentCol) ?? ""));
}

function __dispatchRender_ast(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'ast')");
  }
  switch (captures.__production) {
    case "MarkdownDocument#0": return __build_MarkdownDocument_0_ast(captures, __indentCol);
    case "MarkdownLeaf#0": return __build_MarkdownLeaf_0_ast(captures, __indentCol);
    case "MarkdownLeaf#1": return __build_MarkdownLeaf_1_ast(captures, __indentCol);
    case "MarkdownLeaf#2": return __build_MarkdownLeaf_2_ast(captures, __indentCol);
    case "MarkdownLeaf#3": return __build_MarkdownLeaf_3_ast(captures, __indentCol);
    case "MarkdownLeaf#4": return __build_MarkdownLeaf_4_ast(captures, __indentCol);
    case "MarkdownLeaf#5": return __build_MarkdownLeaf_5_ast(captures, __indentCol);
    case "MarkdownLeaf#6": return __build_MarkdownLeaf_6_ast(captures, __indentCol);
    case "MarkdownLeaf#7": return __build_MarkdownLeaf_7_ast(captures, __indentCol);
    case "MarkdownLeaf#8": return __build_MarkdownLeaf_8_ast(captures, __indentCol);
    case "MarkdownLeaf#9": return __build_MarkdownLeaf_9_ast(captures, __indentCol);
    case "MarkdownLeaf#10": return __build_MarkdownLeaf_10_ast(captures, __indentCol);
    case "MarkdownLeaf#11": return __build_MarkdownLeaf_11_ast(captures, __indentCol);
    case "MarkdownLeaf#12": return __build_MarkdownLeaf_12_ast(captures, __indentCol);
    case "MarkdownLeaf#13": return __build_MarkdownLeaf_13_ast(captures, __indentCol);
    case "MarkdownLeaf#14": return __build_MarkdownLeaf_14_ast(captures, __indentCol);
    case "MarkdownLeaf#15": return __build_MarkdownLeaf_15_ast(captures, __indentCol);
    case "MarkdownLeaf#16": return __build_MarkdownLeaf_16_ast(captures, __indentCol);
    case "MarkdownLeaf#17": return __build_MarkdownLeaf_17_ast(captures, __indentCol);
    case "MarkdownLeaf#18": return __build_MarkdownLeaf_18_ast(captures, __indentCol);
    case "MarkdownLeaf#19": return __build_MarkdownLeaf_19_ast(captures, __indentCol);
    case "MarkdownLeaf#20": return __build_MarkdownLeaf_20_ast(captures, __indentCol);
    case "MarkdownLeaf#21": return __build_MarkdownLeaf_21_ast(captures, __indentCol);
    case "MarkdownLeaf#22": return __build_MarkdownLeaf_22_ast(captures, __indentCol);
    case "MarkdownLeaf#23": return __build_MarkdownLeaf_23_ast(captures, __indentCol);
    case "MarkdownLeaf#24": return __build_MarkdownLeaf_24_ast(captures, __indentCol);
    case "MarkdownLeaf#25": return __build_MarkdownLeaf_25_ast(captures, __indentCol);
    case "MarkdownLeaf#26": return __build_MarkdownLeaf_26_ast(captures, __indentCol);
    case "MarkdownLeaf#27": return __build_MarkdownLeaf_27_ast(captures, __indentCol);
    case "MarkdownLeaf#28": return __build_MarkdownLeaf_28_ast(captures, __indentCol);
    case "MarkdownLeaf#29": return __build_MarkdownLeaf_29_ast(captures, __indentCol);
    case "MarkdownLeaf#30": return __build_MarkdownLeaf_30_ast(captures, __indentCol);
    case "MarkdownLeaf#31": return __build_MarkdownLeaf_31_ast(captures, __indentCol);
    case "MarkdownLeaf#32": return __build_MarkdownLeaf_32_ast(captures, __indentCol);
    case "MarkdownLeaf#33": return __build_MarkdownLeaf_33_ast(captures, __indentCol);
    case "MarkdownLeaf#34": return __build_MarkdownLeaf_34_ast(captures, __indentCol);
    case "MarkdownLeaf#35": return __build_MarkdownLeaf_35_ast(captures, __indentCol);
    case "MarkdownLeaf#36": return __build_MarkdownLeaf_36_ast(captures, __indentCol);
    case "MarkdownParagraph#0": return __build_MarkdownParagraph_0_ast(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'ast'");
}

function __dispatchRender_html(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'html')");
  }
  switch (captures.__production) {
    case "MarkdownDocument#0": return __build_MarkdownDocument_0_html(captures, __indentCol);
    case "MarkdownLeaf#0": return __build_MarkdownLeaf_0_html(captures, __indentCol);
    case "MarkdownLeaf#1": return __build_MarkdownLeaf_1_html(captures, __indentCol);
    case "MarkdownLeaf#2": return __build_MarkdownLeaf_2_html(captures, __indentCol);
    case "MarkdownLeaf#3": return __build_MarkdownLeaf_3_html(captures, __indentCol);
    case "MarkdownLeaf#4": return __build_MarkdownLeaf_4_html(captures, __indentCol);
    case "MarkdownLeaf#5": return __build_MarkdownLeaf_5_html(captures, __indentCol);
    case "MarkdownLeaf#6": return __build_MarkdownLeaf_6_html(captures, __indentCol);
    case "MarkdownLeaf#7": return __build_MarkdownLeaf_7_html(captures, __indentCol);
    case "MarkdownLeaf#8": return __build_MarkdownLeaf_8_html(captures, __indentCol);
    case "MarkdownLeaf#9": return __build_MarkdownLeaf_9_html(captures, __indentCol);
    case "MarkdownLeaf#10": return __build_MarkdownLeaf_10_html(captures, __indentCol);
    case "MarkdownLeaf#11": return __build_MarkdownLeaf_11_html(captures, __indentCol);
    case "MarkdownLeaf#12": return __build_MarkdownLeaf_12_html(captures, __indentCol);
    case "MarkdownLeaf#13": return __build_MarkdownLeaf_13_html(captures, __indentCol);
    case "MarkdownLeaf#14": return __build_MarkdownLeaf_14_html(captures, __indentCol);
    case "MarkdownLeaf#15": return __build_MarkdownLeaf_15_html(captures, __indentCol);
    case "MarkdownLeaf#16": return __build_MarkdownLeaf_16_html(captures, __indentCol);
    case "MarkdownLeaf#17": return __build_MarkdownLeaf_17_html(captures, __indentCol);
    case "MarkdownLeaf#18": return __build_MarkdownLeaf_18_html(captures, __indentCol);
    case "MarkdownLeaf#19": return __build_MarkdownLeaf_19_html(captures, __indentCol);
    case "MarkdownLeaf#20": return __build_MarkdownLeaf_20_html(captures, __indentCol);
    case "MarkdownLeaf#21": return __build_MarkdownLeaf_21_html(captures, __indentCol);
    case "MarkdownLeaf#22": return __build_MarkdownLeaf_22_html(captures, __indentCol);
    case "MarkdownLeaf#23": return __build_MarkdownLeaf_23_html(captures, __indentCol);
    case "MarkdownLeaf#24": return __build_MarkdownLeaf_24_html(captures, __indentCol);
    case "MarkdownLeaf#25": return __build_MarkdownLeaf_25_html(captures, __indentCol);
    case "MarkdownLeaf#26": return __build_MarkdownLeaf_26_html(captures, __indentCol);
    case "MarkdownLeaf#27": return __build_MarkdownLeaf_27_html(captures, __indentCol);
    case "MarkdownLeaf#28": return __build_MarkdownLeaf_28_html(captures, __indentCol);
    case "MarkdownLeaf#29": return __build_MarkdownLeaf_29_html(captures, __indentCol);
    case "MarkdownLeaf#30": return __build_MarkdownLeaf_30_html(captures, __indentCol);
    case "MarkdownLeaf#31": return __build_MarkdownLeaf_31_html(captures, __indentCol);
    case "MarkdownLeaf#32": return __build_MarkdownLeaf_32_html(captures, __indentCol);
    case "MarkdownLeaf#33": return __build_MarkdownLeaf_33_html(captures, __indentCol);
    case "MarkdownLeaf#34": return __build_MarkdownLeaf_34_html(captures, __indentCol);
    case "MarkdownLeaf#35": return __build_MarkdownLeaf_35_html(captures, __indentCol);
    case "MarkdownLeaf#36": return __build_MarkdownLeaf_36_html(captures, __indentCol);
    case "MarkdownParagraph#0": return __build_MarkdownParagraph_0_html(captures, __indentCol);
  }
  throw new Error("render: unknown production '" + captures.__production + "' for target 'html'");
}

function __dispatchRender_source(captures: any, __indentCol: number = 0): any {
  if (captures === null || typeof captures !== "object") {
    throw new Error("render: captures must be an object (target 'source')");
  }
  switch (captures.__production) {
    case "MarkdownDocument#0": return __build_MarkdownDocument_0_source(captures, __indentCol);
    case "MarkdownLeaf#0": return __build_MarkdownLeaf_0_source(captures, __indentCol);
    case "MarkdownLeaf#1": return __build_MarkdownLeaf_1_source(captures, __indentCol);
    case "MarkdownLeaf#2": return __build_MarkdownLeaf_2_source(captures, __indentCol);
    case "MarkdownLeaf#3": return __build_MarkdownLeaf_3_source(captures, __indentCol);
    case "MarkdownLeaf#4": return __build_MarkdownLeaf_4_source(captures, __indentCol);
    case "MarkdownLeaf#5": return __build_MarkdownLeaf_5_source(captures, __indentCol);
    case "MarkdownLeaf#6": return __build_MarkdownLeaf_6_source(captures, __indentCol);
    case "MarkdownLeaf#7": return __build_MarkdownLeaf_7_source(captures, __indentCol);
    case "MarkdownLeaf#8": return __build_MarkdownLeaf_8_source(captures, __indentCol);
    case "MarkdownLeaf#9": return __build_MarkdownLeaf_9_source(captures, __indentCol);
    case "MarkdownLeaf#10": return __build_MarkdownLeaf_10_source(captures, __indentCol);
    case "MarkdownLeaf#11": return __build_MarkdownLeaf_11_source(captures, __indentCol);
    case "MarkdownLeaf#12": return __build_MarkdownLeaf_12_source(captures, __indentCol);
    case "MarkdownLeaf#13": return __build_MarkdownLeaf_13_source(captures, __indentCol);
    case "MarkdownLeaf#14": return __build_MarkdownLeaf_14_source(captures, __indentCol);
    case "MarkdownLeaf#15": return __build_MarkdownLeaf_15_source(captures, __indentCol);
    case "MarkdownLeaf#16": return __build_MarkdownLeaf_16_source(captures, __indentCol);
    case "MarkdownLeaf#17": return __build_MarkdownLeaf_17_source(captures, __indentCol);
    case "MarkdownLeaf#18": return __build_MarkdownLeaf_18_source(captures, __indentCol);
    case "MarkdownLeaf#19": return __build_MarkdownLeaf_19_source(captures, __indentCol);
    case "MarkdownLeaf#20": return __build_MarkdownLeaf_20_source(captures, __indentCol);
    case "MarkdownLeaf#21": return __build_MarkdownLeaf_21_source(captures, __indentCol);
    case "MarkdownLeaf#22": return __build_MarkdownLeaf_22_source(captures, __indentCol);
    case "MarkdownLeaf#23": return __build_MarkdownLeaf_23_source(captures, __indentCol);
    case "MarkdownLeaf#24": return __build_MarkdownLeaf_24_source(captures, __indentCol);
    case "MarkdownLeaf#25": return __build_MarkdownLeaf_25_source(captures, __indentCol);
    case "MarkdownLeaf#26": return __build_MarkdownLeaf_26_source(captures, __indentCol);
    case "MarkdownLeaf#27": return __build_MarkdownLeaf_27_source(captures, __indentCol);
    case "MarkdownLeaf#28": return __build_MarkdownLeaf_28_source(captures, __indentCol);
    case "MarkdownLeaf#29": return __build_MarkdownLeaf_29_source(captures, __indentCol);
    case "MarkdownLeaf#30": return __build_MarkdownLeaf_30_source(captures, __indentCol);
    case "MarkdownLeaf#31": return __build_MarkdownLeaf_31_source(captures, __indentCol);
    case "MarkdownLeaf#32": return __build_MarkdownLeaf_32_source(captures, __indentCol);
    case "MarkdownLeaf#33": return __build_MarkdownLeaf_33_source(captures, __indentCol);
    case "MarkdownLeaf#34": return __build_MarkdownLeaf_34_source(captures, __indentCol);
    case "MarkdownLeaf#35": return __build_MarkdownLeaf_35_source(captures, __indentCol);
    case "MarkdownLeaf#36": return __build_MarkdownLeaf_36_source(captures, __indentCol);
    case "MarkdownParagraph#0": return __build_MarkdownParagraph_0_source(captures, __indentCol);
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

function __renderSlot_html(v: any, __indentCol: number = 0): any {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) out.push(__renderSlot_html(v[i], __indentCol));
    return out;
  }
  if (typeof v === "object" && typeof v.__production === "string") {
    return __dispatchRender_html(v, __indentCol);
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
  "html": (captures: any) => __dispatchRender_html(captures),
  "source": (captures: any) => __dispatchRender_source(captures),
};

export function render(input: string, options: { target: "ast"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): MarkdownDocument_ast;
export function render(input: string, options: { target: "html"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): MarkdownDocument_html;
export function render(input: string, options: { target: "source"; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): MarkdownDocument_source;
export function render(input: string, options?: { target?: string; mode?: ParseMode; onDiagnostic?: (d: Diagnostic) => void }): unknown {
  const target = options?.target ?? __defaultTarget;
  if (!target) {
    throw new Error("render: missing target; pass options.target or set defaultTarget on the schema");
  }
  // Fused fast path covers BOTH Template-bodied targets (e.g. 'source') AND
  // structurally-fused object-bodied targets (e.g. 'ast' for schemas whose
  // ast body is a structured object with statically resolvable refs). In
  // raws mode the captures path attaches a per-node `source: string` field
  // that the structured-fused emit does not synthesize — skip fusion so the
  // returned shape matches caller expectations. Recovery diagnostics also
  // force the captures path: structurally-fused render skips recovery
  // productions (see canFuseStructured), so a parse that depends on a
  // recovery alt naturally falls through to the captures path where the
  // diagnostic is emitted.
  if (options?.mode !== 'raws') {
    const fused = __renderFused(input, target);
    if (fused !== null) return fused;
  }
  const fn = __renderDispatch[target];
  if (!fn) {
    throw new Error("render: unknown target '" + target + "'");
  }
  const captures = __parse(input, { mode: options?.mode, onDiagnostic: options?.onDiagnostic });
  const result = fn(captures);
  return result;
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

// Phase 4c v2: preserve-mode array join. Interleaves items[i] with
// iws[i-1] (per-iteration ws captured at parse time). Falls back to
// the static fallbackSep when iws is null/short — defensive against
// hand-built ASTs that don't carry the iws array.
function __rebuildSlotIws(v: any, iws: any, fallbackSep: string): string {
  if (v === null || v === undefined) return "";
  if (!Array.isArray(v)) return String(v);
  let out = "";
  const hasIws = Array.isArray(iws);
  for (let i = 0; i < v.length; i++) {
    if (i > 0) {
      const gap = hasIws && typeof iws[i - 1] === "string" ? iws[i - 1] : fallbackSep;
      out += gap;
    }
    out += __rebuildSlot(v[i]);
  }
  return out;
}

function __rebuild_MarkdownDocument_0(captures: any): string {
  return String((captures.children == null ? "" : __rebuildSlotIws(captures.children, captures.children_iws, " ")));
}

function __rebuild_MarkdownLeaf_0(captures: any): string {
  return "######" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_1(captures: any): string {
  return "#####" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_2(captures: any): string {
  return "####" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_3(captures: any): string {
  return "###" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_4(captures: any): string {
  return "##" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_5(captures: any): string {
  return "#" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_6(captures: any): string {
  return __rebuildSlot(captures.text) + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + "===";
}

function __rebuild_MarkdownLeaf_7(captures: any): string {
  return __rebuildSlot(captures.text) + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + "---";
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
  return "- [x]" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_12(captures: any): string {
  return "- [ ]" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
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
  return __rebuildSlot(captures.index) + "." + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_17(captures: any): string {
  return ">" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
}

function __rebuild_MarkdownLeaf_18(captures: any): string {
  return "```" + __rebuildSlot(captures.lang) + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.body) + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "```";
}

function __rebuild_MarkdownLeaf_19(captures: any): string {
  return "```\n" + __rebuildSlot(captures.body) + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + "```";
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
  return "|" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + "---" + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "|" + (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : " ") + "---" + (captures.__ws && captures.__ws[3] !== undefined ? captures.__ws[3] : " ") + "|";
}

function __rebuild_MarkdownLeaf_30(captures: any): string {
  return "|" + ":" + "---" + "|" + "---" + ":" + "|";
}

function __rebuild_MarkdownLeaf_31(captures: any): string {
  return "|" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.first) + (captures.__ws && captures.__ws[1] !== undefined ? captures.__ws[1] : " ") + "|" + (captures.__ws && captures.__ws[2] !== undefined ? captures.__ws[2] : " ") + __rebuildSlot(captures.second) + (captures.__ws && captures.__ws[3] !== undefined ? captures.__ws[3] : " ") + "|";
}

function __rebuild_MarkdownLeaf_32(captures: any): string {
  return "[" + __rebuildSlot(captures.id) + "]" + ":" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.url);
}

function __rebuild_MarkdownLeaf_33(captures: any): string {
  return "[^" + __rebuildSlot(captures.id) + "]" + ":" + (captures.__ws && captures.__ws[0] !== undefined ? captures.__ws[0] : " ") + __rebuildSlot(captures.text);
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

function __invert_MarkdownDocument_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "document")) {
    throw new Error("stringify: field \"type\" expected \"document\", got " + JSON.stringify(value.type));
  }
  captures.children = ((Array.isArray(value.children) ? value.children : [value.children]).map((__e: any) => __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_ast(__e, __indentCol)));
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownDocument_0(captures, __indentCol);
  }
  return String((captures.children == null ? "" : __rebuildSlotIws(captures.children, captures.children_iws, " ")));
}

function __invert_MarkdownLeaf_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_0(captures, __indentCol);
  }
  return "###### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_1_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_1(captures, __indentCol);
  }
  return "##### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_2_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_2(captures, __indentCol);
  }
  return "#### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_3_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_3(captures, __indentCol);
  }
  return "### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_4_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_4(captures, __indentCol);
  }
  return "## " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_5_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_5(captures, __indentCol);
  }
  return "# " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_6_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_6(captures, __indentCol);
  }
  return __rebuildSlot(captures.text) + " ===";
}

function __invert_MarkdownLeaf_7_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_7(captures, __indentCol);
  }
  return __rebuildSlot(captures.text) + " ---";
}

function __invert_MarkdownLeaf_8_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "thematic-break")) {
    throw new Error("stringify: field \"type\" expected \"thematic-break\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.marker, "*")) {
    throw new Error("stringify: field \"marker\" expected \"*\", got " + JSON.stringify(value.marker));
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_8(captures, __indentCol);
  }
  return "***";
}

function __invert_MarkdownLeaf_9_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "thematic-break")) {
    throw new Error("stringify: field \"type\" expected \"thematic-break\", got " + JSON.stringify(value.type));
  }
  if (!Object.is(value.marker, "_")) {
    throw new Error("stringify: field \"marker\" expected \"_\", got " + JSON.stringify(value.marker));
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_9(captures, __indentCol);
  }
  return "___";
}

function __invert_MarkdownLeaf_10_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "thematic-break")) {
    throw new Error("stringify: field \"type\" expected \"thematic-break\", got " + JSON.stringify(value.type));
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_10(captures, __indentCol);
  }
  return "---";
}

function __invert_MarkdownLeaf_11_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_11(captures, __indentCol);
  }
  return "- [x] " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_12_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_12(captures, __indentCol);
  }
  return "- [ ] " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_13_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_13(captures, __indentCol);
  }
  return "+ " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_14_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_14(captures, __indentCol);
  }
  return "* " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_15_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_15(captures, __indentCol);
  }
  return "- " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_16_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_16(captures, __indentCol);
  }
  return __rebuildSlot(captures.index) + ". " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_17_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "blockquote")) {
    throw new Error("stringify: field \"type\" expected \"blockquote\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_17(captures, __indentCol);
  }
  return "> " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_18_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "code-block")) {
    throw new Error("stringify: field \"type\" expected \"code-block\", got " + JSON.stringify(value.type));
  }
  captures.lang = __invertSlotLeaf_ast(value.lang);
  captures.body = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_18(captures, __indentCol);
  }
  return "```" + __rebuildSlot(captures.lang) + " " + __rebuildSlot(captures.body) + " ```";
}

function __invert_MarkdownLeaf_19_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "code-block")) {
    throw new Error("stringify: field \"type\" expected \"code-block\", got " + JSON.stringify(value.type));
  }
  captures.body = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_19(captures, __indentCol);
  }
  return "```\n" + __rebuildSlot(captures.body) + " ```";
}

function __invert_MarkdownLeaf_20_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "bold")) {
    throw new Error("stringify: field \"type\" expected \"bold\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_20(captures, __indentCol);
  }
  return "**" + __rebuildSlot(captures.text) + "**";
}

function __invert_MarkdownLeaf_21_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "italic")) {
    throw new Error("stringify: field \"type\" expected \"italic\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_21(captures, __indentCol);
  }
  return "*" + __rebuildSlot(captures.text) + "*";
}

function __invert_MarkdownLeaf_22_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "strikethrough")) {
    throw new Error("stringify: field \"type\" expected \"strikethrough\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_22(captures, __indentCol);
  }
  return "~~" + __rebuildSlot(captures.text) + "~~";
}

function __invert_MarkdownLeaf_23_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "inline-code")) {
    throw new Error("stringify: field \"type\" expected \"inline-code\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_23(captures, __indentCol);
  }
  return "`" + __rebuildSlot(captures.text) + "`";
}

function __invert_MarkdownLeaf_24_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "link")) {
    throw new Error("stringify: field \"type\" expected \"link\", got " + JSON.stringify(value.type));
  }
  captures.label = __invertSlotLeaf_ast(value.label);
  captures.url = __invertSlotLeaf_ast(value.url);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_24(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.label) + "](" + __rebuildSlot(captures.url) + ")";
}

function __invert_MarkdownLeaf_25_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "reference-link")) {
    throw new Error("stringify: field \"type\" expected \"reference-link\", got " + JSON.stringify(value.type));
  }
  captures.label = __invertSlotLeaf_ast(value.label);
  captures.id = __invertSlotLeaf_ast(value.id);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_25(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.label) + "][" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_26_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "image")) {
    throw new Error("stringify: field \"type\" expected \"image\", got " + JSON.stringify(value.type));
  }
  captures.alt = __invertSlotLeaf_ast(value.alt);
  captures.url = __invertSlotLeaf_ast(value.url);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_26(captures, __indentCol);
  }
  return "![" + __rebuildSlot(captures.alt) + "](" + __rebuildSlot(captures.url) + ")";
}

function __invert_MarkdownLeaf_27_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "reference-image")) {
    throw new Error("stringify: field \"type\" expected \"reference-image\", got " + JSON.stringify(value.type));
  }
  captures.alt = __invertSlotLeaf_ast(value.alt);
  captures.id = __invertSlotLeaf_ast(value.id);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_27(captures, __indentCol);
  }
  return "![" + __rebuildSlot(captures.alt) + "][" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_28_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "entity")) {
    throw new Error("stringify: field \"type\" expected \"entity\", got " + JSON.stringify(value.type));
  }
  captures.name = __invertSlotLeaf_ast(value.name);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_28(captures, __indentCol);
  }
  return "&" + __rebuildSlot(captures.name) + ";";
}

function __invert_MarkdownLeaf_29_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_29(captures, __indentCol);
  }
  return "| --- | --- |";
}

function __invert_MarkdownLeaf_30_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_30(captures, __indentCol);
  }
  return "|:---|---:|";
}

function __invert_MarkdownLeaf_31_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_31(captures, __indentCol);
  }
  return "| " + __rebuildSlot(captures.first) + " | " + __rebuildSlot(captures.second) + " |";
}

function __invert_MarkdownLeaf_32_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "definition")) {
    throw new Error("stringify: field \"type\" expected \"definition\", got " + JSON.stringify(value.type));
  }
  captures.id = __invertSlotLeaf_ast(value.id);
  captures.url = __invertSlotLeaf_ast(value.url);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_32(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.id) + "]: " + __rebuildSlot(captures.url);
}

function __invert_MarkdownLeaf_33_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "footnote-definition")) {
    throw new Error("stringify: field \"type\" expected \"footnote-definition\", got " + JSON.stringify(value.type));
  }
  captures.id = __invertSlotLeaf_ast(value.id);
  captures.text = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_33(captures, __indentCol);
  }
  return "[^" + __rebuildSlot(captures.id) + "]: " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_34_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "footnote-reference")) {
    throw new Error("stringify: field \"type\" expected \"footnote-reference\", got " + JSON.stringify(value.type));
  }
  captures.id = __invertSlotLeaf_ast(value.id);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_34(captures, __indentCol);
  }
  return "[^" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_35_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "html")) {
    throw new Error("stringify: field \"type\" expected \"html\", got " + JSON.stringify(value.type));
  }
  captures.tag = __invertSlotLeaf_ast(value.tag);
  captures.body = __invertSlotLeaf_ast(value.text);
  captures.closingTag = __invertSlotLeaf_ast(value.closingTag);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_35(captures, __indentCol);
  }
  return "<" + __rebuildSlot(captures.tag) + ">" + __rebuildSlot(captures.body) + "</" + __rebuildSlot(captures.closingTag) + ">";
}

function __invert_MarkdownLeaf_36_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "autolink")) {
    throw new Error("stringify: field \"type\" expected \"autolink\", got " + JSON.stringify(value.type));
  }
  captures.url = __invertSlotLeaf_ast(value.url);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_36(captures, __indentCol);
  }
  return "<" + __rebuildSlot(captures.url) + ">";
}

function __invert_MarkdownParagraph_0_ast(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("stringify: expected object value, got " + typeof value);
  }
  if (!Object.is(value.type, "paragraph")) {
    throw new Error("stringify: field \"type\" expected \"paragraph\", got " + JSON.stringify(value.type));
  }
  captures.text = __invertSlotLeaf_ast(value.text);
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownParagraph_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.text));
}

function __invert_MarkdownDocument_0_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos >= __s.length) {
    captures.children = null;
  } else {
    captures.children = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : [__s.slice(__pos)]).map((__e: any) => __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_html(__e, __indentCol)));
    __pos = __s.length;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownDocument_0(captures, __indentCol);
  }
  return String((captures.children == null ? "" : __rebuildSlotIws(captures.children, captures.children_iws, " ")));
}

function __invert_MarkdownLeaf_0_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_0(captures, __indentCol);
  }
  return "###### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_1_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_1(captures, __indentCol);
  }
  return "##### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_2_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_2(captures, __indentCol);
  }
  return "#### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_3_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_3(captures, __indentCol);
  }
  return "### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_4_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_4(captures, __indentCol);
  }
  return "## " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_5_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_5(captures, __indentCol);
  }
  return "# " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_6_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_6(captures, __indentCol);
  }
  return __rebuildSlot(captures.text) + " ===";
}

function __invert_MarkdownLeaf_7_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_7(captures, __indentCol);
  }
  return __rebuildSlot(captures.text) + " ---";
}

function __invert_MarkdownLeaf_8_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<hr>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<hr>\" in template body");
  }
  __pos += 4;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_8(captures, __indentCol);
  }
  return "***";
}

function __invert_MarkdownLeaf_9_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<hr>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<hr>\" in template body");
  }
  __pos += 4;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_9(captures, __indentCol);
  }
  return "___";
}

function __invert_MarkdownLeaf_10_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("<hr>", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"<hr>\" in template body");
  }
  __pos += 4;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_10(captures, __indentCol);
  }
  return "---";
}

function __invert_MarkdownLeaf_11_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_11(captures, __indentCol);
  }
  return "- [x] " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_12_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_12(captures, __indentCol);
  }
  return "- [ ] " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_13_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_13(captures, __indentCol);
  }
  return "+ " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_14_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_14(captures, __indentCol);
  }
  return "* " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_15_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_15(captures, __indentCol);
  }
  return "- " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_16_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_16(captures, __indentCol);
  }
  return __rebuildSlot(captures.index) + ". " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_17_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_17(captures, __indentCol);
  }
  return "> " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_18_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_18(captures, __indentCol);
  }
  return "```" + __rebuildSlot(captures.lang) + " " + __rebuildSlot(captures.body) + " ```";
}

function __invert_MarkdownLeaf_19_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_19(captures, __indentCol);
  }
  return "```\n" + __rebuildSlot(captures.body) + " ```";
}

function __invert_MarkdownLeaf_20_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_20(captures, __indentCol);
  }
  return "**" + __rebuildSlot(captures.text) + "**";
}

function __invert_MarkdownLeaf_21_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_21(captures, __indentCol);
  }
  return "*" + __rebuildSlot(captures.text) + "*";
}

function __invert_MarkdownLeaf_22_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_22(captures, __indentCol);
  }
  return "~~" + __rebuildSlot(captures.text) + "~~";
}

function __invert_MarkdownLeaf_23_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_23(captures, __indentCol);
  }
  return "`" + __rebuildSlot(captures.text) + "`";
}

function __invert_MarkdownLeaf_24_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_24(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.label) + "](" + __rebuildSlot(captures.url) + ")";
}

function __invert_MarkdownLeaf_25_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_25(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.label) + "][" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_26_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_26(captures, __indentCol);
  }
  return "![" + __rebuildSlot(captures.alt) + "](" + __rebuildSlot(captures.url) + ")";
}

function __invert_MarkdownLeaf_27_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_27(captures, __indentCol);
  }
  return "![" + __rebuildSlot(captures.alt) + "][" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_28_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_28(captures, __indentCol);
  }
  return "&" + __rebuildSlot(captures.name) + ";";
}

function __invert_MarkdownLeaf_29_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_29(captures, __indentCol);
  }
  return "| --- | --- |";
}

function __invert_MarkdownLeaf_30_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_30(captures, __indentCol);
  }
  return "|:---|---:|";
}

function __invert_MarkdownLeaf_31_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_31(captures, __indentCol);
  }
  return "| " + __rebuildSlot(captures.first) + " | " + __rebuildSlot(captures.second) + " |";
}

function __invert_MarkdownLeaf_32_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_32(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.id) + "]: " + __rebuildSlot(captures.url);
}

function __invert_MarkdownLeaf_33_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_33(captures, __indentCol);
  }
  return "[^" + __rebuildSlot(captures.id) + "]: " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_34_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_34(captures, __indentCol);
  }
  return "[^" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_35_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_35(captures, __indentCol);
  }
  return "<" + __rebuildSlot(captures.tag) + ">" + __rebuildSlot(captures.body) + "</" + __rebuildSlot(captures.closingTag) + ">";
}

function __invert_MarkdownLeaf_36_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_36(captures, __indentCol);
  }
  return "<" + __rebuildSlot(captures.url) + ">";
}

function __invert_MarkdownParagraph_0_html(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownParagraph_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.text));
}

function __invert_MarkdownDocument_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__pos >= __s.length) {
    captures.children = null;
  } else {
    captures.children = ((Array.isArray(__s.slice(__pos)) ? __s.slice(__pos) : [__s.slice(__pos)]).map((__e: any) => __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_source(__e, __indentCol)));
    __pos = __s.length;
  }
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownDocument_0(captures, __indentCol);
  }
  return String((captures.children == null ? "" : __rebuildSlotIws(captures.children, captures.children_iws, " ")));
}

function __invert_MarkdownLeaf_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_0(captures, __indentCol);
  }
  return "###### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_1_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_1(captures, __indentCol);
  }
  return "##### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_2_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_2(captures, __indentCol);
  }
  return "#### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_3_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_3(captures, __indentCol);
  }
  return "### " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_4_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_4(captures, __indentCol);
  }
  return "## " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_5_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_5(captures, __indentCol);
  }
  return "# " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_6_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_6(captures, __indentCol);
  }
  return __rebuildSlot(captures.text) + " ===";
}

function __invert_MarkdownLeaf_7_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_7(captures, __indentCol);
  }
  return __rebuildSlot(captures.text) + " ---";
}

function __invert_MarkdownLeaf_8_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("***", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"***\" in template body");
  }
  __pos += 3;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_8(captures, __indentCol);
  }
  return "***";
}

function __invert_MarkdownLeaf_9_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("___", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"___\" in template body");
  }
  __pos += 3;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_9(captures, __indentCol);
  }
  return "___";
}

function __invert_MarkdownLeaf_10_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("---", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"---\" in template body");
  }
  __pos += 3;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_10(captures, __indentCol);
  }
  return "---";
}

function __invert_MarkdownLeaf_11_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_11(captures, __indentCol);
  }
  return "- [x] " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_12_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_12(captures, __indentCol);
  }
  return "- [ ] " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_13_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_13(captures, __indentCol);
  }
  return "+ " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_14_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_14(captures, __indentCol);
  }
  return "* " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_15_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_15(captures, __indentCol);
  }
  return "- " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_16_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_16(captures, __indentCol);
  }
  return __rebuildSlot(captures.index) + ". " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_17_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_17(captures, __indentCol);
  }
  return "> " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_18_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_18(captures, __indentCol);
  }
  return "```" + __rebuildSlot(captures.lang) + " " + __rebuildSlot(captures.body) + " ```";
}

function __invert_MarkdownLeaf_19_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_19(captures, __indentCol);
  }
  return "```\n" + __rebuildSlot(captures.body) + " ```";
}

function __invert_MarkdownLeaf_20_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_20(captures, __indentCol);
  }
  return "**" + __rebuildSlot(captures.text) + "**";
}

function __invert_MarkdownLeaf_21_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_21(captures, __indentCol);
  }
  return "*" + __rebuildSlot(captures.text) + "*";
}

function __invert_MarkdownLeaf_22_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_22(captures, __indentCol);
  }
  return "~~" + __rebuildSlot(captures.text) + "~~";
}

function __invert_MarkdownLeaf_23_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_23(captures, __indentCol);
  }
  return "`" + __rebuildSlot(captures.text) + "`";
}

function __invert_MarkdownLeaf_24_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_24(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.label) + "](" + __rebuildSlot(captures.url) + ")";
}

function __invert_MarkdownLeaf_25_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_25(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.label) + "][" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_26_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_26(captures, __indentCol);
  }
  return "![" + __rebuildSlot(captures.alt) + "](" + __rebuildSlot(captures.url) + ")";
}

function __invert_MarkdownLeaf_27_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_27(captures, __indentCol);
  }
  return "![" + __rebuildSlot(captures.alt) + "][" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_28_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_28(captures, __indentCol);
  }
  return "&" + __rebuildSlot(captures.name) + ";";
}

function __invert_MarkdownLeaf_29_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("| --- | --- |", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"| --- | --- |\" in template body");
  }
  __pos += 13;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_29(captures, __indentCol);
  }
  return "| --- | --- |";
}

function __invert_MarkdownLeaf_30_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  if (__s.indexOf("|:---|---:|", __pos) !== __pos) {
    throw new Error("stringify: expected leading literal \"|:---|---:|\" in template body");
  }
  __pos += 11;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_30(captures, __indentCol);
  }
  return "|:---|---:|";
}

function __invert_MarkdownLeaf_31_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_31(captures, __indentCol);
  }
  return "| " + __rebuildSlot(captures.first) + " | " + __rebuildSlot(captures.second) + " |";
}

function __invert_MarkdownLeaf_32_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_32(captures, __indentCol);
  }
  return "[" + __rebuildSlot(captures.id) + "]: " + __rebuildSlot(captures.url);
}

function __invert_MarkdownLeaf_33_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_33(captures, __indentCol);
  }
  return "[^" + __rebuildSlot(captures.id) + "]: " + __rebuildSlot(captures.text);
}

function __invert_MarkdownLeaf_34_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_34(captures, __indentCol);
  }
  return "[^" + __rebuildSlot(captures.id) + "]";
}

function __invert_MarkdownLeaf_35_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_35(captures, __indentCol);
  }
  return "<" + __rebuildSlot(captures.tag) + ">" + __rebuildSlot(captures.body) + "</" + __rebuildSlot(captures.closingTag) + ">";
}

function __invert_MarkdownLeaf_36_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
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
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownLeaf_36(captures, __indentCol);
  }
  return "<" + __rebuildSlot(captures.url) + ">";
}

function __invert_MarkdownParagraph_0_source(value: any, __indentCol: number = 0): string {
  const captures: any = {};
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    const __r = (value as any).raws;
    if (Array.isArray(__r.__ws)) captures.__ws = __r.__ws;
    if (Array.isArray(__r.__litPres)) captures.__litPres = __r.__litPres;
    for (const __k in __r) {
      if (__k.endsWith('_iws') && Array.isArray(__r[__k])) captures[__k] = __r[__k];
    }
  }
  if (typeof value !== "string") {
    throw new Error("stringify: expected string value for template body, got " + typeof value);
  }
  const __s: string = value;
  let __pos = 0;
  captures.text = __invertSlotLeaf_source(__s.slice(__pos));
  __pos = __s.length;
  if (__pos !== __s.length) {
    throw new Error("stringify: trailing content not described by template body (pos " + __pos + " of " + __s.length + ")");
  }
  if (value !== null && typeof value === 'object' && (value as any).raws !== null && typeof (value as any).raws === 'object') {
    return __rebuild_MarkdownParagraph_0(captures, __indentCol);
  }
  return String(__rebuildSlot(captures.text));
}

function __dispatchInverse_MarkdownDocument_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "document")) return __invert_MarkdownDocument_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownLeaf_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "code-block") && "lang" in value) return __invert_MarkdownLeaf_18_ast(value, __indentCol);
    if (Object.is(value.type, "code-block") && !("lang" in value)) return __invert_MarkdownLeaf_19_ast(value, __indentCol);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 6)) return __invert_MarkdownLeaf_0_ast(value, __indentCol);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 5)) return __invert_MarkdownLeaf_1_ast(value, __indentCol);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 4)) return __invert_MarkdownLeaf_2_ast(value, __indentCol);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 3)) return __invert_MarkdownLeaf_3_ast(value, __indentCol);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 2)) return __invert_MarkdownLeaf_4_ast(value, __indentCol);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 1)) return __invert_MarkdownLeaf_5_ast(value, __indentCol);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 1) && Object.is(value.style, "setext")) return __invert_MarkdownLeaf_6_ast(value, __indentCol);
    if (Object.is(value.type, "heading") && Object.is(value.depth, 2) && Object.is(value.style, "setext")) return __invert_MarkdownLeaf_7_ast(value, __indentCol);
    if (Object.is(value.type, "thematic-break") && Object.is(value.marker, "*")) return __invert_MarkdownLeaf_8_ast(value, __indentCol);
    if (Object.is(value.type, "thematic-break") && Object.is(value.marker, "_")) return __invert_MarkdownLeaf_9_ast(value, __indentCol);
    if (Object.is(value.type, "thematic-break")) return __invert_MarkdownLeaf_10_ast(value, __indentCol);
    if (Object.is(value.type, "task-list-item") && Object.is(value.checked, true) && Object.is(value.marker, "x")) return __invert_MarkdownLeaf_11_ast(value, __indentCol);
    if (Object.is(value.type, "task-list-item") && Object.is(value.checked, false)) return __invert_MarkdownLeaf_12_ast(value, __indentCol);
    if (Object.is(value.type, "list-item") && Object.is(value.ordered, false) && Object.is(value.marker, "+")) return __invert_MarkdownLeaf_13_ast(value, __indentCol);
    if (Object.is(value.type, "list-item") && Object.is(value.ordered, false) && Object.is(value.marker, "*")) return __invert_MarkdownLeaf_14_ast(value, __indentCol);
    if (Object.is(value.type, "list-item") && Object.is(value.ordered, false)) return __invert_MarkdownLeaf_15_ast(value, __indentCol);
    if (Object.is(value.type, "list-item") && Object.is(value.ordered, true)) return __invert_MarkdownLeaf_16_ast(value, __indentCol);
    if (Object.is(value.type, "blockquote")) return __invert_MarkdownLeaf_17_ast(value, __indentCol);
    if (Object.is(value.type, "bold")) return __invert_MarkdownLeaf_20_ast(value, __indentCol);
    if (Object.is(value.type, "italic")) return __invert_MarkdownLeaf_21_ast(value, __indentCol);
    if (Object.is(value.type, "strikethrough")) return __invert_MarkdownLeaf_22_ast(value, __indentCol);
    if (Object.is(value.type, "inline-code")) return __invert_MarkdownLeaf_23_ast(value, __indentCol);
    if (Object.is(value.type, "link")) return __invert_MarkdownLeaf_24_ast(value, __indentCol);
    if (Object.is(value.type, "reference-link")) return __invert_MarkdownLeaf_25_ast(value, __indentCol);
    if (Object.is(value.type, "image")) return __invert_MarkdownLeaf_26_ast(value, __indentCol);
    if (Object.is(value.type, "reference-image")) return __invert_MarkdownLeaf_27_ast(value, __indentCol);
    if (Object.is(value.type, "entity")) return __invert_MarkdownLeaf_28_ast(value, __indentCol);
    if (Object.is(value.type, "table-delimiter") && Object.is(value.variant, "plain")) return __invert_MarkdownLeaf_29_ast(value, __indentCol);
    if (Object.is(value.type, "table-delimiter") && Object.is(value.variant, "aligned")) return __invert_MarkdownLeaf_30_ast(value, __indentCol);
    if (Object.is(value.type, "table-row")) return __invert_MarkdownLeaf_31_ast(value, __indentCol);
    if (Object.is(value.type, "definition")) return __invert_MarkdownLeaf_32_ast(value, __indentCol);
    if (Object.is(value.type, "footnote-definition")) return __invert_MarkdownLeaf_33_ast(value, __indentCol);
    if (Object.is(value.type, "footnote-reference")) return __invert_MarkdownLeaf_34_ast(value, __indentCol);
    if (Object.is(value.type, "html")) return __invert_MarkdownLeaf_35_ast(value, __indentCol);
    if (Object.is(value.type, "autolink")) return __invert_MarkdownLeaf_36_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownParagraph_ast(value: any, __indentCol: number = 0): string {
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    if (Object.is(value.type, "paragraph")) return __invert_MarkdownParagraph_0_ast(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'ast' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_ast(value: any): string {
  return __dispatchInverse_MarkdownDocument_ast(value, 0);
}

function __dispatchInverse_MarkdownDocument_html(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_MarkdownDocument_0_html(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'html' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownLeaf_html(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("<li><input type=\"checkbox\" checked>")) return __invert_MarkdownLeaf_11_html(value, __indentCol);
    if (value.startsWith("<div class=\"footnote\" id=\"fn")) return __invert_MarkdownLeaf_33_html(value, __indentCol);
    if (value.startsWith("<li><input type=\"checkbox\">")) return __invert_MarkdownLeaf_12_html(value, __indentCol);
    if (value.startsWith("<a class=\"autolink\" href=\"")) return __invert_MarkdownLeaf_36_html(value, __indentCol);
    if (value.startsWith("<pre><code class=\"lang-")) return __invert_MarkdownLeaf_18_html(value, __indentCol);
    if (value.startsWith("<sup><a href=\"#fn")) return __invert_MarkdownLeaf_34_html(value, __indentCol);
    if (value.startsWith("<blockquote>")) return __invert_MarkdownLeaf_17_html(value, __indentCol);
    if (value.startsWith("<pre><code>")) return __invert_MarkdownLeaf_19_html(value, __indentCol);
    if (value.startsWith("<img src=\"#")) return __invert_MarkdownLeaf_27_html(value, __indentCol);
    if (value.startsWith("<a href=\"#")) return __invert_MarkdownLeaf_25_html(value, __indentCol);
    if (value.startsWith("<img src=\"")) return __invert_MarkdownLeaf_26_html(value, __indentCol);
    if (value.startsWith("<a href=\"")) return __invert_MarkdownLeaf_24_html(value, __indentCol);
    if (value.startsWith("<strong>")) return __invert_MarkdownLeaf_20_html(value, __indentCol);
    if (value.startsWith("<tr><td>")) return __invert_MarkdownLeaf_31_html(value, __indentCol);
    if (value.startsWith("<code>")) return __invert_MarkdownLeaf_23_html(value, __indentCol);
    if (value.startsWith("<h6>")) return __invert_MarkdownLeaf_0_html(value, __indentCol);
    if (value.startsWith("<h5>")) return __invert_MarkdownLeaf_1_html(value, __indentCol);
    if (value.startsWith("<h4>")) return __invert_MarkdownLeaf_2_html(value, __indentCol);
    if (value.startsWith("<h3>")) return __invert_MarkdownLeaf_3_html(value, __indentCol);
    if (value.startsWith("<h2>")) return __invert_MarkdownLeaf_4_html(value, __indentCol);
    if (value.startsWith("<h1>")) return __invert_MarkdownLeaf_5_html(value, __indentCol);
    if (value.startsWith("<hr>")) return __invert_MarkdownLeaf_8_html(value, __indentCol);
    if (value.startsWith("<li>")) return __invert_MarkdownLeaf_13_html(value, __indentCol);
    if (value.startsWith("<em>")) return __invert_MarkdownLeaf_21_html(value, __indentCol);
    if (value.startsWith("<s>")) return __invert_MarkdownLeaf_22_html(value, __indentCol);
    if (value.startsWith("&")) return __invert_MarkdownLeaf_28_html(value, __indentCol);
    if (value.startsWith("<")) return __invert_MarkdownLeaf_35_html(value, __indentCol);
    try { return __invert_MarkdownLeaf_29_html(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'html' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownParagraph_html(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("<p>")) return __invert_MarkdownParagraph_0_html(value, __indentCol);
  }
  throw new Error("stringify: no production matches for target 'html' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_html(value: any): string {
  return __dispatchInverse_MarkdownDocument_html(value, 0);
}

function __dispatchInverse_MarkdownDocument_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_MarkdownDocument_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownLeaf_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    if (value.startsWith("| --- | --- |")) return __invert_MarkdownLeaf_29_source(value, __indentCol);
    if (value.startsWith("|:---|---:|")) return __invert_MarkdownLeaf_30_source(value, __indentCol);
    if (value.startsWith("###### ")) return __invert_MarkdownLeaf_0_source(value, __indentCol);
    if (value.startsWith("##### ")) return __invert_MarkdownLeaf_1_source(value, __indentCol);
    if (value.startsWith("- [x] ")) return __invert_MarkdownLeaf_11_source(value, __indentCol);
    if (value.startsWith("- [ ] ")) return __invert_MarkdownLeaf_12_source(value, __indentCol);
    if (value.startsWith("#### ")) return __invert_MarkdownLeaf_2_source(value, __indentCol);
    if (value.startsWith("### ")) return __invert_MarkdownLeaf_3_source(value, __indentCol);
    if (value.indexOf(" ===") >= 0) { try { return __invert_MarkdownLeaf_6_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf(" ---") >= 0) { try { return __invert_MarkdownLeaf_7_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.startsWith("```\n")) return __invert_MarkdownLeaf_19_source(value, __indentCol);
    if (value.startsWith("## ")) return __invert_MarkdownLeaf_4_source(value, __indentCol);
    if (value.startsWith("***")) return __invert_MarkdownLeaf_8_source(value, __indentCol);
    if (value.startsWith("___")) return __invert_MarkdownLeaf_9_source(value, __indentCol);
    if (value.startsWith("---")) return __invert_MarkdownLeaf_10_source(value, __indentCol);
    if (value.startsWith("```")) return __invert_MarkdownLeaf_18_source(value, __indentCol);
    if (value.indexOf("]: ") >= 0) { try { return __invert_MarkdownLeaf_32_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("]: ") >= 0) { try { return __invert_MarkdownLeaf_33_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.startsWith("# ")) return __invert_MarkdownLeaf_5_source(value, __indentCol);
    if (value.startsWith("+ ")) return __invert_MarkdownLeaf_13_source(value, __indentCol);
    if (value.startsWith("* ")) return __invert_MarkdownLeaf_14_source(value, __indentCol);
    if (value.startsWith("- ")) return __invert_MarkdownLeaf_15_source(value, __indentCol);
    if (value.indexOf(". ") >= 0) { try { return __invert_MarkdownLeaf_16_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.startsWith("> ")) return __invert_MarkdownLeaf_17_source(value, __indentCol);
    if (value.startsWith("**")) return __invert_MarkdownLeaf_20_source(value, __indentCol);
    if (value.startsWith("~~")) return __invert_MarkdownLeaf_22_source(value, __indentCol);
    if (value.indexOf("](") >= 0) { try { return __invert_MarkdownLeaf_24_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("][") >= 0) { try { return __invert_MarkdownLeaf_25_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("](") >= 0) { try { return __invert_MarkdownLeaf_26_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.indexOf("][") >= 0) { try { return __invert_MarkdownLeaf_27_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.startsWith("| ")) return __invert_MarkdownLeaf_31_source(value, __indentCol);
    if (value.indexOf("</") >= 0) { try { return __invert_MarkdownLeaf_35_source(value, __indentCol); } catch (_e) { /* try next */ } }
    if (value.startsWith("*")) return __invert_MarkdownLeaf_21_source(value, __indentCol);
    if (value.startsWith("`")) return __invert_MarkdownLeaf_23_source(value, __indentCol);
    if (value.startsWith("&")) return __invert_MarkdownLeaf_28_source(value, __indentCol);
    try { return __invert_MarkdownLeaf_34_source(value, __indentCol); } catch (_e) { /* try next */ }
    try { return __invert_MarkdownLeaf_36_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_MarkdownParagraph_source(value: any, __indentCol: number = 0): string {
  if (typeof value === "string") {
    try { return __invert_MarkdownParagraph_0_source(value, __indentCol); } catch (_e) { /* try next */ }
  }
  throw new Error("stringify: no production matches for target 'source' (value: " + JSON.stringify(value) + ")");
}

function __dispatchInverse_source(value: any): string {
  return __dispatchInverse_MarkdownDocument_source(value, 0);
}

function __invertSlotFor_MarkdownDocument_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownDocument_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownDocument_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownDocument_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownDocument_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownDocument_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownDocument_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_MarkdownLeaf_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownLeaf_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_MarkdownParagraph_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownParagraph_ast(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_ast(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_ast(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: MarkdownLeaf, MarkdownParagraph; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_MarkdownLeaf_ast(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_ast(v, __indentCol); } catch (_e) { /* try next role */ }
  return String(v);
}

function __invertSlotLeaf_ast(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  // Phase 4c v2: booleans pass through verbatim so synthetic presence
  // fields like __litPres survive the inverse without being coerced to
  // the string "true"/"false". Same for numbers (defensive — no existing
  // codegen path stores numbers in slots, but coercion would be a
  // silent bug in any future schema that does).
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_ast(v[i]);
      if (r !== null && r !== undefined) out.push(r);
    }
    return out;
  }
  return String(v);
}

function __invertSlotFor_MarkdownDocument_html(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownDocument_html(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownDocument_html(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownDocument_html(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownDocument_html(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownDocument_html(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownDocument_html(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_MarkdownLeaf_html(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownLeaf_html(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownLeaf_html(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_MarkdownParagraph_html(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownParagraph_html(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownParagraph_html(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_html(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_html(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: MarkdownLeaf, MarkdownParagraph; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_MarkdownLeaf_html(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_html(v, __indentCol); } catch (_e) { /* try next role */ }
  return String(v);
}

function __invertSlotLeaf_html(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  // Phase 4c v2: booleans pass through verbatim so synthetic presence
  // fields like __litPres survive the inverse without being coerced to
  // the string "true"/"false". Same for numbers (defensive — no existing
  // codegen path stores numbers in slots, but coercion would be a
  // silent bug in any future schema that does).
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_html(v[i]);
      if (r !== null && r !== undefined) out.push(r);
    }
    return out;
  }
  return String(v);
}

function __invertSlotFor_MarkdownDocument_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownDocument_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownDocument_source(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownDocument_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownDocument_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownDocument_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownDocument_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_MarkdownLeaf_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownLeaf_source(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownLeaf_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotFor_MarkdownParagraph_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays are ambiguous between "list of values to recurse" (.repeats()
  // capture) and "an array-shaped node value" (e.g. JsonArray). Try the
  // child dispatcher first; if it accepts arrays (its accept-condition
  // includes Array.isArray) the dispatch returns a source string for the
  // array as a whole. Otherwise fall back to element-wise recursion so
  // the rebuild can join with the per-repeats separator.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) {
      const out: any[] = [];
      for (let i = 0; i < v.length; i++) {
        const r = __invertSlotFor_MarkdownParagraph_source(v[i], __indentCol);
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
    try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) { return null; }
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) { return v; }
  }
  if (typeof v === "object") return __dispatchInverse_MarkdownParagraph_source(v, __indentCol);
  // Other primitives (number, boolean) — try dispatcher; fall back to String(v).
  try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) { return String(v); }
}

function __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_source(v: any, __indentCol: number = 0): any {
  if (v === undefined) return null;
  // Arrays: try each role first (some roles like JsonArray accept arrays as
  // whole values); if all reject, recurse element-wise for .repeats() uses.
  if (Array.isArray(v)) {
    try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) { /* try next role */ }
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotMulti_MarkdownLeaf_MarkdownParagraph_source(v[i], __indentCol);
      if (r != null) out.push(r);
    }
    return out;
  }
  // null: try roles for intentional-null productions (e.g. JsonNull); else
  // treat as absent for optional-slot semantics.
  if (v === null) {
    try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return null;
  }
  if (typeof v === "string") {
    try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) { /* try next role */ }
    return v;
  }
  if (typeof v === "object") {
    try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) { /* try next role */ }
    throw new Error("stringify: no role matched for multi-role capture (roles: MarkdownLeaf, MarkdownParagraph; value: " + JSON.stringify(v) + ")");
  }
  // Other primitives (number, boolean) — try roles; fall back to String(v).
    try { return __dispatchInverse_MarkdownLeaf_source(v, __indentCol); } catch (_e) { /* try next role */ }
    try { return __dispatchInverse_MarkdownParagraph_source(v, __indentCol); } catch (_e) { /* try next role */ }
  return String(v);
}

function __invertSlotLeaf_source(v: any): any {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  // Phase 4c v2: booleans pass through verbatim so synthetic presence
  // fields like __litPres survive the inverse without being coerced to
  // the string "true"/"false". Same for numbers (defensive — no existing
  // codegen path stores numbers in slots, but coercion would be a
  // silent bug in any future schema that does).
  if (typeof v === "boolean" || typeof v === "number") return v;
  if (Array.isArray(v)) {
    const out: any[] = [];
    for (let i = 0; i < v.length; i++) {
      const r = __invertSlotLeaf_source(v[i]);
      if (r !== null && r !== undefined) out.push(r);
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

export function stringify(value: MarkdownDocument_ast, options: { target: "ast" }): string;
export function stringify(value: MarkdownDocument_html, options: { target: "html" }): string;
export function stringify(value: MarkdownDocument_source, options: { target: "source" }): string;
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

function __fusedRender_MarkdownDocument_0_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_children: string[] = [];
    let __slotMatched_children = false;
    // recursive repeats span (MarkdownLeaf, MarkdownParagraph) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        const __bufLenBefore = __slotBuf_children.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_children.push(" ");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 33) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_26_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_27_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 35) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_0_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_1_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_2_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_3_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_4_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_5_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 38) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_28_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 42) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_8_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_20_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_14_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_21_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 43) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_13_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_11_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_12_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_10_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_15_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 48) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 49) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 50) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 51) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 52) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 53) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 54) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 55) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 56) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 57) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 60) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_35_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_36_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 62) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_17_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 91) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_33_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_34_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_24_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_25_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_32_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_9_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 96) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_19_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_18_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_23_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 124) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_30_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_29_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_31_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 126) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_22_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_6_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_7_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownParagraph_0_html(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_children.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_children = true;
        if (off === __loopStart) break;
      }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    if (__slotMatched_children) for (let __i = 0; __i < __slotBuf_children.length; __i++) out.push(__slotBuf_children[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownDocument_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    const __slotBuf_children: string[] = [];
    let __slotMatched_children = false;
    // recursive repeats span (MarkdownLeaf, MarkdownParagraph) — fused loop
    {
      let __count = 0;
      while (true) {
        const __loopStart = off;
        while (off < len) { const __ws = input.charCodeAt(off); if (__ws === 0x20 || __ws === 0x09 || __ws === 0x0a || __ws === 0x0d) { off++; continue; } break; }
        const __bufLenBefore = __slotBuf_children.length;
        const __offBeforeItem = off;
        state.pos = off;
        let __itemMatched = false;
        if (__count > 0) __slotBuf_children.push(" ");
        if (off < len) {
          const __c0 = input.charCodeAt(off);
          if (__c0 === 33) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_26_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_27_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 35) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_0_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_1_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_2_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_3_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_4_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_5_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 38) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_28_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 42) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_8_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_20_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_14_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_21_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 43) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_13_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 45) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_11_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_12_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_10_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_15_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 48) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 49) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 50) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 51) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 52) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 53) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 54) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 55) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 56) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 57) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_16_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 60) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_35_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_36_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 62) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_17_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 91) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_33_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_34_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_24_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_25_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_32_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 95) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_9_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 96) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_19_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_18_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_23_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 124) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_30_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_29_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_31_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else if (__c0 === 126) {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_22_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
          else {
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_6_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownLeaf_7_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
            if (!__itemMatched) {
              state.pos = __offBeforeItem;
              __slotBuf_children.length = __bufLenBefore + (__count > 0 ? 1 : 0);
              if (__fusedRender_MarkdownParagraph_0_source(state, __slotBuf_children)) { __itemMatched = true; off = state.pos; }
            }
          }
        }
        if (!__itemMatched) {
          __slotBuf_children.length = __bufLenBefore;
          off = __offBeforeItem;
          state.pos = __offBeforeItem;
          break;
        }
        __count++;
        __slotMatched_children = true;
        if (off === __loopStart) break;
      }
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    if (__slotMatched_children) for (let __i = 0; __i < __slotBuf_children.length; __i++) out.push(__slotBuf_children[__i]);
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_0_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("######", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<h6>");
    out.push(String(text ?? ""));
    out.push("</h6>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("######", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 6;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("###### ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_1_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("#####", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<h5>");
    out.push(String(text ?? ""));
    out.push("</h5>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_1_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("#####", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("##### ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_2_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("####", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<h4>");
    out.push(String(text ?? ""));
    out.push("</h4>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_2_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("####", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("#### ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_3_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("###", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<h3>");
    out.push(String(text ?? ""));
    out.push("</h3>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_3_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("###", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("### ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_4_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 35 && input.charCodeAt(off + 1) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<h2>");
    out.push(String(text ?? ""));
    out.push("</h2>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_4_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 35 && input.charCodeAt(off + 1) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("## ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_5_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<h1>");
    out.push(String(text ?? ""));
    out.push("</h1>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_5_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("# ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_6_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("===", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<h1>");
    out.push(String(text ?? ""));
    out.push("</h1>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_6_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("===", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(text ?? ""));
    out.push(" ===");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_7_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<h2>");
    out.push(String(text ?? ""));
    out.push("</h2>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_7_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(text ?? ""));
    out.push(" ---");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_8_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("***", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<hr>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_8_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("***", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("***");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_9_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("___", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<hr>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_9_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("___", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("___");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_10_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<hr>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_10_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("---");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_11_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("- [x]", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<li><input type=\"checkbox\" checked>");
    out.push(String(text ?? ""));
    out.push("</li>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_11_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("- [x]", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("- [x] ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_12_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("- [ ]", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<li><input type=\"checkbox\">");
    out.push(String(text ?? ""));
    out.push("</li>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_12_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("- [ ]", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 5;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("- [ ] ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_13_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 43 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<li>");
    out.push(String(text ?? ""));
    out.push("</li>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_13_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 43 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("+ ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_14_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<li>");
    out.push(String(text ?? ""));
    out.push("</li>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_14_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("* ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_15_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 45 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<li>");
    out.push(String(text ?? ""));
    out.push("</li>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_15_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 45 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("- ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_16_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __index_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __index_end = off;
    const index = input.slice(__index_start, __index_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 46)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<li>");
    out.push(String(text ?? ""));
    out.push("</li>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_16_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __index_start = off;
    if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
    off++;
    while (off < len && isDigit(input.charCodeAt(off))) off++;
    const __index_end = off;
    const index = input.slice(__index_start, __index_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 46)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(index ?? ""));
    out.push(". ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_17_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<blockquote>");
    out.push(String(text ?? ""));
    out.push("</blockquote>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_17_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("> ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_18_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __lang_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __lang_end = off;
    const lang = input.slice(__lang_start, __lang_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let body: string = '';
    let __body_start = off;
    let __body_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __body_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if ((__c === 96 && input.startsWith("```", off))) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __body_start;
      if (__lastNonWs === __body_start) {
        off = __emptyAnchor;
        body = '';
      } else {
        off = __lastNonWs;
        body = input.slice(__body_start, __lastNonWs);
      }
      __body_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<pre><code class=\"lang-");
    out.push(String(lang ?? ""));
    out.push("\">");
    out.push(String(body ?? ""));
    out.push("</code></pre>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_18_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __lang_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __lang_end = off;
    const lang = input.slice(__lang_start, __lang_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let body: string = '';
    let __body_start = off;
    let __body_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __body_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if ((__c === 96 && input.startsWith("```", off))) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __body_start;
      if (__lastNonWs === __body_start) {
        off = __emptyAnchor;
        body = '';
      } else {
        off = __lastNonWs;
        body = input.slice(__body_start, __lastNonWs);
      }
      __body_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("```");
    out.push(String(lang ?? ""));
    out.push(" ");
    out.push(String(body ?? ""));
    out.push(" ```");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_19_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("```\n", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let body: string = '';
    let __body_start = off;
    let __body_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __body_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if ((__c === 96 && input.startsWith("```", off))) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __body_start;
      if (__lastNonWs === __body_start) {
        off = __emptyAnchor;
        body = '';
      } else {
        off = __lastNonWs;
        body = input.slice(__body_start, __lastNonWs);
      }
      __body_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<pre><code>");
    out.push(String(body ?? ""));
    out.push("</code></pre>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_19_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("```\n", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 4;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let body: string = '';
    let __body_start = off;
    let __body_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __body_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if ((__c === 96 && input.startsWith("```", off))) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __body_start;
      if (__lastNonWs === __body_start) {
        off = __emptyAnchor;
        body = '';
      } else {
        off = __lastNonWs;
        body = input.slice(__body_start, __lastNonWs);
      }
      __body_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("```\n");
    out.push(String(body ?? ""));
    out.push(" ```");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_20_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if ((__c === 42 && input.startsWith("**", off))) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<strong>");
    out.push(String(text ?? ""));
    out.push("</strong>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_20_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if ((__c === 42 && input.startsWith("**", off))) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("**");
    out.push(String(text ?? ""));
    out.push("**");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_21_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 42) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<em>");
    out.push(String(text ?? ""));
    out.push("</em>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_21_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 42) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("*");
    out.push(String(text ?? ""));
    out.push("*");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_22_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 126 && input.charCodeAt(off + 1) === 126)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if ((__c === 126 && input.startsWith("~~", off))) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 126 && input.charCodeAt(off + 1) === 126)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<s>");
    out.push(String(text ?? ""));
    out.push("</s>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_22_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 126 && input.charCodeAt(off + 1) === 126)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if ((__c === 126 && input.startsWith("~~", off))) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 126 && input.charCodeAt(off + 1) === 126)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("~~");
    out.push(String(text ?? ""));
    out.push("~~");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_23_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 96)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 96) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 96)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<code>");
    out.push(String(text ?? ""));
    out.push("</code>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_23_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 96)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 96) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 96)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("`");
    out.push(String(text ?? ""));
    out.push("`");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_24_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let label: string = '';
    let __label_start = off;
    let __label_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __label_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __label_start;
      if (__lastNonWs === __label_start) {
        off = __emptyAnchor;
        label = '';
      } else {
        off = __lastNonWs;
        label = input.slice(__label_start, __lastNonWs);
      }
      __label_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let url: string = '';
    let __url_start = off;
    let __url_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __url_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 41) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __url_start;
      if (__lastNonWs === __url_start) {
        off = __emptyAnchor;
        url = '';
      } else {
        off = __lastNonWs;
        url = input.slice(__url_start, __lastNonWs);
      }
      __url_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<a href=\"");
    out.push(String(url ?? ""));
    out.push("\">");
    out.push(String(label ?? ""));
    out.push("</a>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_24_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let label: string = '';
    let __label_start = off;
    let __label_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __label_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __label_start;
      if (__lastNonWs === __label_start) {
        off = __emptyAnchor;
        label = '';
      } else {
        off = __lastNonWs;
        label = input.slice(__label_start, __lastNonWs);
      }
      __label_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let url: string = '';
    let __url_start = off;
    let __url_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __url_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 41) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __url_start;
      if (__lastNonWs === __url_start) {
        off = __emptyAnchor;
        url = '';
      } else {
        off = __lastNonWs;
        url = input.slice(__url_start, __lastNonWs);
      }
      __url_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("[");
    out.push(String(label ?? ""));
    out.push("](");
    out.push(String(url ?? ""));
    out.push(")");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_25_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let label: string = '';
    let __label_start = off;
    let __label_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __label_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __label_start;
      if (__lastNonWs === __label_start) {
        off = __emptyAnchor;
        label = '';
      } else {
        off = __lastNonWs;
        label = input.slice(__label_start, __lastNonWs);
      }
      __label_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93 && input.charCodeAt(off + 1) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<a href=\"#");
    out.push(String(id ?? ""));
    out.push("\">");
    out.push(String(label ?? ""));
    out.push("</a>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_25_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let label: string = '';
    let __label_start = off;
    let __label_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __label_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __label_start;
      if (__lastNonWs === __label_start) {
        off = __emptyAnchor;
        label = '';
      } else {
        off = __lastNonWs;
        label = input.slice(__label_start, __lastNonWs);
      }
      __label_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93 && input.charCodeAt(off + 1) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("[");
    out.push(String(label ?? ""));
    out.push("][");
    out.push(String(id ?? ""));
    out.push("]");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_26_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let alt: string = '';
    let __alt_start = off;
    let __alt_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __alt_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __alt_start;
      if (__lastNonWs === __alt_start) {
        off = __emptyAnchor;
        alt = '';
      } else {
        off = __lastNonWs;
        alt = input.slice(__alt_start, __lastNonWs);
      }
      __alt_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let url: string = '';
    let __url_start = off;
    let __url_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __url_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 41) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __url_start;
      if (__lastNonWs === __url_start) {
        off = __emptyAnchor;
        url = '';
      } else {
        off = __lastNonWs;
        url = input.slice(__url_start, __lastNonWs);
      }
      __url_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<img src=\"");
    out.push(String(url ?? ""));
    out.push("\" alt=\"");
    out.push(String(alt ?? ""));
    out.push("\">");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_26_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let alt: string = '';
    let __alt_start = off;
    let __alt_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __alt_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __alt_start;
      if (__lastNonWs === __alt_start) {
        off = __emptyAnchor;
        alt = '';
      } else {
        off = __lastNonWs;
        alt = input.slice(__alt_start, __lastNonWs);
      }
      __alt_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let url: string = '';
    let __url_start = off;
    let __url_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __url_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 41) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __url_start;
      if (__lastNonWs === __url_start) {
        off = __emptyAnchor;
        url = '';
      } else {
        off = __lastNonWs;
        url = input.slice(__url_start, __lastNonWs);
      }
      __url_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("![");
    out.push(String(alt ?? ""));
    out.push("](");
    out.push(String(url ?? ""));
    out.push(")");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_27_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let alt: string = '';
    let __alt_start = off;
    let __alt_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __alt_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __alt_start;
      if (__lastNonWs === __alt_start) {
        off = __emptyAnchor;
        alt = '';
      } else {
        off = __lastNonWs;
        alt = input.slice(__alt_start, __lastNonWs);
      }
      __alt_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93 && input.charCodeAt(off + 1) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<img src=\"#");
    out.push(String(id ?? ""));
    out.push("\" alt=\"");
    out.push(String(alt ?? ""));
    out.push("\">");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_27_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let alt: string = '';
    let __alt_start = off;
    let __alt_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __alt_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __alt_start;
      if (__lastNonWs === __alt_start) {
        off = __emptyAnchor;
        alt = '';
      } else {
        off = __lastNonWs;
        alt = input.slice(__alt_start, __lastNonWs);
      }
      __alt_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93 && input.charCodeAt(off + 1) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("![");
    out.push(String(alt ?? ""));
    out.push("][");
    out.push(String(id ?? ""));
    out.push("]");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_28_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 38)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __name_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __name_end = off;
    const name = input.slice(__name_start, __name_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("&");
    out.push(String(name ?? ""));
    out.push(";");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_28_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 38)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __name_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __name_end = off;
    const name = input.slice(__name_start, __name_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("&");
    out.push(String(name ?? ""));
    out.push(";");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_29_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_29_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("| --- | --- |");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_30_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_30_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 3;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("|:---|---:|");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_31_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let first: string = '';
    let __first_start = off;
    let __first_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __first_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 124) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __first_start;
      if (__lastNonWs === __first_start) {
        off = __emptyAnchor;
        first = '';
      } else {
        off = __lastNonWs;
        first = input.slice(__first_start, __lastNonWs);
      }
      __first_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let second: string = '';
    let __second_start = off;
    let __second_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __second_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 124) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __second_start;
      if (__lastNonWs === __second_start) {
        off = __emptyAnchor;
        second = '';
      } else {
        off = __lastNonWs;
        second = input.slice(__second_start, __lastNonWs);
      }
      __second_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<tr><td>");
    out.push(String(first ?? ""));
    out.push("</td><td>");
    out.push(String(second ?? ""));
    out.push("</td></tr>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_31_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let first: string = '';
    let __first_start = off;
    let __first_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __first_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 124) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __first_start;
      if (__lastNonWs === __first_start) {
        off = __emptyAnchor;
        first = '';
      } else {
        off = __lastNonWs;
        first = input.slice(__first_start, __lastNonWs);
      }
      __first_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let second: string = '';
    let __second_start = off;
    let __second_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __second_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 124) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __second_start;
      if (__lastNonWs === __second_start) {
        off = __emptyAnchor;
        second = '';
      } else {
        off = __lastNonWs;
        second = input.slice(__second_start, __lastNonWs);
      }
      __second_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("| ");
    out.push(String(first ?? ""));
    out.push(" | ");
    out.push(String(second ?? ""));
    out.push(" |");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_32_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let url: string = '';
    let __url_start = off;
    let __url_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __url_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __url_start;
      if (__lastNonWs === __url_start) {
        off = __emptyAnchor;
        url = '';
      } else {
        off = __lastNonWs;
        url = input.slice(__url_start, __lastNonWs);
      }
      __url_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_32_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let url: string = '';
    let __url_start = off;
    let __url_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __url_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __url_start;
      if (__lastNonWs === __url_start) {
        off = __emptyAnchor;
        url = '';
      } else {
        off = __lastNonWs;
        url = input.slice(__url_start, __lastNonWs);
      }
      __url_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("[");
    out.push(String(id ?? ""));
    out.push("]: ");
    out.push(String(url ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_33_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91 && input.charCodeAt(off + 1) === 94)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<div class=\"footnote\" id=\"fn");
    out.push(String(id ?? ""));
    out.push("\">");
    out.push(String(text ?? ""));
    out.push("</div>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_33_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91 && input.charCodeAt(off + 1) === 94)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 10) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("[^");
    out.push(String(id ?? ""));
    out.push("]: ");
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_34_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91 && input.charCodeAt(off + 1) === 94)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<sup><a href=\"#fn");
    out.push(String(id ?? ""));
    out.push("\">");
    out.push(String(id ?? ""));
    out.push("</a></sup>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_34_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 91 && input.charCodeAt(off + 1) === 94)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let id: string = '';
    let __id_start = off;
    let __id_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __id_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 93) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __id_start;
      if (__lastNonWs === __id_start) {
        off = __emptyAnchor;
        id = '';
      } else {
        off = __lastNonWs;
        id = input.slice(__id_start, __lastNonWs);
      }
      __id_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("[^");
    out.push(String(id ?? ""));
    out.push("]");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_35_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __tag_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __tag_end = off;
    const tag = input.slice(__tag_start, __tag_end);
    if (!(tag.toLowerCase() === "div" || tag.toLowerCase() === "span" || tag.toLowerCase() === "p" || tag.toLowerCase() === "pre" || tag.toLowerCase() === "code" || tag.toLowerCase() === "blockquote" || tag.toLowerCase() === "a" || tag.toLowerCase() === "img" || tag.toLowerCase() === "br" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "ul" || tag.toLowerCase() === "ol" || tag.toLowerCase() === "li" || tag.toLowerCase() === "dl" || tag.toLowerCase() === "dt" || tag.toLowerCase() === "dd" || tag.toLowerCase() === "table" || tag.toLowerCase() === "thead" || tag.toLowerCase() === "tbody" || tag.toLowerCase() === "tfoot" || tag.toLowerCase() === "tr" || tag.toLowerCase() === "td" || tag.toLowerCase() === "th" || tag.toLowerCase() === "caption" || tag.toLowerCase() === "figure" || tag.toLowerCase() === "figcaption" || tag.toLowerCase() === "section" || tag.toLowerCase() === "article" || tag.toLowerCase() === "header" || tag.toLowerCase() === "footer" || tag.toLowerCase() === "nav" || tag.toLowerCase() === "aside" || tag.toLowerCase() === "main" || tag.toLowerCase() === "address" || tag.toLowerCase() === "details" || tag.toLowerCase() === "summary" || tag.toLowerCase() === "h1" || tag.toLowerCase() === "h2" || tag.toLowerCase() === "h3" || tag.toLowerCase() === "h4" || tag.toLowerCase() === "h5" || tag.toLowerCase() === "h6" || tag.toLowerCase() === "em" || tag.toLowerCase() === "strong" || tag.toLowerCase() === "i" || tag.toLowerCase() === "b" || tag.toLowerCase() === "u" || tag.toLowerCase() === "s" || tag.toLowerCase() === "small" || tag.toLowerCase() === "sub" || tag.toLowerCase() === "sup" || tag.toLowerCase() === "kbd" || tag.toLowerCase() === "var" || tag.toLowerCase() === "samp" || tag.toLowerCase() === "cite" || tag.toLowerCase() === "q" || tag.toLowerCase() === "dfn" || tag.toLowerCase() === "abbr" || tag.toLowerCase() === "time" || tag.toLowerCase() === "mark" || tag.toLowerCase() === "ruby" || tag.toLowerCase() === "rt" || tag.toLowerCase() === "rp" || tag.toLowerCase() === "bdi" || tag.toLowerCase() === "bdo" || tag.toLowerCase() === "wbr" || tag.toLowerCase() === "form" || tag.toLowerCase() === "input" || tag.toLowerCase() === "button" || tag.toLowerCase() === "select" || tag.toLowerCase() === "option" || tag.toLowerCase() === "optgroup" || tag.toLowerCase() === "textarea" || tag.toLowerCase() === "label" || tag.toLowerCase() === "fieldset" || tag.toLowerCase() === "legend" || tag.toLowerCase() === "datalist" || tag.toLowerCase() === "output" || tag.toLowerCase() === "progress" || tag.toLowerCase() === "meter" || tag.toLowerCase() === "video" || tag.toLowerCase() === "audio" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "canvas" || tag.toLowerCase() === "svg" || tag.toLowerCase() === "math" || tag.toLowerCase() === "iframe" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "object" || tag.toLowerCase() === "param" || tag.toLowerCase() === "picture" || tag.toLowerCase() === "script" || tag.toLowerCase() === "style" || tag.toLowerCase() === "noscript" || tag.toLowerCase() === "template" || tag.toLowerCase() === "html" || tag.toLowerCase() === "head" || tag.toLowerCase() === "body" || tag.toLowerCase() === "title" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "link" || tag.toLowerCase() === "base")) { state.pos = entryOff; return null; }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let body: string = '';
    let __body_start = off;
    let __body_end = off;
    {
      __body_start = off;
      let __earliest = len;
      for (let __i = __body_start; __i < len; __i++) {
        const __c = input.charCodeAt(__i);
        if (__c === 60 && ((__i + 1 < len && input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
      }
      off = __earliest;
      __body_end = off;
      body = input.slice(__body_start, __body_end);
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __closingTag_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __closingTag_end = off;
    const closingTag = input.slice(__closingTag_start, __closingTag_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<");
    out.push(String(tag ?? ""));
    out.push(">");
    out.push(String(body ?? ""));
    out.push("</");
    out.push(String(closingTag ?? ""));
    out.push(">");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_35_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __tag_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __tag_end = off;
    const tag = input.slice(__tag_start, __tag_end);
    if (!(tag.toLowerCase() === "div" || tag.toLowerCase() === "span" || tag.toLowerCase() === "p" || tag.toLowerCase() === "pre" || tag.toLowerCase() === "code" || tag.toLowerCase() === "blockquote" || tag.toLowerCase() === "a" || tag.toLowerCase() === "img" || tag.toLowerCase() === "br" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "ul" || tag.toLowerCase() === "ol" || tag.toLowerCase() === "li" || tag.toLowerCase() === "dl" || tag.toLowerCase() === "dt" || tag.toLowerCase() === "dd" || tag.toLowerCase() === "table" || tag.toLowerCase() === "thead" || tag.toLowerCase() === "tbody" || tag.toLowerCase() === "tfoot" || tag.toLowerCase() === "tr" || tag.toLowerCase() === "td" || tag.toLowerCase() === "th" || tag.toLowerCase() === "caption" || tag.toLowerCase() === "figure" || tag.toLowerCase() === "figcaption" || tag.toLowerCase() === "section" || tag.toLowerCase() === "article" || tag.toLowerCase() === "header" || tag.toLowerCase() === "footer" || tag.toLowerCase() === "nav" || tag.toLowerCase() === "aside" || tag.toLowerCase() === "main" || tag.toLowerCase() === "address" || tag.toLowerCase() === "details" || tag.toLowerCase() === "summary" || tag.toLowerCase() === "h1" || tag.toLowerCase() === "h2" || tag.toLowerCase() === "h3" || tag.toLowerCase() === "h4" || tag.toLowerCase() === "h5" || tag.toLowerCase() === "h6" || tag.toLowerCase() === "em" || tag.toLowerCase() === "strong" || tag.toLowerCase() === "i" || tag.toLowerCase() === "b" || tag.toLowerCase() === "u" || tag.toLowerCase() === "s" || tag.toLowerCase() === "small" || tag.toLowerCase() === "sub" || tag.toLowerCase() === "sup" || tag.toLowerCase() === "kbd" || tag.toLowerCase() === "var" || tag.toLowerCase() === "samp" || tag.toLowerCase() === "cite" || tag.toLowerCase() === "q" || tag.toLowerCase() === "dfn" || tag.toLowerCase() === "abbr" || tag.toLowerCase() === "time" || tag.toLowerCase() === "mark" || tag.toLowerCase() === "ruby" || tag.toLowerCase() === "rt" || tag.toLowerCase() === "rp" || tag.toLowerCase() === "bdi" || tag.toLowerCase() === "bdo" || tag.toLowerCase() === "wbr" || tag.toLowerCase() === "form" || tag.toLowerCase() === "input" || tag.toLowerCase() === "button" || tag.toLowerCase() === "select" || tag.toLowerCase() === "option" || tag.toLowerCase() === "optgroup" || tag.toLowerCase() === "textarea" || tag.toLowerCase() === "label" || tag.toLowerCase() === "fieldset" || tag.toLowerCase() === "legend" || tag.toLowerCase() === "datalist" || tag.toLowerCase() === "output" || tag.toLowerCase() === "progress" || tag.toLowerCase() === "meter" || tag.toLowerCase() === "video" || tag.toLowerCase() === "audio" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "canvas" || tag.toLowerCase() === "svg" || tag.toLowerCase() === "math" || tag.toLowerCase() === "iframe" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "object" || tag.toLowerCase() === "param" || tag.toLowerCase() === "picture" || tag.toLowerCase() === "script" || tag.toLowerCase() === "style" || tag.toLowerCase() === "noscript" || tag.toLowerCase() === "template" || tag.toLowerCase() === "html" || tag.toLowerCase() === "head" || tag.toLowerCase() === "body" || tag.toLowerCase() === "title" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "link" || tag.toLowerCase() === "base")) { state.pos = entryOff; return null; }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let body: string = '';
    let __body_start = off;
    let __body_end = off;
    {
      __body_start = off;
      let __earliest = len;
      for (let __i = __body_start; __i < len; __i++) {
        const __c = input.charCodeAt(__i);
        if (__c === 60 && ((__i + 1 < len && input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
      }
      off = __earliest;
      __body_end = off;
      body = input.slice(__body_start, __body_end);
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 2;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    const __closingTag_start = off;
    off++;
    while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
    const __closingTag_end = off;
    const closingTag = input.slice(__closingTag_start, __closingTag_end);
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<");
    out.push(String(tag ?? ""));
    out.push(">");
    out.push(String(body ?? ""));
    out.push("</");
    out.push(String(closingTag ?? ""));
    out.push(">");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_36_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let url: string = '';
    let __url_start = off;
    let __url_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __url_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 62) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __url_start;
      if (__lastNonWs === __url_start) {
        off = __emptyAnchor;
        url = '';
      } else {
        off = __lastNonWs;
        url = input.slice(__url_start, __lastNonWs);
      }
      __url_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<a class=\"autolink\" href=\"");
    out.push(String(url ?? ""));
    out.push("\">");
    out.push(String(url ?? ""));
    out.push("</a>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownLeaf_36_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let url: string = '';
    let __url_start = off;
    let __url_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __url_start = off;
      let __lastNonWs = off;
      while (off < len) {
        const __c = input.charCodeAt(off);
        if (__c === 62) break;
        if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
        off++;
      }
      const __emptyAnchor = __url_start;
      if (__lastNonWs === __url_start) {
        off = __emptyAnchor;
        url = '';
      } else {
        off = __lastNonWs;
        url = input.slice(__url_start, __lastNonWs);
      }
      __url_end = off;
    }
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
    off += 1;
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<");
    out.push(String(url ?? ""));
    out.push(">");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownParagraph_0_html(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      {
        let __acState = 0;
        const __acLen = input.length;
        let __acBest = -1;
        const __acMaxLen = 4;
        while (off < __acLen) {
          const __acC = input.charCodeAt(off);
          switch (__acState) {
            case 0: {
              if (__acC === 10) { __acState = 1; break; }
              else { break; }
            }
            case 1: {
              if (__acC === 10) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 2;
                break;
              }
              else if (__acC === 35) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 3;
                break;
              }
              else if (__acC === 42) { __acState = 10; break; }
              else if (__acC === 43) { __acState = 8; break; }
              else if (__acC === 45) { __acState = 5; break; }
              else if (__acC === 61) { __acState = 23; break; }
              else if (__acC === 62) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 4;
                break;
              }
              else if (__acC === 91) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 26;
                break;
              }
              else if (__acC === 95) { __acState = 20; break; }
              else if (__acC === 96) { __acState = 12; break; }
              else if (__acC === 124) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 15;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 2: {
              if (__acC === 10) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 2;
                break;
              }
              else if (__acC === 35) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 3;
                break;
              }
              else if (__acC === 42) { __acState = 10; break; }
              else if (__acC === 43) { __acState = 8; break; }
              else if (__acC === 45) { __acState = 5; break; }
              else if (__acC === 61) { __acState = 23; break; }
              else if (__acC === 62) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 4;
                break;
              }
              else if (__acC === 91) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 26;
                break;
              }
              else if (__acC === 95) { __acState = 20; break; }
              else if (__acC === 96) { __acState = 12; break; }
              else if (__acC === 124) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 15;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 3: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 4: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 5: {
              if (__acC === 10) {
                const __acStart = off - 2;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 7;
                break;
              }
              else if (__acC === 32) {
                const __acStart = off - 2;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 6;
                break;
              }
              else if (__acC === 45) { __acState = 16; break; }
              else { __acState = 0; continue; }
            }
            case 6: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 7: {
              if (__acC === 10) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 2;
                break;
              }
              else if (__acC === 35) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 3;
                break;
              }
              else if (__acC === 42) { __acState = 10; break; }
              else if (__acC === 43) { __acState = 8; break; }
              else if (__acC === 45) { __acState = 5; break; }
              else if (__acC === 61) { __acState = 23; break; }
              else if (__acC === 62) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 4;
                break;
              }
              else if (__acC === 91) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 26;
                break;
              }
              else if (__acC === 95) { __acState = 20; break; }
              else if (__acC === 96) { __acState = 12; break; }
              else if (__acC === 124) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 15;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 8: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 32) {
                const __acStart = off - 2;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 9;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 9: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 10: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 32) {
                const __acStart = off - 2;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 11;
                break;
              }
              else if (__acC === 42) { __acState = 18; break; }
              else { __acState = 0; continue; }
            }
            case 11: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 12: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 96) { __acState = 13; break; }
              else { __acState = 0; continue; }
            }
            case 13: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 96) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 14;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 14: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 15: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 16: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 45) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 17;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 17: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 18: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 42) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 19;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 19: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 20: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 95) { __acState = 21; break; }
              else { __acState = 0; continue; }
            }
            case 21: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 95) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 22;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 22: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 23: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 61) { __acState = 24; break; }
              else { __acState = 0; continue; }
            }
            case 24: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 61) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 25;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 25: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 26: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
          }
          off++;
          if (__acBest !== -1 && off >= __acBest + __acMaxLen) break;
        }
        off = __acBest === -1 ? __acLen : __acBest;
      }
      __lastNonWs = off;
      while (__lastNonWs > __text_start) {
        const __wc = input.charCodeAt(__lastNonWs - 1);
        if (__wc !== 0x20 && __wc !== 0x09 && __wc !== 0x0a && __wc !== 0x0d) break;
        __lastNonWs--;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push("<p>");
    out.push(String(text ?? ""));
    out.push("</p>");
    return true;
  })();
  return __ok === true;
}

function __fusedRender_MarkdownParagraph_0_source(state: State, out: string[]): boolean {
  const __ok = ((): unknown => {
    const input = state.input;
    const len = state.len;
    let off = state.pos;
    const entryOff = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    let text: string = '';
    let __text_start = off;
    let __text_end = off;
    {
      while (off < len) {
        const __c0 = input.charCodeAt(off);
        if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
        break;
      }
      __text_start = off;
      let __lastNonWs = off;
      {
        let __acState = 0;
        const __acLen = input.length;
        let __acBest = -1;
        const __acMaxLen = 4;
        while (off < __acLen) {
          const __acC = input.charCodeAt(off);
          switch (__acState) {
            case 0: {
              if (__acC === 10) { __acState = 1; break; }
              else { break; }
            }
            case 1: {
              if (__acC === 10) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 2;
                break;
              }
              else if (__acC === 35) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 3;
                break;
              }
              else if (__acC === 42) { __acState = 10; break; }
              else if (__acC === 43) { __acState = 8; break; }
              else if (__acC === 45) { __acState = 5; break; }
              else if (__acC === 61) { __acState = 23; break; }
              else if (__acC === 62) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 4;
                break;
              }
              else if (__acC === 91) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 26;
                break;
              }
              else if (__acC === 95) { __acState = 20; break; }
              else if (__acC === 96) { __acState = 12; break; }
              else if (__acC === 124) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 15;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 2: {
              if (__acC === 10) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 2;
                break;
              }
              else if (__acC === 35) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 3;
                break;
              }
              else if (__acC === 42) { __acState = 10; break; }
              else if (__acC === 43) { __acState = 8; break; }
              else if (__acC === 45) { __acState = 5; break; }
              else if (__acC === 61) { __acState = 23; break; }
              else if (__acC === 62) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 4;
                break;
              }
              else if (__acC === 91) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 26;
                break;
              }
              else if (__acC === 95) { __acState = 20; break; }
              else if (__acC === 96) { __acState = 12; break; }
              else if (__acC === 124) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 15;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 3: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 4: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 5: {
              if (__acC === 10) {
                const __acStart = off - 2;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 7;
                break;
              }
              else if (__acC === 32) {
                const __acStart = off - 2;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 6;
                break;
              }
              else if (__acC === 45) { __acState = 16; break; }
              else { __acState = 0; continue; }
            }
            case 6: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 7: {
              if (__acC === 10) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 2;
                break;
              }
              else if (__acC === 35) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 3;
                break;
              }
              else if (__acC === 42) { __acState = 10; break; }
              else if (__acC === 43) { __acState = 8; break; }
              else if (__acC === 45) { __acState = 5; break; }
              else if (__acC === 61) { __acState = 23; break; }
              else if (__acC === 62) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 4;
                break;
              }
              else if (__acC === 91) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 26;
                break;
              }
              else if (__acC === 95) { __acState = 20; break; }
              else if (__acC === 96) { __acState = 12; break; }
              else if (__acC === 124) {
                const __acStart = off - 1;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 15;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 8: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 32) {
                const __acStart = off - 2;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 9;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 9: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 10: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 32) {
                const __acStart = off - 2;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 11;
                break;
              }
              else if (__acC === 42) { __acState = 18; break; }
              else { __acState = 0; continue; }
            }
            case 11: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 12: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 96) { __acState = 13; break; }
              else { __acState = 0; continue; }
            }
            case 13: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 96) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 14;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 14: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 15: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 16: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 45) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 17;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 17: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 18: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 42) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 19;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 19: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 20: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 95) { __acState = 21; break; }
              else { __acState = 0; continue; }
            }
            case 21: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 95) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 22;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 22: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 23: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 61) { __acState = 24; break; }
              else { __acState = 0; continue; }
            }
            case 24: {
              if (__acC === 10) { __acState = 1; break; }
              else if (__acC === 61) {
                const __acStart = off - 3;
                if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
                __acState = 25;
                break;
              }
              else { __acState = 0; continue; }
            }
            case 25: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
            case 26: {
              if (__acC === 10) { __acState = 1; break; }
              else { __acState = 0; continue; }
            }
          }
          off++;
          if (__acBest !== -1 && off >= __acBest + __acMaxLen) break;
        }
        off = __acBest === -1 ? __acLen : __acBest;
      }
      __lastNonWs = off;
      while (__lastNonWs > __text_start) {
        const __wc = input.charCodeAt(__lastNonWs - 1);
        if (__wc !== 0x20 && __wc !== 0x09 && __wc !== 0x0a && __wc !== 0x0d) break;
        __lastNonWs--;
      }
      const __emptyAnchor = __text_start;
      if (__lastNonWs === __text_start) {
        off = __emptyAnchor;
        text = '';
      } else {
        off = __lastNonWs;
        text = input.slice(__text_start, __lastNonWs);
      }
      __text_end = off;
    }
    state.pos = off;
    if (off > state.maxOff) state.maxOff = off;
    out.push(String(text ?? ""));
    return true;
  })();
  return __ok === true;
}

const __fusedRenderDispatch_html: Record<string, (state: State, out: string[]) => boolean> = {
  "MarkdownDocument#0": __fusedRender_MarkdownDocument_0_html,
  "MarkdownLeaf#0": __fusedRender_MarkdownLeaf_0_html,
  "MarkdownLeaf#1": __fusedRender_MarkdownLeaf_1_html,
  "MarkdownLeaf#2": __fusedRender_MarkdownLeaf_2_html,
  "MarkdownLeaf#3": __fusedRender_MarkdownLeaf_3_html,
  "MarkdownLeaf#4": __fusedRender_MarkdownLeaf_4_html,
  "MarkdownLeaf#5": __fusedRender_MarkdownLeaf_5_html,
  "MarkdownLeaf#6": __fusedRender_MarkdownLeaf_6_html,
  "MarkdownLeaf#7": __fusedRender_MarkdownLeaf_7_html,
  "MarkdownLeaf#8": __fusedRender_MarkdownLeaf_8_html,
  "MarkdownLeaf#9": __fusedRender_MarkdownLeaf_9_html,
  "MarkdownLeaf#10": __fusedRender_MarkdownLeaf_10_html,
  "MarkdownLeaf#11": __fusedRender_MarkdownLeaf_11_html,
  "MarkdownLeaf#12": __fusedRender_MarkdownLeaf_12_html,
  "MarkdownLeaf#13": __fusedRender_MarkdownLeaf_13_html,
  "MarkdownLeaf#14": __fusedRender_MarkdownLeaf_14_html,
  "MarkdownLeaf#15": __fusedRender_MarkdownLeaf_15_html,
  "MarkdownLeaf#16": __fusedRender_MarkdownLeaf_16_html,
  "MarkdownLeaf#17": __fusedRender_MarkdownLeaf_17_html,
  "MarkdownLeaf#18": __fusedRender_MarkdownLeaf_18_html,
  "MarkdownLeaf#19": __fusedRender_MarkdownLeaf_19_html,
  "MarkdownLeaf#20": __fusedRender_MarkdownLeaf_20_html,
  "MarkdownLeaf#21": __fusedRender_MarkdownLeaf_21_html,
  "MarkdownLeaf#22": __fusedRender_MarkdownLeaf_22_html,
  "MarkdownLeaf#23": __fusedRender_MarkdownLeaf_23_html,
  "MarkdownLeaf#24": __fusedRender_MarkdownLeaf_24_html,
  "MarkdownLeaf#25": __fusedRender_MarkdownLeaf_25_html,
  "MarkdownLeaf#26": __fusedRender_MarkdownLeaf_26_html,
  "MarkdownLeaf#27": __fusedRender_MarkdownLeaf_27_html,
  "MarkdownLeaf#28": __fusedRender_MarkdownLeaf_28_html,
  "MarkdownLeaf#29": __fusedRender_MarkdownLeaf_29_html,
  "MarkdownLeaf#30": __fusedRender_MarkdownLeaf_30_html,
  "MarkdownLeaf#31": __fusedRender_MarkdownLeaf_31_html,
  "MarkdownLeaf#32": __fusedRender_MarkdownLeaf_32_html,
  "MarkdownLeaf#33": __fusedRender_MarkdownLeaf_33_html,
  "MarkdownLeaf#34": __fusedRender_MarkdownLeaf_34_html,
  "MarkdownLeaf#35": __fusedRender_MarkdownLeaf_35_html,
  "MarkdownLeaf#36": __fusedRender_MarkdownLeaf_36_html,
  "MarkdownParagraph#0": __fusedRender_MarkdownParagraph_0_html,
};

const __fusedRenderDispatch_source: Record<string, (state: State, out: string[]) => boolean> = {
  "MarkdownDocument#0": __fusedRender_MarkdownDocument_0_source,
  "MarkdownLeaf#0": __fusedRender_MarkdownLeaf_0_source,
  "MarkdownLeaf#1": __fusedRender_MarkdownLeaf_1_source,
  "MarkdownLeaf#2": __fusedRender_MarkdownLeaf_2_source,
  "MarkdownLeaf#3": __fusedRender_MarkdownLeaf_3_source,
  "MarkdownLeaf#4": __fusedRender_MarkdownLeaf_4_source,
  "MarkdownLeaf#5": __fusedRender_MarkdownLeaf_5_source,
  "MarkdownLeaf#6": __fusedRender_MarkdownLeaf_6_source,
  "MarkdownLeaf#7": __fusedRender_MarkdownLeaf_7_source,
  "MarkdownLeaf#8": __fusedRender_MarkdownLeaf_8_source,
  "MarkdownLeaf#9": __fusedRender_MarkdownLeaf_9_source,
  "MarkdownLeaf#10": __fusedRender_MarkdownLeaf_10_source,
  "MarkdownLeaf#11": __fusedRender_MarkdownLeaf_11_source,
  "MarkdownLeaf#12": __fusedRender_MarkdownLeaf_12_source,
  "MarkdownLeaf#13": __fusedRender_MarkdownLeaf_13_source,
  "MarkdownLeaf#14": __fusedRender_MarkdownLeaf_14_source,
  "MarkdownLeaf#15": __fusedRender_MarkdownLeaf_15_source,
  "MarkdownLeaf#16": __fusedRender_MarkdownLeaf_16_source,
  "MarkdownLeaf#17": __fusedRender_MarkdownLeaf_17_source,
  "MarkdownLeaf#18": __fusedRender_MarkdownLeaf_18_source,
  "MarkdownLeaf#19": __fusedRender_MarkdownLeaf_19_source,
  "MarkdownLeaf#20": __fusedRender_MarkdownLeaf_20_source,
  "MarkdownLeaf#21": __fusedRender_MarkdownLeaf_21_source,
  "MarkdownLeaf#22": __fusedRender_MarkdownLeaf_22_source,
  "MarkdownLeaf#23": __fusedRender_MarkdownLeaf_23_source,
  "MarkdownLeaf#24": __fusedRender_MarkdownLeaf_24_source,
  "MarkdownLeaf#25": __fusedRender_MarkdownLeaf_25_source,
  "MarkdownLeaf#26": __fusedRender_MarkdownLeaf_26_source,
  "MarkdownLeaf#27": __fusedRender_MarkdownLeaf_27_source,
  "MarkdownLeaf#28": __fusedRender_MarkdownLeaf_28_source,
  "MarkdownLeaf#29": __fusedRender_MarkdownLeaf_29_source,
  "MarkdownLeaf#30": __fusedRender_MarkdownLeaf_30_source,
  "MarkdownLeaf#31": __fusedRender_MarkdownLeaf_31_source,
  "MarkdownLeaf#32": __fusedRender_MarkdownLeaf_32_source,
  "MarkdownLeaf#33": __fusedRender_MarkdownLeaf_33_source,
  "MarkdownLeaf#34": __fusedRender_MarkdownLeaf_34_source,
  "MarkdownLeaf#35": __fusedRender_MarkdownLeaf_35_source,
  "MarkdownLeaf#36": __fusedRender_MarkdownLeaf_36_source,
  "MarkdownParagraph#0": __fusedRender_MarkdownParagraph_0_source,
};

function __fusedRenderStructured_MarkdownDocument_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  const children: unknown[] = [];
  while (true) {
    const __loopStart = off;
    while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
    state.pos = off;
    let __cand: unknown = null;
    if (off < len) {
      const __c0 = input.charCodeAt(off);
        __cand = __fusedRenderStructuredDispatch_MarkdownLeaf_ast(state);
        if (__cand === null) __cand = __fusedRenderStructuredDispatch_MarkdownParagraph_ast(state);
    }
    if (__cand === null) break;
    children.push(__cand);
    off = state.pos;
    if (off === __loopStart) break;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "document", children: children };
}

function __fusedRenderStructured_MarkdownLeaf_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("######", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 6;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "heading", depth: 6, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_1_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("#####", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "heading", depth: 5, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_2_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("####", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "heading", depth: 4, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_3_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("###", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "heading", depth: 3, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_4_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 35 && input.charCodeAt(off + 1) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "heading", depth: 2, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_5_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 35)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "heading", depth: 1, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_6_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("===", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "heading", depth: 1, text: text, style: "setext" };
}

function __fusedRenderStructured_MarkdownLeaf_7_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "heading", depth: 2, text: text, style: "setext" };
}

function __fusedRenderStructured_MarkdownLeaf_8_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("***", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "thematic-break", marker: "*" };
}

function __fusedRenderStructured_MarkdownLeaf_9_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("___", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "thematic-break", marker: "_" };
}

function __fusedRenderStructured_MarkdownLeaf_10_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "thematic-break" };
}

function __fusedRenderStructured_MarkdownLeaf_11_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("- [x]", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "task-list-item", checked: true, marker: "x", text: text };
}

function __fusedRenderStructured_MarkdownLeaf_12_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("- [ ]", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 5;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "task-list-item", checked: false, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_13_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 43 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "list-item", ordered: false, marker: "+", text: text };
}

function __fusedRenderStructured_MarkdownLeaf_14_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "list-item", ordered: false, marker: "*", text: text };
}

function __fusedRenderStructured_MarkdownLeaf_15_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 45 && input.charCodeAt(off + 1) === 32)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "list-item", ordered: false, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_16_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isDigit(input.charCodeAt(off)) || ((input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) && off + 1 < len && isDigit(input.charCodeAt(off + 1)))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __index_start = off;
  if (input.charCodeAt(off) === 0x2d || input.charCodeAt(off) === 0x2b) off++;
  off++;
  while (off < len && isDigit(input.charCodeAt(off))) off++;
  const __index_end = off;
  const index = input.slice(__index_start, __index_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 46)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "list-item", ordered: true, index: index, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_17_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "blockquote", text: text };
}

function __fusedRenderStructured_MarkdownLeaf_18_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __lang_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __lang_end = off;
  const lang = input.slice(__lang_start, __lang_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let body: string = '';
  let __body_start = off;
  let __body_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __body_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if ((__c === 96 && input.startsWith("```", off))) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __body_start;
    if (__lastNonWs === __body_start) {
      off = __emptyAnchor;
      body = '';
    } else {
      off = __lastNonWs;
      body = input.slice(__body_start, __lastNonWs);
    }
    __body_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "code-block", lang: lang, text: body };
}

function __fusedRenderStructured_MarkdownLeaf_19_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("```\n", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 4;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let body: string = '';
  let __body_start = off;
  let __body_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __body_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if ((__c === 96 && input.startsWith("```", off))) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __body_start;
    if (__lastNonWs === __body_start) {
      off = __emptyAnchor;
      body = '';
    } else {
      off = __lastNonWs;
      body = input.slice(__body_start, __lastNonWs);
    }
    __body_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("```", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "code-block", text: body };
}

function __fusedRenderStructured_MarkdownLeaf_20_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if ((__c === 42 && input.startsWith("**", off))) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 42 && input.charCodeAt(off + 1) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "bold", text: text };
}

function __fusedRenderStructured_MarkdownLeaf_21_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 42) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 42)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "italic", text: text };
}

function __fusedRenderStructured_MarkdownLeaf_22_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 126 && input.charCodeAt(off + 1) === 126)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if ((__c === 126 && input.startsWith("~~", off))) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 126 && input.charCodeAt(off + 1) === 126)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "strikethrough", text: text };
}

function __fusedRenderStructured_MarkdownLeaf_23_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 96)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 96) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 96)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "inline-code", text: text };
}

function __fusedRenderStructured_MarkdownLeaf_24_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let label: string = '';
  let __label_start = off;
  let __label_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __label_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __label_start;
    if (__lastNonWs === __label_start) {
      off = __emptyAnchor;
      label = '';
    } else {
      off = __lastNonWs;
      label = input.slice(__label_start, __lastNonWs);
    }
    __label_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let url: string = '';
  let __url_start = off;
  let __url_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __url_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 41) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __url_start;
    if (__lastNonWs === __url_start) {
      off = __emptyAnchor;
      url = '';
    } else {
      off = __lastNonWs;
      url = input.slice(__url_start, __lastNonWs);
    }
    __url_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "link", label: label, url: url };
}

function __fusedRenderStructured_MarkdownLeaf_25_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let label: string = '';
  let __label_start = off;
  let __label_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __label_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __label_start;
    if (__lastNonWs === __label_start) {
      off = __emptyAnchor;
      label = '';
    } else {
      off = __lastNonWs;
      label = input.slice(__label_start, __lastNonWs);
    }
    __label_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93 && input.charCodeAt(off + 1) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "reference-link", label: label, id: id };
}

function __fusedRenderStructured_MarkdownLeaf_26_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let alt: string = '';
  let __alt_start = off;
  let __alt_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __alt_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __alt_start;
    if (__lastNonWs === __alt_start) {
      off = __emptyAnchor;
      alt = '';
    } else {
      off = __lastNonWs;
      alt = input.slice(__alt_start, __lastNonWs);
    }
    __alt_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 40)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let url: string = '';
  let __url_start = off;
  let __url_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __url_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 41) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __url_start;
    if (__lastNonWs === __url_start) {
      off = __emptyAnchor;
      url = '';
    } else {
      off = __lastNonWs;
      url = input.slice(__url_start, __lastNonWs);
    }
    __url_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 41)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "image", alt: alt, url: url };
}

function __fusedRenderStructured_MarkdownLeaf_27_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 33)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let alt: string = '';
  let __alt_start = off;
  let __alt_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __alt_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __alt_start;
    if (__lastNonWs === __alt_start) {
      off = __emptyAnchor;
      alt = '';
    } else {
      off = __lastNonWs;
      alt = input.slice(__alt_start, __lastNonWs);
    }
    __alt_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93 && input.charCodeAt(off + 1) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "reference-image", alt: alt, id: id };
}

function __fusedRenderStructured_MarkdownLeaf_28_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 38)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __name_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __name_end = off;
  const name = input.slice(__name_start, __name_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 59)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "entity", name: name };
}

function __fusedRenderStructured_MarkdownLeaf_29_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "table-delimiter", variant: "plain", align: ["default", "default"] };
}

function __fusedRenderStructured_MarkdownLeaf_30_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.startsWith("---", off))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 3;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "table-delimiter", variant: "aligned", align: ["left", "right"] };
}

function __fusedRenderStructured_MarkdownLeaf_31_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let first: string = '';
  let __first_start = off;
  let __first_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __first_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 124) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __first_start;
    if (__lastNonWs === __first_start) {
      off = __emptyAnchor;
      first = '';
    } else {
      off = __lastNonWs;
      first = input.slice(__first_start, __lastNonWs);
    }
    __first_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let second: string = '';
  let __second_start = off;
  let __second_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __second_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 124) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __second_start;
    if (__lastNonWs === __second_start) {
      off = __emptyAnchor;
      second = '';
    } else {
      off = __lastNonWs;
      second = input.slice(__second_start, __lastNonWs);
    }
    __second_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 124)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "table-row", cells: [first, second] };
}

function __fusedRenderStructured_MarkdownLeaf_32_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 91)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let url: string = '';
  let __url_start = off;
  let __url_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __url_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __url_start;
    if (__lastNonWs === __url_start) {
      off = __emptyAnchor;
      url = '';
    } else {
      off = __lastNonWs;
      url = input.slice(__url_start, __lastNonWs);
    }
    __url_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "definition", id: id, url: url };
}

function __fusedRenderStructured_MarkdownLeaf_33_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 91 && input.charCodeAt(off + 1) === 94)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 58)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 10) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "footnote-definition", id: id, text: text };
}

function __fusedRenderStructured_MarkdownLeaf_34_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 91 && input.charCodeAt(off + 1) === 94)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let id: string = '';
  let __id_start = off;
  let __id_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __id_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 93) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __id_start;
    if (__lastNonWs === __id_start) {
      off = __emptyAnchor;
      id = '';
    } else {
      off = __lastNonWs;
      id = input.slice(__id_start, __lastNonWs);
    }
    __id_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 93)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "footnote-reference", id: id };
}

function __fusedRenderStructured_MarkdownLeaf_35_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __tag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __tag_end = off;
  const tag = input.slice(__tag_start, __tag_end);
  if (!(tag.toLowerCase() === "div" || tag.toLowerCase() === "span" || tag.toLowerCase() === "p" || tag.toLowerCase() === "pre" || tag.toLowerCase() === "code" || tag.toLowerCase() === "blockquote" || tag.toLowerCase() === "a" || tag.toLowerCase() === "img" || tag.toLowerCase() === "br" || tag.toLowerCase() === "hr" || tag.toLowerCase() === "ul" || tag.toLowerCase() === "ol" || tag.toLowerCase() === "li" || tag.toLowerCase() === "dl" || tag.toLowerCase() === "dt" || tag.toLowerCase() === "dd" || tag.toLowerCase() === "table" || tag.toLowerCase() === "thead" || tag.toLowerCase() === "tbody" || tag.toLowerCase() === "tfoot" || tag.toLowerCase() === "tr" || tag.toLowerCase() === "td" || tag.toLowerCase() === "th" || tag.toLowerCase() === "caption" || tag.toLowerCase() === "figure" || tag.toLowerCase() === "figcaption" || tag.toLowerCase() === "section" || tag.toLowerCase() === "article" || tag.toLowerCase() === "header" || tag.toLowerCase() === "footer" || tag.toLowerCase() === "nav" || tag.toLowerCase() === "aside" || tag.toLowerCase() === "main" || tag.toLowerCase() === "address" || tag.toLowerCase() === "details" || tag.toLowerCase() === "summary" || tag.toLowerCase() === "h1" || tag.toLowerCase() === "h2" || tag.toLowerCase() === "h3" || tag.toLowerCase() === "h4" || tag.toLowerCase() === "h5" || tag.toLowerCase() === "h6" || tag.toLowerCase() === "em" || tag.toLowerCase() === "strong" || tag.toLowerCase() === "i" || tag.toLowerCase() === "b" || tag.toLowerCase() === "u" || tag.toLowerCase() === "s" || tag.toLowerCase() === "small" || tag.toLowerCase() === "sub" || tag.toLowerCase() === "sup" || tag.toLowerCase() === "kbd" || tag.toLowerCase() === "var" || tag.toLowerCase() === "samp" || tag.toLowerCase() === "cite" || tag.toLowerCase() === "q" || tag.toLowerCase() === "dfn" || tag.toLowerCase() === "abbr" || tag.toLowerCase() === "time" || tag.toLowerCase() === "mark" || tag.toLowerCase() === "ruby" || tag.toLowerCase() === "rt" || tag.toLowerCase() === "rp" || tag.toLowerCase() === "bdi" || tag.toLowerCase() === "bdo" || tag.toLowerCase() === "wbr" || tag.toLowerCase() === "form" || tag.toLowerCase() === "input" || tag.toLowerCase() === "button" || tag.toLowerCase() === "select" || tag.toLowerCase() === "option" || tag.toLowerCase() === "optgroup" || tag.toLowerCase() === "textarea" || tag.toLowerCase() === "label" || tag.toLowerCase() === "fieldset" || tag.toLowerCase() === "legend" || tag.toLowerCase() === "datalist" || tag.toLowerCase() === "output" || tag.toLowerCase() === "progress" || tag.toLowerCase() === "meter" || tag.toLowerCase() === "video" || tag.toLowerCase() === "audio" || tag.toLowerCase() === "source" || tag.toLowerCase() === "track" || tag.toLowerCase() === "canvas" || tag.toLowerCase() === "svg" || tag.toLowerCase() === "math" || tag.toLowerCase() === "iframe" || tag.toLowerCase() === "embed" || tag.toLowerCase() === "object" || tag.toLowerCase() === "param" || tag.toLowerCase() === "picture" || tag.toLowerCase() === "script" || tag.toLowerCase() === "style" || tag.toLowerCase() === "noscript" || tag.toLowerCase() === "template" || tag.toLowerCase() === "html" || tag.toLowerCase() === "head" || tag.toLowerCase() === "body" || tag.toLowerCase() === "title" || tag.toLowerCase() === "meta" || tag.toLowerCase() === "link" || tag.toLowerCase() === "base")) { state.pos = entryOff; return null; }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let body: string = '';
  let __body_start = off;
  let __body_end = off;
  {
    __body_start = off;
    let __earliest = len;
    for (let __i = __body_start; __i < len; __i++) {
      const __c = input.charCodeAt(__i);
      if (__c === 60 && ((__i + 1 < len && input.charCodeAt(__i + 1) === 47))) { __earliest = __i; break; }
    }
    off = __earliest;
    __body_end = off;
    body = input.slice(__body_start, __body_end);
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60 && input.charCodeAt(off + 1) === 47)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 2;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(off < len && (isCssIdentStart(input.charCodeAt(off))))) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  const __closingTag_start = off;
  off++;
  while (off < len && isCssIdentPart(input.charCodeAt(off))) off++;
  const __closingTag_end = off;
  const closingTag = input.slice(__closingTag_start, __closingTag_end);
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "html", tag: tag, text: body, closingTag: closingTag };
}

function __fusedRenderStructured_MarkdownLeaf_36_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 60)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let url: string = '';
  let __url_start = off;
  let __url_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __url_start = off;
    let __lastNonWs = off;
    while (off < len) {
      const __c = input.charCodeAt(off);
      if (__c === 62) break;
      if (__c !== 0x20 && __c !== 0x09 && __c !== 0x0a && __c !== 0x0d) __lastNonWs = off + 1;
      off++;
    }
    const __emptyAnchor = __url_start;
    if (__lastNonWs === __url_start) {
      off = __emptyAnchor;
      url = '';
    } else {
      off = __lastNonWs;
      url = input.slice(__url_start, __lastNonWs);
    }
    __url_end = off;
  }
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  if (!(input.charCodeAt(off) === 62)) { if (off > state.maxOff) state.maxOff = off; state.pos = entryOff; return null; }
  off += 1;
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "autolink", url: url };
}

function __fusedRenderStructured_MarkdownParagraph_0_ast(state: State): unknown {
  const input = state.input;
  const len = state.len;
  let off = state.pos;
  const entryOff = off;
  while (off < len) { const c = input.charCodeAt(off); if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { off++; continue; } break; }
  let text: string = '';
  let __text_start = off;
  let __text_end = off;
  {
    while (off < len) {
      const __c0 = input.charCodeAt(off);
      if (__c0 === 0x20 || __c0 === 0x09 || __c0 === 0x0a || __c0 === 0x0d) { off++; continue; }
      break;
    }
    __text_start = off;
    let __lastNonWs = off;
    {
      let __acState = 0;
      const __acLen = input.length;
      let __acBest = -1;
      const __acMaxLen = 4;
      while (off < __acLen) {
        const __acC = input.charCodeAt(off);
        switch (__acState) {
          case 0: {
            if (__acC === 10) { __acState = 1; break; }
            else { break; }
          }
          case 1: {
            if (__acC === 10) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 2;
              break;
            }
            else if (__acC === 35) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 3;
              break;
            }
            else if (__acC === 42) { __acState = 10; break; }
            else if (__acC === 43) { __acState = 8; break; }
            else if (__acC === 45) { __acState = 5; break; }
            else if (__acC === 61) { __acState = 23; break; }
            else if (__acC === 62) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 4;
              break;
            }
            else if (__acC === 91) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 26;
              break;
            }
            else if (__acC === 95) { __acState = 20; break; }
            else if (__acC === 96) { __acState = 12; break; }
            else if (__acC === 124) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 15;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 2: {
            if (__acC === 10) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 2;
              break;
            }
            else if (__acC === 35) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 3;
              break;
            }
            else if (__acC === 42) { __acState = 10; break; }
            else if (__acC === 43) { __acState = 8; break; }
            else if (__acC === 45) { __acState = 5; break; }
            else if (__acC === 61) { __acState = 23; break; }
            else if (__acC === 62) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 4;
              break;
            }
            else if (__acC === 91) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 26;
              break;
            }
            else if (__acC === 95) { __acState = 20; break; }
            else if (__acC === 96) { __acState = 12; break; }
            else if (__acC === 124) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 15;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 3: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 4: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 5: {
            if (__acC === 10) {
              const __acStart = off - 2;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 7;
              break;
            }
            else if (__acC === 32) {
              const __acStart = off - 2;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 6;
              break;
            }
            else if (__acC === 45) { __acState = 16; break; }
            else { __acState = 0; continue; }
          }
          case 6: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 7: {
            if (__acC === 10) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 2;
              break;
            }
            else if (__acC === 35) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 3;
              break;
            }
            else if (__acC === 42) { __acState = 10; break; }
            else if (__acC === 43) { __acState = 8; break; }
            else if (__acC === 45) { __acState = 5; break; }
            else if (__acC === 61) { __acState = 23; break; }
            else if (__acC === 62) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 4;
              break;
            }
            else if (__acC === 91) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 26;
              break;
            }
            else if (__acC === 95) { __acState = 20; break; }
            else if (__acC === 96) { __acState = 12; break; }
            else if (__acC === 124) {
              const __acStart = off - 1;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 15;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 8: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 32) {
              const __acStart = off - 2;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 9;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 9: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 10: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 32) {
              const __acStart = off - 2;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 11;
              break;
            }
            else if (__acC === 42) { __acState = 18; break; }
            else { __acState = 0; continue; }
          }
          case 11: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 12: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 96) { __acState = 13; break; }
            else { __acState = 0; continue; }
          }
          case 13: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 96) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 14;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 14: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 15: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 16: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 45) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 17;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 17: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 18: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 42) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 19;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 19: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 20: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 95) { __acState = 21; break; }
            else { __acState = 0; continue; }
          }
          case 21: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 95) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 22;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 22: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 23: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 61) { __acState = 24; break; }
            else { __acState = 0; continue; }
          }
          case 24: {
            if (__acC === 10) { __acState = 1; break; }
            else if (__acC === 61) {
              const __acStart = off - 3;
              if (__acBest === -1 || __acStart < __acBest) __acBest = __acStart;
              __acState = 25;
              break;
            }
            else { __acState = 0; continue; }
          }
          case 25: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
          case 26: {
            if (__acC === 10) { __acState = 1; break; }
            else { __acState = 0; continue; }
          }
        }
        off++;
        if (__acBest !== -1 && off >= __acBest + __acMaxLen) break;
      }
      off = __acBest === -1 ? __acLen : __acBest;
    }
    __lastNonWs = off;
    while (__lastNonWs > __text_start) {
      const __wc = input.charCodeAt(__lastNonWs - 1);
      if (__wc !== 0x20 && __wc !== 0x09 && __wc !== 0x0a && __wc !== 0x0d) break;
      __lastNonWs--;
    }
    const __emptyAnchor = __text_start;
    if (__lastNonWs === __text_start) {
      off = __emptyAnchor;
      text = '';
    } else {
      off = __lastNonWs;
      text = input.slice(__text_start, __lastNonWs);
    }
    __text_end = off;
  }
  state.pos = off;
  if (off > state.maxOff) state.maxOff = off;
  return { type: "paragraph", text: text };
}

function __fusedRenderStructuredDispatch_MarkdownLeaf_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_MarkdownLeaf_0_ast(state); if (r0 !== null) return r0;
  const r1 = __fusedRenderStructured_MarkdownLeaf_1_ast(state); if (r1 !== null) return r1;
  const r2 = __fusedRenderStructured_MarkdownLeaf_11_ast(state); if (r2 !== null) return r2;
  const r3 = __fusedRenderStructured_MarkdownLeaf_12_ast(state); if (r3 !== null) return r3;
  const r4 = __fusedRenderStructured_MarkdownLeaf_2_ast(state); if (r4 !== null) return r4;
  const r5 = __fusedRenderStructured_MarkdownLeaf_19_ast(state); if (r5 !== null) return r5;
  const r6 = __fusedRenderStructured_MarkdownLeaf_3_ast(state); if (r6 !== null) return r6;
  const r7 = __fusedRenderStructured_MarkdownLeaf_8_ast(state); if (r7 !== null) return r7;
  const r8 = __fusedRenderStructured_MarkdownLeaf_9_ast(state); if (r8 !== null) return r8;
  const r9 = __fusedRenderStructured_MarkdownLeaf_10_ast(state); if (r9 !== null) return r9;
  const r10 = __fusedRenderStructured_MarkdownLeaf_18_ast(state); if (r10 !== null) return r10;
  const r11 = __fusedRenderStructured_MarkdownLeaf_4_ast(state); if (r11 !== null) return r11;
  const r12 = __fusedRenderStructured_MarkdownLeaf_13_ast(state); if (r12 !== null) return r12;
  const r13 = __fusedRenderStructured_MarkdownLeaf_14_ast(state); if (r13 !== null) return r13;
  const r14 = __fusedRenderStructured_MarkdownLeaf_15_ast(state); if (r14 !== null) return r14;
  const r15 = __fusedRenderStructured_MarkdownLeaf_20_ast(state); if (r15 !== null) return r15;
  const r16 = __fusedRenderStructured_MarkdownLeaf_22_ast(state); if (r16 !== null) return r16;
  const r17 = __fusedRenderStructured_MarkdownLeaf_33_ast(state); if (r17 !== null) return r17;
  const r18 = __fusedRenderStructured_MarkdownLeaf_34_ast(state); if (r18 !== null) return r18;
  const r19 = __fusedRenderStructured_MarkdownLeaf_5_ast(state); if (r19 !== null) return r19;
  const r20 = __fusedRenderStructured_MarkdownLeaf_17_ast(state); if (r20 !== null) return r20;
  const r21 = __fusedRenderStructured_MarkdownLeaf_21_ast(state); if (r21 !== null) return r21;
  const r22 = __fusedRenderStructured_MarkdownLeaf_23_ast(state); if (r22 !== null) return r22;
  const r23 = __fusedRenderStructured_MarkdownLeaf_24_ast(state); if (r23 !== null) return r23;
  const r24 = __fusedRenderStructured_MarkdownLeaf_25_ast(state); if (r24 !== null) return r24;
  const r25 = __fusedRenderStructured_MarkdownLeaf_26_ast(state); if (r25 !== null) return r25;
  const r26 = __fusedRenderStructured_MarkdownLeaf_27_ast(state); if (r26 !== null) return r26;
  const r27 = __fusedRenderStructured_MarkdownLeaf_28_ast(state); if (r27 !== null) return r27;
  const r28 = __fusedRenderStructured_MarkdownLeaf_29_ast(state); if (r28 !== null) return r28;
  const r29 = __fusedRenderStructured_MarkdownLeaf_30_ast(state); if (r29 !== null) return r29;
  const r30 = __fusedRenderStructured_MarkdownLeaf_31_ast(state); if (r30 !== null) return r30;
  const r31 = __fusedRenderStructured_MarkdownLeaf_32_ast(state); if (r31 !== null) return r31;
  const r32 = __fusedRenderStructured_MarkdownLeaf_35_ast(state); if (r32 !== null) return r32;
  const r33 = __fusedRenderStructured_MarkdownLeaf_36_ast(state); if (r33 !== null) return r33;
  const r34 = __fusedRenderStructured_MarkdownLeaf_6_ast(state); if (r34 !== null) return r34;
  const r35 = __fusedRenderStructured_MarkdownLeaf_7_ast(state); if (r35 !== null) return r35;
  const r36 = __fusedRenderStructured_MarkdownLeaf_16_ast(state); if (r36 !== null) return r36;
  return null;
}

function __fusedRenderStructuredDispatch_MarkdownParagraph_ast(state: State): unknown {
  const r0 = __fusedRenderStructured_MarkdownParagraph_0_ast(state); if (r0 !== null) return r0;
  return null;
}

const __fusedRenderStructuredTable_ast: Record<string, (state: State) => unknown> = {
  "MarkdownDocument#0": __fusedRenderStructured_MarkdownDocument_0_ast,
  "MarkdownLeaf#0": __fusedRenderStructured_MarkdownLeaf_0_ast,
  "MarkdownLeaf#1": __fusedRenderStructured_MarkdownLeaf_1_ast,
  "MarkdownLeaf#2": __fusedRenderStructured_MarkdownLeaf_2_ast,
  "MarkdownLeaf#3": __fusedRenderStructured_MarkdownLeaf_3_ast,
  "MarkdownLeaf#4": __fusedRenderStructured_MarkdownLeaf_4_ast,
  "MarkdownLeaf#5": __fusedRenderStructured_MarkdownLeaf_5_ast,
  "MarkdownLeaf#6": __fusedRenderStructured_MarkdownLeaf_6_ast,
  "MarkdownLeaf#7": __fusedRenderStructured_MarkdownLeaf_7_ast,
  "MarkdownLeaf#8": __fusedRenderStructured_MarkdownLeaf_8_ast,
  "MarkdownLeaf#9": __fusedRenderStructured_MarkdownLeaf_9_ast,
  "MarkdownLeaf#10": __fusedRenderStructured_MarkdownLeaf_10_ast,
  "MarkdownLeaf#11": __fusedRenderStructured_MarkdownLeaf_11_ast,
  "MarkdownLeaf#12": __fusedRenderStructured_MarkdownLeaf_12_ast,
  "MarkdownLeaf#13": __fusedRenderStructured_MarkdownLeaf_13_ast,
  "MarkdownLeaf#14": __fusedRenderStructured_MarkdownLeaf_14_ast,
  "MarkdownLeaf#15": __fusedRenderStructured_MarkdownLeaf_15_ast,
  "MarkdownLeaf#16": __fusedRenderStructured_MarkdownLeaf_16_ast,
  "MarkdownLeaf#17": __fusedRenderStructured_MarkdownLeaf_17_ast,
  "MarkdownLeaf#18": __fusedRenderStructured_MarkdownLeaf_18_ast,
  "MarkdownLeaf#19": __fusedRenderStructured_MarkdownLeaf_19_ast,
  "MarkdownLeaf#20": __fusedRenderStructured_MarkdownLeaf_20_ast,
  "MarkdownLeaf#21": __fusedRenderStructured_MarkdownLeaf_21_ast,
  "MarkdownLeaf#22": __fusedRenderStructured_MarkdownLeaf_22_ast,
  "MarkdownLeaf#23": __fusedRenderStructured_MarkdownLeaf_23_ast,
  "MarkdownLeaf#24": __fusedRenderStructured_MarkdownLeaf_24_ast,
  "MarkdownLeaf#25": __fusedRenderStructured_MarkdownLeaf_25_ast,
  "MarkdownLeaf#26": __fusedRenderStructured_MarkdownLeaf_26_ast,
  "MarkdownLeaf#27": __fusedRenderStructured_MarkdownLeaf_27_ast,
  "MarkdownLeaf#28": __fusedRenderStructured_MarkdownLeaf_28_ast,
  "MarkdownLeaf#29": __fusedRenderStructured_MarkdownLeaf_29_ast,
  "MarkdownLeaf#30": __fusedRenderStructured_MarkdownLeaf_30_ast,
  "MarkdownLeaf#31": __fusedRenderStructured_MarkdownLeaf_31_ast,
  "MarkdownLeaf#32": __fusedRenderStructured_MarkdownLeaf_32_ast,
  "MarkdownLeaf#33": __fusedRenderStructured_MarkdownLeaf_33_ast,
  "MarkdownLeaf#34": __fusedRenderStructured_MarkdownLeaf_34_ast,
  "MarkdownLeaf#35": __fusedRenderStructured_MarkdownLeaf_35_ast,
  "MarkdownLeaf#36": __fusedRenderStructured_MarkdownLeaf_36_ast,
  "MarkdownParagraph#0": __fusedRenderStructured_MarkdownParagraph_0_ast,
};

const __rootProductionKey: string = "MarkdownDocument#0";

function __fusedRenderDispatchLookup(target: string): Record<string, (state: State, out: string[]) => boolean> | null {
  switch (target) {
    case "html": return __fusedRenderDispatch_html;
    case "source": return __fusedRenderDispatch_source;
    default: return null;
  }
}

function __fusedRenderStructuredTableLookup(target: string): Record<string, (state: State) => unknown> | null {
  switch (target) {
    case "ast": return __fusedRenderStructuredTable_ast;
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
    diagnostics: [],
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
    diagnostics: [],
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
    diagnostics: [],
  };
  
  const result = parseMarkdownDocument(state);
  
  while (state.pos < state.len) {
    const __c = input.charCodeAt(state.pos);
    if (__c === 0x20 || __c === 0x09 || __c === 0x0a || __c === 0x0d) { state.pos++; continue; }
    break;
  }
  if (result === null || state.pos !== input.length) {
    throw syntaxErrorAt(input, state.maxOff > state.pos ? state.maxOff : state.pos);
  }
  
  const __onDiag = options?.onDiagnostic;
  if (__onDiag !== undefined) {
    for (let __i = 0; __i < state.diagnostics.length; __i++) {
      __onDiag(state.diagnostics[__i]);
    }
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
    diagnostics: [],
  };
  const __result = parseMarkdownDocument(__state);
  if (__result === null || __state.pos !== input.length) {
    throw syntaxErrorAt(input, __state.maxOff > __state.pos ? __state.maxOff : __state.pos);
  }
  const __onDiag = options?.onDiagnostic;
  if (__onDiag !== undefined) {
    for (let __i = 0; __i < __state.diagnostics.length; __i++) {
      __onDiag(__state.diagnostics[__i]);
    }
  }
}

(validate as unknown as { __parser2Validator?: { module: string; exportName: string } }).__parser2Validator = {
  module: "@parser2/markdown",
  exportName: 'validate',
};
