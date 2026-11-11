// Historical teaching inputs from parser/packages/ipv6/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('ipv6: historical teaching-input corpus',()=>{for(const source of ["2001:0db8:85a3:0000:0000:8a2e:0370:7334","fe80:0000:0000:0000:0202:b3ff:fe1e:8329","cafe:babe:dead:beef:c0de:f00d:1234:5678"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
