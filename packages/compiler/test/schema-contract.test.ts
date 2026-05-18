import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';
import * as cssSchemaModule from '../../css/schema.ts';
import * as jsonSchemaModule from '../../json/schema.ts';
import * as jsSchemaModule from '../../js/schema.ts';
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

test('js schema declares ECMA-262 conformance target', () => {
  assert.equal(jsSchema.standard?.name, 'ECMA-262');
  assert.match(jsSchema.standard?.url ?? '', /tc39\.es\/ecma262/);
  assert.match(jsSchema.standard?.conformanceSuite ?? '', /tc39\/test262/);
  assert.equal(inferSchema(jsSchema).grammar?.root, 'Program');
});

test('css schema declares CSS Syntax conformance target', () => {
  assert.equal(cssSchema.standard?.name, 'CSS Syntax Module');
  assert.match(cssSchema.standard?.url ?? '', /css-syntax-3/);
  assert.match(cssSchema.standard?.conformanceSuite ?? '', /css\/css-syntax/);
  assert.equal(inferSchema(cssSchema).grammar?.root, 'stylesheet');
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
  }
});

test('parser packages do not own generators or parser-library runtime fallbacks', () => {
  for (const name of ['css', 'js', 'json']) {
    assert.equal(existsSync(join(root, 'packages', name, 'src', 'generator.ts')), false);

    const pkg = JSON.parse(readFileSync(join(root, 'packages', name, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    assert.deepEqual(Object.keys(pkg.dependencies ?? {}), ['@parser2/parser']);

    const generated = readFileSync(join(root, 'packages', name, 'src', '_generated', 'parser.ts'), 'utf8');
    assert.doesNotMatch(generated, /\bfrom ['"](?:acorn|meriyah|esprima|@babel\/parser|postcss|css-tree|cssom|rework)['"]/);
    assert.doesNotMatch(generated, /\brequire\(['"](?:acorn|meriyah|esprima|@babel\/parser|postcss|css-tree|cssom|rework)['"]\)/);
  }
});

test('json generated parser exposes executable inferred grammar', () => {
  const generated = readFileSync(join(root, 'packages', 'json', 'src', '_generated', 'parser.ts'), 'utf8');
  assert.match(generated, /const grammar = \{"root":"JsonDocument"/);
  assert.match(generated, /export function parseTree/);
  assert.match(generated, /class GrammarParser/);
});
