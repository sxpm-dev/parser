import { $, defineSchema, ex, tpl } from '@parser2/parser';

export default defineSchema({
  rootType: 'LogEntry',
  punctuators: {
    dot: '.',
    dash: '-',
    slash: '/',
    colon: ':',
    lbracket: '[',
    rbracket: ']',
  },
  tokens: ['number', 'string'],
  examples: [
    ex('192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326')
      .as('LogEntry')
      .span('ip', '192.168.0.1').until('-')
      .span('-')
      .span('user', 'frank').ident().css()
      .span('[')
      .span('date', '10/Oct/2000:13:55:36 -0700').until(']')
      .span(']')
      .span('request', '"GET /apache_pb.gif HTTP/1.0"').string().doubleQuoted()
      .span('status', '200').number().int()
      .span('size', '2326').number().int()
      .render('ast', {
        type: 'log-entry',
        ip: $.ip,
        ident: '-',
        user: $.user,
        date: $.date,
        request: $.request,
        status: $.status,
        size: $.size,
      })
      .render('source', tpl`${$.ip} - ${$.user} [${$.date}] ${$.request} ${$.status} ${$.size}`)
      .build(),
  ],
});
