import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('route: unseen input and rejection corpus',()=>{
 for(const source of ["/teams/:team/*", "/"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["/bad::id"])assert.throws(()=>parse(source),SyntaxError,source);
});
