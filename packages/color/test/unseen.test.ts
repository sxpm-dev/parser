import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('color: unseen input and rejection corpus',()=>{
 for(const source of ["#abc", "rgb(1, 2, 3)"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["#ggg", "rgb(1"])assert.throws(()=>parse(source),SyntaxError,source);
});
