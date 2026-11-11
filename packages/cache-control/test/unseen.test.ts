import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('cache-control: unseen input and rejection corpus',()=>{
 for(const source of ["public, max-age=60, immutable"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["public,,private"])assert.throws(()=>parse(source),SyntaxError,source);
});
