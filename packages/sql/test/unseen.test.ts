import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('sql: unseen input and rejection corpus',()=>{
 for(const source of ["SELECT x FROM table1 WHERE age >= 18;", "SELECT 'it''s fine';"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["SELECT \"unterminated"])assert.throws(()=>parse(source),SyntaxError,source);
});
