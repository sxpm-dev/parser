import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('uuid: unseen input and rejection corpus',()=>{
 for(const source of ["f47ac10b-58cc-4372-a567-0e02b2c3d479"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["550e8400-e29b-41d4-a716-short"])assert.throws(()=>parse(source),SyntaxError,source);
});
