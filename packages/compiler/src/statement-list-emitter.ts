import type { CodegenInput } from '@parser2/parser';

export function emitStatementListParser(schema: CodegenInput): string {
  const tokenizer = schema.runtime?.tokenize;
  const parser = schema.runtime?.parse;
  const stringify = schema.runtime?.stringify;
  if (tokenizer?.kind !== 'statement-list' || parser?.kind !== 'statement-list' || stringify?.kind !== 'statement-list') {
    throw new Error(`Schema ${schema.name} does not declare a statement-list runtime`);
  }
  const programAlias = parser.programAlias;
  const statementAlias = parser.statementAlias;
  const rootType = schema.structure.rootType;
  const keywordCases = tokenizer.keywords.map((keyword) => `    case ${JSON.stringify(keyword)}:`).join('\n');
  const statementBranches = parser.statements.map((statement) => {
    const checks = statement.startsWith.map((keyword) => `startsWithWord(input, index, ${JSON.stringify(keyword)})`).join(' || ');
    return `  if (${checks}) return ${JSON.stringify(statement.type)};`;
  }).join('\n');
  const blockStartCheck = parser.blockStartKeywords.map((keyword) => `startsWithWord(input, s, ${JSON.stringify(keyword)})`).join(' || ') || 'false';
  const restrictedKeywordCheck = (parser.noLineTerminatorAfter ?? [])
    .map((keyword) => `(word === ${JSON.stringify(keyword)} && hasLineTerminatorBeforeOperand(input, i))`)
    .join(' || ');
  const numberRule = parser.numberLiteral;
  const numberCheck = numberRule ? '((isDigit(ch) || (ch === 46 && isDigit(input.charCodeAt(i + 1)))) && input.charCodeAt(i - 1) !== 47 && input.charCodeAt(i - 1) !== 92)' : 'false';
  const numberPrefixes = JSON.stringify(numberRule?.prefixes ?? []);
  const numberSeparator = JSON.stringify(numberRule?.separator ?? '');
  const bigintSuffix = JSON.stringify(numberRule?.bigintSuffix ?? '');
  const rejectIdentifierAfter = numberRule?.rejectIdentifierAfter ? 'true' : 'false';
  const hashbangMarker = JSON.stringify(parser.hashbang?.marker ?? '');
  const hashbangEscapes = JSON.stringify(parser.hashbang?.rejectEscapedStart ?? []);
  const hashbangCheck = parser.hashbang ? 'validateHashbang(input, i);' : '';

  return String.raw`export type Token = {
  readonly type: string;
  readonly value: string;
  readonly start: number;
  readonly end: number;
};

export type ${programAlias} = {
  readonly type: ${JSON.stringify(rootType)};
  readonly ${parser.sourceTypeField}: ${JSON.stringify(parser.scriptSourceType)} | ${JSON.stringify(parser.moduleSourceType)};
  readonly ${parser.bodyField}: readonly ${statementAlias}[];
  readonly source?: string;
  readonly [key: string]: unknown;
};

export type ${statementAlias} = {
  readonly type: string;
  readonly start: number;
  readonly end: number;
  readonly raw: string;
  readonly [key: string]: unknown;
};

export function tokenize(input: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const start = i;
    const ch = input.charCodeAt(i);
    if (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
      i++;
      while (i < input.length) {
        const c = input.charCodeAt(i);
        if (c !== 32 && c !== 9 && c !== 10 && c !== 13) break;
        i++;
      }
      continue;
    }
    if (isIdentifierStart(ch)) {
      i++;
      while (i < input.length && isIdentifierPart(input.charCodeAt(i))) i++;
      const value = input.slice(start, i);
      out.push({ type: keywordToken(value), value, start, end: i });
      continue;
    }
    if (isDigit(ch)) {
      i = ${numberRule ? 'skipNumberLiteral(input, i)' : 'i + 1'};
      ${numberRule ? '' : 'while (i < input.length && (isIdentifierPart(input.charCodeAt(i)) || input.charCodeAt(i) === 46)) i++;'}
      out.push({ type: 'num', value: input.slice(start, i), start, end: i });
      continue;
    }
    if (ch === 34 || ch === 39) {
      i = skipString(input, i, ch);
      out.push({ type: 'string', value: input.slice(start, i), start, end: i });
      continue;
    }
    i++;
    out.push({ type: input.slice(start, i), value: input.slice(start, i), start, end: i });
  }
  return out;
}

function keywordToken(value: string): string {
  switch (value) {
${keywordCases}
      return value;
    default:
      return 'name';
  }
}

export function parse(input: string): ${programAlias} {
  const body: ${statementAlias}[] = [];
  let statementStart = skipTrivia(input, 0);
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let i = statementStart;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    ${hashbangCheck}
    if (i === 0 && ch === 35 && input.charCodeAt(1) === 33) {
      i = skipLineComment(input, 2);
      continue;
    }
    if (ch === 34 || ch === 39) {
      i = skipString(input, i, ch);
      continue;
    }
    if (ch === 92 && input.charCodeAt(i + 1) === 117) {
      i = skipUnicodeEscape(input, i);
      continue;
    }
    if (ch === 96) {
      i = skipTemplate(input, i);
      continue;
    }
    if (ch === 47) {
      const next = input.charCodeAt(i + 1);
      if (next === 47) {
        i = skipLineComment(input, i + 2);
        continue;
      }
      if (next === 42) {
        i = skipBlockComment(input, i + 2);
        if (i < 0) throw new SyntaxError('Unterminated block comment');
        continue;
      }
    }
    if (isIdentifierStart(ch)) {
      const start = i++;
      while (i < input.length && isIdentifierPart(input.charCodeAt(i))) i++;
      const word = input.slice(start, i);
      if (${restrictedKeywordCheck || 'false'}) throw new SyntaxError('Line terminator after restricted keyword');
      continue;
    }
    if (${numberCheck}) {
      i = skipNumberLiteral(input, i);
      continue;
    }
    if (ch === 42 && input.charCodeAt(i + 1) === 47) throw new SyntaxError('Unexpected block comment close');
    if (ch === 40) parenDepth++;
    else if (ch === 41) {
      if (parenDepth === 0) throw new SyntaxError('Unexpected )');
      parenDepth--;
    } else if (ch === 91) bracketDepth++;
    else if (ch === 93) {
      if (bracketDepth === 0) throw new SyntaxError('Unexpected ]');
      bracketDepth--;
    } else if (ch === 123) braceDepth++;
    else if (ch === 125) {
      if (braceDepth === 0) throw new SyntaxError('Unexpected }');
      braceDepth--;
      if (parenDepth === 0 && bracketDepth === 0 && braceDepth === 0 && isBlockStatementStart(input, statementStart)) {
        body.push(makeStatement(input, statementStart, i + 1));
        statementStart = skipTrivia(input, i + 1);
        i = statementStart;
        continue;
      }
    } else if (ch === 59 && parenDepth === 0 && bracketDepth === 0 && braceDepth === 0) {
      body.push(makeStatement(input, statementStart, i + 1));
      statementStart = skipTrivia(input, i + 1);
      i = statementStart;
      continue;
    }
    i++;
  }
  if (skipTrivia(input, statementStart) < input.length) body.push(makeStatement(input, statementStart, input.length));
  const sourceType = body.some((node) => node.type === ${JSON.stringify(parser.scriptIfStatementType)}) ? ${JSON.stringify(parser.scriptSourceType)} : ${JSON.stringify(parser.moduleSourceType)};
  const ast = { type: ${JSON.stringify(rootType)}, ${parser.sourceTypeField}: sourceType, ${parser.bodyField}: body } as ${programAlias};
  Object.defineProperty(ast, 'source', { value: input, enumerable: false });
  return ast;
}

function makeStatement(input: string, start: number, end: number): ${statementAlias} {
  const s = skipTrivia(input, start);
  return { type: statementType(input, s), start, end, raw: input.slice(start, end) };
}

function statementType(input: string, index: number): string {
${statementBranches}
  return 'ExpressionStatement';
}

function isBlockStatementStart(input: string, start: number): boolean {
  const s = skipTrivia(input, start);
  return ${blockStartCheck};
}

function startsWithWord(input: string, index: number, word: string): boolean {
  return input.startsWith(word, index) && !isIdentifierPart(input.charCodeAt(index + word.length));
}

const hashbangMarker = ${hashbangMarker};
const hashbangEscapes = ${hashbangEscapes} as readonly string[];

function validateHashbang(input: string, index: number): void {
  if (index === 0) {
    for (const escaped of hashbangEscapes) {
      if (input.startsWith(escaped)) throw new SyntaxError('Invalid hashbang');
    }
    if (input.charCodeAt(0) === 35 && hashbangMarker && !input.startsWith(hashbangMarker)) throw new SyntaxError('Invalid hashbang');
    return;
  }
  if (hashbangMarker && input.startsWith(hashbangMarker, index)) throw new SyntaxError('Invalid hashbang');
}

function hasLineTerminatorBeforeOperand(input: string, index: number): boolean {
  let i = index;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 10 || ch === 13) return true;
    if (ch === 32 || ch === 9) {
      i++;
      continue;
    }
    if (ch === 47 && input.charCodeAt(i + 1) === 47) return true;
    if (ch === 47 && input.charCodeAt(i + 1) === 42) {
      for (i += 2; i < input.length - 1; i++) {
        const c = input.charCodeAt(i);
        if (c === 10 || c === 13) return true;
        if (c === 42 && input.charCodeAt(i + 1) === 47) {
          i += 2;
          break;
        }
      }
      continue;
    }
    return false;
  }
  return false;
}

const numberPrefixes = ${numberPrefixes} as readonly { readonly prefixes: readonly string[]; readonly digits: string }[];
const numberSeparator = ${numberSeparator};
const bigintSuffix = ${bigintSuffix};

function skipNumberLiteral(input: string, index: number): number {
  let i = index;
  let integer = true;
  if (input.charCodeAt(i) === 48) {
    const prefix = numberPrefixes.find((entry) => entry.prefixes.some((value) => input.startsWith(value, i)));
    if (prefix) {
      i += prefix.prefixes[0]?.length ?? 0;
      i = scanDigits(input, i, prefix.digits, true);
      if (bigintSuffix && input.startsWith(bigintSuffix, i)) i += bigintSuffix.length;
      if (${rejectIdentifierAfter} && (isDigit(input.charCodeAt(i)) || isIdentifierStart(input.charCodeAt(i)) || input.charCodeAt(i) === 95)) throw new SyntaxError('Invalid numeric literal');
      return i;
    }
  }
  if (input.charCodeAt(i) === 46) {
    integer = false;
    i = scanDigits(input, i + 1, '0123456789', true);
  } else {
    i = scanDigits(input, i, '0123456789', true);
    if (input.charCodeAt(i) === 46) {
      integer = false;
      i = scanDigits(input, i + 1, '0123456789', false);
    }
  }
  const e = input.charCodeAt(i);
  if (e === 69 || e === 101) {
    integer = false;
    i++;
    const sign = input.charCodeAt(i);
    if (sign === 43 || sign === 45) i++;
    i = scanDigits(input, i, '0123456789', true);
  }
  if (integer && bigintSuffix && input.startsWith(bigintSuffix, i)) i += bigintSuffix.length;
  if (${rejectIdentifierAfter} && isIdentifierStart(input.charCodeAt(i))) throw new SyntaxError('Invalid numeric literal');
  return i;
}

function scanDigits(input: string, index: number, digits: string, required: boolean): number {
  let i = index;
  let seen = false;
  let separated = false;
  while (i < input.length) {
    const ch = input.charAt(i);
    if (numberSeparator && ch === numberSeparator) {
      if (!seen || separated || digits.indexOf(input.charAt(i + 1)) < 0) throw new SyntaxError('Invalid numeric separator');
      separated = true;
      i++;
      continue;
    }
    if (digits.indexOf(ch) < 0) break;
    seen = true;
    separated = false;
    i++;
  }
  if (required && !seen) throw new SyntaxError('Invalid numeric literal');
  return i;
}

function skipUnicodeEscape(input: string, index: number): number {
  let i = index + 2;
  if (input.charCodeAt(i) === 123) {
    i++;
    while (i < input.length && input.charCodeAt(i) !== 125) i++;
    return i < input.length ? i + 1 : i;
  }
  return i + 4;
}

function skipTrivia(input: string, index: number): number {
  let i = index;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 8232 || ch === 8233) {
      i++;
      continue;
    }
    if (ch === 47 && input.charCodeAt(i + 1) === 47) {
      i = skipLineComment(input, i + 2);
      continue;
    }
    if (ch === 47 && input.charCodeAt(i + 1) === 42) {
      const end = skipBlockComment(input, i + 2);
      if (end < 0) return i;
      i = end;
      continue;
    }
    break;
  }
  return i;
}

function skipString(input: string, index: number, quote: number): number {
  let i = index + 1;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 92) {
      i += 2;
      continue;
    }
    i++;
    if (ch === quote) return i;
  }
  throw new SyntaxError('Unterminated string');
}

function skipTemplate(input: string, index: number): number {
  let i = index + 1;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 92) {
      i += 2;
      continue;
    }
    i++;
    if (ch === 96) return i;
  }
  throw new SyntaxError('Unterminated template');
}

function skipLineComment(input: string, index: number): number {
  let i = index;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 10 || ch === 13 || ch === 8232 || ch === 8233) break;
    i++;
  }
  return i;
}

function skipBlockComment(input: string, index: number): number {
  let i = index;
  while (i < input.length - 1) {
    if (input.charCodeAt(i) === 42 && input.charCodeAt(i + 1) === 47) return i + 2;
    i++;
  }
  return -1;
}

function isDigit(ch: number): boolean {
  return ch >= 48 && ch <= 57;
}

function isIdentifierStart(ch: number): boolean {
  return (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || ch === 36 || ch === 95;
}

function isIdentifierPart(ch: number): boolean {
  return isIdentifierStart(ch) || isDigit(ch);
}

export function stringify(ast: ${programAlias}): string {
  if (typeof ast.source === 'string') return ast.source;
  return ast.${stringify.bodyField}.map((node) => node.raw ?? '').join('');
}
`;
}

export default emitStatementListParser;
