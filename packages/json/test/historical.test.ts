// Historical teaching inputs from parser/packages/json/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('json: historical teaching-input corpus',()=>{for(const source of ["{\"name\":\"sx\",\"ok\":true,\"no\":false,\"items\":[1,2,null]}","{\"escaped\":\"a\\\"b\",\"unicode\":\"\\u0041\",\"n\":-1.5e+2}","{\"inner\":{\"k\":1},\"list\":[[true],{\"a\":null}]}","42","\"hello\"","true","false","null","[]","[1]","[1, 2]","[true]","[null]","[false]","[1, true, false, null]","[\"x\"]","{}","{\"a\":true}","{\"a\":false}","{\"a\":null}","{\"a\":\"x\"}","{\"a\":[]}","{\"a\":{}}","{\"a\":\"x\"}"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
