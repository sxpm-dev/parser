// Task 7.6 — Round-trip theorem holds for indent-modified schema.
//
// With Tasks 7.2 (reference interpreter handles indent) and 7.5 (inverse
// stringify emits '\n' between indent-modified repeats children) in place,
// the round-trip closure check in `src/check/round-trip.ts` must accept the
// yamlList schema without any CompilerError. This test locks that contract:
// if any future change breaks either leg of the pipeline, `inferSchema` (which
// calls `checkRoundTrip` internally) throws, and this test fails loudly.
//
// What `checkRoundTrip` actually verifies: value-stability on the `source`
// target only (the `ast` target is explicitly skipped — see round-trip.ts
// "Why the AST target is skipped"). Joiner-canonicality lives in
// `indent-stringify.test.ts`.
//
// The same yamlList schema is used in Tasks 7.2, 7.4, 7.5, and 7.6 tests.

import test from 'node:test';
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';

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

test('round-trip: source target is value-stable for indent-modified schema', () => {
  // inferSchema calls checkRoundTrip internally; if the round-trip property
  // breaks for the indent schema, this throws CompilerError and the test
  // fails. No additional assertion is needed — the throw IS the assertion.
  inferSchema(yamlListSchema);
});
