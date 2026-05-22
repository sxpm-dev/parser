import { $, defineSchema, ex } from '@parser2/parser';

const VOID_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
] as const;

const TEXT_STOPS = ['<', '</', '<!--'] as const;
const HTML_NS = 'http://www.w3.org/1999/xhtml';

export default defineSchema({
  name: 'html',
  rootType: 'HtmlDocument',
  punctuators: {
    commentOpen:  '<!--',
    commentClose: '-->',
    doctypeOpen:  '<!',
    closeTagOpen: '</',
    selfClose:    '/>',
    lt:           '<',
    gt:           '>',
    equals:       '=',
    dq:           '"',
    sq:           "'",
    // Permissive delimiter set so the tokenizer doesn't choke on common
    // ASCII chars inside attribute values, URLs, and text. Each char becomes
    // a 'delim' token; capture is by source slice so type doesn't matter.
    delim: [
      '/', '?', '#', '&', ':', '.', '+', ';', '%', '~',
      '*', '!', '@', '$', '^', '|', '[', ']', '{', '}',
      '(', ')', ',', '`',
    ],
  },
  // 'number' so digits in URLs/attrs ('utf-8', '1.0', etc.) tokenize.
  tokens: ['number'],
  examples: [
    // ===== HtmlDocument ============================================
    ex('<p>hi</p>')
      .as('HtmlDocument')
      .span('children', '<p>hi</p>', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0 })
      .structure({
        nodeName: '#document',
        mode: 'no-quirks',
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // ===== Doctype =================================================
    ex('<!DOCTYPE html>')
      .as('Doctype')
      .span('<!')
      .span('keyword', 'DOCTYPE').ident().oneOf(['DOCTYPE'])
      .span('name', 'html').ident().css()
      .span('>')
      .structure({
        nodeName: '#documentType',
        name: $.name,
        publicId: '',
        systemId: '',
        parentNode: null,
      })
      .build(),

    // ===== Comment =================================================
    // Use punctuator-bracketed capture rather than `.comment().block()`
    // because the compiler's comment tokenizer is currently hardcoded to
    // `/* */`. The commentOpen/commentClose punctuators give us the boundary
    // we need; `.until('-->')` captures the body source slice preserving
    // whitespace (trim: false) to match parse5's `data` field.
    ex('<!-- hello -->')
      .as('Comment')
      .span('<!--')
      .span('data', ' hello ').until('-->', { trim: false })
      .span('-->')
      .structure({
        nodeName: '#comment',
        data: $.data,
        parentNode: null,
      })
      .build(),

    // ===== HtmlElement (multi-production) ==========================
    // Production 1: void element, no slash. `<br>`, `<meta charset="x">`.
    ex('<br>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'br').ident().css().oneOf(VOID_TAGS)
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: [],
        parentNode: null,
      })
      .build(),

    // Production 2: void element with self-close slash. `<br />`, `<img src="x" />`.
    ex('<br />')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'br').ident().css().oneOf(VOID_TAGS)
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('/>')
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: [],
        parentNode: null,
      })
      .build(),

    // Production 3: regular element with children and close tag.
    ex('<div>x</div>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'div').ident().css()
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode']).repeats({ min: 0 })
      .span('</')
      .span('closeTag', 'div').ident().css()
      .span('>')
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // ===== TextNode ================================================
    ex('hello')
      .as('TextNode')
      .span('value', 'hello').until(TEXT_STOPS)
      .structure({
        nodeName: '#text',
        value: $.value,
        parentNode: null,
      })
      .build(),

    // ===== Attribute (multi-production) ============================
    // Production 1: double-quoted value. `class="hero"`.
    ex('class="hero"')
      .as('Attribute')
      .span('name', 'class').ident().css()
      .span('=')
      .span('"')
      .span('value', 'hero').until('"')
      .span('"')
      .structure({ name: $.name, value: $.value })
      .build(),

    // Production 2: single-quoted value. `class='hero'`.
    ex("class='hero'")
      .as('Attribute')
      .span('name', 'class').ident().css()
      .span('=')
      .span("'")
      .span('value', 'hero').until("'")
      .span("'")
      .structure({ name: $.name, value: $.value })
      .build(),

    // Production 3: unquoted ident-shaped value. `class=hero`, `lang=en-GB`.
    ex('class=hero')
      .as('Attribute')
      .span('name', 'class').ident().css()
      .span('=')
      .span('value', 'hero').ident().css()
      .structure({ name: $.name, value: $.value })
      .build(),

    // Production 4: boolean (presence-only) attribute. `disabled`.
    ex('disabled')
      .as('Attribute')
      .span('name', 'disabled').ident().css()
      .structure({ name: $.name, value: '' })
      .build(),
  ],
});
