// Historical teaching inputs from parser/packages/ini/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('ini: historical teaching-input corpus',()=>{for(const source of ["[server]","[database]","host=localhost","port=5432","debug=true"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
