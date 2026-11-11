// Historical teaching inputs from parser/packages/expression/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('expression: historical teaching-input corpus',()=>{for(const source of ["sum(1, price * 2)","\"hello\" + name != title && score >= 10.5","a / 2 - b % 3 == c || d <= e"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
