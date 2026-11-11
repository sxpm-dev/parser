// Historical teaching inputs from parser/packages/jwt/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('jwt: historical teaching-input corpus',()=>{for(const source of ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQ"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
