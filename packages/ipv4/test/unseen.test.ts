import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('ipv4: unseen input and rejection corpus',()=>{
 for(const source of ["10.20.30.40", "255.0.1.128"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["256.1.2.3", "1.2.3", "01.2.3.4"])assert.throws(()=>parse(source),SyntaxError,source);
});
