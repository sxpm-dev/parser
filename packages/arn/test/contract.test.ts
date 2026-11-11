import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
import {seed} from '../bench/cases.ts';
test('arn: structured output and both inverse paths',()=>{
 const value=parse(seed);assert.deepEqual(value,{"partition": "aws", "service": "lambda", "region": "us-east-1", "account": "123456789012", "resource": "function:worker"});
 assert.deepEqual(parse(stringify(value)),value);
 assert.deepEqual(parse(stringify(parse(seed,{output:'json'}),{input:'json'})),value);
 assert.throws(()=>stringify({unexpected:123}));
});
