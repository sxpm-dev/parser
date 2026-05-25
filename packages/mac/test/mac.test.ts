import assert from 'node:assert/strict';
import test from 'node:test';
import { render, validate } from '../src/index.ts';

test('mac parses colon and hyphen separated addresses from schema output', () => {
  assert.deepEqual(render('00:1A:2B:3C:4D:5E', { type: 'ast' }), {
    type: 'mac-address',
    octets: ['00', '1A', '2B', '3C', '4D', '5E'],
    separator: ':',
  });
  assert.deepEqual(render('DE-AD-BE-EF-CA-FE', { type: 'ast' }), {
    type: 'mac-address',
    octets: ['DE', 'AD', 'BE', 'EF', 'CA', 'FE'],
    separator: '-',
  });
});

test('mac preserves lowercase hex octets', () => {
  assert.deepEqual(render('aa:bb:cc:dd:ee:ff', { type: 'ast' }), {
    type: 'mac-address',
    octets: ['aa', 'bb', 'cc', 'dd', 'ee', 'ff'],
    separator: ':',
  });
});

test('mac rejects malformed values through generated validation', () => {
  assert.throws(() => validate('00:1A:2B'), SyntaxError);
  assert.throws(() => validate('00:ZZ:2B:3C:4D:5E'), SyntaxError);
  assert.throws(() => validate('00:1A-2B:3C:4D:5E'), SyntaxError);
  assert.throws(() => validate('001:1A:2B:3C:4D:5E'), SyntaxError);
  assert.throws(() => validate('00:1A:2B:3C:4D:5E:6F'), SyntaxError);
});
