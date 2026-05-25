import assert from 'node:assert/strict';
import test from 'node:test';
import { render, validate } from '../src/index.ts';

// Note: public `parse()` was removed in Phase 5 of the unified-render-targets
// refactor. The previous `parse(input)` call is replaced by
// `render(input, { type: 'ast' })`, which yields the object-shape AST that
// the schema declares under `.render('ast', { ... })`.

function parseAst(input: string): unknown {
  return render(input, { type: 'ast' });
}

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
      // Phase 6 css-color migration: rgb / rgba productions now emit the
      // distinct `rgb-color-function` type literal (previously shared the
      // generic `color-function` literal with non-RGB color functions) and
      // also carry the parsed `args` array — required so round-trip
      // stringify can rebuild the source, and to discriminate per
      // production inverse.
      input: 'rgb(255 0 0 / 1)',
      expected: {
        type: 'css-color',
        value: {
          type: 'rgb-color-function',
          name: 'rgb',
          args: [
            { type: 'number', value: '255' },
            { type: 'number', value: '0' },
            { type: 'number', value: '0' },
            { type: 'separator', value: '/' },
            { type: 'number', value: '1' },
          ],
        },
      },
    },
    {
      input: 'rgba(255, 0, 0)',
      expected: {
        type: 'css-color',
        value: {
          type: 'rgb-color-function',
          name: 'rgba',
          args: [
            { type: 'number', value: '255' },
            { type: 'separator', value: ',' },
            { type: 'number', value: '0' },
            { type: 'separator', value: ',' },
            { type: 'number', value: '0' },
          ],
        },
      },
    },
    {
      input: 'oklch(60% 0.2 30)',
      expected: {
        type: 'css-color',
        value: {
          type: 'color-function',
          name: 'oklch',
          args: [
            { type: 'percentage', value: '60' },
            { type: 'number', value: '0.2' },
            { type: 'number', value: '30' },
          ],
        },
      },
    },
    {
      // The previously-distinct color() production was merged into the single
      // non-RGB ColorFunction production (it was functionally identical).
      input: 'color(display-p3 1 0 0)',
      expected: {
        type: 'css-color',
        value: {
          type: 'color-function',
          name: 'color',
          args: [
            { type: 'ident', value: 'display-p3' },
            { type: 'number', value: '1' },
            { type: 'number', value: '0' },
            { type: 'number', value: '0' },
          ],
        },
      },
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
    assert.deepEqual(parseAst(input), expected, input);
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
