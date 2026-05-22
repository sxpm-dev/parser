import { validate } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

const seed = '192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326\n';
const regex = /^(\d+\.\d+\.\d+\.\d+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d{3}) (\S+)$/;

const contestants: Contestant[] = [
  { label: 'parser2 log validate', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { validate(row); }) },
  { label: 'regex test', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { if (!regex.test(row)) throw new Error('bad'); }) },
];

await runBenchTable({ title: 'Log package validate - parser2 vs regex', contestants, generateInput: (bytes) => repeatToBytes(seed, bytes) });
