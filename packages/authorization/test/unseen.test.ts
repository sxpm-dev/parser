import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('authorization: unseen input and rejection corpus',()=>{
 for(const source of ["Basic dXNlcjpwYXNz"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["Bearer"])assert.throws(()=>parse(source),SyntaxError,source);
});
