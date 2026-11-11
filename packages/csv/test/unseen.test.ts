import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('csv: unseen input and rejection corpus',()=>{
 for(const source of ["bob,73\ncarol,91\n", "\"a,b\",\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["\"unterminated"])assert.throws(()=>parse(source),SyntaxError,source);
});
