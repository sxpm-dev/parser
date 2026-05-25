import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the log schema. Value-stable contract
// per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)

const FIXTURES: ReadonlyArray<string> = [
  '192.168.0.1 - frank [10/Oct/2000:13:55:36 -0700] "GET /apache_pb.gif HTTP/1.0" 200 2326',
  '10.0.0.1 - alice [01/Jan/2024:00:00:00 +0000] "POST /api/login HTTP/1.1" 401 42',
  '127.0.0.1 - bob [31/Dec/2024:23:59:59 -0500] "GET / HTTP/1.0" 200 1024',
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
