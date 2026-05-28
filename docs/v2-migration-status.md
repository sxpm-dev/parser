# v2 emit migration status (updated 2026-05-27 after Phase 6 closeout)

Status of `--v2` codegen + tests for the 3 in-scope parser packages.
Captured by running
`npx tsx packages/compiler/src/cli.ts packages/<pkg>/src/schema.ts --v2 && npx tsx --test packages/<pkg>/test/*.test.ts`
from the worktree root. See `docs/scannerless-emit-v2.md` for the v2 design
contract.

## Current ratchet (after Phase 6 — pluggable backends landed, bytecode demoed on cron)

| Package   | v2 pass | v2 fail | Notes |
| --------- | ------- | ------- | ----- |
| parser    | 25/25   | 0       | green |
| compiler  | 322/322 | 0       | v2-regressions + fusion + bytecode (encoder, runtime, backend, budget, roundtrip) |
| css       | 56/57   | 0 (+1 skip) | green; 1 intentional skip |
| html      | 30/30   | 0       | green |
| markdown  | 76/76   | 0       | green |
| cron      | 15/15   | 0       | green; +6 bytecode equivalence tests landed in Phase 6 |
| arn / log / proto / url | passing | 0 | green (no regressions, not maintained) |
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

## Phase 5 closeout (2026-05-27)

Fusion lands. For non-`ast` render targets, the compiler emits per-(production,
target) fused parse-and-render functions that walk input bytes once and push
rendered fragments directly into a string buffer — no intermediate captures
object. The public `render(input, {type:T})` tries the fused path first and
falls back to the captures-based dispatch when the fused path declines (e.g.
a production isn't eligible for fusion at this target).

Eligibility today:
- Body shape: Template only. Object/array bodies stay on the captures path.
- Slot refs: non-recursive spans, OR recursive single-role / multi-role /
  `.repeats()` spans whose roles' productions are themselves fully fusable.
- Repeats option gate: `stopBefore` excludes a production from fusion (the
  fused loop emit doesn't yet honour the stop-sentinel check). Schemas that
  use `stopBefore` on a fusable role chain fall back to captures cleanly.
- `ast` target stays on the captures path by design.

| Task | Commit(s) | What landed |
| --- | --- | --- |
| 5.1 | `e5637b0` + `66c5594` | `emit/v2/fusion.ts` emits per-(production, non-ast target) fused functions for template bodies with non-recursive slots; `__fusedRenderDispatch_<target>` tables emitted. |
| 5.2 | `38ec3b9` | `__renderFused(input, target)` runtime + public `render()` rewired (fused-first, captures-fallback). Also ported Gap A/B template fusion to the fused emitter. |
| 5.3 | `f52948e` + `b13fb57` | Recursive children fuse: eligibility memoization with cycle handling; per-span side buffer for ordering; byte-prefix dispatch ladder mirroring the parse-time role ladder; EOF guard + fallthrough-role suppression. Eligibility gates `stopBefore` (latent gap closed). |
| 5.4 | `fc1041f` + `173fda3` | `compiler/test/fusion-round-trip.test.ts` iterates every schema × production × non-ast target and compares v2's `render(...)` (fused-first) against `interp.render(interp.parse(...))`. Coverage floors: css ≥5, html ≥15, markdown ≥70 comparisons. No divergences observed. |

### Phase 5 follow-ups (deferrable)

- **Allocation profile not verified programmatically.** The Phase-5 master-plan
  exit gate calls for `node --prof` traces showing no captures-object
  allocation on the fused html path. Phase 5's actual exit gate is the
  round-trip correctness theorem (5.4), which is green; the perf-profile
  check is a follow-up task once a profile-friendly bench harness exists.
- **`stopBefore` in fused repeats** — currently gates the production out of
  fusion. Implementing the stop-sentinel check in `emitFusedRepeatsSpan`
  would let `stopBefore`-bearing productions fuse and recover the
  optimization for HTML schemas that use it.
- **`isAbsentAllowedSpan` / `repeatsJoinSeparator` helpers** are duplicated
  verbatim between `emit/render.ts` and `emit/v2/fusion.ts`. Extract to a
  shared `emit/span-helpers.ts` to remove the drift risk. Optional.
- **Multi-prod root fusion.** `__rootProductionKey` is fixed to
  `<rootType>#0`. None of css/html/markdown have a multi-prod root; future
  schemas with one will fall back to captures (still correct, just not
  fused).

## Phase 6 closeout (2026-05-27)

Pluggable backend interface lands. The compiler now has a `Backend` contract
(`packages/compiler/src/emit/backend.ts`) with two registered backends:

- `'ts'` — the existing v2 TypeScript emitter (extracted in Task 6.1; default).
- `'bytecode'` — a new opcode-stream backend (Tasks 6.2–6.5). The encoded
  parser is a `Uint8Array` of opcodes + a string pool; a small interpreter
  (`packages/compiler/src/emit/bytecode/runtime.ts`, 32,415 bytes source)
  reads the stream at runtime to parse, render, and stringify.

The bytecode backend was demonstrated on `cron` (Task 6.6) — the smallest
in-repo schema — and exercised via size + perf budget tests (Task 6.7).

### What landed (Phase 6)

| Task | Commit(s) | What landed |
| --- | --- | --- |
| 6.1 | `8026a9e` | `Backend` interface in `emit/backend.ts`; existing v2 emitter wrapped as `tsBackend`; registry + `selectBackend(name)`; CLI plumbing for `--backend`. |
| 6.2 | `a90019b` + `7be2d14` | Opcode set (`emit/bytecode/ops.ts`) + encoder (`emit/bytecode/encoder.ts`) for cron primitives: literals, classes, until, repeats, optional, captures. String/number pools, span-level layout. |
| 6.3 | `9e22e33` + `e07fe4e` | Bytecode runtime interpreter parse path: stack machine evaluates the opcode stream against an input string; produces a captures tree compatible with the captures-based render dispatch. |
| 6.4 | `3c00230` + `087abd0` + `a80d3b6` + `61f058b` | Recursive-span captures completeness; forward render dispatch (`runRender(target)`); inverse stringify dispatch (`runStringify(value, type)`). |
| 6.5 | `2f92b2d` | Bytecode backend `emit(schema)` produces a runnable `.ts` file: imports the runtime, embeds the encoded `Uint8Array` literal + string pool, re-exports `__parse` / `render` / `stringify` matching the TS-backend surface. |
| 6.6 | `87d83ea` | `cron` package generates equivalently under both backends; 6 equivalence tests added (`packages/cron/test/bytecode-equivalence.test.ts`) comparing `bcodeBackend.render(input, {type:'ast'})` to `tsBackend.render(input, {type:'ast'})` for the supported cron-input subset. |
| 6.7 | `1b26f7e` | Size budget test: runtime + artifact byte count < 50 KB. Perf budget test: bytecode vs TS render ratio on `'0 9 * * 5 npm test' × 1000`. Currently enforces 50× as a regression guard (see follow-up #4). |
| 6.8 | (this commit) | Documentation closeout. |

### Phase 6 exit gate status

| Criterion | Status | Note |
| --- | --- | --- |
| At least 1 schema generates equivalently under both backends | **MET** | `cron` (Task 6.6) for the input subset the bytecode backend supports today. |
| Bytecode runtime + artifact total < 50 KB | **PASS** | 32,415 (runtime) + 5,530 (cron artifact) = 37,945 bytes — 13 KB headroom against the 50 KB budget. Cron artifact is ~5.4% of the TS backend's 102 KB output for the same schema. |
| Bytecode throughput within 2× of TS backend | **DEFERRED** | Measured ratio is 15–25× on cron input × 1000 iterations. Closing the gap to 2× would require bytecode→JS specialization at decode time (effectively regenerating the TS backend's output), which questions the value of having a separate bytecode backend. Test enforces 50× as a regression guard. See follow-up #4. |
| Functional equivalence demonstrated | **MET** for the input subset cron's bytecode backend supports today (single-byte literals, fixed numbers, `*` wildcard at single positions). Excluded inputs are the `*/N`, `N-N`, and optional-absent-command shapes called out in follow-ups #1 and #2. |

### Phase 6 follow-ups (deferrable)

These are real gaps in the bytecode backend that the equivalence + budget
tests work around by excluding inputs or scoping the comparison. Each is
documented at its source location and intentionally out of Phase 6 scope —
cron has 4 alts that exercise overlapping cases, but the goal of Phase 6 was
to prove the pluggable backend interface works, not to make bytecode a
production-quality cron parser.

1. **Bytecode multi-prod dispatch picks shortest-match.** Cron's `CronField`
   has 4 alts with overlapping prefixes (`*` vs `*/N`, `N` vs `N-N`). The
   current dispatch block chain-tries alts in order and returns the first
   non-null result, which yields the SHORTEST match — `*` matches `*/5` and
   consumes only 1 char. Fix requires either longest-match dispatch
   (save-and-pick-best) or peek-discriminator dispatch (mirror the TS
   backend's `infer/dispatch.ts` lookahead computation). Affects: `*/N` and
   `N-N` cron inputs cannot be parsed by the bytecode backend today; the
   Task 6.6 equivalence test specifically excludes these inputs.

2. **Bytecode optional-absent rendering emits trailing whitespace.** For
   `'* * * * *'` (no command), bytecode renders `'* * * * * '` (trailing
   space) where TS renders `'* * * * *'` (no trailing space). The encoder's
   template-render emission doesn't fuse the optional slot's preceding
   whitespace literal — Task 6.4 deferred optional-slot fusion for
   `runRender`. The TS backend's `emit/render.ts` handles this via the
   "preceding whitespace literal collapse" logic (lines ~207–230).

3. **Bytecode stringify `target='source'` not implemented (template-form
   inverse).** Cron's `'source'` target uses a template IR (segments +
   captures). The bytecode encoder's `canEncodeInverse` skips it. Current
   bytecode stringify uses `target='ast'` as the discriminator key (input
   value shape) — output is always source text. Task 6.6's equivalence test
   calls `bcodeBackend.stringify(tsAst, { type: 'ast' })` to compensate. Fix
   requires a template-inverse opcode set (literal-segment scanner inside
   the bytecode runtime).

4. **Bytecode perf budget gap: 15–25× vs 2× target.** Structural cost of
   generic `switch`-based opcode dispatch. Specific to small grammars where
   the JIT cannot fold polymorphic type checks. Fix would require
   bytecode→JS specialization at decode time — effectively regenerating
   what the TS backend already produces, which questions the value of the
   bytecode backend entirely. Test enforces 50× as a regression guard while
   the design question is open.

5. **Bytecode `__parse` only supports `'fast'` mode.** Raws mode
   (source-position metadata) intentionally out of scope for bytecode per
   the master plan. Schemas needing raws fall back to TS.

6. **TS backend doesn't export `__parse` for cross-backend test
   comparison.** Task 6.6's equivalence test compares via
   `render(input, { type: 'ast' })` instead, which is the closest observable
   API. Future task: consider exporting `__parse` from the TS backend's
   emit for easier cross-backend testing.

7. **Multi-role recursive spans not supported in bytecode encoder.** For
   schemas where a single span legitimately references multiple node types
   (a feature cron doesn't use), the dispatch block would leak orphan
   captures on the value stack. Documented as a TODO in `emitRecursiveSpan`
   (`packages/compiler/src/emit/bytecode/encoder.ts` ~line 458).

8. **Repeats separator hardcoded to single space.** Per-span
   `.repeats({ sep })` plumbing not yet wired through bytecode `CONCAT_N`
   opcode. Cron's `.repeats({ min: 1 })` uses default whitespace, so this
   doesn't bite cron but other schemas may need it.

9. **`syntaxErrorAt` is duplicated** between
   `packages/compiler/src/emit/v2/runtime.ts` (embedded in the TS backend's
   `V2_RUNTIME` constant) and
   `packages/compiler/src/emit/bytecode/runtime.ts` (exported for the
   bytecode-emitted file). Future: extract to a shared utility.

10. **`@parser2/compiler/bytecode/runtime` exports entry has no `"types"`
    / `"source"` condition.** Resolves only via `./dist/...js`. A fresh
    clone that hasn't run `tsc -b` will fail to import. Future: add a
    fallback condition.

## Phase 7 closeout (2026-05-27)

Column-significant indentation lands as a span-level modifier. The compiler,
reference interpreter, and inverse stringify all gain matching support. The
exit gate is satisfied by `packages/yaml-block` — a 7-node YAML-subset schema
that exercises flat scalars, nested mappings, and nested sequences through both
backends and the round-trip theorem.

### Design summary

Phase 7 added a column-significant indentation primitive (`.indent()`) as a
`SpanModifier` variant. The modifier path was chosen over an IR primitive at
phase start because:

1. Less invasive — `SpanModifier` already had a discriminated union with 7
   variants; adding one more was minimally disruptive.
2. Indent semantics co-locate with `.repeats()` — every real use case is "an
   indented block of repeated children."
3. Reversible — if a future phase needs explicit scope objects, the modifier
   becomes the obvious migration target.

The runtime carries an `indentStack: Int32Array(16)` of expected column
offsets. On entry to an indent-modified repeats span, the first child's column
is captured and pushed; subsequent iterations must match that column (after
skipping blank lines and horizontal whitespace); the loop exits on dedent or
over-indent. The reference interpreter, v2 codegen, and inverse stringify
(interp + emit) all gained matching support. Bytecode backend remains
untouched — cron stays the only bytecode-tested schema.

Nested round-trip was closed by Task 7.7b: a per-level `indentCol` parameter
threads through the stringify pipeline, with `INDENT_STEP_SPACES = 2` added at
each indent-modified span boundary. The `Piece` type and `INDENT_STEP_SPACES`
constant are now shared between `interp/stringify.ts` and `emit/rebuild.ts` to
prevent drift.

### What landed (Phase 7)

| Task | Commit(s) | What landed |
| --- | --- | --- |
| 7.1 | `df37859` + `6e60ccf` | `SpanModifier { kind: 'indent' }` variant added to `packages/parser/src/types.ts`. `SpanBuilder.indent()` modifier method and `ExampleBuilder.indent(name, roles)` sugar added to `packages/parser/src/example.ts`. 3 tests in `packages/parser/test/indent.test.ts`. |
| 7.2 | `b8944d7` + `ac283eb` | Reference interpreter (`packages/compiler/src/interp/parse.ts`) handles indent on recursive-repeats spans. State extended with `indentStack: number[]`; `columnAt` + `skipBlankLines` helpers added. `parseRepeatsSpan` pushes first child's column, checks column per iteration, pops on exit. Guard throws if `.indent()` combined with `.repeats({ sep })`. 3 tests in `packages/compiler/test/indent-interp.test.ts`. |
| 7.3 | `e251002` + `a522058` | v2 runtime preamble (`packages/compiler/src/emit/v2/runtime.ts`) gains `indentStack: Int32Array(16)` + `indentStackTop: number` on the State type, plus `columnAt` / `skipBlankLines` / `skipHorizontalWs` helpers in V2_RUNTIME. Two State literals in `packages/compiler/src/emit/v2/index.ts` updated to allocate the new fields. 4 tests in `packages/compiler/test/indent-runtime.test.ts`. |
| 7.4 | `d94b54e` + `3424616` | v2 codegen (`packages/compiler/src/emit/v2/span.ts`) emits indent-aware repeats loop: prologue captures + pushes first child's column, per-iteration gate checks column, epilogue pops. Same `.indent() + .repeats({ sep })` guard as Task 7.2. 3 tests in `packages/compiler/test/indent-emit.test.ts`. |
| 7.5 | `beb245f` + `7989658` | Inverse stringify emits `'\n'` between indent-modified repeats children. Three sibling join-separator functions updated: `joinSeparatorOf` in `interp/stringify.ts`, `joinSeparatorOf` in `emit/rebuild.ts`, and `repeatsJoinSeparator` in `emit/render.ts` (the third was caught by code-quality review). 2 tests in `packages/compiler/test/indent-stringify.test.ts` (interp path + emitter path). |
| 7.6 | `6bc11b5` + `c9ffb99` | Explicit round-trip test for indent schema. Discovered `inferSchema` already calls `checkRoundTrip` internally, so test simplified to a bare `inferSchema(schema)` call (throws on failure). Test name corrected to honestly describe `checkRoundTrip`'s value-stability property (it skips the `ast` target). 1 test in `packages/compiler/test/indent-roundtrip.test.ts`. |
| 7.7 | `0663fd7` + `912c373` | `packages/yaml-block` exit-gate package: 7 node types (YamlScalar, YamlMappingEntry, YamlMapping, YamlSequenceItem, YamlSequence, YamlNode, YamlBlock). Supports flat and nested mappings/sequences. The prior-task commit `0663fd7` fixed a real bug surfaced by yaml-block: the inverse dispatcher in `emit/inverse.ts` and `interp/stringify.ts` only handled string values for ref-IR nodes — yaml-block's `YamlBlock.render('ast', $.root)` exposed the gap because `$.root` references a multi-role node whose values are objects. 5 initial tests in `packages/yaml-block/test/`. |
| 7.7b | `64ff66a` + `cdeb792` | Nested round-trip closed. Threaded `indentCol: number` (default 0) through every stringify function in `interp/stringify.ts` and the codegen functions in `emit/rebuild.ts` + `emit/inverse.ts`. Indent-modified spans add `INDENT_STEP_SPACES (=2)` when recursing into children. Generated `__rebuild_*` and `__invert_*` functions accept a `__indentCol` parameter. Fixup commit `cdeb792` shared the `Piece` type and `INDENT_STEP_SPACES` constant between `emit/rebuild.ts` (source of truth) and `interp/stringify.ts` to prevent drift. 4 additional nested round-trip tests (yaml-block at 9/9). |
| 7.8 | (this commit) | Documentation closeout. |

### Phase 7 exit gate status

| Criterion | Status | Note |
| --- | --- | --- |
| Real YAML-subset schema parses 50 lines of representative input through v2 TS backend | **PASS** | `packages/yaml-block/test/yaml-block.test.ts` — 50-line input with flat scalars, nested mappings (compiler, server, tls), and nested sequences (tags, ports) parses correctly. |
| Same schema parses through reference interpreter | **PASS** | Verified by `inferSchema` calling `checkRoundTrip` internally during schema construction (interp path is exercised). |
| Round-trip theorem holds | **PASS** | 9/9 yaml-block tests cover flat, single-entry, special-char-value, 5-entry, nested mapping, nested sequence, mixed, and 3-level nested round-trips. Source-shape assertions in `round-trip.test.ts` lock the per-level indent invariant. |

### Phase 7 follow-ups (deferrable)

These are real gaps that yaml-block works around or doesn't exercise. Each will
need to be addressed if a future schema exposes the gap.

1. **Forward source render (`render(input, { type: 'source' })`) doesn't pad
   nested children.** The forward render path in
   `packages/compiler/src/emit/render.ts` does not thread `indentCol`. Task
   7.7b only fixed the inverse stringify path (`stringify(value, opts)`).
   Calling `render('bar:\n  baz: 2', { type: 'source' })` produces
   `"bar: baz: 2"` (flat). Documented inline at `repeatsJoinSeparator` in
   `emit/render.ts`. Fix would mirror Task 7.7b for the forward direction.

2. **`synthesizePieces` requires literal text on indent spans with `min: 1`.**
   The yaml-block schema works around `rebuild.ts`'s `findSpanStart` returning
   null for empty-text indent spans by giving them the full example string as
   `text` (e.g., `.span('entries', 'foo: 1\nbar: 2', ['YamlMappingEntry']).indent().repeats({ min: 1 })`).
   This text is only used at compile time for offset calculation and ignored at
   runtime. The compiler should recognize required-recursive-repeats spans and
   synthesize their slot directly without requiring text.

3. **Bytecode backend has no indent support.** Phase 6 left cron as the only
   bytecode-tested schema; Phase 7 adds indent only to the v2 TS backend.
   Adding indent to bytecode (`packages/compiler/src/emit/bytecode/runtime.ts`
   + encoder) is a follow-up.

4. **Tab characters not supported.** `columnAt` counts raw bytes, so tabs count
   as a single column rather than their display width. Documented in both
   `interp/parse.ts` and `emit/v2/runtime.ts`. Schemas using `.indent()` should
   use ASCII spaces only.

5. **Nested indent depth limited to 16.** `Int32Array(16)` hard-coded; deeper
   nesting fails the parse with a stack-overflow check.

6. **`INDENT_STEP_SPACES` hardcoded to 2.** No schema-level `indentWidth`
   option. YAML-convention 2-space indent is the only supported value.

7. **Coverage gap in plan-specified inline test schemas.** The 3 plan-specified
   tests in Tasks 7.2 and 7.4 (simple inline YamlList) pass even if the indent
   code path is absent — the surrounding `skipWs` machinery accidentally
   consumes the same characters. Real coverage of the indent code paths lives
   in `packages/yaml-block/test/` where nested inputs force the column check.
   The simple-case tests remain useful for forward-compatibility but should not
   be treated as the primary regression suite.

8. **`mac` and `css-color` packages have pre-existing test failures unrelated
   to Phase 7.** Confirmed by code-quality reviewer during Task 7.7b. Not
   introduced by Phase 7; flagged for awareness.

## Phase 8 closeout (2026-05-28)

Four schema-level dials — `bom`, `unicode`, `newlines`, `caseSensitive` — land
as a single composable input-normalization preamble applied once at parse
entry. The reference interpreter (`packages/compiler/src/interp/parse.ts`) and
the v2 emitter (`packages/compiler/src/emit/v2/index.ts`) carry matching
preamble logic so they parse BOM-prefixed / mixed-case / CRLF / non-NFC inputs
identically. The HTML schema opts in to `caseSensitive: false` — `<DIV>` and
`<div>` produce identical ASTs.

### Design summary

Four orthogonal transforms applied at parse entry, in order:

1. **BOM handling** (`bom: 'allow' | 'reject' | 'require'`, default `'allow'`).
   `'allow'` silently strips a leading U+FEFF; `'reject'` throws on presence;
   `'require'` throws on absence and strips. Default `'allow'` is the realistic
   behavior for a parser — legacy editors emit BOMs, the parser should
   silently tolerate them.
2. **Unicode normalization** (`unicode: 'NFC' | 'NFD' | 'none'`, default
   `'none'`). Calls `input.normalize(form)` once when set. `'none'` is a real
   string-typed value (not undefined) so the runtime branch is unambiguous.
3. **Newline canonicalization** (`newlines: 'LF' | 'CRLF' | 'either-preserve'`,
   default `'LF'`). `'LF'` is a no-op. `'CRLF'` normalizes `\r\n → \n` once at
   entry. `'either-preserve'` normalizes both `\r\n` and lone `\r` to `\n` —
   value-stable but not byte-stable for CRLF input.
4. **Case fold** (`caseSensitive: boolean`, default `true`). When `false`,
   input is lowercased via `input.toLowerCase()` AFTER the prior three steps.
   Captures see the lowercased view. Schemas with `caseSensitive: false` MUST
   write examples in canonical (lowercase) form for the round-trip theorem.

The v2 emitter emits per-dial code unconditionally — there is no
"all-defaults short-circuit" — because the interp actively strips BOMs at
`bom: 'allow'`, so emit must too (otherwise BOM-prefixed input parses
differently between interp and emit, breaking the differential-fuzzing
invariant). Result: default schemas have a `__parse` body containing exactly
one new BOM-strip line; non-default schemas accrete one line per opted-in
dial. Bytecode backend stays untouched — cron remains the only
bytecode-tested schema (Phase 6 follow-up #4 / Phase 7 follow-up #3).

### What landed (Phase 8)

| Task | Commit(s) | What landed |
| --- | --- | --- |
| 8.1 | `619aadc` + `ccea8e2` | `BomPolicy`, `UnicodeForm`, `NewlinePolicy` type unions in `parser/src/types.ts`; four new fields on `SchemaDef`/`SchemaInput`/`InferredSchema`; defaults wired through `defineSchema` + `inferSchema`. `parser/test/schema-dials.test.ts` covers defaults + overrides (parser 28 → 30). Comment fix-up `ccea8e2` corrects the "all four are no-ops at default" claim (BOM `'allow'` strips). |
| 8.2 | `fddc150` + `e8b3a07` | `applyPreamble` helper in `interp/parse.ts` handles BOM allow/reject/require + Unicode NFC/NFD/none at parse entry. `compiler/test/unicode-preamble.test.ts` (6 + 3 happy-path follow-ups in `e8b3a07` → 9 tests; compiler 335 → 344). |
| 8.3 | `cc3c297` | `applyPreamble` extended for newline canonicalization. `compiler/test/newlines-preamble.test.ts` uses a `rawUntil([])` schema design (the plan's `.span('\n')` design was broken by `parseProduction`'s `skipWs`). 5 tests instead of 3 (extra happy-path checks; compiler 344 → 349). |
| 8.4 | `e39dbe5` + `392b01a` | `applyPreamble` extended for `input.toLowerCase()` when `caseSensitive: false`. `compiler/test/case-insensitive.test.ts` uses literal `.span('open', 'div')` (no `.until()`) so case-sensitive mode can reject uppercase via exact-byte literal match. Fix-up `392b01a` switches to a `makeTagSchema(caseSensitive)` factory and tightens `assert.throws` to match `SyntaxError`. Compiler 349 → 354. |
| 8.5 | `16243d8` + `1226331` + `e5597bf` | `emitPreamble` in `emit/v2/index.ts` emits the same 4-step preamble into generated `__parse`. **No all-defaults short-circuit** (would diverge from interp on BOM-prefixed input). Regen commit `1226331` updates 5 in-scope `_generated/parser.ts` files (each gaining the BOM-strip line). CSS regen absorbed legitimate Phase 7 indent catch-up (stale helper functions). Fix-up `e5597bf` adds emit-side BOM allow/reject happy paths + NFD test. Compiler 354 → 367. |
| 8.6 | `abdc2ea` + `9c023ba` | HTML schema opts in to `caseSensitive: false`. `packages/html/test/case-insensitive.test.ts` covers DIV/div parity, `<Script>` raw-text, attribute lowercasing, `<BR>` void element. Pre-existing HTML tests (`conformance.test.ts`, `html.test.ts`) updated for the design contract — `caseSensitive: false` lowercases the **entire input** including text content and attribute values, not just tag names. Fix-up `9c023ba` strengthens 3 weak assertions to structured AST access (was JSON-substring scans). HTML 30 → 34. |
| 8.7 | `68c55fa` + `364f047` | `compiler/test/unicode-roundtrip.test.ts` — inline email-grammar schema with `unicode: 'NFC'`. 5 tests cover interp NFD→NFC + identity, emit NFD→NFC, stringify produces NFC, and round-trip stability with NFC-anchor assertion. Compiler 367 → 372. |
| 8.8 | (this commit) | Documentation closeout. |

### Phase 8 exit gate status

| Criterion | Status | Note |
| --- | --- | --- |
| HTML schema parses `<DIV>` and `<div>` equivalently with `caseSensitive: false` set | **PASS** | `packages/html/test/case-insensitive.test.ts` — DIV/div parity, mixed-case raw-text containers, attribute-name lowercasing, void elements all parse to identical structured ASTs. |
| Unicode normalization round-trips for an email-grammar example | **PASS** | `packages/compiler/test/unicode-roundtrip.test.ts` — NFD input → NFC capture (interp + emit); stringify produces NFC source; second-pass round-trip is byte-stable AND anchored to NFC explicitly. |

### Phase 8 follow-ups (deferrable)

None block Phase 9. Each is a real gap that the in-scope schemas and exit-gate
tests work around or don't exercise.

1. **Bytecode backend has no preamble support.** The bytecode encoder ignores
   the four new dials. Cron stays bound to defaults. Adding preamble to
   `packages/compiler/src/emit/bytecode/runtime.ts` is a follow-up.

2. **`caseSensitive: false` is ASCII-only-correct.** `input.toLowerCase()` uses
   Unicode default case mapping (locale-independent — not the
   `toLocaleLowerCase('tr')` path with the Turkish dotless-i gotcha), which is
   right for ASCII tag names. Grammars with non-ASCII tokens (e.g. Greek
   letters in math notation) may hit edge cases.

3. **`caseSensitive: false` lowercases the ENTIRE input, not just tag/attribute
   names.** Surfaced by Task 8.6 — text content and attribute values are also
   folded. The Phase 8 design contract documents this: schemas with
   `caseSensitive: false` MUST write examples in canonical (lowercase) form.
   Pre-existing HTML tests that asserted on mixed-case text content were
   updated to canonical lowercase. Inline `conformance.test.ts` normalizer
   lowercases parse5's text/attr-value sides before comparison.

4. **`newlines: 'either-preserve'` is value-stable but not byte-stable for
   CRLF input.** Round-trip emits LF only. "Preserve" in the name is a
   misnomer kept for master-plan compatibility; true byte preservation would
   require per-newline metadata in captures and is out of scope.

5. **`bom: 'allow'` changes behavior for inputs with a BOM.** Pre-Phase-8
   schemas would fail on BOM-prefixed input; post-Phase-8 they strip the BOM
   silently. This is a strict expansion of accepted inputs (no schema that
   previously parsed now fails).

6. **No per-pattern case-insensitive escape hatch.** Phase 8 dials are
   schema-wide. The existing `.oneOf({ caseInsensitive: true })` refinement is
   value-level (it lowercases the candidate AND the captured token before
   comparison) and unchanged by Phase 8. With `caseSensitive: false` at schema
   level, this refinement becomes redundant — both `.html().oneOf(...)` and
   the schema-level dial now lowercase. Worth simplifying the HTML schema in
   a future cleanup pass.

7. **Switch exhaustiveness gap on `bom` and `newlines`.** Neither
   `applyPreamble` (interp) nor `emitPreamble` (emit) has a `default` branch
   on the `bom` / `newlines` switches. The type union is closed today so this
   is forward-safety only — if a future task adds `bom: 'strip-silently'` the
   switch will silently no-op. Adding `default: throw new Error(...)` to both
   switches in BOTH files (to avoid interp/emit drift) is the fix.

8. **Preamble cost is O(n) per parse call.** For very large inputs with many
   parse calls (e.g. streaming-style use), the per-call `.normalize` /
   `.toLowerCase` cost may dominate. The schema-level dial design assumes
   per-document parsing.

9. **`checkRoundTrip` does not exercise non-canonical inputs.** Schemas with
   `caseSensitive: false` or `newlines: 'either-preserve'` must write examples
   in canonical form (lowercase, LF) for the theorem to hold. Non-canonical
   inputs are tested via separate package-level tests.

10. **CSS `_generated/parser.ts` drifted during prior tasks.** Task 8.5's
    regen absorbed Phase 7 indent helpers (`indentStack`/`columnAt`/etc.) that
    were emitted by the compiler but never regenerated in the CSS package.
    The regen mechanism that produces drift is worth investigating — running
    css tests should not be silently regenerating the parser.

11. **`packages/parser/src/index.ts` re-export drift.** Task 8.1 added
    `BomPolicy`/`UnicodeForm`/`NewlinePolicy` to the parser barrel because
    `compiler/src/model.ts` imports them. Plan oversight; the re-export is
    additive and safe.

12. **Literal diacritics in `unicode-roundtrip.test.ts:50-51`.** `NFC_LOCAL`
    and `NFD_LOCAL` use visually-ambiguous literal characters
    instead of `é` / `é` escapes. The codepoint sequences are
    byte-correct but the source presentation is sub-optimal. The Edit tool
    cannot reliably perform byte-level NFC/NFD source edits without
    corrupting them; a manual fix is required.

13. **`mac` and `css-color` packages have pre-existing test failures unrelated
    to Phase 8.** Same as Phase 7 follow-up #8 — confirmed unrelated; flagged
    for awareness.

## Phase 9 closeout (2026-05-28)

The bidirectional-engine overhaul is complete. Phase 9 landed the `relation()` DSL clean break: all 5 in-scope schemas (css, html, markdown, cron, yaml-block) are now expressed via the new declarative form, `ex()` is deleted, and the 8 out-of-scope packages (arn, js, log, mac, proto, url, css-color, css-length-percentage) are gone.

### What landed (Phase 9)

| Task | Commit | Description |
|---|---|---|
| 9.1 | `a5f711e` | feat(parser): introduce relation() DSL alongside ex() |
| 9.1 review | `6fb110a` | fix(parser): relation() build + private data + tightened parse() |
| 9.2 | `4c01019` | feat(parser): relation() cross-validates input vs parse program |
| 9.2 review | `d1e50f9` | fix(parser): tighten cross-validation loop + add optional-skip self-doc test |
| 9.3 | `d2ce16e` | test(parser): IR-equivalence harness for relation() vs ex() |
| 9.4 | `1dfaf23` | refactor(api): rename render/stringify option 'type' to 'target' |
| 9.4 review | `6993d24` | docs(tests): update stale comments referencing { type: 'ast' } API |
| 9.5 | `d64ba0c` | refactor(cron): rewrite schema onto relation() DSL |
| 9.6 | `066a749` | refactor(yaml-block): rewrite schema onto relation() DSL |
| 9.7 | `a04e43f` | refactor(markdown): rewrite schema onto relation() DSL |
| 9.8 | `e926faf` | refactor(html): rewrite schema onto relation() DSL |
| 9.9 | `f347a6d` | refactor(css): rewrite schema onto relation() DSL |
| 9.10a | `8c3e730` | feat(parser): withInverse() encoding wrapper for relation() |
| 9.10b (4 commits) | `5c13b60` `fda142c` `c055c68` `ecf4135` | refactor(test-fixtures + tests): bulk-migrate 17 test files |
| 9.10b unicode fix | `095896f` | fix(tests): unicode escape literals + NFC-fallback in relation() validator |
| 9.10c | `56b383d` | refactor(parser): delete ex() builder; relation() is now the only DSL |
| 9.11 | `b65ebcf` | chore: delete 8 out-of-scope packages |
| 9.12 | `a4de02c` | docs: Phase 9 relation() DSL closeout (this commit) |

### Final state

- parser: 75/75 (after spike + ir-equivalence deletion in Task 9.12) ✅
- compiler: 374/374 ✅
- css: 56/57 (1 intentional skip) ✅
- html: 34/34 ✅
- markdown: 76/76 ✅
- cron: 15/15 ✅
- yaml-block: 9/9 ✅

### Phase 9 deviations from plan

1. **Task 9.10 scope expansion.** The plan estimated Task 9.10 as a single step deleting `example.ts`. Reality: 226 `ex()` usages across 21 test files (3 in parser, 17 in compiler + 3 error-fixture schemas) required bulk migration. Resolved by splitting into 9.10a (withInverse API), 9.10b (bulk migrate), 9.10c (delete ex). Total 9.10 commits: 7.

2. **Task 9.11 cross-package dependencies.** The plan assumed "no cross-package imports existed" for the 8 out-of-scope packages. Reality: `packages/css` depended on `@parser2/css-color` and `@parser2/css-length-percentage` for runtime validators. Resolved by inlining ~2300 lines of validator code from those packages into `packages/css/src/_generated/parser.ts` with `__cc_`/`__cl_` prefix namespacing. CSS schema validation simplified to `defineValidation(cssSchema)`.

3. **Unicode literal corruption.** During Task 9.10b migration, the file write normalized NFD diacritics in `unicode-preamble.test.ts` and `unicode-roundtrip.test.ts` to NFC, breaking the NFC-vs-NFD invariants. Resolved by replacing visually-ambiguous literals with explicit `\u` escape sequences (addresses Phase 8 follow-up #12). Net: compiler tests grew from 372 → 374 because 2 previously-masked tests now run cleanly.

4. **TAP lexer crash on unicode error messages.** The `relation()` validator's strict byte-comparison emitted error messages containing NFD combining characters, crashing TAP's lexer mid-test-file. Resolved by adding NFC-normalize fallback in `SpanNode.validateInputAgainstProgram`.

### Phase 9 follow-ups (deferrable)

1. **CSS generated parser has inlined validators.** Regenerating CSS via `npm run generate -w "@parser2/css"` would fail because the schema no longer imports from `@parser2/css-color` / `@parser2/css-length-percentage` (deleted) but the generated parser includes their inlined code. Resolution paths: (a) teach codegen to inline validator deps; (b) reborn the two color/length packages under relation(); (c) refactor CSS schema to define validators inline. None blocks current functionality.

2. **`relation-ir-equivalence.test.ts` deleted.** The load-bearing IR-equivalence test (relation() ≡ ex() deep-equal) was deleted along with ex(). Future refactors of the relation() builder lose this guard. If `relation()` IR output ever drifts subtly, no in-tree test will catch it directly — schema rewrites would need to be re-validated via byte-equality of generated parsers (which is still enforceable manually).

### Bidirectional-engine overhaul — overall closeout

All 9 phases complete. The engine is proven (Phases 1-7); the schema-level dials are in place (Phase 8); the DSL is uniform (Phase 9). The in-scope packages (parser, compiler, css, html, markdown, cron, yaml-block) are the supported surface. The 8 out-of-scope packages have been removed.

Total commits across the 9-phase overhaul: see `git log --oneline` from the start of Phase 1 through this closeout.
