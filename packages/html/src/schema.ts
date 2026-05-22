import { $, defineSchema, ex } from '@parser2/parser';

const VOID_TAGS = [
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
] as const;

// Raw-text elements per WHATWG: contents run until matching close tag,
// ignoring any `<` inside (the spec also includes 'noembed','noframes',
// 'noscript' under conditional contexts; deferred).
const RAW_TEXT_TAGS = ['script', 'style', 'textarea', 'title'] as const;

const TEXT_STOPS = ['<', '</', '<!--'] as const;
// Stops for unquoted attribute values: any whitespace ends the value, as
// does the tag close `>` or self-close `/>`. Raw-source scan handles chars
// like `/`, `:`, `?`, `&` that aren't in our ident class.
const UNQUOTED_VALUE_STOPS = [' ', '\t', '\n', '\r', '\f', '>', '/>'] as const;
const HTML_NS = 'http://www.w3.org/1999/xhtml';

// Per WHATWG, certain elements can have their close tag omitted. When the
// parser sees a triggering pattern (next sibling open tag or enclosing
// list close), the current element implicitly closes. The schema models
// this via a separate production per implicit-closing tag, each with a
// `.repeats({stopBefore:...})` that exits the children loop before
// consuming the trigger.
// stopBefore patterns include BOTH sibling/list-close triggers AND the
// element's own explicit close (e.g. `</li>`). That way one production
// handles both implicit and explicit closes — children stops, then the
// optional close trio consumes `</li>` if present, skips otherwise.
const LI_STOPS = ['</li>', '<li>', '<li ', '<li/', '</ol>', '</ul>', '</menu>'] as const;
const DT_DD_STOPS = ['</dt>', '</dd>', '<dt>', '<dt ', '<dt/', '<dd>', '<dd ', '<dd/', '</dl>'] as const;
// Per HTML5, implicit closes chain. When a table section opens (<tbody>,
// <thead>, <tfoot>), the enclosing thead/tbody/tfoot closes, which
// transitively closes any open <tr>/<td>/<th>. Each STOPS set includes
// triggers that close ancestors so the chain unwinds correctly.
const TR_STOPS = [
  '</tr>', '<tr>', '<tr ', '<tr/',
  '<tbody>', '<tbody ', '<thead>', '<thead ', '<tfoot>', '<tfoot ',
  '</tbody>', '</thead>', '</tfoot>', '</table>',
] as const;
const TD_TH_STOPS = [
  '</td>', '</th>', '<td>', '<td ', '<td/', '<th>', '<th ', '<th/',
  '<tr>', '<tr ', '</tr>',
  '<tbody>', '<tbody ', '<thead>', '<thead ', '<tfoot>', '<tfoot ',
  '</tbody>', '</thead>', '</tfoot>', '</table>',
] as const;
const OPTION_STOPS = ['</option>', '</optgroup>', '<option>', '<option ', '<optgroup>', '<optgroup ', '</select>', '</datalist>'] as const;
// <p> implicitly closes on the next block element open. WHATWG defines a
// list; we cover the common cases. Pragmatic subset rather than exhaustive.
// <html>/<head>/<body> can have their close tags omitted per HTML5. <head>
// implicitly closes when <body> opens; <body> implicitly closes at EOF or
// on </html>. children loop terminates on no-progress at EOF, then the
// optional close span is skipped.
const HTML_STOPS = ['</html>'] as const;
const HEAD_STOPS = ['</head>', '<body>', '<body ', '<body/'] as const;
const BODY_STOPS = ['</body>', '</html>'] as const;
// <thead>/<tbody>/<tfoot> all close on each other and on </table>.
const TBODY_STOPS = ['</tbody>', '<tbody>', '<tbody ', '<tfoot>', '<tfoot ', '</table>'] as const;
const THEAD_STOPS = ['</thead>', '<tbody>', '<tbody ', '<tfoot>', '<tfoot ', '</table>'] as const;
const TFOOT_STOPS = ['</tfoot>', '</table>'] as const;
const P_STOPS = ['</p>', '<p>', '<p ', '<p/', '<div>', '<div ', '<table>', '<table ', '<ul>', '<ul ', '<ol>', '<ol ', '<dl>', '<dl ', '<h1>', '<h1 ', '<h2>', '<h2 ', '<h3>', '<h3 ', '<h4>', '<h4 ', '<h5>', '<h5 ', '<h6>', '<h6 ', '<hr>', '<hr ', '<hr/', '<pre>', '<pre ', '<blockquote>', '<blockquote ', '<form>', '<form ', '<section>', '<section ', '<article>', '<article ', '<header>', '<header ', '<footer>', '<footer ', '<aside>', '<aside ', '<nav>', '<nav ', '<address>', '<address '] as const;

export default defineSchema({
  name: 'html',
  rootType: 'HtmlDocument',
  punctuators: {
    commentOpen:  '<!--',
    commentClose: '-->',
    doctypeOpen:  '<!',
    closeTagOpen: '</',
    selfClose:    '/>',
    // Per-tag close literals for implicit-close elements. Declared as
    // multi-char punctuators so `.span('</li>').optional()` can match them
    // as a single token (longest-match wins over `</` + ident + `>`). For
    // any other tag the generic `</`-ident-`>` close still applies.
    closeLi:       '</li>',
    closeDt:       '</dt>',
    closeDd:       '</dd>',
    closeTr:       '</tr>',
    closeTd:       '</td>',
    closeTh:       '</th>',
    closeP:        '</p>',
    closeOption:   '</option>',
    closeOptgroup: '</optgroup>',
    closeHtml:     '</html>',
    closeHead:     '</head>',
    closeBody:     '</body>',
    closeTbody:    '</tbody>',
    closeThead:    '</thead>',
    closeTfoot:    '</tfoot>',
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
  // HTML is content-permissive: any character can appear in text or attribute
  // values. Tolerate unknown bytes by emitting them as `raw` tokens so
  // `.until()` source-slicing covers em-dashes, unicode letters, emojis, etc.
  unknownChars: 'tolerate',
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
      .span('name', 'html').ident().html()
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
    // Production 0: raw-text element. `<script>`, `<style>`, `<textarea>`,
    // `<title>` — bodies are opaque source until the literal close tag,
    // ignoring any `<` inside (JS, CSS, etc.). Must come BEFORE the void
    // and regular productions so dispatch tries it first for these tags.
    ex('<script>js</script>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'script').ident().html().oneOf(RAW_TEXT_TAGS)
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('body', 'js').rawUntil('</', { caseInsensitive: true })
      .span('</')
      .span('closeTag', 'script').ident().html().oneOf(RAW_TEXT_TAGS)
      .span('>')
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: [{ nodeName: '#text', value: $.body, parentNode: null }],
        parentNode: null,
      })
      .build(),

    // Production 1: void element, no slash. `<br>`, `<meta charset="x">`.
    ex('<br>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'br').ident().html().oneOf(VOID_TAGS)
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
      .span('tag', 'br').ident().html().oneOf(VOID_TAGS)
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

    // Implicit-close productions. Tried before the regular element form so
    // dispatch routes by tag name first via .oneOf refinements. Each has no
    // close tag at all; the children list exits before consuming the next
    // sibling open or the enclosing list close (stopBefore literal prefixes).

    // <li>
    ex('<li>x</li>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'li').ident().html().oneOf(['li'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: LI_STOPS })
      // Optional explicit close. The `</li>` punctuator is multi-char so
      // .optional() either matches the whole `</li>` atomically or skips.
      // When stopBefore matched a sibling/list-close trigger instead, the
      // close is absent and we skip.
      .span('</li>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // <dt> / <dd>
    ex('<dt>x</dt>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'dt').ident().html().oneOf(['dt', 'dd'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: DT_DD_STOPS })
      // Either </dt> or </dd> may close (or neither, for implicit close).
      .span('</dt>').optional()
      .span('</dd>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // <tr>
    ex('<tr>x</tr>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'tr').ident().html().oneOf(['tr'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: TR_STOPS })
      .span('</tr>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // <td> / <th>
    ex('<td>x</td>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'td').ident().html().oneOf(['td', 'th'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: TD_TH_STOPS })
      .span('</td>').optional()
      .span('</th>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // <p>
    ex('<p>x</p>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'p').ident().html().oneOf(['p'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: P_STOPS })
      .span('</p>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // <option> / <optgroup>
    ex('<option>x</option>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'option').ident().html().oneOf(['option', 'optgroup'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: OPTION_STOPS })
      .span('</option>').optional()
      .span('</optgroup>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // <html> / <head> / <body> — close-tag can be omitted per HTML5.
    ex('<html>x</html>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'html').ident().html().oneOf(['html'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: HTML_STOPS })
      .span('</html>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    ex('<head>x</head>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'head').ident().html().oneOf(['head'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: HEAD_STOPS })
      .span('</head>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // <tbody> / <thead> / <tfoot> — implicit closes between table sections.
    ex('<tbody>x</tbody>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'tbody').ident().html().oneOf(['tbody'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: TBODY_STOPS })
      .span('</tbody>').optional()
      .structure({
        nodeName: $.tag, tagName: $.tag, namespaceURI: HTML_NS,
        attrs: $.attrs, childNodes: $.children, parentNode: null,
      })
      .build(),

    ex('<thead>x</thead>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'thead').ident().html().oneOf(['thead'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: THEAD_STOPS })
      .span('</thead>').optional()
      .structure({
        nodeName: $.tag, tagName: $.tag, namespaceURI: HTML_NS,
        attrs: $.attrs, childNodes: $.children, parentNode: null,
      })
      .build(),

    ex('<tfoot>x</tfoot>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'tfoot').ident().html().oneOf(['tfoot'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: TFOOT_STOPS })
      .span('</tfoot>').optional()
      .structure({
        nodeName: $.tag, tagName: $.tag, namespaceURI: HTML_NS,
        attrs: $.attrs, childNodes: $.children, parentNode: null,
      })
      .build(),

    ex('<body>x</body>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'body').ident().html().oneOf(['body'])
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode'])
        .repeats({ min: 0, stopBefore: BODY_STOPS })
      .span('</body>').optional()
      .structure({
        nodeName: $.tag,
        tagName: $.tag,
        namespaceURI: HTML_NS,
        attrs: $.attrs,
        childNodes: $.children,
        parentNode: null,
      })
      .build(),

    // Production: regular element with children and close tag.
    ex('<div>x</div>')
      .as('HtmlElement')
      .span('<')
      .span('tag', 'div').ident().html()
      .span('attrs', '', 'Attribute').repeats({ min: 0 })
      .span('>')
      .span('children', 'x', ['Doctype', 'Comment', 'HtmlElement', 'TextNode']).repeats({ min: 0 })
      .span('</')
      .span('closeTag', 'div').ident().html()
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
    // Use .rawUntil so we stop at ANY `<` character in source — covers
    // every tag-open form (`<`, `</`, `<!--`, `<!`, and the multi-char
    // close literals like `</li>`) with a single stop. Token-based .until
    // can't because it's limited to 3 stops by token value.
    ex('hello')
      .as('TextNode')
      .span('value', 'hello').rawUntil('<')
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
      .span('name', 'class').ident().html()
      .span('=')
      .span('"')
      .span('value', 'hero').until('"')
      .span('"')
      .structure({ name: $.name, value: $.value })
      .build(),

    // Production 2: single-quoted value. `class='hero'`.
    ex("class='hero'")
      .as('Attribute')
      .span('name', 'class').ident().html()
      .span('=')
      .span("'")
      .span('value', 'hero').until("'")
      .span("'")
      .structure({ name: $.name, value: $.value })
      .build(),

    // Production 3: unquoted value containing any non-whitespace chars.
    // `class=hero`, `lang=en-GB`, `href=https://x.test/y?z=1`.
    ex('class=hero')
      .as('Attribute')
      .span('name', 'class').ident().html()
      .span('=')
      .span('value', 'hero').rawUntil(UNQUOTED_VALUE_STOPS)
      .structure({ name: $.name, value: $.value })
      .build(),

    // Production 4: boolean (presence-only) attribute. `disabled`.
    ex('disabled')
      .as('Attribute')
      .span('name', 'disabled').ident().html()
      .structure({ name: $.name, value: '' })
      .build(),
  ],
});
