import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/parse.ts';

const yamlListSchema = defineSchema({
  rootType: 'YamlList',
  examples: [
    ex('- a')
      .as('YamlItem')
      .span('- ')
      .span('value', 'a').until('\n')
      .render('ast', $.value)
      .render('source', tpl`- ${$.value}`)
      .build(),

    ex(`- a
- b`)
      .as('YamlList')
      .indent('items', ['YamlItem']).repeats({ min: 0 })
      .render('ast', { type: 'list', items: $.items })
      .render('source', tpl`${$.items}`)
      .build(),
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
