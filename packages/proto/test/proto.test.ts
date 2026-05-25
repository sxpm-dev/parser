import assert from 'node:assert/strict';
import test from 'node:test';
import { render, validate } from '../src/index.ts';

function parseAst(input: string): any {
  return render(input, { type: 'ast' });
}

test('proto parses syntax, package, and message declarations', () => {
  const ast = parseAst('syntax = "proto3"; package example.v1; message User { string name = 1; int32 age = 2; }');
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

test('proto parses individual declaration variants', () => {
  assert.deepEqual(parseAst('package example.v1;'), {
    type: 'proto-file',
    declarations: [{ type: 'package', name: ['example', 'v1'] }],
  });
  assert.deepEqual(parseAst('message Empty { }'), {
    type: 'proto-file',
    declarations: [{ type: 'message', name: 'Empty', fields: [] }],
  });
  assert.deepEqual(parseAst('syntax = "proto3"; message Empty { }'), {
    type: 'proto-file',
    declarations: [
      { type: 'syntax', value: '"proto3"' },
      { type: 'message', name: 'Empty', fields: [] },
    ],
  });
});

test('proto rejects unsupported characters', () => {
  assert.throws(() => validate('message # bad'), SyntaxError);
});

test('proto rejects malformed declaration boundaries', () => {
  assert.throws(() => validate('syntax = proto3;'), SyntaxError);
  assert.throws(() => validate('package example;'), SyntaxError);
  assert.throws(() => validate('message User { string name = one; }'), SyntaxError);
  assert.throws(() => validate('message User { string name = 1;'), SyntaxError);
});
