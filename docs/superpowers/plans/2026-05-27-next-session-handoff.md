# Handoff prompt — resume engine overhaul (post Phase 5)

Paste this into the next Claude Code session to resume.

---

# RESUME ENGINE OVERHAUL — Phase 6 onwards

I'm continuing the parser3_codex bidirectional engine overhaul. **Phase 5 (fusion pass) is now closed.** All in-scope packages are 100% on v2 emit and fusion is wired into the public `render()`:

- parser: 25/25 ✅
- compiler: 312/312 ✅ (+8 fusion tests since Phase 5 started)
- css: 56/57 (0 fail, 1 intentional skip) ✅
- html: 30/30 ✅
- markdown: 76/76 ✅

## Where to read first

1. **`docs/superpowers/plans/2026-05-27-phase-6-bytecode-backend.md`** — Phase 6 plan (8 tasks, ready to execute).
2. **`docs/superpowers/plans/2026-05-27-phase-5-fusion.md`** — Phase 5 plan (done; commits referenced inline in `docs/v2-migration-status.md`).
3. **`docs/v2-migration-status.md`** — current ratchet + Phase 5 closeout notes + known follow-ups.
4. **`docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`** — the master plan. Phase 5 is now marked closed inline. Phases 6–9 still need step-level re-planning when their turn comes (Phase 6 just got one).
5. **`AGENTS.md`** — non-negotiable architecture invariants.
6. **`docs/scannerless-emit-v2.md`** — v2 emit contract.

## Working directory + branch

`/Users/valerii/Develop/parser3_codex/.claude/worktrees/engine+v2-and-theorems` on branch `worktree-engine+v2-and-theorems`. Verify state:

```bash
cd /Users/valerii/Develop/parser3_codex/.claude/worktrees/engine+v2-and-theorems
git log --oneline -20
npm run test -w @parser2/parser 2>&1   | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/compiler 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/css 2>&1      | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/html 2>&1     | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/markdown 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
npm run test -w @parser2/cron 2>&1     | grep -E "^# (tests|pass|fail|skipped)"
```

Expected: parser 25, compiler 312, css 56/57+1skip, html 30, markdown 76, cron 9.

## Recent commits (Phase 5 closeout, this session)

```
12ed4b6 docs: Phase 5 fusion closeout
173fda3 test(v2): tighten fusion round-trip coverage floors + drop dead void
fc1041f test(v2): fusion round-trip coverage across schemas (Task 5.4)
b13fb57 fix(v2): fusion eligibility gates stopBefore + drops dead sep state
f52948e feat(v2): fuse recursive children (Task 5.3)
38ec3b9 feat(v2): wire fused path into render() entry point (Task 5.2)
66c5594 fix(v2): correct emit/fusion comment + drop trivial helper
e5637b0 feat(v2): fused template-body render emitter (Task 5.1)
```

## What's done

| Phase | Status | Deliverable |
|---|---|---|
| 1 | ✅ Closed | v2 emit feature parity; v1 emit deleted |
| 2 | ✅ Closed | Reference interpreter (parse/render/stringify) + differential fuzzer |
| 3 | ✅ Closed | Round-trip closure + dispatch-uniqueness theorems |
| 4 | ✅ Closed | Aho-Corasick `.until()` scanner + switch-based dispatch jump table |
| 1.5 | ✅ Closed | 6 residual css/html failures all closed. Engine adds: `syntaxErrorAt` carries byte; unknownChars guard; `rejectSuffix` array + `nonEmpty`; `requireStop`; validator-hook codegen |
| 5 | ✅ Closed this session | Fusion pass — `__renderFused` wired into public `render()`; recursive children fuse end-to-end (markdown Document); `stopBefore` gated; round-trip coverage floors |

## What's left

### Phase 6 — Pluggable backend interface + bytecode backend (PLAN READY)

`docs/superpowers/plans/2026-05-27-phase-6-bytecode-backend.md` is written and ready to execute. 8 tasks:

- **6.1**: Extract `Backend` interface; register existing v2 TS emit as `TS_BACKEND`
- **6.2**: Opcode set + encoder skeleton (`bytecode/ops.ts`, `bytecode/encoder.ts`)
- **6.3**: Bytecode runtime interpreter — parse path
- **6.4**: Bytecode render dispatch + inverse stringify
- **6.5**: Bytecode-backend file emit + integration (generates a `.bcode.ts` file)
- **6.6**: Generate cron via bytecode backend + verify equivalence with TS backend
- **6.7**: Budget verification (runtime + opcode stream ≤ 50 KB; throughput within 2× of TS)
- **6.8**: Documentation closeout

**Phase 6 is substantial.** Each task is non-trivial (especially 6.3 — full opcode interpreter — and 6.4 — render/stringify on bytecode). Expect ~20–30 min subagent wall time + 2 review passes per task. May span multiple sessions.

Scope reminder (per user decisions, still in effect):
- In-scope packages for ongoing maintenance: **css, html, markdown only**
- Phase 6 reactivates **cron** as the exit-gate schema (small + simple)
- **TS + bytecode are both first-class codegen targets**
- Bytecode FIRST SLICE deliberately defers: fusion (uses captures-based render), raws mode

### Phases 7–9 (still architectural sketches in master plan)

| Phase | Sketch |
|---|---|
| 7 | Indentation primitive (span modifier vs IR node — decide at phase start). YAML/Pug schemas as exit-gate test |
| 8 | Unicode/case/newline/BOM schema policies; baked at codegen |
| 9 | DSL clean break: `ex()` → `relation()` (cosmetic, runs last) |

Re-plan each at step-level using `superpowers:writing-plans` before dispatching tasks.

## Known follow-ups (deferrable)

### From Phase 1.5 quality reviews
- AC fast-path skips the unknownChars guard. No live schema combines AC scans (≥3 stops) with `unknownChars: 'reject'`. See `packages/compiler/src/emit/v2/span.ts:854`.
- `emitRawUntilSpan` does not emit unknownChars guard. Documented design tension. See `packages/compiler/src/emit/v2/span.ts:1067`.
- `nonEmpty` failure path doesn't update `state.maxOff` precisely — degrades error-position quality only, not correctness.
- `.lengths()` refinement not emitted by v2 codegen. css-color hex schema dropped the call with a TODO at `packages/css-color/src/schema.ts:97`.

### From Phase 5 quality reviews
- Programmatic allocation-profile verification deferred (the Phase-5 master-plan exit gate). Fusion's actual gate is the round-trip correctness theorem (5.4), which is green; perf-profile gate awaits a bench harness.
- `stopBefore` in fused repeats currently disqualifies the production from fusion. Implementing the stop-sentinel check in `emitFusedRepeatsSpan` would recover the optimization for HTML schemas that use it.
- `isAbsentAllowedSpan` / `repeatsJoinSeparator` duplicated between `emit/render.ts` and `emit/v2/fusion.ts`. Extract to shared `emit/span-helpers.ts` to remove drift risk. Optional.
- Multi-prod root fusion: `__rootProductionKey` is fixed to `<rootType>#0`. Future schemas with multi-prod roots fall back to captures (correct, just not fused).

## User scope decisions (still valid; don't re-litigate)

1. In-scope packages for maintenance: **css, html, markdown only**. The 9 others are out of scope EXCEPT for Phase 6 where cron is the bytecode exit-gate target.
2. **No backward-compatibility constraint.** APIs, file shapes, types can change freely.
3. **Codegen targets: TS + bytecode.** Wasm/Rust deferred indefinitely.
4. **Engine is primary; DSL rename is cosmetic.** Phase 9 last.

## Workflow pattern (worked well in Phases 1.5 + 5)

1. **Re-plan each architectural-sketch phase** using `superpowers:writing-plans` before execution.
2. **Use `superpowers:subagent-driven-development`** to execute task-by-task with fresh implementer + 2-stage review per task.
3. **Verify reviewer diagnoses from primary evidence** — past reviewers in this codebase have been wrong; always re-run tests yourself before accepting "spec compliant."
4. **Cause/cost discipline**: each task → one commit per logical change. Quality-review fix-ups can be follow-up commits.
5. **Out-of-scope edits**: principled correctness fix (acceptable) vs gold-plating (reject and ask for revert). Phase 5 had zero out-of-scope edits.
6. **Regenerate scope**: ONLY in-scope packages (`-w @parser2/markdown -w @parser2/css -w @parser2/html`). Workspace-wide `npm run generate` regenerates out-of-scope packages and surfaces pre-existing codegen bugs in css-length-percentage and mac. For Phase 6 cron is added to the regenerate scope explicitly.

## First action in the next session

1. Verify state (commands above).
2. Read `docs/superpowers/plans/2026-05-27-phase-6-bytecode-backend.md` end-to-end.
3. Read `packages/compiler/src/emit/v2/index.ts` (the TS backend's current entry — Task 6.1 wraps this) and `packages/cron/src/schema.ts` (the exit-gate schema).
4. Dispatch Task 6.1 implementer via `superpowers:subagent-driven-development`. Task 6.1 is pure refactor — should be a small, safe first step.
