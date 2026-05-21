import { Bench } from 'tinybench';
import { validate } from '../src/index.ts';

const seed = '192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326\n';
const regex = /^(\d+\.\d+\.\d+\.\d+) (\S+) (\S+) \[([^\]]+)\] "([^"]*)" (\d{3}) (\S+)$/;

for (const kb of [5, 20, 100]) {
  const rows = expand(seed, kb * 1024).trim().split(/\n/);
  const bench = new Bench({ time: kb >= 100 ? 250 : 500, warmupIterations: kb < 50 ? 20 : 3 });
  bench.add('parser2 log validate', () => count(rows, (row) => { validate(row); }));
  bench.add('regex test', () => count(rows, (row) => { if (!regex.test(row)) throw new Error('bad'); }));
  await bench.run();
  console.log(`log ${kb}KB (${rows.length} rows)`);
  for (const task of bench.tasks) console.log(`${task.name}: ${Math.round(task.result?.hz ?? 0)} ops/s`);
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
