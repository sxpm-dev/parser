import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('json: unseen input and rejection corpus',()=>{
 for(const source of ["{\"a\": [1, true, null, {\"b\":\"x\"}]}", "[]", "{}", "false"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["[1,]", "{\"a\":}", "01", "\"bad\nstring\""])assert.throws(()=>parse(source),SyntaxError,source);
});
