import { parse } from '../packages/html/src/_generated/parser.ts';

const seed = '<div class=hero><p>x<p>y</div><ul><li>a<li>b</ul>';
let src = '';
while (src.length < 1024 * 1024) src += seed;

parse(src, { mode: 'fast' });
parse(src, { mode: 'fast' });

const RUNS = 5;
const ts: number[] = [];
for (let i = 0; i < RUNS; i++) {
  const t0 = performance.now();
  parse(src, { mode: 'fast' });
  ts.push(performance.now() - t0);
}
const avg = ts.reduce((a, b) => a + b, 0) / ts.length;
console.log(`synth 1MB parse: avg=${avg.toFixed(1)}ms  n=${RUNS}`);
