import { $, defineSchema, ex, tpl } from '@parser2/parser';

export default defineSchema({
  rootType: 'Arn',
  punctuators: {
    colon: ':',
    slash: '/',
  },
  tokens: ['number'],
  examples: [
    ex('function:MyFn')
      .as('ArnResource')
      .span('kind', 'function').ident().css()
      .span(':')
      .span('name', 'MyFn').ident().css()
      .render('ast', { type: 'resource', kind: $.kind, name: $.name, separator: ':' })
      .render('source', tpl`${$.kind}:${$.name}`)
      .build(),

    ex('instance/i-0abcdef')
      .as('ArnResource')
      .span('kind', 'instance').ident().css()
      .span('/')
      .span('name', 'i-0abcdef').ident().css()
      .render('ast', { type: 'resource', kind: $.kind, name: $.name, separator: '/' })
      .render('source', tpl`${$.kind}/${$.name}`)
      .build(),

    ex('order-queue')
      .as('ArnResource')
      .span('name', 'order-queue').ident().css()
      .render('ast', { type: 'resource', name: $.name })
      .render('source', tpl`${$.name}`)
      .build(),

    ex('arn:aws:lambda:us-east-1:123456789012:function:MyFn')
      .as('Arn')
      .span('arn')
      .span(':')
      .span('partition', 'aws').ident().css()
      .span(':')
      .span('service', 'lambda').ident().css()
      .span(':')
      .span('region', 'us-east-1').ident().css()
      .span(':')
      .span('account', '123456789012').number().int()
      .span(':')
      .span('resource', 'function:MyFn', 'ArnResource')
      .render('ast', {
        type: 'arn',
        partition: $.partition,
        service: $.service,
        region: $.region,
        account: $.account,
        resource: $.resource,
      })
      .render('source', tpl`arn:${$.partition}:${$.service}:${$.region}:${$.account}:${$.resource}`)
      .build(),
  ],
});
