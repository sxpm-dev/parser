// Round-trip closure theorem (Task 3.1) — codegen-time check that schema
// examples value-stable round-trip across every declared non-'ast'
// render target. See `src/check/round-trip.ts` header for the property
// statement.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { inferSchema } from '../src/index.ts';
import { CompilerError } from '../src/model.ts';

// Static smoke: every in-scope schema passes the round-trip check
// (because `inferSchema` runs it; if any example breaks closure, this
// import throws).
test('checkRoundTrip — markdown schema passes', async () => {
  const { default: schema } = await import('../../markdown/src/schema.ts');
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

test('checkRoundTrip — css schema passes', async () => {
  const { default: schema } = await import('../../css/src/schema.ts');
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

test('checkRoundTrip — html schema passes', async () => {
  const { default: schema } = await import('../../html/src/schema.ts');
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// Negative: a contrived schema whose source rebuild drops literal spans
// the parse path requires. The forward render produces `<val>` (delim-
// less), the rebuild walks production spans and captures the named
// literal-quote spans as their captured value ("), but the resulting
// stringified source `x=content` reparses to a position-2 error because
// the value capture didn't take the quote into account. Surfaces the
// `reparse failed` branch of the check.
test('checkRoundTrip — schema whose stringify breaks reparse fails at codegen', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      ex('x="content"').as('X')
        .span('x=')
        .span('q', '"')
        .span('val', 'content').until('"')
        .span('q2', '"')
        .render('ast', { type: 'x', val: $.val })
        // Body uses a `y=` prefix the source rebuild does not emit.
        // The mismatch between body template and production-span
        // rebuild trips the reparse check.
        .render('source', tpl`y=${$.val}`)
        .build(),
    ],
  });
  let threw: unknown;
  try {
    inferSchema(schema);
  } catch (e) {
    threw = e;
  }
  assert.ok(threw, 'expected CompilerError, got success');
  assert.ok(threw instanceof CompilerError, `expected CompilerError, got ${(threw as Error)?.name}`);
  assert.match((threw as Error).message, /round-trip check/);
});

// Positive: a schema whose forward render and inverse line up — body
// uses the same shape parse expects.
test('checkRoundTrip — coherent schema passes', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      ex('hi:abc').as('X')
        .span('hi:')
        .span('content', 'abc').ident().css()
        .render('ast', { type: 'x', content: $.content })
        .render('source', tpl`hi:${$.content}`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred);
});

// Explicit inverse-override exempts the production×target from round-
// trip enforcement. The schema author asserts inverse correctness via
// their own tests when supplying an override.
test('checkRoundTrip — explicit inverse override is exempt', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      ex('hi:abc').as('X')
        .span('hi:')
        .span('content', 'abc').ident().css()
        .render('ast', { type: 'x', content: $.content })
        // body forward: hi:abc | inverse-override: hi:abc (same here,
        // but override path is still exercised: see invert.test.ts for
        // the structurally-different-override case).
        .render('source', tpl`hi:${$.content}`, { inverse: tpl`hi:${$.content}` })
        .build(),
    ],
  });
  // No throw.
  const inferred = inferSchema(schema);
  assert.ok(inferred);
});
