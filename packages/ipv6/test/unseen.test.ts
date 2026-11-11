import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('ipv6: unseen input and rejection corpus',()=>{
 for(const source of ["::1", "2001:db8::42", "::"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["1:2:3:4:5:6:7:8:9", "2001:::1"])assert.throws(()=>parse(source),SyntaxError,source);
});
