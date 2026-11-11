// Historical teaching inputs from parser/packages/authorization/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('authorization: historical teaching-input corpus',()=>{for(const source of ["Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQ","Basic dXNlcjpwYXNzd29yZA==","Bearer abc123"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
