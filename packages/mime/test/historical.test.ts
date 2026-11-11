// Historical teaching inputs from parser/packages/mime/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('mime: historical teaching-input corpus',()=>{for(const source of ["text/html","application/json","image/svg+xml","application/vnd.api+json"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
