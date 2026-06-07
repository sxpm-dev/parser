import test from 'node:test';
import assert from 'node:assert/strict';
import { render, stringify, validate } from '../src/index.ts';

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'source') continue;
      out[k] = strip(v);
    }
    return out;
  }
  return value;
}

const ast = (input: string) => strip(render(input, { target: 'ast' }));

test('parses a single key = string pair', () => {
  assert.deepEqual(ast('title = "hello"'), {
    type: 'document',
    items: [
      {
        type: 'pair',
        key: 'title',
        value: { type: 'string', value: '"hello"' },
      },
    ],
  });
});

test('parses integer and boolean values', () => {
  assert.deepEqual(ast('count = 42'), {
    type: 'document',
    items: [
      { type: 'pair', key: 'count', value: { type: 'integer', value: '42' } },
    ],
  });
  assert.deepEqual(ast('active = true'), {
    type: 'document',
    items: [
      { type: 'pair', key: 'active', value: { type: 'boolean', value: true } },
    ],
  });
  assert.deepEqual(ast('disabled = false'), {
    type: 'document',
    items: [
      { type: 'pair', key: 'disabled', value: { type: 'boolean', value: false } },
    ],
  });
});

test('parses multiple newline-separated pairs', () => {
  assert.deepEqual(ast('a = 1\nb = 2\nc = "three"'), {
    type: 'document',
    items: [
      { type: 'pair', key: 'a', value: { type: 'integer', value: '1' } },
      { type: 'pair', key: 'b', value: { type: 'integer', value: '2' } },
      { type: 'pair', key: 'c', value: { type: 'string', value: '"three"' } },
    ],
  });
});

test('parses a single table with its pairs', () => {
  assert.deepEqual(ast('[server]\nhost = "localhost"\nport = 8080'), {
    type: 'document',
    items: [
      {
        type: 'table',
        name: 'server',
        pairs: [
          {
            type: 'pair',
            key: 'host',
            value: { type: 'string', value: '"localhost"' },
          },
          { type: 'pair', key: 'port', value: { type: 'integer', value: '8080' } },
        ],
      },
    ],
  });
});

test('parses a document with leading pairs and multiple tables', () => {
  const input =
    'title = "App"\nversion = 1\n' +
    '[server]\nhost = "localhost"\n' +
    '[database]\nname = "main"';
  assert.deepEqual(ast(input), {
    type: 'document',
    items: [
      { type: 'pair', key: 'title', value: { type: 'string', value: '"App"' } },
      { type: 'pair', key: 'version', value: { type: 'integer', value: '1' } },
      {
        type: 'table',
        name: 'server',
        pairs: [
          {
            type: 'pair',
            key: 'host',
            value: { type: 'string', value: '"localhost"' },
          },
        ],
      },
      {
        type: 'table',
        name: 'database',
        pairs: [
          {
            type: 'pair',
            key: 'name',
            value: { type: 'string', value: '"main"' },
          },
        ],
      },
    ],
  });
});

test('stringify(ast) rebuilds a TOML source for single-pair documents', () => {
  for (const input of ['k = 1', 'k = "hello"', 'k = true', 'k = false']) {
    const value = render(input, { target: 'ast' });
    assert.equal(stringify(value, { target: 'ast' }), input);
  }
});

test('validate accepts well-formed TOML and rejects malformed input', () => {
  assert.doesNotThrow(() => validate('k = 1'));
  assert.doesNotThrow(() => validate('[t]\nk = 1'));
  assert.throws(() => validate('= 1'));        // missing key
  assert.throws(() => validate('k ='));        // missing value
  assert.throws(() => validate('[server'));    // unclosed table header
  assert.throws(() => validate('k = ?'));      // unknown value form
});
