# v2 emit migration status (updated 2026-05-27 after Phase 1.5 closeout)

Status of `--v2` codegen + tests for the 3 in-scope parser packages.
Captured by running
`npx tsx packages/compiler/src/cli.ts packages/<pkg>/src/schema.ts --v2 && npx tsx --test packages/<pkg>/test/*.test.ts`
from the worktree root. See `docs/scannerless-emit-v2.md` for the v2 design
contract.

## Current ratchet (after Phase 1.5 — all in-scope packages green on v2)

| Package   | v2 pass | v2 fail | Notes |
| --------- | ------- | ------- | ----- |
| compiler  | 304/304 | 0       | v2-regressions test suite (incl. 5 Phase 1.5 regressions) |
| css       | 56/57   | 0 (+1 skip) | green; 1 intentional skip |
| html      | 30/30   | 0       | green |
| markdown  | 76/76   | 0       | green |
| arn / cron / log / proto / url | passing | 0 | green (no regressions, not maintained) |
| mac       | 4/5     | 1       | pre-existing validate-hook gap (out of Phase 1 scope) |
| css-color | 3/4     | 1       | pre-existing `.lengths([])` refinement gap — TODO in schema (out of Phase 1 scope; improved from 0/4 by Phase 1.5 / Task 5) |
| css-length-percentage | 2/4 | 2 | pre-existing v2 gap (out of Phase 1 scope) |
| js        | 0/2     | 2       | package not set up (no `src/index.ts`) |

## Phase 1.5 closeout (2026-05-27)

The 6 residual failures called out in the prior status section have all been
fixed. The fixes landed across 5 task-level commits (one task per category)
plus quality-review follow-ups. Summary of what each commit added:

| Task | Commit(s) | Closes |
| --- | --- | --- |
| 1 | `7a878c1` + `e4e0330` | `syntaxErrorAt` headline now `Unexpected '<ch>' at position N` (or `end of input`); matches css "reports source frame for unexpected '}'". |
| 2 | `a7fbe36` + `9c33e3f` + `c7760d8` | Depth-0 unknownChars guard in `.until()` bodies when schema declares `unknownChars: 'reject'` AND a content class; closes css "rejects unrecognized characters". |
| 3 | `be49259` + `e2e408b` | DSL: `rejectSuffix` accepts arrays; new `nonEmpty` modifier on `.until()`. CSS Rule selector uses both. Closes css "keeps invalid stylesheet boundaries explicit". |
| 4 | `95cb589` + `df5d9fe` | DSL: `requireStop` on `.until()`/`.rawUntil()`; `nonEmpty` on `.rawUntil()`. HTML quoted attr-value uses requireStop; unquoted-value stops include `"`/`'`. Closes html "validates rejected syntax". |
| 5 | `9096a5b` + `de4f24a` | Validator-hook codegen: `validate(input, {validate:true})` walks raws AST, dispatches per-rule. New `validate-emit.ts` module; `validatorErrorAt` runtime helper preserves underlying cause via ES2022 `{ cause }`. Closes both css validate tests. |

## v2 emit features landed in Tasks 1.3a–k (history, pre-1.5)

- `.until()` / `.rawUntil()` span emit with balanced bracket / string /
  comment / url-raw token-class skips (1.3a / 1.3g).
- Multi-role non-repeats span emit with role-dispatch ladder (1.3b).
- Multi-role repeats span emit with role-dispatch ladder + sep / min /
  max / trailing / stopBefore policy (1.3c).
- Fallthrough role handling (catch-all roles tried last) (1.3d).
- Number-class refinements honored by the scanner (1.3e).
- Peek-scan discriminator for same-byte / multi-fallthrough roles (1.3f).
- Leading-sep sweep + sep-already-consumed tolerance in repeats (1.3j +
  1.3k commit `e40fa8c`).
- Inter-span gap skips `/* */` comments when schema declares
  `tokens: ['comment']` — preserves leading skip as ws-only, suppresses
  comment-eating before optional or comment-consuming spans (1.3k commit
  `c608afb`, refined in `e40fa8c` and `ab2d4b8`).
- Comment-class span returns trimmed interior, not raw `/* … */` byte
  slice (1.3k commit `ab2d4b8`).
- `.until()` always trims trailing whitespace (ignores schema `trim:false`
  to match v1 runtime behavior) (1.3k commit `f1c3a12`).
- Speculation chain reorders alts within a same-first-byte group:
  longer literal prefixes first, tag-restricted (`.oneOf`) alts before
  catch-alls (1.3k commits `4f7a30d` + `bf0a371`).
- `syntaxErrorAt` headline carries the unexpected byte (1.5/T1).
- Depth-0 unknownChars guard in `.until()` bodies (1.5/T2).
- `rejectSuffix` array + `nonEmpty` modifier (1.5/T3).
- `requireStop` modifier on `.until()`/`.rawUntil()` (1.5/T4).
- Validator-hook codegen — `validate(input, {validate:true})` (1.5/T5).

## Known follow-ups (deferrable)

- AC fast-path inside `.until()` skips the unknownChars guard. No live
  schema combines AC-eligible scans (≥3 stops, no balanced/strings/url)
  with `unknownChars: 'reject'`, so it's a documented blind spot. See
  `packages/compiler/src/emit/v2/span.ts:854` for the comment.
- `emitRawUntilSpan` does not emit the unknownChars guard. The rawUntil
  semantic intent is "raw bytes" — applying the guard there has a design
  tension. Today html and markdown both declare `'tolerate'`, so no live
  gap. See `packages/compiler/src/emit/v2/span.ts:1067` for the comment.
- `nonEmpty` failure path does not update `state.maxOff` to the deepest
  reached position — degrades error-position quality, not correctness.
  Shared between codegen and interpreter (no drift). Track if error
  diagnostics surface as an issue.
- v2 codegen does not emit `.lengths([])` refinement. css-color's hex
  schema dropped the call in Phase 1.5 / Task 5 with a TODO comment.
  Restore once codegen support exists.

## Where to next

Phase 1 is fully closed. The 6 residual failures held the v2 ratchet open;
all are now resolved. Next phase up per the engine overhaul plan
(`docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`) is
Phase 5 (fusion pass — skip AST when target ≠ ast). Re-plan that phase at
step-level granularity before dispatching its first task.
