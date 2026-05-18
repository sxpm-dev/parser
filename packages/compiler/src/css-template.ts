type CodegenInput = unknown;

export function generateCssParser(_schema: CodegenInput): string {
  return `import type { Token } from '@parser2/parser';

export type CssRoot = { type: 'stylesheet'; nodes: CssNode[] };
export type CssNode = CssRule | CssAtRule | CssDeclaration | CssComment;
export type CssRule = { type: 'rule'; selector: string; nodes: CssNode[] };
export type CssAtRule = { type: 'atrule'; name: string; prelude: string; nodes?: CssNode[] };
export type CssDeclaration = { type: 'decl'; prop: string; value: string; important?: true };
export type CssComment = { type: 'comment'; value: string };

const enum C { Tab = 9, LF = 10, FF = 12, CR = 13, Space = 32, Bang = 33, Quote = 34, Hash = 35, Percent = 37, SQuote = 39, LParen = 40, RParen = 41, Star = 42, Plus = 43, Comma = 44, Minus = 45, Dot = 46, Slash = 47, Colon = 58, Semi = 59, Lt = 60, Gt = 62, Question = 63, At = 64, Backslash = 92, LBracket = 91, RBracket = 93, Underscore = 95, LBrace = 123, RBrace = 125 }

function isWs(c: number): boolean { return c === C.Space || c === C.Tab || c === C.LF || c === C.CR || c === C.FF; }
function isNewline(c: number): boolean { return c === C.LF || c === C.CR || c === C.FF; }
function isDigit(c: number): boolean { return c >= 48 && c <= 57; }
function isHex(c: number): boolean { return isDigit(c) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102); }
function isNameStart(c: number): boolean { return (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === C.Underscore || c >= 128; }
function isName(c: number): boolean { return isNameStart(c) || isDigit(c) || c === C.Minus || c === C.Backslash; }
function validEscape(input: string, i: number): boolean { return input.charCodeAt(i) === C.Backslash && !isNewline(input.charCodeAt(i + 1)); }
function startsIdent(input: string, i: number): boolean {
  const a = input.charCodeAt(i);
  const b = input.charCodeAt(i + 1);
  const c = input.charCodeAt(i + 2);
  if (a === C.Minus) return isNameStart(b) || b === C.Minus || validEscape(input, i + 1);
  if (isNameStart(a)) return true;
  return a === C.Backslash && !isNewline(b) && c !== Number.NaN;
}
function consumeName(input: string, i: number): number {
  while (i < input.length) {
    const c = input.charCodeAt(i);
    if (isNameStart(c) || isDigit(c) || c === C.Minus) {
      i++;
    } else if (validEscape(input, i)) {
      i += 2;
      let hex = 0;
      while (hex < 5 && i < input.length && isHex(input.charCodeAt(i))) { i++; hex++; }
      if (isWs(input.charCodeAt(i))) i++;
    } else {
      break;
    }
  }
  return i;
}
function trim(input: string, start: number, end: number): string { while (start < end && isWs(input.charCodeAt(start))) start++; while (end > start && isWs(input.charCodeAt(end - 1))) end--; return input.slice(start, end); }
function isImportant(value: string): number {
  let i = value.length - 1;
  if ((value.charCodeAt(i) | 32) !== 116) return -1;
  const word = 'important';
  for (let j = word.length - 1; j >= 0; j--, i--) if ((value.charCodeAt(i) | 32) !== word.charCodeAt(j)) return -1;
  while (i >= 0 && isWs(value.charCodeAt(i))) i--;
  return value.charCodeAt(i) === C.Bang ? i : -1;
}

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const start = i;
    const c = input.charCodeAt(i);
    if (isWs(c)) {
      i++;
      while (i < input.length && isWs(input.charCodeAt(i))) i++;
      out.push({ type: 'whitespace', value: input.slice(start, i), start, end: i });
    } else if (c === C.Slash && input.charCodeAt(i + 1) === C.Star) {
      i += 2;
      while (i < input.length && !(input.charCodeAt(i) === C.Star && input.charCodeAt(i + 1) === C.Slash)) i++;
      i = Math.min(input.length, i + 2);
      out.push({ type: 'comment', value: input.slice(start, i), start, end: i });
    } else if (c === C.Lt && input.charCodeAt(i + 1) === C.Bang && input.charCodeAt(i + 2) === C.Minus && input.charCodeAt(i + 3) === C.Minus) {
      i += 4;
      out.push({ type: 'cdo', value: input.slice(start, i), start, end: i });
    } else if (c === C.Minus && input.charCodeAt(i + 1) === C.Minus && input.charCodeAt(i + 2) === C.Gt) {
      i += 3;
      out.push({ type: 'cdc', value: input.slice(start, i), start, end: i });
    } else if ((c === 85 || c === 117) && input.charCodeAt(i + 1) === C.Plus && (isHex(input.charCodeAt(i + 2)) || input.charCodeAt(i + 2) === C.Question)) {
      i += 2;
      let n = 0;
      while (n < 6 && (isHex(input.charCodeAt(i)) || input.charCodeAt(i) === C.Question)) { i++; n++; }
      if (input.charCodeAt(i) === C.Minus) { i++; n = 0; while (n < 6 && isHex(input.charCodeAt(i))) { i++; n++; } }
      out.push({ type: 'unicodeRange', value: input.slice(start, i), start, end: i });
    } else if (c === C.Quote || c === C.SQuote) {
      const q = c; i++;
      let bad = false;
      while (i < input.length) { const d = input.charCodeAt(i++); if (d === C.Backslash && !isNewline(input.charCodeAt(i))) i++; else if (d === q) break; else if (isNewline(d)) { bad = true; break; } }
      out.push({ type: bad ? 'badString' : 'string', value: input.slice(start, i), start, end: i });
    } else if (c === C.At && startsIdent(input, i + 1)) {
      i = consumeName(input, i + 1);
      out.push({ type: 'atKeyword', value: input.slice(start, i), start, end: i });
    } else if (c === C.Hash && (isName(input.charCodeAt(i + 1)) || validEscape(input, i + 1))) {
      i = consumeName(input, i + 1);
      out.push({ type: 'hash', value: input.slice(start, i), start, end: i });
    } else if (isDigit(c) || (c === C.Dot && isDigit(input.charCodeAt(i + 1))) || ((c === C.Plus || c === C.Minus) && (isDigit(input.charCodeAt(i + 1)) || input.charCodeAt(i + 1) === C.Dot))) {
      if (input.charCodeAt(i) === C.Plus || input.charCodeAt(i) === C.Minus) i++;
      while (i < input.length && isDigit(input.charCodeAt(i))) i++;
      if (input.charCodeAt(i) === C.Dot) { i++; while (i < input.length && isDigit(input.charCodeAt(i))) i++; }
      if ((input.charCodeAt(i) === 69 || input.charCodeAt(i) === 101) && (isDigit(input.charCodeAt(i + 1)) || ((input.charCodeAt(i + 1) === C.Plus || input.charCodeAt(i + 1) === C.Minus) && isDigit(input.charCodeAt(i + 2))))) {
        i += input.charCodeAt(i + 1) === C.Plus || input.charCodeAt(i + 1) === C.Minus ? 2 : 1;
        while (i < input.length && isDigit(input.charCodeAt(i))) i++;
      }
      const numberEnd = i;
      if (input.charCodeAt(i) === C.Percent) { i++; out.push({ type: 'percentage', value: input.slice(start, i), start, end: i }); }
      else if (startsIdent(input, i)) { i = consumeName(input, i); out.push({ type: 'dimension', value: input.slice(start, i), start, end: i }); }
      else out.push({ type: 'number', value: input.slice(start, numberEnd), start, end: numberEnd });
    } else if (startsIdent(input, i)) {
      i = consumeName(input, i);
      if (input.charCodeAt(i) === C.LParen && input.slice(start, i).toLowerCase() === 'url') {
        i++;
        while (i < input.length && isWs(input.charCodeAt(i))) i++;
        if (input.charCodeAt(i) !== C.Quote && input.charCodeAt(i) !== C.SQuote) {
          let bad = false;
          while (i < input.length) {
            const d = input.charCodeAt(i);
            if (d === C.RParen) { i++; break; }
            if (d === C.Quote || d === C.SQuote || d === C.LParen || isNewline(d)) bad = true;
            if (d === C.Backslash && !validEscape(input, i)) bad = true;
            i += d === C.Backslash && validEscape(input, i) ? 2 : 1;
          }
          out.push({ type: bad ? 'badUrl' : 'url', value: input.slice(start, i), start, end: i });
        } else {
          out.push({ type: 'function', value: input.slice(start, i - 1), start, end: i - 1 });
          out.push({ type: 'lparen', value: '(', start: i - 1, end: i });
        }
      } else {
        out.push({ type: input.charCodeAt(i) === C.LParen ? 'function' : 'ident', value: input.slice(start, i), start, end: i });
      }
    } else {
      i++;
      const value = input.slice(start, i);
      const type = c === C.LBrace ? 'lbrace' : c === C.RBrace ? 'rbrace' : c === C.Colon ? 'colon' : c === C.Semi ? 'semicolon' : c === C.LParen ? 'lparen' : c === C.RParen ? 'rparen' : c === C.LBracket ? 'lbracket' : c === C.RBracket ? 'rbracket' : c === C.Comma ? 'comma' : 'delim';
      out.push({ type, value, start, end: i });
    }
  }
  return out;
}

export function parse(input: string): CssRoot {
  const p = new CssParser(input);
  return { type: 'stylesheet', nodes: p.list(0) };
}

class CssParser {
  i: number;
  input: string;
  constructor(input: string) {
    this.i = 0;
    this.input = input;
  }

  list(stop: number): CssNode[] {
    const nodes: CssNode[] = [];
    while (this.i < this.input.length) {
      while (this.i < this.input.length && isWs(this.input.charCodeAt(this.i))) this.i++;
      if (this.i >= this.input.length || (stop !== 0 && this.input.charCodeAt(this.i) === stop)) break;
      const c = this.input.charCodeAt(this.i);
      if (c === C.Lt && this.input.charCodeAt(this.i + 1) === C.Bang && this.input.charCodeAt(this.i + 2) === C.Minus && this.input.charCodeAt(this.i + 3) === C.Minus) { this.i += 4; continue; }
      if (c === C.Minus && this.input.charCodeAt(this.i + 1) === C.Minus && this.input.charCodeAt(this.i + 2) === C.Gt) { this.i += 3; continue; }
      if (c === C.Slash && this.input.charCodeAt(this.i + 1) === C.Star) { nodes.push(this.comment()); continue; }
      if (c === C.At) { nodes.push(this.atrule()); continue; }
      const node = this.ruleOrDecl(stop);
      if (node) nodes.push(node); else this.i++;
    }
    return nodes;
  }

  private comment(): CssComment {
    const s = this.i + 2;
    this.i = s;
    while (this.i < this.input.length && !(this.input.charCodeAt(this.i) === C.Star && this.input.charCodeAt(this.i + 1) === C.Slash)) this.i++;
    const e = this.i;
    this.i = Math.min(this.input.length, this.i + 2);
    return { type: 'comment', value: this.input.slice(s, e) };
  }

  private atrule(): CssAtRule {
    this.i++;
    const nameStart = this.i;
    this.i = consumeName(this.input, this.i);
    const name = this.input.slice(nameStart, this.i);
    const preludeStart = this.i;
    const end = this.scanToTopLevel(C.LBrace, C.Semi, C.RBrace, 0);
    const prelude = trim(this.input, preludeStart, end);
    if (this.input.charCodeAt(end) === C.LBrace) {
      this.i = end + 1;
      const nodes = this.list(C.RBrace);
      if (this.input.charCodeAt(this.i) === C.RBrace) this.i++;
      return { type: 'atrule', name, prelude, nodes };
    }
    this.i = this.input.charCodeAt(end) === C.Semi ? end + 1 : end;
    return { type: 'atrule', name, prelude };
  }

  private ruleOrDecl(stop: number): CssNode | undefined {
    const start = this.i;
    const stopCode = stop || C.RBrace;
    let colon = -1;
    let depth = 0;
    let quote = 0;
    for (let j = this.i; j < this.input.length; j++) {
      const code = this.input.charCodeAt(j);
      if (quote !== 0) {
        if (code === C.Backslash) j++;
        else if (code === quote) quote = 0;
        continue;
      }
      if (code === C.Quote || code === C.SQuote) { quote = code; continue; }
      if (code === C.Slash && this.input.charCodeAt(j + 1) === C.Star) {
        j += 2;
        while (j < this.input.length && !(this.input.charCodeAt(j) === C.Star && this.input.charCodeAt(j + 1) === C.Slash)) j++;
        j++;
        continue;
      }
      if (code === C.LParen || code === C.LBracket) { depth++; continue; }
      if (code === C.RParen || code === C.RBracket) { if (depth > 0) depth--; continue; }
      if (depth !== 0) continue;
      if (code === C.Colon && colon < 0) {
        colon = j;
        continue;
      }
      if (code === C.LBrace) {
        const selector = trim(this.input, start, j);
        this.i = j + 1;
        const nodes = this.list(C.RBrace);
        if (this.input.charCodeAt(this.i) === C.RBrace) this.i++;
        return { type: 'rule', selector, nodes };
      }
      if (code === C.Semi || code === stopCode) {
        if (colon >= 0) return this.decl(start, colon, j);
        this.i = code === C.Semi ? j + 1 : j;
        return undefined;
      }
    }
    if (colon >= 0) return this.decl(start, colon, this.input.length);
    this.i = this.input.length;
    return undefined;
  }

  private decl(start: number, colon: number, valueEnd: number): CssDeclaration | undefined {
    const prop = trim(this.input, start, colon);
    this.i = colon + 1;
    let value = trim(this.input, this.i, valueEnd);
    const importantIndex = isImportant(value);
    if (importantIndex >= 0) {
      value = trim(value, 0, importantIndex);
      this.i = this.input.charCodeAt(valueEnd) === C.Semi ? valueEnd + 1 : valueEnd;
      return prop ? { type: 'decl', prop, value, important: true } : undefined;
    }
    this.i = this.input.charCodeAt(valueEnd) === C.Semi ? valueEnd + 1 : valueEnd;
    return prop ? { type: 'decl', prop, value } : undefined;
  }

  private scanToTopLevel(a: number, b: number, c: number, d: number): number {
    let depth = 0;
    let quote = 0;
    for (let j = this.i; j < this.input.length; j++) {
      const code = this.input.charCodeAt(j);
      if (quote !== 0) {
        if (code === C.Backslash) j++;
        else if (code === quote) quote = 0;
        continue;
      }
      if (code === C.Quote || code === C.SQuote) { quote = code; continue; }
      if (code === C.Slash && this.input.charCodeAt(j + 1) === C.Star) {
        j += 2;
        while (j < this.input.length && !(this.input.charCodeAt(j) === C.Star && this.input.charCodeAt(j + 1) === C.Slash)) j++;
        j++;
        continue;
      }
      if (code === C.LParen || code === C.LBracket) { depth++; continue; }
      if (code === C.RParen || code === C.RBracket) { if (depth > 0) depth--; continue; }
      if (depth === 0 && (code === a || code === b || (c !== 0 && code === c) || (d !== 0 && code === d))) return j;
    }
    return this.input.length;
  }
}

export function stringify(ast: CssRoot): string {
  let out = '';
  for (const node of ast.nodes) out += stringifyNode(node);
  return out;
}

function stringifyNode(node: CssNode): string {
  switch (node.type) {
    case 'comment': return '/*' + node.value + '*/';
    case 'decl': return node.prop + ':' + node.value + (node.important ? ' !important' : '') + ';';
    case 'rule': return node.selector + '{' + node.nodes.map(stringifyNode).join('') + '}';
    case 'atrule': return '@' + node.name + (node.prelude ? ' ' + node.prelude : '') + (node.nodes ? '{' + node.nodes.map(stringifyNode).join('') + '}' : ';');
  }
}
`;
}
