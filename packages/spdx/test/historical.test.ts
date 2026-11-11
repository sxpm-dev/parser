// Historical teaching inputs from parser/packages/spdx/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('spdx: historical teaching-input corpus',()=>{for(const source of ["MIT","Apache-2.0","GPL-3.0-or-later","BSD-3-Clause","LGPL-2.1-only","CC0-1.0"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
