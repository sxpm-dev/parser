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

test('cron parses value fields without a command', () => {
  assert.deepEqual(parse('1 2 3 4 5'), {
    type: 'cron',
    minute: { type: 'value', value: '1' },
    hour: { type: 'value', value: '2' },
    dayOfMonth: { type: 'value', value: '3' },
    month: { type: 'value', value: '4' },
    dayOfWeek: { type: 'value', value: '5' },
    command: null,
  });
});

test('cron parses steps, ranges, and multi-word commands together', () => {
  assert.deepEqual(parse('*/5 */2 7 8 1-5 npm test deploy'), {
    type: 'cron',
    minute: { type: 'step', step: '5' },
    hour: { type: 'step', step: '2' },
    dayOfMonth: { type: 'value', value: '7' },
    month: { type: 'value', value: '8' },
    dayOfWeek: { type: 'range', start: '1', end: '5' },
    command: { type: 'command', words: ['npm', 'test', 'deploy'] },
  });
});

test('cron rejects too few fields', () => {
  assert.throws(() => validate('* * *'), SyntaxError);
});

test('cron rejects malformed field syntax', () => {
  assert.throws(() => validate('*/ * * * *'), SyntaxError);
  assert.throws(() => validate('1- * * * *'), SyntaxError);
  assert.throws(() => validate('* * * * @daily'), SyntaxError);
});
