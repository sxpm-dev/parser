// Shared round-trip property-test helper. Centralises the value-stable
// round-trip contract per the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)
//
// Per-package round-trip.test.ts files import this helper and supply a
// fixture list — see e.g. packages/cron/test/round-trip.test.ts.
//
// Comparison is deep value equality (`assert.deepEqual`). The first render
// produces the canonical value for the target; the second render — applied
// to the rebuilt source — must produce the same value. Two consecutive
// `deepEqual` failures for string targets degrade gracefully because
// `deepEqual` accepts primitives.
//
// Note on byte-equality: some packages additionally pin the canonical
// source form by asserting `render(input, { type: 'source' }) === input`
// for canonical fixtures (see packages/markdown/test/round-trip.test.ts).
// That stronger check stays in-package; this harness owns the value-stable
// invariant only.

import assert from 'node:assert/strict';

export type RoundTripModule = {
  readonly render: (input: string, opts: { type: string }) => unknown;
  readonly stringify: (value: unknown, opts: { type: string }) => string;
};

export function assertRoundTrip(
  module: RoundTripModule,
  target: string,
  fixtures: ReadonlyArray<string>,
): void {
  for (const input of fixtures) {
    const v1 = module.render(input, { type: target });
    const src = module.stringify(v1, { type: target });
    const v2 = module.render(src, { type: target });
    assert.deepEqual(
      v2,
      v1,
      `round-trip mismatch (target='${target}') for input:\n${input}`,
    );
  }
}
