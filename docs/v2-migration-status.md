# v2 emit migration status (updated 2026-05-26 after Task 1.3k closeout)

Status of `--v2` codegen + tests for the 3 in-scope parser packages.
Captured by running
`npx tsx packages/compiler/src/cli.ts packages/<pkg>/src/schema.ts --v2 && npx tsx --test packages/<pkg>/test/*.test.ts`
from the worktree root. See `docs/scannerless-emit-v2.md` for the v2 design
contract.

## Current ratchet (after Tasks 1.3a–k)

| Package   | v2 pass | v2 fail | Notes |
| --------- | ------- | ------- | ----- |
| compiler  | 33/33   | 0       | v2-regressions test suite |
| css       | 51/57   | 5 (+1 skip) | residual = direct-fast / validate-hook gaps |
| html      | 29/30   | 1       | residual = validate-hook gap (unterminated quote rejection) |
| markdown  | 76/76   | 0       | green |
| arn / cron / log / proto / url | passing | 0 | green (no regressions) |
| mac       | 4/5     | 1       | pre-existing validate-hook gap |
| css-color | 0/4     | 4       | pre-existing v2 gap (out of Phase 1 scope) |
| css-length-percentage | 2/4 | 2 | pre-existing v2 gap (out of Phase 1 scope) |
| js        | 0/2     | 2       | package not set up (no `src/index.ts`) |

## Residual Phase 1 failures (6 total, all out-of-scope for v2 emit)

All six residuals share one root: v1's CSS / HTML packages rely on
hand-rolled fast paths (`packages/compiler/src/emit/direct-fast.ts`)
and a validator-hook codegen variant (`emit/scannerless/parse.ts`'s
`'validate'` mode) that v2's scannerless emit doesn't yet replicate.
They're tracked under Task 1.3k in the plan; Phase 2 (reference
interpreter) and the validator-hook codegen work are the natural
homes.

| Failure | Phase home |
| --- | --- |
| css "rejects unrecognized characters" (backtick in value) | Phase 2/3 — `unknownChars` policy in v2 |
| css "reports source frame for unexpected '}'" | Phase 2 — standardize error shape via reference interpreter |
| css "keeps invalid stylesheet boundaries explicit" (empty selector) | Phase 2/3 — `.nonEmpty()` refinement or schema rework |
| css "validate rejects configured color and length values" | Phase 2/3 — validator-hook codegen variant |
| css "validate reports generated validator failures as regular syntax errors" | same as above |
| html "validates rejected syntax" (one input: unterminated quote) | Phase 2/3 — same validator-hook gap |

## v2 emit features landed in Tasks 1.3a–k

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

## Phase 1 next step

Task 1.4 (delete v1 emit) is gated on either (a) accepting the 6 residual
v2 failures as known feature gaps and proceeding to Phase 2, or (b)
extending Task 1.3 with a validator-hook codegen variant (1.3l) and
direct-fast retirement (1.3m). The plan currently takes path (a) — see
"Exit criteria for combined Task 1.3" in
`docs/superpowers/plans/2026-05-26-bidirectional-engine-overhaul.md`.
