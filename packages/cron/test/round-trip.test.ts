import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the cron schema. Value-stable contract:
//   render(stringify(render(x, T), T), T) === render(x, T)
//
// Only the 'ast' target is exercised here. The 'source' target is NOT
// declared by the cron schema — two of CronField's productions (`value`
// and `range`) both template to a leading-capture form (`${$.value}` and
// `${$.start}-${$.end}` respectively), neither has a discriminating
// leading literal prefix, and the compiler's invert.ts discrimination
// rule (precondition 2) rejects the pair. The path forward when source
// is wanted is either an enhanced discriminator (embedded-separator
// detection) or schema restructuring; both are out of scope for the
// per-package migration phase.
//
// Fixtures intentionally exclude inputs with a `command` clause: the
// `Command` production declares `.repeats({ min: 1 })` with no `sep`
// (children are separated by whitespace at parse time), and the shared
// rebuild subroutine joins repeated children with the empty string — so
// `['npm','test']` rebuilds to `'npmtest'` rather than `'npm test'`.
// This is a pre-existing rebuild-pass limitation (visible in commit
// d13416e's generated parser too) and tracked as a known edge of the
// .repeats({sep:...}) handling in the migration plan.

const FIXTURES: ReadonlyArray<string> = [
  '* * * * *',
  '0 0 * * *',
  '*/5 * * * *',
  '0 1-3 * * *',
  '1 2 3 4 5',
];

for (const fixture of FIXTURES) {
  test(`round-trip 'ast' target: ${fixture}`, () => {
    const target = 'ast' as const;
    const v1 = render(fixture, { type: target });
    const src = stringify(v1, { type: target });
    const v2 = render(src, { type: target });
    assert.deepEqual(v2, v1);
  });
}
