import { Bench } from 'tinybench';
import { CronExpressionParser } from 'cron-parser';
import cronstrue from 'cronstrue';
import { parse } from '../src/index.ts';

const seed = '*/5 * * * *\n0 9 * * 1-5 npm test\n15 14 1 * * deploy\n';

for (const kb of [5, 20, 100]) {
  const rows = expand(seed, kb * 1024).trim().split(/\n/);
  const bench = new Bench({ time: kb >= 100 ? 250 : 500, warmupIterations: kb < 50 ? 20 : 3 });
  bench.add('parser2 cron parse', () => count(rows, (row) => { parse(row); }));
  bench.add('cron-parser', () => count(rows, (row) => { CronExpressionParser.parse(cronExpression(row)); }));
  bench.add('cronstrue', () => count(rows, (row) => { cronstrue.toString(cronExpression(row)); }));
  await bench.run();
  console.log(`cron ${kb}KB (${rows.length} rows)`);
  for (const task of bench.tasks) console.log(`${task.name}: ${Math.round(task.result?.hz ?? 0)} ops/s`);
}

function cronExpression(row: string): string {
  return row.split(/\s+/).slice(0, 5).join(' ');
}

function count(rows: string[], fn: (value: string) => void): number {
  let ok = 0;
  for (const row of rows) {
    fn(row);
    ok++;
  }
  return ok;
}

function expand(seedText: string, bytes: number): string {
  let out = '';
  while (out.length < bytes) out += seedText;
  return out;
}
