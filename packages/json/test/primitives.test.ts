import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render, stringify } from '../src/index.ts';

test('JsonNull: render parses literal null', () => {
  assert.equal(render('null', { target: 'ast' }), null);
});

test('JsonNull: stringify emits "null"', () => {
  assert.equal(stringify(null, { target: 'ast' }), 'null');
});

test('JsonTrue: render parses literal true', () => {
  assert.equal(render('true', { target: 'ast' }), true);
});

test('JsonTrue: stringify emits "true"', () => {
  assert.equal(stringify(true, { target: 'ast' }), 'true');
});

test('JsonFalse: render parses literal false', () => {
  assert.equal(render('false', { target: 'ast' }), false);
});

test('JsonFalse: stringify emits "false"', () => {
  assert.equal(stringify(false, { target: 'ast' }), 'false');
});
