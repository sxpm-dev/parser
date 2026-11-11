// Historical teaching inputs from parser/packages/cookie/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('cookie: historical teaching-input corpus',()=>{for(const source of ["session=abc123","user_id=42","lang=en-US"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
