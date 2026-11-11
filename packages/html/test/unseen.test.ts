import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('html: unseen input and rejection corpus',()=>{
 for(const source of ["<div class=\"x\">Hi</div><!--note-->"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["<div"])assert.throws(()=>parse(source),SyntaxError,source);
});
