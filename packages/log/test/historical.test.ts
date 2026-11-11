// Historical teaching inputs from parser/packages/log/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('log: historical teaching-input corpus',()=>{for(const source of ["192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] \"GET /apache_pb.gif HTTP/1.0\" 200 2326\n","2001:db8::1 - - [10/Oct/2000:13:55:36 -0700] \"POST /api/users HTTP/1.1\" 404 -\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
