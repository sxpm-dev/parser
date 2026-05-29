import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render } from '../src/index.ts';

// Phase 7 follow-up #1 — forward render indent padding.
//
// `render(input, { target: 'source' })` is the captures-based forward path
// (parse → captures → re-render to source target). Before Task 7.7b's
// forward-side port, `.indent()`-modified repeats spans joined siblings
// with a literal '\n' and dropped the per-level indent prefix entirely —
// yaml-block's nested mappings/sequences rendered flat ('foo: bar: baz: 1').
//
// After the fix, the per-(production, target) builder receives an
// `__indentCol: number = 0` parameter that mirrors the inverse rebuild's
// threading (see emit/rebuild.ts and interp/stringify.ts). Indent-modified
// slots emit a dynamic per-level join (`'\n' + ' '.repeat(__indentCol)`)
// plus a leading prefix when `__indentCol > 0`, and recursive children
// receive `__indentCol + INDENT_STEP_SPACES` so deeper levels indent
// further.
//
// These cases lock the produced source string exactly. Because the same
// schema is the source of truth for both the forward render path and the
// inverse stringify path (and the round-trip tests in
// round-trip.test.ts), the assertions here AND in round-trip.test.ts
// must agree on every shared structural string.

function source(input: string): unknown {
  return render(input, { target: 'source' });
}

test('forward source: flat single-entry mapping', () => {
  assert.equal(source('foo: bar'), 'foo: bar');
});

test('forward source: two-entry top-level mapping joined with newline (no indent at column 0)', () => {
  assert.equal(source('foo: 1\nbar: 2'), 'foo: 1\nbar: 2');
});

test('forward source: nested mapping value emits indented continuation block', () => {
  const input = 'outer:\n  inner: 1';
  assert.equal(source(input), 'outer: \n  inner: 1');
});

test('forward source: two-level nested mapping indents 2/4 spaces respectively', () => {
  const input = 'a:\n  b:\n    c: 1';
  assert.equal(source(input), 'a: \n  b: \n    c: 1');
});

test('forward source: nested sequence inside mapping', () => {
  const input = 'list:\n  - one\n  - two';
  assert.equal(source(input), 'list: \n  - one\n  - two');
});

test('forward source: mixed flat entries plus nested mapping', () => {
  // Top-level: foo, bar (nested), baz. Joins with '\n' at col 0; nested
  // mapping inside `bar` emits its own continuation block at col 2.
  const input = 'foo: 1\nbar:\n  inner: 2\nbaz: 3';
  assert.equal(source(input), 'foo: 1\nbar: \n  inner: 2\nbaz: 3');
});
