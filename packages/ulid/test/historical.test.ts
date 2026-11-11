// Historical teaching inputs from parser/packages/ulid/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('ulid: historical teaching-input corpus',()=>{for(const source of ["01ARZ3NDEKTSV4RRFFQ69G5FAV","01H3K5N9P2R4T6V8X1Y3Z5W7M9","0001HW3X0H7B6QF7G5HZNZBAJB"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
