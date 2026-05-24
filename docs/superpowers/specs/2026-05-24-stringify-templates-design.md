# Stringify Templates — design

Status: design draft, awaiting approval. Author: Claude (Opus 4.7).
Companion stream: Markdown schema restructure (Stream B, separate spec).

## Goal

Let a schema describe not only how an input language parses into a Structure,
but also how a Structure renders back out as one of several named output
targets. The contract becomes:

```txt
examples + structure + per-target templates  ->  compiler  ->  parse + stringify + render
```

A parser today produces a Structure. A parser under this design also produces
strings — one per author-registered target — without leaving the closed,
statically-analyzable schema DSL and without teaching the compiler any
domain knowledge.

Concrete first user: `@parser2/markdown`. Targets in scope:

- `'source'` — auto-derived. Default round-trip identity (canonical).
- `'html'` — author-written. Demonstrates the feature end-to-end.

## Motivation

Two motivations stack:

1. **Symmetric API.** Each example already pairs `(input string, structure)`.
   The inverse — `structure -> input string` — is mechanically derivable from
   the same data. `stringify` is currently a placeholder that throws
   (`packages/compiler/README.md:198`); `SESSION-STATUS.md` notes it as
   "derivable from schema spans + structure for most cases."
2. **Performance.** Many real callers want `input -> output-string` (e.g.
   `markdown -> html`) and never need the Structure as an addressable object.
   The current pipeline forces structure allocation in between, which the
   scannerless work measured as ~22% of parse time on real input
   (`docs/scannerless-emit-v2.md`). A fused single-pass `render(input,
   target)` codepath eliminates that allocation entirely.

## Design rules

These are non-negotiable.

1. **Domainless compiler stays domainless.** Target names (`'html'`, `'json'`,
   `'source'`) are opaque keys to the compiler — exactly like `as('Heading')`
   is an author-chosen identifier. The compiler MUST NOT branch on target
   names to choose codegen behavior. Forbidden: `if (target === 'html')
   emitHtmlEscapes(...)`. Allowed: walking the schema-declared template's
   `parts`/`slots` array and emitting the same string-concat for every target.
2. **No arbitrary JavaScript in templates.** Template values are plain data
   (literal parts + slot reference objects). Same invariant
   `.structure({...})` already relies on; templates inherit it.
3. **Schema authors describe; the compiler emits.** No template interpreter
   ships in the runtime. Every template compiles to straight-line
   `out.push(...)` calls baked into the generated parser.
4. **YAGNI on escape semantics for v1.** The current markdown schema's
   captures are `.ident().css()`-constrained, so raw interpolation is safe.
   Escape primitives are deferred until Stream B's `.until(...)`-based
   captures force the design call.

## Out of scope

- Conditional template primitives. Presence/absence variations are expressed
  by splitting into multi-productions (already the project convention for
  CSS `AtRule` statement-vs-block and HTML `Attribute` quoted-variants).
- Escape / encoding helpers (`html`, `attr`, `url`). Deferred to Stream B.
- Explicit list separators inside a single slot (`${$.children.join('\n')}`).
  Authors emit trailing separators inside child templates instead.
- Multi-target chaining (`render` then re-`render`).
- Markdown schema restructure for recursive inline content (`# **bold**`).
  Owned by Stream B.
- `app-rules-fixture.md` as the comparison fixture. Owned by Stream B; v1
  benches use the existing `test/fixtures/release-notes.md`.

## DSL surface

The example builder gains one method:

```ts
.stringify(target: string, template: Template): this
```

`target` is an opaque string. The key `'source'` is reserved — every example
implicitly gets a compiler-synthesized source template; authors don't write
one.

Templates are constructed with a tagged-template helper `tpl` exported from
`@parser2/parser`, together with the existing `$` sentinel:

```ts
import { defineSchema, ex, $, tpl } from '@parser2/parser';

ex('## Installation guide')
  .as('MarkdownLeaf')
  .span('##')
  .span('first', 'Installation').ident().css()
  .span('second', 'guide').ident().css()
  .structure({ type: 'heading', depth: 2, text: [$.first, $.second] })
  .stringify('html', tpl`<h2>${$.first} ${$.second}</h2>`)
  .build()
```

### Slot vocabulary (closed)

| Slot | Meaning |
|---|---|
| `${$.name}` | Interpolate the captured value. Primitive (string/number) → as-is. Recursive child node → recurse with the same target. List capture from `.repeats(...)` → recurse each child, join with the empty string. Missing optional span → empty string. |

That is the entire vocabulary for v1. The closed shape is what lets the
compiler emit straight-line concat with no runtime interpretation.

Anything else — conditionals, `.map(...)`, arbitrary JS expressions inside
`${...}` — is rejected by the inference pass with a pointer to the
multi-production pattern.

### How `tpl` works

`tpl` is a tagged-template tag. JavaScript evaluates the template literal at
schema-load time and calls `tpl(strings, ...values)`. The static segments
arrive as `strings`; the `${...}` values arrive as `values`. With sentinels:

```ts
tpl`<h${$.depth}>${$.text}</h${$.depth}>`
// JS evaluates to:
tpl(
  ['<h', '>', '</h', '>'],
  /* $.depth */ { __ref: 'depth' },
  /* $.text  */ { __ref: 'text'  },
  /* $.depth */ { __ref: 'depth' },
)
// tpl returns:
{
  parts: ['<h', '>', '</h', '>'],
  slots: [
    { kind: 'capture', ref: 'depth' },
    { kind: 'capture', ref: 'text'  },
    { kind: 'capture', ref: 'depth' },
  ],
}
```

That object is attached to the example. No JS execution is required at parse
or render time — the compiler walks `parts`/`slots` at codegen and bakes
them into generated code.

`$` is the existing Proxy from `packages/parser/src/ref.ts`. No change to its
shape — templates reuse the same `__ref` sentinels that structure literals
already use.

## Schema model additions

`InferredSchema.productions[i]` gains a new field:

```ts
stringifyTemplates: ReadonlyArray<{
  target: string;            // opaque, e.g. 'html', 'source'
  parts: ReadonlyArray<string>;        // length = slots.length + 1
  slots: ReadonlyArray<TemplateSlot>;
}>;

type TemplateSlot = { kind: 'capture'; ref: string };
```

The `'source'` template is synthesized by a compiler pass per example; it is
never absent. Author-written entries (e.g. `'html'`) sit alongside it.

### Validation

Extend `infer/validate.ts`:

- Every `slot.ref` must match a span `name` declared in the same example.
- A `(production, target)` pair must be unique — two `.stringify('html', ...)`
  calls on the same example is an authoring error.
- The reserved key `'source'` cannot be passed to `.stringify(...)`; attempts
  fail at inference time with a clear message.

## Compiler passes

New / modified files in `packages/compiler/src/`:

| File | Purpose |
|---|---|
| `infer/templates.ts` | New. Walks each example, decomposes its `.stringify(...)` calls into `{ parts, slots }`, attaches to the production. |
| `infer/source-template.ts` | New. Synthesizes the `'source'` template per example from the span sequence + the schema's `whitespace` policy. |
| `infer/validate.ts` | Extended. Slot-ref resolution; uniqueness; reserved-target check. |
| `emit/stringify.ts` | New. Emits two-pass `stringify(structure, opts)` walker per `(NodeType, target)` pair. |
| `emit/render.ts` | New. Emits fused `render(input, opts)` per `(production, target)` pair, sharing the parse body but routing captures into a string buffer instead of a Structure object. |
| `emit/index.ts` | Extended. Composes the new stringify + render emitters into the generated parser file. |

### Source template synthesis

Given an example's span list and the schema's `whitespace` policy, the
`'source'` template is built mechanically:

- A literal span (`span('-')`) contributes its literal text to `parts`.
- A named literal (`span('label', 'hello')`) contributes a `{kind:'capture',
  ref:'label'}` slot.
- A classed span (`.ident().css()`, `.number().int()`) contributes a capture
  slot with the captured value (string for ident, number→string for number,
  etc.). The classed span's raw source text is what the slot interpolates.
- A `.until(...)` span contributes a capture slot.
- A recursive span (single-role or multi-role) contributes a capture slot.
  At render time the recursion handles the child.
- A `.repeats(...)` span contributes a capture slot whose runtime
  interpolation is "render each child with same target, join with empty
  string."

Inter-span whitespace is inserted per the schema's `whitespace` policy. For
`'standard'` (the default) we emit a single space between adjacent spans
where the original example had whitespace. For `'preserve'` (declared in
the DSL but not yet wired) the policy uses the raw whitespace from the
example input.

The synthesis is generic — same algorithm runs for every schema, no
per-language knowledge.

## Codegen — two-pass `stringify`

Generated parser exports:

```ts
export function stringify(
  structure: unknown,
  options?: { target?: string },
): string;
```

Default `target: 'source'`.

For each `(NodeType, target)` pair, emit one function:

```ts
function stringify_Heading_html(structure: any): string {
  // multi-production dispatch (by structure.type / shape match)
  // … pick the right template for this production
  // walk parts / slots, fill slots, concat
  return parts[0] + slot0(structure) + parts[1] + slot1(structure) + parts[2];
}
```

Slot resolution:

- `{kind:'capture', ref:'name'}` → look up `structure[name]` using the
  schema's `.structure({...})` literal as the map.
- If the value is itself a Structure (recursive child) → recurse:
  `stringify(value, { target })`.
- If the value is an array (from `.repeats(...)`) → map+join with `''`:
  `value.map((v) => stringify(v, { target })).join('')`.
- If the value is `null` / `undefined` (absent optional) → `''`.

Public `stringify(s, opts?)` dispatches on `s.type` to find the right
NodeType, then on **structure shape** to find the right production. This
discrimination is distinct from the parser's input-byte dispatch: the
compiler derives, per NodeType, a small decision tree over the
distinguishing fields among productions' `.structure({...})` literals
(presence of a field, value of a literal field, etc.). For the markdown
schema this is trivial because every production has a unique `type:`
value; for schemas with structurally-similar productions (CSS `AtRule`
statement-form vs block-form, distinguished by the presence of `nodes`),
the compiler emits the obvious field-presence check.

## Codegen — fused `render`

Generated parser exports:

```ts
export function render(
  input: string,
  options?: { target?: string; mode?: 'fast' | 'raws' },
): string;
```

Default `target: 'source'`. `mode` affects only the auto-derived `'source'`
target: in `'fast'` mode the synthesized template emits canonical
whitespace per the schema's `whitespace` policy; in `'raws'` mode the
template uses the captured `raws.before` / `raws.between` / `raws.after`
slices to reproduce inter-span whitespace byte-for-byte. Author-written
targets (`'html'`, …) ignore `mode` — their templates only reference span
captures, never raws metadata.

The fused path generates a parallel set of production bodies per
`(production, target)`. Each render-flavour body shares the parse body's
scanning/skip/dispatch logic but replaces the closing structure-literal with
template-driven `out.push(...)` calls:

```js
// parse-flavour (today)
function parseMarkdownLeaf__alt0_valid(state) {
  consume(state, '#');
  const first = scanIdent(state);
  skipWs(state);
  const second = scanIdent(state);
  return { type: 'heading', depth: 1, text: [first, second] };
}

// render-flavour 'html' (new)
function renderMarkdownLeaf__alt0_html(state, out) {
  consume(state, '#');
  const first = scanIdent(state);
  skipWs(state);
  const second = scanIdent(state);
  out.push('<h1>', first, ' ', second, '</h1>');
}
```

Recursive children: the render functions take the same `out: string[]` and
recurse into child render functions with that buffer threaded through. No
intermediate string allocation per child.

Public `render(input, opts?)`:

```ts
export function render(input, options) {
  const target = options?.target ?? 'source';
  const state = makeState(input, options);
  const out = [];
  dispatchRoot_render(state, out, target);
  return out.join('');
}
```

`dispatchRoot_render` switches on `target` once at entry (zero per-node
overhead) and routes to the right render function tree.

### Render dispatch sharing

For schemas with N targets, the naive emit gives N × productions render
functions. We mitigate by:

- The parse body's scanning logic stays in one helper (already factored by
  the scannerless emit). Each render-flavour body reuses that helper and
  only carries the target-specific `out.push(...)` tail.
- Targets whose template happens to be identical (e.g. two targets that
  both emit the source canonically) share one body.

Bundle-size impact must stay within the size gate's tolerance; relock if
the additive cost is intentional.

### Validate mode

`render(input)` with no target argument defaults to `'source'`. That is the
canonical round-trip:

```
render(input) === input  (canonically, modulo whitespace policy)
```

For byte-identical round-trip with raws-mode whitespace, `render(input, {
mode: 'raws' })` uses the `raws.before`/`between`/`after` fields the parse
body already captures in raws mode.

## Generated runtime additions

None. Templates compile away to literal `out.push(...)` calls. The only new
runtime cost is the small `out: string[]` allocated per `render(...)` call
and the trailing `out.join('')`.

## Markdown schema updates

`packages/markdown/src/schema.ts` gets a `.stringify('html', tpl`...`)` call
per example. ~35 templates. No grammar changes; no `.structure(...)` changes.

Auto-derived `'source'` template requires no per-example authoring.

Each `.stringify('html', ...)` template is constrained to whatever the
current schema captures. For the placeholder two-ident-word headings, the
template just emits `<h${depth}>${first} ${second}</h${depth}>`. Real inline
nesting (`# **bold** title`) needs Stream B's restructure; until then the
fixture corpus stays schema-friendly.

Example mapping for the existing examples:

| Example shape | `html` template |
|---|---|
| `# Release notes` | `<h1>${$.first} ${$.second}</h1>` |
| `Plain paragraph` | `<p>${$.first} ${$.second}</p>` |
| `- first item` | `<li>${$.first} ${$.second}</li>` |
| `1. ordered item` | `<li>${$.first} ${$.second}</li>` |
| `**bold**` | `<strong>${$.value}</strong>` |
| `*italic*` | `<em>${$.value}</em>` |
| `\`code\`` | `<code>${$.value}</code>` |
| `[docs](https://example.com)` | `<a href="${$.scheme}://${$.host}.${$.tld}">${$.label}</a>` |
| `---` | `<hr>` |
| `> quoted text` | `<blockquote>${$.first} ${$.second}</blockquote>` |
| (etc.) | (etc.) |

The full list lands in the implementation; the spec only commits to the
shape of the entries.

## Tests

| File | What it asserts |
|---|---|
| `packages/compiler/test/templates.test.ts` | `tpl` decomposes correctly into `parts`/`slots`. Source template auto-derives from spans. Validate pass catches unresolved refs, duplicate targets, reserved-key misuse. |
| `packages/markdown/test/render-html.test.ts` | Per-example, `render(example.input, { target: 'html' })` equals a co-located expected HTML literal (table-driven). |
| `packages/markdown/test/round-trip.test.ts` | Per-example, `render(example.input, { target: 'source' }) === example.input` (canonical). |
| `packages/markdown/test/stringify-parity.test.ts` | For each example and each target, `stringify(parse(input), { target })` === `render(input, { target })`. Ensures the two codepaths agree. |
| `packages/markdown/test/markdown.test.ts` | Existing parse-only tests stay green; render is additive, parse path must not regress. |

The parity test is the load-bearing one — it pins both codepaths to the same
template, so authoring drift is impossible.

## Perf gates

`packages/markdown/package.json` gains:

- `bench:render` — `parser2 render(md, 'html')` vs markdown-it `.render()`
  vs marked `.parse()` (string output). Uses
  `packages/markdown/test/fixtures/release-notes.md` as the corpus, sized
  via the shared `scripts/bench-table.ts` harness.
- `perf-baseline.json` adds rows for `render:5KB`, `render:50KB`, etc.,
  matching the existing parse-bench cadence.
- Existing `bench:ast` and parse perf gates must stay green. Render is
  additive.

`size-baseline.json` is relocked once after the new exports + render bodies
land. The relock is reviewed against the new generated parser size.

Stream B reuses these scripts, swapping in `app-rules-fixture.md` once the
restructured schema can parse it.

## Migration plan

This work stream affects three packages: `@parser2/parser` (new `tpl`
export), `@parser2/compiler` (new inference + emit), `@parser2/markdown`
(new template authoring + tests + benches). Order:

1. Add `tpl` helper + `Template` type to `@parser2/parser`. Unit tests for
   tag-call semantics.
2. Add `infer/templates.ts` + `infer/source-template.ts` to the compiler.
   Validate-pass extensions. Compiler unit tests.
3. Add `emit/stringify.ts` (two-pass). Smallest existing schema (e.g.
   `@parser2/log` or `@parser2/mac`) gets one author-written target to
   prove the surface end-to-end.
4. Add `emit/render.ts` (fused). Same small schema validates parity with
   `stringify`.
5. Roll to `@parser2/markdown`. Author `'html'` templates for all 35
   examples. Land tests + perf bench + relocked size baseline.
6. Confirm the ten other workspace schemas (`mac`, `arn`, `log`, `cron`,
   `url`, `proto`, `css-color`, `css-length-percentage`, `css`, `html`)
   still pass their existing perf + size gates with the new codegen
   surface (no `'html'` template required — the auto-derived `'source'`
   target is the only addition).

Steps 3 and 4 are independent — `emit/stringify.ts` and `emit/render.ts`
are separate emit modules with no shared state. They can land in parallel
after step 2.

Each step is independently verifiable. Step 5 is the user-visible
deliverable for this stream.

## Risks and what to do if they hit

1. **Render-flavour bodies inflate bundle size.** For schemas with many
   productions × targets, the additive cost compounds. If markdown's size
   gate jumps more than ~25%, look at sharing scan helpers across render
   functions (factor out the parsing prefix; only the template tail
   diverges).
2. **Parse perf regresses despite render being additive.** Possible if the
   render-flavour body's emission shares state with the parse body in a way
   that adds parse-time work. The mitigation is the parity test plus
   running the parse-only perf gate before relocking. If parse drops below
   the existing baseline, the render path is wrong.
3. **Two-pass stringify and fused render disagree.** Caught by the parity
   test; almost certainly a template-decomposition bug in the inference
   pass.
4. **Auto-derived `'source'` doesn't round-trip canonically for some
   example.** The synthesis algorithm is generic; if an example doesn't
   round-trip, either the algorithm has a gap (fix in
   `infer/source-template.ts`) or the schema's `whitespace` policy is
   ambiguous (document expected canonical form).
5. **`tpl` tag evaluates `${...}` eagerly with non-sentinel values.** If an
   author writes `tpl`prefix ${someVariable} suffix`` where `someVariable`
   isn't a sentinel, the tag gets a raw value and silently inlines it. We
   detect this at inference time by checking every slot value is a known
   sentinel shape; reject otherwise.
6. **Round-trip loses inter-block whitespace.** Markdown's
   `MarkdownDocument` uses `.repeats({ min: 0 })` over `MarkdownLeaf`
   children. The default `whitespace: 'standard'` policy treats inter-span
   whitespace as ignorable, so the synthesized `'source'` template joins
   children with a canonical separator that may not match the original
   input's blank lines. For byte-identical round-trip the caller uses
   `mode: 'raws'`; canonical round-trip is the contract in `mode: 'fast'`.
   If markdown needs preserve-mode whitespace as a default, that's a
   separate dependency on the long-declared-but-unwired `whitespace:
   'preserve'` policy (per `packages/compiler/README.md`) and lands in
   Stream B with the schema restructure.

## Acceptance criteria

1. `@parser2/parser` exports `tpl` and a `Template` type.
2. `npm run generate` produces parsers with `stringify` and `render`
   exports for every schema.
3. `npm test` passes across the workspace including the new markdown render
   + round-trip + parity tests.
4. `npm run gate -w @parser2/markdown` passes (perf + size). Size baseline
   relock reviewed in the PR diff.
5. The other eight migrated schemas pass their existing gates without
   re-locking parse perf baselines.
6. `npm run audit:parser-contract` passes. `packages/markdown/src/index.ts`
   stays a pure re-export from `_generated/parser.ts`; the new exports
   come from the generated file.
7. The compiler contains zero branches on target names. A grep for
   `target === 'html'` (or similar) in `packages/compiler/src/` returns
   zero hits.

## Approval checkpoint

Before implementation begins, approve:

1. Slot vocabulary limited to `${$.name}` for v1 (no escape primitives).
2. `'source'` target is reserved and auto-derived.
3. Both two-pass `stringify` and fused `render` are in scope for Stream A.
4. Migration order: parser → compiler inference → compiler emit (stringify
   then render) → markdown templates → re-verify other schemas.
5. Markdown grammar restructure is Stream B; `app-rules-fixture.md` is its
   bench target, not Stream A's.
