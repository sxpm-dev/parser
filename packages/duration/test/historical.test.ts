// Historical teaching inputs from parser/packages/duration/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('duration: historical teaching-input corpus',()=>{for(const source of ["30s","5m","2h","7d","500"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
