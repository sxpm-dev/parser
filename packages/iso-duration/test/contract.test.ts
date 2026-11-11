import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
import {seed} from '../bench/cases.ts';
test('iso-duration: structured output and both inverse paths',()=>{
 const value=parse(seed);assert.deepEqual(value,{"date": [{"unit": "D", "amount": "12"}], "time": [{"unit": "H", "amount": "34"}]});
 assert.deepEqual(parse(stringify(value)),value);
 assert.deepEqual(parse(stringify(parse(seed,{output:'json'}),{input:'json'})),value);
 assert.throws(()=>stringify({unexpected:123}));
});
