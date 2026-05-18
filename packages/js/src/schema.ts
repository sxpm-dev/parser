import { defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'js',
  rules: [
    ex.rule('Program')
      .from('%Script%').node('Program')
      .from('%Module%').node('Program'),
    ex.rule('Script')
      .from('%StatementListItem*%').node('Script'),
    ex.rule('Module')
      .from('%ModuleItem*%').node('Module'),
    ex.rule('StatementListItem')
      .from('%Statement%').node('Statement')
      .from('%Declaration%').node('Declaration'),
    ex.rule('ModuleItem')
      .from('%ImportDeclaration%').node('ImportDeclaration')
      .from('%ExportDeclaration%').node('ExportDeclaration')
      .from('%StatementListItem%').node('StatementListItem'),
    ex.rule('Statement')
      .from('%ExpressionStatement%').node('ExpressionStatement')
      .from('%BlockStatement%').node('BlockStatement')
      .from('%IfStatement%').node('IfStatement')
      .from('%IterationStatement%').node('IterationStatement')
      .from('%SwitchStatement%').node('SwitchStatement')
      .from('%WithStatement%').node('WithStatement'),
    ex.rule('Declaration')
      .from('%VariableDeclaration%').node('VariableDeclaration')
      .from('%FunctionDeclaration%').node('FunctionDeclaration')
      .from('%ClassDeclaration%').node('ClassDeclaration'),
  ],
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
      .structure({
        type: 'Program',
        sourceType: 'module',
        statements: [{ type: 'VariableDeclaration', raw: 'const answer = 42;' }],
      })
      .build(),
    ex('import data from "./x.json" with { type: "json" }; using resource = open(); await Promise.resolve(data); export class Box { #value = 1_000n; }')
      .node('Program', (program) => program
        .node('ImportDeclaration')
        .node('VariableDeclaration')
        .node('ExpressionStatement')
        .node('ExportNamedDeclaration'))
      .structure({
        type: 'Program',
        sourceType: 'module',
        statements: ['ImportDeclaration', 'VariableDeclaration', 'ExpressionStatement', 'ExportNamedDeclaration'],
      })
      .build(),
    ex('with (scope) { answer = value; }')
      .node('Program', (program) => program.node('WithStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['WithStatement'],
      })
      .build(),
  ],
});
