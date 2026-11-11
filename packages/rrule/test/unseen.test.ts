import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('rrule: unseen input and rejection corpus',()=>{
 for(const source of ["FREQ=DAILY;INTERVAL=2;COUNT=10"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["FREQ="])assert.throws(()=>parse(source),SyntaxError,source);
});
