import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type {
  CodegenInput,
  ExampleStep,
  GrammarExpr,
  InferredAst,
  InferredAstField,
  InferredAstNode,
  InferredRecovery,
  ParserSchema,
  PatternRule,
} from '@parser2/parser';
import { generateCssParser } from './css-template.js';
import { generateJsonParser } from './json-template.js';

export type InferredSchema = CodegenInput;

export function inferSchema(schema: ParserSchema): InferredSchema {
  const tokens = new Set<string>();
  const nodes = new Set<string>();
  const fields = new Set<string>();

  const visit = (steps: readonly ExampleStep[]): void => {
    for (const step of steps) {
      if (step.kind === 'token') tokens.add(step.type);
      if (step.kind === 'field') fields.add(step.name);
      if (step.kind === 'node') {
        nodes.add(step.type);
        visit(step.children);
      }
    }
  };

  for (const example of schema.examples) visit(example.steps);

  return {
    name: schema.name,
    tokens: [...tokens].sort(),
    nodes: [...nodes].sort(),
    fields: [...fields].sort(),
    examples: schema.examples.length,
    ast: inferAst(schema),
    recoveries: inferRecoveries(schema),
    grammar: inferGrammarFromPatterns(schema.rules),
  };
}

type AstOccurrence = {
  readonly fields: Map<string, Set<string>>;
  readonly hasChildren: boolean;
};

function inferAst(schema: ParserSchema): InferredAst {
  const occurrences = new Map<string, AstOccurrence[]>();
  const topLevelNodes: string[] = [];

  const visit = (steps: readonly ExampleStep[], depth: number): void => {
    for (const step of steps) {
      if (step.kind !== 'node') continue;
      if (depth === 0) topLevelNodes.push(step.type);
      const fields = new Map<string, Set<string>>();
      let hasChildren = false;
      for (const child of step.children) {
        if (child.kind === 'field') {
          const values = fields.get(child.name) ?? new Set<string>();
          values.add(fieldTypeSource(child.value));
          fields.set(child.name, values);
        } else if (child.kind === 'node') {
          hasChildren = true;
        }
      }
      const seen = occurrences.get(step.type) ?? [];
      seen.push({ fields, hasChildren });
      occurrences.set(step.type, seen);
      visit(step.children, depth + 1);
    }
  };

  for (const example of schema.examples) visit(example.steps, 0);

  const nodeTypes = [...occurrences.keys()].sort();
  const rootType =
    nodeTypes.find((type) => type === schema.rules?.[0]?.name) ??
    topLevelNodes[0] ??
    nodeTypes[0] ??
    'Root';
  const prefix = pascal(schema.name);
  const rootAlias = `${prefix}Root`;
  const nodeUnionAlias = `${prefix}Node`;
  const nodes: InferredAstNode[] = nodeTypes.map((type) => {
    const nodeOccurrences = occurrences.get(type) ?? [];
    const fieldNames = new Set<string>();
    let childOccurrences = 0;
    for (const occurrence of nodeOccurrences) {
      for (const field of occurrence.fields.keys()) fieldNames.add(field);
      if (occurrence.hasChildren) childOccurrences++;
    }

    const fields: InferredAstField[] = [...fieldNames].sort().map((name) => {
      const typeSources = new Set<string>();
      let present = 0;
      for (const occurrence of nodeOccurrences) {
        const values = occurrence.fields.get(name);
        if (!values) continue;
        present++;
        for (const value of values) typeSources.add(value);
      }
      return {
        name,
        typeSource: unionType([...typeSources].sort()),
        optional: present < nodeOccurrences.length,
      };
    });

    return {
      type,
      alias: type === rootType ? rootAlias : `${prefix}${pascal(type)}`,
      isRoot: type === rootType,
      fields,
      nodesField: childOccurrences > 0 ? { optional: childOccurrences < nodeOccurrences.length } : undefined,
    };
  });

  return {
    rootType,
    rootAlias,
    nodeUnionAlias,
    nodes,
    typeSource: emitAstTypes(rootAlias, nodeUnionAlias, nodes),
  };
}

function emitAstTypes(rootAlias: string, nodeUnionAlias: string, nodes: readonly InferredAstNode[]): string {
  const root = nodes.find((node) => node.isRoot);
  const members = nodes.filter((node) => !node.isRoot);
  const lines: string[] = [];

  if (root) lines.push(`export type ${rootAlias} = ${emitNodeShape(root, nodeUnionAlias)};`);
  else lines.push(`export type ${rootAlias} = { type: string };`);
  lines.push(`export type ${nodeUnionAlias} = ${members.length > 0 ? members.map((node) => node.alias).join(' | ') : 'never'};`);
  for (const node of members) lines.push(`export type ${node.alias} = ${emitNodeShape(node, nodeUnionAlias)};`);
  return lines.join('\n');
}

function emitNodeShape(node: InferredAstNode, nodeUnionAlias: string): string {
  const fields = [`type: ${JSON.stringify(node.type)}`];
  if (node.nodesField) fields.push(`nodes${node.nodesField.optional ? '?' : ''}: ${nodeUnionAlias}[]`);
  for (const field of node.fields) fields.push(`${field.name}${field.optional ? '?' : ''}: ${field.typeSource}`);
  return `{ ${fields.join('; ')} }`;
}

function fieldTypeSource(value: unknown): string {
  if (value === true) return 'true';
  if (value === false) return 'false';
  if (value === null) return 'null';
  if (typeof value === 'string') return 'string';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'boolean') return 'boolean';
  return 'unknown';
}

function unionType(types: readonly string[]): string {
  return types.length === 0 ? 'unknown' : types.join(' | ');
}

function pascal(value: string): string {
  const words = value.match(/[a-zA-Z0-9]+/g) ?? [value];
  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function inferRecoveries(schema: ParserSchema): InferredRecovery[] {
  return schema.examples
    .filter((example) => example.invalid || example.recovery)
    .map((example) => ({
      input: example.input,
      reason: example.invalid?.reason ?? 'invalid',
      context: example.recovery?.context,
      on: example.recovery?.on,
      skipUntil: example.recovery?.skipUntil ?? [],
      action: example.recovery?.action ?? 'drop',
    }));
}

function inferGrammarFromPatterns(rules: readonly PatternRule[] | undefined): CodegenInput['grammar'] {
  if (!rules || rules.length === 0) return undefined;
  return {
    root: rules[0]?.name ?? '',
    rules: rules.map((rule) => ({
      name: rule.name,
      expr: rule.alternatives.length === 1
        ? inferPatternExpr(rule.alternatives[0]?.pattern ?? '')
        : { kind: 'choice', options: rule.alternatives.map((alternative) => inferPatternExpr(alternative.pattern)) },
    })),
  };
}

function inferPatternExpr(pattern: string): GrammarExpr {
  const items: GrammarExpr[] = [];
  let cursor = 0;
  const slot = /%([a-zA-Z_][a-zA-Z0-9_-]*)([?*+]?)%/g;
  for (;;) {
    const match = slot.exec(pattern);
    if (!match) break;
    if (match.index > cursor) items.push({ kind: 'literal', value: pattern.slice(cursor, match.index) });
    const ref: GrammarExpr = { kind: 'ref', name: match[1] ?? '' };
    const modifier = match[2] ?? '';
    if (modifier === '*') items.push({ kind: 'repeat', item: ref });
    else if (modifier === '+') items.push({ kind: 'seq', items: [ref, { kind: 'repeat', item: ref }] });
    else if (modifier === '?') items.push({ kind: 'choice', options: [{ kind: 'literal', value: '' }, ref] });
    else items.push(ref);
    cursor = match.index + match[0].length;
  }
  if (cursor < pattern.length) items.push({ kind: 'literal', value: pattern.slice(cursor) });
  return items.length === 1 ? items[0] ?? { kind: 'literal', value: '' } : { kind: 'seq', items };
}

export async function generateParser(schema: ParserSchema, schemaPath: string): Promise<string> {
  const inferred = inferSchema(schema);
  const srcDir = basename(dirname(schemaPath)) === 'src' ? dirname(schemaPath) : join(dirname(schemaPath), 'src');
  const outFile = join(srcDir, '_generated', 'parser.ts');
  await mkdir(dirname(outFile), { recursive: true });
  await writeFile(outFile, header(inferred) + emitParser(inferred));
  return outFile;
}

function header(inferred: InferredSchema): string {
  return `/* eslint-disable */
// Generated by @parser2/compiler. Do not edit directly.
// Schema: ${inferred.name}; examples=${inferred.examples}; recoveries=${inferred.recoveries.length}; tokens=${inferred.tokens.join(',')}; nodes=${inferred.nodes.join(',')}

`;
}

function emitParser(inferred: InferredSchema): string {
  if (inferred.grammar?.root === 'JsonDocument') return emitJsonParser(inferred);
  if (inferred.nodes.includes('Program')) return emitProgramParser(inferred);
  if (inferred.nodes.includes('stylesheet')) return emitStylesheetParser(inferred);
  throw new Error(`Cannot infer parser generator for schema ${inferred.name}`);
}

function emitProgramParser(_inferred: InferredSchema): string {
  return `export type Token = {
  readonly type: string;
  readonly value: string;
  readonly start: number;
  readonly end: number;
};

export type JsNode = {
  readonly type: 'Program';
  readonly sourceType: 'script' | 'module';
  readonly body: readonly JsStatement[];
  readonly source?: string;
  readonly [key: string]: unknown;
};

export type JsStatement = {
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
      i++;
      while (i < input.length && (isIdentifierPart(input.charCodeAt(i)) || input.charCodeAt(i) === 46)) i++;
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
    case 'const':
    case 'let':
    case 'var':
    case 'function':
    case 'if':
    case 'for':
    case 'switch':
    case 'import':
    case 'export':
    case 'class':
    case 'with':
    case 'using':
    case 'await':
    case 'return':
      return value;
    default:
      return 'name';
  }
}

export function parse(input: string): JsNode {
  const body: JsStatement[] = [];
  let statementStart = skipTrivia(input, 0);
  let parenDepth = 0;
  let bracketDepth = 0;
  let braceDepth = 0;
  let i = statementStart;
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
  const sourceType = body.some((node) => node.type === 'WithStatement') ? 'script' : 'module';
  const ast = { type: 'Program', sourceType, body } as JsNode;
  Object.defineProperty(ast, 'source', { value: input, enumerable: false });
  return ast;
}

function makeStatement(input: string, start: number, end: number): JsStatement {
  const s = skipTrivia(input, start);
  return { type: statementType(input, s), start, end, raw: input.slice(start, end) };
}

function statementType(input: string, index: number): string {
  if (startsWithWord(input, index, 'import')) return 'ImportDeclaration';
  if (startsWithWord(input, index, 'export')) return 'ExportNamedDeclaration';
  if (startsWithWord(input, index, 'const') || startsWithWord(input, index, 'let') || startsWithWord(input, index, 'var') || startsWithWord(input, index, 'using')) return 'VariableDeclaration';
  if (startsWithWord(input, index, 'if')) return 'IfStatement';
  if (startsWithWord(input, index, 'for')) return 'ForStatement';
  if (startsWithWord(input, index, 'switch')) return 'SwitchStatement';
  if (startsWithWord(input, index, 'function')) return 'FunctionDeclaration';
  if (startsWithWord(input, index, 'class')) return 'ClassDeclaration';
  if (startsWithWord(input, index, 'with')) return 'WithStatement';
  return 'ExpressionStatement';
}

function isBlockStatementStart(input: string, start: number): boolean {
  const s = skipTrivia(input, start);
  return startsWithWord(input, s, 'function') || startsWithWord(input, s, 'class') || startsWithWord(input, s, 'if') || startsWithWord(input, s, 'for') || startsWithWord(input, s, 'while') || startsWithWord(input, s, 'switch') || startsWithWord(input, s, 'try') || startsWithWord(input, s, 'with') || startsWithWord(input, s, 'export');
}

function startsWithWord(input: string, index: number, word: string): boolean {
  return input.startsWith(word, index) && !isIdentifierPart(input.charCodeAt(index + word.length));
}

function skipTrivia(input: string, index: number): number {
  let i = index;
  while (i < input.length) {
    const ch = input.charCodeAt(i);
    if (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
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
  while (i < input.length && input.charCodeAt(i) !== 10 && input.charCodeAt(i) !== 13) i++;
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

export function stringify(ast: JsNode): string {
  if (typeof ast.source === 'string') return ast.source;
  return ast.body.map((node) => node.raw ?? '').join('');
}
`;
}

function emitStylesheetParser(inferred: InferredSchema): string {
  return generateCssParser(inferred);
}

function emitJsonParser(inferred: InferredSchema): string {
  return generateJsonParser(inferred);
}
