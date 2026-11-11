import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('env: unseen input and rejection corpus',()=>{
 for(const source of ["PORT=3000\nMODE=testing\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["missing-equals"])assert.throws(()=>parse(source),SyntaxError,source);
});
