import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the mac schema. Value-stable contract
// per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)

const FIXTURES: ReadonlyArray<string> = [
  '00:1A:2B:3C:4D:5E',
  'FF-FF-FF-FF-FF-FF',
  'aa:bb:cc:dd:ee:ff',
  'DE-AD-BE-EF-CA-FE',
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
