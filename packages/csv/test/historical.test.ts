// Historical teaching inputs from parser/packages/csv/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('csv: historical teaching-input corpus',()=>{for(const source of ["value","hello","123","a","alice_smith","\"quoted, value\""]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
