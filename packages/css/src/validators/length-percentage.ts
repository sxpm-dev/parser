import { $, defineSchema, literal, parse, relation, span } from '@parser2/parser';

const LENGTH_UNITS = [
  'cap',
  'ch',
  'cm',
  'dvh',
  'dvw',
  'em',
  'ex',
  'ic',
  'in',
  'lh',
  'lvh',
  'lvw',
  'mm',
  'pc',
  'pt',
  'px',
  'q',
  'rem',
  'rlh',
  'svh',
  'svw',
  'vb',
  'vh',
  'vi',
  'vmax',
  'vmin',
  'vw',
] as const;

const LENGTH_FUNCTIONS = ['calc', 'clamp', 'max', 'min'] as const;
const LENGTH_KEYWORDS = [
  'auto',
  'fit-content',
  'max-content',
  'min-content',
] as const;

// Phase B resurrection as a sub-module of @parser2/css.
//
// Ported verbatim from the deleted packages/css-length-percentage schema
// (commit b65ebcf~1). The original was a standalone package; it now lives
// inside the css package because it serves only as a property-value
// validator for the css schema. The design constraints below are preserved
// from the source-of-truth schema; only the DSL has changed (ex() →
// relation()).
//
// Design constraints (from the original schema):
//
// 1. AST-only. No `source` target is declared. Several productions are
//    bare-slot (the `0`, operator, and separator productions render as
//    `${$.value}` or a static literal with no distinguishing literal
//    segment), and the v1 source-template inverse discriminator cannot
//    tell them apart from source alone. css-color follows the same
//    precedent.
//
// 2. LengthPercentageItem consolidates the sibling productions under one
//    node type so the CssLengthPercentage wrapper can reference a single
//    child role. Productions are dispatched on the distinct AST `type`
//    literals (dimension, percentage, zero, length-function, var-function,
//    length-keyword).
//
// 3. LengthFunctionToken is the separate role used inside calc()/clamp()/
//    max()/min() argument lists. It overlaps with LengthPercentageItem on
//    dimension/percentage/zero but additionally covers the arithmetic
//    operators (+, -, *, /) and the comma separator that only make sense
//    inside a function-token sequence.
//
// 4. Signed productions (-10px, -50%) use a leading `-` literal followed
//    by an unsigned value span; the AST hard-codes the negated string
//    rather than synthesising it from the span ($.value contains the
//    unsigned magnitude). This matches the original's intent.

export default defineSchema({
  rootType: 'CssLengthPercentage',
  punctuators: {
    lparen: '(',
    rparen: ')',
    percent: '%',
    delim: ['+', '-', '*', '/', ','],
  },
  tokens: ['number', 'string'],
  examples: [
    relation('LengthPercentageItem', {
      input: '10px',
      encodings: {
        parse: parse([
          span('value', '10').number().float().noWhitespaceAfter(),
          span('unit', 'px').ident().css().oneOf(LENGTH_UNITS),
        ]),
        ast: { type: 'dimension', value: $.value, unit: $.unit },
      },
    }),

    relation('LengthPercentageItem', {
      input: '-10px',
      encodings: {
        parse: parse([
          literal('-'),
          span('value', '10').number().float().noWhitespaceAfter(),
          span('unit', 'px').ident().css().oneOf(LENGTH_UNITS),
        ]),
        ast: { type: 'dimension', value: '-10', unit: $.unit },
      },
    }),

    relation('LengthPercentageItem', {
      input: '50%',
      encodings: {
        parse: parse([
          span('value', '50').number().float().noWhitespaceAfter(),
          literal('%'),
        ]),
        ast: { type: 'percentage', value: $.value },
      },
    }),

    relation('LengthPercentageItem', {
      input: '-50%',
      encodings: {
        parse: parse([
          literal('-'),
          span('value', '50').number().float().noWhitespaceAfter(),
          literal('%'),
        ]),
        ast: { type: 'percentage', value: '-50' },
      },
    }),

    relation('LengthPercentageItem', {
      input: '0',
      encodings: {
        parse: parse([
          span('value', '0').number().oneOf(['0']),
        ]),
        ast: { type: 'zero', value: $.value },
      },
    }),

    relation('LengthPercentageItem', {
      input: 'calc(100% - 1rem)',
      encodings: {
        parse: parse([
          span('name', 'calc').ident().css().oneOf(LENGTH_FUNCTIONS),
          literal('('),
          span('args', '100%').of('LengthFunctionToken').repeats({ min: 1 }),
          literal(')'),
        ]),
        ast: { type: 'length-function', name: $.name, args: $.args },
      },
    }),

    relation('LengthFunctionToken', {
      input: '1rem',
      encodings: {
        parse: parse([
          span('value', '1').number().float().noWhitespaceAfter(),
          span('unit', 'rem').ident().css().oneOf(LENGTH_UNITS),
        ]),
        ast: { type: 'dimension', value: $.value, unit: $.unit },
      },
    }),

    relation('LengthFunctionToken', {
      input: '100%',
      encodings: {
        parse: parse([
          span('value', '100').number().float().noWhitespaceAfter(),
          literal('%'),
        ]),
        ast: { type: 'percentage', value: $.value },
      },
    }),

    relation('LengthFunctionToken', {
      input: '0',
      encodings: {
        parse: parse([
          span('value', '0').number().oneOf(['0']),
        ]),
        ast: { type: 'zero', value: $.value },
      },
    }),

    relation('LengthFunctionToken', {
      input: '-',
      encodings: {
        parse: parse([
          literal('-'),
        ]),
        ast: { type: 'operator', value: '-' },
      },
    }),

    relation('LengthFunctionToken', {
      input: '+',
      encodings: {
        parse: parse([
          literal('+'),
        ]),
        ast: { type: 'operator', value: '+' },
      },
    }),

    relation('LengthFunctionToken', {
      input: '*',
      encodings: {
        parse: parse([
          literal('*'),
        ]),
        ast: { type: 'operator', value: '*' },
      },
    }),

    relation('LengthFunctionToken', {
      input: '/',
      encodings: {
        parse: parse([
          literal('/'),
        ]),
        ast: { type: 'operator', value: '/' },
      },
    }),

    relation('LengthFunctionToken', {
      input: ',',
      encodings: {
        parse: parse([
          literal(','),
        ]),
        ast: { type: 'separator', value: ',' },
      },
    }),

    relation('LengthPercentageItem', {
      input: 'var(--space, 1rem)',
      encodings: {
        parse: parse([
          span('name', 'var').ident().css().oneOf(['var']),
          literal('('),
          span('args', '--space, 1rem').until(')', { rejectSuffix: ',' }),
          literal(')'),
        ]),
        ast: { type: 'var-function', name: $.name, args: $.args },
      },
    }),

    relation('LengthPercentageItem', {
      input: 'auto',
      encodings: {
        parse: parse([
          span('value', 'auto').ident().css().oneOf(LENGTH_KEYWORDS),
        ]),
        ast: { type: 'length-keyword', value: $.value },
      },
    }),

    relation('CssLengthPercentage', {
      input: '10px 20%',
      encodings: {
        parse: parse([
          span('items', '10px').of('LengthPercentageItem').repeats({ min: 1, max: 4 }),
        ]),
        ast: { type: 'css-length-percentage', items: $.items },
      },
    }),
  ],
});
