import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the css-length-percentage schema.
// Value-stable contract per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)
//
// 'source' target is NOT declared on this schema. The migration aid
// synth-source step couldn't proceed because multiple productions share
// the same example input (e.g. `ex('0')` appears as LengthPercentageItem
// AND as LengthFunctionToken). See migration report for details.

const FIXTURES: ReadonlyArray<string> = [
  '0',
  '10px',
  '50%',
  '10px 20%',
  '1px 2px 3px 4px',
  'auto',
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
