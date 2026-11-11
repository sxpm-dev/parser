// Historical teaching inputs from parser/packages/mentions/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('mentions: historical teaching-input corpus',()=>{for(const source of ["@valerii","#u:123","[@valerii](Valerii)"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
