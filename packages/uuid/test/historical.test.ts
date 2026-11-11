// Historical teaching inputs from parser/packages/uuid/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('uuid: historical teaching-input corpus',()=>{for(const source of ["550e8400-e29b-41d4-a716-446655440000","F47AC10B-58CC-4372-A567-0E02B2C3D479","01890d8b-7c8e-7d3c-9f12-9e3f17a2c1ab"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
