// Historical teaching inputs from parser/packages/gitignore/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('gitignore: historical teaching-input corpus',()=>{for(const source of ["node_modules","*.log","dist/","build",".env","!important.log","/root-only","**/temp"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
