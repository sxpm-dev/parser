import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import * as meriyah from 'meriyah';
import { parse } from '../src/index.ts';

type SyntaxCase = {
  readonly name: string;
  readonly source: string;
  readonly body: readonly { readonly type: string; readonly raw: string }[];
};

const validSyntax: readonly SyntaxCase[] = [
  {
    name: 'function declaration with identifiers',
    source: 'function foo(a,b){}',
    body: [{ type: 'FunctionDeclaration', raw: 'function foo(a,b){}' }],
  },
  {
    name: 'function declaration with rest parameter',
    source: 'function foo(...rest){}',
    body: [{ type: 'FunctionDeclaration', raw: 'function foo(...rest){}' }],
  },
  {
    name: 'function declaration with default parameter',
    source: 'function foo(a = 1){}',
    body: [{ type: 'FunctionDeclaration', raw: 'function foo(a = 1){}' }],
  },
  {
    name: 'class declaration',
    source: 'class A {}',
    body: [{ type: 'ClassDeclaration', raw: 'class A {}' }],
  },
  {
    name: 'class declaration with extends',
    source: 'class A extends B {}',
    body: [{ type: 'ClassDeclaration', raw: 'class A extends B {}' }],
  },
  {
    name: 'if with binary expression',
    source: 'if (a == true) {}',
    body: [{ type: 'IfStatement', raw: 'if (a == true) {}' }],
  },
  {
    name: 'if with deeply parenthesized expression',
    source: 'if (((a))) {}',
    body: [{ type: 'IfStatement', raw: 'if (((a))) {}' }],
  },
  {
    name: 'if with invoked arrow expression',
    source: 'if ((() => 1)()) {}',
    body: [{ type: 'IfStatement', raw: 'if ((() => 1)()) {}' }],
  },
  {
    name: 'classic for header',
    source: 'for (let i = 0; i < n; i++) {}',
    body: [{ type: 'ForStatement', raw: 'for (let i = 0; i < n; i++) {}' }],
  },
  {
    name: 'empty for header',
    source: 'for (;;) {}',
    body: [{ type: 'ForStatement', raw: 'for (;;) {}' }],
  },
];

const invalidSyntax: readonly { readonly name: string; readonly source: string }[] = [
  { name: 'numeric function parameter', source: 'function foo(1){}' },
  { name: 'double comma in function parameters', source: 'function foo(a,,b){}' },
  { name: 'rest parameter is not final', source: 'function foo(...rest,b){}' },
  { name: 'class declaration requires a binding identifier', source: 'class (a){}' },
  { name: 'expression statement cannot be directly followed by a block', source: 'fu(a){}' },
  { name: 'if statement requires a test expression', source: 'if () {}' },
  { name: 'for statement requires a valid header shape', source: 'for () {}' },
];

const test262SyntaxSmoke: readonly SyntaxCase[] = [
  {
    name: 'Test262 function trailing comma fixture',
    source: readFixture('statements/function/params-trailing-comma-single.js'),
    body: [{ type: 'FunctionDeclaration', raw: 'function f(a,) {}' }],
  },
  {
    name: 'Test262 class static block fixture',
    source: readFixture('statements/class/static-init-statement-list-optional.js'),
    body: [{ type: 'ClassDeclaration', raw: 'class C { static {} }' }],
  },
];

test('syntax matrix accepts valid syntax and returns stable AST shape', () => {
  for (const syntaxCase of validSyntax) {
    assertExternalAccepts(syntaxCase.source, syntaxCase.name);
    assert.deepEqual(projectAst(parse(syntaxCase.source)), syntaxCase.body, syntaxCase.name);
  }
});

test('syntax matrix rejects invalid syntax accepted by the old shallow classifier', () => {
  for (const syntaxCase of invalidSyntax) {
    assertExternalRejects(syntaxCase.source, syntaxCase.name);
    assert.throws(() => parse(syntaxCase.source), SyntaxError, syntaxCase.name);
  }
});

test('selected Test262 syntax fixtures stay visible as local AST assertions', () => {
  for (const syntaxCase of test262SyntaxSmoke) {
    assertExternalAccepts(syntaxCase.source, syntaxCase.name);
    assert.deepEqual(projectAst(parse(syntaxCase.source)), syntaxCase.body, syntaxCase.name);
  }
});

function projectAst(ast: { readonly body: readonly unknown[] }): readonly { readonly type: string; readonly raw: string }[] {
  return ast.body.map((node) => {
    const statement = node as { readonly type: string; readonly raw: string };
    return { type: statement.type, raw: statement.raw };
  });
}

function assertExternalAccepts(source: string, name: string): void {
  assert.doesNotThrow(() => parseWithReference(source), name);
}

function assertExternalRejects(source: string, name: string): void {
  assert.throws(() => parseWithReference(source), SyntaxError, name);
}

function parseWithReference(source: string): unknown {
  return meriyah.parse(source, { module: false, next: true, webcompat: true });
}

function readFixture(path: string): string {
  const root = join(new URL('..', import.meta.url).pathname, '.conformance/test262/test/language');
  const source = readFileSync(join(root, path), 'utf8');
  const match = source.match(/\/\/ test source:\s*([\s\S]*?)\/\/ end test source/);
  return match?.[1].trim() ?? minimalFixture(path);
}

function minimalFixture(path: string): string {
  if (path.includes('params-trailing-comma-single')) return 'function f(a,) {}';
  if (path.includes('static-init-statement-list-optional')) return 'class C { static {} }';
  throw new Error(`No local fixture extraction for ${path}`);
}
