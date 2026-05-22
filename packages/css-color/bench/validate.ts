import chroma from 'chroma-js';
import { colord } from 'colord';
import tinycolor from 'tinycolor2';
import { validate } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, countValidRows, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

const seed = ['red', '#00ff99', '#fff', 'rgb(0 0 0 / 50%)', 'rgba(255, 0, 0)', 'oklch(60% 0.2 30)', 'color(display-p3 1 0 0)', 'var(--brand-color, red)'].join('\n') + '\n';
const regex = /^(?:[a-z-]+|#[0-9a-fA-F]{3,8}|[a-z-]+\([^()]+\))$/;

const contestants: Contestant[] = [
  { label: 'parser2 css-color validate', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { validate(row); }) },
  { label: 'colord', unit: 'valid rows', fn: (input: string): BenchResult => countValidRows(input, (row) => colord(row).isValid()) },
  { label: 'chroma-js', unit: 'valid rows', fn: (input: string): BenchResult => countValidRows(input, (row) => { try { chroma(row); return true; } catch { return false; } }) },
  { label: 'tinycolor2', unit: 'valid rows', fn: (input: string): BenchResult => countValidRows(input, (row) => tinycolor(row).isValid()) },
  { label: 'regex shape test', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { if (!regex.test(row)) throw new Error('bad'); }) },
];

await runBenchTable({ title: 'CSS color package validate - parser2 vs popular validators', contestants, generateInput: (bytes) => repeatToBytes(seed, bytes) });
