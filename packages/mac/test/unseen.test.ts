import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('mac: unseen input and rejection corpus',()=>{
 for(const source of ["aa:bb:cc:dd:ee:ff", "12-34-56-78-9a-bc"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["00:11:22:33:44", "gg:11:22:33:44:55"])assert.throws(()=>parse(source),SyntaxError,source);
});
