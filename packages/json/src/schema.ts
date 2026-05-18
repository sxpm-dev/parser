import { defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'json',
  runtime: {
    tokenize: {
      kind: 'standard',
      whitespace: { token: 'whitespace', emit: false, chars: ' \t\r\n' },
      string: { token: 'string', quote: '"', escapes: true, unicodeEscape: { prefix: 'u', digits: 4 } },
      number: { token: 'number', minus: true, fraction: true, exponent: true, leadingZero: 'reject' },
      keywords: [
        { token: 'true', text: 'true', value: true },
        { token: 'false', text: 'false', value: false },
        { token: 'null', text: 'null', value: null },
      ],
      punctuators: [
        { token: 'lbrace', text: '{' },
        { token: 'rbrace', text: '}' },
        { token: 'lbracket', text: '[' },
        { token: 'rbracket', text: ']' },
        { token: 'colon', text: ':' },
        { token: 'comma', text: ',' },
      ],
    },
    parse: {
      kind: 'value-document',
      engine: 'native-json',
      documentType: 'JsonDocument',
      valueField: 'value',
      object: { open: '{', close: '}', keyToken: 'string', pairSeparator: ':', separator: ',' },
      array: { open: '[', close: ']', separator: ',' },
      stringToken: 'string',
      numberToken: 'number',
      primitiveTokens: [
        { token: 'true', text: 'true', value: true },
        { token: 'false', text: 'false', value: false },
        { token: 'null', text: 'null', value: null },
      ],
      parseTree: true,
    },
    stringify: { kind: 'native-json', valueField: 'value' },
  },
  rules: [
    ex.rule('JsonDocument')
      .from('%value%').node('JsonDocument'),
    ex.rule('value')
      .from('%object%').node('object')
      .from('%array%').node('array')
      .from('%string%').node('string')
      .from('%number%').node('number')
      .from('%boolean%').node('boolean')
      .from('%null%').node('null'),
    ex.rule('object')
      .from('{%members%}').node('object')
      .from('{}').node('object'),
    ex.rule('members')
      .from('%string%:%value%').node('member')
      .from('%string%:%value%,%members%').node('member-list'),
    ex.rule('array')
      .from('[%items%]').node('array')
      .from('[]').node('array'),
    ex.rule('items')
      .from('%value%').node('item')
      .from('%value%,%items%').node('item-list'),
    ex.rule('string')
      .from('"x"').node('string'),
    ex.rule('number')
      .from('1').node('number'),
    ex.rule('boolean')
      .from('true').node('boolean')
      .from('false').node('boolean'),
    ex.rule('null')
      .from('null').node('null'),
  ],
  examples: [
    ex('{"name":"Ada","count":2,"ok":true,"items":[null,1.5]}')
      .token('lbrace', '{')
      .token('string', '"name"')
      .token('colon', ':')
      .token('string', '"Ada"')
      .token('comma', ',')
      .token('string', '"count"')
      .token('colon', ':')
      .token('number', '2')
      .token('comma', ',')
      .token('string', '"ok"')
      .token('colon', ':')
      .token('true', 'true')
      .token('comma', ',')
      .token('string', '"items"')
      .token('colon', ':')
      .token('lbracket', '[')
      .token('null', 'null')
      .token('comma', ',')
      .token('number', '1.5')
      .token('rbracket', ']')
      .token('rbrace', '}')
      .node('JsonDocument', (doc) => doc
        .node('object')
        .node('array')
        .node('string')
        .node('number')
        .node('boolean')
        .node('null'))
      .structure({
        type: 'JsonDocument',
        rootProps: ['name', 'count', 'ok', 'items'],
        numberPaths: [
          { path: ['count'], value: 2 },
          { path: ['items', 1], value: 1.5 },
        ],
      })
      .build(),
  ],
});
