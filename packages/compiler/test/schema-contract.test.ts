import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import * as cssSchemaModule from '../../css/src/schema.ts';
import * as jsonSchemaModule from '../../json/src/schema.ts';
import * as jsSchemaModule from '../../js/src/schema.ts';
import type { ParserSchema } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';

const cssSchema = readSchema(cssSchemaModule);
const jsonSchema = readSchema(jsonSchemaModule);
const jsSchema = readSchema(jsSchemaModule);
const root = new URL('../../..', import.meta.url).pathname;

function readSchema(module: unknown): ParserSchema {
  let value = module as { default?: unknown; name?: unknown };
  while (value.default && typeof value.default === 'object' && !('name' in value)) {
    value = value.default as { default?: unknown; name?: unknown };
  }
  return value as ParserSchema;
}

test('js schema infers program grammar without standard metadata', () => {
  assert.equal('standard' in (jsSchema as unknown as Record<string, unknown>), false);
  assert.equal(inferSchema(jsSchema).grammar?.root, 'Program');
});

test('css schema infers stylesheet grammar without standard metadata', () => {
  assert.equal('standard' in (cssSchema as unknown as Record<string, unknown>), false);
  assert.equal(inferSchema(cssSchema).grammar?.root, 'stylesheet');
});

test('css public structure types are inferred from schema examples', () => {
  const css = inferSchema(cssSchema);
  assert.equal(css.structure, css.ast);
  assert.match(css.structure.typeSource, /export type CssRoot = \{ type: "stylesheet"; nodes: CssNode\[\] \}/);
  assert.match(css.structure.typeSource, /export type CssNode = .*CssDecl/);
  assert.match(css.structure.typeSource, /export type CssDecl = \{ type: "decl"; important\?: true; prop: string; value: string \}/);
  assert.doesNotMatch(css.structure.typeSource, /CssDeclaration/);
  assert.deepEqual(css.structure.exampleOutputs[0], {
    type: 'stylesheet',
    rules: [
      {
        selector: '.foo',
        declarations: [{ prop: 'color', value: 'red' }],
      },
    ],
    hoverSelectors: [],
  });
});

test('css schema declares recovery examples as parser policy', () => {
  const css = inferSchema(cssSchema);
  assert.deepEqual(
    css.recoveries.map((recovery) => ({
      reason: recovery.reason,
      context: recovery.context,
      on: recovery.on,
      skipUntil: recovery.skipUntil,
      action: recovery.action,
    })),
    [
      {
        reason: 'missing-colon',
        context: 'Declaration',
        on: 'fail',
        skipUntil: [';', '}'],
        action: 'drop',
      },
      {
        reason: 'eof-in-block',
        context: 'Rule',
        on: 'unexpected:eof',
        skipUntil: [],
        action: 'close',
      },
    ],
  );
});

test('pattern slots infer repeat modifiers', () => {
  const js = inferSchema(jsSchema);
  const script = js.grammar?.rules.find((rule) => rule.name === 'Script');
  assert.deepEqual(script?.expr, { kind: 'repeat', item: { kind: 'ref', name: 'StatementListItem' } });

  const css = inferSchema(cssSchema);
  const stylesheet = css.grammar?.rules.find((rule) => rule.name === 'stylesheet');
  assert.deepEqual(stylesheet?.expr, { kind: 'repeat', item: { kind: 'ref', name: 'rule' } });
});

test('json schema infers recursive grammar from example patterns', () => {
  const inferred = inferSchema(jsonSchema);
  assert.equal(inferred.grammar?.root, 'JsonDocument');
  assert.deepEqual(inferred.structure.exampleOutputs[0], {
    type: 'JsonDocument',
    rootProps: ['name', 'count', 'ok', 'items'],
    numberPaths: [
      { path: ['count'], value: 2 },
      { path: ['items', 1], value: 1.5 },
    ],
  });

  const value = inferred.grammar?.rules.find((rule) => rule.name === 'value');
  assert.equal(value?.expr.kind, 'choice');
  assert.deepEqual(
    value?.expr.kind === 'choice' ? value.expr.options : [],
    [
      { kind: 'ref', name: 'object' },
      { kind: 'ref', name: 'array' },
      { kind: 'ref', name: 'string' },
      { kind: 'ref', name: 'number' },
      { kind: 'ref', name: 'boolean' },
      { kind: 'ref', name: 'null' },
    ],
  );

  const members = inferred.grammar?.rules.find((rule) => rule.name === 'members');
  assert.match(JSON.stringify(members?.expr), /"name":"members"/);
});

test('parser packages expose examples and rules only', () => {
  for (const schema of [cssSchema, jsSchema, jsonSchema]) {
    assert.ok(schema.examples.length > 0);
    assert.ok((schema.rules?.length ?? 0) > 0);
    assert.equal('grammar' in (schema as unknown as Record<string, unknown>), false);
    assert.equal('standard' in (schema as unknown as Record<string, unknown>), false);
  }
});

test('parser packages do not use parser-library runtime fallbacks', () => {
  for (const name of ['css', 'js', 'json']) {
    assert.equal(existsSync(join(root, 'packages', name, 'src', 'generator.ts')), false);

    const pkg = JSON.parse(readFileSync(join(root, 'packages', name, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ['@parser2/parser']);

    const generated = readFileSync(join(root, 'packages', name, 'src', '_generated', 'parser.ts'), 'utf8');
    assert.doesNotMatch(generated, /\bfrom ['"](?:acorn|meriyah|esprima|@babel\/parser|postcss|css-tree|cssom|rework)['"]/);
    assert.doesNotMatch(generated, /\brequire\(['"](?:acorn|meriyah|esprima|@babel\/parser|postcss|css-tree|cssom|rework)['"]\)/);

    for (const source of packageSourceFiles(join(root, 'packages', name, 'src'))) {
      const text = readFileSync(source, 'utf8');
      assert.doesNotMatch(text, /\bfrom ['"](?:acorn|meriyah|esprima|@babel\/parser|postcss|css-tree|cssom|rework)['"]/);
      assert.doesNotMatch(text, /\brequire\(['"](?:acorn|meriyah|esprima|@babel\/parser|postcss|css-tree|cssom|rework)['"]\)/);
    }
  }
});

function packageSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      out.push(...packageSourceFiles(path));
    } else if (entry.endsWith('.ts')) {
      out.push(path);
    }
  }
  return out;
}

test('compiler source stays domain agnostic', () => {
  const srcDir = join(root, 'packages', 'compiler', 'src');
  for (const file of ['index.ts', 'cli.ts']) {
    const source = readFileSync(join(srcDir, file), 'utf8');
    assert.doesNotMatch(source, /\b(?:Program|stylesheet|JsonDocument|Css[A-Z]\w*|Json[A-Z]\w*|Js[A-Z]\w*|generateCssParser|generateJsonParser)\b|['"](?:css|json|js)['"]/);
  }
  assert.equal(existsSync(join(srcDir, 'css-template.ts')), false);
  assert.equal(existsSync(join(srcDir, 'json-template.ts')), false);
});

test('css generated parser carries schema recovery metadata', () => {
  const generated = readFileSync(join(root, 'packages', 'css', 'src', '_generated', 'parser.ts'), 'utf8');
  assert.match(generated, /recoveries=2/);
  assert.match(generated, /"reason":"missing-colon"/);
  assert.match(generated, /"context":"Declaration"/);
});

test('json generated parser exposes executable inferred grammar', () => {
  const generated = readFileSync(join(root, 'packages', 'json', 'src', '_generated', 'parser.ts'), 'utf8');
  assert.match(generated, /const grammar = \{"root":"JsonDocument"/);
  assert.match(generated, /export function parseTree/);
  assert.match(generated, /class GrammarParser/);
});
