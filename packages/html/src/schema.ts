import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';

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
// Per WHATWG, `"` and `'` also stop the scan — an unquoted value must not
// start with a quote character (otherwise it would be a malformed quoted
// attribute). Using them as stops and requiring nonEmpty lets the production
// fail cleanly when the input starts with a quote.
const UNQUOTED_VALUE_STOPS = ['"', "'", ' ', '\t', '\n', '\r', '\f', '>', '/>'] as const;
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
  rootType: 'HtmlDocument',
  caseSensitive: false,
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
    relation('HtmlDocument', {
      input: '<p>hi</p>',
      encodings: {
        parse: parse([
          span('children', '<p>hi</p>').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0 }),
        ]),
        ast: {
          nodeName: '#document',
          mode: 'no-quirks',
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`${$.children}`,
      },
    }),

    // ===== Doctype =================================================
    // Each production carries a `_kind` literal so the inverse dispatcher
    // can tell well-formed and recovery shapes apart from the AST alone.
    // The forward-emitted AST gains this discriminator on the public surface.
    relation('Doctype', {
      input: '<!DOCTYPE html>',
      encodings: {
        parse: parse([
          literal('<!'),
          span('keyword', 'DOCTYPE').ident().oneOf(['DOCTYPE']),
          span('name', 'html').ident().html(),
          literal('>'),
        ]),
        ast: {
          _kind: 'doctype',
          _keyword: $.keyword,
          nodeName: '#documentType',
          name: $.name,
          publicId: '',
          systemId: '',
          parentNode: null,
        },
        source: tpl`<!${$.keyword} ${$.name}>`,
      },
    }),

    // Recovery: malformed doctype with no closing `>` (e.g. EOF-truncated
    // `<!doctype broken`). Spans match the partial input — no terminator.
    // Recovery productions are tried only after every valid production
    // throws, so the well-formed shape above always wins on good input.
    relation('Doctype', {
      input: '<!DOCTYPE broken',
      status: { kind: 'recovered', recovery: { syncAt: ['>'], drop: 'incomplete-doctype' } },
      encodings: {
        parse: parse([
          literal('<!'),
          span('keyword', 'DOCTYPE').ident().oneOf(['DOCTYPE']),
          span('name', 'broken').ident().html(),
        ]),
        ast: {
          _kind: 'doctype-incomplete',
          _keyword: $.keyword,
          nodeName: '#documentType',
          name: $.name,
          publicId: '',
          systemId: '',
          parentNode: null,
        },
        source: tpl`<!${$.keyword} ${$.name}`,
      },
    }),

    // ===== Comment =================================================
    // Use punctuator-bracketed capture rather than `.comment().block()`
    // because the compiler's comment tokenizer is currently hardcoded to
    // `/* */`. The commentOpen/commentClose punctuators give us the boundary
    // we need; `.until('-->')` captures the body source slice preserving
    // whitespace (trim: false) to match parse5's `data` field.
    relation('Comment', {
      input: '<!-- hello -->',
      encodings: {
        parse: parse([
          literal('<!--'),
          span('data', ' hello ').until('-->', { trim: false }),
          literal('-->'),
        ]),
        ast: {
          nodeName: '#comment',
          data: $.data,
          parentNode: null,
        },
        source: tpl`<!--${$.data}-->`,
      },
    }),

    // ===== HtmlElement (multi-production) ==========================
    // Production 0: raw-text element. `<script>`, `<style>`, `<textarea>`,
    // `<title>` — bodies are opaque source until the literal close tag,
    // ignoring any `<` inside (JS, CSS, etc.). Must come BEFORE the void
    // and regular productions so dispatch tries it first for these tags.
    relation('HtmlElement', {
      input: '<script>js</script>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'script').ident().html().oneOf(RAW_TEXT_TAGS),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          // Span is named `children` (not `body`) so the source template is
          // structurally identical to the regular-element production. Per spec
          // rule 5 (value-stable round-trip) the inverse dispatcher accepts
          // identical-template productions — lowest-index wins. Both forms
          // produce the same source bytes for compatible inputs.
          span('children', 'js').rawUntil('</'),
          literal('</'),
          span('closeTag', 'script').ident().html().oneOf(RAW_TEXT_TAGS),
          literal('>'),
        ]),
        ast: {
          _kind: 'element-rawtext',
          _closeTag: $.closeTag,
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: [{ nodeName: '#text', value: $.children, parentNode: null }],
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</${$.closeTag}>`,
      },
    }),

    // Production 1: void element, no slash. `<br>`, `<meta charset="x">`.
    relation('HtmlElement', {
      input: '<br>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'br').ident().html().oneOf(VOID_TAGS),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
        ]),
        ast: {
          _kind: 'element-void',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: [],
          parentNode: null,
        },
        source: tpl`<${$.tag}>`,
      },
    }),

    // Production 2: void element with self-close slash. `<br />`, `<img src="x" />`.
    relation('HtmlElement', {
      input: '<br />',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'br').ident().html().oneOf(VOID_TAGS),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('/>'),
        ]),
        ast: {
          _kind: 'element-void-selfclose',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: [],
          parentNode: null,
        },
        source: tpl`<${$.tag} />`,
      },
    }),

    // ----- Recovery productions (tried only when valid productions fail) ----
    // Per WHATWG, HTML parsing is unfailing — any byte sequence yields some
    // DOM. The valid productions above cover well-formed HTML; the recoveries
    // below pick up the common malformed shapes that real-world input throws
    // at us. Each `.recovers({...})` production runs only after every valid
    // production has thrown.

    // Recovery 1: any self-closing custom tag (`<my-element/>`, `<div123/>`).
    // Valid void elements use the same shape but are restricted via
    // `.oneOf(VOID_TAGS)`. When the dispatcher routes a non-void tag through
    // the regular-element path (which then fails on `/>`), this recovery
    // kicks in and treats it as self-closed.
    relation('HtmlElement', {
      input: '<custom/>',
      status: { kind: 'recovered', recovery: { syncAt: ['>', '/>'], drop: 'self-closing-element' } },
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'custom').ident().html(),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('/>'),
        ]),
        ast: {
          _kind: 'element-selfclose-recovery',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: [],
          parentNode: null,
        },
        source: tpl`<${$.tag}/>`,
      },
    }),

    // Implicit-close productions. Tried before the regular element form so
    // dispatch routes by tag name first via .oneOf refinements. Each has no
    // close tag at all; the children list exits before consuming the next
    // sibling open or the enclosing list close (stopBefore literal prefixes).

    // <li>
    relation('HtmlElement', {
      input: '<li>x</li>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'li').ident().html().oneOf(['li']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: LI_STOPS }),
          // Optional explicit close. The `</li>` punctuator is multi-char so
          // .optional() either matches the whole `</li>` atomically or skips.
          // When stopBefore matched a sibling/list-close trigger instead, the
          // close is absent and we skip.
          literal('</li>').optional(),
        ]),
        ast: {
          _kind: 'element-li',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</li>`,
      },
    }),

    // <dt> / <dd>
    relation('HtmlElement', {
      input: '<dt>x</dt>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'dt').ident().html().oneOf(['dt', 'dd']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: DT_DD_STOPS }),
          // Either </dt> or </dd> may close (or neither, for implicit close).
          literal('</dt>').optional(),
          literal('</dd>').optional(),
        ]),
        ast: {
          _kind: 'element-dt-dd',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</dt>`,
      },
    }),

    // <tr>
    relation('HtmlElement', {
      input: '<tr>x</tr>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'tr').ident().html().oneOf(['tr']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: TR_STOPS }),
          literal('</tr>').optional(),
        ]),
        ast: {
          _kind: 'element-tr',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</tr>`,
      },
    }),

    // <td> / <th>
    relation('HtmlElement', {
      input: '<td>x</td>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'td').ident().html().oneOf(['td', 'th']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: TD_TH_STOPS }),
          literal('</td>').optional(),
          literal('</th>').optional(),
        ]),
        ast: {
          _kind: 'element-td-th',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</td>`,
      },
    }),

    // <p>
    relation('HtmlElement', {
      input: '<p>x</p>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'p').ident().html().oneOf(['p']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: P_STOPS }),
          literal('</p>').optional(),
        ]),
        ast: {
          _kind: 'element-p',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</p>`,
      },
    }),

    // <option> / <optgroup>
    relation('HtmlElement', {
      input: '<option>x</option>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'option').ident().html().oneOf(['option', 'optgroup']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: OPTION_STOPS }),
          literal('</option>').optional(),
          literal('</optgroup>').optional(),
        ]),
        ast: {
          _kind: 'element-option',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</option>`,
      },
    }),

    // <html> / <head> / <body> — close-tag can be omitted per HTML5.
    relation('HtmlElement', {
      input: '<html>x</html>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'html').ident().html().oneOf(['html']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: HTML_STOPS }),
          literal('</html>').optional(),
        ]),
        ast: {
          _kind: 'element-html',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</html>`,
      },
    }),

    relation('HtmlElement', {
      input: '<head>x</head>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'head').ident().html().oneOf(['head']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: HEAD_STOPS }),
          literal('</head>').optional(),
        ]),
        ast: {
          _kind: 'element-head',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</head>`,
      },
    }),

    // <tbody> / <thead> / <tfoot> — implicit closes between table sections.
    relation('HtmlElement', {
      input: '<tbody>x</tbody>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'tbody').ident().html().oneOf(['tbody']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: TBODY_STOPS }),
          literal('</tbody>').optional(),
        ]),
        ast: {
          _kind: 'element-tbody',
          nodeName: $.tag, tagName: $.tag, namespaceURI: HTML_NS,
          attrs: $.attrs, childNodes: $.children, parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</tbody>`,
      },
    }),

    relation('HtmlElement', {
      input: '<thead>x</thead>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'thead').ident().html().oneOf(['thead']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: THEAD_STOPS }),
          literal('</thead>').optional(),
        ]),
        ast: {
          _kind: 'element-thead',
          nodeName: $.tag, tagName: $.tag, namespaceURI: HTML_NS,
          attrs: $.attrs, childNodes: $.children, parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</thead>`,
      },
    }),

    relation('HtmlElement', {
      input: '<tfoot>x</tfoot>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'tfoot').ident().html().oneOf(['tfoot']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: TFOOT_STOPS }),
          literal('</tfoot>').optional(),
        ]),
        ast: {
          _kind: 'element-tfoot',
          nodeName: $.tag, tagName: $.tag, namespaceURI: HTML_NS,
          attrs: $.attrs, childNodes: $.children, parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</tfoot>`,
      },
    }),

    relation('HtmlElement', {
      input: '<body>x</body>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'body').ident().html().oneOf(['body']),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode')
            .repeats({ min: 0, stopBefore: BODY_STOPS }),
          literal('</body>').optional(),
        ]),
        ast: {
          _kind: 'element-body',
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</body>`,
      },
    }),

    // Production: regular element with children and close tag.
    relation('HtmlElement', {
      input: '<div>x</div>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'div').ident().html(),
          span('attrs', '').of('Attribute').repeats({ min: 0 }),
          literal('>'),
          span('children', 'x').of('Doctype', 'Comment', 'HtmlElement', 'TextNode').repeats({ min: 0 }),
          literal('</'),
          span('closeTag', 'div').ident().html(),
          literal('>'),
        ]),
        ast: {
          _kind: 'element',
          _closeTag: $.closeTag,
          nodeName: $.tag,
          tagName: $.tag,
          namespaceURI: HTML_NS,
          attrs: $.attrs,
          childNodes: $.children,
          parentNode: null,
        },
        source: tpl`<${$.tag}>${$.children}</${$.closeTag}>`,
      },
    }),

    // ===== TextNode ================================================
    // Use .rawUntil so we stop at ANY `<` character in source — covers
    // every tag-open form (`<`, `</`, `<!--`, `<!`, and the multi-char
    // close literals like `</li>`) with a single stop. Token-based .until
    // can't because it's limited to 3 stops by token value.
    relation('TextNode', {
      input: 'hello',
      encodings: {
        parse: parse([
          span('value', 'hello').rawUntil('<'),
        ]),
        ast: {
          nodeName: '#text',
          value: $.value,
          parentNode: null,
        },
        source: tpl`${$.value}`,
      },
    }),

    // ===== Attribute (multi-production) ============================
    // Each value-bearing production carries a `_quote` literal so the
    // inverse dispatcher routes to the original quoting style. Production 4
    // (boolean attribute) is already distinguishable via its literal
    // `value: ''` (the other productions emit `value` as a non-literal capture).
    //
    // Production 1: double-quoted value. `class="hero"`.
    relation('Attribute', {
      input: 'class="hero"',
      encodings: {
        parse: parse([
          span('name', 'class').ident().html(),
          literal('='),
          literal('"'),
          span('value', 'hero').until('"', { requireStop: true }),
          literal('"'),
        ]),
        ast: { _quote: 'double', name: $.name, value: $.value },
        source: tpl`${$.name}="${$.value}"`,
      },
    }),

    // Production 2: single-quoted value. `class='hero'`.
    relation('Attribute', {
      input: "class='hero'",
      encodings: {
        parse: parse([
          span('name', 'class').ident().html(),
          literal('='),
          literal("'"),
          span('value', 'hero').until("'", { requireStop: true }),
          literal("'"),
        ]),
        ast: { _quote: 'single', name: $.name, value: $.value },
        source: tpl`${$.name}='${$.value}'`,
      },
    }),

    // Production 3: unquoted value containing any non-whitespace chars.
    // `class=hero`, `lang=en-GB`, `href=https://x.test/y?z=1`.
    relation('Attribute', {
      input: 'class=hero',
      encodings: {
        parse: parse([
          span('name', 'class').ident().html(),
          literal('='),
          span('value', 'hero').rawUntil(UNQUOTED_VALUE_STOPS, { nonEmpty: true }),
        ]),
        ast: { _quote: 'none', name: $.name, value: $.value },
        source: tpl`${$.name}=${$.value}`,
      },
    }),

    // Production 4: boolean (presence-only) attribute. `disabled`.
    relation('Attribute', {
      input: 'disabled',
      encodings: {
        parse: parse([
          span('name', 'disabled').ident().html(),
        ]),
        ast: { name: $.name, value: '' },
        source: tpl`${$.name}`,
      },
    }),
  ],
});
