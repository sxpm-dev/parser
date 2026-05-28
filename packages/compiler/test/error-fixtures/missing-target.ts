// Per-target completeness rule (spec Section 'Design rules', rule 6 —
// enforced by infer/render-targets.ts `enforcePerTargetCompleteness`):
// when at least one production of a node type declares a target T, every
// production of that node type must declare T as well. Otherwise the
// per-target dispatcher would silently fall through for the missing
// production at runtime.

import { $, defineSchema, relation, parse, span, tpl } from '@parser2/parser';

export const fixture = defineSchema({
  rootType: 'A',
  examples: [
    relation('A', {
      input: 'one',
      encodings: {
        src: parse([span('v', 'one').ident()]),
        ast: { type: 'a', v: $.v },
        html: tpl`<a>${$.v}</a>`,
      },
    }),
    // Second production for the SAME node type 'A' — declares 'ast' only,
    // omitting 'html'. enforcePerTargetCompleteness must reject this.
    relation('A', {
      input: 'two',
      encodings: {
        src: parse([span('w', 'two').ident()]),
        ast: { type: 'a', v: $.w },
      },
    }),
  ],
});

export const expectedError = /missing render target\(s\) 'html'/;
