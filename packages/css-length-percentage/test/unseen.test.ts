import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('css-length-percentage: unseen input and rejection corpus',()=>{
 for(const source of ["3rem", "25%", "calc(100% - 2px)"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["12invalid", "calc(1"])assert.throws(()=>parse(source),SyntaxError,source);
});
