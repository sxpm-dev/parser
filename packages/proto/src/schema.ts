import { $, defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  rootType: 'ProtoFile',
  punctuators: {
    equals: '=',
    semicolon: ';',
    dot: '.',
    lbrace: '{',
    rbrace: '}',
  },
  tokens: ['number', 'string'],
  examples: [
    ex('syntax = "proto3";')
      .as('Declaration')
      .span('syntax')
      .span('=')
      .span('value', '"proto3"').string().doubleQuoted()
      .span(';')
      .structure({ type: 'syntax', value: $.value })
      .build(),

    ex('package example.v1;')
      .as('Declaration')
      .span('package')
      .span('name', 'example').ident().css()
      .span('.')
      .span('version', 'v1').ident().css()
      .span(';')
      .structure({ type: 'package', name: [$.name, $.version] })
      .build(),

    ex('string name = 1;')
      .as('Field')
      .span('fieldType', 'string').ident().css()
      .span('name', 'name').ident().css()
      .span('=')
      .span('number', '1').number().int()
      .span(';')
      .structure({ type: 'field', fieldType: $.fieldType, name: $.name, number: $.number })
      .build(),

    ex('message User { string name = 1; int32 age = 2; }')
      .as('Declaration')
      .span('message')
      .span('name', 'User').ident().css()
      .span('{')
      .span('fields', 'string name = 1;', 'Field').repeats({ min: 0 })
      .span('}')
      .structure({ type: 'message', name: $.name, fields: $.fields })
      .build(),

    ex('syntax = "proto3"; package example.v1; message User { string name = 1; int32 age = 2; }')
      .as('ProtoFile')
      .span('declarations', 'syntax = "proto3";', 'Declaration').repeats({ min: 1 })
      .structure({ type: 'proto-file', declarations: $.declarations })
      .build(),
  ],
});
