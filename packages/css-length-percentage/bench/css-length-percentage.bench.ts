import * as cssTree from 'css-tree';
import valueParser from 'postcss-value-parser';
import { Bench } from 'tinybench';
import { validate } from '../src/index.ts';

const seed = [
  '0',
  '10px',
  '-1.5rem',
  '50%',
  '10px 20%',
  '1px 2px 3px 4px',
  'calc(100% - 1rem)',
  'var(--space, 1rem)',
].join('\n') + '\n';

const regex = /^(?:0|-?\d+(?:\.\d+)?(?:px|rem|%)(?: +-?\d+(?:\.\d+)?(?:px|rem|%))*|[a-z-]+\([^()]+\))$/i;

for (const kb of [5, 20, 100]) {
  const rows = expand(seed, kb * 1024).trim().split(/\n/);
  const bench = new Bench({ time: kb >= 100 ? 250 : 500, warmupIterations: kb < 50 ? 20 : 3 });
  bench.add('parser2 css-length validate', () => count(rows, (row) => { validate(row); }));
  bench.add('postcss-value-parser', () => count(rows, (row) => { valueParser(row); }));
  bench.add('css-tree value parse', () => count(rows, (row) => { cssTree.parse(row, { context: 'value' }); }));
  bench.add('regex shape test', () => count(rows, (row) => { if (!regex.test(row)) throw new Error('bad'); }));
  await bench.run();
  console.log(`css-length-percentage ${kb}KB (${rows.length} rows)`);
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
