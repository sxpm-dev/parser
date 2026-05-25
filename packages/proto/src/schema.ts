import { $, defineSchema, ex, tpl } from '@parser2/parser';

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
      .render('ast', { type: 'syntax', value: $.value })
      .render('source', tpl`syntax = ${$.value};`)
      .build(),

    ex('package example.v1;')
      .as('Declaration')
      .span('package')
      .span('name', 'example').ident().css()
      .span('.')
      .span('version', 'v1').ident().css()
      .span(';')
      .render('ast', { type: 'package', name: [$.name, $.version] })
      .render('source', tpl`package ${$.name}.${$.version};`)
      .build(),

    ex('string name = 1;')
      .as('Field')
      .span('fieldType', 'string').ident().css()
      .span('name', 'name').ident().css()
      .span('=')
      .span('number', '1').number().int()
      .span(';')
      .render('ast', { type: 'field', fieldType: $.fieldType, name: $.name, number: $.number })
      .render('source', tpl`${$.fieldType} ${$.name} = ${$.number};`)
      .build(),

    ex('message User { string name = 1; int32 age = 2; }')
      .as('Declaration')
      .span('message')
      .span('name', 'User').ident().css()
      .span('{')
      .span('fields', 'string name = 1;', 'Field').repeats({ min: 0 })
      .span('}')
      .render('ast', { type: 'message', name: $.name, fields: $.fields })
      .render('source', tpl`message ${$.name} { ${$.fields} }`)
      .build(),

    ex('syntax = "proto3"; package example.v1; message User { string name = 1; int32 age = 2; }')
      .as('ProtoFile')
      .span('declarations', 'syntax = "proto3";', 'Declaration').repeats({ min: 1 })
      .render('ast', { type: 'proto-file', declarations: $.declarations })
      .render('source', tpl`${$.declarations}`)
      .build(),
  ],
});
