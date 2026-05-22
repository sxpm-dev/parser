import { $, defineSchema, ex } from '@parser2/parser';

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
      .structure($.value)
      .build(),

    ex('example.com')
      .as('Host')
      .span('name', 'example').ident().css()
      .span('.')
      .span('tld', 'com').ident().css()
      .structure({ type: 'host', parts: [$.name, $.tld] })
      .build(),

    ex('localhost:8888')
      .as('Host')
      .span('name', 'localhost').ident().css()
      .span(':')
      .span('port', '8888').number().int()
      .structure({ type: 'host', parts: [$.name], port: $.port })
      .build(),

    ex('q=hello')
      .as('QueryPair')
      .span('key', 'q').ident().css()
      .span('=')
      .span('value', 'hello').ident().css()
      .structure({ type: 'pair', key: $.key, value: $.value })
      .build(),

    ex('q=hello&tag=one')
      .as('Query')
      .span('pairs', 'q=hello', 'QueryPair').repeats({ sep: '&', min: 1 })
      .structure({ type: 'query', pairs: $.pairs })
      .build(),

    ex('/foo/bar?q=hello&tag=one')
      .as('Url')
      .span('/')
      .span('s1', 'foo', 'PathSegment')
      .span('/')
      .span('s2', 'bar', 'PathSegment')
      .span('?')
      .span('query', 'q=hello&tag=one', 'Query')
      .structure({ type: 'url', path: [$.s1, $.s2], query: $.query })
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
      .structure({ type: 'url', protocol: $.protocol, host: $.host, path: [$.s1] })
      .build(),
  ],
});
