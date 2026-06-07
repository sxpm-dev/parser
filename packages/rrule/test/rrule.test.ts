import test from 'node:test';
import assert from 'node:assert/strict';
import { render, stringify, validate } from '../src/index.ts';

function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'source') continue;
      out[k] = strip(v);
    }
    return out;
  }
  return value;
}

const ast = (input: string) => strip(render(input, { target: 'ast' }));
const source = (input: string) => render(input, { target: 'source' });

test('parses a daily frequency rule', () => {
  assert.deepEqual(ast('FREQ=DAILY'), {
    type: 'rule',
    parts: [{ type: 'freq', value: 'DAILY' }],
  });
});

test('parses every supported FREQ value', () => {
  for (const freq of ['SECONDLY', 'MINUTELY', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']) {
    const value = ast(`FREQ=${freq}`) as { parts: Array<{ value: string }> };
    assert.equal(value.parts[0]!.value, freq);
  }
});

test('parses FREQ + COUNT + INTERVAL', () => {
  assert.deepEqual(ast('FREQ=DAILY;COUNT=10;INTERVAL=2'), {
    type: 'rule',
    parts: [
      { type: 'freq', value: 'DAILY' },
      { type: 'count', value: '10' },
      { type: 'interval', value: '2' },
    ],
  });
});

test('parses FREQ=WEEKLY with single-day BYDAY', () => {
  assert.deepEqual(ast('FREQ=WEEKLY;BYDAY=MO'), {
    type: 'rule',
    parts: [
      { type: 'freq', value: 'WEEKLY' },
      { type: 'byday', days: ['MO'] },
    ],
  });
});

test('parses FREQ=WEEKLY with multi-day BYDAY', () => {
  assert.deepEqual(ast('FREQ=WEEKLY;BYDAY=MO,WE,FR'), {
    type: 'rule',
    parts: [
      { type: 'freq', value: 'WEEKLY' },
      { type: 'byday', days: ['MO', 'WE', 'FR'] },
    ],
  });
});

test('parses BYMONTH and BYMONTHDAY without prefix collision', () => {
  // BYMONTHDAY is a longer prefix than BYMONTH; the dispatcher must
  // route correctly by longest-match.
  assert.deepEqual(ast('FREQ=MONTHLY;BYMONTHDAY=1,15'), {
    type: 'rule',
    parts: [
      { type: 'freq', value: 'MONTHLY' },
      { type: 'bymonthday', days: ['1', '15'] },
    ],
  });
  assert.deepEqual(ast('FREQ=YEARLY;BYMONTH=6,12'), {
    type: 'rule',
    parts: [
      { type: 'freq', value: 'YEARLY' },
      { type: 'bymonth', months: ['6', '12'] },
    ],
  });
});

test('parses UNTIL with a YYYYMMDD date', () => {
  assert.deepEqual(ast('FREQ=DAILY;UNTIL=20211231'), {
    type: 'rule',
    parts: [
      { type: 'freq', value: 'DAILY' },
      { type: 'until', value: '20211231' },
    ],
  });
});

test('parses WKST and time-of-day BY parts', () => {
  assert.deepEqual(ast('FREQ=WEEKLY;WKST=MO;BYHOUR=9;BYMINUTE=0,30'), {
    type: 'rule',
    parts: [
      { type: 'freq', value: 'WEEKLY' },
      { type: 'wkst', value: 'MO' },
      { type: 'byhour', hours: ['9'] },
      { type: 'byminute', minutes: ['0', '30'] },
    ],
  });
});

test('source target renders the canonical RRULE string', () => {
  assert.equal(source('FREQ=DAILY'), 'FREQ=DAILY');
  assert.equal(source('FREQ=DAILY;COUNT=10'), 'FREQ=DAILY;COUNT=10');
  assert.equal(source('FREQ=WEEKLY;BYDAY=MO,WE,FR'), 'FREQ=WEEKLY;BYDAY=MO,WE,FR');
  assert.equal(
    source('FREQ=YEARLY;BYMONTH=6,12;BYMONTHDAY=1,15'),
    'FREQ=YEARLY;BYMONTH=6,12;BYMONTHDAY=1,15',
  );
});

test('stringify(ast) rebuilds a value-stable source string for single-part rules', () => {
  for (const input of ['FREQ=DAILY', 'FREQ=WEEKLY', 'BYDAY=MO', 'COUNT=10', 'UNTIL=20211231']) {
    const value = render(input, { target: 'ast' });
    assert.equal(stringify(value, { target: 'ast' }), input);
  }
});

test('stringify(ast) rebuilds multi-part rules — list-slot inverter splits on sep', () => {
  // Phase 2.1: the inverter now splits captured chunks on the schema-
  // declared separator (`.repeats({ sep: ';' })`) before per-element
  // dispatch, so multi-part rules round-trip without the prior
  // single-element-only restriction.
  for (const input of [
    'FREQ=DAILY;COUNT=10',
    'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    'FREQ=MONTHLY;BYMONTHDAY=1,15;COUNT=12',
    'FREQ=YEARLY;BYMONTH=6,12;BYMONTHDAY=1,15',
  ]) {
    const value = render(input, { target: 'ast' });
    assert.equal(stringify(value, { target: 'ast' }), input);
  }
});

test('validate accepts well-formed RRULE values and rejects malformed input', () => {
  assert.doesNotThrow(() => validate('FREQ=DAILY'));
  assert.doesNotThrow(() => validate('FREQ=WEEKLY;BYDAY=MO,WE,FR'));
  assert.doesNotThrow(() => validate('FREQ=MONTHLY;BYMONTHDAY=1,15;COUNT=12'));
  assert.throws(() => validate(''));                  // empty
  assert.throws(() => validate('FREQ='));             // missing value
  assert.throws(() => validate('FREQ=NEVER'));        // unknown freq token
  assert.throws(() => validate('BOGUS=1'));           // unknown part name
  assert.throws(() => validate('BYDAY=XX'));          // unknown weekday
});
