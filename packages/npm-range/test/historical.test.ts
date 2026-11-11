// Historical teaching inputs from parser/packages/npm-range/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('npm-range: historical teaching-input corpus',()=>{for(const source of ["^1.0.0","~1.2.3",">=2.0.0",">1.0.0","<2.0.0"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
