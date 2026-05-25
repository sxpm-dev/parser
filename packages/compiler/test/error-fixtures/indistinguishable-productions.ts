// Precondition 2 of inverse derivation (infer/invert.ts
// `validateInverseDiscrimination`): when a node type has multiple
// productions sharing a target, the inverse dispatcher must be able to
// tell them apart from the value alone. Strategies the compiler tries:
//
//   - object body: distinct literal field values (e.g. .type) OR
//                  distinct field-name sets.
//   - template body: distinct leading literal prefix OR a unique
//                  embedded literal segment.
//   - scalar body: distinct scalar values.
//
// When none of these apply the compiler emits a 'indistinguishable
// productions' error naming both production indices. This fixture sets up
// two object-body productions with identical field-name sets and zero
// literal fields — the dispatcher would have no information to route on.

import { $, defineSchema, ex } from '@parser2/parser';

export const fixture = defineSchema({
  rootType: 'A',
  examples: [
    ex('foo')
      .as('A')
      .span('v', 'foo').ident()
      .render('ast', { v: $.v })
      .build(),
    ex('bar')
      .as('A')
      .span('v', 'bar').ident()
      .render('ast', { v: $.v })
      .build(),
  ],
});

export const expectedError = /indistinguishable productions/;
