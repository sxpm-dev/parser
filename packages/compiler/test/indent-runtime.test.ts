import test from 'node:test';
import { strict as assert } from 'node:assert';
import { V2_RUNTIME } from '../src/emit/v2/runtime.ts';

test('runtime: V2_RUNTIME embeds indentStack in State', () => {
  assert.ok(V2_RUNTIME.includes('indentStack'),
    'V2_RUNTIME must declare indentStack on the State type');
});

test('runtime: V2_RUNTIME exposes columnAt helper', () => {
  assert.ok(V2_RUNTIME.includes('function columnAt'),
    'V2_RUNTIME must export columnAt(state, off)');
});

test('runtime: V2_RUNTIME exposes skipBlankLines helper', () => {
  assert.ok(V2_RUNTIME.includes('function skipBlankLines'),
    'V2_RUNTIME must export skipBlankLines(state)');
});

test('runtime: V2_RUNTIME exposes skipHorizontalWs helper', () => {
  assert.ok(V2_RUNTIME.includes('function skipHorizontalWs'),
    'V2_RUNTIME must export skipHorizontalWs(state)');
});
