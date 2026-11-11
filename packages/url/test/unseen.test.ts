import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('url: unseen input and rejection corpus',()=>{
 for(const source of ["https://example.net/api?q=42#result", "/other/path"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["https://", "not a url"])assert.throws(()=>parse(source),SyntaxError,source);
});
