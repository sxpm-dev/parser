import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('spdx: unseen input and rejection corpus',()=>{
 for(const source of ["MIT AND (Apache-2.0 OR BSD-3-Clause)", "GPL-2.0-only WITH Classpath-exception-2.0"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["MIT OR", "(MIT"])assert.throws(()=>parse(source),SyntaxError,source);
});
