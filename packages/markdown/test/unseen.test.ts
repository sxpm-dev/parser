import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('markdown: unseen input and rejection corpus',()=>{
 for(const source of ["# New heading\n- first entry\n> quoted line\nPlain text\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of [])assert.throws(()=>parse(source),SyntaxError,source);
});
