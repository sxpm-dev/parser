import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the cron schema. Value-stable contract
// per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)
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

for (const fixture of FIXTURES) {
  test(`round-trip 'ast' target (value-stable): ${fixture}`, () => {
    const target = 'ast' as const;
    const v1 = render(fixture, { type: target });
    const src = stringify(v1, { type: target });
    const v2 = render(src, { type: target });
    assert.deepEqual(v2, v1);
  });
}

for (const fixture of FIXTURES) {
  test(`round-trip 'source' target (value-stable): ${fixture}`, () => {
    const target = 'source' as const;
    const v1 = render(fixture, { type: target });
    const src = stringify(v1, { type: target });
    const v2 = render(src, { type: target });
    assert.equal(v2, v1, `value-stability failed for ${fixture}`);
  });
}
