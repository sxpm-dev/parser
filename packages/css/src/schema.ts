import { defineSchema, list, text } from '../../compiler/src/schema.ts';

// Each example pairs source with the result the author wants. The compiler
// discovers literals, capture placement, list separators and inverse layout.
const declaration = { property: 'color', value: 'red' };
const rule = { selectors: ['.button', '#button'], children: [declaration] };
const children = ['customProperty', 'declaration', 'atBlock', 'atStatement', 'rule'];
const name = String.raw`(?:--|[-_a-zA-Z\u0080-\uFFFF])(?:[-_a-zA-Z0-9\u0080-\uFFFF]|\\[^\r\n])*`;

export default defineSchema({
  input: 'css', output: 'object', root: 'stylesheet',
  lexical: {
    pairs: [['(', ')'], ['[', ']'], ['{', '}']],
    commentFree: ['url(', 'urL(', 'uRl(', 'uRL(', 'Url(', 'UrL(', 'URl(', 'URL(']
      .map(open => [open, ')'] as [string, string]),
    quotes: ['"', "'"], escape: '\\', comments: [['/*', '*/']],
  },
  encodings: { json: { from: 'object', format: 'json' } },
  productions: {
    declaration: {
      examples: [
        { css: 'color: red;', object: declaration },
        { css: 'margin: 12px;', object: { property: 'margin', value: '12px' } },
      ],
      fields: {
        property: text({ pattern: name, reject: [';', '{', '}'] }),
        value: text({ balanced: true, reject: ['{'], allowEmpty: true }),
      },
      optionalEnd: ['}'],
    },
    customProperty: {
      examples: [{ css: '--theme: { accent: blue; };', object: { property: '--theme', value: '{ accent: blue; }' } }],
      fields: {
        property: text({ prefix: ['--'], pattern: '--[-_a-zA-Z0-9\\u0080-\\uFFFF]+', reject: [';', '{', '}'] }),
        value: text({ balanced: true, allowEmpty: true }),
      },
      optionalEnd: ['}'],
    },
    rule: {
      examples: [{ css: '.button, #button { color: red; }', object: rule }],
      fields: {
        selectors: list(text({ balanced: true, pattern: '(?![@$])[\\s\\S]+', reject: [';', '}'] }), { min: 1 }),
        children: list(children),
      },
    },
    atBlock: {
      examples: [{ css: '@media screen { .button, #button { color: red; } }', object: { prelude: '@media screen', children: [rule] } }],
      fields: {
        prelude: text({ balanced: true, prefix: ['@'], pattern: '@[-_a-zA-Z][\\s\\S]*', reject: [';', '}'] }),
        children: list(children),
      },
    },
    atStatement: {
      examples: [{ css: '@import "base.css";', object: { statement: '@import "base.css"' } }],
      fields: { statement: text({ balanced: true, prefix: ['@'], pattern: '@[-_a-zA-Z][\\s\\S]*', reject: ['{', '}'] }) },
    },
    stylesheet: {
      examples: [{ css: '.button, #button { color: red; }', object: { children: [rule] } }],
      fields: { children: list(['atBlock', 'atStatement', 'rule']) },
    },
  },
});
