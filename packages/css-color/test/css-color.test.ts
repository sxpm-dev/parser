import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

test('css color parser returns ASTs for every supported value family', () => {
  const cases = [
    {
      input: 'red',
      expected: { type: 'css-color', value: { type: 'color-keyword', value: 'red' } },
    },
    {
      input: '#00ff99',
      expected: { type: 'css-color', value: { type: 'hash-color', value: '00ff99' } },
    },
    {
      input: 'rgb(255 0 0 / 1)',
      expected: { type: 'css-color', value: { type: 'color-function', name: 'rgb' } },
    },
    {
      input: 'rgba(255, 0, 0)',
      expected: { type: 'css-color', value: { type: 'color-function', name: 'rgba' } },
    },
    {
      input: 'oklch(60% 0.2 30)',
      expected: { type: 'css-color', value: { type: 'color-function', name: 'oklch' } },
    },
    {
      input: 'color(display-p3 1 0 0)',
      expected: { type: 'css-color', value: { type: 'color-function', name: 'color' } },
    },
    {
      input: 'var(--brand-color, red)',
      expected: {
        type: 'css-color',
        value: { type: 'var-function', name: 'var', args: '--brand-color, red' },
      },
    },
  ];

  for (const { input, expected } of cases) {
    assert.deepEqual(parse(input), expected, input);
  }
});

test('css color validator accepts keywords, hex, functions, and vars', () => {
  for (const value of [
    'red',
    'aliceblue',
    'BLACK',
    'transparent',
    'currentcolor',
    'revert-layer',
    '#00ff99',
    '#00FF99',
    '#fff',
    '#ffff',
    '#ffffffff',
    'rgb(0, 0, 0)',
    'rgb(0 0 0 / 50%)',
    'rgb(255 0 0 / 1)',
    'rgba(255, 0, 0)',
    'hsla(120, 100%, 50%, 0.5)',
    'hsl(120 100% 50%)',
    'hwb(90 10% 10%)',
    'lab(50% 20 30)',
    'lch(50% 40 120)',
    'oklab(60% 0.1 0.2)',
    'oklch(60% 0.2 30)',
    'color(display-p3 1 0 0)',
    'color-mix(in srgb, red 30%, blue)',
    'light-dark(white, black)',
    'var(--brand-color, red)',
  ]) {
    assert.doesNotThrow(() => validate(value));
  }
});

test('css color validator rejects non-colors', () => {
  assert.throws(() => validate('q w e'), SyntaxError);
  assert.throws(() => validate('10px'), SyntaxError);
  assert.throws(() => validate('rgba(#fff)'), SyntaxError);
  assert.throws(() => validate('rgba(aa,bb,cc)'), SyntaxError);
  assert.throws(() => validate('rgba($$)'), SyntaxError);
  assert.throws(() => validate('rgb()'), SyntaxError);
  assert.throws(() => validate('rgb(red blue green)'), SyntaxError);
  assert.throws(() => validate('rgb(255 0 0'), SyntaxError);
  assert.throws(() => validate('unknown-color(1 2 3)'), SyntaxError);
  assert.throws(() => validate('url(#fff)'), SyntaxError);
  assert.throws(() => validate('var(--brand-color, )'), SyntaxError);
  assert.throws(() => validate('#*($_#@'), SyntaxError);
  assert.throws(() => validate('fdsawq'), SyntaxError);
  assert.throws(() => validate('rweqqqqq'), SyntaxError);
  assert.throws(() => validate('@red'), SyntaxError);
  assert.throws(() => validate('$red'), SyntaxError);
  assert.throws(() => validate('red blue'), SyntaxError);
  assert.throws(() => validate('red,'), SyntaxError);
  assert.throws(() => validate('rgb(#*($_#@)'), SyntaxError);
  assert.throws(() => validate('hsl(@)'), SyntaxError);
  assert.throws(() => validate('color(display-p3 #)'), SyntaxError);
  assert.throws(() => validate('#red'), SyntaxError);
  assert.throws(() => validate('#1red'), SyntaxError);
  assert.throws(() => validate('#12'), SyntaxError);
  assert.throws(() => validate('#12345'), SyntaxError);
  assert.throws(() => validate('#123456789'), SyntaxError);
});
