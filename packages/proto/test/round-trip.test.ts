import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the proto schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).

const FIXTURES: ReadonlyArray<string> = [
  'syntax = "proto3";',
  'package example.v1;',
  'message Empty { }',
  'syntax = "proto3"; message Empty { }',
  'syntax = "proto3"; package example.v1; message User { string name = 1; int32 age = 2; }',
];

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});

test("round-trip 'source' target (value-stable)", () => {
  assertRoundTrip(mod, 'source', FIXTURES);
});
