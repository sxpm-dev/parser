import { $, defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'markdown',
  rootType: 'MarkdownDocument',
  punctuators: {
    bold: '**',
    italic: '*',
    strike: '~~',
    fence: '```',
    thematic: '---',
    thematicStar: '***',
    thematicUnderscore: '___',
    hash: '#',
    dash: '-',
    plus: '+',
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
    ampersand: '&',
    semicolon: ';',
    equals: '=',
    quote: '"',
  },
  tokens: ['number'],
  examples: [
    // ---- Document -----------------------------------------------------
    // Markdown's package-level parser mirrors the finished CSS parser:
    // a generated root node owns an ordered recursive list of generated
    // child nodes. Package src/index.ts stays a facade over generated code.
    ex('# Release notes\nPlain paragraph')
      .as('MarkdownDocument')
      .span('children', '# Release notes\nPlain paragraph', 'MarkdownLeaf')
        .repeats({ min: 0 })
      .structure({ type: 'document', children: $.children })
      .build(),

    ex('# Release notes')
      .as('MarkdownLeaf')
      .span('#')
      .span('first', 'Release').ident().css()
      .span('second', 'notes').ident().css()
      .structure({ type: 'heading', depth: 1, text: [$.first, $.second] })
      .build(),

    ex('## Installation guide')
      .as('MarkdownLeaf')
      .span('##')
      .span('first', 'Installation').ident().css()
      .span('second', 'guide').ident().css()
      .structure({ type: 'heading', depth: 2, text: [$.first, $.second] })
      .build(),

    ex('### API reference')
      .as('MarkdownLeaf')
      .span('###')
      .span('first', 'API').ident().css()
      .span('second', 'reference').ident().css()
      .structure({ type: 'heading', depth: 3, text: [$.first, $.second] })
      .build(),

    ex('#### Deep section')
      .as('MarkdownLeaf')
      .span('####')
      .span('first', 'Deep').ident().css()
      .span('second', 'section').ident().css()
      .structure({ type: 'heading', depth: 4, text: [$.first, $.second] })
      .build(),

    ex('##### Small section')
      .as('MarkdownLeaf')
      .span('#####')
      .span('first', 'Small').ident().css()
      .span('second', 'section').ident().css()
      .structure({ type: 'heading', depth: 5, text: [$.first, $.second] })
      .build(),

    ex('###### Tiny heading')
      .as('MarkdownLeaf')
      .span('######')
      .span('first', 'Tiny').ident().css()
      .span('second', 'heading').ident().css()
      .structure({ type: 'heading', depth: 6, text: [$.first, $.second] })
      .build(),

    ex('Setext heading\n---')
      .as('MarkdownLeaf')
      .span('first', 'Setext').ident().css()
      .span('second', 'heading').ident().css()
      .span('---')
      .structure({ type: 'heading', depth: 2, text: [$.first, $.second], style: 'setext' })
      .build(),

    ex('Plain paragraph')
      .as('MarkdownLeaf')
      .span('first', 'Plain').ident().css()
      .span('second', 'paragraph').ident().css()
      .structure({ type: 'paragraph', text: [$.first, $.second] })
      .build(),

    ex('- first item')
      .as('MarkdownLeaf')
      .span('-')
      .span('first', 'first').ident().css()
      .span('second', 'item').ident().css()
      .structure({ type: 'list-item', ordered: false, text: [$.first, $.second] })
      .build(),

    ex('+ alternate marker')
      .as('MarkdownLeaf')
      .span('+')
      .span('first', 'alternate').ident().css()
      .span('second', 'marker').ident().css()
      .structure({ type: 'list-item', ordered: false, marker: '+', text: [$.first, $.second] })
      .build(),

    ex('* star marker')
      .as('MarkdownLeaf')
      .span('*')
      .span('first', 'star').ident().css()
      .span('second', 'marker').ident().css()
      .structure({ type: 'list-item', ordered: false, marker: '*', text: [$.first, $.second] })
      .build(),

    ex('1. ordered item')
      .as('MarkdownLeaf')
      .span('index', '1').number().int()
      .span('.')
      .span('first', 'ordered').ident().css()
      .span('second', 'item').ident().css()
      .structure({ type: 'list-item', ordered: true, index: $.index, text: [$.first, $.second] })
      .build(),

    ex('- [x] completed task')
      .as('MarkdownLeaf')
      .span('-')
      .span('[')
      .span('checked', 'x').ident().css()
      .span(']')
      .span('first', 'completed').ident().css()
      .span('second', 'task').ident().css()
      .structure({ type: 'task-list-item', checked: true, marker: $.checked, text: [$.first, $.second] })
      .build(),

    ex('- [ ] pending task')
      .as('MarkdownLeaf')
      .span('-')
      .span('[')
      .span(']')
      .span('first', 'pending').ident().css()
      .span('second', 'task').ident().css()
      .structure({ type: 'task-list-item', checked: false, text: [$.first, $.second] })
      .build(),

    ex('> quoted text')
      .as('MarkdownLeaf')
      .span('>')
      .span('first', 'quoted').ident().css()
      .span('second', 'text').ident().css()
      .structure({ type: 'blockquote', text: [$.first, $.second] })
      .build(),

    ex('---')
      .as('MarkdownLeaf')
      .span('---')
      .structure({ type: 'thematic-break' })
      .build(),

    ex('***')
      .as('MarkdownLeaf')
      .span('***')
      .structure({ type: 'thematic-break', marker: '*' })
      .build(),

    ex('___')
      .as('MarkdownLeaf')
      .span('___')
      .structure({ type: 'thematic-break', marker: '_' })
      .build(),

    ex('**bold**')
      .as('MarkdownLeaf')
      .span('**')
      .span('value', 'bold').ident().css()
      .span('**')
      .structure({ type: 'bold', text: $.value })
      .build(),

    ex('*italic*')
      .as('MarkdownLeaf')
      .span('*')
      .span('value', 'italic').ident().css()
      .span('*')
      .structure({ type: 'italic', text: $.value })
      .build(),

    ex('~~removed~~')
      .as('MarkdownLeaf')
      .span('~~')
      .span('value', 'removed').ident().css()
      .span('~~')
      .structure({ type: 'strikethrough', text: $.value })
      .build(),

    ex('`code`')
      .as('MarkdownLeaf')
      .span('`')
      .span('value', 'code').ident().css()
      .span('`')
      .structure({ type: 'inline-code', text: $.value })
      .build(),

    ex('[docs](https://example.com)')
      .as('MarkdownLeaf')
      .span('[')
      .span('label', 'docs').ident().css()
      .span(']')
      .span('(')
      .span('scheme', 'https').ident().css()
      .span(':')
      .span('/')
      .span('/')
      .span('host', 'example').ident().css()
      .span('.')
      .span('tld', 'com').ident().css()
      .span(')')
      .structure({ type: 'link', label: $.label, scheme: $.scheme, host: [$.host, $.tld] })
      .build(),

    ex('[docs][id]')
      .as('MarkdownLeaf')
      .span('[')
      .span('label', 'docs').ident().css()
      .span(']')
      .span('[')
      .span('id', 'id').ident().css()
      .span(']')
      .structure({ type: 'reference-link', label: $.label, id: $.id })
      .build(),

    ex('![diagram](https://example.com/diagram.png)')
      .as('MarkdownLeaf')
      .span('!')
      .span('[')
      .span('alt', 'diagram').ident().css()
      .span(']')
      .span('(')
      .span('scheme', 'https').ident().css()
      .span(':')
      .span('/')
      .span('/')
      .span('host', 'example').ident().css()
      .span('.')
      .span('tld', 'com').ident().css()
      .span('/')
      .span('path', 'diagram').ident().css()
      .span('.')
      .span('ext', 'png').ident().css()
      .span(')')
      .structure({ type: 'image', alt: $.alt, scheme: $.scheme, host: [$.host, $.tld], path: [$.path, $.ext] })
      .build(),

    ex('![diagram][image-id]')
      .as('MarkdownLeaf')
      .span('!')
      .span('[')
      .span('alt', 'diagram').ident().css()
      .span(']')
      .span('[')
      .span('id', 'image-id').ident().css()
      .span(']')
      .structure({ type: 'reference-image', alt: $.alt, id: $.id })
      .build(),

    ex('<https://example.com>')
      .as('MarkdownLeaf')
      .span('<')
      .span('scheme', 'https').ident().css()
      .span(':')
      .span('/')
      .span('/')
      .span('host', 'example').ident().css()
      .span('.')
      .span('tld', 'com').ident().css()
      .span('>')
      .structure({ type: 'autolink', scheme: $.scheme, host: [$.host, $.tld] })
      .build(),

    ex('&amp;')
      .as('MarkdownLeaf')
      .span('&')
      .span('name', 'amp').ident().css()
      .span(';')
      .structure({ type: 'entity', name: $.name })
      .build(),

    ex('```js\nsample\n```')
      .as('MarkdownLeaf')
      .span('```')
      .span('lang', 'js').ident().css()
      .span('body', 'sample').ident().css()
      .span('```')
      .structure({ type: 'code-block', lang: $.lang, text: $.body })
      .build(),

    ex('```\nplain\n```')
      .as('MarkdownLeaf')
      .span('```')
      .span('body', 'plain').ident().css()
      .span('```')
      .structure({ type: 'code-block', text: $.body })
      .build(),

    ex('| name | value |')
      .as('MarkdownLeaf')
      .span('|')
      .span('first', 'name').ident().css()
      .span('|')
      .span('second', 'value').ident().css()
      .span('|')
      .structure({ type: 'table-row', cells: [$.first, $.second] })
      .build(),

    ex('| --- | --- |')
      .as('MarkdownLeaf')
      .span('|')
      .span('---')
      .span('|')
      .span('---')
      .span('|')
      .structure({ type: 'table-delimiter', align: ['default', 'default'] })
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
      .build(),

    ex('[id]: https://example.com')
      .as('MarkdownLeaf')
      .span('[')
      .span('id', 'id').ident().css()
      .span(']')
      .span(':')
      .span('scheme', 'https').ident().css()
      .span(':')
      .span('/')
      .span('/')
      .span('host', 'example').ident().css()
      .span('.')
      .span('tld', 'com').ident().css()
      .structure({ type: 'definition', id: $.id, scheme: $.scheme, host: [$.host, $.tld] })
      .build(),

    ex('[^1]: footnote text')
      .as('MarkdownLeaf')
      .span('[')
      .span('^')
      .span('id', '1').number().int()
      .span(']')
      .span(':')
      .span('first', 'footnote').ident().css()
      .span('second', 'text').ident().css()
      .structure({ type: 'footnote-definition', id: $.id, text: [$.first, $.second] })
      .build(),

    ex('[^1]')
      .as('MarkdownLeaf')
      .span('[')
      .span('^')
      .span('id', '1').number().int()
      .span(']')
      .structure({ type: 'footnote-reference', id: $.id })
      .build(),

    ex('<div>html</div>')
      .as('MarkdownLeaf')
      .span('<')
      .span('tag', 'div').ident().css()
      .span('>')
      .span('body', 'html').ident().css()
      .span('<')
      .span('/')
      .span('closingTag', 'div').ident().css()
      .span('>')
      .structure({ type: 'html', tag: $.tag, text: $.body, closingTag: $.closingTag })
      .build(),
  ],
});
