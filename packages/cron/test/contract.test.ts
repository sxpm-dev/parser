import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
import {seed} from '../bench/cases.ts';
test('cron: structured output and both inverse paths',()=>{
 const value=parse(seed);assert.deepEqual(value,{"minute": "5", "hour": "12", "dayOfMonth": "23", "month": "10", "dayOfWeek": "6"});
 assert.deepEqual(parse(stringify(value)),value);
 assert.deepEqual(parse(stringify(parse(seed,{output:'json'}),{input:'json'})),value);
 assert.throws(()=>stringify({unexpected:123}));
});
