# Handoff prompt — resume engine overhaul (post Phase 1.5)

Paste this into the next Claude Code session to resume.

---

# RESUME ENGINE OVERHAUL — Phase 5 onwards

I'm continuing the parser3_codex bidirectional engine overhaul. **Phase 1.5 (residual test failures) is now closed.** All in-scope packages are 100% on v2 emit:

- compiler: 304/304 ✅
- css: 56/57 (0 fail, 1 intentional skip) ✅
- html: 30/30 ✅
- markdown: 76/76 ✅
- parser: 25/25 ✅

## Where to read first

1. **`docs/superpowers/plans/2026-05-27-phase-5-fusion.md`** — Phase 5 plan (5 tasks, ready to execute).
2. **`docs/superpowers/plans/2026-05-27-phase-1.5-residuals.md`** — Phase 1.5 plan (done; commits referenced inline).
3. **`docs/v2-migration-status.md`** — current ratchet + known follow-ups.
4. **`docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`** — the master plan. Phases 5–9 are architectural sketches at the bottom; re-plan each at step-level before dispatching.
5. **`AGENTS.md`** — non-negotiable architecture invariants.
6. **`docs/scannerless-emit-v2.md`** — v2 emit contract.

## Working directory + branch

`/Users/valerii/Develop/parser3_codex/.claude/worktrees/engine+v2-and-theorems` on branch `worktree-engine+v2-and-theorems`. Verify state:

```bash
cd /Users/valerii/Develop/parser3_codex/.claude/worktrees/engine+v2-and-theorems
git log --oneline -20
npm run test -w @parser2/parser 2>&1   | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/css 2>&1      | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/html 2>&1     | grep -E "^# (tests|pass|fail)"
npm run test -w @parser2/markdown 2>&1 | grep -E "^# (tests|pass|fail)"
```

## Recent commits (Phase 1.5 closeout, this session)

```
870e5f5 docs(v2): Phase 1.5 closeout — css/html residuals at 100%
7fc7dbc docs: Phase 1.5 plan + Phase 5 fusion plan saved
de4f24a fix(v2): preserve validator cause + tag stub validators with real package name
9096a5b feat(v2): validator-hook codegen — validate(input, {validate:true}) dispatches per-field validators
df5d9fe fix(interp): use earliest as maxOff comparator in rawUntil requireStop
95cb589 feat(parser/v2): until requireStop fails production on EOF without stop match
e2e408b test(css): rename no-selector fixture to empty-rule-body to match content
be49259 feat(parser/v2): rejectSuffix accepts array + nonEmpty modifier
c7760d8 refactor(v2): hoist CONTENT_CLASSES + cover regex/template class bytes
9c33e3f docs(v2): note rawUntil unknownChars deferral as design tradeoff
a7fbe36 fix(v2): reject undeclared bytes in .until() bodies under unknownChars:'reject'
e4e0330 test(v2): cover EOF branch in syntaxErrorAt regression test
7a878c1 fix(v2): syntaxErrorAt headline includes unexpected byte and position
```

## What's done

| Phase | Status | Deliverable |
|---|---|---|
| 1 | ✅ Closed last session | v2 emit feature parity; v1 emit deleted |
| 2 | ✅ Closed last session | Reference interpreter (parse/render/stringify) + differential fuzzer |
| 3 | ✅ Closed last session | Round-trip closure + dispatch-uniqueness theorems |
| 4 | ✅ Closed last session | Aho-Corasick `.until()` scanner + switch-based dispatch jump table |
| 1.5 | ✅ Closed this session | 6 residual css/html failures all closed. Engine adds: `syntaxErrorAt` carries byte; unknownChars guard; `rejectSuffix` array + `nonEmpty`; `requireStop`; validator-hook codegen |

## What's left

### Phase 5 — Fusion (PLAN READY)

`docs/superpowers/plans/2026-05-27-phase-5-fusion.md` is written and ready to execute. 5 tasks:

- **5.1**: Fuse leaf-production template bodies (markdown Heading is the smallest case)
- **5.2**: Wire fused path into `render()` + extend round-trip theorem
- **5.3**: Extend fusion to recursive children (markdown Document)
- **5.4**: Verify fusion correctness across all schemas via round-trip fixtures
- **5.5**: Documentation closeout

The plan acknowledges architectural uncertainty in the sketch. Phase 5's first action should be: **read the plan, then read `packages/compiler/src/emit/render.ts`, `infer/invert.ts`, and `interp/` to map the current pipeline shape**, THEN dispatch Task 5.1.

Expected per-task: ~15min subagent wall time + 2 review passes (spec + code quality).

### Phases 6–9 (still architectural sketches in master plan)

| Phase | Sketch |
|---|---|
| 6 | Pluggable backend interface + bytecode backend. `cron` schema as exit-gate target |
| 7 | Indentation primitive (span modifier vs IR node — decide at phase start). YAML/Pug schemas as exit-gate test |
| 8 | Unicode/case/newline/BOM schema policies; baked at codegen |
| 9 | DSL clean break: `ex()` → `relation()` (cosmetic, runs last) |

Re-plan each at step-level granularity using `superpowers:writing-plans` before dispatching tasks.

## Known follow-ups (deferrable)

From Phase 1.5 quality reviews:

- **AC fast-path** skips the unknownChars guard. No live schema combines AC scans (≥3 stops) with `unknownChars: 'reject'`. See `packages/compiler/src/emit/v2/span.ts:854`.
- **`emitRawUntilSpan`** does not emit unknownChars guard. Documented design tension. See `packages/compiler/src/emit/v2/span.ts:1067`.
- **`nonEmpty` failure path** doesn't update `state.maxOff` precisely — degrades error-position quality only, not correctness. Shared between codegen and interpreter (no drift).
- **`.lengths()` refinement** not emitted by v2 codegen. css-color hex schema dropped the call with a TODO comment at `packages/css-color/src/schema.ts:97`. Restore once codegen support exists.

## User scope decisions (still valid; don't re-litigate)

1. In-scope packages: **css, html, markdown only**. The 9 others are out of scope.
2. **No backward-compatibility constraint.** APIs, file shapes, types can change freely.
3. **Codegen targets: TS + bytecode.** Wasm/Rust deferred indefinitely.
4. **Engine is primary; DSL rename is cosmetic.** Phase 9 last.

## Workflow pattern (worked well in Phase 1.5)

1. **Re-plan each architectural-sketch phase** using `superpowers:writing-plans` before execution.
2. **Use `superpowers:subagent-driven-development`** to execute task-by-task with fresh implementer + 2-stage review per task.
3. **Verify reviewer diagnoses from primary evidence** — past reviewers in this codebase have been wrong; always re-run tests yourself before accepting "spec compliant."
4. **Cause/cost discipline**: each task → one commit per logical change. Quality-review fix-ups can be follow-up commits. Each task ~10–15 min subagent wall time + ~150–300K subagent tokens.
5. **Out-of-scope edits**: if a subagent touches an out-of-scope package (e.g. css-color in Phase 1.5 Task 5), evaluate whether it was a principled correctness fix (acceptable) vs gold-plating (reject and ask for revert). The css-color fix in Task 5 was principled (the dependent validator had latent bugs blocking the in-scope test).

## First action in the next session

1. Verify state (commands above).
2. Read `docs/superpowers/plans/2026-05-27-phase-5-fusion.md` end-to-end.
3. Read `packages/compiler/src/emit/render.ts` (entry point at line 346).
4. Read `packages/compiler/src/emit/inverse.ts` (Phase 4 inverse derivation).
5. Read `packages/compiler/src/interp/render.ts` + `stringify.ts` (the trust anchors).
6. Read `packages/compiler/src/check/round-trip.ts` (the correctness gate).
7. Dispatch Task 5.1 implementer via `superpowers:subagent-driven-development`.
