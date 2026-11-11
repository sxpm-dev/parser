import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('mime: unseen input and rejection corpus',()=>{
 for(const source of ["text/html", "image/svg+xml"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["missing-slash"])assert.throws(()=>parse(source),SyntaxError,source);
});
