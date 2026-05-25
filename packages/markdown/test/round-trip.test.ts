import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the markdown schema. Value-stable contract
// per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)
//
// Targets exercised:
//   - 'ast' — object-shaped target; the inverse dispatcher routes on the
//     `type` literal (plus `marker` / `variant` for productions that share
//     a `type` value). Value-stable across all fixtures.
//   - 'source' — value-stable across canonical inputs.
//
// 'html' target round-trip is NOT exercised here. The markdown -> html
// mapping is many-to-one (e.g. `---`, `***`, `___` all render to `<hr>`)
// AND the html surface is itself valid input to the markdown parser,
// which will re-parse `<hr>` as a paragraph wrapping the literal text and
// render back as `<p><hr></p>`. The reverse `stringify(htmlString, 'html')`
// would need a markdown serializer that knows the html came from a
// markdown source, not from arbitrary text — out of scope for v1.

const cases = [
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

for (const target of ['ast', 'source'] as const) {
  for (const input of cases) {
    test(`round-trip '${target}' (value-stable): ${JSON.stringify(input).slice(0, 50)}`, () => {
      const v1 = render(input, { type: target });
      const src = stringify(v1, { type: target });
      const v2 = render(src, { type: target });
      assert.deepEqual(v2, v1);
    });
  }
}

// 'source' must additionally re-stringify to the same canonical bytes for
// fixtures already in canonical form. The value-stable loop above already
// exercises canonical-input round-trip; this extra pass pins the
// canonical form so we notice if the rebuild algorithm changes.
for (const input of cases) {
  test(`canonical source: ${JSON.stringify(input).slice(0, 50)}`, () => {
    assert.equal(render(input, { type: 'source' }), input);
  });
}
