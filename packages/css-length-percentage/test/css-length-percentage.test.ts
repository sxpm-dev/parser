import assert from 'node:assert/strict';
import test from 'node:test';
import { parse, validate } from '../src/index.ts';

test('css length percentage parser returns ASTs for every supported item family', () => {
  const cases = [
    {
      input: '0',
      expected: { type: 'css-length-percentage', items: [{ type: 'zero', value: '0' }] },
    },
    {
      input: '10px',
      expected: { type: 'css-length-percentage', items: [{ type: 'dimension', value: '10', unit: 'px' }] },
    },
    {
      input: '-10px',
      expected: { type: 'css-length-percentage', items: [{ type: 'dimension', value: '-10', unit: 'px' }] },
    },
    {
      input: '50%',
      expected: { type: 'css-length-percentage', items: [{ type: 'percentage', value: '50' }] },
    },
    {
      input: '-50%',
      expected: { type: 'css-length-percentage', items: [{ type: 'percentage', value: '-50' }] },
    },
    {
      input: 'auto',
      expected: { type: 'css-length-percentage', items: [{ type: 'length-keyword', value: 'auto' }] },
    },
    {
      input: '10px 20%',
      expected: {
        type: 'css-length-percentage',
        items: [
          { type: 'dimension', value: '10', unit: 'px' },
          { type: 'percentage', value: '20' },
        ],
      },
    },
    {
      input: '1px 2px 3px 4px',
      expected: {
        type: 'css-length-percentage',
        items: [
          { type: 'dimension', value: '1', unit: 'px' },
          { type: 'dimension', value: '2', unit: 'px' },
          { type: 'dimension', value: '3', unit: 'px' },
          { type: 'dimension', value: '4', unit: 'px' },
        ],
      },
    },
    {
      input: 'calc(100% - 1rem)',
      expected: {
        type: 'css-length-percentage',
        items: [
          {
            type: 'length-function',
            name: 'calc',
            args: [
              { type: 'percentage', value: '100' },
              { type: 'operator', value: '-' },
              { type: 'dimension', value: '1', unit: 'rem' },
            ],
          },
        ],
      },
    },
    {
      input: 'var(--space, 1rem)',
      expected: {
        type: 'css-length-percentage',
        items: [{ type: 'var-function', name: 'var', args: '--space, 1rem' }],
      },
    },
  ];

  for (const { input, expected } of cases) {
    assert.deepEqual(parse(input), expected, input);
  }
});

test('css length percentage validator accepts dimensions, lists, functions, and vars', () => {
  for (const value of [
    '0',
    '10px',
    '-1.5rem',
    '-10px',
    '0PX',
    '2ch',
    '3em',
    '4vh',
    '5svw',
    '6dvh',
    '7vmin',
    '8vmax',
    '9mm',
    '10q',
    '50%',
    '12.5%',
    '-50%',
    '10px 20%',
    '1px 2px 3px 4px',
    '10px auto',
    'auto 1rem',
    'auto',
    'fit-content',
    'max-content',
    'min-content',
    'calc(100% - 1rem)',
    'min(50vw, 40rem)',
    'max(10px, 2rem)',
    'clamp(1rem, 2vw, 3rem)',
    'var(--space, 1rem)',
  ]) {
    assert.doesNotThrow(() => validate(value));
  }
});

test('css length percentage validator rejects non-length values', () => {
  assert.throws(() => validate('chunky'), SyntaxError);
  assert.throws(() => validate('red'), SyntaxError);
  assert.throws(() => validate('12'), SyntaxError);
  assert.throws(() => validate('#*($_#@'), SyntaxError);
  assert.throws(() => validate('fdsawq'), SyntaxError);
  assert.throws(() => validate('rweqqqqq'), SyntaxError);
  assert.throws(() => validate('@10px'), SyntaxError);
  assert.throws(() => validate('$10px'), SyntaxError);
  assert.throws(() => validate('#10px'), SyntaxError);
  assert.throws(() => validate('*10px'), SyntaxError);
  assert.throws(() => validate('10px #*($_#@'), SyntaxError);
  assert.throws(() => validate('-0'), SyntaxError);
  assert.throws(() => validate('10'), SyntaxError);
  assert.throws(() => validate('10 px'), SyntaxError);
  assert.throws(() => validate('10unknown'), SyntaxError);
  assert.throws(() => validate('10p x'), SyntaxError);
  assert.throws(() => validate('px10'), SyntaxError);
  assert.throws(() => validate('1px 2px 3px 4px 5px'), SyntaxError);
  assert.throws(() => validate('1px, 2px'), SyntaxError);
  assert.throws(() => validate('calc(100% - red)'), SyntaxError);
  assert.throws(() => validate('calc(100% - 1rem'), SyntaxError);
  assert.throws(() => validate('url(10px)'), SyntaxError);
  assert.throws(() => validate('var(--space, )'), SyntaxError);
});
