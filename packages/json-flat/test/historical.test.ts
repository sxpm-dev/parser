// Historical teaching inputs from parser/packages/json-flat/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('json-flat: historical teaching-input corpus',()=>{for(const source of ["{\"a\":1,\"b\":\"hi\",\"c\":true,\"d\":false,\"e\":null}","{\"x\":{\"k\":1},\"y\":[1,2,3]}"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
