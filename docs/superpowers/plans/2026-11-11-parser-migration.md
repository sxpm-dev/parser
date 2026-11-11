# Approved parser migration

Scope: migrate the 49 approved historical parser names alongside CSS/Less/SCSS; exclude full JavaScript. Preserve the schema-only package contract and domainless compiler. Wire every parser into correctness checks, benchmark competitors and size/performance gate tooling. Existing gate thresholds remain unchanged. The separately requested quiet-machine timing run stays paused.

1. Extend generic inference/codegen only where required: prefix-matched captures, scalar production references and configurable whitespace. Verify recursive composition, rejection and inverse checks.
2. Migrate schemas by family, documenting the supported historical subset and testing unseen inputs, malformed inputs and inverse reconstruction.
3. Discover packages generically in generation, tests, audits, browser builds and gates; provide benchmark cases and independent competitors with honest comparison labels.
4. Run generation, correctness, type and architecture checks; verify benchmark adapters outside timing. Record remaining scope gaps explicitly. Perform a final independent review.

## Progress
- Inventory: 49 additional names approved. Historical sources are read-only references.
- Implementation in progress. No migration is complete merely because a package exists.

- Generic composition implemented and tested: scalar refs, token captures, stop/whileMatches/trailing lists and significant whitespace.
- All 49 package names implemented with documented projections and scope; historical teaching-input regressions retained.
- Benchmark adapters preflighted without timing; package discovery and new size baselines wired. Existing style baselines unchanged.
- Independent review found two trailing-separator bugs and cyclic native JSON benchmark output. Both list bugs have RED→GREEN tests; unsupported native JSON modes are omitted.
- Ruling: preserve example-defined projections instead of claiming legacy AST/API compatibility; package docs explicitly identify narrower semantic coverage.
- Ruling: leave new performance baselines uninitialized while the user’s timing pause is active; missing-baseline gates remain failures, not passes.

- Final verification: 181/181 tests; typecheck and 52-package architecture audit passed; 49 competitor preflights passed. Existing style size gates passed unchanged.
- Additional inverse regression: overlapping scalar/list alternatives now retry distinct layouts through their own lexical rules. Disjoint shapes and shared inverse layouts retain the fast path.
- Final initial size baselines recorded for all 49 additions; timing certification remains paused.
