import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('yaml: unseen input and rejection corpus',()=>{
 for(const source of ["title: World\ncount: 42\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["missing colon"])assert.throws(()=>parse(source),SyntaxError,source);
});
