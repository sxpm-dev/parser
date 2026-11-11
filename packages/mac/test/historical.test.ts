// Historical teaching inputs from parser/packages/mac/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('mac: historical teaching-input corpus',()=>{for(const source of ["00:1A:2B:3C:4D:5E","aa:bb:cc:dd:ee:ff","FF-FF-FF-FF-FF-FF","00-A0-C9-14-C8-29"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
