import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('graphql: unseen input and rejection corpus',()=>{
 for(const source of ["{ user { id name } }", "query Report { title }"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}
 for(const source of ["{ user { name }", "query"])assert.throws(()=>parse(source),SyntaxError,source);
});
