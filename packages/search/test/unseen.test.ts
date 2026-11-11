import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('search: unseen input and rejection corpus',()=>{
 for(const source of ["status:closed -label:wip \"new phrase\" backend"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["status:"])assert.throws(()=>parse(source),SyntaxError,source);
});
