// Historical teaching inputs from parser/packages/email/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('email: historical teaching-input corpus',()=>{for(const source of ["user@example.com","first.last@sub.example.com","alice+tag@example.org","a@b.io"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
