import assert from 'node:assert/strict';
import test from 'node:test';
import { render } from '../src/index.ts';

// Canonical round-trip: render(input, { target: 'source' }) returns input
// for inputs already in canonical form. The schema's whitespace policy is
// 'standard' — single space between adjacent spans — so inputs that fit
// that mold round-trip exactly. Inputs with non-canonical whitespace need
// mode: 'raws' (out of scope for v1; tracked in spec lines 480-489).
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

for (const input of cases) {
  test(`round-trip: ${JSON.stringify(input).slice(0, 50)}`, () => {
    assert.equal(render(input, { target: 'source' }), input);
  });
}
