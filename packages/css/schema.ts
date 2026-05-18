import { defineSchema, ex } from '@parser2/parser';
import { generateCssParser } from './src/generator.ts';

export default defineSchema({
  name: 'css',
  generate: generateCssParser,
  examples: [
    ex('.foo { color: red; }')
      .token('delim', '.')
      .token('ident', 'foo')
      .token('whitespace', ' ')
      .token('lbrace', '{')
      .token('whitespace', ' ')
      .token('ident', 'color')
      .token('colon', ':')
      .token('whitespace', ' ')
      .token('ident', 'red')
      .token('semicolon', ';')
      .token('whitespace', ' ')
      .token('rbrace', '}')
      .node('stylesheet', (sheet) => sheet
        .node('rule', (rule) => rule
          .field('selector', '.foo')
          .node('decl', (decl) => decl.field('prop', 'color').field('value', 'red'))))
      .build(),
    ex('@media screen { .foo:hover { margin: calc(100% - 1px); } }')
      .token('atKeyword', '@media')
      .node('stylesheet', (sheet) => sheet
        .node('atrule', (media) => media
          .field('name', 'media')
          .field('prelude', 'screen')
          .node('rule', (rule) => rule
            .field('selector', '.foo:hover')
            .node('decl', (decl) => decl.field('prop', 'margin').field('value', 'calc(100% - 1px)')))))
      .build(),
  ],
});
