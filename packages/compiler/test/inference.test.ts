import assert from 'node:assert/strict';
import test from 'node:test';
import CssSchema from '../../css/src/schema.ts';
import { inferSchema } from '../src/index.ts';

test('inference walks the css smoke-test schema end to end', () => {
  const inferred = inferSchema(CssSchema);

  // Root info
  assert.equal(inferred.rootSchemaName, 'css');
  assert.equal(inferred.rootType, 'Stylesheet');
  assert.equal(inferred.whitespace, 'standard');

  // All node types reachable
  assert.deepEqual([...inferred.nodeTypes.keys()].sort(), [
    'AtRule',
    'Comment',
    'Declaration',
    'Rule',
    'Stylesheet',
  ]);
  // AtRule has two productions (statement form + block form)
  assert.equal(inferred.nodeTypes.get('AtRule')!.productions.length, 2);

  // CSS declares named punctuators: { → lbrace, } → rbrace, etc.
  assert.equal(inferred.literalTypeByText.get('{'), 'lbrace');
  assert.equal(inferred.literalTypeByText.get('}'), 'rbrace');
  assert.equal(inferred.literalTypeByText.get(':'), 'colon');
  assert.equal(inferred.literalTypeByText.get(';'), 'semicolon');
  // Delim chars all share the 'delim' type
  assert.equal(inferred.literalTypeByText.get('.'), 'delim');
  assert.equal(inferred.literalTypeByText.get('+'), 'delim');
  // Tokenizer-declared classes carry through
  const numberClass = inferred.classes.find((c) => c.class === 'number');
  assert.ok(numberClass);
  const stringClass = inferred.classes.find((c) => c.class === 'string');
  assert.ok(stringClass);

  // Classes used: ident with css refinement
  const idents = inferred.classes.find((c) => c.class === 'ident');
  assert.ok(idents);
  assert.deepEqual(idents!.refinements.map((r) => r.name), ['css']);
});

test('inference rejects schemas with unresolved recursive roles', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const broken = defineSchema({
    name: 'broken',
    rootType: 'Outer',
    examples: [
      ex('x').as('Outer').span('inner', 'x', 'NoSuchType').structure({ inner: $.inner }).build(),
    ],
  });
  assert.throws(() => inferSchema(broken), /Recursive role 'NoSuchType'/);
});

test('inference rejects ambiguous recursive span text', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const ambiguous = defineSchema({
    name: 'ambig',
    rootType: 'Pair',
    examples: [
      ex('x x')
        .as('Pair')
        .span('left', 'x', 'Atom')
        .span('right', 'x', 'Atom')
        .structure({ left: $.left, right: $.right })
        .build(),
      ex('y').as('Atom').span('v', 'y').ident().js().structure({ v: $.v }).build(),
    ],
  });
  assert.throws(() => inferSchema(ambiguous), /appears multiple times/);
});
