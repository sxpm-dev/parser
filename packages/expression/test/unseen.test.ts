import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('expression: unseen input and rejection corpus',()=>{
 for(const source of ["a + 3 * (b - 2)", "sum(1, price * 4)"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["a +", "(a * b"])assert.throws(()=>parse(source),SyntaxError,source);
});
