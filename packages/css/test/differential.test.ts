import {strict as assert} from 'node:assert';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import postcss from 'postcss';
import {parse,stringify} from '../src/index.ts';
import {normalize} from '../../../scripts/style-bench.ts';
test('preserved 1MB CSS fixture agrees structurally with PostCSS and round-trips',()=>{
 const source=readFileSync(new URL('../bench/fixture/huge-page.css',import.meta.url),'utf8');
 const value=parse(source);
 assert.deepEqual(value,normalize(postcss.parse(source)));
 assert.deepEqual(parse(stringify(value)),value);
});
test('150 unseen stylesheet combinations agree with PostCSS',()=>{
 const values=['red','calc(100% - 2px)','"a;b}"','rgb(1, 2, 3)','url(https://example.com/a.png)'];
 for(let i=0;i<150;i++) {
  const source=`@media (width > ${i}px) { .item-${i}, #id-${i}:hover { content: ${values[i%values.length]}; --n: ${i}; } }`;
  assert.deepEqual(parse(source),normalize(postcss.parse(source)),source);
 }
});
