# Raws-Mode (Captures-Path) Scan-Waste Follow-Up Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. This is a FOLLOW-UP to `2026-06-10-codegen-scan-waste-perf.md` — read its Tasks 1–3 first; this plan ports the same two optimizations to the captures path.

**Goal:** Close the raws-mode gap by porting until-divergence merging and until-viability guards to the captures-path emitters, and by reducing captures-envelope GC pressure.

**Status:** DRAFT — written at the Task 6 decision checkpoint of the parent plan. Scope it properly (re-read `dispatch.ts` / `role-ladder.ts` / `production.ts`) before executing; the task list below is the measured starting point, not a finished step-by-step plan.

## Profile evidence (2026-06-11, css 500KB, mode:'raws', ~49 ms/iter under load)

| self-time | function | meaning |
|---|---|---|
| 23.3% | (garbage collector) | captures envelopes + source-range objects |
| 23.2% | `parseRule` | includes failed Rule attempts on every declaration |
| 16.5% | `parseDeclaration__alt1` | plain alt — re-parses after alt0 fails |
| 9.7% | `parseDeclaration__alt0` | !important alt — ~100% wasted scans |
| 4.5% | `computeLineStarts` | O(n) per parse, raws only |
| 1.3% | `makeSource` | per-node binary-search positions |

Position machinery (≈6%) is BELOW the parent plan's 20% threshold — do NOT
start with incremental line tracking; the win is in the speculation waste
(≈30%+) and GC (≈23%).

## Key facts for the implementer

- raws mode bypasses structured fusion entirely (`emitFusedRenderStructured` builds `ctx.raws: false` and the fused entry is only taken in fast mode — see `emit/v2/index.ts` state-init / mode plumbing). The captures path emits `parse<Node>__alt<N>` per production and `parse<Node>` speculation chains (`emit/v2/dispatch.ts`, `emit/v2/production.ts`, `emit/v2/role-ladder.ts`).
- `detectUntilDivergence` (Task 1 of the parent plan) is emitter-agnostic — reuse it as-is.
- `untilGuardSpec` + `emitTerminatorHelper` live in `fusion-structured.ts`; extract them to a shared module (e.g. `emit/v2/until-guard.ts`) so both paths emit identical helpers (dedupe by the same name-hash so a schema emitting both paths shares one helper).

## Candidate tasks (validate each with counters + A/B before the next)

1. **Counters first.** Port the call-count instrumentation to the captures path (regex `function parse[A-Za-z]+(__alt[0-9]+)?\(`) and record the raws-mode waste table. Expect the same 22,326/18,267 shape as fast mode had.
2. **Until-viability guard in the captures-path role ladder** (`role-ladder.ts` / `dispatch.ts` speculation chains): wrap all-but-last until-led probes with the shared `__untilTerminator_*` guard. This is the smaller, lower-risk port — do it first and measure.
3. **Until-divergence merge for captures-path alt chains** (`parseDeclaration` = alt0→alt1): the captures path returns `{__production, ...captures}` envelopes instead of built objects, so the merged emit needs the captures-envelope analog of the long/short tail helpers. Mirror `emitFusedUntilDivergencePair`'s structure; the correctness argument (single scan with long stops; resume-rescan on long-tail failure) carries over verbatim.
4. **GC pressure** (only after 2+3, re-profile): candidates — reuse a scratch captures object shape, lazy `source` range materialization (build ranges only for nodes that survive speculation; today rolled-back alts still allocated theirs), and `computeLineStarts` once per render() instead of per nested parse if that's what the 4.5% hides.

## Verification

Same gates as the parent plan: compiler suite, all-package regen + tests,
css conformance/round-trip (raws mode is the byte-fidelity path — round-trip
tests are the hard gate here), golden-hash refresh, A/B bench with
`mode:'raws'`, baselines updated at the end.
