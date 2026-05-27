// Task 7.5 — Inverse stringify emits indent on target='source'.
// Tests that interpretStringify correctly joins children of an
// indent-modified repeats span with '\n' separators (column-0 MVP).
//
// Strategy: define the same yamlList schema used in Tasks 7.2 and 7.4,
// then call interpretStringify directly with an AST value and assert the
// reconstructed source string.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretStringify } from '../src/interp/index.ts';

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

test('interp stringify: emits items at column 0 with newline separation', () => {
  const schema = inferSchema(yamlListSchema);
  const ast = { type: 'list', items: ['a', 'b'] };
  // Target 'ast' — the object-valued render. The inverse recovers 'items'
  // as ['- a', '- b'] (each YamlItem rebuilt through its own source), then
  // rebuildSource joins them. With kind:'indent', the joiner must be '\n'.
  const source = interpretStringify(schema, ast, 'ast');
  // Both items at column 0, separated by a single newline. Trailing newline
  // omitted; round-trip parser tolerates either.
  assert.equal(source, '- a\n- b');
});
