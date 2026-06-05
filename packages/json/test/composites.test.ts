import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render, stringify } from '../src/index.ts';

test('JsonArray: empty', () => {
  assert.deepEqual(render('[]', { target: 'ast' }), []);
  assert.equal(stringify([], { target: 'ast' }), '[]');
});

test('JsonArray: single element', () => {
  assert.deepEqual(render('[1]', { target: 'ast' }), [1]);
  assert.equal(stringify([1], { target: 'ast' }), '[1]');
});

test('JsonArray: multiple elements', () => {
  assert.deepEqual(render('[1,2,3]', { target: 'ast' }), [1, 2, 3]);
  assert.equal(stringify([1, 2, 3], { target: 'ast' }), '[1,2,3]');
});

test('JsonArray: heterogeneous', () => {
  const input = '[1,"two",true,null]';
  assert.deepEqual(render(input, { target: 'ast' }), [1, 'two', true, null]);
  assert.equal(stringify([1, 'two', true, null], { target: 'ast' }), input);
});

test('JsonArray: nested', () => {
  const input = '[[1,2],[3,4]]';
  assert.deepEqual(render(input, { target: 'ast' }), [[1, 2], [3, 4]]);
  assert.equal(stringify([[1, 2], [3, 4]], { target: 'ast' }), input);
});

test('JsonArray: whitespace tolerated', () => {
  assert.deepEqual(render('[ 1 , 2 , 3 ]', { target: 'ast' }), [1, 2, 3]);
});

test('JsonObject: empty', () => {
  assert.deepEqual(render('{}', { target: 'ast' }), {});
  assert.equal(stringify({}, { target: 'ast' }), '{}');
});

test('JsonObject: single entry', () => {
  assert.deepEqual(render('{"a":1}', { target: 'ast' }), { a: 1 });
  assert.equal(stringify({ a: 1 }, { target: 'ast' }), '{"a":1}');
});

test('JsonObject: multi-entry', () => {
  const input = '{"a":1,"b":2,"c":3}';
  assert.deepEqual(render(input, { target: 'ast' }), { a: 1, b: 2, c: 3 });
  assert.equal(stringify({ a: 1, b: 2, c: 3 }, { target: 'ast' }), input);
});

test('JsonObject: nested object', () => {
  const input = '{"outer":{"inner":1}}';
  assert.deepEqual(render(input, { target: 'ast' }), { outer: { inner: 1 } });
  assert.equal(stringify({ outer: { inner: 1 } }, { target: 'ast' }), input);
});

test('JsonObject: array value', () => {
  const input = '{"items":[1,2,3]}';
  assert.deepEqual(render(input, { target: 'ast' }), { items: [1, 2, 3] });
  assert.equal(stringify({ items: [1, 2, 3] }, { target: 'ast' }), input);
});

test('JsonObject: heterogeneous values', () => {
  const v = { s: 'str', n: 42, b: true, z: null, a: [1, 2], o: { x: 1 } };
  assert.deepEqual(render(JSON.stringify(v), { target: 'ast' }), v);
  assert.equal(stringify(v, { target: 'ast' }), JSON.stringify(v));
});

test('JsonObject: whitespace tolerated', () => {
  assert.deepEqual(render('{ "a" : 1 , "b" : 2 }', { target: 'ast' }), { a: 1, b: 2 });
});
