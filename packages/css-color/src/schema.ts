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

export default defineSchema({
  name: 'css-color',
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
      .as('ColorKeyword')
      .span('value', 'red').ident().css().oneOf(COLOR_KEYWORDS)
      .structure({ type: 'color-keyword', value: $.value })
      .build(),

    ex('#00ff99')
      .as('HashColor')
      .span('#')
      .span('value', '00ff99').until([')', ',', '/']).hexString().lengths([3, 4, 6, 8])
      .structure({ type: 'hash-color', value: $.value })
      .build(),

    ex('rgb(255 0 0 / 1)')
      .as('RgbColorFunction')
      .span('name', 'rgb').ident().css().oneOf(RGB_FUNCTIONS)
      .span('(')
      .span('args', '255', 'NumericColorFunctionToken').repeats({ min: 1 })
      .span(')')
      .structure({ type: 'color-function', name: $.name })
      .build(),

    ex('oklch(60% 0.2 30)')
      .as('ColorFunction')
      .span('name', 'oklch').ident().css().oneOf(NON_RGB_COLOR_FUNCTIONS)
      .span('(')
      .span('args', '60%', 'ColorFunctionToken').repeats({ min: 1 })
      .span(')')
      .structure({ type: 'color-function', name: $.name })
      .build(),

    ex('60%')
      .as('NumericColorFunctionToken')
      .span('value', '60').number()
      .span('%')
      .structure({ type: 'percentage', value: $.value })
      .build(),

    ex('255')
      .as('NumericColorFunctionToken')
      .span('value', '255').number()
      .structure({ type: 'number', value: $.value })
      .build(),

    ex('/')
      .as('NumericColorFunctionToken')
      .span('/')
      .structure({ type: 'separator', value: '/' })
      .build(),

    ex(',')
      .as('NumericColorFunctionToken')
      .span(',')
      .structure({ type: 'separator', value: ',' })
      .build(),

    ex('color(display-p3 1 0 0)')
      .as('ColorFunction')
      .span('name', 'color').ident().css().oneOf(NON_RGB_COLOR_FUNCTIONS)
      .span('(')
      .span('args', 'display-p3', 'ColorFunctionToken').repeats({ min: 1 })
      .span(')')
      .structure({ type: 'color-function', name: $.name })
      .build(),

    ex('60%')
      .as('ColorFunctionToken')
      .span('value', '60').number()
      .span('%')
      .structure({ type: 'percentage', value: $.value })
      .build(),

    ex('255')
      .as('ColorFunctionToken')
      .span('value', '255').number()
      .structure({ type: 'number', value: $.value })
      .build(),

    ex('display-p3')
      .as('ColorFunctionToken')
      .span('value', 'display-p3').ident().css()
      .structure({ type: 'ident', value: $.value })
      .build(),

    ex('"srgb"')
      .as('ColorFunctionToken')
      .span('value', '"srgb"').string()
      .structure({ type: 'string', value: $.value })
      .build(),

    ex('/')
      .as('ColorFunctionToken')
      .span('/')
      .structure({ type: 'separator', value: '/' })
      .build(),

    ex(',')
      .as('ColorFunctionToken')
      .span(',')
      .structure({ type: 'separator', value: ',' })
      .build(),

    ex('var(--brand-color, red)')
      .as('VarFunction')
      .span('name', 'var').ident().css().oneOf(['var'])
      .span('(')
      .span('args', '--brand-color, red').until(')')
      .span(')')
      .structure({ type: 'var-function', name: $.name, args: $.args })
      .build(),

    ex('red')
      .as('CssColor')
      .span('value', 'red', ['ColorKeyword', 'HashColor', 'RgbColorFunction', 'ColorFunction', 'VarFunction'])
      .structure({ type: 'css-color', value: $.value })
      .build(),
  ],
});
