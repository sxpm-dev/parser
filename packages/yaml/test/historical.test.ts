// Historical teaching inputs from parser/packages/yaml/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('yaml: historical teaching-input corpus',()=>{for(const source of ["title: Hello\npublished: true\ncount: 12\n","---\ntitle: Launch Notes\ntags: [parser, dx]\ndraft: false\n---\nBody text\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
