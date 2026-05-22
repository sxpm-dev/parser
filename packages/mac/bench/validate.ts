import { validate } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

const seed = '00:1A:2B:3C:4D:5E\nDE-AD-BE-EF-CA-FE\naa:bb:cc:dd:ee:ff\n';
const regex = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

const contestants: Contestant[] = [
  { label: 'parser2 mac validate', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { validate(row); }) },
  { label: 'regex test', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { if (!regex.test(row)) throw new Error('bad'); }) },
];

await runBenchTable({ title: 'MAC package validate - parser2 vs regex', contestants, generateInput: (bytes) => repeatToBytes(seed, bytes) });
