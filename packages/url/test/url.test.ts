import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

test('url parses path and query pairs', () => {
  assert.deepEqual(parse('/foo/bar?q=hello&tag=one'), {
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
  assert.deepEqual(parse('https://example.com/search'), {
    type: 'url',
    protocol: 'https',
    host: { type: 'host', parts: ['example', 'com'] },
    path: ['search'],
  });
});

test('url rejects unsupported characters', () => {
  assert.throws(() => validate('/foo {bad}'), SyntaxError);
});
