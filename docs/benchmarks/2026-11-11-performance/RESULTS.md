# Generic compiler performance — 2026-11-11

The CSS and SCSS schemas are unchanged. Recompiling them with the saved pre-optimization compiler reproduces the exact pre-optimization generated files. All optimizations are selected by literals, lexical metadata, projection shapes and output counts; no language/domain/package names select behavior.

## Same-run before/after, 100 KB

| Package | Operation | Before | After | Speedup |
|---|---|---:|---:|---:|
| CSS | Parse | 7.35 ms | 5.82 ms | 1.26× |
| CSS | Stringify only | 12.31 ms | 6.46 ms | 1.91× |
| CSS | Parse + stringify | 16.68 ms | 12.29 ms | 1.36× |
| SCSS | Parse | 12.81 ms | 9.10 ms | 1.41× |
| SCSS | Stringify only | 20.93 ms | 11.08 ms | 1.89× |
| SCSS | Parse + stringify | 32.07 ms | 18.29 ms | 1.75× |

These are comparisons of saved before/after standalone modules on identical inputs with identical parsed output and canonical serialization. Stringify inputs are prepared outside timing. Full inverse validation remains enabled in both versions.

**System-load limitation:** other applications were heavily using CPU during the final run (observed load averages 6.41 / 9.15 / 10.65). Both versions ran considerably slower than in the earlier rebuild session, and some rows have high relative error. Use these same-run ratios as directional measurements, not portable absolute latency promises. The raw tables retain errors and every measured size, including unfavorable/noisy rows.

## Implementation

- Generated parsing has a comparison mode that checks captures/list items against the supplied value. Reverse validation no longer constructs a second output tree or performs a separate deep-equality walk.
- Expected output never determines grammar selection. Even an alternative whose expected shape mismatches must finish parsing; a grammar match with different output causes inverse rejection.
- Literal-prefix tries share exact character tests without generalizing accepted strings. Comment/whitespace skip code is specialized and cached at the current cursor. List boundaries use direct predicates.
- Single-output schemas omit redundant target dispatch. Equivalent output-shape checks and inverse layouts share generated functions.
- No handwritten package runtime or unchecked inverse shortcut was added.

## Size

| Package | Before minified | After minified | Before gzip | After gzip |
|---|---:|---:|---:|---:|
| CSS | 17,118 B | 15,109 B | 2,444 B | 2,527 B |
| SCSS | 24,234 B | 21,834 B | 2,706 B | 2,839 B |

Minified files shrink; gzip grows 3.4% / 4.9% because the generated validation/control flow changed. Both remain within their existing 5% size gates. Less, regenerated through the same compiler, also passes its unchanged size gate.

## Verification and gates

- 32 tests pass, including ordered ambiguous alternatives, invalid/mutated inverse values, extra array properties, tuple/scalar projections, renamed schemas, exact prefix membership, 150 differential CSS cases and the preserved 1 MB fixture.
- Typecheck, parser contract audit, deterministic generation and diff whitespace checks pass.
- Independent review found a precedence bug in the new prefix trie; a failing membership test reproduced it and passes after the fix. An array-metadata regression was likewise reproduced and fixed.
- **Performance gates failed for CSS, Less and SCSS under current system load.** No thresholds or baselines were weakened/reset. At 100 KB the gate measured CSS 245 ops/s (minimum 477), Less 154 (minimum 214), SCSS 137 (minimum 207). A quiet-machine run is still required to certify the absolute gates.
- All size gates pass independently; see `size-gates.txt`. Performance failures remain recorded in `gate.txt`.

## Reproduce the comparison

Run from the repository root:

```sh
npx tsx scripts/compare-generated.ts docs/benchmarks/2026-11-11-performance/artifacts/css-before.mjs.gz docs/benchmarks/2026-11-11-performance/artifacts/css-after.mjs.gz docs/benchmarks/2026-11-11-performance/artifacts/css-seed.txt
```

Replace `css` with `scss` for the second comparison. Module hashes and environment are in `environment.json`. Current-parser reference comparisons are the package-specific parse/JSON/stringify/round-trip reports alongside this file. `npm run gate` reruns the unmodified thresholds.
