import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, render, stringify, validate } from '../src/index.ts';

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

test('cron render(input) round-trips to source for canonical inputs', () => {
  const cases = ['* * * * *', '0 0 * * *', '*/5 * * * *', '0 1-3 * * *'];
  for (const input of cases) {
    assert.equal(render(input), input, input);
  }
});

test('cron stringify(parse(input)) === input for canonical inputs', () => {
  const input = '* * * * *';
  assert.equal(stringify(parse(input)), input);
});

test('cron render === stringify ∘ parse parity', () => {
  for (const input of ['* * * * *', '0 0 * * *', '*/5 * * * *']) {
    assert.equal(render(input), stringify(parse(input)), input);
  }
});
