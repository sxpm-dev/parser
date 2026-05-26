# v2 emit migration status (captured 2026-05-26, updated after Task 1.3a)

Status of `--v2` codegen + tests for the 3 in-scope parser packages.
Captured by running `npx tsx packages/compiler/src/cli.ts packages/<pkg>/src/schema.ts --v2`
from the worktree root. See `docs/scannerless-emit-v2.md` for the v2 design
contract.

Baseline (default v1 scannerless emit): css 56/57 (1 skip), html 30/30,
markdown 76/76. None of these are affected — only `--v2` codegen is exercised
here.

Task 1.3a (until/rawUntil span emit) landed: every package now ratchets past
the until throw at span.ts:60. All three hit the next blocker — multi-role
repeats — at span.ts:229. Task 1.3c is the highest-priority follow-up because
it unblocks every in-scope package.

- [ ] css — codegen fails: `v2: multi-role repeats not yet supported (span 'nodes')` thrown from `emit/v2/span.ts:229` (Stylesheet body has a repeats span over Rule | AtRule | Comment).
- [ ] html — codegen fails: `v2: multi-role repeats not yet supported (span 'children')` thrown from `emit/v2/span.ts:229` (Element body has a repeats span over multiple recursive roles).
- [ ] markdown — codegen fails: `v2: multi-role repeats not yet supported (span 'children')` thrown from `emit/v2/span.ts:229` (Document body has a repeats span over multiple block-level roles).

## v2 design TODOs / not-yet markers remaining in `emit/v2/`

These constrain what the remaining Task 1.3 slices (b/c/d/e) need to
implement before any of the 3 packages can migrate:

- `emit/v2/dispatch.ts:5` — discriminator peek-scan (ladder rung 2) is "not
  yet implemented in v2 first slice". Currently only byte-prefix dispatch
  (rung 1) and sentinel speculation (rung 3) are wired. Required for CSS
  Rule/Declaration discrimination per the design doc. (Task 1.3d.)
- `emit/v2/span.ts:60` — DONE (Task 1.3a). `until` / `rawUntil` spans now
  emit straight-line scan code; balanced/trim/rejectSuffix all honored. Test
  coverage in `packages/compiler/test/v2-regressions.test.ts`.
- `emit/v2/span.ts:184` — multi-role non-repeats span throws at emit. (Task 1.3b.)
- `emit/v2/span.ts:229` — multi-role repeats throws at emit. Needed for HTML
  Element children, Markdown Document children, CSS Stylesheet body. (Task 1.3c.)
- `emit/v2/span.ts:352` — class '<cls>' not yet supported. `.float()` /
  `.scientific()` refinements on number class are accepted by the schema
  parser but not honored by the v2 scanner. CSS uses float numbers
  (length-percentage etc). (Task 1.3e.)

## Phase 1 implication

Task 1.2 ("migrate packages that already pass v2 cleanly") still has zero
candidates — every in-scope package now hits the multi-role repeats throw.
Task 1.3c is the gating item; once it lands, all three packages will progress
to the next layer of failures.
