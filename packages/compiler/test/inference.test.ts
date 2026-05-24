import assert from 'node:assert/strict';
import test from 'node:test';
import CssSchema from '../../css/src/schema.ts';
import { generateParser, inferSchema } from '../src/index.ts';

test('inference walks the css smoke-test schema end to end', () => {
  const inferred = inferSchema(CssSchema);

  // Root info
  assert.equal(inferred.packageName, 'parser');
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

test('validation metadata is separate from SchemaDef and emits string-set lookup logic', async () => {
  const { defineSchema, defineValidation, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Declaration',
    examples: [
      ex('color: red;')
        .as('Declaration')
        .span('prop', 'color').until(':')
        .span(':')
        .span('value', 'red').until(';')
        .span(';')
        .structure({ type: 'decl', prop: $.prop, value: $.value })
        .build(),
    ],
  });
  const valueValidator = Object.assign(
    (_input: string): void => {},
    { __parser2Validator: { module: '@parser2/css-color', exportName: 'validate' } },
  );

  assert.equal('validation' in schema, false);

  const validation = defineValidation(schema)
    .node('Declaration')
    .field('value')
    .match('prop', ['color'])
    .validate(valueValidator);
  const inferred = inferSchema(schema, validation);
  assert.equal(inferred.validation?.rules.length, 1);

  const emitted = generateParser(schema, validation);
  assert.match(emitted, /import \{ validate as __propertyValidator0 \} from "@parser2\/css-color"/);
  assert.match(emitted, /new Set<string>\(\["color"\]\)/);
  assert.match(emitted, /function validate\(input: string, options\?: ParseOptions\): void/);
});

test('emitter factors shared recursive repeats before literal branch points', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Node',
    punctuators: {
      open: '<',
      close: '>',
      selfClose: '/>',
      equals: '=',
    },
    tokens: ['string'],
    examples: [
      ex('key="value"')
        .as('Pair')
        .span('name', 'key').ident().css()
        .span('=')
        .span('value', '"value"').string().doubleQuoted()
        .structure({ name: $.name, value: $.value })
        .build(),
      ex('<box key="value">body</box>')
        .as('Node')
        .span('<')
        .span('tag', 'box').ident().css()
        .span('pairs', 'key="value"', 'Pair').repeats({ min: 0 })
        .span('>')
        .span('body', 'body').until('</')
        .span('</')
        .span('closeTag', 'box').ident().css()
        .span('>')
        .structure({ tag: $.tag, pairs: $.pairs, body: $.body, closeTag: $.closeTag })
        .build(),
      ex('<box />')
        .as('Node')
        .span('<')
        .span('tag', 'box').ident().css()
        .span('pairs', '', 'Pair').repeats({ min: 0 })
        .span('/>')
        .structure({ tag: $.tag, pairs: $.pairs, selfClosing: true })
        .build(),
    ],
  });

  const emitted = generateParser(schema);
  // No alt dispatch should fall back to trySpeculate — every alt-bucket here
  // is statically distinguishable, so the dispatcher uses the soft-fail
  // null-check pattern instead of throw/catch speculation.
  assert.doesNotMatch(emitted, /\btrySpeculate\(state,/);
  assert.match(
    emitted,
    /function parseNodeFast\(state: State\): unknown \{\s*\{ const r = parseNodeFast__alt0\(state\); if \(r !== null\) return r; \}\s*return parseNodeFast__alt1\(state\);/,
  );
});

test('inferSchema attaches an empty stringifyTemplates array to every production by default', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident().structure({ type: 'atom', v: $.v }).build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  assert.ok(Array.isArray(production.stringifyTemplates));
});
