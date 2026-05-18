import type { CodegenInput, RuntimeStandardTokenizer } from '@parser2/parser';
import { emitBlockStyleParser } from './block-style-emitter.js';
import { emitStatementListParser } from './statement-list-emitter.js';

export function emitGenericParser(schema: CodegenInput): string {
  if (!schema.runtime?.tokenize || !schema.runtime.parse || !schema.runtime.stringify) {
    throw new Error(`Schema ${schema.name} does not declare a compiler runtime`);
  }
  if (
    schema.runtime.tokenize.kind === 'block-style' &&
    schema.runtime.parse.kind === 'block-style' &&
    schema.runtime.stringify.kind === 'block-style'
  ) {
    return emitBlockStyleParser(schema);
  }
  if (
    schema.runtime.tokenize.kind === 'statement-list' &&
    schema.runtime.parse.kind === 'statement-list' &&
    schema.runtime.stringify.kind === 'statement-list'
  ) {
    return emitStatementListParser(schema);
  }
  return emitRuntimeParser(schema);
}

function emitRuntimeParser(schema: CodegenInput): string {
  const tokenizer = schema.runtime?.tokenize;
  const parser = schema.runtime?.parse;
  if (!tokenizer || !parser || schema.runtime?.stringify?.kind !== 'native-json') {
    throw new Error(`Schema ${schema.name} declares an unsupported compiler runtime`);
  }
  if (tokenizer.kind !== 'standard' || parser.kind !== 'value-document') {
    throw new Error(`Schema ${schema.name} declares an unsupported compiler runtime`);
  }

  const documentAlias = schema.structure.nodes.find((node) => node.type === parser.documentType)?.alias ?? schema.structure.rootAlias;
  const valueAlias = `${pascal(schema.name)}Value`;
  const objectAlias = `${pascal(schema.name)}Object`;
  const arrayAlias = `${pascal(schema.name)}Array`;
  const primitiveAlias = `${pascal(schema.name)}Primitive`;
  const parseTreeEnabled = parser.parseTree !== false;
  const chars = {
    objectOpen: charCode(parser.object.open),
    objectClose: charCode(parser.object.close),
    arrayOpen: charCode(parser.array.open),
    arrayClose: charCode(parser.array.close),
    pairSeparator: charCode(parser.object.pairSeparator),
    objectSeparator: charCode(parser.object.separator),
    arraySeparator: charCode(parser.array.separator),
    quote: charCode(tokenizer.string?.quote ?? '"'),
  };
  const primitiveBranches = parser.primitiveTokens.map((primitive) =>
    `    if (this.input.startsWith(${JSON.stringify(primitive.text)}, this.i)) {
      this.i += ${primitive.text.length};
      return ${JSON.stringify(primitive.value)} as ${valueAlias};
    }`,
  ).join('\n');
  const tokenizeKeywordBranches = parser.primitiveTokens.map((primitive) =>
    `    if (startsWithWord(input, i, ${JSON.stringify(primitive.text)})) {
      i += ${primitive.text.length};
      out.push({ type: ${JSON.stringify(primitive.token)}, value: ${JSON.stringify(primitive.text)}, start, end: i });
      continue;
    }`,
  ).join('\n');
  const tokenizePunctuatorBranches = (tokenizer.punctuators ?? []).map((punctuator) =>
    `    if (ch === ${charCode(punctuator.text)}) {
      i++;
      out.push({ type: ${JSON.stringify(punctuator.token)}, value: ${JSON.stringify(punctuator.text)}, start, end: i });
      continue;
    }`,
  ).join('\n');
  const whitespaceTokenBranch = tokenizer.whitespace?.emit
    ? `out.push({ type: ${JSON.stringify(tokenizer.whitespace.token)}, value: input.slice(start, i), start, end: i });`
    : '';
  const parseImplementation = parser.engine === 'native-json'
    ? `export function parse(input: string): ${documentAlias} {
  return { type: ${JSON.stringify(parser.documentType)}, ${parser.valueField}: JSON.parse(input) as ${valueAlias} } as ${documentAlias};
}`
    : `export function parse(input: string): ${documentAlias} {
  const parser = new ValueParser(input);
  const value = parser.parseValue();
  parser.skipWs();
  if (parser.i !== input.length) parser.fail('Unexpected token');
  const structure = { type: ${JSON.stringify(parser.documentType)}, ${parser.valueField}: value } as ${documentAlias};
  return structure;
}`;

  return `export type Token = {
  readonly type: string;
  readonly value: string;
  readonly start: number;
  readonly end: number;
};

${emitGrammarRuntime(schema)}

${emitValueTypes(documentAlias, parser.documentType, parser.valueField, primitiveAlias, valueAlias, objectAlias, arrayAlias)}

const objectOpen = ${chars.objectOpen};
const objectClose = ${chars.objectClose};
const arrayOpen = ${chars.arrayOpen};
const arrayClose = ${chars.arrayClose};
const pairSeparator = ${chars.pairSeparator};
const objectSeparator = ${chars.objectSeparator};
const arraySeparator = ${chars.arraySeparator};
const quoteChar = ${chars.quote};

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const start = i;
    const ch = input.charCodeAt(i);
    if (isConfiguredWhitespace(ch)) {
      i++;
      while (i < input.length && isConfiguredWhitespace(input.charCodeAt(i))) i++;
      ${whitespaceTokenBranch}
      continue;
    }
    if (ch === quoteChar) {
      i = skipString(input, i);
      out.push({ type: ${JSON.stringify(tokenizer.string?.token ?? 'string')}, value: input.slice(start, i), start, end: i });
      continue;
    }
    if (${tokenizer.number?.minus ? 'ch === 45 || ' : ''}isDigit(ch)) {
      i = skipNumber(input, i);
      out.push({ type: ${JSON.stringify(tokenizer.number?.token ?? 'number')}, value: input.slice(start, i), start, end: i });
      continue;
    }
${tokenizeKeywordBranches}
${tokenizePunctuatorBranches}
    throw new SyntaxError('Unexpected token at ' + i);
  }
  return out;
}

${parseImplementation}

${parseTreeEnabled ? `export function parseTree(input: string): ParseTree {
  const structure = parse(input);
  return {
    type: ${JSON.stringify(parser.documentType)},
    start: 0,
    end: input.length,
    children: [valueToTree(structure.${parser.valueField}, 0, input.length)],
  };
}
` : ''}
export function stringify(structure: ${documentAlias} | ${valueAlias}): string {
  return JSON.stringify(isDocument(structure) ? structure.${parser.valueField} : structure);
}

function isDocument(value: unknown): value is ${documentAlias} {
  return Boolean(value && typeof value === 'object' && (value as { type?: unknown }).type === ${JSON.stringify(parser.documentType)} && ${JSON.stringify(parser.valueField)} in value);
}

class ValueParser {
  i = 0;
  constructor(readonly input: string) {}

  parseValue(): ${valueAlias} {
    this.skipWs();
    if (this.i >= this.input.length) this.fail('Unexpected end of input');
    const ch = this.input.charCodeAt(this.i);
    if (ch === objectOpen) return this.parseObject();
    if (ch === arrayOpen) return this.parseArray();
    if (ch === quoteChar) return this.parseString();
    if (${tokenizer.number?.minus ? 'ch === 45 || ' : ''}isDigit(ch)) return this.parseNumber();
${primitiveBranches}
    this.fail('Unexpected token');
  }

  parseObject(): ${objectAlias} {
    this.i++;
    const out: Record<string, ${valueAlias}> = {};
    this.skipWs();
    if (this.input.charCodeAt(this.i) === objectClose) {
      this.i++;
      return out;
    }
    for (;;) {
      this.skipWs();
      if (this.input.charCodeAt(this.i) !== quoteChar) this.fail('Expected object key');
      const key = this.parseString();
      this.skipWs();
      if (this.input.charCodeAt(this.i) !== pairSeparator) this.fail('Expected pair separator');
      this.i++;
      out[key] = this.parseValue();
      this.skipWs();
      const ch = this.input.charCodeAt(this.i);
      if (ch === objectClose) {
        this.i++;
        return out;
      }
      if (ch !== objectSeparator) this.fail('Expected separator');
      this.i++;
    }
  }

  parseArray(): ${arrayAlias} {
    this.i++;
    const out: ${valueAlias}[] = [];
    this.skipWs();
    if (this.input.charCodeAt(this.i) === arrayClose) {
      this.i++;
      return out;
    }
    for (;;) {
      out.push(this.parseValue());
      this.skipWs();
      const ch = this.input.charCodeAt(this.i);
      if (ch === arrayClose) {
        this.i++;
        return out;
      }
      if (ch !== arraySeparator) this.fail('Expected separator');
      this.i++;
    }
  }

  parseString(): string {
    let i = this.i + 1;
    let out = '';
    let chunk = i;
    while (i < this.input.length) {
      const ch = this.input.charCodeAt(i);
      if (ch === quoteChar) {
        out += this.input.slice(chunk, i);
        this.i = i + 1;
        return out;
      }
      if (ch === 92) {
        out += this.input.slice(chunk, i);
        i++;
        const esc = this.input.charCodeAt(i);
        switch (esc) {
          case 34: out += '"'; i++; break;
          case 47: out += '/'; i++; break;
          case 92: out += '\\\\'; i++; break;
          case 98: out += '\\b'; i++; break;
          case 102: out += '\\f'; i++; break;
          case 110: out += '\\n'; i++; break;
          case 114: out += '\\r'; i++; break;
          case 116: out += '\\t'; i++; break;
          case 117: {
            const code = readFixedHex(this.input, i + 1, ${tokenizer.string?.unicodeEscape?.digits ?? 4});
            if (code < 0) this.fail('Invalid unicode escape');
            out += String.fromCharCode(code);
            i += ${1 + (tokenizer.string?.unicodeEscape?.digits ?? 4)};
            break;
          }
          default:
            this.i = i;
            this.fail('Invalid escape');
        }
        chunk = i;
        continue;
      }
      if (ch < 32) {
        this.i = i;
        this.fail('Invalid string character');
      }
      i++;
    }
    this.fail('Unterminated string');
  }

  parseNumber(): number {
    const start = this.i;
    this.i = skipNumber(this.input, this.i);
    return Number(this.input.slice(start, this.i));
  }

  skipWs(): void {
    while (this.i < this.input.length && isConfiguredWhitespace(this.input.charCodeAt(this.i))) this.i++;
  }

  fail(message: string): never {
    throw new SyntaxError(message + ' at ' + this.i);
  }
}

${emitGrammarParser(parseTreeEnabled)}

function valueToTree(value: ${valueAlias}, start: number, end: number): ParseTree {
  if (Array.isArray(value)) {
    return { type: 'value', start, end, children: [{ type: 'array', start, end, children: value.map((item) => valueToTree(item, start, end)) }] };
  }
  if (value && typeof value === 'object') {
    return {
      type: 'value',
      start,
      end,
      children: [{
        type: 'object',
        start,
        end,
        children: Object.entries(value).map(([key, child]) => ({
          type: 'member',
          start,
          end,
          children: [{ type: 'string', start, end, children: [] }, valueToTree(child as ${valueAlias}, start, end)],
        })),
      }],
    };
  }
  return { type: 'value', start, end, children: [{ type: value === null ? 'null' : typeof value, start, end, children: [] }] };
}

function isConfiguredWhitespace(ch: number): boolean {
  return ${emitWhitespacePredicate(tokenizer)};
}

function skipString(input: string, index: number): number {
  let i = index + 1;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === quoteChar) return i + 1;
    if (ch === 92) {
      i += input.charCodeAt(i + 1) === ${tokenizer.string?.unicodeEscape?.prefix ? charCode(tokenizer.string.unicodeEscape.prefix) : -1}
        ? ${2 + (tokenizer.string?.unicodeEscape?.digits ?? 4)}
        : 2;
      continue;
    }
    if (ch < 32) throw new SyntaxError('Invalid string character at ' + i);
    i++;
  }
  throw new SyntaxError('Unterminated string at ' + index);
}

function skipNumber(input: string, index: number): number {
  let i = index;
  ${tokenizer.number?.minus ? 'if (input.charCodeAt(i) === 45) i++;' : ''}
  if (input.charCodeAt(i) === 48) {
    i++;
    ${tokenizer.number?.leadingZero === 'reject' ? "if (isDigit(input.charCodeAt(i))) throw new SyntaxError('Invalid number at ' + index);" : ''}
  } else {
    if (!isDigit(input.charCodeAt(i))) throw new SyntaxError('Invalid number at ' + index);
    while (isDigit(input.charCodeAt(i))) i++;
  }
  ${tokenizer.number?.fraction ? `if (input.charCodeAt(i) === 46) {
    i++;
    if (!isDigit(input.charCodeAt(i))) throw new SyntaxError('Invalid number at ' + index);
    while (isDigit(input.charCodeAt(i))) i++;
  }` : ''}
  const exp = input.charCodeAt(i);
  ${tokenizer.number?.exponent ? `if (exp === 69 || exp === 101) {
    i++;
    const sign = input.charCodeAt(i);
    if (sign === 43 || sign === 45) i++;
    if (!isDigit(input.charCodeAt(i))) throw new SyntaxError('Invalid number at ' + index);
    while (isDigit(input.charCodeAt(i))) i++;
  }` : ''}
  return i;
}

function isDigit(ch: number): boolean {
  return ch >= 48 && ch <= 57;
}

function readFixedHex(input: string, index: number, digits: number): number {
  let value = 0;
  for (let i = 0; i < digits; i++) {
    const ch = input.charCodeAt(index + i);
    const digit = ch >= 48 && ch <= 57 ? ch - 48 : ch >= 65 && ch <= 70 ? ch - 55 : ch >= 97 && ch <= 102 ? ch - 87 : -1;
    if (digit < 0) return -1;
    value = (value << 4) | digit;
  }
  return value;
}

function startsWithWord(input: string, index: number, word: string): boolean {
  return input.startsWith(word, index) && !isIdentifier(input.charCodeAt(index + word.length));
}

function isIdentifier(ch: number): boolean {
  return (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || isDigit(ch) || ch === 95 || ch === 36;
}
`;
}

function emitValueTypes(
  documentAlias: string,
  documentType: string,
  valueField: string,
  primitiveAlias: string,
  valueAlias: string,
  objectAlias: string,
  arrayAlias: string,
): string {
  const compatibilityAlias =
    documentType !== documentAlias && /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(documentType)
      ? `\nexport type ${documentType} = ${documentAlias};`
      : '';
  return `export type ${primitiveAlias} = string | number | boolean | null;
export type ${valueAlias} = ${objectAlias} | ${arrayAlias} | ${primitiveAlias};
export type ${objectAlias} = { readonly [key: string]: ${valueAlias} };
export type ${arrayAlias} = readonly ${valueAlias}[];
export type ${documentAlias} = {
  readonly type: ${JSON.stringify(documentType)};
  readonly ${valueField}: ${valueAlias};
  readonly source?: string;
};${compatibilityAlias}`;
}

function emitGrammarRuntime(schema: CodegenInput): string {
  return `type GrammarExpr =
  | { readonly kind: 'ref'; readonly name: string }
  | { readonly kind: 'token'; readonly type: string }
  | { readonly kind: 'literal'; readonly value: unknown }
  | { readonly kind: 'seq'; readonly items: readonly GrammarExpr[] }
  | { readonly kind: 'choice'; readonly options: readonly GrammarExpr[] }
  | { readonly kind: 'repeat'; readonly item: GrammarExpr; readonly separator?: GrammarExpr };

type GrammarRule = {
  readonly name: string;
  readonly expr: GrammarExpr;
};

type GrammarSchema = {
  readonly root: string;
  readonly rules: readonly GrammarRule[];
};

type ParseTree = {
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly children: readonly ParseTree[];
};

const grammar = ${JSON.stringify(schema.grammar ?? { root: '', rules: [] })} as GrammarSchema;
const ruleMap = new Map(grammar.rules.map((rule) => [rule.name, rule.expr]));`;
}

function emitGrammarParser(enabled: boolean): string {
  if (!enabled) return '';
  return `class GrammarParser extends ValueParser {
  parseRule(name: string): ParseTree | undefined {
    const start = this.i;
    const expr = ruleMap.get(name);
    if (!expr) return undefined;
    const children = this.parseExpr(expr);
    if (!children) {
      this.i = start;
      return undefined;
    }
    return { type: name, start, end: this.i, children };
  }

  parseExpr(expr: GrammarExpr): ParseTree[] | undefined {
    this.skipWs();
    switch (expr.kind) {
      case 'ref': {
        const tree = this.parseRule(expr.name);
        return tree ? [tree] : undefined;
      }
      case 'literal': {
        const literal = String(expr.value);
        this.skipWs();
        if (!this.input.startsWith(literal, this.i)) return undefined;
        const start = this.i;
        this.i += literal.length;
        return [{ type: literal, start, end: this.i, children: [] }];
      }
      case 'seq': {
        const start = this.i;
        const out: ParseTree[] = [];
        for (const item of expr.items) {
          const children = this.parseExpr(item);
          if (!children) {
            this.i = start;
            return undefined;
          }
          out.push(...children);
        }
        return out;
      }
      case 'choice': {
        for (const option of expr.options) {
          const start = this.i;
          const children = this.parseExpr(option);
          if (children) return children;
          this.i = start;
        }
        return undefined;
      }
      case 'repeat': {
        const out: ParseTree[] = [];
        for (;;) {
          const start = this.i;
          const children = this.parseExpr(expr.item);
          if (!children || this.i === start) {
            this.i = start;
            return out;
          }
          out.push(...children);
        }
      }
      case 'token':
        return undefined;
    }
  }
}`;
}

function pascal(value: string): string {
  const words = value.match(/[a-zA-Z0-9]+/g) ?? [value];
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function charCode(value: string): number {
  if (value.length !== 1) throw new Error(`Only single-character delimiters are supported by the value-document runtime: ${JSON.stringify(value)}`);
  return value.charCodeAt(0);
}

function emitWhitespacePredicate(tokenizer: RuntimeStandardTokenizer): string {
  const chars = tokenizer.whitespace?.chars ?? '';
  if (chars.length === 0) return 'false';
  return [...chars].map((char) => `ch === ${char.charCodeAt(0)}`).join(' || ');
}
