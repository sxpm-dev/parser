import { $, defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'html',
  rootType: 'HtmlDocument',
  punctuators: {
    doctypeOpen: '<!',
    closeTagOpen: '</',
    selfClose: '/>',
    lt: '<',
    gt: '>',
    equals: '=',
  },
  tokens: ['string'],
  examples: [
    ex('<div>Hello</div><p>World</p>')
      .as('HtmlDocument')
      .span('children', '<div>Hello</div>', 'HtmlNode').repeats({ min: 1 })
      .structure({ type: 'document', children: $.children })
      .build(),

    ex('<!doctype html>')
      .as('HtmlNode')
      .span('<!')
      .span('keyword', 'doctype').ident().oneOf(['doctype'])
      .span('name', 'html').ident().css()
      .span('>')
      .structure({ type: 'doctype', name: $.name })
      .build(),

    ex('class="hero"')
      .as('Attribute')
      .span('name', 'class').ident().css()
      .span('=')
      .span('value', '"hero"').string().doubleQuoted()
      .structure({ type: 'attribute', name: $.name, value: $.value })
      .build(),

    ex('disabled')
      .as('Attribute')
      .span('name', 'disabled').ident().css()
      .structure({ type: 'attribute', name: $.name })
      .build(),

    ex('<div class="hero" disabled>Hello world</div>')
      .as('HtmlNode')
      .span('<')
      .span('tag', 'div').ident().css()
      .span('attributes', 'class="hero"', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('text', 'Hello world').until('</')
      .span('</')
      .span('closeTag', 'div').ident().css()
      .span('>')
      .structure({
        type: 'element',
        tagName: $.tag,
        attributes: $.attributes,
        children: [{ type: 'text', value: $.text }],
        closeTag: $.closeTag,
      })
      .build(),

    ex('<br />')
      .as('HtmlNode')
      .span('<')
      .span('tag', 'br').ident().css()
      .span('attributes', '', 'Attribute').repeats({ min: 0 })
      .span('/>')
      .structure({
        type: 'element',
        tagName: $.tag,
        attributes: $.attributes,
        children: [],
        selfClosing: true,
      })
      .build(),
  ],
});
