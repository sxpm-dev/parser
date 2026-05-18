import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, stringify, tokenize } from '../src/index.ts';

test('tokenizes basic JavaScript through the generated spec parser', () => {
  assert.deepEqual(
    tokenize('const answer = 42;').map((token) => [token.type, token.value]),
    [
      ['const', 'const'],
      ['name', 'answer'],
      ['=', '='],
      ['num', '42'],
      [';', ';'],
    ],
  );
});

test('parses and stringifies a module program', () => {
  const input = 'const answer = 42;';
  const ast = parse(input);
  assert.equal(ast.type, 'Program');
  assert.equal(ast.sourceType, 'module');
  assert.equal(ast.body.length, 1);
  assert.equal(ast.tokens?.length, 5);
  assert.equal(stringify(ast), input);
});

test('parses modern ECMAScript module syntax', () => {
  const input = `
    import data from './x.json' with { type: 'json' };
    using resource = open();
    await Promise.resolve(data?.items?.[0] ?? null);
    export class Box {
      #value = 1_000n;
      static count = 0;
      static { this.count ||= 1; }
      get value() { return this.#value; }
    }
  `;
  const ast = parse(input);
  assert.equal(ast.sourceType, 'module');
  assert.deepEqual(ast.body.map((node) => (node as { type: string }).type), [
    'ImportDeclaration',
    'VariableDeclaration',
    'ExpressionStatement',
    'ExportNamedDeclaration',
  ]);
});

test('falls back to script mode for script-only syntax', () => {
  const ast = parse('with (scope) { answer = value; }');
  assert.equal(ast.sourceType, 'script');
  assert.deepEqual(ast.body.map((node) => (node as { type: string }).type), ['WithStatement']);
});

test('stringifies modified ESTree-compatible programs', () => {
  const ast = parse('const answer = 42;');
  assert.equal(stringify({ ...ast, source: undefined }), `const answer = 42;
`);
});
