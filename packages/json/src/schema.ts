import { defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'json',
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
      .build(),
  ],
});
