import assert from 'node:assert/strict';
import test from 'node:test';
import { inferSchema } from '../src/index.ts';

test('author templates are attached to the production they describe', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('# title')
        .as('Atom')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: [$.first] })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  const html = production.stringifyTemplates.find((t) => t.target === 'html');
  assert.ok(html, 'html template attached');
  assert.deepEqual(html!.parts, ['<h1>', '</h1>']);
  assert.deepEqual(html!.slots, [{ kind: 'capture', ref: 'first' }]);
});

test('reserved target name "source" rejected from author templates', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('source', tpl`${$.v}`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /reserved target name 'source'/);
});

test('duplicate target on one production is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('html', tpl`<a>${$.v}</a>`)
        .stringify('html', tpl`<b>${$.v}</b>`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /duplicate stringify target 'html'/);
});

test('unresolved slot ref (no matching span) is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('html', tpl`<a>${$.missing}</a>`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /slot \$\.missing references unknown span/);
});

test('source template auto-derives from literal + classed spans (whitespace: standard)', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Heading')!.productions[0]!;
  const source = production.stringifyTemplates.find((t) => t.target === 'source');
  assert.ok(source, 'source template synthesized');
  assert.equal(source!.parts.length, source!.slots.length + 1);
  assert.deepEqual(source!.slots, [{ kind: 'capture', ref: 'first' }]);
});

test('source template includes a slot for a .repeats() span (interpolated as joined recursion)', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('a b').as('Doc')
        .span('items', 'a b', 'Atom').repeats({ min: 0 })
        .structure({ type: 'doc', items: $.items })
        .build(),
      ex('a').as('Atom').span('v', 'a').ident().structure({ type: 'atom', v: $.v }).build(),
    ],
  });
  const inferred = inferSchema(schema);
  const docSource = inferred.nodeTypes.get('Doc')!.productions[0]!.stringifyTemplates.find((t) => t.target === 'source');
  assert.ok(docSource);
  assert.deepEqual(docSource!.slots, [{ kind: 'capture', ref: 'items' }]);
});

test('every production gets a source template even when no author templates exist', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident().structure({ type: 'atom', v: $.v }).build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  assert.ok(production.stringifyTemplates.find((t) => t.target === 'source'));
});
