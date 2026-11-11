import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
import {seed} from '../bench/cases.ts';
test('log: structured output and both inverse paths',()=>{
 const value=parse(seed);assert.deepEqual(value,{"entries": [{"timestamp": "2026-11-11T10:20:30Z", "level": "INFO", "message": "service ready"}]});
 assert.deepEqual(parse(stringify(value)),value);
 assert.deepEqual(parse(stringify(parse(seed,{output:'json'}),{input:'json'})),value);
 assert.throws(()=>stringify({unexpected:123}));
});
