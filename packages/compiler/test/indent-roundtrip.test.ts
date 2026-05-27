// Task 7.6 — Round-trip theorem holds for indent-modified schema.
//
// With Tasks 7.2 (reference interpreter handles indent) and 7.5 (inverse
// stringify emits '\n' between indent-modified repeats children) in place,
// the round-trip closure check in `src/check/round-trip.ts` must accept the
// yamlList schema without any CompilerError. This test locks that contract:
// if any future change breaks either leg of the pipeline, `inferSchema` (which
// calls `checkRoundTrip` internally) throws, and this test fails loudly.
//
// The same yamlList schema is used in Tasks 7.2, 7.4, and 7.5 tests.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { checkRoundTrip } from '../src/check/round-trip.ts';

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

test('round-trip: indent schema parses → stringifies → parses to same AST', () => {
  // inferSchema calls checkRoundTrip internally; if the round-trip property
  // breaks, it throws CompilerError rather than returning.
  const schema = inferSchema(yamlListSchema);

  // Call checkRoundTrip explicitly to pin the contract and make the test
  // self-documenting. It is a no-op on a schema that already passed via
  // inferSchema, but a direct call makes clear exactly what is being asserted.
  assert.doesNotThrow(
    () => checkRoundTrip(schema),
    'checkRoundTrip must not throw for a valid indent-modified schema',
  );

  // Confirm the schema contains the expected node types.
  assert.ok(schema.nodeTypes.has('YamlList'), 'schema must contain YamlList');
  assert.ok(schema.nodeTypes.has('YamlItem'), 'schema must contain YamlItem');
});
