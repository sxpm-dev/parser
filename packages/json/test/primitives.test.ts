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

test('JsonNumber: integer', () => {
  assert.equal(render('42', { target: 'ast' }), 42);
  assert.equal(stringify(42, { target: 'ast' }), '42');
});

test('JsonNumber: negative integer', () => {
  assert.equal(render('-7', { target: 'ast' }), -7);
  assert.equal(stringify(-7, { target: 'ast' }), '-7');
});

test('JsonNumber: float', () => {
  assert.equal(render('3.14', { target: 'ast' }), 3.14);
  assert.equal(stringify(3.14, { target: 'ast' }), '3.14');
});

test('JsonNumber: scientific', () => {
  assert.equal(render('1e10', { target: 'ast' }), 1e10);
  assert.equal(stringify(1e10, { target: 'ast' }), '10000000000');
});

test('JsonNumber: float with exponent', () => {
  assert.equal(render('1.5e-3', { target: 'ast' }), 0.0015);
});

test('JsonNumber: zero', () => {
  assert.equal(render('0', { target: 'ast' }), 0);
  assert.equal(stringify(0, { target: 'ast' }), '0');
});
