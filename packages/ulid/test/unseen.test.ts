import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('ulid: unseen input and rejection corpus',()=>{
 for(const source of ["01H3K5N9P2R4T6V8X1Y3Z5W7M9"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["81H3K5N9P2R4T6V8X1Y3Z5W7M9", "short"])assert.throws(()=>parse(source),SyntaxError,source);
});
