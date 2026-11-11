import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('css-color: unseen input and rejection corpus',()=>{
 for(const source of ["#12345678", "oklch(0.5 0.2 30)"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["#12", "rgb(1"])assert.throws(()=>parse(source),SyntaxError,source);
});
