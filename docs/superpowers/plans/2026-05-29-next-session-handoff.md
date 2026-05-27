# Next-session handoff — Phase 8 (Unicode policy & case-insensitive primitives)

Continuing the parser3_codex bidirectional engine overhaul. Phase 7 (indentation primitive) closed on 2026-05-27 with 17 commits local on `main`. Phases 8 and 9 remain.

---

## Working directory + state verification

Phase 7 was developed directly on `main` (no worktree). The 17 Phase 7 commits sit on top of `e72ccaf` (the previous handoff commit).

```bash
cd /Users/valerii/Develop/parser3_codex
git log --oneline -20
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected (verified 2026-05-27):

- parser: 28/28 ✅
- compiler: 335/335 ✅
- css: 56/57 (1 intentional skip) ✅
- html: 30/30 ✅
- markdown: 76/76 ✅
- cron: 15/15 ✅
- yaml-block: 9/9 ✅ (new in Phase 7)

If `mac` or `css-color` shows failures, those are pre-existing and unrelated — confirmed during Phase 7 review.

---

## Pre-Phase-8 housekeeping (decide before starting Phase 8)

1. **Phase 7 not pushed to remote.** 17 commits on local `main`. Push when ready.
2. **`stash@{0}` still present** — `"pre-merge-stash: WorkspaceAgent edit + package-lock bumps (2026-05-27)"`. Drop with `git stash drop stash@{0}` (accidental) or pop with `git stash pop stash@{0}` if any of it matters. Check `git stash list`.
3. **Worktree `.claude/worktrees/engine+v2-and-theorems`** still exists at SHA `69c118d` on branch `worktree-engine+v2-and-theorems`. Phase 6 is merged; safe to remove:
   ```bash
   git worktree remove .claude/worktrees/engine+v2-and-theorems
   git branch -d worktree-engine+v2-and-theorems
   ```

---

## Where to read first

1. `docs/v2-migration-status.md` — current ratchet. **§ "Phase 7 closeout (2026-05-27)"** (lines ~242-352) lists all 17 commits, exit-gate status, and 8 deferred Phase 7 follow-ups. **§ "Phase 6 closeout"** (lines ~130-240) still holds the 10 bytecode follow-ups.
2. `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` lines 774-794 — Phase 8 architectural sketch.
3. `docs/superpowers/plans/2026-05-28-phase-7-indentation.md` — example of a well-shaped phase plan; mirror this structure when writing Phase 8's plan.
4. `AGENTS.md` — non-negotiable invariants (unchanged through Phase 7).

---

## Phase 7 closeout summary (what just landed)

17 commits, final SHA `2630609`. Full table in `docs/v2-migration-status.md` "What landed (Phase 7)". Highlights:

- `SpanModifier { kind: 'indent' }` + `.indent()` builder methods.
- Reference interpreter + v2 codegen indent-aware repeats loop with column stack (`Int32Array(16)`).
- Inverse stringifier emits `'\n' + ' '.repeat(indentCol)` between nested children; `INDENT_STEP_SPACES = 2`.
- `packages/yaml-block` exit-gate package: parses 50-line nested input through v2 TS + interp + round-trip.
- 9 tests pass for yaml-block including 3-level nesting round-trip.

**Compiler test count grew from 322 → 335 (+13).**

---

## What's left

### Phase 8 — Unicode policy & case-insensitive primitives (NEEDS PLAN)

**Goal** (master plan lines 774-794): Schema-level dials baked at codegen, zero runtime overhead. Unlocks HTML case-insensitive tag names, email/URL Unicode, Windows-friendly newlines.

**Schema additions:**

```ts
defineSchema({
  rootType: 'HtmlDoc',
  unicode: 'NFC',              // or 'NFD' | 'none'
  newlines: 'either-preserve', // or 'LF' | 'CRLF'
  caseSensitive: false,
  bom: 'allow',                // or 'reject' | 'require'
  examples: [...],
});
```

**Codegen impact** (small per-pass tweaks):
- Normalize input before scan when `unicode !== 'none'`.
- Lowercased-compare table for literals when `caseSensitive: false`.
- Newline normalization at tokenize time for `newlines: 'either-preserve'`.
- BOM handling at parse entry.

**Exit gate**: HTML schema parses `<DIV>` and `<div>` equivalently with `caseSensitive: false`; Unicode normalization round-trips for an email-grammar example.

**Plan-the-plan first:** before any code, run `superpowers:writing-plans` to produce `docs/superpowers/plans/2026-05-29-phase-8-unicode-case.md` with step-level tasks. Aim for 6-10 numbered tasks matching the Phase 6/7 plan shape.

### Phase 9 — DSL clean break: `ex()` → `relation()` (NEEDS PLAN — DETAIL AFTER 8 LANDS)

**Goal** (master plan lines 797-836): Rename + reshape the user-facing DSL. Cosmetic on top of working engine; landed last. Master plan explicitly defers Tasks 9.1-9.x detailing until after Phase 8 lands.

---

## Phase 7 follow-ups (deferrable; do NOT address unless reactivated)

Real gaps that yaml-block works around. None block Phase 8 work (Phase 8 lives entirely in tokenize/scan paths, not stringify). Full descriptions in `docs/v2-migration-status.md` § "Phase 7 follow-ups".

1. **Forward source render doesn't pad nested children** — `render(input, {type:'source'})` flattens indent. Inverse stringify is fixed; forward path needs matching threading.
2. **`synthesizePieces` requires literal text on indent spans with `min: 1`** — yaml-block schema works around by passing the full example text.
3. **Bytecode backend has no indent support** — cron stays the only bytecode-tested schema.
4. **Tabs count as width-1 columns** — documented, not supported in MVP.
5. **Indent depth limited to 16** — `Int32Array(16)` hard-cap.
6. **`INDENT_STEP_SPACES = 2` hardcoded** — no per-schema `indentWidth` option.
7. **Plan-specified inline test schemas don't exercise column-check paths** — real coverage is in yaml-block.
8. **Pre-existing `mac` / `css-color` failures** — unrelated to Phase 7.

## Phase 6 follow-ups (still open from prior closeout)

All 10 in `docs/v2-migration-status.md` lines 165-240. Bytecode-specific; none block Phase 8.

---

## User scope decisions (still valid; don't re-litigate)

1. **In-scope packages for maintenance:** css, html, markdown. Phase 7 added yaml-block as exit-gate target. Phase 8 will likely exercise HTML (case-insensitive tag names).
2. **No backward-compatibility constraint.**
3. **Codegen targets:** TS + bytecode. Wasm/Rust deferred indefinitely.
4. **Engine primary; DSL rename cosmetic.** Phase 9 last.
5. **Plan depth:** full step-level granularity per phase before dispatching.
6. **Cadence:** fully autonomous — push through phases, only stop on genuine blockers.

---

## Workflow pattern (validated through Phases 1.5, 5, 6, 7)

1. **`superpowers:writing-plans` first per phase** — generate step-level plan before any dispatch. Mirror `docs/superpowers/plans/2026-05-28-phase-7-indentation.md` structure (8 tasks, each with files-to-touch, exact code snippets, test commands, commit message).
2. **`superpowers:subagent-driven-development`** to execute task-by-task with fresh implementer + 2-stage review (spec compliance, then code quality) per task.
3. **Verify reviewer diagnoses from primary evidence** — re-run tests yourself before accepting "spec compliant".
4. **Cause/cost discipline:** one commit per logical change. Quality-review fix-ups can be follow-up commits.
5. **SendMessage is not available** in this environment — when reviewer feedback needs implementer follow-up, either dispatch a fresh subagent OR apply small surgical fixes directly. Both patterns used through Phase 7.
6. **Be honest about coverage gaps.** Phase 7 surfaced two: simple inline test schemas didn't exercise indent code (caught by spec reviewer); plan's test signatures didn't match the actual API (`'source'` vs `'ast'` target). Document deviations in commit messages and closeout notes.

---

## First actions in this session

1. Verify state (commands at top).
2. Decide on housekeeping: push Phase 7 to remote? Drop or pop `stash@{0}`? Remove the old worktree?
3. Read `docs/v2-migration-status.md` § "Phase 7 closeout" end-to-end.
4. Read `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` lines 774-794 (Phase 8 sketch).
5. Invoke `superpowers:writing-plans` to draft `docs/superpowers/plans/2026-05-29-phase-8-unicode-case.md`.
6. Once the plan is written, dispatch Task 8.1 via `superpowers:subagent-driven-development`.
