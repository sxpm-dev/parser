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
