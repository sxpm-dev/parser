import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('filter: unseen input and rejection corpus',()=>{
 for(const source of ["price < 10 || count >= 3"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["price >"])assert.throws(()=>parse(source),SyntaxError,source);
});
