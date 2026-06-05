import assert from 'node:assert/strict';
import test from 'node:test';
import { $, dynKey, isDynKey, isMerge, merge } from '../src/index.ts';

test('dynKey produces a tagged object with the key ref + value body', () => {
  const body = dynKey($.selector, $.nodes);
  assert.equal(isDynKey(body), true);
  assert.equal((body as { __dynKey: true }).__dynKey, true);
  assert.equal((body as { key: { name: string } }).key.name, 'selector');
});

test('merge produces a tagged object with the array ref', () => {
  const body = merge($.nodes);
  assert.equal(isMerge(body), true);
  assert.equal((body as { __merge: true }).__merge, true);
  assert.equal((body as { array: { name: string } }).array.name, 'nodes');
});

test('isDynKey rejects plain objects, refs, and null', () => {
  assert.equal(isDynKey({ type: 'x' }), false);
  assert.equal(isDynKey($.name), false);
  assert.equal(isDynKey(null), false);
  assert.equal(isDynKey(undefined), false);
});

test('isMerge rejects plain objects, refs, and null', () => {
  assert.equal(isMerge({}), false);
  assert.equal(isMerge($.x), false);
  assert.equal(isMerge(null), false);
  assert.equal(isMerge(undefined), false);
});
