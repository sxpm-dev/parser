// Historical teaching inputs from parser/packages/env/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('env: historical teaching-input corpus',()=>{for(const source of ["NODE_ENV=production","PORT=3000","DATABASE_URL=postgres://user:pass@host/db"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
