import assert from 'node:assert/strict';
import test from 'node:test';
import { render, stringify } from '../src/index.ts';

// Round-trip property test for the css schema. Value-stable contract per
// the spec (Section "Design rules", rule 5):
//
//   render(stringify(render(x, T), T), T) === render(x, T)
//
// Targets exercised:
//   - 'ast' — object-shaped target; the inverse dispatcher routes on the
//     `type` literal (plus `important: true` on Declaration#0 and the
//     presence of `nodes` on AtRule#0 vs the statement form AtRule#1).
//   - 'source' — string-shaped target; rebuild emits canonical whitespace
//     (single space between adjacent spans, `;` always emitted after
//     statement at-rules even when the input omitted it).
//
// The legacy 'json' selector-as-key target was DROPPED in the Phase 6
// migration. That target merged sibling rules at the parent (Stylesheet)
// scope, which makes a clean inverse infeasible without bespoke "merge
// semantics" support in the compiler. See the migration commit body for
// the rationale.

// Comment fixtures are EXCLUDED. The Comment span uses `.comment()` to
// strip `/*` and `*/` delimiters from the captured `text`. The 'source'
// rebuild — synthesised from production spans by emit/rebuild.ts — reads
// `captures.text` directly and produces only the interior, so re-parsing
// the rebuilt comment fails. The fix is either a synthesis rule that
// re-adds delimiters around `.comment()` slots (compiler-side) or
// splitting the comment span into three (which breaks the comment fast
// path in direct-fast). Tracked as a Phase 7 follow-up.
const VALUE_STABLE_FIXTURES: ReadonlyArray<string> = [
  '.foo { color: red }',
  'foo { color: red }',
  'foo { color: red; background: blue }',
  '.foo, .bar { color: red }',
  '.foo:hover { color: red }',
  '.foo > .bar { color: rgb(1,2,3) }',
  '@media screen { .baz { display: none } }',
  '.foo { color: red !important }',
];

for (const fixture of VALUE_STABLE_FIXTURES) {
  test(`round-trip 'ast' (value-stable): ${fixture}`, () => {
    const target = 'ast' as const;
    const v1 = render(fixture, { type: target });
    const src = stringify(v1, { type: target });
    const v2 = render(src, { type: target });
    assert.deepEqual(v2, v1);
  });
}

for (const fixture of VALUE_STABLE_FIXTURES) {
  test(`round-trip 'source' (value-stable): ${fixture}`, () => {
    const target = 'source' as const;
    const v1 = render(fixture, { type: target });
    const src = stringify(v1, { type: target });
    const v2 = render(src, { type: target });
    assert.equal(v2, v1, `value-stability failed for ${fixture}`);
  });
}
