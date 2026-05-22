import nativeUrl from 'node:url';
import fastUrl from 'fast-url-parser';
import parseurl from 'parseurl';
import { parse } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

const seed = '/foo/bar?q=hello&tag=one\nhttps://example.com/search\n';

const contestants: Contestant[] = [
  { label: 'parser2 url parse', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { parse(row); }) },
  { label: 'node URL constructor', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { new URL(row, 'https://example.com'); }) },
  { label: 'node url.parse', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { nativeUrl.parse(row, true); }) },
  { label: 'fast-url-parser', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { fastUrl.parse(row); }) },
  { label: 'parseurl', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { parseurl({ url: row } as { url: string }); }) },
];

await runBenchTable({ title: 'URL package parse - parser2 vs popular parsers', contestants, generateInput: (bytes) => repeatToBytes(seed, bytes) });
