import { parse, countTokens } from './packages/html/src/_generated/parser.ts';
import { readFileSync } from 'node:fs';

const seed = '<div class=hero><p>x<p>y</div><ul><li>a<li>b</ul>';
const target = 1024 * 1024;
let input = ''; while (input.length < target) input += seed;
const huge = readFileSync('packages/html/test/fixtures/huge-page.html', 'utf8');

for (const [label, src] of [['1MB synth', input], ['huge-page', huge]] as const) {
  // warm
  countTokens(src); parse(src, { mode: 'fast' });
  let tn = 0; const t0 = performance.now();
  for (let i = 0; i < 5; i++) tn = countTokens(src);
  const tk = (performance.now() - t0) / 5;
  const p0 = performance.now();
  for (let i = 0; i < 5; i++) parse(src, { mode: 'fast' });
  const pk = (performance.now() - p0) / 5;
  console.log(label, 'tokens:', tn,
    'bytes/tok:', (src.length / tn).toFixed(2),
    'tokenize:', tk.toFixed(1) + 'ms',
    'parse:', pk.toFixed(1) + 'ms',
    'tok-share:', ((tk / pk) * 100).toFixed(0) + '%');
}
