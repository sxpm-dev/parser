import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('http: unseen input and rejection corpus',()=>{
 for(const source of ["POST /api HTTP/1.1\r\nHost: api.example\r\nContent-Length: 2\r\n\r\nOK"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["GET / HTTP/1.1\r\nHost: broken"])assert.throws(()=>parse(source),SyntaxError,source);
});
