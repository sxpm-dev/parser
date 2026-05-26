# Handoff prompt — resume engine overhaul

Paste this verbatim into the next Claude Code session to resume the bidirectional engine overhaul. The prompt is self-contained; the new session does not need any prior conversation context.

---

# RESUME ENGINE OVERHAUL — leftovers from 2026-05-26 session

I'm continuing the parser3_codex engine overhaul started in a previous session. **Phases 1–4 of the original 9-phase plan are complete (34 commits). Phases 5–9 plus residuals remain.**

## Where to read first

1. **`docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`** — the full plan. Phases 1–4 are marked complete inline with commit SHAs. Phases 5–9 are architectural sketches at the bottom; re-plan each one at step-level granularity before dispatching its first task.

2. **`docs/v2-migration-status.md`** — per-package v2 readiness + the 6 residual test failures.

3. **`AGENTS.md`** at the repo root — the non-negotiable architecture invariants (compiler is domainless; parser packages are schema-only).

4. **`docs/scannerless-emit-v2.md`** — the v2 emit contract.

## Where we are

**Working directory:** `/Users/valerii/Develop/parser3_codex/.claude/worktrees/engine+v2-and-theorems` (a git worktree on branch `worktree-engine+v2-and-theorems`)

**Test state:**
- compiler: 299/299 ✅
- markdown: 76/76 ✅
- cron: 9/9 ✅
- parser: 25/25 ✅
- css: 51/57 (5 fail + 1 skip — all known Phase-2+ feature gaps)
- html: 29/30 (1 fail — same validator-hook gap)

**Most recent commits:**
```
b853d55 feat(compiler): switch-based dispatch jump table for wide first-byte fanout (Task 4.4)
e4cbd10 feat(compiler): wire Aho-Corasick scanner into .until() codegen (Task 4.3)
e824191 feat(compiler): Aho-Corasick scanner library + JS emitter (Tasks 4.1 + 4.2)
f15b59b docs(markdown): remove redundant ORDER NOTE comments (Task 3.4)
9f9337f feat(compiler): dispatch-uniqueness theorems at codegen (Tasks 3.2 + 3.3)
0c83e46 feat(compiler): round-trip closure theorem at codegen (Task 3.1)
5078070 feat(compiler): differential fuzzer harness (interp vs v2) (Task 2.4)
fadef5d feat(compiler): reference interpreter — stringify path (Task 2.3)
527c2c2 feat(compiler): reference interpreter — render path (Task 2.2)
45877e8 feat(compiler): reference interpreter — parse path (Task 2.1)
03801a5 refactor(compiler): retire v1 scannerless emit and direct-fast (Task 1.4)
```

## What's done

| Phase | Tasks | Deliverable |
|---|---|---|
| 1 | 1.1, 1.3a–k, 1.4 | v2 emit feature parity for css/html/markdown; v1 emit deleted. |
| 2 | 2.1–2.4 | Reference interpreter (parse/render/stringify) + differential fuzzer. Trust anchor for everything below. |
| 3 | 3.1–3.4 | Round-trip closure check + dispatch-uniqueness check at codegen time. `ORDER NOTE` comments removed. |
| 4 | 4.1–4.4 | Aho-Corasick `.until()` scanner + switch-based dispatch jump table. |

## What's left (priority order)

### Immediate cleanup — 6 residual test failures

5 css + 1 html, all classified as **validator-hook codegen gap**. v1 had a `validate()` codegen variant that called per-property validators (e.g. `cssColor.validate`, `cssLengthPercentage.validate`) from inside generated declaration parsers. v2 stubs `validate()` and doesn't wire these hooks. The 4 other failures (error-frame format, unknownChars enforcement outside `.until()`, empty-selector rejection) are smaller orthogonal issues.

**Decision needed**: do these as a "Phase 1.5" or fold them into Phase 5/6 work? They're small but real; closing them brings css/html to 100% on v2.

### Fuzzer-surfaced divergences (recorded, deferrable)

From the 60-second fuzz run in Task 2.4:
- html: 0 divergences ✓
- markdown: 486 divergences (mostly stringify canonicalization at block boundaries; documented in `packages/compiler/test/fuzz-corpus/`)
- css: 9,906 divergences (parse + round-trip edge cases on mutated inputs)

**Decision needed**: drive a "Phase 3.5" to apply the round-trip theorem corpus → fix categorically? Or accept and document?

### Phase 5 — Fusion pass: skip AST materialization when target ≠ ast

**Architectural sketch only** in the plan. Re-plan at step-level before dispatching.

Goal: `render(input, {type:'html'})` for markdown should not allocate any `{type:'heading',...}` intermediate. The compiler detects the consumer wants `html` directly and emits a single source→html function with zero object allocation. The Phase 3 round-trip theorem doubles as the correctness gate (fused-html output must equal `stringify('html', parse('ast', input))`).

Likely files: new `packages/compiler/src/emit/v2/fusion.ts`; modifications to `production.ts`. API: add `renderFused(input, {type:'html'})` or merge into existing `render`.

### Phase 6 — Pluggable backend interface + bytecode backend

User picked **TS + bytecode** for codegen targets. Both are scoped here.

- Create `packages/compiler/src/emit/backend.ts` with `Backend` interface (name, fileExtension, emit).
- Refactor `emitV2Parser` into a `'ts'` backend.
- Create `packages/compiler/src/emit/bytecode/` with `ops.ts` (opcode enum), `encoder.ts`, `runtime.ts` (~30 KB interpreter shipped per package).
- CLI: `--backend ts|bytecode`.

The Phase 2 reference interpreter (`packages/compiler/src/interp/`) is the **specification** the bytecode backend must match — both run on `InferredSchema`, so bytecode is just a serialization plus a tight interpreter.

**Exit gate**: at least 1 schema (recommend `cron` — small, simple) generates equivalently under both backends; bytecode runtime + opcode stream total < 50 KB; bytecode throughput within 2× of TS backend.

### Phase 7 — Indentation primitive

Decision point at phase start: span modifier (`.indented({...})`) vs new IR node (`IndentScope`). User picked "decide at phase start."

Unlocks YAML, Python, Pug, indented Markdown lists. Schema authors get `.indent(...)` to express significant-whitespace blocks; codegen emits `requireIndent(col)` / `requireDedent()` against a fixed-size `state.indentStack`.

**Exit gate**: a real YAML-subset schema (or Pug) parses 50 lines of representative input through v2 + interpreter + round-trip theorem.

### Phase 8 — Unicode + case-insensitive + newline + BOM policies

Schema-level dials added to `SchemaInput`:
- `unicode: 'NFC' | 'NFD' | 'none'`
- `newlines: 'LF' | 'CRLF' | 'either-preserve'`
- `caseSensitive: boolean`
- `bom: 'allow' | 'reject' | 'require'`

Codegen impact small: normalize at scan time; lowercased compare table for literals; etc. All baked at codegen, zero runtime overhead.

**Exit gate**: HTML schema parses `<DIV>` and `<div>` equivalently with `caseSensitive: false`; Unicode normalization round-trips for an email-grammar example.

### Phase 9 — DSL clean break (`ex()` → `relation()`)

User explicitly authorized this under the back-compat waiver. **Cosmetic on top of engine work — last priority.**

Goal: rename and reshape the user-facing DSL to match the bidirectional-relation framing. New shape:

```ts
relation('MarkdownLeaf', {
  shape: { text: string },
  encodings: {
    md:   parse('#').span('text', 'Release notes').until('\n'),
    html: tpl`<h1>${$.text}</h1>`,
    ast:  { type: 'heading', depth: 1, text: $.text },
  },
});
```

Rewrite css/html/markdown schemas; delete old `ex()` builder.

## User scope decisions (don't re-litigate these)

1. **In-scope packages: css, html, markdown only.** The 9 others (arn, cron, css-color, css-length-percentage, js, log, mac, proto, url) are out of scope. css-color, css-length-percentage, mac have README "out of scope" notes; arn/cron/log/proto/url still happen to pass on v2.

2. **No backward-compatibility constraint.** Generated parser APIs, file shapes, types can change freely. DSL rename is approved.

3. **Codegen targets: TS + bytecode.** Wasm/Rust deferred indefinitely.

4. **Engine is primary; DSL rename is cosmetic.** Phase 9 last.

## How to work — pattern that worked

1. **Re-plan each architectural-sketch phase at its start** using the `superpowers:writing-plans` skill. Phases 5, 6, 7, 9 are sketches; Phase 8 is small enough to dispatch directly.

2. **Use `superpowers:subagent-driven-development`** for execution: fresh implementer subagent per task, followed by spec-compliance review subagent, followed by code-quality review subagent. Mark task complete only when both reviews approve.

3. **Each task → one commit per logical change.** Refactor commits separate from feature commits. Plan-doc updates as separate commits.

4. **Caveat learned the hard way**: reviewer spot-check diagnoses in this codebase have been **wrong twice** (the `{}`-tracking misdiagnosis in 1.3g; the "html 30/30 / markdown 76/76" inaccurate claim before 1.3j). **Always re-diagnose failures from primary evidence (test output + code reading) rather than trusting prior diagnosis.** When a sub-agent reports a finding, verify the test counts yourself before dispatching the next task.

5. **Phase scope expands**: Phase 1 was planned as 4 tasks; reality was 11+ sub-tasks. Expect every architectural-sketch phase to reveal 2x+ scope once started. Budget accordingly.

6. **Continuous execution authorized**: per the `subagent-driven-development` skill, don't pause to check in between tasks unless something genuinely blocks progress. The user wants push-through.

7. **Each task is ~10–15 minutes of subagent wall time and ~150–300K subagent tokens.** Pacing matters.

## First action when resuming

Run:
```bash
cd /Users/valerii/Develop/parser3_codex/.claude/worktrees/engine+v2-and-theorems
pwd && git log --oneline -5 && git status --short
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)"
```

Verify you're on `worktree-engine+v2-and-theorems` at `b853d55` with 299/299 compiler tests passing. If anything has drifted, investigate before continuing.

Then ask the user (via `AskUserQuestion`):

1. **Which order for the remaining work?**
   - Recommended: residuals first (closes Phase 1 fully) → Phase 5 → 6 → 7 → 8 → 9
   - Alternative: skip residuals, go straight to Phase 5
   - Alternative: prioritize Phase 7 (indentation) — unlocks YAML/Pug schemas immediately
   - Alternative: prioritize Phase 9 (DSL rename) — cleaner working surface for subsequent phases

2. **For the next phase about to be planned, how aggressive on planning depth?**
   - Full step-level granularity (~30 min planning before dispatch)
   - Coarse phase plan + re-plan per task (cheaper upfront, may need more re-planning mid-flight)

3. **Continue continuous-execution mode (dispatch all tasks of the next phase without check-in), or check in after each phase exit gate?**
   - Recommended: continuous within a phase; check in at phase boundaries.

Then invoke `superpowers:writing-plans` to plan the chosen first task, and `superpowers:subagent-driven-development` to execute it.

## Key files reference

| File | Purpose |
|---|---|
| `docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md` | Master plan; Phases 5–9 sketches at bottom |
| `docs/v2-migration-status.md` | Per-package v2 readiness + 6 residuals |
| `docs/scannerless-emit-v2.md` | v2 emit contract |
| `packages/compiler/src/index.ts` | Pipeline: composition → productions → roles → validate → render-targets → invert → checkRoundTrip → checkDispatch → tokenizer → emit |
| `packages/compiler/src/interp/` | Reference interpreter (parse + render + stringify) |
| `packages/compiler/src/check/round-trip.ts` | Round-trip theorem |
| `packages/compiler/src/check/dispatch.ts` | Dispatch-uniqueness theorem |
| `packages/compiler/src/emit/v2/` | v2 codegen — only emit path |
| `packages/compiler/src/emit/v2/scan-until-ac.ts` | Aho-Corasick scanner library + JS emitter |
| `packages/compiler/src/emit/v2/role-ladder.ts` | Role-dispatch ladder + switch-based jump table |
| `packages/compiler/src/fuzz/` | Differential fuzzer harness |
| `packages/compiler/test/fuzz-corpus/` | 53 regression fixtures from the fuzzer |
| `packages/{css,html,markdown}/src/schema.ts` | The 3 in-scope schemas |
