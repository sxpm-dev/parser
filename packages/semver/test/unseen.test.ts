import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('semver: unseen input and rejection corpus',()=>{
 for(const source of ["10.20.30-beta.2+build.7", "0.0.1"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["01.2.3", "1.2", "1.2.3-"])assert.throws(()=>parse(source),SyntaxError,source);
});
