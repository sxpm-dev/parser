import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('npm-range: unseen input and rejection corpus',()=>{
 for(const source of [">=1.2.0 <2.0.0 || ^3.1", "1.2.3 - 2.3.4", "*"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["^", "1.2.3 ||"])assert.throws(()=>parse(source),SyntaxError,source);
});
