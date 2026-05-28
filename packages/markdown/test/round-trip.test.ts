import assert from 'node:assert/strict';
import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the markdown schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).
//
// Targets exercised:
//   - 'ast' — object-shaped target; the inverse dispatcher routes on the
//     `type` literal (plus `marker` / `variant` for productions that share
//     a `type` value). Value-stable across all fixtures.
//   - 'source' — value-stable across canonical inputs.
//   - 'html' — value-stable per spec rule 5: many-to-one renderings (e.g.
//     `---`, `***`, `___` all render to `<hr>`) collapse on stringify to a
//     single canonical markdown source whose re-render equals the original
//     html, so the round-trip property holds even though byte-identity does
//     not.

const FIXTURES: ReadonlyArray<string> = [
  '# Release notes',
  '## Installation guide',
  '### API reference',
  '#### Deep section',
  '##### Small section',
  '###### Tiny heading',
  'Plain paragraph',
  '- first item',
  '+ alternate marker',
  '* star marker',
  '1. ordered item',
  '> quoted text',
  '---',
  '***',
  '___',
  '**bold**',
  '*italic*',
  '~~removed~~',
  '`code`',
  '[docs][id]',
  '![diagram][image-id]',
  '&amp;',
  '[^1]',
  '<div>html</div>',
];

test("round-trip 'ast' (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});

test("round-trip 'source' (value-stable)", () => {
  assertRoundTrip(mod, 'source', FIXTURES);
});

test("round-trip 'html' (value-stable)", () => {
  assertRoundTrip(mod, 'html', FIXTURES);
});

// 'source' must additionally re-stringify to the same canonical bytes for
// fixtures already in canonical form. The value-stable loop above already
// exercises canonical-input round-trip; this extra pass pins the
// canonical form so we notice if the rebuild algorithm changes. Kept
// in-package because the harness owns value-equality only — byte-equality
// for the canonical form is a markdown-specific stronger invariant.
for (const input of FIXTURES) {
  test(`canonical source: ${JSON.stringify(input).slice(0, 50)}`, () => {
    assert.equal(mod.render(input, { target: 'source' }), input);
  });
}
