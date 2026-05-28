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

import { $, defineSchema, relation, parse, span } from '@parser2/parser';

export const fixture = defineSchema({
  rootType: 'A',
  examples: [
    relation('A', {
      input: 'foo',
      encodings: {
        src: parse([span('v', 'foo').ident()]),
        ast: { v: $.v },
      },
    }),
    relation('A', {
      input: 'bar',
      encodings: {
        src: parse([span('v', 'bar').ident()]),
        ast: { v: $.v },
      },
    }),
  ],
});

export const expectedError = /indistinguishable productions/;
