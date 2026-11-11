# Rebuild results — 2026-11-11

Backup commit: `cab2c26d415a3d9cb5b9b86d4c9307e1caa0f964`.
Environment and exact package versions: [environment.json](environment.json).
Methodology and caveats: [../README.md](../README.md).

## Parsing at 100 KB

| Package | Generated | Reference parser | Reference time | Ratio |
|---|---:|---|---:|---:|
| CSS | 2.14 ms | PostCSS | 4.94 ms | 2.31× |
| Less | 3.50 ms | postcss-less | 227.31 ms | 64.96× |
| SCSS | 3.63 ms | postcss-scss | 4.43 ms | 1.22× |

The unusually large Less ratio reflects the reference parser's poor scaling on this specific repeated corpus. Its rows above 100 KB are skipped. Generated outputs do not include the reference parsers' source-position and formatting metadata.

On the preserved CSS fixture (1,007,267 characters), generated parsing took **12.85 ms**, versus **31.31 ms** for PostCSS (2.44×). The outputs agree structurally and generated serialization round-trips.

## Other paths at 100 KB

| Package | Generated JSON | Reference normalized JSON | Generated parse + stringify | Reference parse + stringify |
|---|---:|---:|---:|---:|
| CSS | 2.85 ms | 6.49 ms | 6.16 ms | 5.98 ms |
| Less | 4.29 ms | 226.37 ms | 10.06 ms | 230.16 ms |
| SCSS | 4.30 ms | 6.89 ms | 9.17 ms | 6.25 ms |

Reverse conversion includes validation by reparsing. CSS/SCSS round trips are currently slower than their reference parsers; this is a concrete optimization opportunity, not an across-the-board speed win.

## Complete standalone browser modules

| Package | Minified bytes | Gzip bytes |
|---|---:|---:|
| CSS | 17,118 | 2,444 |
| Less | 25,283 | 2,731 |
| SCSS | 24,234 | 2,706 |

The previous CSS baseline was 150,364 minified / 16,794 gzip bytes. The new CSS artifact is 88.6% smaller minified and 85.4% smaller gzip, with a smaller API/metadata scope.

## Verification

- 26 tests pass, including 150 differential CSS combinations and the preserved 1 MB fixture.
- Every teaching example is checked during compilation; generation checks inverse examples too.
- Typecheck and parser package contract audit pass.
- Repeated generation produces identical SHA-256 hashes; see `generated-sha256.json`.
- Preserved CSS fixture is byte-identical to backup.
- All three performance and size gates pass independently after baseline establishment; see `gate.txt`.
- Review findings for independent region closers and mixed-case URL functions reproduced as failures and now pass.

Raw parse, JSON, and round-trip tables are saved alongside this report. The parsers implement the documented structural syntax scope; they do not evaluate Less/SCSS or claim complete standards conformance.
