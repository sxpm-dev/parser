import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify, validate } from '../src/index.ts';

// Note: public `parse()` was removed in Phase 5 of the unified-render-targets
// refactor. The previous `parse(input)` call is replaced by
// `render(input, { type: 'ast' })`, which yields the object-shape AST that
// the schema declares under `.render('ast', { ... })`.

function parseAst(input: string): unknown {
  return render(input, { type: 'ast' });
}

test('cron parses wildcard, step, value, and range fields', () => {
  assert.deepEqual(parseAst('*/5 * * * *'), {
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
  const ast = parseAst('0 9 * * 1-5 npm test') as {
    command: unknown;
    dayOfWeek: unknown;
  };
  assert.deepEqual(ast.command, { type: 'command', words: ['npm', 'test'] });
  assert.deepEqual(ast.dayOfWeek, { type: 'range', start: '1', end: '5' });
});

test('cron parses value fields without a command', () => {
  assert.deepEqual(parseAst('1 2 3 4 5'), {
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
  assert.deepEqual(parseAst('*/5 */2 7 8 1-5 npm test deploy'), {
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

test('cron stringify(render(input, ast), ast) is parse-equivalent for canonical inputs', () => {
  // Value-stable round-trip (per the spec): rendering the stringified
  // form yields the same AST. The intermediate source string is allowed
  // to normalize (e.g. trailing whitespace from the rebuild subroutine
  // when the optional `command` span is absent — a known rebuild-emit
  // limitation tracked in the unified-render-targets plan).
  for (const input of ['* * * * *', '0 0 * * *', '*/5 * * * *', '0 1-3 * * *']) {
    const ast = parseAst(input);
    const src = stringify(ast, { type: 'ast' });
    assert.deepEqual(parseAst(src), ast, input);
  }
});
