import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('glob: unseen input and rejection corpus',()=>{
 for(const source of ["lib/**/*.{js,ts}", "file[0-9]?.txt"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["bad[", "bad{"])assert.throws(()=>parse(source),SyntaxError,source);
});
