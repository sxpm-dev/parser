import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('yaml-block: unseen input and rejection corpus',()=>{
 for(const source of ["- second\n- third\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["missing colon"])assert.throws(()=>parse(source),SyntaxError,source);
});
