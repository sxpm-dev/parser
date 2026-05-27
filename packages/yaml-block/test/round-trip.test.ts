import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the yaml-block schema.
//
// Task 7.7b adds per-level indentCol threading to the stringify pipeline.
// Nested mappings/sequences now round-trip correctly:
//   stringify produces `bar: \n  baz: 2\n  qux: 3` (indented block on the
//   next line) which the parser accepts as a valid nested mapping.

function parseAst(input: string): unknown {
  return render(input, { type: 'ast' });
}

// Flat mapping: all values are scalars.
test('yaml-block round-trip: flat scalar mapping', () => {
  const input = 'foo: bar\nbaz: hello\nqux: world';
  const ast1 = parseAst(input);
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = parseAst(source as string);
  assert.deepEqual(ast2, ast1, `round-trip mismatch for input:\n${input}`);
});

// Single-entry mapping.
test('yaml-block round-trip: single-entry mapping', () => {
  const input = 'name: my-project';
  const ast1 = parseAst(input);
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = parseAst(source as string);
  assert.deepEqual(ast2, ast1, `round-trip mismatch for input:\n${input}`);
});

// Flat mapping with values containing hyphens and dots (requires unknownChars: tolerate).
test('yaml-block round-trip: flat mapping with special-char values', () => {
  const input = 'version: 1.0.0\nlicense: MIT\nauthor: alice-bob';
  const ast1 = parseAst(input);
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = parseAst(source as string);
  assert.deepEqual(ast2, ast1, `round-trip mismatch for input:\n${input}`);
});

// Multiple entries — verifies that '\n' join separator is stable.
test('yaml-block round-trip: five-entry mapping', () => {
  const input = 'a: one\nb: two\nc: three\nd: four\ne: five';
  const ast1 = parseAst(input);
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = parseAst(source as string);
  assert.deepEqual(ast2, ast1, `round-trip mismatch for input:\n${input}`);
});

// --- Nested round-trip tests (Task 7.7b) ------------------------------------
// Per-level indentCol threading in the stringify pipeline means nested
// mappings and sequences now round-trip correctly. The stringifier emits
// `bar: \n  baz: 2\n  qux: 3` (block starting on next indented line)
// which the parser accepts as a valid nested mapping.

// Two-level nested mapping: `bar:\n  baz: 2\n  qux: 3`.
test('yaml-block round-trip: nested mapping value', () => {
  const input = 'bar:\n  baz: 2\n  qux: 3';
  const ast1 = parseAst(input);
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = parseAst(source as string);
  assert.deepEqual(ast2, ast1, `round-trip mismatch for input:\n${input}`);
});

// Sequence value: `items:\n  - a\n  - b`.
test('yaml-block round-trip: nested sequence value', () => {
  const input = 'items:\n  - a\n  - b';
  const ast1 = parseAst(input);
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = parseAst(source as string);
  assert.deepEqual(ast2, ast1, `round-trip mismatch for input:\n${input}`);
});

// Mixed: flat entries + nested mapping + nested sequence.
test('yaml-block round-trip: mixed flat and nested', () => {
  const input = 'bar:\n  baz: 2\n  qux: 3\nitems:\n  - a\n  - b';
  const ast1 = parseAst(input);
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = parseAst(source as string);
  assert.deepEqual(ast2, ast1, `round-trip mismatch for input:\n${input}`);
});

// Three-level nesting: `outer:\n  bar:\n    baz: 2`.
test('yaml-block round-trip: three-level nested mapping', () => {
  const input = 'outer:\n  bar:\n    baz: 2';
  const ast1 = parseAst(input);
  const source = stringify(ast1, { type: 'ast' });
  const ast2 = parseAst(source as string);
  assert.deepEqual(ast2, ast1, `round-trip mismatch for input:\n${input}`);
});
