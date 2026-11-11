# Generic parsing and inverse performance

Execute inline using superpowers:executing-plans. User authorized optimization and measurement; preserve all existing working-tree changes.

**Goal:** Improve CSS/SCSS parse and inverse performance through domainless compiler changes, preserving schema-derived behavior and inverse rejection guarantees.
**Spec:** docs/example-first-structure-dsl.md and the user request: schemas/examples are the sole source of truth; compiler and generated parsing engine are language/domain agnostic.

- [x] Profile existing parse/stringify; record same-machine before benchmarks including stringify-only.
- [x] Add regression tests for arbitrary grammars, inverse tampering, overlap/ambiguity and schema-name invariance.
- [x] Optimize measured hot paths generically, regenerate all parser packages, and run tests/typecheck/audit.
- [x] Rerun identical benchmarks, existing performance and size gates without weakening them; document tradeoffs/results.

No package-local runtime code, language branches, schema-name/output-name assumptions, unchecked stringify bypass, schema changes for speed, or unrequested commits.

## Outcome
32 tests, typecheck, deterministic generation and package audit pass. Existing size gates pass. Absolute performance gates failed under heavy system load; before/after comparisons show faster parsing and approximately 1.9× faster 100 KB reverse conversion. No baselines reset; quiet-machine performance-gate verification remains outstanding. See docs/benchmarks/2026-11-11-performance/RESULTS.md.
