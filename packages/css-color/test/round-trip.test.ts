import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the css-color schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).
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

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});
