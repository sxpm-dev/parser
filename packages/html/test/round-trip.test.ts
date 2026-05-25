import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the html schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).
//
// 'ast' target — value-stable across the chosen fixture set.
// 'source' target — value-stable across the same fixtures.
//
// Fixture scope: inputs without attribute lists. The `attrs` span is a
// `.repeats({ min: 0 })` whose forward source template (synthesised from
// the canonical empty-attrs example) omits the span. That keeps source
// round-trip green for both empty and non-empty inputs (both pin to the
// canonical empty-attrs form) but means stringify(ast, 'source') currently
// emits `<tagattr=...>` (no space between tag and attrs). Inputs with
// attributes therefore do not round-trip through 'ast' yet — a dedicated
// option.inverse template plus compiler support for "separator-when-non-
// empty" optional spans would close the gap.
//
// The `_kind` / `_closeTag` / `_keyword` / `_quote` literal-discriminator
// fields are read by the inverse dispatcher to pick the right production.

const FIXTURES: ReadonlyArray<string> = [
  '<div>Hello</div>',
  '<p>World</p>',
  '<br>',
  '<br />',
  '<!-- hello -->',
  '<!DOCTYPE html>',
  '<div><span>x</span><em>y</em></div>',
  'hello',
];

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});

test("round-trip 'source' target (value-stable)", () => {
  assertRoundTrip(mod, 'source', FIXTURES);
});
