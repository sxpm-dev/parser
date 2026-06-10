# Generic Codegen Performance + Schema DX

Date: 2026-06-10
Status: approved

## Goal

Substantially improve runtime performance of the compiler's TS-backend
generated parsers (both `fast` and `raws` modes), and improve the DX of
schema authoring. CSS (`packages/css`) is the benchmark vehicle only —
**every change lives in `packages/compiler` and is triggered exclusively by
domain-neutral schema structure**, so HTML, Markdown, JSON, and all other
parser packages get the same wins on regeneration.

## Constraints (non-negotiable)

- The compiler stays domainless: no branches on package, schema, language,
  or domain names. All optimizations trigger on generic structural patterns
  (span modifiers, literals, stop sets, union shapes).
- Parser packages stay schema-only; the CSS package changes only via
  regeneration (plus schema-surface DX adoption).
- Acceptance per change: all packages regenerate cleanly, all repo test
  suites pass, CSS perf gate improves, no other package's perf gate
  regresses.

## Baseline (2026-06-10, M-series laptop, node 18)

- TS fast mode: ~2.8x faster than PostCSS, ~4.2x faster than css-tree on
  the CSS bench suite; ~50–80 MB/s on 500KB synthetic input.
- raws mode: ~2.2x slower than fast mode.
- CPU profile: ~100% of time in fused parse+build functions; GC only ~3%.

Observed generated-code inefficiencies (all generic emitter issues):

1. The 256-entry `__KB` known-byte stop-table is emitted as a fresh array
   literal **inside each until-scan body**, allocated on every call.
2. Sibling productions re-parse shared prefixes: the `!important`
   Declaration variant scans the full `prop : value` and fails at `!`; the
   plain variant then re-scans from scratch. Likewise every declaration in
   a body union first pays a full failed Rule-selector scan.
3. The per-scan `__comments` tuple array is allocated even when the input
   region contains no comments.
4. raws mode does per-node binary-search `posAt` plus nested `makeSource`
   object allocation.

## Phase P1 — incremental generic emitter fixes (ordered by impact)

### P1.1 Hoist constant stop-tables

Emit until-scan known-byte/stop tables as module-level `Uint8Array`
constants, content-deduped across spans (`__KB_<hash>`). Benefits every
schema using `.until()`.

### P1.2 First-char dispatch (FIRST sets)

For `.of(...)` unions, compute each production's possible first
non-whitespace characters from its leading required span (literal `@` →
`@`; comment span → `/`; `ident().css()` → CSS ident-start class; until →
unconstrained). Emit a charCode switch that skips impossible productions
instead of speculative try-and-rollback. Classic LL FIRST-set computation,
fully domainless.

### P1.3 Divergence-point factoring for sibling productions

Generic rule: when production A's span *i* is `until(S ∪ {x})`, production
B's span *i* is `until(S)`, all spans before *i* are structurally equal,
and A continues with `literal(x)` — emit a single scan with stops
`S ∪ {x}`. On stopping at `x`: try A's tail; if A's tail fails, **resume**
the until-scan for B from the stop point rather than restarting the
production. Eliminates the double parse of every plain declaration (and
any analogous shape in other schemas).

### P1.4 Lazy comment tracking

Allocate the per-scan comment list only when the first comment is actually
encountered (`__comments ??= []`).

### P1.5 raws-mode gap

Profile raws mode after P1.1–P1.4. Primary suspects: per-node binary-search
`posAt`, `makeSource` allocations, and `computeLineStarts`. Likely fix:
incremental line/column tracking threaded through the scan instead of
post-hoc binary search. Final choice is made from the profile, not in
advance.

Each P1 item is independent and lands as its own commit, gated by the full
repo test + perf suite.

## Phase P2 — scan-once production selection (conditional on re-profile)

After P1, re-profile. If failed-speculation scanning still dominates,
implement union-level scan-once classification: for unions whose members
lead with until-spans, scan once to the first depth-0 stop in the **union**
of member stop sets, then select the production from the stop character
(`{` first → Rule-like member, `:` then `;` → Declaration-like member),
reusing the scanned extent. Must preserve `rejectSuffix`, `nonEmpty`,
comment-excision, `maxOff`, and rollback semantics. This is the deepest
emitter change and is justified only by post-P1 data.

## Phase D — schema-definition DX

### D1 Union groups (sugar)

Declare a named production group once at schema level and reference it from
`.of()` (e.g. the CSS `Comment | AtRule | Rule | Declaration` union appears
three times today). Pure DSL-surface sugar; no semantic change.

### D2 Typed capture refs

`span('prop', …)` carries `'prop'` as a literal type; `relation()` infers
the capture-name union from the `parse([...])` array so that `$.typo` in
`ast` / `source` template bodies fails at TypeScript compile time. Same for
validation matcher field names where feasible.

### D3 `--explain` codegen report

Compiler CLI flag printing, per production: dispatch strategy chosen,
FIRST sets, until stop sets, applied fusions/factorings, and why. Makes
inference verifiable for schema authors and doubles as a perf-work
debugging tool.

### D4 New parsing primitives — deferred

P1.3 removes the main duplication pressure (the two Declaration relations
stay separate because their AST shapes genuinely differ: `important: true`
discriminator). Revisit only if a concrete need survives P1–P2.

## Testing & verification

- Compiler unit tests per emitter feature (table hoisting, FIRST sets,
  divergence factoring, lazy comments, raws position tracking).
- Regenerate **all** parser packages and run the full repo test suite on
  every change; CSS conformance + round-trip suites are the semantic gate.
- Before/after bench numbers recorded per item (`bench:ast`,
  `bench:backends`, `bench:round-trip`).
- `perf:gate` / `size:gate` baselines updated once at the end of each
  phase, not per item.

## Error-handling semantics

Emitter changes must preserve `maxOff` error-position tracking, diagnostic
emission/suppression rules, and speculative-rollback state restoration.
These are covered by existing conformance and cases tests across packages;
any gap discovered gets a new compiler test before the optimization lands.

## Sequencing

P1 (five items, independent commits) → re-profile → P2 (only if warranted)
→ D1–D3. Performance and DX get separate implementation plans derived from
this spec.

## Outcomes (updated 2026-06-11)

Implementation plan: `docs/superpowers/plans/2026-06-10-codegen-scan-waste-perf.md`.
Measurement reshaped the plan before any emitter work:

- **P1.1 (hoist `__KB` stop-tables): investigated, measured neutral, dropped.**
  A hand-hoisted prototype on the generated css parser benched within noise
  of baseline (10.46 vs 10.86 ms/iter medians) — V8's copy-on-write
  boilerplate already makes the per-call constant array literal cheap.
- **P1.2 (FIRST-set dispatch): already implemented pre-spec** in
  `emitFusedStructuredRoleDispatch` (`/`→Comment, `@`→AtRule byte gates).
- **P1.3 landed as until-divergence merged dispatch**
  (`detect-until-divergence.ts` + `emitFusedUntilDivergencePair`): one scan
  serves both sibling alts; long tail tried only when the scan stops at the
  extra stop char, with a rare-path rescan fallback. css 500KB fast-mode:
  **10.46 → 4.82 ms/iter (2.17×, 47 → 101 MB/s)**; Declaration probe-chain
  double scans eliminated (18,267 wasted attempts → 0).
- **P2 landed in lightweight form as the until-viability guard**
  (`untilGuardSpec` + `__untilTerminator_*` helpers): captureless
  terminator pre-scan gates all but the last fallthrough probe in until-led
  unions. css counters: Rule attempts 22,326 → 4,059 (zero mispredictions);
  interleaved A/B ~12% over merged-dispatch-only. Full scan-extent reuse
  (feeding the guard's endpoint into the chosen production) remains
  deferred — counters show zero misprediction, so the remaining headroom is
  the guard pass itself, not wasted full parses.
- **P1.4 (lazy comment lists) landed**: ~6% on the css bench (A/B 6.60 →
  6.22 ms/iter).
- **P1.5 (raws gap)**: pending — next item.
- All 12 parser packages regenerate cleanly and pass tests;
  html/markdown/json generated output is byte-identical (their schemas
  trigger none of the new codegen paths), confirming the changes are
  structurally gated, not domain-gated.
