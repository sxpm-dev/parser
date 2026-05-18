import { createRequire } from 'node:module';
import { parse as parser2Parse } from '../src/index.ts';
import { runBenchTable, type BenchResult, type Contestant } from './common.ts';

const require = createRequire(import.meta.url);
const commentJson = require('comment-json') as { parse(input: string): unknown };
const JsonParse = require('jsonparse') as new () => {
  onValue?: (value: unknown) => void;
  write(input: string): unknown;
  value: unknown;
};
const Parser = require('tree-sitter') as new () => {
  setLanguage(language: unknown): void;
  parse(input: string): { rootNode: TreeNode };
};
const TreeSitterJSON = require('tree-sitter-json') as unknown;

type TreeNode = {
  readonly type: string;
  readonly childCount: number;
  child(index: number): TreeNode;
};

const JSON_SEED = '{"id":__I__,"name":"item-__I__","ok":true,"score":12.5,"tags":["a","b","c"],"meta":{"next":null,"flag":false}}';

function countJsonValue(value: unknown): number {
  if (value === null || typeof value !== 'object') return 1;
  if (Array.isArray(value)) return 1 + value.reduce((sum, item) => sum + countJsonValue(item), 0);
  let count = 1;
  for (const child of Object.values(value as Record<string, unknown>)) count += countJsonValue(child);
  return count;
}

function countTree(node: TreeNode): number {
  let count = 1;
  for (let i = 0; i < node.childCount; i++) count += countTree(node.child(i));
  return count;
}

async function main(): Promise<void> {
  const parseJsonLib = (await import('parse-json')).default as (input: string) => unknown;
  const treeSitterParser = new Parser();
  treeSitterParser.setLanguage(TreeSitterJSON);

  const contestants: Contestant[] = [
    {
      label: 'parser2 json parse',
      unit: 'nodes',
      fn: (input): BenchResult => {
        const ast = parser2Parse(input);
        return { units: countJsonValue(ast.value), sanity: ast.type };
      },
    },
    {
      label: 'JSON.parse',
      unit: 'nodes',
      fn: (input): BenchResult => {
        const value = JSON.parse(input) as unknown;
        return { units: countJsonValue(value), sanity: Array.isArray(value) ? 'array' : typeof value };
      },
    },
    {
      label: 'comment-json',
      unit: 'nodes',
      fn: (input): BenchResult => {
        const value = commentJson.parse(input);
        return { units: countJsonValue(value), sanity: Array.isArray(value) ? 'array' : typeof value };
      },
    },
    {
      label: 'jsonparse',
      unit: 'nodes',
      fn: (input): BenchResult => {
        const parser = new JsonParse();
        let root: unknown;
        parser.onValue = function (this: { stack?: unknown[] }, value: unknown): void {
          if (!this.stack || this.stack.length === 0) root = value;
        };
        parser.write(input);
        return { units: countJsonValue(root), sanity: Array.isArray(root) ? 'array' : typeof root };
      },
    },
    {
      label: 'parse-json',
      unit: 'nodes',
      fn: (input): BenchResult => {
        const value = parseJsonLib(input) as unknown;
        return { units: countJsonValue(value), sanity: Array.isArray(value) ? 'array' : typeof value };
      },
    },
    {
      label: 'tree-sitter JSON',
      unit: 'nodes',
      fn: (input): BenchResult => {
        const tree = treeSitterParser.parse(input);
        return { units: countTree(tree.rootNode), sanity: tree.rootNode.type };
      },
    },
  ];

  await runBenchTable({
    title: 'JSON parsers - parser2 vs popular JSON parsers',
    seed: JSON_SEED,
    contestants,
    sizesKb: [5, 20, 100, 500],
  });
}

void main();
