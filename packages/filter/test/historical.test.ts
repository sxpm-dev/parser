// Historical teaching inputs from parser/packages/filter/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('filter: historical teaching-input corpus',()=>{for(const source of ["user.age >= 18 and status in (\"active\", \"trial\")","price < 10 or plan = \"trial\""]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
