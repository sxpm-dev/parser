import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the cron schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).
//
// 'ast' target — value-stable across all fixtures (object-shaped target;
// the inverse dispatcher routes robustly on `.type` field equality).
//
// 'source' target — value-stable across the same fixture set after the
// Gap A/B/C compiler fixes:
//   - Gap A (forward template fusion of optional-absent slots + inverse
//     template-scanner tail-optional handling) restored fixtures whose
//     command span is absent (e.g. '0 0 * * *', '1 2 3 4 5').
//   - Gap B (forward template joinSep for .repeats arrays) restored
//     multi-word command fixtures (e.g. '*/5 */2 7 8 1-5 npm test').
//   - Gap C (inverse dispatcher restricted to root productions) made
//     the wildcard-only fixture '* * * * *' invertible — its rendered
//     source previously mis-dispatched through CronField's `*`
//     production instead of Cron.

const FIXTURES: ReadonlyArray<string> = [
  '* * * * *',
  '0 0 * * *',
  '*/5 * * * *',
  '0 1-3 * * *',
  '1 2 3 4 5',
  '*/5 */2 7 8 1-5 npm test',
  '0 9 * * 1-5 npm test deploy',
];

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});

test("round-trip 'source' target (value-stable)", () => {
  assertRoundTrip(mod, 'source', FIXTURES);
});
