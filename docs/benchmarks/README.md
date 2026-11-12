# Benchmarks and gates

[All 52 parsers: 12 November 2026](2026-11-12-all-parsers/README.md) — four modes, full size matrix, per-parser JSON reports.

[Initial rebuild results](2026-11-11/RESULTS.md) · [Generic performance optimization](2026-11-11-performance/RESULTS.md)

The existing `scripts/bench-table.ts`, `bench-fixture.ts`, `perf-gate.ts`, `size-gate.ts`, and esbuild browser bundler remain the platform. Only package registrations, the new public API and corpus providers changed. CSS's original `huge-page.css` fixture is preserved byte-for-byte.

```sh
npm run generate
npm run bench                    # all three parse comparisons
npm run bench:css:json
npm run bench:less:round-trip
npm run baseline                 # intentionally establish baselines
npm run gate                     # independently enforce existing baselines
```

Each package has `bench:parse`, `bench:json`, `bench:stringify`, `bench:round-trip`, `perf:baseline`, `perf:gate`, `size:baseline`, `size:gate`, `baseline`, and `gate` commands. Run generation after schema changes before benchmarks; `npm test` includes generation.

## Method

The table harness uses tinybench, reports input sizes/hashes, average time, ops/s and relative error. Fixed seeds exercise multiple selectors, declarations, nested constructs, quotes and dialect syntax at 5, 20, 100, 500 and 1000 KB. CSS additionally uses the preserved 1 MB fixture. Before timing, the generated output is compared against the competitor's structure after normalization; comments/positions are excluded from comparison.

Reference parsers are PostCSS, postcss-less and postcss-scss. They construct native nodes with metadata and formatting information; our example-defined output contains less metadata. Timings measure useful output from each parser, **not equal allocation workloads or equal grammar coverage**. JSON comparisons normalize reference outputs to the same example-defined shape before serialization. Round-trip comparisons time parse + stringify; the generated inverse additionally validates the reconstructed source against the supplied value through the grammar, while reference stringifiers retain source formatting. Do not interpret that row as a printer-only comparison.

postcss-less exhibits very poor scaling on this repeated corpus. Its rows above 100 KB are explicitly skipped; generated-parser rows still run. This is a corpus-specific reference behavior, not evidence that every Less workload has the same speed ratio.

The 2026-11-11 run's raw reports and environment/package versions are in `2026-11-11/`. All timings are local measurements, not cross-machine promises. The old CSS source/AST contract differs, so its historical throughput baselines are archived but not used for speedup claims.

## Gates

The performance gate measures four samples per case (5/20/100 KB) and locks the lowest observed throughput. It fails below 75% of that baseline or when an input hash/length changes. The old platform's 10%-of-measured baseline floor was removed; the new baseline is the measured value, not a deliberately weakened threshold. `PARSER2_PERF_TOLERANCE` retains its existing environment-variable name.

The size gate checks both minified browser bytes and gzip bytes against their baseline with 5% tolerance (`PARSER2_SIZE_TOLERANCE`). The full generated module (parse, inverse, validation, JSON output) is bundled with esbuild; the schema/compiler are absent. Missing baselines fail. Baseline replacement is an explicit command, never performed by `gate`.

Historical CSS baselines live in `legacy/`; the previous minified module was 150,364 bytes and 16,794 bytes gzip. Size comparison is meaningful as an artifact comparison, but the old runtime offered more API/metadata capabilities.


## Before/after compiler comparisons

`scripts/compare-generated.ts` compares two standalone module artifacts on identical inputs. It first asserts equal parsed output and identical canonical serialization, then measures parse, stringify-only (preparsed input), and full round trips. Both versions preserve checked-inverse semantics. The 2026-11-11 performance report includes compressed before/after artifacts, seeds, hashes and raw tables for reproducibility. No performance or size baseline was weakened or reset for that optimization.

`bench:stringify` also compares reverse conversion with the reference parser using preconstructed values. Preparing those values happens in the harness's untimed sanity call. Reference printers have different validation/metadata contracts; the artifact before/after comparison is the direct measure of compiler optimization.

## Parser migration

[Migration verification](2026-11-11-migration/RESULTS.md) records correctness, competitor preflight and size initialization for the 49 additions. Timing is paused; new performance baselines are pending. [Package scopes and commands](../parser-migration.md) distinguish native competitor output and checked inverse behavior.

[Interrupted all-parser run](2026-11-11-all-parsers/README.md): partial logs only; awaiting a quiet-machine rerun.
