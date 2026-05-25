import { $, defineSchema, ex, tpl } from '@parser2/parser';

export default defineSchema({
  rootType: 'Url',
  punctuators: {
    slash: '/',
    colon: ':',
    dot: '.',
    question: '?',
    equals: '=',
    ampersand: '&',
    hash: '#',
    plus: '+',
  },
  tokens: ['number'],
  examples: [
    ex('foo')
      .as('PathSegment')
      .span('value', 'foo').ident().css()
      .render('ast', $.value)
      .render('source', tpl`${$.value}`)
      .build(),

    ex('example.com')
      .as('Host')
      .span('name', 'example').ident().css()
      .span('.')
      .span('tld', 'com').ident().css()
      .render('ast', { type: 'host', parts: [$.name, $.tld] })
      .render('source', tpl`${$.name}.${$.tld}`)
      .build(),

    ex('localhost:8888')
      .as('Host')
      .span('name', 'localhost').ident().css()
      .span(':')
      .span('port', '8888').number().int()
      .render('ast', { type: 'host', parts: [$.name], port: $.port })
      .render('source', tpl`${$.name}:${$.port}`)
      .build(),

    ex('q=hello')
      .as('QueryPair')
      .span('key', 'q').ident().css()
      .span('=')
      .span('value', 'hello').ident().css()
      .render('ast', { type: 'pair', key: $.key, value: $.value })
      .render('source', tpl`${$.key}=${$.value}`)
      .build(),

    ex('q=hello&tag=one')
      .as('Query')
      .span('pairs', 'q=hello', 'QueryPair').repeats({ sep: '&', min: 1 })
      .render('ast', { type: 'query', pairs: $.pairs })
      .render('source', tpl`${$.pairs}`)
      .build(),

    ex('/foo/bar?q=hello&tag=one')
      .as('Url')
      .span('/')
      .span('s1', 'foo', 'PathSegment')
      .span('/')
      .span('s2', 'bar', 'PathSegment')
      .span('?')
      .span('query', 'q=hello&tag=one', 'Query')
      .render('ast', { type: 'url', path: [$.s1, $.s2], query: $.query })
      .render('source', tpl`/${$.s1}/${$.s2}?${$.query}`)
      .build(),

    ex('https://example.com/search')
      .as('Url')
      .span('protocol', 'https').ident().css()
      .span(':')
      .span('/')
      .span('/')
      .span('host', 'example.com', 'Host')
      .span('/')
      .span('s1', 'search', 'PathSegment')
      .render('ast', { type: 'url', protocol: $.protocol, host: $.host, path: [$.s1] })
      .render('source', tpl`${$.protocol}://${$.host}/${$.s1}`)
      .build(),
  ],
});
