import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the mac schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).

const FIXTURES: ReadonlyArray<string> = [
  '00:1A:2B:3C:4D:5E',
  'FF-FF-FF-FF-FF-FF',
  'aa:bb:cc:dd:ee:ff',
  'DE-AD-BE-EF-CA-FE',
];

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});

test("round-trip 'source' target (value-stable)", () => {
  assertRoundTrip(mod, 'source', FIXTURES);
});
