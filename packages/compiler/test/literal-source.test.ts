import {strict as assert} from 'node:assert';
import test from 'node:test';
import {prefixCondition} from '../src/literal-source.ts';
test('factored prefixes preserve membership, including divergent suffixes',()=>{
 for(const literals of [['abc','ade'],['ab','ac','db','dc'],['a','abc','bcd'],['abc','abd','abe','abf'],['url(','URL(','uRL(']]) {
  const match=new Function('s',`const i=0,c=s.charCodeAt(0);return ${prefixCondition(literals)};`);
  const candidates=['','a','ab','abc','ade','xde','url(','uRl(',...literals.map(s=>s+'tail')];
  for(const a of 'abcdex')for(const b of 'abcdex')for(const c of 'abcdex')candidates.push(a+b+c);
  for(const s of candidates)assert.equal(match(s),literals.some(l=>s.startsWith(l)),`${literals}: ${s}`);
 }
});
