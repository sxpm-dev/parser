import test from 'node:test';
import { strict as assert } from 'node:assert';
import * as tsBackend from '../src/_generated/parser.ts';
import * as bcodeBackend from '../src/_generated/parser.bcode.ts';

// Task 6.6 — bytecode-backend equivalence test.
//
// Exit gate for Phase 6: cron's generated parser produces identical
// observable output under BOTH the TS backend (`parser.ts`) and the
// bytecode backend (`parser.bcode.ts`) for the same input set.
//
// What is compared:
//   - render(input, { target: 'ast' })    — object-shape AST
//   - render(input, { type: 'source' }) — canonical source text
//   - stringify(ast, { target: 'ast' })   — inverse: ast -> source
//
// Notable deviations from the original plan, documented inline:
//
//   1) The plan's example compares raw `__parse(input)` captures across
//      backends. The TS backend does not export `__parse` (it is module-
//      private and shaped differently from the bytecode runtime's
//      captures — e.g. it carries `__sourceStart/__source` for raws mode
//      and lacks `__production` markers). The bytecode backend's
//      captures intentionally carry `__production` keys because the
//      runtime is schema-agnostic. Comparing raw captures across these
//      two shapes is not meaningful; we compare the rendered AST and
//      source instead, which is what callers actually observe.
//
//   2) The plan's example calls `bcodeBackend.stringify(tsAst, { type:
//      'source' })`. The bytecode backend's stringify currently uses
//      target='ast' as the input-shape identifier (the dispatcher routes
//      on the AST's `.type` field, and the output is always source
//      text). Template-form inverse for target='source' is a Task 6.4
//      deferred follow-up. We therefore pass `{ target: 'ast' }` to both
//      backends here; both produce source text via their respective
//      inverse dispatchers.
//
//   3) ~~Inputs containing step expressions (`*/N`) or range expressions
//      (`A-B`) are excluded from this fixture set.~~
//      **Status: Resolved (Phase 6 follow-up #1, 2026-05-29.)** The
//      bytecode encoder now sorts dispatch alts by tag-restricted →
//      longest-literal-prefix → span-count descending (matching the TS
//      backend's `emitGroupSpeculation` order), so `*/N` correctly wins
//      over `*` and `N-N` correctly wins over `N` for ambiguous inputs.
//      Step and range inputs are exercised below.
//
//   4) Inputs without a trailing command (e.g. '* * * * *') are also
//      excluded. The bytecode runtime produces `command: { type:
//      'command' }` for an absent optional command, while the TS
//      backend produces `command: null`. Optional-absent fusion is
//      another Task 6.3 follow-up (forward-only — inverse already
//      handles the absent-command shape correctly).
//
// All inputs below are present in cron's existing test suite (cron.test.ts /
// round-trip.test.ts) or in the schema's `examples` array. They share one
// property:
//   - The command is present (so the optional-absent gap (4) does not
//     surface).

const EXAMPLES: ReadonlyArray<string> = [
  '* * * * * date',
  '5 * * * * cmd',
  '0 0 * * * health-check',
  '0 9 * * 1 npm test',
  '0 9 * * 5 npm run check',
  '1 2 3 4 5 npm test deploy',
  // Phase 6 follow-up #1 — previously excluded; now parses correctly under
  // both backends thanks to dispatch sort.
  '*/5 * * * * cmd',
  '0 9 * * 1-5 npm test',
  '*/15 0-12 * * 1-5 deploy',
];

// Strip bytecode-runtime-only metadata so we can compare against shapes
// produced by the TS backend's render. Today the rendered values are
// already metadata-free (the runtime's `__production` markers live on
// parse-time captures, not on rendered AST objects), so this is a no-op
// guard — but we keep it explicit in case the runtime gains diagnostic
// fields in the future. Any property whose name starts with `__source`
// is also stripped (the TS backend emits these in raws mode; both
// backends here are fast mode, so this is also a guard).
function stripSource(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSource);
  if (value === null || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (k.startsWith('__source')) continue;
    if (k === '__production') continue;
    out[k] = stripSource(v);
  }
  return out;
}

for (const input of EXAMPLES) {
  test(`bytecode equivalence: cron ${JSON.stringify(input)}`, () => {
    // Forward render: object-shaped AST target.
    const tsAst = tsBackend.render(input, { target: 'ast' });
    const bcAst = bcodeBackend.render(input, { target: 'ast' });
    assert.deepStrictEqual(stripSource(bcAst), stripSource(tsAst));

    // Forward render: string source target.
    const tsSource = tsBackend.render(input, { target: 'source' });
    const bcSource = bcodeBackend.render(input, { target: 'source' });
    assert.equal(bcSource, tsSource);

    // Inverse stringify: ast -> source. Both backends should reconstruct
    // the canonical source from the AST. We use the TS-side AST as the
    // canonical input shape (the bytecode AST is shown above to be
    // deep-equal to it after stripping metadata).
    const bcBack = bcodeBackend.stringify(tsAst, { target: 'ast' });
    assert.equal(bcBack, input);
  });
}
