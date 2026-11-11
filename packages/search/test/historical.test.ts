// Historical teaching inputs from parser/packages/search/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('search: historical teaching-input corpus',()=>{for(const source of ["status:open assignee:me \"exact phrase\" -label:wip","bug frontend -archived"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
