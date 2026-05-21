import nativeUrl from 'node:url';
import { Bench } from 'tinybench';
import fastUrl from 'fast-url-parser';
import parseurl from 'parseurl';
import { parse } from '../src/index.ts';

const seed = '/foo/bar?q=hello&tag=one\nhttps://example.com/search\n';

for (const kb of [5, 20, 100]) {
  const rows = expand(seed, kb * 1024).trim().split(/\n/);
  const bench = new Bench({ time: kb >= 100 ? 250 : 500, warmupIterations: kb < 50 ? 20 : 3 });
  bench.add('parser2 url parse', () => count(rows, (row) => { parse(row); }));
  bench.add('node URL constructor', () => count(rows, (row) => { new URL(row, 'https://example.com'); }));
  bench.add('node url.parse', () => count(rows, (row) => { nativeUrl.parse(row, true); }));
  bench.add('fast-url-parser', () => count(rows, (row) => { fastUrl.parse(row); }));
  bench.add('parseurl', () => count(rows, (row) => { parseurl({ url: row } as { url: string }); }));
  await bench.run();
  console.log(`url ${kb}KB (${rows.length} rows)`);
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
