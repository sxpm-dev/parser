import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
import {seed} from '../bench/cases.ts';
test('ipv6: structured output and both inverse paths',()=>{
 const value=parse(seed);assert.deepEqual(value,{"address": "2001:db8:85a3:0:0:8a2e:370:7334"});
 assert.deepEqual(parse(stringify(value)),value);
 assert.deepEqual(parse(stringify(parse(seed,{output:'json'}),{input:'json'})),value);
 assert.throws(()=>stringify({unexpected:123}));
});
