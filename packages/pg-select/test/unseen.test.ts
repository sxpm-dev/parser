import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('pg-select: unseen input and rejection corpus',()=>{
 for(const source of ["SELECT email, age FROM people WHERE age >= 18;", "SELECT count FROM totals;"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["SELECT FROM;"])assert.throws(()=>parse(source),SyntaxError,source);
});
