import { $, defineSchema, ex } from '@parser2/parser';

const COLOR_KEYWORDS = [
  'aliceblue',
  'black',
  'blue',
  'currentcolor',
  'green',
  'inherit',
  'initial',
  'red',
  'revert',
  'revert-layer',
  'transparent',
  'unset',
  'white',
  'yellow',
] as const;

const COLOR_FUNCTIONS = [
  'color',
  'color-mix',
  'hsl',
  'hsla',
  'hwb',
  'lab',
  'lch',
  'light-dark',
  'oklab',
  'oklch',
  'rgb',
  'rgba',
] as const;

const RGB_FUNCTIONS = ['rgb', 'rgba'] as const;
const NON_RGB_COLOR_FUNCTIONS = COLOR_FUNCTIONS.filter((name) => name !== 'rgb' && name !== 'rgba');

// Phase 6 migration to the unified .render API.
//
// Changes from the previous .structure-based schema:
//
// 1. Distinct AST `type` per production. Phase 4's inverse-derivation
//    precondition 2 rejects multiple productions of the same node type that
//    emit identical AST shapes. The previous schema had three productions
//    emitting `{ type: 'color-function', name: $.name }` (RgbColorFunction +
//    two ColorFunction productions). They now carry distinct literals:
//      - RgbColorFunction       → 'rgb-color-function'
//      - ColorFunction (merged) → 'color-function'
//    Both also gained an `args` field. The previous AST dropped the
//    parsed argument list entirely; round-trip stringify cannot rebuild
//    `rgb(255 0 0 / 1)` from `{ name: 'rgb' }` alone (the args are needed
//    to reconstruct the source). The args are captured as an array of
//    ColorFunctionToken / NumericColorFunctionToken nodes.
//
// 2. ColorFunction merged from two productions to one. The previous schema
//    declared a second `ColorFunction` for `color(display-p3 ...)`, but it
//    was functionally identical to the oklch production (same `name` oneOf
//    NON_RGB_COLOR_FUNCTIONS, same `args` role ColorFunctionToken). The
//    ColorFunctionToken role already covers idents/strings, so the merged
//    production accepts `color(display-p3 1 0 0)` without a second example.
//
// 3. Sibling productions consolidated under one CssColorValue node type
//    (mirrors css-length-percentage's LengthPercentageItem). The v1
//    inverse only supports single-role recursive captures, so the
//    CssColor wrapper now references a single child role whose productions
//    are dispatched on the distinct `type` literals introduced in (1).
//
// THIS IS A BREAKING CHANGE for the css-color public AST. Downstream
// consumers that branched on `type === 'color-function'` for RGB inputs
// must update to also match `'rgb-color-function'`.
//
// No `source` target is declared. ColorFunctionToken has bare-slot
// productions (number / ident / string all render as `${$.value}` with
// no distinguishing literal segment); the v1 source-template inverse
// discriminator cannot tell them apart from source alone. The same
// constraint applies to NumericColorFunctionToken's `255` production.
// `css-length-percentage` (which shares the same structural pattern) is
// also AST-only; css-color follows that precedent.

export default defineSchema({
  rootType: 'CssColor',
  punctuators: {
    hash: '#',
    lparen: '(',
    rparen: ')',
    delim: ['%', ',', '/'],
  },
  tokens: ['number', 'string'],
  examples: [
    ex('red')
      .as('CssColorValue')
      .span('value', 'red').ident().css().oneOf(COLOR_KEYWORDS)
      .render('ast', { type: 'color-keyword', value: $.value })
      .build(),

    ex('#00ff99')
      .as('CssColorValue')
      .span('#').noWhitespaceAfter()
      .span('value', '00ff99').hex()
      .render('ast', { type: 'hash-color', value: $.value })
      .build(),

    ex('rgb(255 0 0 / 1)')
      .as('CssColorValue')
      .span('name', 'rgb').ident().css().oneOf(RGB_FUNCTIONS)
      .span('(')
      .span('args', '255', 'NumericColorFunctionToken').repeats({ min: 1 })
      .span(')')
      .render('ast', { type: 'rgb-color-function', name: $.name, args: $.args })
      .build(),

    ex('oklch(60% 0.2 30)')
      .as('CssColorValue')
      .span('name', 'oklch').ident().css().oneOf(NON_RGB_COLOR_FUNCTIONS)
      .span('(')
      .span('args', '60%', 'ColorFunctionToken').repeats({ min: 1 })
      .span(')')
      .render('ast', { type: 'color-function', name: $.name, args: $.args })
      .build(),

    ex('var(--brand-color, red)')
      .as('CssColorValue')
      .span('name', 'var').ident().css().oneOf(['var'])
      .span('(')
      .span('args', '--brand-color, red').until(')', { rejectSuffix: ',' })
      .span(')')
      .render('ast', { type: 'var-function', name: $.name, args: $.args })
      .build(),

    ex('60%')
      .as('NumericColorFunctionToken')
      .span('value', '60').number().float().noWhitespaceAfter()
      .span('%')
      .render('ast', { type: 'percentage', value: $.value })
      .build(),

    ex('255')
      .as('NumericColorFunctionToken')
      .span('value', '255').number().float()
      .render('ast', { type: 'number', value: $.value })
      .build(),

    ex('/')
      .as('NumericColorFunctionToken')
      .span('/')
      .render('ast', { type: 'separator', value: '/' })
      .build(),

    ex(',')
      .as('NumericColorFunctionToken')
      .span(',')
      .render('ast', { type: 'separator', value: ',' })
      .build(),

    ex('60%')
      .as('ColorFunctionToken')
      .span('value', '60').number().float().noWhitespaceAfter()
      .span('%')
      .render('ast', { type: 'percentage', value: $.value })
      .build(),

    ex('255')
      .as('ColorFunctionToken')
      .span('value', '255').number().float()
      .render('ast', { type: 'number', value: $.value })
      .build(),

    ex('display-p3')
      .as('ColorFunctionToken')
      .span('value', 'display-p3').ident().css()
      .render('ast', { type: 'ident', value: $.value })
      .build(),

    ex('"srgb"')
      .as('ColorFunctionToken')
      .span('value', '"srgb"').string()
      .render('ast', { type: 'string', value: $.value })
      .build(),

    ex('/')
      .as('ColorFunctionToken')
      .span('/')
      .render('ast', { type: 'separator', value: '/' })
      .build(),

    ex(',')
      .as('ColorFunctionToken')
      .span(',')
      .render('ast', { type: 'separator', value: ',' })
      .build(),

    ex('red')
      .as('CssColor')
      .span('value', 'red', 'CssColorValue')
      .render('ast', { type: 'css-color', value: $.value })
      .build(),
  ],
});
