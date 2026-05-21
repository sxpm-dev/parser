import assert from 'node:assert/strict';
import test from 'node:test';
import { validate } from '../src/index.ts';

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
