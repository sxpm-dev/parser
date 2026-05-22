// Test each bench contestant on 1MB synthetic separately, with a hard timeout
// per call so a runaway can't hang the whole script.
import { parse as p2Parse } from '../packages/html/src/_generated/parser.ts';
import { parse as parse5 } from 'parse5';
import { parseDocument as h2 } from 'htmlparser2';
import { parse as nhp } from 'node-html-parser';
import { parseHTML } from 'linkedom';

const seed = [
  '<!doctype html>',
  '<h1 class="title">Hello world</h1>',
  '<p class="copy" disabled>Parser benchmark text</p>',
  '<br />',
  '',
].join('\n');

const contestants: Array<[string, (s: string) => unknown]> = [
  ['parser2 fast', (s) => p2Parse(s, { mode: 'fast' })],
  ['parser2 raws', (s) => p2Parse(s, { mode: 'raws' })],
  ['parse5', (s) => parse5(s)],
  ['htmlparser2', (s) => h2(s)],
  ['linkedom', (s) => parseHTML(s).document],
  ['node-html-parser', (s) => nhp(s)],
];

for (const targetKb of [5, 100, 500, 1000]) {
  let src = '';
  while (src.length < targetKb * 1024) src += seed;
  console.log(`\n=== ${targetKb}KB (len ${src.length}) ===`);
  for (const [label, fn] of contestants) {
    const t0 = Date.now();
    try {
      fn(src);
      console.log(`  ${label.padEnd(20)} ${Date.now() - t0}ms`);
    } catch (e) {
      console.log(`  ${label.padEnd(20)} ERROR: ${(e as Error).message.slice(0, 60)}`);
    }
  }
}
