import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import type {
  CodegenInput,
  ExampleStep,
  GrammarExpr,
  InferredStructure,
  InferredStructureField,
  InferredStructureNode,
  InferredRecovery,
  ParserSchema,
  PatternRule,
} from '@parser2/parser';
import { emitGenericParser } from './emitter.js';

export type InferredSchema = CodegenInput;
export type ParserEmitter = (inferred: InferredSchema) => string;

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

  const structure = inferStructure(schema);
  const patternRules = collectPatternRules(schema);
  return {
    name: schema.name,
    tokens: [...tokens].sort(),
    nodes: [...nodes].sort(),
    fields: [...fields].sort(),
    examples: schema.examples.length,
    structure,
    ast: structure,
    recoveries: inferRecoveries(schema),
    patterns: inferPatterns(patternRules),
    grammar: inferGrammarFromPatterns(patternRules),
    runtime: schema.runtime,
  };
}

function inferPatterns(rules: readonly PatternRule[]): CodegenInput['patterns'] {
  return rules.flatMap((rule) =>
    rule.alternatives
      .map((alternative) => ({
        rule: rule.name,
        pattern: alternative.pattern,
        nodeType: alternative.steps.find((step) => step.kind === 'node')?.type,
      })),
  );
}

function collectPatternRules(schema: ParserSchema): PatternRule[] {
  return [
    ...(schema.rules ?? []),
    ...schema.examples.flatMap((example) => example.generalizations ?? []),
  ];
}

type AstOccurrence = {
  readonly fields: Map<string, Set<string>>;
  readonly hasChildren: boolean;
};

function inferStructure(schema: ParserSchema): InferredStructure {
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
    nodeTypes.find((type) => type === collectPatternRules(schema)[0]?.name) ??
    topLevelNodes[0] ??
    nodeTypes[0] ??
    'Root';
  const prefix = pascal(schema.name);
  const rootAlias = `${prefix}Root`;
  const nodeUnionAlias = `${prefix}Node`;
  const nodes: InferredStructureNode[] = nodeTypes.map((type) => {
    const nodeOccurrences = occurrences.get(type) ?? [];
    const fieldNames = new Set<string>();
    let childOccurrences = 0;
    for (const occurrence of nodeOccurrences) {
      for (const field of occurrence.fields.keys()) fieldNames.add(field);
      if (occurrence.hasChildren) childOccurrences++;
    }

    const fields: InferredStructureField[] = [...fieldNames].sort().map((name) => {
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
    typeSource: emitStructureTypes(rootAlias, nodeUnionAlias, nodes),
    exampleOutputs: schema.examples
      .map((example) => example.structure)
      .filter((structure) => structure !== undefined),
  };
}

function emitStructureTypes(rootAlias: string, nodeUnionAlias: string, nodes: readonly InferredStructureNode[]): string {
  const root = nodes.find((node) => node.isRoot);
  const members = nodes.filter((node) => !node.isRoot);
  const lines: string[] = [];

  if (root) lines.push(`export type ${rootAlias} = ${emitNodeShape(root, nodeUnionAlias)};`);
  else lines.push(`export type ${rootAlias} = { type: string };`);
  lines.push(`export type ${nodeUnionAlias} = ${members.length > 0 ? members.map((node) => node.alias).join(' | ') : 'never'};`);
  for (const node of members) lines.push(`export type ${node.alias} = ${emitNodeShape(node, nodeUnionAlias)};`);
  return lines.join('\n');
}

function emitNodeShape(node: InferredStructureNode, nodeUnionAlias: string): string {
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
      missing: example.recovery?.missing ?? [],
      action: example.recovery?.action ?? 'drop',
    }));
}

function inferGrammarFromPatterns(rules: readonly PatternRule[] | undefined): CodegenInput['grammar'] {
  if (!rules || rules.length === 0) return undefined;
  const validRules = rules.filter((rule) => rule.alternatives.length > 0);
  return {
    root: validRules[0]?.name ?? '',
    rules: validRules.map((rule) => ({
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

export async function generateParser(schema: ParserSchema, schemaPath: string, emitParser: ParserEmitter = emitGenericParser): Promise<string> {
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
