// Historical teaching inputs from parser/packages/ipv4/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('ipv4: historical teaching-input corpus',()=>{for(const source of ["192.168.1.1","10.0.0.1","255.255.255.0","127.0.0.1"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
