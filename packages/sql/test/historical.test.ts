// Historical teaching inputs from parser/packages/sql/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('sql: historical teaching-input corpus',()=>{for(const source of ["SELECT id, name FROM users WHERE active = TRUE AND created_at >= '2024-01-01';","SELECT `user`.id FROM `user` WHERE score >= 10;"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
