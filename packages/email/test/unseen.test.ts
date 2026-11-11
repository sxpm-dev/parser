import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('email: unseen input and rejection corpus',()=>{
 for(const source of ["first.last+tag@sub.example.net"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["missing-at", "@example.org"])assert.throws(()=>parse(source),SyntaxError,source);
});
