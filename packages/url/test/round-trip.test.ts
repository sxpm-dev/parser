import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the url schema. Value-stable contract
// per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)
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
