# Plan: mode:'raws' interleaved-trivia sidecar

Authored 2026-06-08 as the design pass the prior handoff explicitly asked
for before any implementation. Scope: bring **byte-exact round-trip on
unmodified subtrees** to `whitespace: 'standard'` schemas (rrule,
iso-duration, cron, pg-select, toml, css, html, json, markdown, ...),
not just to schemas that opt into `whitespace: 'preserve'`.

## What works today

| Capability | Status | Where |
|---|---|---|
| `mode: 'raws'` accepted as `render` option | ✅ | `emit/v2/runtime.ts:ParseMode` |
| Per-node `source: { start, end }` attached when raws | ✅ | `emit/v2/production.ts:319-330` |
| `whitespace: 'preserve'` schemas capture inter-span whitespace into `__ws[]` | ✅ | `emit/v2/production.ts:216-258` |
| Same schemas capture per-iteration repeats whitespace into `<name>_iws[]` | ✅ | same |
| Same schemas capture unnamed-optional-literal presence into `__litPres[]` | ✅ | same |
| AST builder for preserve schemas interleaves `__ws` / `__litPres` / `_iws` into the rebuild | ✅ | `emit/captures.ts` + builders |
| Stringify in preserve schemas round-trips byte-exact | ✅ | inverse path + rebuild |

**The gap**: every `__ws` / `__litPres` / `_iws` capture is gated on the
compile-time check `schema.whitespace === 'preserve'`. Schemas with the
default `'standard'` policy capture nothing, so `mode: 'raws'` on them
gives back `source` positions but no trivia. The author can find a node
in the original input by byte offset; they can't re-emit it without
losing inter-node whitespace.

PostCSS / postcss-class style tooling needs the inverse: modify a node,
emit the whole document, and have unmodified surrounding nodes come out
byte-for-byte identical to input. That requires per-node trivia data
attached to the AST.

## Design

The shape lands in three layers, each one independently testable.

### Layer 1 — Parser captures inter-span trivia in raws mode

Promote the `preserveWs` switch in `emit/v2/production.ts` from a
compile-time flag (schema's whitespace policy) to a hybrid runtime flag:

  - `preserveWs` (schema policy) still forces the capture
    unconditionally — same allocation pattern as today, no perf
    regression on css / markdown.
  - For `whitespace: 'standard'` schemas, the same capture code is
    emitted BUT each `__ws.push(...)` / `__litPres.push(...)` site is
    guarded by `if (state.mode === 'raws')`. Fast-mode parsers see an
    untaken branch per inter-span gap (~1 cycle, branch predictor
    learns it on the first call) and skip the slice + array push.

This is the minimum change to make the captures **available** in raws
mode without breaking preserve mode and without measurably slowing
fast mode. No schema needs to change. No AST shape changes yet.

**Files touched**: `emit/v2/production.ts` (the `preserveWs` boolean
becomes `wsCapture: 'always' | 'raws-only' | 'none'`; emit sites
choose the wrap accordingly).

**Acceptance**: existing perf gates green; raws-mode rrule render of
`'FREQ=DAILY ;COUNT=10'` returns a captures payload containing
`__ws = ['', ' ', '', '']` (or however many gaps the prod has). No
inspection of `__ws` from the public render API yet — internals only.

**Risk**: low. The change is mechanical and gated; the only failure
mode is a forgotten emit site.

### Layer 2 — AST builder attaches `.raws` field per node

When `mode === 'raws'` and the captures payload carries a `__ws` array,
the per-target builder synthesizes a `raws` field on the result object:

```ts
{
  type: 'rule',
  selector: '.foo',
  body: { ... },
  source: { start: { line, column, offset }, end: { ... } },
  raws: {
    // PostCSS-shaped: trivia "before" each child position
    before: '\n  ',       // ws between this node and the previous sibling (or parent open)
    between: ['  ', ' '], // ws between each consecutive child span at this node
    after: '\n',          // ws between last child and this node's end / next sibling
  }
}
```

The exact shape mirrors PostCSS where possible (the codemod ecosystem
already knows it). For non-CSS shapes the `between` array indexes
line up with the node's structural fields in declaration order — same
order the inverse rebuild walks.

**Files touched**: `emit/captures.ts` (synthesize the `raws` field
when building 'ast' targets), `infer/structure-types.ts:256` (add the
`.raws?: NodeRaws` to inferred TS types — `?` because fast mode
returns the same builder without it).

**Acceptance**: raws-mode render of a multi-span input has each AST
node carrying a `raws` object whose `before` / `between` / `after`
fields, when concatenated in order with the node's own captured spans,
reconstitute the original input byte-for-byte.

**Risk**: medium. The mapping from `__ws[i]` index to a named slot on
the AST node requires keeping schema-author-declared structural fields
and parser-captured spans in sync. Existing `__ws_$i` indexing is
positional; the builder needs to know which field a given index
corresponds to. Spec the index → field map per production at
codegen time so the builder doesn't recompute it on every node.

### Layer 3 — Stringify in raws mode uses the sidecar

When `mode: 'raws'` AND the input AST node carries a `raws` field, the
stringify path prefers the recorded trivia over the canonical "single
space between spans" output. Unchanged subtrees come out byte-exact;
modified subtrees fall through to the canonical formatter so the
output is still well-formed.

**Files touched**: `emit/inverse.ts` template/rebuild paths.

**Acceptance**: round-trip a real-world CSS file through `render(s,
{type:'ast', mode:'raws'})` then `stringify(ast, {type:'source',
mode:'raws'})` and assert `out === s` byte-for-byte. (Today's
preserve schemas already meet this on subtrees they cover; standard
schemas now also do.)

**Risk**: medium-high. The inverse path is the most complex in the
emit. Changes here will surface latent bugs in the existing rebuild.
Plan: land Layers 1+2 first, then ship Layer 3 behind a feature flag
and roll it out per-schema after passing the round-trip test.

## Phasing

| Phase | Scope | Estimated sessions | Reviewer-checkpoint |
|---|---|---|---|
| 1 | Layer 1 capture | 1 | __ws populated in raws mode for one standard schema (rrule); fast-mode perf gate green |
| 2 | Layer 2 builder | 1-2 | `.raws` field present on AST nodes for two standard schemas |
| 3 | Layer 3 stringify | 2 | round-trip test green on real-world fixtures for at least one standard schema |
| 4 | Per-schema rollout | 1 per schema | round-trip green for css, html, json, markdown |

Total: ~6-8 sessions. The handoff was right to flag this as "highest-
value, multi-session." Layers 1-2 alone unlock the externally-visible
PostCSS-like API surface; Layer 3 is what makes the byte-exact promise
real.

## Out of scope

- **Modifying nodes preserves trivia.** When the caller mutates a
  child, the parent's `raws.before` for the next sibling stays the
  same but the modified child's own trivia becomes stale. The
  formatter has to detect "this child was mutated" and either re-flow
  or take the user's chosen `raws` overrides. Decision deferred — the
  initial slice's correctness target is *unmodified subtrees*, which
  is the 99% case for read-then-rewrite codemods.
- **`'preserve'` schemas re-encode through the new path.** Today's
  preserve schemas keep working unchanged. A future cleanup might
  merge the two code paths once the new path is stable on standard
  schemas.
- **Bytecode backend.** Stays on `'fast'` mode only (it explicitly
  throws on raws today — `emit/bytecode/index.ts:75`). Adding raws to
  bcode is a separate ~1-session task; the TS backend is the primary
  target for the formatter use case.

## First slice to ship (next session, or this one if time permits)

Layer 1 only:

1. Refactor `preserveWs: boolean` in `emit/v2/production.ts` into
   `wsCapture: 'always' | 'raws-only' | 'none'`. `'always'` is the
   existing preserve-schema behavior; `'raws-only'` wraps each push
   site in `if (state.mode === 'raws')`; `'none'` matches the
   existing standard-schema behavior (no allocation, no push).
2. Decide the picker: standard schemas get `'raws-only'`; preserve
   schemas keep `'always'`; schemas that opt out entirely get
   `'none'` (none today — every schema benefits from at least the
   raws-mode option).
3. Run the perf gate for at least one schema known to be perf-tight
   (rrule has the leanest fast path) and ensure no regression.
4. Add a focused test: parse `'FREQ=DAILY ;COUNT=10'` in raws mode,
   assert the captures payload's `__ws` array is populated.

The remaining layers wait on this slice landing cleanly.
