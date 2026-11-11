import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('commits: unseen input and rejection corpus',()=>{
 for(const source of ["fix(api)!: reject stale tokens", "docs: explain setup"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["missing colon"])assert.throws(()=>parse(source),SyntaxError,source);
});
