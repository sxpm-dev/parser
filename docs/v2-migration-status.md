# v2 emit migration status (captured 2026-05-26)

Status of `--v2` codegen + tests for the 3 in-scope parser packages.
Captured by running `npm run generate -w @parser2/<pkg> -- --v2` from the
worktree root. See `docs/scannerless-emit-v2.md` for the v2 design contract.

Baseline (default v1 scannerless emit): css 56/57 (1 skip), html 30/30,
markdown 76/76. None of these are affected — only `--v2` codegen is exercised
here.

- [ ] css — codegen fails: `v2: until/rawUntil span not yet supported (span 'prop')` thrown from `emit/v2/span.ts:60` (the Declaration production uses `.until(':')` for the property name).
- [ ] html — codegen fails: `v2: multi-role repeats not yet supported (span 'children')` thrown from `emit/v2/span.ts:216` (Element body has a repeats span over multiple recursive roles).
- [ ] markdown — codegen fails: `v2: multi-role repeats not yet supported (span 'children')` thrown from `emit/v2/span.ts:216` (Document body has a repeats span over multiple block-level roles).

## v2 design TODOs / not-yet markers found in `emit/v2/`

These constrain what Task 1.3 will need to implement before any of the 3
packages can migrate:

- `emit/v2/dispatch.ts:5` — discriminator peek-scan (ladder rung 2) is "not
  yet implemented in v2 first slice". Currently only byte-prefix dispatch
  (rung 1) and sentinel speculation (rung 3) are wired. Required for CSS
  Rule/Declaration discrimination per the design doc.
- `emit/v2/span.ts:60` — `until` / `rawUntil` spans throw at emit. Needed for
  every package: CSS declaration value/property, HTML attribute value, all
  markdown block-content captures.
- `emit/v2/span.ts:171` — multi-role non-repeats span throws at emit.
- `emit/v2/span.ts:216` — multi-role repeats throws at emit. Needed for HTML
  Element children, Markdown Document children, CSS Stylesheet body.
- `emit/v2/span.ts:303` — number class is integer-only; `.float()` /
  `.scientific()` refinements are accepted by the schema parser but not yet
  honored by the v2 scanner. CSS uses float numbers (length-percentage etc).

## Phase 1 implication

Task 1.2 ("migrate packages that already pass v2 cleanly") has **zero**
candidates in the current state — every in-scope package hits a `not yet
supported` throw at codegen. Task 1.3 work is the gating item; the
multi-role repeats and until-span emitters are the two highest-priority
features (each blocks at least one package).
