import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('docker-ref: unseen input and rejection corpus',()=>{
 for(const source of ["redis:7.2-alpine", "library/nginx"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["image:"])assert.throws(()=>parse(source),SyntaxError,source);
});
