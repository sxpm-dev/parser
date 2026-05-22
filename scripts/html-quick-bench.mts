import { readFileSync } from 'node:fs';
import { parse } from '../packages/html/src/_generated/parser.ts';
import { parse as parse5 } from 'parse5';

const huge = readFileSync('packages/html/test/fixtures/huge-page.html', 'utf8');
const seed = '<div class=hero><p>x<p>y</div><ul><li>a<li>b</ul>';
const repeat = (target: number) => { let s = ''; while (s.length < target) s += seed; return s; };

const inputs: Array<[string, string]> = [
  ['10 KB synthetic', repeat(10 * 1024)],
  ['100 KB synthetic', repeat(100 * 1024)],
  ['1 MB synthetic', repeat(1024 * 1024)],
  ['huge-page (883 KB real)', huge],
];

function time(name: string, fn: () => void, runs = 5): number {
  // Warm.
  fn(); fn();
  const ts: number[] = [];
  for (let i = 0; i < runs; i++) {
    const t = performance.now();
    fn();
    ts.push(performance.now() - t);
  }
  return ts.reduce((a, b) => a + b, 0) / ts.length;
}

console.log('input'.padEnd(28) + 'parser2 fast'.padEnd(16) + 'parse5'.padEnd(16) + 'ratio');
console.log('-'.repeat(72));
for (const [label, input] of inputs) {
  const ours = time(label, () => parse(input, { mode: 'fast' }));
  const p5 = time(label, () => parse5(input));
  console.log(
    label.padEnd(28) +
    `${ours.toFixed(1)} ms`.padEnd(16) +
    `${p5.toFixed(1)} ms`.padEnd(16) +
    `${(ours / p5).toFixed(2)}x ${ours < p5 ? '(faster)' : ''}`,
  );
}
