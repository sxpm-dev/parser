import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, parseTree, stringify, tokenize } from '../src/index.ts';

test('tokenizes JSON values', () => {
  assert.deepEqual(
    tokenize('{"a":[true,false,null,-1.25e+2]}').map((token) => [token.type, token.value]),
    [
      ['lbrace', '{'],
      ['string', '"a"'],
      ['colon', ':'],
      ['lbracket', '['],
      ['true', 'true'],
      ['comma', ','],
      ['false', 'false'],
      ['comma', ','],
      ['null', 'null'],
      ['comma', ','],
      ['number', '-1.25e+2'],
      ['rbracket', ']'],
      ['rbrace', '}'],
    ],
  );
});

test('parses JSON objects, arrays, strings, numbers, booleans, and null', () => {
  const ast = parse('{"name":"Ada","count":2,"ok":true,"items":[null,1.5]}');
  assert.equal(ast.type, 'JsonDocument');
  assert.deepEqual(ast.value, {
    name: 'Ada',
    count: 2,
    ok: true,
    items: [null, 1.5],
  });
});

test('builds a parse tree from inferred grammar rules', () => {
  const tree = parseTree('{"a":{"b":[1,true,null]}}');
  assert.equal(tree.type, 'JsonDocument');
  assert.equal(tree.children[0]?.type, 'value');
  assert.match(JSON.stringify(tree), /"type":"array"/);
});

test('handles escapes and stringifies normalized JSON', () => {
  const ast = parse('{"text":"line\\n\\u0041"}');
  assert.deepEqual(ast.value, { text: 'line\nA' });
  assert.equal(stringify(ast), '{"text":"line\\nA"}');
});

test('rejects invalid JSON', () => {
  assert.throws(() => parse('{"a":1,}'), SyntaxError);
  assert.throws(() => parse('[01]'), SyntaxError);
});
