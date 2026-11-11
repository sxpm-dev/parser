# Example inference rebuild implementation plan

> Execute inline with superpowers:executing-plans. User authorized replacement, verification, and benchmarks; no additional checkpoints or implementation commits.

**Goal:** Replace the previous parser stack with example-inferred, independently generated CSS, Less, and SCSS parsers.
**Architecture:** Concrete source/output pairs infer literal layouts and output projections. Generic metadata declares text policies, lists, and recursive alternatives. Compiler emits standalone recursive descent and inverse builders; runtime imports no schema or parser engine.
**Tech Stack:** TypeScript, npm workspaces, node:test, tsx, existing tinybench/esbuild gate platform.
**Spec:** The accepted conversation design, recorded in docs/example-first-structure-dsl.md during task 4.

## Constraints
- Backup cab2c26d415a3d9cb5b9b86d4c9307e1caa0f964 exists before deletion.
- Work in current project as requested; preserve AGENTS.md architecture invariant.
- Only compiler/authoring package and CSS, Less, SCSS parser packages remain.
- Parser src contains schema.ts, generated parser.ts, and re-export-only index.ts.
- No evaluation of preprocessor expressions, byte-exact whitespace fidelity, or claimed complete CSS/SCSS/Less semantic validation.
- Preserve shared benchmark table, fixture loader, performance and size gates; adapt package/API registrations. Archive old CSS baseline for historical comparison.

## Review focus
- Delimiters within strings, comments, brackets, interpolation and escaped selectors.
- Declaration/rule ambiguity with pseudo selectors and custom property blocks.
- Unknown targets, malformed input, incomplete consumption, hostile inverse values.
- Empty/repeated lists, recursive nesting, and arbitrary output layouts.
- Deterministic generation, no runtime imports, gates fail for missing/changed baselines.

### Task 1: Infer and generate generic parsers
- [x] Remove legacy packages/runtimes after preserving bench fixtures and historical baselines; replace root scripts/config.
- [x] Write and run compiler tests for unseen records, alternate projections, ambiguity, list delimiter inference and recursion.
- [x] Implement schema.ts types/helpers, infer.ts alignment and diagnostics, emit.ts per-production codegen, runtime-source.ts generic scanner source, cli.ts generation and example verification.
- [x] Verify compiler tests and typecheck.

### Task 2: CSS, Less, SCSS schemas
- [x] Write tests for selector lists, nested rules, at-rules, variables, mixins, interpolation, comments, malformed syntax and inverse round trips.
- [x] Define paired examples and metadata in each schema; add generated re-export entrypoints and package scripts.
- [x] Generate all packages; verify all examples and package tests.

### Task 3: Benchmarks and gates
- [x] Adapt existing table/build/perf/size platform; package-local cases supply inputs and competitors.
- [x] Assert structural agreement before timing competitors on shared syntax.
- [x] Run parse, JSON and round-trip benchmarks; save reproducible report.
- [x] Establish new baseline for changed API/workload, then independently run gates; archive old baseline without claiming like-for-like throughput.

### Task 4: Documentation and final verification
- [x] Rewrite current architecture and DSL docs; remove stale legacy docs/scripts.
- [x] Run root tests, typecheck, generation determinism and parser contract audit.
- [x] Review changes against constraints; report measured sizes/timings and limitations.
