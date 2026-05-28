// Precondition 1 of the inverse template scanner (infer/invert.ts
// `deriveFromTemplate`): between any two consecutive slots there must be
// a non-empty literal separator. Without a literal segment between slot i
// and slot i+1 the scanner has nothing to bound the first capture's
// extent against, so the inverse cannot be derived from the template
// alone — the author has to supply an explicit options.inverse.

import { $, defineSchema, relation, parse, span, tpl } from '@parser2/parser';

export const fixture = defineSchema({
  rootType: 'A',
  examples: [
    relation('A', {
      input: 'ab',
      encodings: {
        src: parse([span('a', 'a').ident(), span('b', 'b').ident()]),
        ast: { type: 'a', a: $.a, b: $.b },
        compact: tpl`${$.a}${$.b}`,
      },
    }),
  ],
});

export const expectedError = /slots \$\.a and \$\.b are adjacent with no separator/;
