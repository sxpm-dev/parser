import type { InferredSchema, LiteralDecl, TokenClassUsage } from '../model.ts';
import { jsString } from './strings.ts';

// Emits the tokenizer body. Single-pass scan. Skips whitespace, then runs
// literal longest-match (each literal pushed with its assigned type), then
// class scanners in priority order. Each token carries its source position
// so `.until()` captures can slice the original input.
//
// Tokens are stored in parallel typed arrays (Structure-of-Arrays):
//   types[i]  -> integer type ID (lookup name via TYPE_NAMES_BY_ID[id])
//   starts[i] -> source byte offset (inclusive)
//   ends[i]   -> source byte offset (exclusive)
// `count` is the number of tokens scanned. This replaces a Token object
// array; on a 1 MB HTML synthetic input that's ~200 000 object allocations
// dropped, cutting both tokenize time and garbage-collection pressure.

export function emitTokenizer(schema: InferredSchema): string {
  const multiChar = schema.literals.filter((l) => l.literal.length > 1);
  const singleChar = schema.literals.filter((l) => l.literal.length === 1);
  const multiCharBranches = emitMultiCharDispatch(multiChar, schema);
  const earlySingleChar = singleChar.filter((l) => !literalNeedsClassPriority(l.literal, schema.classes));
  const lateSingleChar = singleChar.filter((l) => literalNeedsClassPriority(l.literal, schema.classes));
  const earlySingleCharBranches = emitSingleCharSwitch(earlySingleChar, schema);
  const lateSingleCharBranches = emitSingleCharSwitch(lateSingleChar, schema);
  const commentBranches = schema.classes.filter((c) => c.class === 'comment').map((c) => emitClassBranch(c, schema)).join('\n');
  const classBranches = schema.classes.filter((c) => c.class !== 'comment').map((c) => emitClassBranch(c, schema)).join('\n');
  const helpers = collectHelpers(schema.classes);
  const typeConsts = emitTypeIdConstants(schema);
  const commentTypeId = schema.tokenTypeIds.get('comment') ?? -1;

  return `${helpers}

export type Token = { readonly type: string; readonly value: string; readonly start: number; readonly end: number };

${typeConsts}

const __TYPE_NAMES_BY_ID: readonly string[] = ${JSON.stringify([...schema.tokenTypeIds.keys()])};
const __COMMENT_TYPE_ID = ${commentTypeId};

type TokenizerOutput = {
  types: Uint16Array;
  starts: Uint32Array;
  ends: Uint32Array;
  count: number;
  hasComments: boolean;
};

// Runs the scanner over \`input\` and returns the populated typed arrays.
// Capacity grows geometrically — empirical token density is ~0.2 tokens
// per source byte for ASCII-heavy markup; \`length >> 2\` is a safe start.
function __tokenize(input: string): TokenizerOutput {
  const len = input.length;
  let capacity = len > 256 ? len >> 2 : 64;
  let types = new Uint16Array(capacity);
  let starts = new Uint32Array(capacity);
  let ends = new Uint32Array(capacity);
  let count = 0;
  let hasComments = false;
  const __grow = (): void => {
    capacity = capacity * 2;
    const t2 = new Uint16Array(capacity); t2.set(types); types = t2;
    const s2 = new Uint32Array(capacity); s2.set(starts); starts = s2;
    const e2 = new Uint32Array(capacity); e2.set(ends); ends = e2;
  };
  let i = 0;
  while (i < len) {
    const c = input.charCodeAt(i);
    // whitespace (skip)
    if (c === 0x20 || c === 0x09 || c === 0x0a || c === 0x0d) { i++; continue; }
${indentLines(multiCharBranches, 4)}
${indentLines(commentBranches, 4)}
${indentLines(earlySingleCharBranches, 4)}
${indentLines(classBranches, 4)}
${indentLines(lateSingleCharBranches, 4)}
${indentLines(emitUnknownCharFallback(schema.unknownChars, schema), 4)}
  }
  return { types, starts, ends, count, hasComments };
}

export function tokenize(input: string): Token[] {
  const out = __tokenize(input);
  const tokens: Token[] = new Array(out.count);
  for (let i = 0; i < out.count; i++) {
    const s = out.starts[i];
    const e = out.ends[i];
    tokens[i] = { type: __TYPE_NAMES_BY_ID[out.types[i]], value: input.slice(s, e), start: s, end: e };
  }
  return tokens;
}`;
}

function emitUnknownCharFallback(policy: InferredSchema['unknownChars'], schema: InferredSchema): string {
  if (policy === 'tolerate') {
    const rawId = schema.tokenTypeIds.get('raw');
    if (rawId === undefined) throw new Error("Emitter: unknownChars=tolerate requires 'raw' in tokenTypeIds");
    return `{ if (count === capacity) __grow(); types[count] = ${rawId}; starts[count] = i; ends[count] = i + 1; count++; i++; continue; }`;
  }
  return `throw new SyntaxError(\`Unexpected character '\${input[i]}' at position \${i}\`);`;
}

function literalNeedsClassPriority(literal: string, classes: ReadonlyArray<TokenClassUsage>): boolean {
  if (literal.length !== 1) return false;
  const code = literal.charCodeAt(0);
  for (const usage of classes) {
    if (usage.class === 'comment' && code === 0x2f /* / */) return true;
    if (usage.class === 'string' && (code === 0x22 /* " */ || code === 0x27 /* ' */)) return true;
    if (usage.class === 'number' && code >= 0x30 && code <= 0x39) return true;
    if (usage.class === 'ident') {
      const refinements = new Set(usage.refinements.map((r) => r.name));
      const cssIdent = refinements.has('css') || refinements.size === 0;
      if (cssIdent && code === 0x5c /* \\ */) return true;
      if (!cssIdent && (code === 0x24 /* $ */ || code === 0x5f /* _ */)) return true;
    }
  }
  return false;
}

// Group multi-char punctuators by their first character so the tokenizer
// only does startsWith checks when the leading byte could possibly match.
// Cuts the inner-loop work from O(multiChar.length) per byte to O(group).
// Within each group, sort longest-first so longest-match still wins.
function emitMultiCharDispatch(decls: ReadonlyArray<LiteralDecl>, schema: InferredSchema): string {
  if (decls.length === 0) return '';
  const groups = new Map<number, LiteralDecl[]>();
  for (const decl of decls) {
    const code = decl.literal.charCodeAt(0);
    const bucket = groups.get(code) ?? [];
    bucket.push(decl);
    groups.set(code, bucket);
  }
  const cases: string[] = [];
  for (const [code, bucket] of [...groups.entries()].sort(([a], [b]) => a - b)) {
    bucket.sort((a, b) => b.literal.length - a.literal.length);
    const checks = bucket.map((decl) => emitLiteralBranch(decl, schema)).join('\n');
    cases.push(`case ${code}: {
${indentLines(checks, 2)}
  break;
}`);
  }
  return `switch (c) {
${indentLines(cases.join('\n'), 2)}
}`;
}

function emitLiteralBranch(decl: LiteralDecl, schema: InferredSchema): string {
  const { literal, type } = decl;
  const typeId = schema.tokenTypeIds.get(type);
  if (typeId === undefined) throw new Error(`Emitter: no type ID for '${type}'`);
  const valueExpr = jsString(literal);
  if (literal.length === 1) {
    const code = literal.charCodeAt(0);
    return `if (c === ${code}) { if (count === capacity) __grow(); types[count] = ${typeId}; starts[count] = i; ends[count] = i + 1; count++; i++; continue; }`;
  }
  return `if (input.startsWith(${valueExpr}, i)) { if (count === capacity) __grow(); types[count] = ${typeId}; starts[count] = i; ends[count] = i + ${literal.length}; count++; i += ${literal.length}; continue; }`;
}

function emitSingleCharSwitch(decls: ReadonlyArray<LiteralDecl>, schema: InferredSchema): string {
  if (decls.length === 0) return '';
  const cases = decls.map((decl) => {
    const code = decl.literal.charCodeAt(0);
    const typeId = schema.tokenTypeIds.get(decl.type);
    if (typeId === undefined) throw new Error(`Emitter: no type ID for '${decl.type}'`);
    return `case ${code}: if (count === capacity) __grow(); types[count] = ${typeId}; starts[count] = i; ends[count] = i + 1; count++; i++; continue;`;
  }).join('\n');
  return `switch (c) {
${indentLines(cases, 2)}
}`;
}

function emitTypeIdConstants(schema: InferredSchema): string {
  const lines: string[] = [];
  for (const [name, id] of [...schema.tokenTypeIds.entries()].sort((a, b) => a[1] - b[1])) {
    lines.push(`const ${typeIdConst(name)} = ${id};`);
  }
  return lines.join('\n');
}

export function typeIdConst(name: string): string {
  // 'comment' -> '__TYPE_ID_COMMENT'. The class IDs are emitted alongside
  // literal types in the same namespace.
  return `__TYPE_ID_${name.replace(/[^a-zA-Z0-9_]/g, (c) => '_' + c.charCodeAt(0).toString(16).toUpperCase()).toUpperCase()}`;
}

function emitClassBranch(usage: TokenClassUsage, schema: InferredSchema): string {
  const { class: cls, refinements } = usage;
  const refSet = new Set(refinements.map((r) => r.name));
  const id = schema.tokenTypeIds.get(cls);
  if (id === undefined) throw new Error(`Emitter: no type ID for class '${cls}'`);
  if (cls === 'ident' && refSet.has('html')) return emitHtmlIdentBranch(id);
  if (cls === 'ident' && refSet.has('css')) return emitCssIdentBranch(id);
  if (cls === 'ident' && refSet.has('js')) return emitJsIdentBranch(id);
  if (cls === 'ident') return emitCssIdentBranch(id);
  if (cls === 'number') return emitNumberBranch(id);
  if (cls === 'hex') return emitHexBranch(id);
  if (cls === 'string') return emitStringBranch(id);
  if (cls === 'comment') return emitCommentBranch(id);
  throw new Error(`Emitter: class '${cls}' with refinements [${[...refSet].join(',')}] not implemented yet`);
}

function emitCssIdentBranch(id: number): string {
  return `if (isCssIdentStart(c) || c === 0x5c /* \\\\ */) {
  const start = i;
  while (i < len) {
    const c2 = input.charCodeAt(i);
    if (c2 === 0x5c /* \\\\ */) {
      i++;
      if (i < len && isHexDigit(input.charCodeAt(i))) {
        // Hex escape: up to 6 hex digits + one optional whitespace
        let n = 0;
        while (i < len && n < 6 && isHexDigit(input.charCodeAt(i))) { i++; n++; }
        if (i < len) {
          const w = input.charCodeAt(i);
          if (w === 0x20 || w === 0x09 || w === 0x0a || w === 0x0d) i++;
        }
      } else if (i < len) {
        // Single-char escape: any non-newline char
        i++;
      }
      continue;
    }
    if (!isCssIdentPart(c2)) break;
    i++;
  }
  // Raw url(...) tokenization: contents are opaque (no comment recognition,
  // no balanced brackets) until the matching ')'. Strings are tracked so
  // that a ')' inside a quoted url like url("./image (1).jpg") doesn't
  // close the url early.
  if (
    i - start === 3
    && i < len
    && input.charCodeAt(i) === 0x28 /* ( */
    && (input.charCodeAt(start) | 32) === 0x75 /* u */
    && (input.charCodeAt(start + 1) | 32) === 0x72 /* r */
    && (input.charCodeAt(start + 2) | 32) === 0x6c /* l */
  ) {
    i++; // consume (
    while (i < len) {
      const cu = input.charCodeAt(i);
      if (cu === 0x29 /* ) */) { i++; break; }
      if (cu === 0x5c /* \\\\ */ && i + 1 < len) { i += 2; continue; }
      if (cu === 0x22 /* " */ || cu === 0x27 /* ' */) {
        const q = cu;
        i++;
        while (i < len) {
          const ch = input.charCodeAt(i);
          if (ch === 0x5c /* \\\\ */ && i + 1 < len) { i += 2; continue; }
          if (ch === q) { i++; break; }
          if (ch === 0x0a || ch === 0x0d) break;
          i++;
        }
        continue;
      }
      i++;
    }
  }
  if (count === capacity) __grow(); types[count] = ${id}; starts[count] = start; ends[count] = i; count++;
  continue;
}`;
}

function emitHtmlIdentBranch(id: number): string {
  // HTML ident: start with ASCII letter or `_`; continue with letters,
  // digits, `-`, `_`. No backslash escapes — a raw `\` belongs to text.
  return `if (isCssIdentStart(c)) {
  const start = i;
  i++;
  while (i < len) {
    const c2 = input.charCodeAt(i);
    if (!isCssIdentPart(c2)) break;
    i++;
  }
  if (count === capacity) __grow(); types[count] = ${id}; starts[count] = start; ends[count] = i; count++;
  continue;
}`;
}

function emitJsIdentBranch(id: number): string {
  return `if (isJsIdentStart(c)) {
  const start = i;
  i++;
  while (i < len && isJsIdentPart(input.charCodeAt(i))) i++;
  if (count === capacity) __grow(); types[count] = ${id}; starts[count] = start; ends[count] = i; count++;
  continue;
}`;
}

function emitNumberBranch(id: number): string {
  return `if (isDigit(c)) {
  const start = i;
  while (i < len && isDigit(input.charCodeAt(i))) i++;
  if (i < len && input.charCodeAt(i) === 0x2e /* . */ && i + 1 < len && isDigit(input.charCodeAt(i + 1))) {
    i++;
    while (i < len && isDigit(input.charCodeAt(i))) i++;
  }
  const ec = i < len ? input.charCodeAt(i) : 0;
  if (ec === 0x65 || ec === 0x45 /* e E */) {
    let j = i + 1;
    if (j < len && (input.charCodeAt(j) === 0x2b || input.charCodeAt(j) === 0x2d)) j++;
    if (j < len && isDigit(input.charCodeAt(j))) {
      i = j;
      while (i < len && isDigit(input.charCodeAt(i))) i++;
    }
  }
  if (count === capacity) __grow(); types[count] = ${id}; starts[count] = start; ends[count] = i; count++;
  continue;
}`;
}

function emitHexBranch(id: number): string {
  return `if (isHexDigit(c)) {
  const start = i;
  while (i < len && isHexDigit(input.charCodeAt(i))) i++;
  if (count === capacity) __grow(); types[count] = ${id}; starts[count] = start; ends[count] = i; count++;
  continue;
}`;
}

function emitStringBranch(id: number): string {
  return `if (c === 0x22 /* " */ || c === 0x27 /* ' */) {
  const quote = c;
  const start = i;
  i++;
  while (i < len) {
    const ch = input.charCodeAt(i);
    if (ch === 0x5c /* backslash */) { i += 2; continue; }
    if (ch === quote) { i++; break; }
    if (ch === 0x0a || ch === 0x0d) { break; }
    i++;
  }
  if (count === capacity) __grow(); types[count] = ${id}; starts[count] = start; ends[count] = i; count++;
  continue;
}`;
}

function emitCommentBranch(id: number): string {
  return `if (c === 0x2f /* / */ && i + 1 < len && input.charCodeAt(i + 1) === 0x2a /* * */) {
  const start = i;
  i += 2;
  while (i < len && !(input.charCodeAt(i) === 0x2a && i + 1 < len && input.charCodeAt(i + 1) === 0x2f)) i++;
  if (i < len) i += 2;
  hasComments = true;
  if (count === capacity) __grow(); types[count] = ${id}; starts[count] = start; ends[count] = i; count++;
  continue;
}`;
}

function collectHelpers(classes: ReadonlyArray<TokenClassUsage>): string {
  const helpers: string[] = [];
  const needsCss = classes.some(
    (c) => c.class === 'ident' && (
      c.refinements.some((r) => r.name === 'css' || r.name === 'html') ||
      c.refinements.length === 0
    ),
  );
  const needsJs = classes.some(
    (c) => c.class === 'ident' && c.refinements.some((r) => r.name === 'js'),
  );
  const needsDigit = classes.some((c) => c.class === 'number');
  const needsHex = classes.some((c) => c.class === 'hex');
  if (needsCss) helpers.push(CSS_IDENT_HELPERS);
  if (needsJs) helpers.push(JS_IDENT_HELPERS);
  if (needsDigit) helpers.push(DIGIT_HELPER);
  // isHexDigit is used by the CSS ident scanner for backslash hex escapes.
  if (needsCss || needsHex) helpers.push(HEX_HELPER);
  return helpers.join('\n\n');
}

const HEX_HELPER = `function isHexDigit(c: number): boolean {
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102);
}`;

const CSS_IDENT_HELPERS = `function isCssIdentStart(c: number): boolean {
  // a-z A-Z _ -
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 45;
}
function isCssIdentPart(c: number): boolean {
  return isCssIdentStart(c) || (c >= 48 && c <= 57);
}`;

const JS_IDENT_HELPERS = `function isJsIdentStart(c: number): boolean {
  // ASCII subset: a-z A-Z _ $
  return (c >= 97 && c <= 122) || (c >= 65 && c <= 90) || c === 95 || c === 36;
}
function isJsIdentPart(c: number): boolean {
  return isJsIdentStart(c) || (c >= 48 && c <= 57);
}`;

const DIGIT_HELPER = `function isDigit(c: number): boolean {
  return c >= 48 && c <= 57;
}`;

function indentLines(source: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return source.split('\n').map((l) => (l ? pad + l : l)).join('\n');
}
