// Historical teaching inputs from parser/packages/toml/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('toml: historical teaching-input corpus',()=>{for(const source of ["[server]","[database.connection]","host = \"localhost\"","port = 8080","debug = true"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
