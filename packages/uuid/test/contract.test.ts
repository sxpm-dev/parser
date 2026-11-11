import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
import {seed} from '../bench/cases.ts';
test('uuid: structured output and both inverse paths',()=>{
 const value=parse(seed);assert.deepEqual(value,{"time_low": "550e8400", "time_mid": "e29b", "time_hi": "41d4", "clock_seq": "a716", "node": "446655440000"});
 assert.deepEqual(parse(stringify(value)),value);
 assert.deepEqual(parse(stringify(parse(seed,{output:'json'}),{input:'json'})),value);
 assert.throws(()=>stringify({unexpected:123}));
});
