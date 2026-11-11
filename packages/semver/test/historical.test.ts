// Historical teaching inputs from parser/packages/semver/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('semver: historical teaching-input corpus',()=>{for(const source of ["1.2.3","1.0.0-alpha.1+build.42"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
