import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

test('mac parses colon and hyphen separated addresses from schema output', () => {
  assert.deepEqual(parse('00:1A:2B:3C:4D:5E'), {
    type: 'mac-address',
    octets: ['00', '1A', '2B', '3C', '4D', '5E'],
    separator: ':',
  });
  assert.deepEqual(parse('DE-AD-BE-EF-CA-FE'), {
    type: 'mac-address',
    octets: ['DE', 'AD', 'BE', 'EF', 'CA', 'FE'],
    separator: '-',
  });
});

test('mac rejects malformed values through generated validation', () => {
  assert.throws(() => validate('00:1A:2B'), SyntaxError);
  assert.throws(() => validate('00:ZZ:2B:3C:4D:5E'), SyntaxError);
});
