import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render, stringify } from '../src/index.ts';

test('JsonNull: render parses literal null', () => {
  assert.equal(render('null', { target: 'ast' }), null);
});

test('JsonNull: stringify emits "null"', () => {
  assert.equal(stringify(null, { target: 'ast' }), 'null');
});
