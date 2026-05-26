# v2 emit migration status (captured 2026-05-26, updated after Task 1.3d)

Status of `--v2` codegen + tests for the 3 in-scope parser packages.
Captured by running `npx tsx packages/compiler/src/cli.ts packages/<pkg>/src/schema.ts --v2`
from the worktree root. See `docs/scannerless-emit-v2.md` for the v2 design
contract.

Baseline (default v1 scannerless emit): css 56/57 (1 skip), html 30/30,
markdown 76/76. None of these are affected — only `--v2` codegen is exercised
here.

Tasks 1.3a/b/c/d landed. Every package now ratchets past the role-ladder's
indeterminate-first-byte rejection (1.3d added "fallthrough role" handling)
and into Task 1.3f's peek-scan dispatcher territory — the remaining blockers
are all same-signature role disambiguation.

- [ ] css — codegen fails: `v2: role list [Comment, AtRule, Rule, Declaration]
  has multiple fallthrough roles (Rule and Declaration both have until/
  rawUntil/repeats/optional first spans); peek-scan dispatch required
  (Task 1.3f)`. (Stylesheet `nodes` repeats over [Comment, AtRule, Rule,
  Declaration] — Rule starts with `.until(['{', ';'])`, Declaration starts
  with `.until([':', ';', '}'])`; the dispatcher needs to look past the
  first byte to decide which to try.)
- [ ] html — codegen fails: `v2: multi-role span has roles sharing first
  byte 0x3c ('Doctype' and 'Comment'); peek-scan dispatch not yet supported
  (Task 1.3f)`. (HtmlDocument `children` repeats over [Doctype, Comment,
  HtmlElement, TextNode] — TextNode is now treated as the fallthrough
  catch-all, but Doctype and Comment both start with `<` so byte-peek can't
  pick between them.)
- [ ] markdown — codegen fails: `v2: role list [MarkdownLeaf,
  MarkdownParagraph] has multiple fallthrough roles (MarkdownLeaf and
  MarkdownParagraph both have until/rawUntil/repeats/optional first spans);
  peek-scan dispatch required (Task 1.3f)`. (MarkdownLeaf has byte-fixed
  productions for `#`, `-`, `>`, etc., AND setext productions whose first
  span is `.until(HEADING_LINE_STOPS)` — that makes MarkdownLeaf itself a
  fallthrough role, conflicting with MarkdownParagraph's fallthrough.)

## v2 design TODOs / not-yet markers remaining in `emit/v2/`

These constrain what the remaining Task 1.3 slices (e/f) need to implement
before any of the 3 packages can migrate:

- `emit/v2/role-ladder.ts` — DONE (Task 1.3d). Roles whose first span has no
  fixed first byte are now treated as the catch-all fallthrough; at most one
  per role list. Two fallthrough roles raise CompilerError pointing at
  Task 1.3f (peek-scan dispatcher).
- `emit/v2/dispatch.ts:5` — discriminator peek-scan (ladder rung 2) still
  "not yet implemented in v2 first slice". Needed for same-byte and multi-
  fallthrough disambiguation. (Task 1.3f.)
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
candidates — every in-scope package now hits a Task 1.3f issue (same-byte
roles in html, multi-fallthrough in markdown/css). Task 1.3f peek-scan
dispatcher is the next gating item. Once 1.3f lands, html should succeed
end-to-end, markdown likely will too (its setext-vs-paragraph case is a
peek-scan target), and css may still need 1.3e for `.float()`/`.scientific()`
support.
