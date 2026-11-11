// Historical teaching inputs from parser/packages/route/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('route: historical teaching-input corpus',()=>{for(const source of ["/users/:id/posts/*","/orgs/:org/repos/:repo"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
