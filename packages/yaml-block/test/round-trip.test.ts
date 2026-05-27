import test from 'node:test';
import { strict as assert } from 'node:assert';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the yaml-block schema.
//
// The MVP indent primitive (Phase 7) joins indent-block children with '\n'
// and no leading spaces. This means nested blocks (mappings/sequences as
// values in mapping entries) lose their indentation when stringified. The
// round-trip tests therefore use:
//   1. Flat scalar mappings — all values are scalars on the same line.
//   2. Flat top-level sequences — items are scalars.
//   3. YamlNode as root (flat scalar) — verifies the ref-chain dispatch.
//
// Nested blocks (e.g. `bar:\n  baz: 2`) cannot round-trip with the current
// stringify because the rebuilt source loses indentation and re-parses to a
// different structure. That is a known Phase 7 MVP limitation documented in
// the schema header comment. A future phase would add per-level indentCol
// tracking to the stringifier.

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
