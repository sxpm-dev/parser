// Historical teaching inputs from parser/packages/markdown/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('markdown: historical teaching-input corpus',()=>{for(const source of ["# Release notes\n","This has **bold**, _italic_, `code`, and [a link](https://example.com).\n","![diagram](https://example.com/diagram.png)\n","- first item\n","+ another item\n","1. ordered item\n","> quoted text\n","---\n","~~~ts\nconst value = 1;\n~~~\n"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
