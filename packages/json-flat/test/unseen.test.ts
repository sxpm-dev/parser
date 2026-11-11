import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('json-flat: unseen input and rejection corpus',()=>{
 for(const source of ["{\"count\": 12, \"nested\": {\"x\":[1,2]}}"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["{\"x\": (broken}"])assert.throws(()=>parse(source),SyntaxError,source);
});
