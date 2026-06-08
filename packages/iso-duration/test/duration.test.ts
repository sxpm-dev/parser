import test from 'node:test';
import assert from 'node:assert/strict';
import { render, stringify, validate } from '../src/index.ts';
import { render as renderRaws } from '../src/_generated/parser.ts';

// Strip auto-attached `source` metadata so structural asserts stay terse.
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

test('parses date-only durations', () => {
  assert.deepEqual(ast('P1Y'), {
    type: 'duration',
    date: [{ type: 'years', value: '1' }],
  });
  assert.deepEqual(ast('P3D'), {
    type: 'duration',
    date: [{ type: 'days', value: '3' }],
  });
  assert.deepEqual(ast('P2W'), {
    type: 'duration',
    date: [{ type: 'weeks', value: '2' }],
  });
});

test('parses multi-unit date durations', () => {
  assert.deepEqual(ast('P1Y2M3D'), {
    type: 'duration',
    date: [
      { type: 'years', value: '1' },
      { type: 'months', value: '2' },
      { type: 'days', value: '3' },
    ],
  });
});

test('parses time-only durations', () => {
  assert.deepEqual(ast('PT1H'), {
    type: 'duration',
    date: [],
    time: [{ type: 'hours', value: '1' }],
  });
  assert.deepEqual(ast('PT30M'), {
    type: 'duration',
    date: [],
    time: [{ type: 'minutes', value: '30' }],
  });
  assert.deepEqual(ast('PT45S'), {
    type: 'duration',
    date: [],
    time: [{ type: 'seconds', value: '45' }],
  });
});

test('parses combined date + time durations', () => {
  assert.deepEqual(ast('P1DT1H'), {
    type: 'duration',
    date: [{ type: 'days', value: '1' }],
    time: [{ type: 'hours', value: '1' }],
  });
  assert.deepEqual(ast('P1Y2M3DT4H5M6S'), {
    type: 'duration',
    date: [
      { type: 'years', value: '1' },
      { type: 'months', value: '2' },
      { type: 'days', value: '3' },
    ],
    time: [
      { type: 'hours', value: '4' },
      { type: 'minutes', value: '5' },
      { type: 'seconds', value: '6' },
    ],
  });
});

test('`M` is months on the date side and minutes on the time side', () => {
  // P1M vs PT1M — same letter, different meaning, resolved by the T split.
  assert.deepEqual(ast('P1M'), {
    type: 'duration',
    date: [{ type: 'months', value: '1' }],
  });
  assert.deepEqual(ast('PT1M'), {
    type: 'duration',
    date: [],
    time: [{ type: 'minutes', value: '1' }],
  });
  // P1MT1M — months AND minutes in the same duration.
  assert.deepEqual(ast('P1MT1M'), {
    type: 'duration',
    date: [{ type: 'months', value: '1' }],
    time: [{ type: 'minutes', value: '1' }],
  });
});

test('source target renders a textual ISO 8601 form', () => {
  // Single-unit inputs round-trip byte-for-byte through the source target.
  assert.equal(source('P1Y'), 'P1Y');
  assert.equal(source('PT1H'), 'PT1H');
  assert.equal(source('P1DT1H'), 'P1DT1H');
  // Multi-unit inputs render the same units in declaration order. The
  // rebuild emits a single space between units (compiler default join);
  // ISO 8601 doesn't allow spaces inside a duration, so this is a
  // value-stable canonicalization, not byte-stable.
  assert.equal(source('P1Y2M3D'), 'P1Y 2M 3D');
});

test('stringify(ast) reconstructs a value-stable source string', () => {
  // Stringify takes an ast value and rebuilds source via the inverse
  // derived from the schema's ast render body.
  const value = render('P1Y', { target: 'ast' });
  assert.equal(stringify(value, { target: 'ast' }), 'P1Y');

  const tValue = render('PT1H', { target: 'ast' });
  assert.equal(stringify(tValue, { target: 'ast' }), 'PT1H');

  const dtValue = render('P1DT1H', { target: 'ast' });
  assert.equal(stringify(dtValue, { target: 'ast' }), 'P1DT1H');
});

test('raws-mode round-trip is byte-exact for multi-unit durations', () => {
  // iso-duration uses `.repeats()` without a `sep` (the interp loops
  // on zero-length sep sweeps). Standard whitespace policy means the
  // fast-mode canonical formatter inserts a single space between
  // adjacent unit children, so 'P1Y2M3D' round-trips as 'P1Y 2M 3D'
  // through fast stringify (the source/target tests above confirm
  // this is the value-stable contract).
  //
  // Raws mode captures the actual inter-item bytes into a per-span
  // `<name>_iws` array stashed on the AST's `.raws` sidecar; stringify
  // reads them back and produces byte-exact output. This was the
  // missing piece for grammars that can't use `sep: ''`.
  for (const input of ['P1Y2M3D', 'P1Y2M3DT4H5M6S', 'PT1H2M3S', 'P1DT1H']) {
    const ast = renderRaws(input, { target: 'ast', mode: 'raws' });
    const out = stringify(ast, { target: 'ast' });
    assert.equal(out, input, `raws-mode round-trip lost trivia for ${JSON.stringify(input)}`);
  }
});

test('validate accepts well-formed durations and rejects malformed ones', () => {
  assert.doesNotThrow(() => validate('P1Y'));
  assert.doesNotThrow(() => validate('PT1H'));
  assert.doesNotThrow(() => validate('P1DT1H'));
  assert.throws(() => validate('1Y'));       // missing leading P
  assert.throws(() => validate('PT'));       // empty time portion
  assert.throws(() => validate('PXYZ'));     // unknown letters
});
