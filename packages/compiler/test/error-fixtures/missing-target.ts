// Per-target completeness rule (spec Section 'Design rules', rule 6 —
// enforced by infer/render-targets.ts `enforcePerTargetCompleteness`):
// when at least one production of a node type declares a target T, every
// production of that node type must declare T as well. Otherwise the
// per-target dispatcher would silently fall through for the missing
// production at runtime.

import { $, defineSchema, ex, tpl } from '@parser2/parser';

export const fixture = defineSchema({
  rootType: 'A',
  examples: [
    ex('one')
      .as('A')
      .span('v', 'one').ident()
      .render('ast', { type: 'a', v: $.v })
      .render('html', tpl`<a>${$.v}</a>`)
      .build(),
    // Second production for the SAME node type 'A' — declares 'ast' only,
    // omitting 'html'. enforcePerTargetCompleteness must reject this.
    ex('two')
      .as('A')
      .span('w', 'two').ident()
      .render('ast', { type: 'a', v: $.w })
      .build(),
  ],
});

export const expectedError = /missing render target\(s\) 'html'/;
