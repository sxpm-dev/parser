import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('iso-duration: unseen input and rejection corpus',()=>{
 for(const source of ["P1Y2M3DT4H5M6S", "PT30M", "P2W"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["P", "PT", "P2Q"])assert.throws(()=>parse(source),SyntaxError,source);
});
