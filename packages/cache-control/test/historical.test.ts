// Historical teaching inputs from parser/packages/cache-control/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('cache-control: historical teaching-input corpus',()=>{for(const source of ["no-cache","public","private","no-store","max-age=3600","s-maxage=86400","must-revalidate","immutable"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
