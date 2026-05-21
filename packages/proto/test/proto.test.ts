import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

test('proto parses syntax, package, and message declarations', () => {
  const ast = parse('syntax = "proto3"; package example.v1; message User { string name = 1; int32 age = 2; }');
  assert.equal(ast.type, 'proto-file');
  assert.deepEqual(ast.declarations[0], { type: 'syntax', value: '"proto3"' });
  assert.deepEqual(ast.declarations[1], { type: 'package', name: ['example', 'v1'] });
  assert.deepEqual(ast.declarations[2], {
    type: 'message',
    name: 'User',
    fields: [
      { type: 'field', fieldType: 'string', name: 'name', number: '1' },
      { type: 'field', fieldType: 'int32', name: 'age', number: '2' },
    ],
  });
});

test('proto rejects unsupported characters', () => {
  assert.throws(() => validate('message # bad'), SyntaxError);
});
