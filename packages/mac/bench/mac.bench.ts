import { Bench } from 'tinybench';
import { validate } from '../src/index.ts';

const seed = '00:1A:2B:3C:4D:5E\nDE-AD-BE-EF-CA-FE\naa:bb:cc:dd:ee:ff\n';
const regex = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

for (const kb of [5, 20, 100]) {
  const input = expand(seed, kb * 1024).trim().split(/\n/);
  const bench = new Bench({ time: kb >= 100 ? 250 : 500, warmupIterations: kb < 50 ? 20 : 3 });
  bench.add('parser2 mac validate', () => count(input, (value) => { validate(value); }));
  bench.add('regex test', () => count(input, (value) => { if (!regex.test(value)) throw new Error('bad'); }));
  await bench.run();
  console.log(`mac ${kb}KB (${input.length} rows)`);
  for (const task of bench.tasks) {
    const hz = task.result?.hz ?? 0;
    console.log(`${task.name}: ${Math.round(hz)} ops/s`);
  }
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
