import { $, defineSchema, literal, parse, relation, span } from '@parser2/parser';

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
const NON_RGB_COLOR_FUNCTIONS = COLOR_FUNCTIONS.filter(
  (name) => !(RGB_FUNCTIONS as readonly string[]).includes(name),
);

// Phase A resurrection as a sub-module of @parser2/css.
//
// Ported verbatim from the deleted packages/css-color schema (commit b65ebcf~1).
// The original was a standalone package; it now lives inside the css package
// because it serves only as a property-value validator for the css schema. The
// design constraints below are preserved from the source-of-truth schema; only
// the DSL has changed (ex() → relation()).
//
// Design constraints (from the original Phase 6 migration):
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
    relation('CssColorValue', {
      input: 'red',
      encodings: {
        parse: parse([
          span('value', 'red').ident().css().oneOf(COLOR_KEYWORDS),
        ]),
        ast: { type: 'color-keyword', value: $.value },
      },
    }),

    relation('CssColorValue', {
      input: '#00ff99',
      encodings: {
        parse: parse([
          literal('#').noWhitespaceAfter(),
          // .lengths([3, 4, 6, 8]) — RGB / RGBA / RRGGBB / RRGGBBAA. The v2
          // compiler emits this as a post-scan length check (see
          // emit/v2/span.ts:emitRefinementChecks); the interpreter mirrors
          // it. Without the refinement, malformed widths like `#12` or
          // `#123456789` would slip through the hex scanner.
          span('value', '00ff99').hex().lengths([3, 4, 6, 8]),
        ]),
        ast: { type: 'hash-color', value: $.value },
      },
    }),

    relation('CssColorValue', {
      input: 'rgb(255 0 0 / 1)',
      encodings: {
        parse: parse([
          span('name', 'rgb').ident().css().oneOf(RGB_FUNCTIONS),
          literal('('),
          span('args', '255').of('NumericColorFunctionToken').repeats({ min: 1 }),
          literal(')'),
        ]),
        ast: { type: 'rgb-color-function', name: $.name, args: $.args },
      },
    }),

    relation('CssColorValue', {
      input: 'oklch(60% 0.2 30)',
      encodings: {
        parse: parse([
          span('name', 'oklch').ident().css().oneOf(NON_RGB_COLOR_FUNCTIONS),
          literal('('),
          span('args', '60%').of('ColorFunctionToken').repeats({ min: 1 }),
          literal(')'),
        ]),
        ast: { type: 'color-function', name: $.name, args: $.args },
      },
    }),

    relation('CssColorValue', {
      input: 'var(--brand-color, red)',
      encodings: {
        parse: parse([
          span('name', 'var').ident().css().oneOf(['var']),
          literal('('),
          span('args', '--brand-color, red').until(')', { rejectSuffix: ',' }),
          literal(')'),
        ]),
        ast: { type: 'var-function', name: $.name, args: $.args },
      },
    }),

    relation('NumericColorFunctionToken', {
      input: '60%',
      encodings: {
        parse: parse([
          span('value', '60').number().float().noWhitespaceAfter(),
          literal('%'),
        ]),
        ast: { type: 'percentage', value: $.value },
      },
    }),

    relation('NumericColorFunctionToken', {
      input: '255',
      encodings: {
        parse: parse([
          span('value', '255').number().float(),
        ]),
        ast: { type: 'number', value: $.value },
      },
    }),

    relation('NumericColorFunctionToken', {
      input: '/',
      encodings: {
        parse: parse([
          literal('/'),
        ]),
        ast: { type: 'separator', value: '/' },
      },
    }),

    relation('NumericColorFunctionToken', {
      input: ',',
      encodings: {
        parse: parse([
          literal(','),
        ]),
        ast: { type: 'separator', value: ',' },
      },
    }),

    relation('ColorFunctionToken', {
      input: '60%',
      encodings: {
        parse: parse([
          span('value', '60').number().float().noWhitespaceAfter(),
          literal('%'),
        ]),
        ast: { type: 'percentage', value: $.value },
      },
    }),

    relation('ColorFunctionToken', {
      input: '255',
      encodings: {
        parse: parse([
          span('value', '255').number().float(),
        ]),
        ast: { type: 'number', value: $.value },
      },
    }),

    relation('ColorFunctionToken', {
      input: 'display-p3',
      encodings: {
        parse: parse([
          span('value', 'display-p3').ident().css(),
        ]),
        ast: { type: 'ident', value: $.value },
      },
    }),

    relation('ColorFunctionToken', {
      input: '"srgb"',
      encodings: {
        parse: parse([
          span('value', '"srgb"').string(),
        ]),
        ast: { type: 'string', value: $.value },
      },
    }),

    relation('ColorFunctionToken', {
      input: '/',
      encodings: {
        parse: parse([
          literal('/'),
        ]),
        ast: { type: 'separator', value: '/' },
      },
    }),

    relation('ColorFunctionToken', {
      input: ',',
      encodings: {
        parse: parse([
          literal(','),
        ]),
        ast: { type: 'separator', value: ',' },
      },
    }),

    relation('CssColor', {
      input: 'red',
      encodings: {
        parse: parse([
          span('value', 'red').of('CssColorValue'),
        ]),
        ast: { type: 'css-color', value: $.value },
      },
    }),
  ],
});
