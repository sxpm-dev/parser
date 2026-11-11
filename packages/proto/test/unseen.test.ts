import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('proto: unseen input and rejection corpus',()=>{
 for(const source of ["syntax = \"proto3\"; message Account { repeated string labels = 3; int32 count = 7; }"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["message X { string x = ; }"])assert.throws(()=>parse(source),SyntaxError,source);
});
