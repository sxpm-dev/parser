import type { CodegenInput } from '@parser2/parser';

export function emitStatementListParser(schema: CodegenInput): string {
  const tokenizer = schema.runtime?.tokenize;
  const parser = schema.runtime?.parse;
  const stringify = schema.runtime?.stringify;
  if (tokenizer?.kind !== 'statement-list' || parser?.kind !== 'statement-list' || stringify?.kind !== 'statement-list') {
    throw new Error(`Schema ${schema.name} does not declare a statement-list runtime`);
  }
  const inferredStatementRules = inferStatementRules(schema);
  const inferredKeywords = inferKeywords(schema, inferredStatementRules);
  const programAlias = parser.programAlias ?? schema.structure.rootAlias;
  const statementAlias = parser.statementAlias ?? `${pascal(schema.name)}Statement`;
  const rootType = schema.structure.rootType;
  const sourceTypeField = parser.sourceTypeField ?? 'sourceType';
  const bodyField = parser.bodyField ?? 'body';
  const moduleSourceType = parser.moduleSourceType ?? 'module';
  const scriptSourceType = parser.scriptSourceType ?? 'script';
  const scriptIfStatementType = parser.scriptIfStatementType ?? 'WithStatement';
  const keywordCases = (tokenizer.keywords ?? inferredKeywords).map((keyword) => `    case ${JSON.stringify(keyword)}:`).join('\n');
  const statementCases = statementDispatchCases(parser.statements ?? inferredStatementRules);
  const statementPatterns = JSON.stringify(schema.patterns.filter((pattern) => pattern.nodeType));
  const statementPatternsByNodeType = JSON.stringify(groupPatternsByNodeType(schema));
  const syntaxCheckedStatementTypes = JSON.stringify(inferSyntaxCheckedStatementTypes(schema));
  const grammarPatterns = JSON.stringify(groupPatterns(schema));
  const blockStartCheck = (parser.blockStartKeywords ?? inferBlockStartKeywords(schema)).map((keyword) => `startsWithWord(input, s, ${JSON.stringify(keyword)})`).join(' || ') || 'false';
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
  const slashLiteral = parser.slashLiteral;
  const slashLiteralToken = JSON.stringify(slashLiteral?.token ?? 'regexp');
  const slashLiteralChars = JSON.stringify(slashLiteral?.precededByChars ?? []);
  const slashLiteralKeywords = JSON.stringify(slashLiteral?.precededByKeywords ?? []);
  const slashLiteralAllowAtStatementStart = slashLiteral?.allowAtStatementStart ? 'true' : 'false';
  const requireBalancedEnd = parser.requireBalancedEnd ? 'true' : 'false';

  return String.raw`export type Token = {
  readonly type: string;
  readonly value: string;
  readonly start: number;
  readonly end: number;
};

export type ${programAlias} = {
  readonly type: ${JSON.stringify(rootType)};
  readonly ${sourceTypeField}: ${JSON.stringify(scriptSourceType)} | ${JSON.stringify(moduleSourceType)};
  readonly ${bodyField}: readonly ${statementAlias}[];
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

export type ParseError = {
  readonly message: string;
  readonly start: number;
  readonly end: number;
  readonly expected?: string;
  readonly actual?: string;
  readonly action: 'partial';
};

export type ParseRecoveryResult = {
  readonly ast: ${programAlias};
  readonly tokens: readonly Token[];
  readonly errors: readonly ParseError[];
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
    if (ch === 47 && ${slashLiteral ? 'isSlashLiteralStart(input, i, 0)' : 'false'}) {
      i = skipSlashLiteral(input, i);
      out.push({ type: slashLiteralToken, value: input.slice(start, i), start, end: i });
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
      if (${slashLiteral ? 'isSlashLiteralStart(input, i, statementStart)' : 'false'}) {
        i = skipSlashLiteral(input, i);
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
  if (${requireBalancedEnd} && (parenDepth !== 0 || bracketDepth !== 0 || braceDepth !== 0)) throw new SyntaxError('Unterminated group');
  if (skipTrivia(input, statementStart) < input.length) body.push(makeStatement(input, statementStart, input.length));
  const sourceType = body.some((node) => node.type === ${JSON.stringify(scriptIfStatementType)}) ? ${JSON.stringify(scriptSourceType)} : ${JSON.stringify(moduleSourceType)};
  const ast = { type: ${JSON.stringify(rootType)}, ${sourceTypeField}: sourceType, ${bodyField}: body } as ${programAlias};
  Object.defineProperty(ast, 'source', { value: input, enumerable: false });
  return ast;
}

export function parseWithRecovery(input: string): ParseRecoveryResult {
  const tokens = tokenizeWithRecovery(input);
  try {
    return { ast: parse(input), tokens, errors: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Syntax error';
    return {
      ast: makeRecoveredProgram(input),
      tokens,
      errors: [{
        message,
        start: Math.max(0, input.length - 1),
        end: input.length,
        expected: 'complete syntax',
        actual: input.length === 0 ? 'eof' : input.slice(Math.max(0, input.length - 1)),
        action: 'partial',
      }],
    };
  }
}

function tokenizeWithRecovery(input: string): Token[] {
  try {
    return tokenize(input);
  } catch {
    const out: Token[] = [];
    let i = 0;
    while (i < input.length) {
      const start = i;
      const ch = input.charCodeAt(i);
      if (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
        i++;
        continue;
      }
      if (isIdentifierStart(ch)) {
        i++;
        while (i < input.length && isIdentifierPart(input.charCodeAt(i))) i++;
        const value = input.slice(start, i);
        out.push({ type: keywordToken(value), value, start, end: i });
        continue;
      }
      i++;
      out.push({ type: input.slice(start, i), value: input.slice(start, i), start, end: i });
    }
    return out;
  }
}

function makeRecoveredProgram(input: string): ${programAlias} {
  const start = skipTrivia(input, 0);
  const body = start < input.length ? [makePartialStatement(input, start, input.length)] : [];
  const ast = { type: ${JSON.stringify(rootType)}, ${sourceTypeField}: ${JSON.stringify(moduleSourceType)}, ${bodyField}: body } as ${programAlias};
  Object.defineProperty(ast, 'source', { value: input, enumerable: false });
  return ast;
}

function makeStatement(input: string, start: number, end: number): ${statementAlias} {
  const s = skipTrivia(input, start);
  const raw = input.slice(start, end);
  const type = inferStatementType(input, s, raw);
  return { type, start, end, raw };
}

function makePartialStatement(input: string, start: number, end: number): ${statementAlias} {
  const s = skipTrivia(input, start);
  return { type: statementType(input, s), start, end, raw: input.slice(start, end), partial: true };
}

function statementType(input: string, index: number): string {
  switch (readWord(input, index)) {
${statementCases}
  }
  return 'ExpressionStatement';
}

function readWord(input: string, index: number): string {
  if (!isIdentifierStart(input.charCodeAt(index))) return '';
  let i = index + 1;
  while (i < input.length && isIdentifierPart(input.charCodeAt(i))) i++;
  return input.slice(index, i);
}

function inferStatementType(input: string, index: number, raw: string): string {
  const guessed = statementType(input, index);
  if (statementPatternMatches(guessed, raw)) return guessed;
  const word = readWord(input, index);
  for (const pattern of statementPatterns) {
    if (!pattern.nodeType || pattern.nodeType === guessed) continue;
    if (firstPatternWord(pattern.pattern) !== word) continue;
    if (matchesPattern(raw, pattern.pattern)) return pattern.nodeType;
  }
  throw new SyntaxError('Unexpected syntax');
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
const slashLiteralToken = ${slashLiteralToken};
const slashLiteralChars = ${slashLiteralChars} as readonly string[];
const slashLiteralKeywords = ${slashLiteralKeywords} as readonly string[];
const slashLiteralAllowAtStatementStart = ${slashLiteralAllowAtStatementStart};
export const recoveryMetadata = ${JSON.stringify(schema.recoveries)};
const statementPatterns = ${statementPatterns} as readonly { readonly rule: string; readonly pattern: string; readonly nodeType?: string }[];
const statementPatternsByNodeType = ${statementPatternsByNodeType} as Record<string, readonly { readonly rule: string; readonly pattern: string; readonly nodeType?: string }[]>;
const syntaxCheckedStatementTypes = new Set(${syntaxCheckedStatementTypes});
const grammarPatterns = ${grammarPatterns} as Record<string, readonly string[]>;

function validateStatementPattern(type: string, input: string): void {
  if (statementPatternMatches(type, input)) return;
  throw new SyntaxError('Unexpected syntax');
}

function statementPatternMatches(type: string, input: string): boolean {
  if (!syntaxCheckedStatementTypes.has(type)) return true;
  if (type === 'ExpressionStatement') return !hasAdjacentTopLevelBlockAfterExpression(input);
  const candidates = statementPatternsByNodeType[type] ?? [];
  if (candidates.length === 0) return true;
  for (const candidate of candidates) {
    if (matchesPattern(input, candidate.pattern)) return true;
  }
  return false;
}

function hasAdjacentTopLevelBlockAfterExpression(input: string): boolean {
  if (input.indexOf('{') < 0) return false;
  let paren = 0;
  let bracket = 0;
  let first = -1;
  let previous = -1;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    if (ch === 34 || ch === 39) {
      if (first < 0) first = i;
      previous = ch;
      i = skipString(input, i, ch) - 1;
      continue;
    }
    if (ch === 96) {
      if (first < 0) first = i;
      previous = ch;
      i = skipTemplate(input, i) - 1;
      continue;
    }
    if (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 8232 || ch === 8233) continue;
    if (first < 0) first = i;
    if (ch === 40) paren++;
    else if (ch === 41 && paren > 0) paren--;
    else if (ch === 91) bracket++;
    else if (ch === 93 && bracket > 0) bracket--;
    else if (ch === 123 && paren === 0 && bracket === 0 && i > first && previous >= 0 && canEndExpressionBeforeBlock(previous)) {
      return true;
    }
    previous = ch;
  }
  return false;
}

function canEndExpressionBeforeBlock(ch: number): boolean {
  return ch === 41 || ch === 93 || ch === 34 || ch === 39 || ch === 96 || isIdentifierPart(ch);
}

function firstPatternWord(pattern: string): string {
  const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(pattern.trimStart());
  return match?.[0] ?? '';
}

function matchesPattern(input: string, pattern: string): boolean {
  const end = matchPatternParts(input, splitPattern(pattern), 0, skipTrivia(input, 0));
  if (end < 0) return false;
  const rest = skipTrivia(input, end);
  return rest >= input.length || input.charCodeAt(rest) === 59;
}

function matchPatternParts(input: string, parts: readonly string[], partIndex: number, index: number): number {
  let i = index;
  for (let p = partIndex; p < parts.length; p++) {
    const part = parts[p] ?? '';
    if (isPatternSlot(part)) {
      const nextLiteral = findNextPatternBoundary(parts, p + 1);
      const matched = matchPatternSlot(input, i, part, nextLiteral);
      if (matched < 0) return -1;
      i = matched;
      continue;
    }
    i = matchPatternLiteral(input, i, part);
    if (i < 0) return -1;
  }
  return i;
}

function splitPattern(pattern: string): string[] {
  const parts: string[] = [];
  const slot = /%[a-zA-Z_][a-zA-Z0-9_-]*[?*+]?%/g;
  let cursor = 0;
  for (;;) {
    const match = slot.exec(pattern);
    if (!match) break;
    if (match.index > cursor) parts.push(pattern.slice(cursor, match.index));
    parts.push(match[0]);
    cursor = match.index + match[0].length;
  }
  if (cursor < pattern.length) parts.push(pattern.slice(cursor));
  return parts;
}

function isPatternSlot(part: string): boolean {
  return /^%[a-zA-Z_][a-zA-Z0-9_-]*[?*+]?%$/.test(part);
}

function patternSlotName(part: string): string {
  return part.replace(/^%/, '').replace(/[?*+]?%$/, '');
}

function patternSlotModifier(part: string): string {
  const match = /([?*+])%$/.exec(part);
  return match?.[1] ?? '';
}

function findNextPatternBoundary(parts: readonly string[], start: number): string | undefined {
  for (let i = start; i < parts.length; i++) {
    const part = parts[i] ?? '';
    if (!isPatternSlot(part)) {
      if (part.trim().length > 0) return part;
      continue;
    }
    const boundary = leadingBoundaryForSlot(patternSlotName(part));
    if (boundary) return boundary;
  }
  return undefined;
}

function leadingBoundaryForSlot(name: string): string | undefined {
  if (name === 'BlockStatement' || name === 'ClassBody' || name === 'ObjectLiteral' || name === 'SwitchBody') return '{';
  if (name === 'ArrayLiteral') return '[';
  if (name === 'Arguments' || name === 'FormalParameters') return '(';
  return undefined;
}

function matchPatternSlot(input: string, index: number, part: string, nextLiteral: string | undefined): number {
  const name = patternSlotName(part);
  const modifier = patternSlotModifier(part);
  if (modifier === '?') {
    const matched = matchPatternRef(input, index, name, nextLiteral);
    return matched < 0 ? index : matched;
  }
  if (modifier === '*' || modifier === '+') {
    let i = index;
    let count = 0;
    for (;;) {
      const matched = matchPatternRef(input, i, name, nextLiteral);
      if (matched <= i) break;
      i = matched;
      count++;
    }
    return modifier === '+' && count === 0 ? -1 : i;
  }
  return matchPatternRef(input, index, name, nextLiteral);
}

function matchPatternRef(input: string, index: number, name: string, nextLiteral: string | undefined): number {
  const i = skipTrivia(input, index);
  if (name === 'BindingIdentifier' || name === 'Identifier') return matchBindingIdentifier(input, i);
  if (name === 'FormalParameters') return matchFormalParameters(input, i, nextLiteral);
  if (name === 'Expression' || name === 'ForHeader' || name === 'ImportClause') return consumeUntilNextLiteral(input, i, nextLiteral);
  if (name === 'BlockStatement' || name === 'ClassBody' || name === 'ObjectLiteral' || name === 'SwitchBody') {
    return input.charCodeAt(i) === 123 ? findMatchingGroupEnd(input, i, 123, 125) : -1;
  }
  if (name === 'ArrayLiteral') return input.charCodeAt(i) === 91 ? findMatchingGroupEnd(input, i, 91, 93) : -1;
  if (name === 'Arguments') return input.charCodeAt(i) === 40 ? findMatchingGroupEnd(input, i, 40, 41) : -1;
  const rules = grammarPatterns[name] ?? [];
  for (const pattern of rules) {
    const matched = matchPatternParts(input, splitPattern(pattern), 0, i);
    if (matched >= 0) return matched;
  }
  if (rules.length > 0) return -1;
  return consumeUntilNextLiteral(input, i, nextLiteral);
}

function matchFormalParameters(input: string, index: number, nextLiteral: string | undefined): number {
  if (!nextLiteral) return -1;
  const end = findPatternLiteral(input, nextLiteral, index);
  if (end < 0) return -1;
  return validateFormalParameterList(input.slice(index, end)) ? end : -1;
}

function validateFormalParameterList(input: string): boolean {
  let i = skipTrivia(input, 0);
  if (i >= input.length) return true;
  let afterComma = false;
  let seenRest = false;
  for (;;) {
    i = skipTrivia(input, i);
    if (i >= input.length) return afterComma;
    if (seenRest) return false;
    if (input.startsWith('...', i)) {
      seenRest = true;
      i = skipTrivia(input, i + 3);
    }
    const start = i;
    if (input.charCodeAt(i) === 123) i = findMatchingGroupEnd(input, i, 123, 125);
    else if (input.charCodeAt(i) === 91) i = findMatchingGroupEnd(input, i, 91, 93);
    else i = matchBindingIdentifier(input, i);
    if (i <= start) return false;
    i = skipTrivia(input, i);
    if (input.charCodeAt(i) === 61) {
      if (seenRest) return false;
      i = findTopLevelParameterBoundary(input, i + 1);
    }
    i = skipTrivia(input, i);
    if (i >= input.length) return true;
    if (input.charCodeAt(i) !== 44) return false;
    i++;
    afterComma = true;
  }
}

function findTopLevelParameterBoundary(input: string, index: number): number {
  let i = index;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 34 || ch === 39) {
      i = skipString(input, i, ch);
      continue;
    }
    if (ch === 96) {
      i = skipTemplate(input, i);
      continue;
    }
    if (ch === 40) paren++;
    else if (ch === 41 && paren > 0) paren--;
    else if (ch === 91) bracket++;
    else if (ch === 93 && bracket > 0) bracket--;
    else if (ch === 123) brace++;
    else if (ch === 125 && brace > 0) brace--;
    if (paren === 0 && bracket === 0 && brace === 0 && input.charCodeAt(i) === 44) return i;
    i++;
  }
  return i;
}

function matchBindingIdentifier(input: string, index: number): number {
  if (!isIdentifierStart(input.charCodeAt(index))) return -1;
  let i = index + 1;
  while (i < input.length && isIdentifierPart(input.charCodeAt(i))) i++;
  const word = input.slice(index, i);
  return keywordToken(word) === 'name' ? i : -1;
}

function consumeUntilNextLiteral(input: string, index: number, nextLiteral: string | undefined): number {
  const i = skipTrivia(input, index);
  if (!nextLiteral) return i < input.length ? input.length : -1;
  const found = findTopLevelPatternLiteral(input, nextLiteral, i);
  return found > i ? found : -1;
}

function findTopLevelPatternLiteral(input: string, literal: string, start: number): number {
  let i = start;
  let paren = 0;
  let bracket = 0;
  let brace = 0;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 34 || ch === 39) {
      i = skipString(input, i, ch);
      continue;
    }
    if (ch === 96) {
      i = skipTemplate(input, i);
      continue;
    }
    if (paren === 0 && bracket === 0 && brace === 0 && matchPatternLiteral(input, i, literal) >= 0) return i;
    if (ch === 40) paren++;
    else if (ch === 41) {
      if (paren === 0) return matchPatternLiteral(input, i, literal) >= 0 ? i : -1;
      paren--;
    } else if (ch === 91) bracket++;
    else if (ch === 93 && bracket > 0) bracket--;
    else if (ch === 123) brace++;
    else if (ch === 125 && brace > 0) brace--;
    i++;
  }
  return -1;
}

function findPatternLiteral(input: string, literal: string, start: number): number {
  let i = start;
  while (i < input.length) {
    if (matchPatternLiteral(input, i, literal) >= 0) return i;
    const ch = input.charCodeAt(i);
    if (ch === 34 || ch === 39) {
      i = skipString(input, i, ch);
      continue;
    }
    if (ch === 96) {
      i = skipTemplate(input, i);
      continue;
    }
    i++;
  }
  return -1;
}

function matchPatternLiteral(input: string, index: number, literal: string): number {
  let i = index;
  let p = 0;
  while (p < literal.length) {
    const ch = literal.charCodeAt(p);
    if (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 8232 || ch === 8233) {
      while (p < literal.length) {
        const c = literal.charCodeAt(p);
        if (c !== 32 && c !== 9 && c !== 10 && c !== 13 && c !== 8232 && c !== 8233) break;
        p++;
      }
      i = skipTrivia(input, i);
      continue;
    }
    i = skipTrivia(input, i);
    if (input.charCodeAt(i) !== ch) return -1;
    i++;
    p++;
  }
  return i;
}

function findMatchingGroupEnd(input: string, open: number, openCode: number, closeCode: number): number {
  let depth = 0;
  let i = open;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 34 || ch === 39) {
      i = skipString(input, i, ch);
      continue;
    }
    if (ch === 96) {
      i = skipTemplate(input, i);
      continue;
    }
    if (ch === openCode) depth++;
    else if (ch === closeCode) {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return -1;
}

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

function skipSlashLiteral(input: string, index: number): number {
  let i = index + 1;
  let inClass = false;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 10 || ch === 13 || ch === 8232 || ch === 8233) throw new SyntaxError('Unterminated slash literal');
    if (ch === 92) {
      i += 2;
      continue;
    }
    if (ch === 91) inClass = true;
    else if (ch === 93) inClass = false;
    else if (ch === 47 && !inClass) {
      i++;
      while (i < input.length && isIdentifierPart(input.charCodeAt(i))) i++;
      return i;
    }
    i++;
  }
  throw new SyntaxError('Unterminated slash literal');
}

function isSlashLiteralStart(input: string, index: number, statementStart: number): boolean {
  if (slashLiteralAllowAtStatementStart && skipTrivia(input, statementStart) === index) return true;
  let i = index - 1;
  while (i >= 0) {
    const ch = input.charCodeAt(i);
    if (ch !== 32 && ch !== 9 && ch !== 10 && ch !== 13 && ch !== 8232 && ch !== 8233) break;
    i--;
  }
  if (i < 0) return false;
  if (slashLiteralChars.indexOf(input.charAt(i)) >= 0) return true;
  if (!isIdentifierPart(input.charCodeAt(i))) return false;
  let start = i;
  while (start > 0 && isIdentifierPart(input.charCodeAt(start - 1))) start--;
  return slashLiteralKeywords.indexOf(input.slice(start, i + 1)) >= 0;
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

function inferKeywords(schema: CodegenInput, statements: readonly { readonly startsWith: readonly string[] }[]): string[] {
  const keywords = new Set<string>();
  for (const statement of statements) {
    for (const keyword of statement.startsWith) keywords.add(keyword);
  }
  for (const pattern of schema.patterns) {
    const first = firstLiteralWord(pattern.pattern);
    if (first) keywords.add(first);
  }
  return [...keywords].sort();
}

function inferStatementRules(schema: CodegenInput): { readonly type: string; readonly startsWith: readonly string[] }[] {
  const rules = new Map<string, Set<string>>();
  for (const pattern of schema.patterns) {
    const word = firstLiteralWord(pattern.pattern);
    if (!word || !pattern.nodeType) continue;
    const starts = rules.get(pattern.nodeType) ?? new Set<string>();
    starts.add(word);
    rules.set(pattern.nodeType, starts);
  }
  return [...rules.entries()]
    .map(([type, startsWith]) => ({ type, startsWith: [...startsWith].sort() }))
    .sort((a, b) => statementRank(a.type) - statementRank(b.type) || a.type.localeCompare(b.type));
}

function statementRank(type: string): number {
  if (type.indexOf('Import') >= 0 || type.indexOf('Export') >= 0 || type.indexOf('Declaration') >= 0) return 0;
  if (type === 'ExpressionStatement') return 2;
  return 1;
}

function inferBlockStartKeywords(schema: CodegenInput): string[] {
  const keywords = new Set<string>();
  for (const pattern of schema.patterns) {
    if (!pattern.nodeType || pattern.nodeType === 'ExpressionStatement' || pattern.nodeType === 'VariableDeclaration' || pattern.nodeType === 'ImportDeclaration') continue;
    const first = firstLiteralWord(pattern.pattern);
    if (first) keywords.add(first);
  }
  return [...keywords].sort();
}

function firstLiteralWord(pattern: string): string | undefined {
  const trimmed = pattern.trimStart();
  if (trimmed.startsWith('%')) return undefined;
  const match = /^[A-Za-z_$][A-Za-z0-9_$]*/.exec(trimmed);
  return match?.[0];
}

function statementDispatchCases(statements: readonly { readonly type: string; readonly startsWith: readonly string[] }[]): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const statement of statements) {
    for (const word of statement.startsWith) {
      if (seen.has(word)) continue;
      seen.add(word);
      lines.push(`    case ${JSON.stringify(word)}:`);
      lines.push(`      return ${JSON.stringify(statement.type)};`);
    }
  }
  return lines.join('\n');
}

function groupPatterns(schema: CodegenInput): Record<string, string[]> {
  const grouped: Record<string, string[]> = {};
  for (const pattern of schema.patterns) {
    const patterns = grouped[pattern.rule] ?? [];
    patterns.push(pattern.pattern);
    grouped[pattern.rule] = patterns;
  }
  return grouped;
}

function groupPatternsByNodeType(schema: CodegenInput): Record<string, { readonly rule: string; readonly pattern: string; readonly nodeType?: string }[]> {
  const grouped: Record<string, { readonly rule: string; readonly pattern: string; readonly nodeType?: string }[]> = {};
  for (const pattern of schema.patterns) {
    if (!pattern.nodeType) continue;
    const patterns = grouped[pattern.nodeType] ?? [];
    patterns.push(pattern);
    grouped[pattern.nodeType] = patterns;
  }
  return grouped;
}

function inferSyntaxCheckedStatementTypes(schema: CodegenInput): string[] {
  const checked = new Set<string>();
  for (const pattern of schema.patterns) {
    if (!pattern.nodeType) continue;
    if (/%(?:FormalParameters|ClassBody|Expression|ForHeader)[?*+]?%/.test(pattern.pattern)) checked.add(pattern.nodeType);
  }
  return [...checked].sort();
}

function pascal(value: string): string {
  const words = value.match(/[a-zA-Z0-9]+/g) ?? [value];
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

export default emitStatementListParser;
