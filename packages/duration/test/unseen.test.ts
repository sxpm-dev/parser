import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('duration: unseen input and rejection corpus',()=>{
 for(const source of ["1h30m", "250ms"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["1q"])assert.throws(()=>parse(source),SyntaxError,source);
});
