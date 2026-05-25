import assert from 'node:assert/strict';
import test from 'node:test';
import { render, validate } from '../src/index.ts';

// Note: public `parse()` was removed in Phase 5 of the unified-render-targets
// refactor. The previous `parse(input)` call is replaced by
// `render(input, { type: 'ast' })`, which yields the object-shape AST that
// the schema declares under `.render('ast', { ... })`.

function parseAst(input: string): unknown {
  return render(input, { type: 'ast' });
}

test('url parses path and query pairs', () => {
  assert.deepEqual(parseAst('/foo/bar?q=hello&tag=one'), {
    type: 'url',
    path: ['foo', 'bar'],
    query: {
      type: 'query',
      pairs: [
        { type: 'pair', key: 'q', value: 'hello' },
        { type: 'pair', key: 'tag', value: 'one' },
      ],
    },
  });
});

test('url parses absolute URL with host', () => {
  assert.deepEqual(parseAst('https://example.com/search'), {
    type: 'url',
    protocol: 'https',
    host: { type: 'host', parts: ['example', 'com'] },
    path: ['search'],
  });
});

test('url parses absolute URL with localhost port', () => {
  assert.deepEqual(parseAst('https://localhost:8888/search'), {
    type: 'url',
    protocol: 'https',
    host: { type: 'host', parts: ['localhost'], port: '8888' },
    path: ['search'],
  });
});

test('url rejects unsupported characters', () => {
  assert.throws(() => validate('/foo {bad}'), SyntaxError);
});

test('url rejects malformed separators and trailing tokens', () => {
  assert.throws(() => validate('https:/example.com/search'), SyntaxError);
  assert.throws(() => validate('https://example.com/search?'), SyntaxError);
  assert.throws(() => validate('/foo/bar?=missing'), SyntaxError);
  assert.throws(() => validate('/foo/bar#frag'), SyntaxError);
});
