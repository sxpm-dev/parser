import * as cssTree from 'css-tree';
import valueParser from 'postcss-value-parser';
import { validate } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

const seed = ['0', '10px', '-1.5rem', '50%', '10px 20%', '1px 2px 3px 4px', 'calc(100% - 1rem)', 'var(--space, 1rem)'].join('\n') + '\n';
const regex = /^(?:0|-?\d+(?:\.\d+)?(?:px|rem|%)(?: +-?\d+(?:\.\d+)?(?:px|rem|%))*|[a-z-]+\([^()]+\))$/i;

const contestants: Contestant[] = [
  { label: 'parser2 css-length validate', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { validate(row); }) },
  { label: 'postcss-value-parser', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { valueParser(row); }) },
  { label: 'css-tree value parse', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { cssTree.parse(row, { context: 'value' }); }) },
  { label: 'regex shape test', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { if (!regex.test(row)) throw new Error('bad'); }) },
];

await runBenchTable({ title: 'CSS length percentage package validate - parser2 vs popular parsers', contestants, generateInput: (bytes) => repeatToBytes(seed, bytes) });
