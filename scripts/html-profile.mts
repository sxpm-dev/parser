import { Session } from 'node:inspector';
import { writeFileSync } from 'node:fs';
import { parse } from '../packages/html/src/_generated/parser.ts';

const seed = '<div class=hero><p>x<p>y</div><ul><li>a<li>b</ul>';
const target = 1024 * 1024;
let input = '';
while (input.length < target) input += seed;
console.log(`input length: ${input.length} (${(input.length / 1024).toFixed(0)} KB)`);

// Warm up V8.
parse(input, { mode: 'fast' });
parse(input, { mode: 'fast' });

const session = new Session();
session.connect();

await new Promise<void>((resolve) => session.post('Profiler.enable', () => resolve()));
await new Promise<void>((resolve) =>
  session.post('Profiler.setSamplingInterval', { interval: 50 }, () => resolve()),
);
await new Promise<void>((resolve) => session.post('Profiler.start', () => resolve()));

const RUNS = 30;
const ts: number[] = [];
for (let i = 0; i < RUNS; i++) {
  const t0 = performance.now();
  parse(input, { mode: 'fast' });
  ts.push(performance.now() - t0);
}

const profile: { profile: unknown } = await new Promise((resolve, reject) =>
  session.post('Profiler.stop', (err, params) => (err ? reject(err) : resolve(params as { profile: unknown }))),
);
writeFileSync('html-1mb.cpuprofile', JSON.stringify(profile.profile));
session.disconnect();

const avg = ts.reduce((a, b) => a + b, 0) / ts.length;
const min = Math.min(...ts);
const max = Math.max(...ts);
console.log(`parse: avg=${avg.toFixed(1)}ms  min=${min.toFixed(1)}ms  max=${max.toFixed(1)}ms  n=${RUNS}`);
console.log('wrote html-1mb.cpuprofile');
