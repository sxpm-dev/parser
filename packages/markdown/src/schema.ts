import { $, defineSchema, ex, tpl } from '@parser2/parser';

// CommonMark-ish markdown schema. All block productions live under the
// MarkdownLeaf umbrella role so MarkdownDocument's children loop dispatches
// across them by first-byte prefix. Each block captures its inline content
// as a single source slice via `.until(...)`; the slice is preserved
// verbatim through render(html) (entities/inlines inside paragraphs render
// as raw text rather than recursively-parsed inline nodes — that pass would
// require either a separate inline parser or DSL support for newline-
// sensitive repeats which we don't have today).
//
// Dispatch strategy:
//   - Each block's first span is a literal punctuator (`#`, `>`, `-`, etc.)
//     wherever possible so the byte-prefix dispatcher can route directly.
//   - Inline-styled blocks (`**bold**`, `*italic*`, `` `code` ``, etc.)
//     appear as their own block productions for backwards compatibility
//     with the prior schema; when those tokens appear MID-paragraph the
//     surrounding paragraph swallows them as raw text.
//   - Paragraph is the last fallback — its first span is a `.until(...)`
//     with no fixed literal, so it has no first-byte signature and the
//     role dispatcher routes any byte not claimed by another production
//     through it.
//
// Paragraph delimiters: a paragraph runs until a blank line (`\n\n`) OR
// until the start of the next block (e.g. `\n#`, `\n- `, `\n> `). The
// multi-char `\n<starter>` stops let real-world markdown — where authors
// often skip the blank line before a heading or list — still parse
// correctly without swallowing the next block.

// All multi-char stops that indicate the end of a paragraph (the start of
// the next block). Anything that starts with one of these byte-pairs at
// the beginning of a line ends the current paragraph capture.
const PARAGRAPH_STOPS = [
  '\n\n',     // blank line
  '\n#',      // ATX heading
  '\n>',      // blockquote
  '\n- ',     // dash list item (with required space)
  '\n-\n',    // empty dash bullet
  '\n+ ',     // plus list item
  '\n* ',     // star list item
  '\n```',    // fenced code
  '\n|',      // table row
  '\n---',    // thematic break or setext underline
  '\n***',    // thematic break
  '\n___',    // thematic break
  '\n===',    // setext h1 underline
  '\n[',      // definition or footnote-def
] as const;

// Stops for a setext-heading's first line capture. The line ends at `\n`,
// and the production then requires a `===` or `---` underline. If the
// underline isn't there the production fails and Paragraph takes over.
const HEADING_LINE_STOPS = ['\n'] as const;

// Whitelist of tag names that route to the HtmlBlock production. Limited
// to common block-level HTML so that angle-bracketed content with the
// same first-byte signature (autolink: `<https://...>`) can fall through
// to its own production when the tag isn't a recognized HTML element.
const HTML_BLOCK_TAGS = [
  'div', 'span', 'p', 'pre', 'code', 'blockquote', 'a', 'img', 'br', 'hr',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd', 'table', 'thead', 'tbody', 'tfoot',
  'tr', 'td', 'th', 'caption', 'figure', 'figcaption', 'section', 'article',
  'header', 'footer', 'nav', 'aside', 'main', 'address', 'details', 'summary',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'em', 'strong', 'i', 'b', 'u', 's', 'small', 'sub', 'sup',
  'kbd', 'var', 'samp', 'cite', 'q', 'dfn', 'abbr', 'time',
  'mark', 'ruby', 'rt', 'rp', 'bdi', 'bdo', 'wbr',
  'form', 'input', 'button', 'select', 'option', 'optgroup', 'textarea',
  'label', 'fieldset', 'legend', 'datalist', 'output', 'progress', 'meter',
  'video', 'audio', 'source', 'track', 'canvas', 'svg', 'math',
  'iframe', 'embed', 'object', 'param', 'picture',
  'script', 'style', 'noscript', 'template',
  'html', 'head', 'body', 'title', 'meta', 'link', 'base',
] as const;

export default defineSchema({
  rootType: 'MarkdownDocument',
  // Newlines are already counted as whitespace by the runtime — we don't
  // need a `\n` punctuator. The punctuators below cover the multi-char
  // markers we dispatch on (heading hashes, fence, thematic breaks) so
  // they tokenize as a single unit and the dispatcher can do longest-
  // match peeks.
  punctuators: {
    h6: '######',
    h5: '#####',
    h4: '####',
    h3: '###',
    h2: '##',
    h1: '#',
    bold: '**',
    italic: '*',
    strike: '~~',
    // 'fenceBare' is `\`\`\`` immediately followed by a newline — used by
    // the no-lang fenced code block to consume the open fence + LF in one
    // shot so the body scan starts on the next line. The non-LF `\`\`\``
    // variant ('fence') drives the with-lang form, where an info string
    // follows the open fence on the same line.
    fenceBare: '```\n',
    fence: '```',
    thematic: '---',
    thematicStar: '***',
    thematicUnderscore: '___',
    setextH1: '===',
    taskChecked: '- [x]',
    taskUnchecked: '- [ ]',
    dashSpace: '- ',
    plusSpace: '+ ',
    starSpace: '* ',
    refBracket: '][',
    footnoteOpen: '[^',
    autolinkOpen: '<',
    bang: '!',
    pipe: '|',
    gt: '>',
    backtick: '`',
    lbracket: '[',
    rbracket: ']',
    lparen: '(',
    rparen: ')',
    dot: '.',
    slash: '/',
    colon: ':',
    caret: '^',
    lt: '<',
    rt: '>',
    ampersand: '&',
    semicolon: ';',
    equals: '=',
    quote: '"',
    minus: '-',
    plus: '+',
    star: '*',
    underscore: '_',
    tilde: '~',
    space: ' ',
  },
  // 'number' so the tokenizer recognizes digit runs for ordered-list
  // markers (`1.`, `42.`). Other classes are consumed via `.until()` source
  // slices and don't require a token class.
  tokens: ['number'],
  // Markdown text is content-permissive: it may include arbitrary unicode,
  // emojis, em-dashes, etc. Tolerate unknown chars so `.until()` captures
  // can span them without the tokenizer rejecting at offset.
  unknownChars: 'tolerate',
  examples: [
    // ---- Document --------------------------------------------------------
    // Root container; children is a recursive list of MarkdownLeaf. The
    // child-loop's inter-iteration ws-skip eats blank lines between blocks.
    ex('# Release notes\nPlain paragraph')
      .as('MarkdownDocument')
      // Children are dispatched across two roles: MarkdownLeaf (every
      // syntactically-distinct block — heading, list, fence, etc.) and
      // MarkdownParagraph (the catch-all). Splitting Paragraph out of
      // MarkdownLeaf lets the role dispatcher treat it as the fallthrough
      // — MarkdownLeaf's first-byte table handles every other production,
      // and any byte not in that table routes here.
      .span('children', '# Release notes\nPlain paragraph', ['MarkdownLeaf', 'MarkdownParagraph'])
        .repeats({ min: 0 })
      .structure({ type: 'document', children: $.children })
      .stringify('html', tpl`${$.children}`)
      .build(),

    // ---- ATX headings ----------------------------------------------------
    // Each depth has its own production so the dispatcher routes by the
    // longest-match heading punctuator. Text captures until newline.
    ex('###### Tiny heading')
      .as('MarkdownLeaf')
      .span('######')
      .span('text', 'Tiny heading').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'heading', depth: 6, text: $.text })
      .stringify('html', tpl`<h6>${$.text}</h6>`)
      .build(),

    ex('##### Small section')
      .as('MarkdownLeaf')
      .span('#####')
      .span('text', 'Small section').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'heading', depth: 5, text: $.text })
      .stringify('html', tpl`<h5>${$.text}</h5>`)
      .build(),

    ex('#### Deep section')
      .as('MarkdownLeaf')
      .span('####')
      .span('text', 'Deep section').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'heading', depth: 4, text: $.text })
      .stringify('html', tpl`<h4>${$.text}</h4>`)
      .build(),

    ex('### API reference')
      .as('MarkdownLeaf')
      .span('###')
      .span('text', 'API reference').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'heading', depth: 3, text: $.text })
      .stringify('html', tpl`<h3>${$.text}</h3>`)
      .build(),

    ex('## Installation guide')
      .as('MarkdownLeaf')
      .span('##')
      .span('text', 'Installation guide').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'heading', depth: 2, text: $.text })
      .stringify('html', tpl`<h2>${$.text}</h2>`)
      .build(),

    ex('# Release notes')
      .as('MarkdownLeaf')
      .span('#')
      .span('text', 'Release notes').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'heading', depth: 1, text: $.text })
      .stringify('html', tpl`<h1>${$.text}</h1>`)
      .build(),

    // ---- Setext heading --------------------------------------------------
    // First line captures the text; the underline literal that follows
    // tells us depth (=== → h1, --- → h2). Listed BEFORE Paragraph so the
    // dispatcher's fallthrough chain tries Setext first; if no underline
    // follows the text Paragraph picks up.
    ex('Setext heading\n===')
      .as('MarkdownLeaf')
      .span('text', 'Setext heading').until(HEADING_LINE_STOPS, { balanced: false })
      .span('===')
      .structure({ type: 'heading', depth: 1, text: $.text, style: 'setext' })
      .stringify('html', tpl`<h1>${$.text}</h1>`)
      .build(),

    ex('Setext heading\n---')
      .as('MarkdownLeaf')
      .span('text', 'Setext heading').until(HEADING_LINE_STOPS, { balanced: false })
      .span('---')
      .structure({ type: 'heading', depth: 2, text: $.text, style: 'setext' })
      .stringify('html', tpl`<h2>${$.text}</h2>`)
      .build(),

    // ---- Thematic breaks -------------------------------------------------
    // Listed BEFORE setext-with-`---` so the dispatcher's byte-prefix path
    // routes a bare `---` line to the break, not setext (which would
    // require a preceding text line we don't have).
    ex('---')
      .as('MarkdownLeaf')
      .span('---')
      .structure({ type: 'thematic-break' })
      .stringify('html', tpl`<hr>`)
      .build(),

    ex('***')
      .as('MarkdownLeaf')
      .span('***')
      .structure({ type: 'thematic-break', marker: '*' })
      .stringify('html', tpl`<hr>`)
      .build(),

    ex('___')
      .as('MarkdownLeaf')
      .span('___')
      .structure({ type: 'thematic-break', marker: '_' })
      .stringify('html', tpl`<hr>`)
      .build(),

    // ---- Task list items -------------------------------------------------
    // Listed before plain list-item-dash so `- [x]` / `- [ ]` are tried
    // first when the dispatcher routes by `-`. The full marker (`- [x]`)
    // is a single punctuator so the dispatcher's longest-match peek wins.
    ex('- [x] completed task')
      .as('MarkdownLeaf')
      .span('- [x]')
      .span('text', 'completed task').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'task-list-item', checked: true, marker: 'x', text: $.text })
      .stringify('html', tpl`<li><input type="checkbox" checked>${$.text}</li>`)
      .build(),

    ex('- [ ] pending task')
      .as('MarkdownLeaf')
      .span('- [ ]')
      .span('text', 'pending task').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'task-list-item', checked: false, text: $.text })
      .stringify('html', tpl`<li><input type="checkbox">${$.text}</li>`)
      .build(),

    // ---- Unordered list items --------------------------------------------
    // The `- ` / `+ ` / `* ` punctuators include the required space so
    // they don't collide with the thematic-break or bold/italic prefixes.
    ex('- first item')
      .as('MarkdownLeaf')
      .span('- ')
      .span('text', 'first item').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'list-item', ordered: false, text: $.text })
      .stringify('html', tpl`<li>${$.text}</li>`)
      .build(),

    ex('+ alternate marker')
      .as('MarkdownLeaf')
      .span('+ ')
      .span('text', 'alternate marker').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'list-item', ordered: false, marker: '+', text: $.text })
      .stringify('html', tpl`<li>${$.text}</li>`)
      .build(),

    ex('* star marker')
      .as('MarkdownLeaf')
      .span('* ')
      .span('text', 'star marker').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'list-item', ordered: false, marker: '*', text: $.text })
      .stringify('html', tpl`<li>${$.text}</li>`)
      .build(),

    // ---- Ordered list item -----------------------------------------------
    // Number-prefixed so the role dispatcher routes via the digit branch.
    ex('1. ordered item')
      .as('MarkdownLeaf')
      .span('index', '1').number().int()
      .span('.')
      .span('text', 'ordered item').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'list-item', ordered: true, index: $.index, text: $.text })
      .stringify('html', tpl`<li>${$.text}</li>`)
      .build(),

    // ---- Block quote -----------------------------------------------------
    ex('> quoted text')
      .as('MarkdownLeaf')
      .span('>')
      .span('text', 'quoted text').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'blockquote', text: $.text })
      .stringify('html', tpl`<blockquote>${$.text}</blockquote>`)
      .build(),

    // ---- Fenced code block -----------------------------------------------
    // Two productions sharing the ``` opener:
    //   1. with info string: ```lang\nbody\n```
    //   2. without info string: ```\nbody\n```
    // The compiler's dispatcher tries (1) first via speculation; when
    // there's no info string, the `.ident()` lang scan fails immediately
    // (the first non-fence char is `\n`, not an ident-start byte), causing
    // the dispatcher to fall through to (2).
    //
    // Body uses `.until('```', { balanced: false })` so the until-loop's
    // built-in leading/trailing ws-trim collapses the wrapping newlines
    // — matching the test expectation of `'sample'` (not `'\nsample\n'`).
    ex('```js\nsample\n```')
      .as('MarkdownLeaf')
      .span('```')
      .span('lang', 'js').ident().css()
      .span('body', 'sample').until('```', { balanced: false })
      .span('```')
      .structure({ type: 'code-block', lang: $.lang, text: $.body })
      .stringify('html', tpl`<pre><code class="lang-${$.lang}">${$.body}</code></pre>`)
      .build(),

    ex('```\nplain\n```')
      .as('MarkdownLeaf')
      .span('```\n')
      .span('body', 'plain').until('```', { balanced: false })
      .span('```')
      .structure({ type: 'code-block', text: $.body })
      .stringify('html', tpl`<pre><code>${$.body}</code></pre>`)
      .build(),

    // ---- Inline-styled blocks --------------------------------------------
    // These appear at top-level when an author writes a one-line emphasis
    // (`**bold**` alone on its line). Mid-paragraph occurrences fall into
    // Paragraph's `.until(...)` slice as raw text — round-tripping the
    // source but not producing a structured inline node.
    ex('**bold**')
      .as('MarkdownLeaf')
      .span('**')
      .span('text', 'bold').until('**', { balanced: false })
      .span('**')
      .structure({ type: 'bold', text: $.text })
      .stringify('html', tpl`<strong>${$.text}</strong>`)
      .build(),

    ex('*italic*')
      .as('MarkdownLeaf')
      .span('*')
      .span('text', 'italic').until('*', { balanced: false })
      .span('*')
      .structure({ type: 'italic', text: $.text })
      .stringify('html', tpl`<em>${$.text}</em>`)
      .build(),

    ex('~~removed~~')
      .as('MarkdownLeaf')
      .span('~~')
      .span('text', 'removed').until('~~', { balanced: false })
      .span('~~')
      .structure({ type: 'strikethrough', text: $.text })
      .stringify('html', tpl`<s>${$.text}</s>`)
      .build(),

    ex('`code`')
      .as('MarkdownLeaf')
      .span('`')
      .span('text', 'code').until('`', { balanced: false })
      .span('`')
      .structure({ type: 'inline-code', text: $.text })
      .stringify('html', tpl`<code>${$.text}</code>`)
      .build(),

    // ---- Links and images ------------------------------------------------
    // The link-label captures via `.until(']', { balanced: false })`; the URL slice captures
    // via `.until(')', { balanced: false })`. We render the URL verbatim — the test fixtures
    // exercise `https://example.com`-style URLs which don't need encoding.
    ex('[docs](https://example.com)')
      .as('MarkdownLeaf')
      .span('[')
      .span('label', 'docs').until(']', { balanced: false })
      .span(']')
      .span('(')
      .span('url', 'https://example.com').until(')', { balanced: false })
      .span(')')
      .structure({ type: 'link', label: $.label, url: $.url })
      .stringify('html', tpl`<a href="${$.url}">${$.label}</a>`)
      .build(),

    ex('[docs][id]')
      .as('MarkdownLeaf')
      .span('[')
      .span('label', 'docs').until(']', { balanced: false })
      .span('][')
      .span('id', 'id').until(']', { balanced: false })
      .span(']')
      .structure({ type: 'reference-link', label: $.label, id: $.id })
      .stringify('html', tpl`<a href="#${$.id}">${$.label}</a>`)
      .build(),

    ex('![diagram](https://example.com/diagram.png)')
      .as('MarkdownLeaf')
      .span('!')
      .span('[')
      .span('alt', 'diagram').until(']', { balanced: false })
      .span(']')
      .span('(')
      .span('url', 'https://example.com/diagram.png').until(')', { balanced: false })
      .span(')')
      .structure({ type: 'image', alt: $.alt, url: $.url })
      .stringify('html', tpl`<img src="${$.url}" alt="${$.alt}">`)
      .build(),

    ex('![diagram][image-id]')
      .as('MarkdownLeaf')
      .span('!')
      .span('[')
      .span('alt', 'diagram').until(']', { balanced: false })
      .span('][')
      .span('id', 'image-id').until(']', { balanced: false })
      .span(']')
      .structure({ type: 'reference-image', alt: $.alt, id: $.id })
      .stringify('html', tpl`<img src="#${$.id}" alt="${$.alt}">`)
      .build(),

    // ---- Entity ----------------------------------------------------------
    ex('&amp;')
      .as('MarkdownLeaf')
      .span('&')
      .span('name', 'amp').ident().css()
      .span(';')
      .structure({ type: 'entity', name: $.name })
      .stringify('html', tpl`&${$.name};`)
      .build(),

    // ---- Table rows ------------------------------------------------------
    // A delimiter row matches `| --- | --- |` etc. — the `|---` punctuator
    // routes it before the generic table-row production tries its
    // `.until('|', { balanced: false })` cell capture. The delimiter row is recognized
    // structurally; we don't bother computing the alignment vector from
    // the source — every cell defaults to 'default'.
    ex('| --- | --- |')
      .as('MarkdownLeaf')
      .span('|')
      .span('---')
      .span('|')
      .span('---')
      .span('|')
      .structure({ type: 'table-delimiter', align: ['default', 'default'] })
      .stringify('html', tpl``)
      .build(),

    ex('|:---|---:|')
      .as('MarkdownLeaf')
      .span('|')
      .span(':')
      .span('---')
      .span('|')
      .span('---')
      .span(':')
      .span('|')
      .structure({ type: 'table-delimiter', align: ['left', 'right'] })
      .stringify('html', tpl``)
      .build(),

    ex('| name | value |')
      .as('MarkdownLeaf')
      .span('|')
      .span('first', 'name').until('|', { balanced: false })
      .span('|')
      .span('second', 'value').until('|', { balanced: false })
      .span('|')
      .structure({ type: 'table-row', cells: [$.first, $.second] })
      .stringify('html', tpl`<tr><td>${$.first}</td><td>${$.second}</td></tr>`)
      .build(),

    // ---- Link reference definition --------------------------------------
    // `[id]: url` lines define a reference target. The URL captures via
    // `.until('\n')` so it stops at end-of-line.
    ex('[id]: https://example.com')
      .as('MarkdownLeaf')
      .span('[')
      .span('id', 'id').until(']', { balanced: false })
      .span(']')
      .span(':')
      .span('url', 'https://example.com').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'definition', id: $.id, url: $.url })
      .stringify('html', tpl``)
      .build(),

    // ---- Footnote definition --------------------------------------------
    // `[^id]: text`. Listed before the bare footnote-reference (`[^id]`)
    // production so the dispatcher tries the longer match first.
    ex('[^1]: footnote text')
      .as('MarkdownLeaf')
      .span('[^')
      .span('id', '1').until(']', { balanced: false })
      .span(']')
      .span(':')
      .span('text', 'footnote text').until(HEADING_LINE_STOPS, { balanced: false })
      .structure({ type: 'footnote-definition', id: $.id, text: $.text })
      .stringify('html', tpl`<div class="footnote" id="fn${$.id}">${$.text}</div>`)
      .build(),

    // ---- Footnote reference ---------------------------------------------
    ex('[^1]')
      .as('MarkdownLeaf')
      .span('[^')
      .span('id', '1').until(']', { balanced: false })
      .span(']')
      .structure({ type: 'footnote-reference', id: $.id })
      .stringify('html', tpl`<sup><a href="#fn${$.id}">${$.id}</a></sup>`)
      .build(),

    // ---- HTML block ------------------------------------------------------
    // Generic `<tag>...</tag>` block. The body captures verbatim until
    // the closing `</`. The tag name is `.oneOf(HTML_TAGS)` so that an
    // angle-bracketed URL (`<https://...>`) — which has the same first-byte
    // signature — doesn't get routed here. Anything not in the allow-list
    // falls through to autolink.
    //
    // Listed BEFORE the autolink production so the dispatcher tries the
    // longer HTML match first for `<div>...</div>` — autolink would
    // otherwise greedily capture `div` as the URL and leave the body
    // unparsed.
    ex('<div>html</div>')
      .as('MarkdownLeaf')
      .span('<')
      .span('tag', 'div').ident().html().oneOf(HTML_BLOCK_TAGS)
      .span('>')
      .span('body', 'html').rawUntil('</')
      .span('</')
      .span('closingTag', 'div').ident().html()
      .span('>')
      .structure({ type: 'html', tag: $.tag, text: $.body, closingTag: $.closingTag })
      .stringify('html', tpl`<${$.tag}>${$.body}</${$.closingTag}>`)
      .build(),

    // ---- Autolink --------------------------------------------------------
    // Listed AFTER the HTML block so the dispatcher tries the longer
    // tag-shaped match first. The angle-bracketed URL captures via
    // `.until('>', { balanced: false })` — when the content has a tag name that's NOT in
    // HTML_BLOCK_TAGS (like `https`), the HTML block production fails and
    // autolink picks up via the dispatcher's fallback path.
    ex('<https://example.com>')
      .as('MarkdownLeaf')
      .span('<')
      .span('url', 'https://example.com').until('>', { balanced: false })
      .span('>')
      .structure({ type: 'autolink', url: $.url })
      .stringify('html', tpl`<a href="${$.url}">${$.url}</a>`)
      .build(),

    // ---- Paragraph (fallback role) --------------------------------------
    // Its OWN node type (separate from MarkdownLeaf) so the document's
    // role-dispatcher routes any byte not claimed by a MarkdownLeaf
    // production through MarkdownParagraph. Paragraph captures source
    // until a blank line OR until the start of a new block — the
    // PARAGRAPH_STOPS array enumerates each block-starting byte pair
    // (`\n#`, `\n>`, `\n- `, etc.) so a paragraph that runs into a new
    // block without a blank line between them still terminates at the
    // right place.
    //
    // The first span sets `text` to the example string (required by the
    // schema validator) but the until modifier means the dispatcher's
    // first-byte predicate is bypassed via the role-dispatcher's
    // fallthrough path (firstTokenForRole returns null for until spans).
    ex('Plain paragraph')
      .as('MarkdownParagraph')
      .span('text', 'Plain paragraph').until(PARAGRAPH_STOPS, { balanced: false })
      .structure({ type: 'paragraph', text: $.text })
      .stringify('html', tpl`<p>${$.text}</p>`)
      .build(),
  ],
});
