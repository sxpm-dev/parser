import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the url schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).
//
// 'ast' target — value-stable across all fixtures (object-shaped target;
// the inverse dispatcher routes robustly on `.type` field equality).
//
// 'source' target — value-stable across the same fixture set. The
// .repeats({ sep: '&' }) Query production exercises the Task A fix
// (render/rebuild join must re-introduce the declared separator, not '').

const FIXTURES: ReadonlyArray<string> = [
  '/foo/bar?q=hello&tag=one',
  'https://example.com/search',
  'https://localhost:8888/search',
];

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});

test("round-trip 'source' target (value-stable)", () => {
  assertRoundTrip(mod, 'source', FIXTURES);
});
