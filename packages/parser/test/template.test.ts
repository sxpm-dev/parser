import assert from 'node:assert/strict';
import test from 'node:test';
import { $, tpl, isTemplate } from '../src/index.ts';

test('tpl decomposes a simple template literal into parts and slots', () => {
  const t = tpl`<h${$.depth}>${$.text}</h${$.depth}>`;
  assert.equal(isTemplate(t), true);
  assert.deepEqual(t.parts, ['<h', '>', '</h', '>']);
  assert.deepEqual(t.slots, [
    { kind: 'capture', ref: 'depth' },
    { kind: 'capture', ref: 'text' },
    { kind: 'capture', ref: 'depth' },
  ]);
});

test('tpl with no interpolation produces one part and zero slots', () => {
  const t = tpl`<hr>`;
  assert.deepEqual(t.parts, ['<hr>']);
  assert.deepEqual(t.slots, []);
});

test('tpl with only a slot still emits empty string parts at both ends', () => {
  const t = tpl`${$.value}`;
  assert.deepEqual(t.parts, ['', '']);
  assert.deepEqual(t.slots, [{ kind: 'capture', ref: 'value' }]);
});

test('tpl rejects non-sentinel interpolation values at construction time', () => {
  const notSentinel = 'oops';
  assert.throws(
    () => tpl`prefix ${notSentinel} suffix`,
    /tpl: slot 0 value must be a \$\.name sentinel/,
  );
});

test('tpl rejects $.something.present (presence ref) — v1 vocabulary is value-only', () => {
  assert.throws(
    () => tpl`x ${$.flag.present}`,
    /tpl: slot 0 value must be a \$\.name sentinel \(got span-presence\)/,
  );
});

test('isTemplate is a tight type guard', () => {
  assert.equal(isTemplate({ parts: ['x'], slots: [] }), false);
  assert.equal(isTemplate(null), false);
  assert.equal(isTemplate(undefined), false);
  assert.equal(isTemplate('x'), false);
});
