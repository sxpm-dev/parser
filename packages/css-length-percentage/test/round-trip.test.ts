import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the css-length-percentage schema. See
// @parser2/parser's shared assertRoundTrip helper for the value-stable
// contract (spec Section "Design rules", rule 5).
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

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});
