import test from 'node:test';
import { strict as assert } from 'node:assert';
import { TS_BACKEND } from '../src/emit/ts.ts';
import type { Backend } from '../src/emit/backend.ts';

test('backend: ts backend conforms to Backend interface', () => {
  const b: Backend = TS_BACKEND;
  assert.equal(b.name, 'ts');
  assert.equal(b.fileExtension, '.ts');
  assert.equal(typeof b.emit, 'function');
});
