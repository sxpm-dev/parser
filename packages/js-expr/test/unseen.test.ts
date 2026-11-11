import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('js-expr: unseen input and rejection corpus',()=>{
 for(const source of ["a >= 3 && b != 2", "fn(1, 3)"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["a +", "a @ b"])assert.throws(()=>parse(source),SyntaxError,source);
});
