import test from 'node:test';
import { assertRoundTrip } from '@parser2/parser';
import * as mod from '../src/index.ts';

// Round-trip property test for the log schema. See @parser2/parser's
// shared assertRoundTrip helper for the value-stable contract (spec
// Section "Design rules", rule 5).

const FIXTURES: ReadonlyArray<string> = [
  '192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
  '10.0.0.1 - alice [01/Jan/2024:00:00:00 +0000] "POST /api/login HTTP/1.1" 401 42',
  '127.0.0.1 - bob [31/Dec/2024:23:59:59 -0500] "GET / HTTP/1.0" 200 1024',
];

test("round-trip 'ast' target (value-stable)", () => {
  assertRoundTrip(mod, 'ast', FIXTURES);
});

test("round-trip 'source' target (value-stable)", () => {
  assertRoundTrip(mod, 'source', FIXTURES);
});
