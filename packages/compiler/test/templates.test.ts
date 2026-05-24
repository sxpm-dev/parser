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
