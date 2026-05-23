# Scannerless codegen — design

Status: design draft, awaiting approval. Author: Claude (Opus 4.7).
Predecessor: `2026-05-22-html-parser-design.md` (HTML roadmap; this is the
generic compiler work that supersedes the Phase V item there).

## Goal

Eliminate the intermediate token stream from generated parsers. Today's
pipeline is **bytes → typed-array tokens → structure**. The new pipeline is
**bytes → structure** directly. The generated parser exposes only `parse`,
`validate`, `stringify` — `tokenize`/`countTokens` go away.

Primary motivation: codegen parser performance.

## Where time goes today (measured)

CPU profile on the 1 MB tag-soup synthetic (`<div class=hero><p>x<p>y</div>
<ul><li>a<li>b</ul>` repeated to 1 MB, 78.6 ms avg parse):

| Function                               | Self time |
| -------------------------------------- | --------- |
| `__tokenize`                           | 33.7%     |
| garbage collector                      | 22.1%     |
| `parseAttributeFast__alt2`             | 11.5%     |
| `parseHtmlElementFast__valid`          | 8.9%      |
| `parseHtmlElementFast`                 | 5.5%      |
| `parseHtmlElementFast__valid__alt7/3`  | 4.2 + 3.6%|
| `captureRawUntil`                      | 1.7%      |
| `expectClassId` / `expectLiteralId`    | 1.4 + 0.4%|

Numbers for `countTokens` vs `parse`:

| Input          | Tokens   | Bytes/tok | Tokenize alone | Parse total | Tokenize share |
| -------------- | -------: | --------: | -------------: | ----------: | -------------: |
| 1 MB tag soup  | 663,400  | 1.58      | 37.6 ms        | 78.6 ms     | **48%**        |
| huge-page real | 244,033  | 3.70      | 20.2 ms        | 26.1 ms     | **77%**        |

Two implications:

- **Tokenization is the largest single cost** on real HTML (77%). The
  per-token typed-array allocation, the per-token type-ID dispatch
  (`state.types[pos] === TYPE_ID_X`), and the value re-check via
  `tokenEquals` are all overhead that scannerless eliminates.
- **GC is the second largest cost.** Some of that is structure-building
  (`childNodes` arrays, `attrs` objects) that scannerless doesn't help with.
  But the ~200k–660k token tuples in the typed arrays per parse are a
  meaningful fraction.

Expected after scannerless (rough, with the usual caveats about
optimistic estimates):

- 1 MB tag soup: 78.6 → ~45 ms (≈1.75× speedup). vs parse5 (60 ms) we'd be
  ~0.75×.
- huge-page: 26.1 → ~13 ms (≈2×). vs parse5 (37 ms) we'd be ~0.35×.
- Smaller inputs benefit even more proportionally (less amortized startup).

## The new runtime model

### State

```ts
type State = {
  readonly input: string;
  off: number;                     // source byte offset (was: token index)
  readonly mode: 'fast' | 'raws';
  readonly lineStarts: number[];   // computed lazily, raws only
  __lastCaptureStart: number;      // unchanged — used by $.gap/$.tail/$.raw
  __lastCaptureEnd: number;
};
```

Fields that go away: `types`, `starts`, `ends`, `count`, `pos`,
`hasComments`, `commentTypeId`. The single `off` replaces `pos`.

### What replaces each existing helper

| Old runtime helper                                  | Scannerless replacement                                                                                          |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `__tokenize`                                        | **gone**                                                                                                         |
| `skipComments`, `nextNonCommentPos`, `nthNonCommentPos` | `skipWs(state)` (always emitted) + `skipWsAndComments(state)` (emitted only when schema declares `tokens: ['comment']` or comment punctuators) |
| `expectLiteralId`, `expectLiteralIdValue`           | inlined per literal at the call site: `if (input.charCodeAt(off) !== 0x3C) throw …; off++;` for single-char, `input.startsWith('</li>', off)` for multi-char |
| `expectClassId`                                     | inlined per class at the call site (the class scanner that today lives in `emit/tokenize.ts` moves into `emit/parse.ts` as a call-site emitter) |
| `peekLiteralId*`                                    | inlined char compares at the call site                                                                          |
| `consumeOptionalLiteralId*`                         | inlined try-then-rollback                                                                                        |
| `tokenEquals`                                       | gone — char-by-char compare is inlined where needed (string `startsWith` for multi-char literals)                |
| `captureUntil`                                      | **rewritten** — char-based depth tracker (see below)                                                            |
| `captureRawUntil`                                   | unchanged behavior; tighter integration since there's no need to advance a token cursor afterwards               |
| `scanTopLevelBoundary`, `nextTopLevelStopId`        | rewritten char-based variants for the leading-capture dispatch pattern                                            |
| `attachRawsBefore` / `makeSource` / line tracking   | unchanged — they already work in offsets                                                                          |
| `requireNoWhitespaceAfterLastToken`                 | inlined; checks `input.charCodeAt(off)` is non-whitespace                                                         |

### How the per-span primitives compile

**Literal span.** Today: `expectLiteralId(state, TYPE_ID_LT, '<')`. After: one
inlined char compare for the leading byte, a `startsWith` for multi-char
literals, then `state.off += literal.length`. For named literal spans the
existing `__name_start` / `__name_end` offsets come straight from `state.off`
before/after the consume.

**Class span (`ident`, `number`, `string`, `hex`).** Today: a class branch in
`emit/tokenize.ts` scans the bytes and emits a token; the parser later does
`expectClassId(state, typeId, name)` which slices `input.slice(starts[pos],
ends[pos])` and advances `state.pos`. After: the same byte-scanning logic
lives in a `emit/scan-class.ts` module and is inlined directly at the parse
site. The slice and the variable-binding land in the same generated line:

```js
// .span('tag', 'p').ident().html()
const __tagStart = state.off;
const c0 = state.input.charCodeAt(__tagStart);
if (!isCssIdentStart(c0)) throw new SyntaxError("expected ident at position " + __tagStart);
state.off = __tagStart + 1;
while (state.off < state.input.length && isCssIdentPart(state.input.charCodeAt(state.off))) state.off++;
const tag = state.input.slice(__tagStart, state.off);
```

For unnamed classed spans (`.span('1.0').number()` with no capture) we skip
the slice. This is **strictly less work than today** — we already had to
slice in `expectClassId`.

**`.until()` capture.** This is the structural piece that changes most.
Today: `captureUntil` walks the token cursor, depth-tracks brackets by
looking at the first char of each token's slice, and slices the input on
exit. After:

```js
// .until([';', '}']) with balanced: true
const __captureStart = state.off;
let __depth = 0;
const __input = state.input;
const __len = __input.length;
while (state.off < __len) {
  const __c = __input.charCodeAt(state.off);
  if (__depth === 0) {
    if (__c === 0x3B /* ; */ || __c === 0x7D /* } */) break;
  }
  if (__c === 0x28 || __c === 0x5B || __c === 0x7B) { __depth++; state.off++; continue; }
  if (__c === 0x29 || __c === 0x5D || __c === 0x7D) {
    if (__depth === 0) break;
    __depth--; state.off++; continue;
  }
  if (__c === 0x22 || __c === 0x27) { /* skip string */ scanString(state, __c); continue; }
  if (__c === 0x2F && __input.charCodeAt(state.off + 1) === 0x2A) { /* skip /* … */ */ scanBlockComment(state); continue; }
  state.off++;
}
```

The schema-level `tokens: ['number', 'string', 'comment']` declaration —
already in the DSL — drives whether the loop knows about strings or
comments. The dispatch table itself is built by the compiler from that
declaration. **No new DSL surface.**

The trim+omit-comment-adjacent-whitespace logic from today's `captureUntil`
ports verbatim — it operates on `(startOffset, endOffset, [commentRanges])`
which we collect inline as we scan.

**`.rawUntil()` capture.** **Unchanged.** Today's implementation already
scans raw bytes via `indexOfChar` / `indexOfBounded`. Only difference:
remove the trailing `while (state.pos < state.count && state.starts[state.pos]
< earliest) state.pos++` loop — there are no tokens to advance.

**`.repeats({ stopBefore })`.** Today's `emitStopBeforeCheck` already reads
`state.input.charCodeAt(__off)` where `__off = state.starts[state.pos]`. In
scannerless `__off === state.off` (after a `skipWs` between iterations).
**Trivial port.**

**`.repeats({ sep })`.** Today: `peekLiteralCall` checks the next token type
against the separator. After: char compare on `state.input.charCodeAt(state.off)`
(after `skipWs`). For multi-char separators, `startsWith`.

**Refinements `.oneOf` / `.hexString` / `.lengths`.** All operate on the
captured string. **Unchanged.**

**First-token lookahead dispatch** (the big multi-production dispatcher in
`emitFirstTokenProductionDispatch`). Today: `state.types[state.pos]` and
`tokenEquals(state, pos, lit)`. After: char compare on
`state.input.charCodeAt(state.off)`, optionally followed by an ident scan +
`.toLowerCase()` for the `.oneOf` tag-name discriminator. The existing
two-level prefix-grouping and `__lower` hoisting carry over directly — they
already abstract over the underlying compare.

### Recovery semantics

`.recovers()`: rewind `state.off` instead of `state.pos`. The wrapper
function emitted by `emitNodeFunctionWithRecovery` keeps the same shape. No
semantic change. Verified by HTML's recovery tests (`<div123/>`, malformed
doctype) which assert the post-recovery structure.

### Public API

The generated module exposes:

```ts
export function parse(input: string, options?: ParseOptions): unknown;
export function validate(input: string, options?: ParseOptions): void;
export function stringify(_value: unknown): string;
```

`tokenize`, `countTokens`, the `Token` type, the `TYPE_ID_*` constants, and
the `__TYPE_NAMES_BY_ID` array are removed from the generated file.

### DSL changes

**None expected.** The schema author surface is unchanged. `tokens: [...]`
keeps its current meaning: classes that the parser should be able to scan
past inside `.until()` captures (where no span describes them directly).
The compiler reads this and emits the appropriate string/number/comment
recognition into the depth-track loop.

The internal `LiteralDecl` / `TokenClassUsage` / `tokenTypeIds` data on
`InferredSchema` stays — it's still useful for codegen (longest-match
ordering, single-vs-multi-literal-type optimizations carry over). What
goes away is the *runtime* materialization of those token types.

## What `emit/*` looks like after

```
emit/index.ts       — top-level emitter (similar)
emit/parse.ts       — production dispatchers (similar shape, char-based primitives)
emit/scan-class.ts  — new — per-class inline scanners (ident, number, string, hex)
                      pulled out of the old tokenize.ts
emit/scan-skip.ts   — new — skipWs / skipWsAndComments emitters
emit/scan-until.ts  — new — captureUntil emitter (char-based depth tracker
                      with optional string/comment skipping)
emit/scan-raw.ts    — new — captureRawUntil (ported from runtime.ts)
emit/runtime.ts     — much smaller — line tracking, source frame, isAsciiWs,
                      isHexDigit. The captureUntil / scanTopLevelBoundary /
                      expectLiteral* / tokenEquals helpers all go away.
emit/tokenize.ts    — DELETED
emit/structure.ts   — unchanged
emit/direct-fast.ts — kept as-is for now (it's a per-schema fast path that
                      bypasses the whole parser; orthogonal to this change)
```

`direct-fast.ts` is the existing tier-1 path for very simple schemas. It
already operates on bytes, not tokens — scannerless doesn't affect it. We
keep it.

## Migration path

The 11 schemas vary in complexity. Order them by complexity ascending and
migrate one at a time, verifying tests + bench gates at each step:

| Order | Schema                  | Why this position                                |
| ----- | ----------------------- | ------------------------------------------------ |
| 1     | `log`                   | 38-line schema. Single production, simplest.    |
| 2     | `mac`                   | 42-line schema. Same shape.                     |
| 3     | `arn`                   | 56-line schema.                                  |
| 4     | `proto`                 | 59-line schema. Uses `.until()`.                 |
| 5     | `cron`                  | 71-line schema.                                  |
| 6     | `url`                   | 76-line. Uses `.until()`.                        |
| 7     | `css-color`             | 165-line. Uses `.until()` heavily.               |
| 8     | `css-length-percentage` | 204-line.                                        |
| 9     | `css`                   | 301-line. `.until()` × 14, mutual recursion.    |
| 10    | `markdown`              | 405-line.                                        |
| 11    | `html`                  | 578-line. Biggest. Uses `.rawUntil`, `.recovers`, implicit-close. |

The compiler change is **all-or-nothing per emitter** — we can't run
"scannerless for some schemas, tokenized for others" reasonably. So the
migration is:

1. **Land scannerless emit behind a feature flag** (a compiler option, not a
   schema flag — schema authors don't see it). Default: tokenized.
2. **Re-generate one schema with the flag on.** Confirm tests pass; confirm
   perf gates still pass (relock when faster).
3. **Repeat for each schema in order.** When all 11 are passing in
   scannerless mode, flip the default.
4. **Delete the tokenized path.** `emit/tokenize.ts`, the runtime helpers
   it produces, the `tokenize`/`countTokens` exports, the `bench:*:tokenize`
   scripts, the tokenize tests, the `Token` type, the DSL doc paragraphs
   that mention tokenization.

Estimated session shape: step 1 is the bulk (1 session). Each schema in
step 2/3 is small (~30 min). Step 4 is cleanup (~30 min). Total ~2 focused
sessions.

## Risks and what to do if they hit

1. **Bundle size grows.** Inlining class scanners at each call site
   increases generated file size. Today the html parser is ~68 KB minified.
   I estimate scannerless will land at ~100–130 KB before any minification
   pass. The size-gate baselines will need to be relocked. If the gzipped
   size goes above ~12 KB (currently 7.4) we should look at extracting
   common scanners back into runtime helpers (paid for in one extra call,
   but smaller code).

2. **`.until()` semantics drift.** Today's captureUntil has subtle
   comment-adjacent-whitespace omission logic (`omit` ranges) that affects
   CSS's selector capture. If we get the port wrong, the CSS conformance
   suite catches it. Strategy: port the omission logic line-for-line, then
   diff outputs against the tokenized version on a fixture corpus before
   relocking baselines.

3. **Recovery rewinds.** `state.off` rewind is simpler than `state.pos`
   rewind (no token-cursor invariant), but I want to verify that the
   try/catch around `__valid` in `emitNodeFunctionWithRecovery` correctly
   preserves the offset on throw. This is one targeted test.

4. **Cross-schema regressions.** Every schema has its own perf gate. If
   any schema regresses below 0.9× current, back out that schema and
   investigate. The migration order is designed so the harder schemas
   come last — by the time we get to HTML, the model is proven.

5. **`tokens: []` semantics in CSS.** CSS's selector capture relies on the
   tokenizer recognizing strings and numbers so the depth-track loop can
   walk past them. In scannerless this becomes "the depth-track loop
   knows how to skip strings and `/* … */` based on the schema's `tokens`
   declaration." If a schema doesn't declare `tokens: ['string']` but a
   `.until()` capture sweeps over strings, the depth tracker would
   miscount brackets inside the string. Solution: when emitting a
   `.until()` loop, compile the string/number/comment skip arms based on
   the schema's `tokens` field. Same semantic as today.

6. **Profiling reveals the wrong bottleneck.** The 22.1% GC time is a lot
   and scannerless doesn't help with structure-allocation. Even if
   tokenize goes to zero we don't get a 2× speedup overall — closer to
   1.6–1.8×. That's still worth it but be calibrated: this is not a 5×
   change.

## Tests + gates checklist (per schema, per step)

- `npm test -w @parser2/<pkg>` — all green.
- `npm run audit:parser-contract` — clean.
- `npm run gate -w @parser2/<pkg>` — perf and size gates pass (or
  relocked baseline reviewed).
- For html: parse5 conformance numbers stay within current bounds (or
  improve).

## Out of scope for this work stream

- The 22.1% GC pressure from structure allocation. Addressed separately
  if needed.
- WHATWG insertion modes (Phase IV from the HTML design doc).
- `stringify` implementation.
- DSL surface changes. If a schema needs something scannerless can't
  express, it's a separate primitive proposal.

## Approval checkpoint

Before any code changes I want approval on:

1. The new `State` shape (`off` instead of `pos`).
2. The runtime helper deletions list.
3. The migration order (simplest first; html last).
4. The decision to **not** keep `tokenize`/`countTokens` exports.
5. The plan to add a feature flag temporarily so we can land
   scannerless schema-by-schema rather than all at once.

If those land, I'll start with step 1 (the compiler change, default off)
in the next session.

---

## Implementation status (2026-05-23)

**Migrated to scannerless (9 of 11):**

| Schema                  | Status     | Note                                        |
| ----------------------- | ---------- | ------------------------------------------- |
| `mac`                   | ✅ green   | 2.5× faster than tokenized                  |
| `arn`                   | ✅ green   | 3.5× faster                                 |
| `log`                   | ✅ green   | comparable                                  |
| `cron`                  | ✅ green   |                                             |
| `url`                   | ✅ green   |                                             |
| `proto`                 | ✅ green   |                                             |
| `css-color`             | ✅ green   | ~48× faster on validate path                |
| `css-length-percentage` | ✅ green   |                                             |
| `css`                   | ✅ green   | parse:5KB ~38000 ops/s; parse:100KB ~2000 ops/s. Direct-fast wired into scannerless emit + raws-mode emit hardening (see below). |

**Blocked (kept on tokenized):**

| Schema   | Why                                                                                                                                                                                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `html`   | 28/29 tests pass under scannerless but perf is 100–300× slower than tokenized html (5 s on huge-page vs 35 ms). Two root causes: (a) `.recovers()` wrapper puts try/catch around every HtmlElement parse; (b) HtmlElement's 15+ productions have one "regular tag" fallback (no `.oneOf`) — most real input falls through to it and speculation hits every routed production on the way. Needs: recovery without per-parse try/catch, and a better way to fall-through to the generic-tag production. |
| `markdown` | Not attempted — work paused after html regression.                                                                                                                                                                                                                                                                                                |

**css migration details (2026-05-23, this session):**

Path taken: wire the existing `emit/direct-fast.ts` (already byte-based) into the scannerless emit chain. `emit/scannerless/index.ts` now calls `emitDirectFastPath(schema)` and routes `parse(input)` / `validate(input)` through it in fast mode — same dispatch pattern as the tokenized backend.

Direct-fast unlocks fast-mode performance (~38000 ops/s on parse:5KB, parity with tokenized). But direct-fast only emits fast-mode output (no `source`, no `raws`), so raws-mode parsing still goes through the generic scannerless emit. The previous session left 14 raws-mode `cases.test.ts` fixtures failing. This session fixed them via a series of targeted improvements to `emit/scannerless/parse.ts`:

- **Comment-omit in `.until()` captures** — port the tokenized `captureUntil` omit-list logic. Comments encountered during the scan are recorded; if a comment has whitespace on either side in the source, it's omitted from the captured slice. Affected `selector`, `value`, `params` captures.
- **`__consumedEnd` tracking** — production body now tracks a separate "last-consumed-byte" cursor distinct from `__off`. Optional spans, until spans, and repeats all update it correctly. This fixes `source.end.offset` and the `$.gap` / `$.tail` raws computations.
- **Empty-capture anchoring** — when a `.until()` captures nothing, `__lastCaptureStart` / `__lastCaptureEnd` snap to the end of the previous span (= entry `__off`, OR end of last leading comment if any). Matches tokenized's `state.ends[state.pos - 1]` anchor and makes `afterName: ''` / `between: ' '` raws semantics work for atrules without params.
- **Inter-span ws+comments skip** — when the next span is a literal or class, the inter-span skip walks both whitespace and comments. Optional spans that don't fire rewind `__off` to `__consumedEnd` so any comments stepped over remain visible to the parent's children loop.
- **Until rewinds `__off` to trim boundary** — the scan rewinds `__off` to `__lastNonWs` on exit so trailing whitespace and trailing comments stay available for the parent. Equivalent to tokenized's `state.pos`-rewind past trailing comment tokens.
- **Repeats `__consumedEnd` = `__prevEnd_<listVar>`** — for raws-mode productions whose last span is a repeats (Stylesheet root nodes), the body's `__consumedEnd` is the end of the last child, not `__off`. Lets `raws.after` compute correctly while `state.off` still ends at end-of-input (no spurious "unexpected trailing input").
- **Backslash-escape in `.until()`** — `\X` consumes both bytes and counts as significant content. Matches CSS escape semantics (e.g. `\;` is literal ';', not a stop).
- **`url(...)` raw-mode in `.until()`** — when the schema declares an ident class with the `css` refinement, the until-scan recognizes `url(` at depth 0 and consumes opaquely to the matching `)` (strings tracked, comments and brackets NOT recognized inside). Mirrors the existing CSS ident-tokenizer's url() branch and keeps an unterminated `/*` inside `url(...)` from greedily matching a far-away `*/`.

All 57 css tests pass. The 8 previously-migrated schemas also stay green (perf gates pass; size baselines were relocked because the new emit added bytes per production). Size baselines for css and the other 8 schemas were relocked to reflect the new emit.

**Compiler additions:**

- `GenerateOptions.scannerless?: boolean` + `--scannerless` CLI flag.
- `packages/compiler/src/emit/scannerless/` — new directory:
  - `index.ts` — top-level emitter, public API (parse/validate/stringify), validation runtime.
  - `runtime.ts` — minimal state + skipWs + ASCII predicates + speculation + source-frame helpers.
  - `scan-class.ts` — inline class scanners (ident html/css/js, number, hex, string, comment) with `needsValue` flag to skip slice allocation in validate mode.
  - `parse.ts` — production emit. Hoists `state.off`, `state.input`, `state.input.length` into function-scope locals. Dispatch strategies: shared-prefix-then-literal-discriminator, shared-prefix-then-class-oneOf-discriminator, group-by-first-byte-predicate, role-lookahead with .oneOf value match.

**What we learned:**

1. Hoisting state into locals + inlining skipWs is critical — without these, even simple schemas regress.
2. Speculation among >2 productions is unacceptable; lookahead dispatch must handle all common shapes (literal-discriminator, class-with-oneOf, ident-value-switch, byte-predicate-grouping).
3. `direct-fast.ts` exists for a reason: typical CSS/JSON/protobuf parsing benefits enormously from pattern-recognition fast paths even on top of scannerless emit. Removing it without an equivalent loses 100×.
4. HTML's recovery model (try/catch around every node) is too expensive for scannerless; needs codegen that compiles recovery into the dispatch path rather than wrapping every parse call.

**Recommended next steps (in priority order):**

1. Port `emit/direct-fast.ts`'s pattern detection to recognize the same shapes in scannerless mode. Or: identify the missing optimization in generic scannerless emit that matches it (likely a tighter inner-loop layout for nested-block parsing).
2. Address html's recovery overhead. One option: move recovery decision into the parent dispatcher (after a failed valid attempt, try recovery productions inline) — no try/catch around the hot path.
3. Add multi-prod dispatch for the "regular fallback" case in HtmlElement — when there are 15 .oneOf-discriminated productions plus one fallback, the fallback should not require speculating through the others.
