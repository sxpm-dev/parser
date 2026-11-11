// Historical teaching inputs from parser/packages/http/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('http: historical teaching-input corpus',()=>{for(const source of ["GET /index.html HTTP/1.1\r\nHost: example.com\r\n\r\n","POST /api/items HTTP/1.1\r\nHost: example.com\r\nContent-Type: application/json\r\n\r\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
