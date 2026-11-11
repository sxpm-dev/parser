// Historical teaching inputs from parser/packages/html/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('html: historical teaching-input corpus',()=>{for(const source of ["<div class=\"card\">Hello</div>","<img src=\"x.png\" alt=\"x\">","<ul><li>One</li><li>Two</li></ul>","<!--note--><br>"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
