// Historical teaching inputs from parser/packages/commits/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('commits: historical teaching-input corpus',()=>{for(const source of ["feat: add new feature","fix: resolve bug","docs: update README","chore: bump dependencies"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
