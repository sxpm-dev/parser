import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('toml: unseen input and rejection corpus',()=>{
 for(const source of ["[client]\nport = 9000\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["[broken"])assert.throws(()=>parse(source),SyntaxError,source);
});
