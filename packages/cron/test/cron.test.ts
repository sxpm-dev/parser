import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

test('cron parses wildcard, step, value, and range fields', () => {
  assert.deepEqual(parse('*/5 * * * *'), {
    type: 'cron',
    minute: { type: 'step', step: '5' },
    hour: { type: 'wildcard' },
    dayOfMonth: { type: 'wildcard' },
    month: { type: 'wildcard' },
    dayOfWeek: { type: 'wildcard' },
    command: null,
  });
});

test('cron parses optional command words', () => {
  const ast = parse('0 9 * * 1-5 npm test');
  assert.deepEqual(ast.command, { type: 'command', words: ['npm', 'test'] });
  assert.deepEqual(ast.dayOfWeek, { type: 'range', start: '1', end: '5' });
});

test('cron rejects too few fields', () => {
  assert.throws(() => validate('* * *'), SyntaxError);
});
