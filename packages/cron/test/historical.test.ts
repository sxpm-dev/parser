// Historical teaching inputs from parser/packages/cron/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('cron: historical teaching-input corpus',()=>{for(const source of ["*/5 * * * *","0 9 * * 1-5 npm test"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
