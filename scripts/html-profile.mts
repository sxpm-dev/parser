import { readFileSync } from 'node:fs';
import { parse } from '../packages/html/src/_generated/parser.ts';

const src = readFileSync('packages/html/test/fixtures/huge-page.html', 'utf8');

// Warm up V8.
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
const min = Math.min(...ts);
const max = Math.max(...ts);
console.log(`huge-page parse: avg=${avg.toFixed(1)}ms  min=${min.toFixed(1)}ms  max=${max.toFixed(1)}ms  n=${RUNS}`);
