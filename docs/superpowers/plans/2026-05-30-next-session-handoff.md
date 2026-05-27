# Next-session handoff — Phase 9 (DSL clean break: `ex()` → `relation()`)

Continuing the parser3_codex bidirectional engine overhaul. Phase 8 (Unicode policy & case-insensitive primitives) closed on 2026-05-28 with 15 commits local on `main`. Phase 9 is the final remaining phase per the master plan; it's cosmetic on top of the proven engine.

---

## Working directory + state verification

Phase 8 was developed directly on `main` (no worktree). The 15 Phase 8 commits sit on top of `1a78ce7` (the Phase 7 plan-commit), final SHA `7450dd0`.

```bash
cd /Users/valerii/Develop/parser3_codex
git log --oneline -25
for pkg in parser compiler css html markdown cron yaml-block; do
  echo -n "$pkg: "; npm run test -w "@parser2/$pkg" 2>&1 | grep -E "^# (tests|pass|fail|skipped)" | tr '\n' ' '; echo
done
```

Expected (verified 2026-05-28 end-of-session):

- parser: 30/30 ✅ (was 28; +2 schema-dials tests)
- compiler: 372/372 ✅ (was 335; +37 across BOM/Unicode/newlines/case + emit-side + round-trip)
- css: 56/57 (1 intentional skip) ✅
- html: 34/34 ✅ (was 30; +4 case-insensitive tests)
- markdown: 76/76 ✅
- cron: 15/15 ✅
- yaml-block: 9/9 ✅

If `mac` or `css-color` shows failures, those are pre-existing (Phase 7 follow-up #8 / Phase 8 follow-up #13) — unrelated.

---

## Pre-Phase-9 housekeeping (decide before starting Phase 9)

1. **No remote configured.** `git remote -v` is empty. Phase 8's 15 commits + the 4 prior session commits stay local. Nothing to push. If a remote is added later, current `main` has the entire bidirectional-engine overhaul history through Phase 8.

2. **`stash@{0}` still present** — `"WIP on worktree-engine+v2-and-theorems: 66c5594 fix(v2): correct emit/fusion comment + drop trivial helper"`. This was untouched during Phases 7-8. Either drop or pop after inspection — `git stash show -p 'stash@{0}' > /tmp/stash0.patch; head -80 /tmp/stash0.patch` to inspect.

3. **`stash@{1}` still present** — `"WIP on main: 68a900c chore: drop scripts/check-contestants.mts (diagnostic script committed by accident)"`. Same treatment as `stash@{0}` — inspect, decide.

4. **Pre-existing dirty `_generated/parser.ts` files** in `arn`/`log`/`mac`/`proto`/`url`. These have been dirty since at least the start of Phase 7. They're out-of-scope packages (those 5 stay broken on the old DSL). Phase 9 will likely DELETE these packages entirely (per master plan line 831: "the 9 out-of-scope packages stay broken on the old DSL — delete them entirely if convenient"). Don't regenerate; either delete or leave for Phase 9 to clean up.

5. **No worktrees.** `git worktree list` shows only the main checkout.

---

## Where to read first

1. `docs/v2-migration-status.md` — current ratchet. **§ "Phase 8 closeout (2026-05-28)"** (lines 348-505) lists all 15 commits, exit-gate status, and **13 deferred Phase 8 follow-ups**. **§ "Phase 7 closeout"** (lines 242-347) still holds 8 indent follow-ups. **§ "Phase 6 closeout"** (lines 130-240) still holds 10 bytecode follow-ups.

2. `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` lines 797-838 — Phase 9 architectural sketch. Note: the master plan explicitly defers Tasks 9.1-9.x detailing until after Phase 8 lands (now done).

3. `docs/superpowers/plans/2026-05-29-phase-8-unicode-case.md` — example of a well-shaped phase plan; mirror this structure when writing Phase 9's plan. 1382 lines, 8 tasks, full code snippets per step.

4. `AGENTS.md` — non-negotiable invariants (unchanged through Phase 8).

---

## Phase 8 closeout summary (what just landed)

15 commits, final SHA `7450dd0`. Full table in `docs/v2-migration-status.md` "What landed (Phase 8)". Highlights:

- Four schema-level dials: `bom: 'allow' | 'reject' | 'require'`, `unicode: 'NFC' | 'NFD' | 'none'`, `newlines: 'LF' | 'CRLF' | 'either-preserve'`, `caseSensitive: boolean`.
- Reference interpreter (`applyPreamble` in `packages/compiler/src/interp/parse.ts`) and v2 emitter (`emitPreamble` in `packages/compiler/src/emit/v2/index.ts`) carry matching preamble logic. Bytecode untouched.
- HTML schema opts in to `caseSensitive: false`. `<DIV>foo</DIV>` and `<div>foo</div>` produce structurally identical ASTs.
- Inline email-grammar test with `unicode: 'NFC'`: NFD input round-trips through interp + emit to NFC capture; second-pass byte-stable with explicit NFC anchor.

**Compiler test count grew from 335 → 372 (+37).**

**Key design decision surfaced mid-flight (documented in Task 8.5):** dropped the originally-planned "all-defaults short-circuit" in `emitPreamble`. Reason: interp's `applyPreamble` strips BOM at `bom: 'allow'` (the default). If emit short-circuits at all-defaults, interp and emit diverge for BOM-prefixed input. Generated parsers now always have at least one preamble line (the BOM-strip check). Negligible runtime cost, preserves differential-fuzzing invariant.

---

## What's left

### Phase 9 — DSL clean break: `ex()` → `relation()` (NEEDS PLAN)

**Goal** (master plan lines 797-838): Rename + reshape the user-facing DSL. Cosmetic on top of the working engine; landed last.

**Master-plan sketch:**

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

**Scope (per master plan):**
- Rename `ex()` → `relation()` in `packages/parser/src/example.ts`.
- Reshape the builder so encodings are co-equal slots, not chained `.render(target, body)` calls.
- Rewrite the 3 in-scope schemas (`packages/{css,html,markdown}/src/schema.ts`) onto the new DSL.
- Optionally include `packages/{cron,yaml-block}/src/schema.ts` since they're working schemas.
- Delete the old `ex()` builder.
- The 9 out-of-scope packages (`arn`/`log`/`mac`/`proto`/`url`/`css-color`/`css-length-percentage`/`js`/anything else) stay broken on the old DSL — delete them entirely if convenient.

**Exit gate** (master plan line 838): css, html, markdown schemas converted to `relation()` form; all tests green; all gates green; `ex()` and its types deleted from `packages/parser/src/`.

**Plan-the-plan first:** before any code, run `superpowers:writing-plans` to produce `docs/superpowers/plans/2026-05-30-phase-9-relation-dsl.md` with step-level tasks. Aim for 8-12 numbered tasks. Critical: the new builder's exact shape depends on what we've learned from Phases 5-8 (fusion, indent, dials). The DSL should follow.

**Key design questions to answer in the plan-the-plan stage:**

1. **Encodings as slots vs chains.** The master plan shows `encodings: { md, html, ast }` as an object. But that loses the ordering / per-encoding state the current `.render(target, body)` chain has (e.g., the `.render('source', tpl\`...\`)` template often references the parse spans by name — `$.text`). How does the new shape encode references?

2. **`shape` field semantics.** `shape: { text: string }` reads like a type declaration. Is it nominal (a TypeScript type) or structural (a runtime descriptor)? The current DSL infers shape from `.span(name, value)` calls; the new DSL would need to either keep that inference OR require an explicit declaration that pairs with the example string.

3. **Multi-production node types.** The current DSL allows multiple `ex(...).as('NodeType')...` builders to define alternative productions for one node type. How does `relation('NodeType', {...})` express that? An array? Multiple calls that merge?

4. **`.indent()` and `.repeats()` modifiers in the new shape.** These are SpanBuilder methods today. In the new shape, where do they live? Inside the `parse:` slot? As separate fields on the encoding entry?

5. **Validation & refinements.** `.html()`, `.css()`, `.ident()`, `.oneOf(...)` chain after `.span(...)`. Same question — where do they live in the new builder?

6. **Phase 8 dials.** The schema-level dials (`bom`, `unicode`, `newlines`, `caseSensitive`) stay at `defineSchema(...)`. The per-relation builder doesn't need them.

A good first task in Phase 9's plan is to spike the new DSL shape on ONE small relation (e.g., `MarkdownHeading`) and validate the inference / round-trip story before committing to the full rewrite.

---

## Phase 8 follow-ups (deferrable; do NOT address unless reactivated)

Full descriptions in `docs/v2-migration-status.md` § "Phase 8 follow-ups (deferrable)" (lines 444-505). 13 entries. Most relevant to Phase 9:

1. **Bytecode backend has no preamble support.** Cron stays bound to defaults.
2. **`caseSensitive: false` is ASCII-only-correct.** Locale-independent default mapping; Turkish dotless-i edge case is unreachable.
3. **`caseSensitive: false` lowercases ENTIRE input.** Surfaced by Task 8.6 — text content + attribute values also folded. Schemas with the dial MUST write examples in canonical (lowercase) form.
4. **`newlines: 'either-preserve'` is value-stable, not byte-stable** for CRLF input.
5. **`bom: 'allow'` strict expansion** — schemas that previously rejected BOMs now silently strip them.
6. **No per-pattern case-insensitive escape hatch.** With `caseSensitive: false`, `.oneOf({ caseInsensitive: true })` becomes redundant. Simplify HTML schema in a future cleanup pass.
7. **Switch exhaustiveness gap.** No `default:` branch on `bom` / `newlines` switches in either `applyPreamble` or `emitPreamble`. Forward-safety only — type union closed today.
8. **Preamble cost is O(n) per parse call.** Per-document parsing assumed.
9. **`checkRoundTrip` does not exercise non-canonical inputs.**
10. **CSS `_generated/parser.ts` regen drift mechanism.** Task 8.5's regen absorbed Phase 7 indent helpers that were stale. Worth investigating WHY the CSS package's regen got out of sync — running CSS tests may silently regenerate the parser.
11. **`packages/parser/src/index.ts` re-export drift.** Task 8.1 added type re-exports because `compiler/src/model.ts` imports them. Additive and safe.
12. **Literal diacritics in `unicode-roundtrip.test.ts:50-51`.** `NFC_LOCAL` / `NFD_LOCAL` use literal characters instead of `\uXXXX` escapes. Codepoint-correct but source-presentation sub-optimal.
13. **Pre-existing `mac` / `css-color` failures.** Same as Phase 7 follow-up #8.

## Phase 7 follow-ups (still open from prior closeout)

All 8 in `docs/v2-migration-status.md` lines 299-347. Indent-specific. Most notable:

- Forward `render(input, { type:'source' })` doesn't pad nested children (only inverse stringify is fixed).
- `synthesizePieces` requires literal text on indent spans with `min: 1`.
- Bytecode has no indent support.
- Tabs count as width-1 columns.
- Indent depth limited to 16.
- `INDENT_STEP_SPACES` hardcoded to 2.

## Phase 6 follow-ups (still open from prior closeout)

All 10 in `docs/v2-migration-status.md` lines 165-240. Bytecode-specific. None block Phase 9.

---

## User scope decisions (still valid; don't re-litigate)

1. **In-scope packages for maintenance:** css, html, markdown. Phase 7 added yaml-block as an exit-gate target. Phase 8 didn't add a new package. Phase 9 may rewrite css/html/markdown/cron/yaml-block onto the new DSL; the 9 out-of-scope packages can be deleted.
2. **No backward-compatibility constraint.**
3. **Codegen targets:** TS + bytecode. Wasm/Rust deferred indefinitely.
4. **Engine primary; DSL rename cosmetic.** Phase 9 IS the cosmetic phase — the engine is proven.
5. **Plan depth:** full step-level granularity per phase before dispatching.
6. **Cadence:** fully autonomous — push through phases, only stop on genuine blockers.

---

## Workflow pattern (validated through Phases 1.5, 5, 6, 7, 8)

1. **`superpowers:writing-plans` first per phase** — generate step-level plan before any dispatch. Mirror the Phase 8 plan structure (8 tasks, each with files-to-touch, exact code snippets, test commands, commit message).
2. **`superpowers:subagent-driven-development`** to execute task-by-task with fresh implementer + 2-stage review (spec compliance, then code quality) per task.
3. **Verify reviewer diagnoses from primary evidence** — re-run tests yourself before accepting "spec compliant".
4. **One commit per logical change.** Quality-review fix-ups can be follow-up commits (Phase 8 averaged ~1.7 commits per task — 8 task-commits + 7 review-fixup commits).
5. **SendMessage is not available** in this environment — when reviewer feedback needs implementer follow-up, either dispatch a fresh subagent OR apply small surgical fixes directly. Both patterns used through Phase 8.
6. **Plan deviations are expected.** Phase 7 surfaced `skipWs`-vs-`.span('\n')` interaction bugs in test schemas; Phase 8 surfaced `caseSensitive: false` lowercasing whole input (not just tag names). Document deviations in commit messages and closeout notes.
7. **Be honest about coverage gaps.** Code-quality reviewers consistently caught: missing happy paths (Tasks 8.2, 8.5), weak `assert.throws` matchers (Task 8.4), JSON substring scans instead of structured AST access (Task 8.6), idempotence-without-anchor in round-trip tests (Task 8.7). Apply these lessons upfront in Phase 9 plan tests.

---

## First actions in this session

1. Verify state (commands at top).
2. Decide on housekeeping: inspect/drop/pop `stash@{0}` and `stash@{1}`. Decide on the 5 dirty `_generated/parser.ts` files in out-of-scope packages (delete the packages now, or defer to Phase 9's package-cleanup task).
3. Read `docs/v2-migration-status.md` § "Phase 8 closeout" end-to-end — especially the 13 follow-ups.
4. Read `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` lines 797-838 (Phase 9 sketch).
5. **Spike the new DSL shape on ONE relation first.** Pick a small one (e.g., `MarkdownHeading`) and prototype the `relation('NodeType', { shape, encodings })` builder in isolation. Validate that the inference / round-trip story works before committing to the full rewrite.
6. Once the spike is sound, invoke `superpowers:writing-plans` to draft `docs/superpowers/plans/2026-05-30-phase-9-relation-dsl.md`. Aim for 8-12 numbered tasks: builder shape design, type system changes, rewrite css schema, rewrite html schema, rewrite markdown schema, optionally rewrite cron + yaml-block, delete `ex()` and its types, delete out-of-scope packages, doc closeout.
7. Once the plan is written, dispatch Task 9.1 via `superpowers:subagent-driven-development`.

---

## Quick reference: in-scope schema files Phase 9 will rewrite

- `packages/css/src/schema.ts`
- `packages/html/src/schema.ts` (with `caseSensitive: false` from Phase 8)
- `packages/markdown/src/schema.ts`
- `packages/cron/src/schema.ts` (smallest; good Phase 9 first-rewrite target)
- `packages/yaml-block/src/schema.ts` (uses `.indent()` from Phase 7)

## Quick reference: out-of-scope packages Phase 9 may delete

`packages/arn`, `packages/js`, `packages/log`, `packages/mac`, `packages/proto`, `packages/url`, `packages/css-color`, `packages/css-length-percentage`. Each is broken on the old DSL and has been since at least Phase 6. Deletion is the master plan's stated default; confirm with the user before deleting if there's any uncertainty.
