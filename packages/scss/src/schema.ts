import css from '../../css/src/schema.ts';
import { defineSchema, list, text } from '../../compiler/src/schema.ts';
const children = ['variable', 'propertyGroup', 'customProperty', 'declaration', 'atBlock', 'atStatement', 'rule'];
export default defineSchema({
  ...css,
  lexical: { ...css.lexical, comments: [['/*', '*/'], ['//', '\n']], regions: [['#{', '}']] },
  productions: {
    ...css.productions,
    propertyGroup: {
      examples: [{css:'font: { color: red; }',object:{property:'font',children:[{property:'color',value:'red'}]}}],
      fields: {
        property: text({pattern:'[-_a-zA-Z][-_a-zA-Z0-9]*',reject:[';','{','}']}),
        children: list(['declaration','propertyGroup']),
      },
    },
    variable: {
      examples: [{ css: '$brand: #abc;', object: { variable: '$brand', value: '#abc' } }],
      fields: {
        variable: text({ prefix: ['$'], pattern: '\\$[-_a-zA-Z][-_a-zA-Z0-9]*', reject: [';', '{', '}'] }),
        value: text({ balanced: true, reject: ['{'] }),
      },
      optionalEnd: ['}'],
    },
    declaration: {
      ...css.productions.declaration,
      fields: {
        ...css.productions.declaration.fields,
        property: text({ balanced: true, pattern: '(?:[-_a-zA-Z\\u0080-\\uFFFF]|#\\{[\\s\\S]+\\})(?:[-_a-zA-Z0-9\\u0080-\\uFFFF]|#\\{[\\s\\S]+\\})*', reject: [';', '{', '}'] }),
      },
    },
    rule: { ...css.productions.rule, fields: { ...css.productions.rule.fields, children: list(children) } },
    atBlock: { ...css.productions.atBlock, fields: { ...css.productions.atBlock.fields, children: list(children) } },
    stylesheet: { ...css.productions.stylesheet, fields: { children: list(['variable', 'atBlock', 'atStatement', 'rule']) } },
  },
});
