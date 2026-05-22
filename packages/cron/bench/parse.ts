import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';
import { parse } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

const seed = '*/5 * * * *\n0 9 * * 1-5 npm test\n15 14 1 * * deploy\n';

const contestants: Contestant[] = [
  { label: 'parser2 cron parse', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { parse(row); }) },
  { label: 'cron-parser', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { CronExpressionParser.parse(cronExpression(row)); }) },
  { label: 'cronstrue', unit: 'rows', fn: (input: string): BenchResult => countRows(input, (row) => { cronstrue.toString(cronExpression(row)); }) },
];

await runBenchTable({ title: 'Cron package parse - parser2 vs popular parsers', contestants, generateInput: (bytes) => repeatToBytes(seed, bytes) });

function cronExpression(row: string): string {
  return row.split(/\s+/).slice(0, 5).join(' ');
}
