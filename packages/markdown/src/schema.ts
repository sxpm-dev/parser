import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { delimited } from './helpers.ts';

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
    relation('MarkdownDocument', {
      input: '# Release notes\nPlain paragraph',
      encodings: {
        parse: parse([
          // Children are dispatched across two roles: MarkdownLeaf (every
          // syntactically-distinct block — heading, list, fence, etc.) and
          // MarkdownParagraph (the catch-all). Splitting Paragraph out of
          // MarkdownLeaf lets the role dispatcher treat it as the fallthrough
          // — MarkdownLeaf's first-byte table handles every other production,
          // and any byte not in that table routes here.
          span('children', '# Release notes\nPlain paragraph').of('MarkdownLeaf', 'MarkdownParagraph')
            .repeats({ min: 0 }),
        ]),
        ast: { type: 'document', children: $.children },
        html: tpl`${$.children}`,
        source: tpl`${$.children}`,
      },
    }),

    // ---- ATX headings ----------------------------------------------------
    // Each depth has its own production so the dispatcher routes by the
    // longest-match heading punctuator. Text captures until newline.
    relation('MarkdownLeaf', {
      input: '###### Tiny heading',
      encodings: {
        parse: parse([
          literal('######'),
          span('text', 'Tiny heading').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'heading', depth: 6, text: $.text },
        html: tpl`<h6>${$.text}</h6>`,
        source: tpl`###### ${$.text}`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '##### Small section',
      encodings: {
        parse: parse([
          literal('#####'),
          span('text', 'Small section').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'heading', depth: 5, text: $.text },
        html: tpl`<h5>${$.text}</h5>`,
        source: tpl`##### ${$.text}`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '#### Deep section',
      encodings: {
        parse: parse([
          literal('####'),
          span('text', 'Deep section').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'heading', depth: 4, text: $.text },
        html: tpl`<h4>${$.text}</h4>`,
        source: tpl`#### ${$.text}`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '### API reference',
      encodings: {
        parse: parse([
          literal('###'),
          span('text', 'API reference').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'heading', depth: 3, text: $.text },
        html: tpl`<h3>${$.text}</h3>`,
        source: tpl`### ${$.text}`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '## Installation guide',
      encodings: {
        parse: parse([
          literal('##'),
          span('text', 'Installation guide').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'heading', depth: 2, text: $.text },
        html: tpl`<h2>${$.text}</h2>`,
        source: tpl`## ${$.text}`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '# Release notes',
      encodings: {
        parse: parse([
          literal('#'),
          span('text', 'Release notes').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'heading', depth: 1, text: $.text },
        html: tpl`<h1>${$.text}</h1>`,
        source: tpl`# ${$.text}`,
      },
    }),

    // ---- Setext heading --------------------------------------------------
    // First line captures the text; the underline literal that follows
    // tells us depth (=== → h1, --- → h2). Listed BEFORE Paragraph so the
    // dispatcher's fallthrough chain tries Setext first; if no underline
    // follows the text Paragraph picks up.
    relation('MarkdownLeaf', {
      input: 'Setext heading\n===',
      encodings: {
        parse: parse([
          span('text', 'Setext heading').until(HEADING_LINE_STOPS, { balanced: false }),
          literal('==='),
        ]),
        ast: { type: 'heading', depth: 1, text: $.text, style: 'setext' },
        html: tpl`<h1>${$.text}</h1>`,
        source: tpl`${$.text} ===`,
      },
    }),

    relation('MarkdownLeaf', {
      input: 'Setext heading\n---',
      encodings: {
        parse: parse([
          span('text', 'Setext heading').until(HEADING_LINE_STOPS, { balanced: false }),
          literal('---'),
        ]),
        ast: { type: 'heading', depth: 2, text: $.text, style: 'setext' },
        html: tpl`<h2>${$.text}</h2>`,
        source: tpl`${$.text} ---`,
      },
    }),

    // ---- Thematic breaks -------------------------------------------------
    // Listed BEFORE setext-with-`---` so the dispatcher's byte-prefix path
    // routes a bare `---` line to the break, not setext (which would
    // require a preceding text line we don't have).
    // (Dispatch order enforced mechanically by `checkDispatch` in
    // packages/compiler/src/check/dispatch.ts.)
    relation('MarkdownLeaf', {
      input: '***',
      encodings: {
        parse: parse([
          literal('***'),
        ]),
        ast: { type: 'thematic-break', marker: '*' },
        html: tpl`<hr>`,
        source: tpl`***`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '___',
      encodings: {
        parse: parse([
          literal('___'),
        ]),
        ast: { type: 'thematic-break', marker: '_' },
        html: tpl`<hr>`,
        source: tpl`___`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '---',
      encodings: {
        parse: parse([
          literal('---'),
        ]),
        ast: { type: 'thematic-break' },
        html: tpl`<hr>`,
        source: tpl`---`,
      },
    }),

    // ---- Task list items -------------------------------------------------
    // Listed before plain list-item-dash so `- [x]` / `- [ ]` are tried
    // first when the dispatcher routes by `-`. The full marker (`- [x]`)
    // is a single punctuator so the dispatcher's longest-match peek wins.
    relation('MarkdownLeaf', {
      input: '- [x] completed task',
      encodings: {
        parse: parse([
          literal('- [x]'),
          span('text', 'completed task').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'task-list-item', checked: true, marker: 'x', text: $.text },
        html: tpl`<li><input type="checkbox" checked>${$.text}</li>`,
        source: tpl`- [x] ${$.text}`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '- [ ] pending task',
      encodings: {
        parse: parse([
          literal('- [ ]'),
          span('text', 'pending task').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'task-list-item', checked: false, text: $.text },
        html: tpl`<li><input type="checkbox">${$.text}</li>`,
        source: tpl`- [ ] ${$.text}`,
      },
    }),

    // ---- Unordered list items --------------------------------------------
    // The `- ` / `+ ` / `* ` punctuators include the required space so
    // they don't collide with the thematic-break or bold/italic prefixes.
    // (Dispatch order enforced mechanically by `checkDispatch` in
    // packages/compiler/src/check/dispatch.ts.)
    relation('MarkdownLeaf', {
      input: '+ alternate marker',
      encodings: {
        parse: parse([
          literal('+ '),
          span('text', 'alternate marker').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'list-item', ordered: false, marker: '+', text: $.text },
        html: tpl`<li>${$.text}</li>`,
        source: tpl`+ ${$.text}`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '* star marker',
      encodings: {
        parse: parse([
          literal('* '),
          span('text', 'star marker').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'list-item', ordered: false, marker: '*', text: $.text },
        html: tpl`<li>${$.text}</li>`,
        source: tpl`* ${$.text}`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '- first item',
      encodings: {
        parse: parse([
          literal('- '),
          span('text', 'first item').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'list-item', ordered: false, text: $.text },
        html: tpl`<li>${$.text}</li>`,
        source: tpl`- ${$.text}`,
      },
    }),

    // ---- Ordered list item -----------------------------------------------
    // Number-prefixed so the role dispatcher routes via the digit branch.
    relation('MarkdownLeaf', {
      input: '1. ordered item',
      encodings: {
        parse: parse([
          span('index', '1').number().int(),
          literal('.'),
          span('text', 'ordered item').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'list-item', ordered: true, index: $.index, text: $.text },
        html: tpl`<li>${$.text}</li>`,
        source: tpl`${$.index}. ${$.text}`,
      },
    }),

    // ---- Block quote -----------------------------------------------------
    relation('MarkdownLeaf', {
      input: '> quoted text',
      encodings: {
        parse: parse([
          literal('>'),
          span('text', 'quoted text').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'blockquote', text: $.text },
        html: tpl`<blockquote>${$.text}</blockquote>`,
        source: tpl`> ${$.text}`,
      },
    }),

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
    relation('MarkdownLeaf', {
      input: '```js\nsample\n```',
      encodings: {
        parse: parse([
          literal('```'),
          span('lang', 'js').ident().css(),
          span('body', 'sample').until('```', { balanced: false }),
          literal('```'),
        ]),
        ast: { type: 'code-block', lang: $.lang, text: $.body },
        html: tpl`<pre><code class="lang-${$.lang}">${$.body}</code></pre>`,
        source: tpl`\`\`\`${$.lang} ${$.body} \`\`\``,
      },
    }),

    relation('MarkdownLeaf', {
      input: '```\nplain\n```',
      encodings: {
        parse: parse([
          literal('```\n'),
          span('body', 'plain').until('```', { balanced: false }),
          literal('```'),
        ]),
        ast: { type: 'code-block', text: $.body },
        html: tpl`<pre><code>${$.body}</code></pre>`,
        source: tpl`\`\`\`
${$.body} \`\`\``,
      },
    }),

    // ---- Inline-styled blocks --------------------------------------------
    // These appear at top-level when an author writes a one-line emphasis
    // (`**bold**` alone on its line). Mid-paragraph occurrences fall into
    // Paragraph's `.until(...)` slice as raw text — round-tripping the
    // source but not producing a structured inline node.
    delimited('MarkdownLeaf', '**', span('text', 'bold'), 'bold', 'strong'),
    delimited('MarkdownLeaf', '*', span('text', 'italic'), 'italic', 'em'),
    delimited('MarkdownLeaf', '~~', span('text', 'removed'), 'strikethrough', 's'),
    delimited('MarkdownLeaf', '`', span('text', 'code'), 'inline-code', 'code'),

    // ---- Links and images ------------------------------------------------
    // The link-label captures via `.until(']', { balanced: false })`; the URL slice captures
    // via `.until(')', { balanced: false })`. We render the URL verbatim — the test fixtures
    // exercise `https://example.com`-style URLs which don't need encoding.
    relation('MarkdownLeaf', {
      input: '[docs](https://example.com)',
      encodings: {
        parse: parse([
          literal('['),
          span('label', 'docs').until(']', { balanced: false }),
          literal(']'),
          literal('('),
          span('url', 'https://example.com').until(')', { balanced: false }),
          literal(')'),
        ]),
        ast: { type: 'link', label: $.label, url: $.url },
        html: tpl`<a href="${$.url}">${$.label}</a>`,
        source: tpl`[${$.label}](${$.url})`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '[docs][id]',
      encodings: {
        parse: parse([
          literal('['),
          span('label', 'docs').until(']', { balanced: false }),
          literal(']['),
          span('id', 'id').until(']', { balanced: false }),
          literal(']'),
        ]),
        ast: { type: 'reference-link', label: $.label, id: $.id },
        html: tpl`<a href="#${$.id}">${$.label}</a>`,
        source: tpl`[${$.label}][${$.id}]`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '![diagram](https://example.com/diagram.png)',
      encodings: {
        parse: parse([
          literal('!'),
          literal('['),
          span('alt', 'diagram').until(']', { balanced: false }),
          literal(']'),
          literal('('),
          span('url', 'https://example.com/diagram.png').until(')', { balanced: false }),
          literal(')'),
        ]),
        ast: { type: 'image', alt: $.alt, url: $.url },
        html: tpl`<img src="${$.url}" alt="${$.alt}">`,
        source: tpl`![${$.alt}](${$.url})`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '![diagram][image-id]',
      encodings: {
        parse: parse([
          literal('!'),
          literal('['),
          span('alt', 'diagram').until(']', { balanced: false }),
          literal(']['),
          span('id', 'image-id').until(']', { balanced: false }),
          literal(']'),
        ]),
        ast: { type: 'reference-image', alt: $.alt, id: $.id },
        html: tpl`<img src="#${$.id}" alt="${$.alt}">`,
        source: tpl`![${$.alt}][${$.id}]`,
      },
    }),

    // ---- Entity ----------------------------------------------------------
    relation('MarkdownLeaf', {
      input: '&amp;',
      encodings: {
        parse: parse([
          literal('&'),
          span('name', 'amp').ident().css(),
          literal(';'),
        ]),
        ast: { type: 'entity', name: $.name },
        html: tpl`&${$.name};`,
        source: tpl`&${$.name};`,
      },
    }),

    // ---- Table rows ------------------------------------------------------
    // A delimiter row matches `| --- | --- |` etc. — the `|---` punctuator
    // routes it before the generic table-row production tries its
    // `.until('|', { balanced: false })` cell capture. The delimiter row is recognized
    // structurally; we don't bother computing the alignment vector from
    // the source — every cell defaults to 'default'.
    relation('MarkdownLeaf', {
      input: '| --- | --- |',
      encodings: {
        parse: parse([
          literal('|'),
          literal('---'),
          literal('|'),
          literal('---'),
          literal('|'),
        ]),
        ast: { type: 'table-delimiter', variant: 'plain', align: ['default', 'default'] },
        html: tpl``,
        source: tpl`| --- | --- |`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '|:---|---:|',
      encodings: {
        parse: parse([
          literal('|'),
          literal(':'),
          literal('---'),
          literal('|'),
          literal('---'),
          literal(':'),
          literal('|'),
        ]),
        ast: { type: 'table-delimiter', variant: 'aligned', align: ['left', 'right'] },
        html: tpl``,
        source: tpl`|:---|---:|`,
      },
    }),

    relation('MarkdownLeaf', {
      input: '| name | value |',
      encodings: {
        parse: parse([
          literal('|'),
          span('first', 'name').until('|', { balanced: false }),
          literal('|'),
          span('second', 'value').until('|', { balanced: false }),
          literal('|'),
        ]),
        ast: { type: 'table-row', cells: [$.first, $.second] },
        html: tpl`<tr><td>${$.first}</td><td>${$.second}</td></tr>`,
        source: tpl`| ${$.first} | ${$.second} |`,
      },
    }),

    // ---- Link reference definition --------------------------------------
    // `[id]: url` lines define a reference target. The URL captures via
    // `.until('\n')` so it stops at end-of-line.
    relation('MarkdownLeaf', {
      input: '[id]: https://example.com',
      encodings: {
        parse: parse([
          literal('['),
          span('id', 'id').until(']', { balanced: false }),
          literal(']'),
          literal(':'),
          span('url', 'https://example.com').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'definition', id: $.id, url: $.url },
        html: tpl``,
        source: tpl`[${$.id}]: ${$.url}`,
      },
    }),

    // ---- Footnote definition --------------------------------------------
    // `[^id]: text`. Listed before the bare footnote-reference (`[^id]`)
    // production so the dispatcher tries the longer match first.
    relation('MarkdownLeaf', {
      input: '[^1]: footnote text',
      encodings: {
        parse: parse([
          literal('[^'),
          span('id', '1').until(']', { balanced: false }),
          literal(']'),
          literal(':'),
          span('text', 'footnote text').until(HEADING_LINE_STOPS, { balanced: false }),
        ]),
        ast: { type: 'footnote-definition', id: $.id, text: $.text },
        html: tpl`<div class="footnote" id="fn${$.id}">${$.text}</div>`,
        source: tpl`[^${$.id}]: ${$.text}`,
      },
    }),

    // ---- Footnote reference ---------------------------------------------
    relation('MarkdownLeaf', {
      input: '[^1]',
      encodings: {
        parse: parse([
          literal('[^'),
          span('id', '1').until(']', { balanced: false }),
          literal(']'),
        ]),
        ast: { type: 'footnote-reference', id: $.id },
        html: tpl`<sup><a href="#fn${$.id}">${$.id}</a></sup>`,
        source: tpl`[^${$.id}]`,
      },
    }),

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
    relation('MarkdownLeaf', {
      input: '<div>html</div>',
      encodings: {
        parse: parse([
          literal('<'),
          span('tag', 'div').ident().html().oneOf(HTML_BLOCK_TAGS),
          literal('>'),
          span('body', 'html').rawUntil('</'),
          literal('</'),
          span('closingTag', 'div').ident().html(),
          literal('>'),
        ]),
        ast: { type: 'html', tag: $.tag, text: $.body, closingTag: $.closingTag },
        html: tpl`<${$.tag}>${$.body}</${$.closingTag}>`,
        source: tpl`<${$.tag}>${$.body}</${$.closingTag}>`,
      },
    }),

    // ---- Autolink --------------------------------------------------------
    // Listed AFTER the HTML block so the dispatcher tries the longer
    // tag-shaped match first. The angle-bracketed URL captures via
    // `.until('>', { balanced: false })` — when the content has a tag name that's NOT in
    // HTML_BLOCK_TAGS (like `https`), the HTML block production fails and
    // autolink picks up via the dispatcher's fallback path.
    relation('MarkdownLeaf', {
      input: '<https://example.com>',
      encodings: {
        parse: parse([
          literal('<'),
          span('url', 'https://example.com').until('>', { balanced: false }),
          literal('>'),
        ]),
        ast: { type: 'autolink', url: $.url },
        // The `class="autolink"` literal is also a discriminator: the
        // explicit link production's template (`<a href="${$.url}">${$.label}</a>`)
        // shares the same segment shape; the unique `class="autolink"` literal
        // makes the inverse dispatcher able to tell them apart from the html
        // alone (precondition 2 in invert.ts).
        html: tpl`<a class="autolink" href="${$.url}">${$.url}</a>`,
        source: tpl`<${$.url}>`,
      },
    }),

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
    relation('MarkdownParagraph', {
      input: 'Plain paragraph',
      encodings: {
        parse: parse([
          span('text', 'Plain paragraph').until(PARAGRAPH_STOPS, { balanced: false }),
        ]),
        ast: { type: 'paragraph', text: $.text },
        html: tpl`<p>${$.text}</p>`,
        source: tpl`${$.text}`,
      },
    }),
  ],
});
