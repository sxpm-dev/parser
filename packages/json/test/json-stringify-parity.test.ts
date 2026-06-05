import test from 'node:test';
import { strict as assert } from 'node:assert';
import { stringify } from '../src/index.ts';

const VALUES: ReadonlyArray<unknown> = [
  null,
  true,
  false,
  0,
  -0,
  42,
  -42,
  3.14,
  -3.14,
  1e10,
  1.5e-3,
  '',
  ' ',
  'hello',
  'a\nb',
  'tab\there',
  'quote"inside',
  'back\\slash',
  'é',
  '/',
  [],
  {},
  [1],
  [1, 2, 3],
  ['a', 'b', 'c'],
  [true, false, null],
  [1, 'two', true, null, 3.14],
  { a: 1 },
  { name: 'alice', age: 30 },
  { on: true, off: false, none: null },
  [[1, 2], [3, 4]],
  { outer: { inner: 42 } },
  { items: [1, 2, 3] },
  [{ a: 1 }, { b: 2 }],
  { a: { b: { c: { d: 1 } } } },
  {
    name: 'my-project',
    version: '1.0.0',
    tags: ['alpha', 'beta'],
    settings: { strict: true, timeout: 30 },
  },
];

for (const v of VALUES) {
  test(`JSON.stringify parity: ${JSON.stringify(v).slice(0, 60)}`, () => {
    assert.strictEqual(stringify(v, { target: 'ast' }), JSON.stringify(v));
  });
}
