# v2 emit migration status (captured 2026-05-26, updated after Task 1.3c)

Status of `--v2` codegen + tests for the 3 in-scope parser packages.
Captured by running `npx tsx packages/compiler/src/cli.ts packages/<pkg>/src/schema.ts --v2`
from the worktree root. See `docs/scannerless-emit-v2.md` for the v2 design
contract.

Baseline (default v1 scannerless emit): css 56/57 (1 skip), html 30/30,
markdown 76/76. None of these are affected — only `--v2` codegen is exercised
here.

Tasks 1.3a/b/c (until/rawUntil span emit + multi-role non-repeats + multi-
role repeats) all landed. Every package now ratchets past the multi-role
repeats throw and into the role-ladder's first-byte conflict check — the
next blocker is Task 1.3d (peek-scan dispatcher).

- [ ] css — codegen fails: `v2: multi-role span dispatch: role 'Rule' has a production whose first span is until/rawUntil/repeats/optional — byte-prefix dispatch not yet supported (Task 1.3d)` (Stylesheet `nodes` repeats over [Comment, AtRule, Rule, Declaration] — Rule's first span is `.until(...)`, so no first-byte signature is computable).
- [ ] html — codegen fails: `v2: multi-role span dispatch: role 'TextNode' has a production whose first span is until/rawUntil/repeats/optional — byte-prefix dispatch not yet supported (Task 1.3d)` (HtmlDocument `children` repeats over [Doctype, Comment, HtmlElement, TextNode] — TextNode opens with `.until('<')`).
- [ ] markdown — codegen fails: `v2: multi-role span dispatch: role 'MarkdownLeaf' has a production whose first span is until/rawUntil/repeats/optional — byte-prefix dispatch not yet supported (Task 1.3d)` (Document children repeats over multi-role; MarkdownLeaf has an until-leading production).

## v2 design TODOs / not-yet markers remaining in `emit/v2/`

These constrain what the remaining Task 1.3 slices (d/e) need to implement
before any of the 3 packages can migrate:

- `emit/v2/dispatch.ts:5` — discriminator peek-scan (ladder rung 2) is "not
  yet implemented in v2 first slice". Currently only byte-prefix dispatch
  (rung 1) and sentinel speculation (rung 3) are wired. Required for CSS
  Rule/Declaration discrimination per the design doc. The role-ladder's
  current `computeRoleFirstBytes` rejects roles whose first span has no
  single-byte signature (until/rawUntil/repeats/optional first span) — 1.3d
  must add a longer-prefix or peek-scan path to disambiguate. (Task 1.3d.)
- `emit/v2/span.ts:60` — DONE (Task 1.3a). `until` / `rawUntil` spans emit
  straight-line scan code; balanced/trim/rejectSuffix all honored.
- `emit/v2/span.ts:184` — DONE (Task 1.3b). Multi-role non-repeats spans emit
  the role-dispatch ladder.
- `emit/v2/span.ts:286` — DONE (Task 1.3c). Multi-role repeats spans emit a
  while-loop wrapping the role-dispatch ladder; sep/min/max/trailing/
  stopBefore modifiers all honored. Test coverage in
  `packages/compiler/test/v2-regressions.test.ts`.
- `emit/v2/span.ts:352` — class '<cls>' not yet supported. `.float()` /
  `.scientific()` refinements on number class are accepted by the schema
  parser but not honored by the v2 scanner. CSS uses float numbers
  (length-percentage etc). (Task 1.3e.)

## Phase 1 implication

Task 1.2 ("migrate packages that already pass v2 cleanly") still has zero
candidates — every in-scope package now hits the role-ladder first-byte
conflict at the multi-role repeats site. Task 1.3d is the next gating item;
once it lands, all three packages should progress further. (Markdown and
HTML may then succeed; CSS likely needs 1.3e for `.float()`/`.scientific()`
support too.)
