import { defineSchema, ex } from '@parser2/parser';
import { generateJsParser } from './src/generator.ts';

export default defineSchema({
  name: 'js',
  generate: generateJsParser,
  examples: [
    ex('const answer = 42;')
      .token('ident', 'const')
      .token('whitespace', ' ')
      .token('ident', 'answer')
      .token('whitespace', ' ')
      .token('punct', '=')
      .token('whitespace', ' ')
      .token('number', '42')
      .token('punct', ';')
      .node('Program', (program) => program.field('source', 'const answer = 42;'))
      .build(),
  ],
});
