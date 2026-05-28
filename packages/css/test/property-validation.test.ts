import assert from 'node:assert/strict';
import test from 'node:test';
import { render, validate } from '../src/index.ts';

// Phase 5 removed the public parse() export. The AST that used to be
// returned by parse(input) is now reachable via render(input, { target: 'ast' }).
// The { validate: true } option that triggered the property-value validator
// during parse is no longer available on render — call validate(input,
// { validate: true }) directly to exercise that codepath instead.
function parse(input: string): { readonly nodes: readonly unknown[] } {
  return render(input, { target: 'ast' }) as { readonly nodes: readonly unknown[] };
}

test('default render accepts invalid property values', () => {
  const root = parse('color: q w e; width: chunky;');
  assert.equal(root.nodes.length, 2);
});

test('validate rejects configured color and length values', () => {
  assert.throws(() => validate('color: q w e;', { validate: true }), /1 \| color: q w e;/);
  assert.throws(() => validate('.foo { color: rgba(#fff); }', { validate: true }), /1 \| \.foo \{ color: rgba\(#fff\); \}/);
  assert.throws(() => validate('width: chunky;', { validate: true }), /1 \| width: chunky;/);
});

test('validate reports generated validator failures as regular syntax errors', () => {
  assert.throws(
    () => validate('.ffo { color: #red}', { validate: true }),
    (error) => error instanceof SyntaxError
      && !error.message.includes('Invalid CSS value')
      && error.message.includes('1 | .ffo { color: #red}'),
  );
  assert.throws(() => validate('.ffo { color: rgba(aa,bb,cc) }', { validate: true }), /1 \| \.ffo/);
  assert.throws(() => validate('.ffo { color: rgba($$) }', { validate: true }), /1 \| \.ffo/);
});

test('validate accepts configured valid values and generated validate entrypoint', () => {
  assert.doesNotThrow(() => validate('color: oklch(60% 0.2 30); width: calc(100% - 1rem);', {
    validate: true,
  }));
  assert.doesNotThrow(() => validate('margin: 0 10px auto 5%;', { validate: true }));
});

test('validate skips custom and unconfigured properties', () => {
  assert.doesNotThrow(() => validate('--brand: q w e; display: q w e;', { validate: true }));
});
