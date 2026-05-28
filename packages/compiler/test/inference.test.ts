import assert from 'node:assert/strict';
import test from 'node:test';
import { generateParser, inferSchema } from '../src/index.ts';

// NOTE: The "inference walks the css smoke-test schema end to end" test that
// previously lived here was deleted as part of the unified-render-targets
// refactor — it imported `../../css/src/schema.ts`, which is still on the
// legacy `.structure()/.stringify()` API. Phase 6 brings the CSS package
// across; Phase 7 adds round-trip tests that supersede that smoke check.

test('inference rejects schemas with unresolved recursive roles', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const broken = defineSchema({
    rootType: 'Outer',
    examples: [
      relation('Outer', {
        input: 'x',
        encodings: {
          src: parse([span('inner', 'x').of('NoSuchType')]),
          ast: { inner: $.inner },
        },
      }),
    ],
  });
  assert.throws(() => inferSchema(broken), /Recursive role 'NoSuchType'/);
});

test('inference rejects ambiguous recursive span text', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const ambiguous = defineSchema({
    rootType: 'Pair',
    examples: [
      relation('Pair', {
        input: 'x x',
        encodings: {
          src: parse([
            span('left', 'x').of('Atom'),
            span('right', 'x').of('Atom'),
          ]),
          ast: { left: $.left, right: $.right },
        },
      }),
      relation('Atom', {
        input: 'y',
        encodings: {
          src: parse([span('v', 'y').ident().js()]),
          ast: { v: $.v },
        },
      }),
    ],
  });
  assert.throws(() => inferSchema(ambiguous), /appears multiple times/);
});

test('validation metadata is separate from SchemaDef and reaches inferSchema', async () => {
  const { defineSchema, defineValidation, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Declaration',
    examples: [
      relation('Declaration', {
        input: 'color: red;',
        encodings: {
          src: parse([
            span('prop', 'color').until(':'),
            literal(':'),
            span('value', 'red').until(';'),
            literal(';'),
          ]),
          ast: { type: 'decl', prop: $.prop, value: $.value },
        },
      }),
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

  // Validator-hook codegen for the v2 backend is a Phase 2 follow-up
  // (see docs/v2-migration-status.md). The schema/inference plumbing is
  // covered above; the emit-side assertions live with v2 once landed.
  const emitted = generateParser(schema, validation);
  assert.match(emitted, /function validate\(input: string, options\?: ParseOptions\): void/);
});

test('emitter factors shared recursive repeats before literal branch points', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
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
      relation('Pair', {
        input: 'key="value"',
        encodings: {
          src: parse([
            span('name', 'key').ident().css(),
            literal('='),
            span('value', '"value"').string().doubleQuoted(),
          ]),
          ast: { name: $.name, value: $.value },
        },
      }),
      relation('Node', {
        input: '<box key="value">body</box>',
        encodings: {
          src: parse([
            literal('<'),
            span('tag', 'box').ident().css(),
            span('pairs', 'key="value"').of('Pair').repeats({ min: 0 }),
            literal('>'),
            span('body', 'body').until('</'),
            literal('</'),
            span('closeTag', 'box').ident().css(),
            literal('>'),
          ]),
          ast: { tag: $.tag, pairs: $.pairs, body: $.body, closeTag: $.closeTag },
        },
      }),
      relation('Node', {
        input: '<box />',
        encodings: {
          src: parse([
            literal('<'),
            span('tag', 'box').ident().css(),
            span('pairs', '').of('Pair').repeats({ min: 0 }),
            literal('/>'),
          ]),
          ast: { tag: $.tag, pairs: $.pairs, selfClosing: true },
        },
      }),
    ],
  });

  const emitted = generateParser(schema);
  // No alt dispatch should fall back to trySpeculate — every alt-bucket here
  // is statically distinguishable, so the dispatcher uses the soft-fail
  // null-check pattern instead of throw/catch speculation.
  assert.doesNotMatch(emitted, /\btrySpeculate\(state,/);
  // v2 emits a first-byte branch gate around the alt chain, but the chain
  // itself still uses the soft-fail null-check pattern (no speculation).
  assert.match(
    emitted,
    /\{ const r = parseNode__alt0\(state\); if \(r !== null\) return r; \}\s*return parseNode__alt1\(state\);/,
  );
});

test('inferSchema attaches an empty renders map to a production with no .render entries', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      relation('Atom', {
        input: 'x',
        encodings: {
          src: parse([span('v', 'x').ident()]),
          ast: { type: 'atom', v: $.v },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  assert.ok(production.renders instanceof Map);
  // The single declared 'ast' entry is the only render target on this production.
  assert.deepEqual([...production.renders.keys()], ['ast']);
});
