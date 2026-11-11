import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('gitignore: unseen input and rejection corpus',()=>{
 for(const source of ["build/\n!keep.log\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["!"])assert.throws(()=>parse(source),SyntaxError,source);
});
