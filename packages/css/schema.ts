import { defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'css',
  standard: {
    name: 'CSS Syntax Module',
    version: 'Level 3',
    url: 'https://www.w3.org/TR/css-syntax-3/',
    conformanceSuite: 'https://wpt.fyi/css/css-syntax/',
  },
  rules: [
    ex.rule('stylesheet')
      .from('%rule*%').node('stylesheet'),
    ex.rule('rule')
      .from('%qualified-rule%').node('rule')
      .from('%at-rule%').node('atrule'),
    ex.rule('qualified-rule')
      .from('%component-value-list%%simple-block%').node('rule'),
    ex.rule('at-rule')
      .from('@%ident%%component-value-list%;').node('atrule')
      .from('@%ident%%component-value-list%%simple-block%').node('atrule'),
    ex.rule('simple-block')
      .from('{%component-value*%}').node('block')
      .from('[%component-value*%]').node('block')
      .from('(%component-value*%)').node('block'),
    ex.rule('component-value-list')
      .from('%component-value*%').node('component-value-list'),
    ex.rule('component-value')
      .from('%preserved-token%').node('token')
      .from('%function-block%').node('function')
      .from('%simple-block%').node('block'),
  ],
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
