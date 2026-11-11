import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('log: unseen input and rejection corpus',()=>{
 for(const source of ["2026-11-12T12:34:56Z ERROR request failed"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["not a log"])assert.throws(()=>parse(source),SyntaxError,source);
});
