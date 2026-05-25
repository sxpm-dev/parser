import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// The pre-migration stringify-parity test compared the fused forward
// `render(input, target)` against the two-pass `stringify(parse(input),
// target)`. That contract was specific to the legacy stringify-template
// pipeline; under the unified .render() API the equivalent is the
// round-trip property `render(stringify(render(x, T), T), T) === render(x, T)`
// which is exercised exhaustively by round-trip.test.ts.
//
// One useful piece survives: for value-target pairs whose canonical
// surface bytes match the input, the forward render must equal a stringify
// round-trip through that target. Documented here as a small set of pins:

const inputs = [
  '# Release notes',
  '## Installation guide',
  'Plain paragraph',
  '> quoted text',
  '---',
];

for (const input of inputs) {
  test(`source-target self-round-trip stringify parity: ${JSON.stringify(input).slice(0, 40)}`, () => {
    const direct = render(input, { type: 'source' });
    const indirect = stringify(render(input, { type: 'source' }), { type: 'source' });
    assert.equal(direct, indirect);
  });
  test(`html-target self-round-trip stringify parity: ${JSON.stringify(input).slice(0, 40)}`, () => {
    const direct = render(input, { type: 'html' });
    const indirect = stringify(render(input, { type: 'html' }), { type: 'html' });
    assert.equal(direct, indirect);
  });
}
