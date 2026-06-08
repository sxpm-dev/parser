import test from 'node:test';
import assert from 'node:assert/strict';
import { render, stringify, validate } from '../src/index.ts';
import { render as renderRaws } from '../src/_generated/parser.ts';

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
const source = (input: string) => render(input, { target: 'source' });

test('parses SELECT * FROM table', () => {
  assert.deepEqual(ast('SELECT * FROM users'), {
    type: 'select',
    columns: [{ type: 'wildcard' }],
    table: 'users',
  });
});

test('parses SELECT with explicit column list', () => {
  assert.deepEqual(ast('SELECT id, name, email FROM users'), {
    type: 'select',
    columns: [
      { type: 'column', name: 'id' },
      { type: 'column', name: 'name' },
      { type: 'column', name: 'email' },
    ],
    table: 'users',
  });
});

test('parses SELECT with a WHERE predicate', () => {
  assert.deepEqual(ast('SELECT name FROM users WHERE id = 42'), {
    type: 'select',
    columns: [{ type: 'column', name: 'name' }],
    table: 'users',
    where: {
      type: 'predicate',
      col: { type: 'column', name: 'id' },
      op: '=',
      val: { type: 'number', value: '42' },
    },
  });
});

test('handles every comparison operator', () => {
  const ops = ['=', '!=', '<', '>', '<=', '>='];
  for (const op of ops) {
    const value = ast(`SELECT * FROM t WHERE x ${op} 1`) as {
      where: { op: string };
    };
    assert.equal(value.where.op, op, `expected op ${op}`);
  }
});

test('multi-char operators win longest-match (`<=` is not parsed as `<` then `=`)', () => {
  const lt = ast('SELECT * FROM t WHERE x < 1') as { where: { op: string } };
  const le = ast('SELECT * FROM t WHERE x <= 1') as { where: { op: string } };
  const gt = ast('SELECT * FROM t WHERE x > 1') as { where: { op: string } };
  const ge = ast('SELECT * FROM t WHERE x >= 1') as { where: { op: string } };
  assert.equal(lt.where.op, '<');
  assert.equal(le.where.op, '<=');
  assert.equal(gt.where.op, '>');
  assert.equal(ge.where.op, '>=');
});

test('parses string literals in WHERE predicates', () => {
  assert.deepEqual(ast("SELECT * FROM users WHERE name = 'alice'"), {
    type: 'select',
    columns: [{ type: 'wildcard' }],
    table: 'users',
    where: {
      type: 'predicate',
      col: { type: 'column', name: 'name' },
      op: '=',
      val: { type: 'string', value: "'alice'" },
    },
  });
});

test('parses SELECT with LIMIT', () => {
  assert.deepEqual(ast('SELECT * FROM users LIMIT 25'), {
    type: 'select',
    columns: [{ type: 'wildcard' }],
    table: 'users',
    limit: '25',
  });
});

test('parses SELECT with WHERE and LIMIT together', () => {
  assert.deepEqual(ast('SELECT id FROM users WHERE active = 1 LIMIT 10'), {
    type: 'select',
    columns: [{ type: 'column', name: 'id' }],
    table: 'users',
    where: {
      type: 'predicate',
      col: { type: 'column', name: 'active' },
      op: '=',
      val: { type: 'number', value: '1' },
    },
    limit: '10',
  });
});

test('source target renders the canonical SELECT string', () => {
  assert.equal(source('SELECT * FROM users'), 'SELECT * FROM users');
  assert.equal(source('SELECT name FROM users'), 'SELECT name FROM users');
  assert.equal(
    source('SELECT * FROM users WHERE id = 42'),
    'SELECT * FROM users WHERE id = 42',
  );
  assert.equal(
    source('SELECT * FROM users LIMIT 10'),
    'SELECT * FROM users LIMIT 10',
  );
  assert.equal(
    source('SELECT name FROM users WHERE id = 42 LIMIT 10'),
    'SELECT name FROM users WHERE id = 42 LIMIT 10',
  );
});

test('stringify(ast) rebuilds a SELECT for single-column ASTs', () => {
  for (const input of [
    'SELECT * FROM users',
    'SELECT * FROM users WHERE name = 42',
    'SELECT * FROM users LIMIT 10',
    'SELECT * FROM users WHERE name = 42 LIMIT 10',
  ]) {
    const value = render(input, { target: 'ast' });
    assert.equal(stringify(value, { target: 'ast' }), input);
  }
});

test('raws-mode round-trip preserves inter-prefix-span trivia byte-exactly', () => {
  // pg-select's Select node routes through the prefix-share dispatcher
  // (shared `[SELECT, columns, FROM, table]` prefix across the four
  // WHERE/LIMIT alts). Before roadmap leftover #2, the dispatcher
  // emitted those inter-prefix-span ws-skips without capturing the
  // bytes, so 'SELECT  *  FROM  users' lost its multi-space gaps in
  // raws mode. After: __ws is allocated in the dispatcher, partially
  // filled across the prefix, threaded into the alt tail by parameter,
  // and the tail extends it for suffix gaps.
  for (const input of [
    'SELECT * FROM users',
    'SELECT  *  FROM  users',
    'SELECT\t*\tFROM\tusers',
    'SELECT * FROM users WHERE id = 42',
    'SELECT  *  FROM  users  WHERE  id  =  42',
    'SELECT * FROM users LIMIT 10',
    'SELECT * FROM users WHERE id = 42 LIMIT 10',
  ]) {
    const value = renderRaws(input, { target: 'ast', mode: 'raws' });
    assert.equal(stringify(value, { target: 'ast' }), input, `raws round-trip lost trivia for ${JSON.stringify(input)}`);
  }
});

test('validate accepts well-formed SELECT and rejects malformed input', () => {
  assert.doesNotThrow(() => validate('SELECT * FROM users'));
  assert.doesNotThrow(() => validate('SELECT id, name FROM users WHERE active = 1'));
  assert.doesNotThrow(() => validate('SELECT * FROM users LIMIT 10'));
  assert.throws(() => validate(''));                          // empty
  assert.throws(() => validate('SELECT'));                    // missing FROM
  assert.throws(() => validate('SELECT * users'));            // missing FROM keyword
  assert.throws(() => validate('SELECT FROM users'));         // empty column list
  assert.throws(() => validate('FROM users SELECT *'));       // reversed order
  assert.throws(() => validate('SELECT * FROM users WHERE')); // empty predicate
});
