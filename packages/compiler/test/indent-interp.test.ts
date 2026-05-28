import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/parse.ts';

const yamlListSchema = defineSchema({
  rootType: 'YamlList',
  examples: [
    relation('YamlItem', {
      input: '- a',
      encodings: {
        src: parse([literal('- '), span('value', 'a').until('\n')]),
        ast: $.value,
        source: tpl`- ${$.value}`,
      },
    }),

    relation('YamlList', {
      input: `- a\n- b`,
      encodings: {
        src: parse([span('items').of('YamlItem').indent().repeats({ min: 0 })]),
        ast: { type: 'list', items: $.items },
        source: tpl`${$.items}`,
      },
    }),
  ],
});

test('interp: parses two top-level items', () => {
  const schema = inferSchema(yamlListSchema);
  const ast = interpretParse(schema, '- a\n- b\n');
  assert.deepEqual(ast, { type: 'list', items: ['a', 'b'] });
});

test('interp: dedent terminates the repeats loop', () => {
  const schema = inferSchema(yamlListSchema);
  const ast = interpretParse(schema, '- a\n- b\n');
  assert.deepEqual((ast as { items: string[] }).items.length, 2);
});

test('interp: blank lines inside the indent block are skipped', () => {
  const schema = inferSchema(yamlListSchema);
  const ast = interpretParse(schema, '- a\n\n- b\n');
  assert.deepEqual((ast as { items: string[] }).items, ['a', 'b']);
});
