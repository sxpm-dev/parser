import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('jwt: unseen input and rejection corpus',()=>{
 for(const source of ["eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.YWJj"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["a.b", "a.b.c.d"])assert.throws(()=>parse(source),SyntaxError,source);
});
