import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate, type CssDecl, type CssRoot } from '../src/index.ts';

test('default parse accepts invalid property values', () => {
  const root = parse('color: q w e; width: chunky;') as CssRoot;
  assert.equal(root.nodes.length, 2);
});

test('validateProperties rejects configured color and length values', () => {
  assert.throws(() => parse('color: q w e;', { validateProperties: true }), /1 \| color: q w e;/);
  assert.throws(() => parse('.foo { color: rgba(#fff); }', { validateProperties: true }), /1 \| \.foo \{ color: rgba\(#fff\); \}/);
  assert.throws(() => parse('width: chunky;', { validateProperties: true }), /1 \| width: chunky;/);
});

test('validateProperties reports generated validator failures as regular syntax errors', () => {
  assert.throws(
    () => validate('.ffo { color: #red}', { validateProperties: true }),
    (error) => error instanceof SyntaxError
      && !error.message.includes('Invalid CSS value')
      && error.message.includes('1 | .ffo { color: #red}'),
  );
  assert.throws(() => validate('.ffo { color: rgba(aa,bb,cc) }', { validateProperties: true }), /1 \| \.ffo/);
  assert.throws(() => validate('.ffo { color: rgba($$) }', { validateProperties: true }), /1 \| \.ffo/);
});

test('validateProperties accepts configured valid values and generated validate entrypoint', () => {
  assert.doesNotThrow(() => parse('color: oklch(60% 0.2 30); width: calc(100% - 1rem);', {
    validateProperties: true,
  }));
  assert.doesNotThrow(() => validate('margin: 0 10px auto 5%;', { validateProperties: true }));
});

test('validateProperties skips custom and unconfigured properties', () => {
  assert.doesNotThrow(() => parse('--brand: q w e; display: q w e;', { validateProperties: true }));
});

test('raws mode preserves source metadata with property validation enabled', () => {
  const root = parse('a { color: red; }', { mode: 'raws', validateProperties: true }) as CssRoot;
  const rule = root.nodes[0];
  assert.equal(rule.type, 'rule');
  assert.ok(rule.source);
  const decl = rule.nodes?.[0] as CssDecl;
  assert.equal(decl.type, 'decl');
  assert.equal(decl.raws.between, ': ');
  assert.ok(decl.source);
});
