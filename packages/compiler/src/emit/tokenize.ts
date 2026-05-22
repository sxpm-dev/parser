import type { InferredSchema, LiteralDecl, TokenClassUsage } from '../model.ts';
import { jsString } from './strings.ts';

// Emits the tokenizer body. Single-pass scan. Skips whitespace, then runs
// literal longest-match (each literal pushed with its assigned type), then
// class scanners in priority order. Each token carries its source position
// so `.until()` captures can slice the original input.

export function emitTokenizer(schema: InferredSchema): string {
  // Multi-char punctuators must be tried before single-char ones (longest
  // match). Class scanners are tried BETWEEN multi-char and single-char
  // punctuators so that e.g. comment `/*` wins over delim `/` while
  // multi-char punctuators like `=>` still win over class scanners.
  const multiChar = schema.literals.filter((l) => l.literal.length > 1);
  const singleChar = schema.literals.filter((l) => l.literal.length === 1);
  const multiCharBranches = multiChar.map(emitLiteralBranch).join('\n');
  const earlySingleChar = singleChar.filter((l) => !literalNeedsClassPriority(l.literal, schema.classes));
  const lateSingleChar = singleChar.filter((l) => literalNeedsClassPriority(l.literal, schema.classes));
  const earlySingleCharBranches = emitSingleCharSwitch(earlySingleChar);
  const lateSingleCharBranches = emitSingleCharSwitch(lateSingleChar);
  const commentBranches = schema.classes.filter((c) => c.class === 'comment').map((c) => emitClassBranch(c)).join('\n');
  const classBranches = schema.classes.filter((c) => c.class !== 'comment').map((c) => emitClassBranch(c)).join('\n');
  const helpers = collectHelpers(schema.classes);

  return `${helpers}

export type Token = { readonly type: string; readonly value: string; readonly start: number; readonly end: number };

export function tokenize(input: string): Token[] {
  const tokens: (Token[] & { hasComments?: boolean }) = [];
  const len = input.length;
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
${indentLines(emitUnknownCharFallback(schema.unknownChars), 4)}
  }
  return tokens;
}`;
}

function emitUnknownCharFallback(policy: InferredSchema['unknownChars']): string {
  if (policy === 'tolerate') {
    // Permissive fallback: any unclassified byte becomes a single-char `raw`
    // token. Captures cover it via source-slice; productions that expect
    // specific token types simply won't match `raw` and dispatch falls
    // through.
    return `{ const ch = input[i]; tokens.push({ type: 'raw', value: ch, start: i, end: i + 1 }); i++; continue; }`;
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

function emitLiteralBranch(decl: LiteralDecl): string {
  const { literal, type } = decl;
  const typeExpr = jsString(type);
  const valueExpr = jsString(literal);
  if (literal.length === 1) {
    const code = literal.charCodeAt(0);
    return `if (c === ${code}) { tokens.push({ type: ${typeExpr}, value: ${valueExpr}, start: i, end: i + 1 }); i++; continue; }`;
  }
  return `if (input.startsWith(${valueExpr}, i)) { tokens.push({ type: ${typeExpr}, value: ${valueExpr}, start: i, end: i + ${literal.length} }); i += ${literal.length}; continue; }`;
}

function emitSingleCharSwitch(decls: ReadonlyArray<LiteralDecl>): string {
  if (decls.length === 0) return '';
  const cases = decls.map((decl) => {
    const code = decl.literal.charCodeAt(0);
    const typeExpr = jsString(decl.type);
    const valueExpr = jsString(decl.literal);
    return `case ${code}: tokens.push({ type: ${typeExpr}, value: ${valueExpr}, start: i, end: i + 1 }); i++; continue;`;
  }).join('\n');
  return `switch (c) {
${indentLines(cases, 2)}
}`;
}

function emitClassBranch(usage: TokenClassUsage): string {
  const { class: cls, refinements } = usage;
  const refSet = new Set(refinements.map((r) => r.name));
  if (cls === 'ident' && refSet.has('html')) return emitHtmlIdentBranch();
  if (cls === 'ident' && refSet.has('css')) return emitCssIdentBranch();
  if (cls === 'ident' && refSet.has('js')) return emitJsIdentBranch();
  if (cls === 'ident') return emitCssIdentBranch();
  if (cls === 'number') return emitNumberBranch();
  if (cls === 'hex') return emitHexBranch();
  if (cls === 'string') return emitStringBranch();
  if (cls === 'comment') return emitCommentBranch();
  throw new Error(`Emitter: class '${cls}' with refinements [${[...refSet].join(',')}] not implemented yet`);
}

function emitCssIdentBranch(): string {
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
  tokens.push({ type: 'ident', value: input.slice(start, i), start, end: i });
  continue;
}`;
}

function emitHtmlIdentBranch(): string {
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
  tokens.push({ type: 'ident', value: input.slice(start, i), start, end: i });
  continue;
}`;
}

function emitJsIdentBranch(): string {
  return `if (isJsIdentStart(c)) {
  const start = i;
  i++;
  while (i < len && isJsIdentPart(input.charCodeAt(i))) i++;
  tokens.push({ type: 'ident', value: input.slice(start, i), start, end: i });
  continue;
}`;
}

function emitNumberBranch(): string {
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
  tokens.push({ type: 'number', value: input.slice(start, i), start, end: i });
  continue;
}`;
}

function emitHexBranch(): string {
  return `if (isHexDigit(c)) {
  const start = i;
  while (i < len && isHexDigit(input.charCodeAt(i))) i++;
  tokens.push({ type: 'hex', value: input.slice(start, i), start, end: i });
  continue;
}`;
}

function emitStringBranch(): string {
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
  tokens.push({ type: 'string', value: input.slice(start, i), start, end: i });
  continue;
}`;
}

function emitCommentBranch(): string {
  return `if (c === 0x2f /* / */ && i + 1 < len && input.charCodeAt(i + 1) === 0x2a /* * */) {
  const start = i;
  i += 2;
  while (i < len && !(input.charCodeAt(i) === 0x2a && i + 1 < len && input.charCodeAt(i + 1) === 0x2f)) i++;
  if (i < len) i += 2;
  tokens.hasComments = true;
  tokens.push({ type: 'comment', value: input.slice(start, i), start, end: i });
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
