// Historical teaching inputs from parser/packages/color/rules.ts.
import {strict as assert} from 'node:assert';
import test from 'node:test';
import {parse,stringify} from '../src/index.ts';
test('color: historical teaching-input corpus',()=>{for(const source of ["#ff00ff","rgb(255, 0, 128)","rgba(255, 0, 128, 0.5)","hsl(120 100% 50%)","hsl(120, 100%, 50%)","hsla(120, 100%, 50%, 0.8)","oklch(0.5 0.2 30)"]){const value=parse(source);assert.deepEqual(parse(stringify(value)),value,source);}});
