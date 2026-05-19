import { defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'js',
  runtime: {
    tokenize: {
      kind: 'statement-list',
    },
    parse: {
      kind: 'statement-list',
      programAlias: 'JsNode',
      statementAlias: 'JsStatement',
      noLineTerminatorAfter: ['throw'],
      numberLiteral: {
        separator: '_',
        bigintSuffix: 'n',
        rejectIdentifierAfter: true,
        prefixes: [
          { prefixes: ['0b', '0B'], digits: '01' },
          { prefixes: ['0o', '0O'], digits: '01234567' },
          { prefixes: ['0x', '0X'], digits: '0123456789abcdefABCDEF' },
        ],
      },
      hashbang: {
        marker: '#!',
        onlyAtStart: true,
        rejectEscapedStart: ['#\\', '\\043', '\\u0023', '\\u{23}', '\\x23'],
      },
      slashLiteral: {
        token: 'regexp',
        allowAtStatementStart: true,
        precededByChars: ['=', '(', ',', ':', '[', '{', '!', '?', ';'],
        precededByKeywords: ['return', 'case', 'throw', 'else', 'yield', 'await', 'delete', 'void', 'typeof', 'new'],
      },
      requireBalancedEnd: true,
    },
    stringify: {
      kind: 'statement-list',
      bodyField: 'body',
    },
  },
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
      .generalizes('Program', (rule) => rule
        .from('%StatementListItem*%').node('Program'))
      .generalizes('StatementListItem', (rule) => rule
        .from('%Declaration%').node('VariableDeclaration')
        .from('%Statement%').node('ExpressionStatement'))
      .generalizes('Declaration', (rule) => rule
        .from('const %BindingIdentifier% = %Expression%').node('VariableDeclaration')
        .from('let %BindingIdentifier%').node('VariableDeclaration')
        .from('let %BindingIdentifier% = %Expression%').node('VariableDeclaration')
        .from('var %BindingIdentifier%').node('VariableDeclaration')
        .from('var %BindingIdentifier% = %Expression%').node('VariableDeclaration')
        .from('using %BindingIdentifier% = %Expression%').node('VariableDeclaration'))
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
      .generalizes('ModuleItem', (rule) => rule
        .from('import %ImportClause% from %Expression% with %ObjectLiteral%').node('ImportDeclaration')
        .from('export %Declaration%').node('ExportNamedDeclaration')
        .from('await %Expression%').node('ExpressionStatement'))
      .generalizes('ExpressionStatement', (rule) => rule
        .from('import ( %Expression% )').node('ExpressionStatement')
        .from('import ( %Expression% , %ObjectLiteral% )').node('ExpressionStatement')
        .from('import ( %Expression% , %ObjectLiteral% , )').node('ExpressionStatement')
        .from('import . source ( %Expression% )').node('ExpressionStatement')
        .from('import . defer ( %Expression% )').node('ExpressionStatement')
        .from('import . meta %Expression%').node('ExpressionStatement'))
      .generalizes('Declaration', (rule) => rule
        .from('class %BindingIdentifier% %ClassBody%').node('ClassDeclaration')
        .from('class %BindingIdentifier% extends %Expression% %ClassBody%').node('ClassDeclaration')
        .from('function %BindingIdentifier% ( %FormalParameters?% ) %BlockStatement%').node('FunctionDeclaration')
        .from('function * %BindingIdentifier% ( %FormalParameters?% ) %BlockStatement%').node('FunctionDeclaration')
        .from('async function %BindingIdentifier% ( %FormalParameters?% ) %BlockStatement%').node('FunctionDeclaration')
        .from('async function * %BindingIdentifier% ( %FormalParameters?% ) %BlockStatement%').node('FunctionDeclaration'))
      .generalizes('FormalParameters', (rule) => rule
        .from('%BindingIdentifier%').node('Identifier')
        .from('%BindingIdentifier% , %FormalParameters%').node('Identifier'))
      .build(),
    ex('with (scope) { answer = value; }')
      .node('Program', (program) => program.node('WithStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['WithStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('with ( %Expression% ) %Statement%').node('WithStatement'))
      .generalizes('BlockStatement', (rule) => rule
        .from('{ %StatementListItem*% }').node('BlockStatement'))
      .build(),
    ex('if (a) {} else {}')
      .node('Program', (program) => program.node('IfStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['IfStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('if ( %Expression% ) %Statement%').node('IfStatement')
        .from('if ( %Expression% ) %Statement% else %Statement%').node('IfStatement'))
      .build(),
    ex('for (let i = 0; i < n; i++) {}')
      .node('Program', (program) => program.node('ForStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['ForStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('for ( %ForHeader% ) %Statement%').node('ForStatement'))
      .build(),
    ex('while (a) {}')
      .node('Program', (program) => program.node('WhileStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['WhileStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('while ( %Expression% ) %Statement%').node('WhileStatement'))
      .build(),
    ex('do {} while (a);')
      .node('Program', (program) => program.node('DoWhileStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['DoWhileStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('do %Statement% while ( %Expression% )').node('DoWhileStatement'))
      .build(),
    ex('switch (k) { case 1: break; default: break; }')
      .node('Program', (program) => program.node('SwitchStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['SwitchStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('switch ( %Expression% ) %SwitchBody%').node('SwitchStatement'))
      .build(),
    ex('try {} catch (error) {} finally {}')
      .node('Program', (program) => program.node('TryStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['TryStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('try %BlockStatement% catch ( %BindingIdentifier% ) %BlockStatement%').node('TryStatement')
        .from('try %BlockStatement% catch %BlockStatement%').node('TryStatement')
        .from('try %BlockStatement% finally %BlockStatement%').node('TryStatement')
        .from('try %BlockStatement% catch ( %BindingIdentifier% ) %BlockStatement% finally %BlockStatement%').node('TryStatement'))
      .build(),
    ex('throw value;')
      .node('Program', (program) => program.node('ThrowStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['ThrowStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('throw %Expression%').node('ThrowStatement'))
      .build(),
    ex('return value;')
      .node('Program', (program) => program.node('ReturnStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['ReturnStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('return %Expression%').node('ReturnStatement'))
      .build(),
    ex('debugger;')
      .node('Program', (program) => program.node('DebuggerStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['DebuggerStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('debugger').node('DebuggerStatement'))
      .build(),
    ex('label: debugger;')
      .node('Program', (program) => program.node('LabeledStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['LabeledStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('%BindingIdentifier% : %Statement%').node('LabeledStatement')
        .from('%BlockStatement%').node('BlockStatement'))
      .build(),
    ex('answer = value;')
      .node('Program', (program) => program.node('ExpressionStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        statements: ['ExpressionStatement'],
      })
      .generalizes('Statement', (rule) => rule
        .from('%Expression%').node('ExpressionStatement'))
      .build(),
    ex('if (((1))) {}')
      .node('Program', (program) => program.node('IfStatement'))
      .structure({
        type: 'Program',
        sourceType: 'script',
        body: [{
          type: 'IfStatement',
          test: { type: 'Literal', value: 1 },
          consequent: { type: 'BlockStatement', body: [] },
          alternate: null,
        }],
      })
      .generalizes('Expression', (rule) => rule
        .from('%BindingIdentifier%').node('Identifier')
        .from('%Literal%').node('Literal')
        .from('( %Expression% )').node('Expression')
        .from('function ( %FormalParameters?% ) %BlockStatement%').node('FunctionExpression')
        .from('function %BindingIdentifier% ( %FormalParameters?% ) %BlockStatement%').node('FunctionExpression')
        .from('function * ( %FormalParameters?% ) %BlockStatement%').node('FunctionExpression')
        .from('function * %BindingIdentifier% ( %FormalParameters?% ) %BlockStatement%').node('FunctionExpression')
        .from('async function ( %FormalParameters?% ) %BlockStatement%').node('FunctionExpression')
        .from('async function %BindingIdentifier% ( %FormalParameters?% ) %BlockStatement%').node('FunctionExpression')
        .from('async function * ( %FormalParameters?% ) %BlockStatement%').node('AsyncGeneratorFunctionExpression')
        .from('async function * %BindingIdentifier% ( %FormalParameters?% ) %BlockStatement%').node('AsyncGeneratorFunctionExpression')
        .from('class %ClassBody%').node('ClassExpression')
        .from('class %BindingIdentifier% %ClassBody%').node('ClassExpression')
        .from('class %BindingIdentifier% extends %Expression% %ClassBody%').node('ClassExpression')
        .from('%UnaryOperator% %Expression%').node('UnaryExpression')
        .from('%Expression% %BinaryOperator% %Expression%').node('BinaryExpression')
        .from('%Expression% ( %Arguments?% )').node('CallExpression')
        .from('( %FormalParameters?% ) => %Expression%').node('ArrowFunctionExpression'))
      .build(),
    ex('if (a) {')
      .invalid('missing-block-close')
      .recover((recovery) => recovery
        .at('Statement')
        .onUnexpected('eof')
        .missing('}', 'close statement block')
        .close())
      .build(),
  ],
});
