import chroma from 'chroma-js';
import { colord } from 'colord';
import tinycolor from 'tinycolor2';
import { Bench } from 'tinybench';
import { validate } from '../src/index.ts';

const seed = [
  'red',
  '#00ff99',
  '#fff',
  'rgb(0 0 0 / 50%)',
  'rgba(255, 0, 0)',
  'oklch(60% 0.2 30)',
  'color(display-p3 1 0 0)',
  'var(--brand-color, red)',
].join('\n') + '\n';

const regex = /^(?:[a-z-]+|#[0-9a-fA-F]{3,8}|[a-z-]+\([^()]+\))$/;

for (const kb of [5, 20, 100]) {
  const rows = expand(seed, kb * 1024).trim().split(/\n/);
  const bench = new Bench({ time: kb >= 100 ? 250 : 500, warmupIterations: kb < 50 ? 20 : 3 });
  bench.add('parser2 css-color validate', () => count(rows, (row) => { validate(row); }));
  bench.add('colord', () => countValid(rows, (row) => colord(row).isValid()));
  bench.add('chroma-js', () => countValid(rows, (row) => {
    try {
      chroma(row);
      return true;
    } catch {
      return false;
    }
  }));
  bench.add('tinycolor2', () => countValid(rows, (row) => tinycolor(row).isValid()));
  bench.add('regex shape test', () => count(rows, (row) => { if (!regex.test(row)) throw new Error('bad'); }));
  await bench.run();
  console.log(`css-color ${kb}KB (${rows.length} rows)`);
  for (const task of bench.tasks) console.log(`${task.name}: ${Math.round(task.result?.hz ?? 0)} ops/s`);
}

function countValid(rows: string[], fn: (value: string) => boolean): number {
  let ok = 0;
  for (const row of rows) {
    if (fn(row)) ok++;
  }
  return ok;
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
