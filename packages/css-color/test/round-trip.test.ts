import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the css-color schema. Value-stable contract
// per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)
//
// 'ast' target — value-stable across all fixtures. After Phase 6 the
// previously-shared `{ type: 'color-function', name }` shape was split
// into distinct `rgb-color-function` (RGB) and `color-function` (non-RGB)
// literals so the inverse dispatcher can route reliably on `.type`.
//
// 'source' target is NOT declared. ColorFunctionToken / NumericColorFunctionToken
// have bare-slot productions (`${$.value}` for number / ident / string),
// and the v1 source-template inverse discriminator cannot tell them apart
// from source alone — there is no embedded literal segment to use as a
// runtime discriminator. css-color follows the css-length-percentage
// precedent of AST-only migration.

const FIXTURES: ReadonlyArray<string> = [
  'red',
  'aliceblue',
  'transparent',
  '#00ff99',
  '#fff',
  '#ffffffff',
  'rgb(255 0 0 / 1)',
  'rgba(255, 0, 0)',
  'hsl(120 100% 50%)',
  'hsla(120, 100%, 50%, 0.5)',
  'hwb(90 10% 10%)',
  'lab(50% 20 30)',
  'lch(50% 40 120)',
  'oklab(60% 0.1 0.2)',
  'oklch(60% 0.2 30)',
  'color(display-p3 1 0 0)',
  'var(--brand-color, red)',
];

for (const fixture of FIXTURES) {
  test(`round-trip 'ast' target (value-stable): ${fixture}`, () => {
    const target = 'ast' as const;
    const v1 = render(fixture, { type: target });
    const src = stringify(v1, { type: target });
    const v2 = render(src, { type: target });
    assert.deepEqual(v2, v1);
  });
}
