// Historical teaching inputs from parser/packages/glob/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('glob: historical teaching-input corpus',()=>{for(const source of ["*.ts","*.tsx","src/**/*.ts","packages/*/src","**/*.test.ts","node_modules","dist"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
