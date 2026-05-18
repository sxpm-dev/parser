import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, stringify, tokenize } from '../src/index.ts';

test('tokenizes basic JavaScript', () => {
  assert.deepEqual(
    tokenize('const answer = 42;').map((token) => [token.type, token.value]),
    [
      ['ident', 'const'],
      ['whitespace', ' '],
      ['ident', 'answer'],
      ['whitespace', ' '],
      ['punct', '='],
      ['whitespace', ' '],
      ['number', '42'],
      ['punct', ';'],
    ],
  );
});

test('parses and stringifies a program shell', () => {
  const input = 'const answer = 42;';
  const ast = parse(input);
  assert.equal(ast.type, 'Program');
  assert.equal(ast.tokens.length, 8);
  assert.equal(stringify(ast), input);
});
