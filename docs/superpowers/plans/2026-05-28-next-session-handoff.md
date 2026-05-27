# Next-session handoff — Phase 7 (indentation primitive)

Continuing the parser3_codex bidirectional engine overhaul. Phase 6 (bytecode backend) closed and merged to main. Three phases remain: 7, 8, 9.

---

## Working directory + state verification

Phase 6 was developed in `.claude/worktrees/engine+v2-and-theorems` and merged to main via fast-forward. Work directly on main; no new worktree needed unless you want to isolate Phase 7 risk.

```bash
cd /Users/valerii/Develop/parser3_codex
git log --oneline -15
for pkg in parser compiler css html markdown cron; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected (last verified 2026-05-27):

- parser: 25/25 ✅
- compiler: 322/322 ✅
- css: 56/57 (1 intentional skip) ✅
- html: 30/30 ✅
- markdown: 76/76 ✅
- cron: 15/15 ✅

If you see 6 compiler failures, they're the perf-budget test (`bytecode-budget.test.ts`) flaking under load — it uses wall-clock timing. Re-run; should settle at 322/322.

---

## Where to read first

1. `docs/v2-migration-status.md` — current ratchet, Phase 6 closeout (lines 134–250), all 10 known follow-ups verbatim (lines 165–250). Some may become load-bearing depending on Phase 7 decisions.
2. `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` lines 744–832 — Phase 7/8/9 architectural sketches (master plan).
3. `AGENTS.md` — non-negotiable invariants (unchanged through Phase 6).
4. `docs/superpowers/plans/2026-05-27-phase-6-bytecode-backend.md` — example of a well-shaped phase plan; mirror this structure when writing Phase 7's plan.

---

## Phase 6 closeout (last session)

13 commits landed; final SHA `69c118d`. Full SHA table in `docs/v2-migration-status.md` "What landed (Phase 6)". Highlights:

- Pluggable `Backend` interface: `packages/compiler/src/emit/{backend.ts, ts.ts, bytecode/}`
- Bytecode encoder + runtime + base64 file emit; cron generates `parser.bcode.ts` at 5,530 bytes
- CLI accepts `--backend ts|bytecode`
- Exit gate: size budget **PASS** (37,945 bytes / 50 KB), perf budget **DEFERRED** (measured 15-25× vs 2× target)

---

## What's left

### Phase 7 — Indentation primitive (NEEDS PLAN)

**Goal** (master plan lines 744-770): Add `.indent(...)` as a schema-level span modifier OR new IR primitive. Unlocks YAML, Python, Pug, indented Markdown lists.

**Decision at plan-start:** modifier (`SpanModifier { kind: 'indent' }`) vs IR primitive (`IndentScope` containing child spans). Modifier is less invasive; IR primitive makes scopes explicit. Lean modifier-first; reassess if the exit-gate target schema (YAML/Pug) forces it.

**API sketch (from master plan):**

```ts
ex(`
- a
  - nested
- b
`)
  .as('YamlList')
  .span('- ')
  .span('item', 'a').until('\n')
  .indent('children', ['YamlListItem']).repeats({ min: 0 })  // <-- new
  .render('ast', { type: 'list', items: [{ value: $.item, children: $.children }] })
  .build();
```

**Runtime:** `state.indentStack` — small fixed-size array (≤8 deep usually). Track expected column offsets; push on indented block entry, pop on dedent.

**Codegen:** emit per-span `requireIndent(col)` / `requireDedent()` calls.

**Exit gate:** real YAML-subset (or Pug) schema parses 50 lines of representative input correctly through:
- v2 TS backend
- reference interpreter (`packages/compiler/src/interp/`)
- round-trip theorem (`packages/compiler/src/check/round-trip.ts`)

Bytecode backend NOT required for Phase 7 — cron remains the only bytecode-tested schema.

**Plan-the-plan first:** before any code, run `superpowers:writing-plans` to produce `docs/superpowers/plans/2026-05-28-phase-7-indentation.md` with full step-level tasks. Aim for 6–10 numbered tasks matching the Phase 6 plan's shape.

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
})
```

**Codegen impact:** small per-pass tweaks — normalize input before scan; lowercased-compare table for literals when `caseSensitive: false`.

**Exit gate:** HTML schema parses `<DIV>` and `<div>` equivalently with `caseSensitive: false`; Unicode normalization round-trips for an email-grammar example.

### Phase 9 — DSL clean break: `ex()` → `relation()` (NEEDS PLAN — DETAIL AFTER 8 LANDS)

**Goal** (master plan lines 797-832): Rename + reshape the user-facing DSL to bidirectional-relation framing. Cosmetic on top of working engine; landed last so engine is already proven.

**Architectural sketch:**

```ts
// Before:
ex('# Release notes')
  .as('MarkdownLeaf')
  .span('#').span('text', 'Release notes').until('\n')
  .render('ast', { type: 'heading', depth: 1, text: $.text })
  .render('html', tpl`<h1>${$.text}</h1>`)
  .render('source', tpl`# ${$.text}`)
  .build();

// After:
relation('MarkdownLeaf', {
  shape: { text: string },
  encodings: {
    md:   parse('#').span('text', 'Release notes').until('\n'),
    html: tpl`<h1>${$.text}</h1>`,
    ast:  { type: 'heading', depth: 1, text: $.text },
  },
});
```

- Rename `ex()` → `relation()` in `packages/parser/src/example.ts`.
- Rewrite the 3 in-scope schemas (`packages/{css,html,markdown}/src/schema.ts`).
- Out-of-scope packages (arn, log, mac, proto, url, css-color, css-length-percentage) stay broken on old DSL OR get deleted entirely.
- Delete the old `ex()` builder.

Master plan explicitly defers Tasks 9.1–9.x detailing until after Phase 8 lands.

---

## Phase 6 known follow-ups (deferrable; do NOT address unless reactivated)

These are real gaps in the bytecode backend. None block Phase 7 work (Phase 7 lives entirely in the TS backend + interpreter). Full descriptions in `docs/v2-migration-status.md` lines 165-250.

1. **Multi-prod dispatch picks shortest-match** — cron's `*/N`, `N-N` inputs cannot be parsed by the bytecode backend today.
2. **Optional-absent rendering emits trailing whitespace** — `'* * * * *'` renders as `'* * * * * '`.
3. **Stringify `target='source'` not implemented** — template-form inverse. Bytecode uses `target='ast'` as the discriminator.
4. **Perf budget gap: 15-25× vs 2× target** — structural cost of switch-based interpretation; closing the gap would require bytecode→JS specialization (effectively regenerating the TS backend).
5. **Bytecode `__parse` only supports `'fast'` mode** — raws deferred per master plan.
6. **TS backend doesn't export `__parse`** for cross-backend test comparison.
7. **Multi-role recursive spans not supported in bytecode encoder.**
8. **Repeats `sep` plumbing hardcoded to single space.**
9. **`syntaxErrorAt` duplicated** between `v2/runtime.ts` and `bytecode/runtime.ts`.
10. **`@parser2/compiler/bytecode/runtime` exports entry has no `"types"` / `"source"` condition** — fresh clones that haven't run `tsc -b` will fail to import.

Plus Phase 5 + Phase 1.5 follow-ups (also in the status doc).

---

## User scope decisions (still valid; don't re-litigate)

1. **In-scope packages for maintenance:** css, html, markdown. Phase 7 will add yaml or pug as exit-gate target.
2. **No backward-compatibility constraint.**
3. **Codegen targets:** TS + bytecode. Wasm/Rust deferred indefinitely.
4. **Engine primary; DSL rename cosmetic.** Phase 9 last.
5. **Plan depth:** full step-level granularity per phase before dispatching.
6. **Cadence:** fully autonomous — push through phases, only stop on genuine blockers (e.g. context budget, or a design wall like Phase 6 Task 6.6's dispatch issue).

---

## Workflow pattern (validated through Phases 1.5, 5, 6)

1. **`superpowers:writing-plans` first per phase** — generate step-level plan before any dispatch. Mirror `docs/superpowers/plans/2026-05-27-phase-6-bytecode-backend.md` structure (8 tasks, each with files-to-touch, exact code snippets, test commands, commit message).
2. **`superpowers:subagent-driven-development`** to execute task-by-task with fresh implementer + 2-stage review (spec compliance, then code quality) per task.
3. **Verify reviewer diagnoses from primary evidence** — re-run tests yourself before accepting "spec compliant".
4. **Cause/cost discipline:** one commit per logical change. Quality-review fix-ups can be follow-up commits.
5. **Regenerate scope:** ONLY in-scope packages (`-w @parser2/css -w @parser2/html -w @parser2/markdown`) for normal regenerate. Add Phase 7's target package (yaml or pug) when it lands. Workspace-wide `npm run generate` surfaces pre-existing codegen bugs in css-length-percentage and mac.
6. **SendMessage is not available** in this environment — when reviewer feedback needs implementer follow-up, either dispatch a fresh subagent OR apply small surgical fixes directly. Both patterns used through Phase 6.

---

## First actions in this session

1. Verify state (commands at top).
2. Read `docs/v2-migration-status.md` end-to-end (current ratchet + Phase 6 follow-ups).
3. Read `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` lines 744-770 (Phase 7 sketch).
4. Invoke `superpowers:writing-plans` to draft `docs/superpowers/plans/2026-05-28-phase-7-indentation.md`. Decide modifier-vs-IR-primitive at plan-start; bake the choice into Task 7.1.
5. Once the plan is written, dispatch Task 7.1 via `superpowers:subagent-driven-development`.

---

## Pre-merge stash from last session

`stash@{0}: "pre-merge-stash: WorkspaceAgent edit + package-lock bumps (2026-05-27)"` — 12-line WorkspaceAgent paste that was in `packages/markdown/src/schema.ts` plus AWS SDK lockfile bumps. Pop with `git stash pop stash@{0}` if any of it matters; drop with `git stash drop stash@{0}` if accidental.

## Worktree cleanup

The Phase 6 worktree may still exist at `.claude/worktrees/engine+v2-and-theorems`. Check with `git worktree list`. Now that `worktree-engine+v2-and-theorems` is merged to main, you can remove it:

```bash
git worktree remove .claude/worktrees/engine+v2-and-theorems
git branch -d worktree-engine+v2-and-theorems
```
