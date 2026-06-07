# @parser2/compiler

The compiler turns parser-package schemas into generated, per-schema parser
modules. The project rule is one line:

```txt
examples + target structure  ->  compiler inference  ->  optimized generated parser
```

This document is the reference for compiler architecture, the codegen contract,
generic primitive vocabulary, and performance guarantees. For the schema author
DSL — how to write examples, declare operators, compose schemas — see
[`../../docs/example-first-structure-dsl.md`](../../docs/example-first-structure-dsl.md).

## Architecture invariants

These are non-negotiable. Any change that violates one is rejected at code
review.

### Zero-Tolerance Reminder

1. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
2. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
3. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
4. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
5. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
6. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
7. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
8. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
9. The parser is ONLY the schema. The parser re-exports the codegen file.
   The compiler is domainless.
10. The parser is ONLY the schema. The parser re-exports the codegen file.
    The compiler is domainless.

Do not add handwritten parser, renderer, validator, scanner, tokenizer, or
semantic fallback code to a parser package. Performance work belongs in
generic compiler codegen, inferred from schema data and reusable structural
patterns.

### 1. The Compiler Is Domainless

Strict requirement:

**All parser behavior MUST be inferred from schema examples and generic schema
configuration. The compiler MUST NOT choose parser behavior from a domain,
package, or schema name.**

The compiler contains zero knowledge of CSS, HTML, JavaScript, JSON, Markdown,
URLs, ARNs, cron expressions, protobuf, logs, or any other specific language.
There are no branches on package names, no JS-specific emitters, no
HTML-specific emitters, no CSS-specific fallbacks, no per-language templates.

Everything the compiler emits is inferred from schema data — examples,
operators, punctuators, whitespace policy, recovery declarations — through a
small set of generic, reusable primitives.

The compiler may use `schema.rootSchemaName` only for generated comments,
module identity metadata, and output paths. It MUST NOT use schema/package
names to select parsing logic.

Forbidden:

```ts
if (schema.rootSchemaName === 'html') return emitHtmlParser(schema)
if (schema.name === 'css') emitCssSpecificScanner(...)
switch (packageName) { case 'url': ... }
```

Allowed:

```ts
if (isGenericNestedBlockShape(schema)) emitNestedBlockFastPath(schema)
if (span.modifiers.some((m) => m.kind === 'until')) emitUntilCapture(span)
if (commentRefinement.block) emitGenericBlockCommentScanner(open, close)
```

The compiler is allowed to recognize **generic structural patterns** in that
schema data and emit faster code for them. For example, a repeated nested
block body with pair-like children can compile to a direct character scanner
instead of the normal token stream parser. That optimization is still
domainless: it is triggered by the schema shape, literals, span modifiers, and
structure fields, never by a package name such as `css`.

If a language feature cannot be expressed today:

1. Add more examples.
2. If examples still can't express it, see if a generic primitive could be
   added under the admission policy below.
3. Never add a language-specific emitter (`html-emitter`,
   `ecmascript-emitter`, `css-block-emitter`, etc.).

### 2. Parser packages describe; they do not implement

A parser package owns its `src/schema.ts`, `src/index.ts`, and tests. Its
`src/index.ts` should only re-export the generated parser module:

```ts
export * from './_generated/parser.ts';
```

It never ships:

- A parser template
- A handwritten parser implementation
- A fallback to an external parser library at runtime
- Package-local codegen
- Package-local validation, typed-value parsing, or semantic sidecars

Standalone value packages follow the same rule. If a package is named after
a value type, its `validate(input)` export must be the generated validator
for that package's generic schema. It must not be a handwritten scanner in
`src/index.ts`, even as a performance optimization. If `validate()` is too
slow, fix the compiler's generic `validate()` codegen so every schema
benefits.

The generated parser at `src/_generated/parser.ts` is the only runtime parser
code in the package. Package-level composition may wire generated parsers
together, but that wiring must not teach the compiler domain concepts such as
CSS property names or CSS color parser names.

### 3. The runtime ships no parser library

Generated parsers have no shared runtime dependency that interprets schema
data at parse time. Each generated parser is a self-contained TypeScript file
with inlined character predicates, baked tables, and straight-line control
flow. The compiler produces specialized code; the runtime executes it.

### 4. Structure ≠ AST

`parse()` returns a *Structure*, whose shape is defined by the examples'
`.structure({...})` literals. A schema can produce a full AST, a partial
extractor, a metrics object, a list of spans, a normalized object, or any
custom shape. The compiler imposes no AST convention.

## Generated contract

Each generated parser is written to:

```txt
packages/<schema>/src/_generated/parser.ts
```

It exports:

```ts
render(input: string, options?: {
  type?: string
  mode?: 'fast' | 'raws'
}): unknown
stringify(value: unknown, options?: {
  type?: string
}): string
validate(input: string, options?: {
  mode?: 'fast' | 'raws'
}): void
tokenize(input: string): Token[]
countTokens(input: string): number
```

`render(input, {type})` dispatches the input to the schema-declared target's
builder (one of `'ast'`, `'source'`, or any author-declared target like
`'html'`). When `type` is omitted, the schema's `defaultTarget` is used;
missing both throws "render: missing target". `mode: 'fast'` (default) emits
without formatting metadata; `mode: 'raws'` keeps source positions for
callers that need formatting fidelity. `parse()` is no longer exported —
declare `.render('ast', {...})` on the schema and call `render(input,
{type:'ast'})` to get the AST view.

`stringify(value, {type})` is the inverse: it takes a value produced by
`render(input, {type:T})` and reconstructs the source. Per spec rule 5,
round-trip is value-stable not byte-stable.

`validate()` is the non-materializing sibling: it accepts the same
language, throws on invalid input, and returns nothing on success. It is still
domainless. A package named `@sx/color` may export a generic `validate()`, but
the compiler must not emit API names like `validateCssColor` from schema data.
That `validate()` must be emitted from the schema by codegen; package facades
must not replace it with handwritten domain-specific validation logic.

`Token[]` is derived from the schema's spans and declarations; it is
intentionally minimal (`type`, `value`, optional position).

Generated parsers never re-export schema data, runtime helpers, or compiler
internals.

## Generic primitive vocabulary

The compiler ships a closed set of generic primitives. These are the only
shortcuts available to schemas. They are *generic*: each primitive maps to a
pattern that recurs across many languages, not to a single language's
construct.

### Closed lists currently supported

- **Span classes**: `literal`, `ident`, `number`, `string`, `hex`, `regex`,
  `template`, `comment`, `whitespace`, `operator`.
- **Refinements**: scoped per class (e.g. `int`, `float`, `bigint`, `binary`,
  `octal`, `hex`, `scientific`, `separator` under `number`; `singleQuoted`,
  `doubleQuoted`, `backtick`, `hexString`, `urlString` under `string`; `css`,
  `js` under `ident`; `line`, `block` under `comment`).
- **Modifiers**: `optional`, `repeats`, `until`, `noLineTerminatorAfter`,
  `noWhitespaceAfter`, `requireSpaceAfter`.
- **Schema declarations**: `operators` (layered), `punctuators` (array form
  or named-object map), `tokens` (extra classes the tokenizer must scan
  beyond what spans use directly), `whitespace` (policy enum),
  `uses` (explicit acyclic composition).
- **Span recursion**: single role (`'Expression'`) or multi-role
  (`['Rule', 'AtRule']` — tried in order at parse time).
- **Status markers**: valid (default), `recovers`, `rejects`.
- **Auto-attached on every node**: `source: { start, end }` with `{ line,
  column, offset }` sub-positions, computed from tokens' offsets and a
  per-parse line-start index.

Currently implemented vs in-progress:

| Capability | Status |
|---|---|
| Span classes / refinements / modifiers above | implemented |
| `.until()` with balanced bracket tracking | implemented |
| Named punctuators, multi-char longest-match | implemented |
| `tokens` declarations | implemented |
| Multi-role spans | implemented |
| Multi-production node types (speculative dispatch) | implemented (byte-prefix + speculation chain; no global lookahead yet) |
| Source positions auto-attach | implemented |
| `whitespace: 'preserve'` policy | not yet implemented (Phase 4) |
| `raws` capture (PostCSS-style formatting) | partial (per-node `source` field in raws mode; PostCSS-style sidecar with interleaved trivia for byte-exact round-trip on unmodified subtrees is Phase 4) |
| `.recovers()` policy IR | inferred (production carries `recovery: RecoveryPolicy`); codegen + diagnostic API are Phase 4 |
| `render` / `stringify` per-target dispatch | implemented (unified `.render(target, body)` API + per-target TS overloads) |
| Inverse derivation per (production, target) | implemented |
| Inferred TS types per (NodeType, target) | implemented (Phase 3; emitted as type aliases + `render`/`stringify` overloads) |
| Pratt operator parsing | implemented (Phase 5b-5h): binary-operator detection, paren-aware inverse, interp parity, right-associativity per layer, unary prefix operators with scoped alts, parens-as-primary via transparent-passthrough detection |
| DSL sugar (`litEnum`) | implemented (Phase 7) |

These are detailed in the [DSL spec](../../docs/example-first-structure-dsl.md).

### Admission policy for new primitives

A new generic primitive (class, refinement, or modifier) may be added when
**both** of these hold:

1. **Genericity** — the primitive describes a pattern that recurs across
   languages, not a language-specific construct.
2. **One of**:
   - **Workload reduction** — without it, schemas would need to enumerate
     many duplicate examples to express a single shape, OR
   - **Performance win** — it unlocks measurably faster generated code (e.g. a
     baked character-class table vs. an open generalization).

What does **not** qualify:

- `jsxElement`, `cssAtRule`, `tsTypeAnnotation` — language-specific shapes.
  These belong in examples in the relevant schema, never in the primitive
  vocabulary.
- `mySchemaIdent` — author-specific shortcuts. Express through examples.
- "More flexibility" — flexibility is not a goal; reductive vocabulary that
  compiles to fast straight-line code is the goal.

What is likely to be added later:

- Additional `number` refinements as edge cases surface
  (e.g. an explicit `unsigned` or a `radix(n)` form)
- A small set of common comment shapes if more languages get added
- A `unicodeIdent` refinement variant

The principle: the vocabulary grows, but **only with generic primitives that
the compiler can compile to fast straight-line code.**

## Compiler flow

Run generation from the repository root:

```sh
npm run generate
```

Or per package:

```sh
npm run generate -w @parser2/cron
```

The CLI path (current implementation, `packages/compiler/src/`):

```txt
cli.ts
  load schema file
    -> infer/composition.ts    resolveCompositionGraph(schema)
    -> infer/productions.ts    buildProductions(schemas)
    -> infer/roles.ts          resolveRecursiveRoles(nodeTypes, rootType)
    -> infer/validate.ts       validate(nodeTypes)
    -> infer/tokenizer.ts      buildTokenizerProgram(schemas, nodeTypes)
    -> emit/index.ts           emitParser(inferredSchema)
                               (composes tokenize.ts, parse.ts, structure.ts,
                                runtime.ts)
  write src/_generated/parser.ts
```

Each pass is generic and operates on inferred schema data only.

1. **`resolveCompositionGraph`** — walks `uses:` declarations transitively to
   produce the full set of schemas in dependency order. The `uses:` graph must
   be acyclic; mutual recursion between node types is expressed within a
   single schema (multiple `.as()` examples in the same `defineSchema(...)`).
   Cycles in `uses:` and duplicate schema names are errors.
2. **`buildProductions`** — for each `.as(NodeType)`, collects the example
   spans into a per-node-type production. A node type can have multiple
   productions (used by e.g. CSS `AtRule` for statement vs. block form). Spans
   carry the recursive-role list (single or multi).
3. **`resolveRecursiveRoles`** — every recursive span's role list is checked
   against the node-type set. Unresolved references are errors.
4. **`validate`** — checks span text uniqueness within each example
   (the "use distinct identifiers" rule), no missing recursive role refs,
   no obvious authoring mistakes.
5. **`buildTokenizerProgram`** — collects the literal-to-type mapping from
   schemas' `punctuators` decls + literal spans + `repeats({sep})` separators
   + operators, sorted longest-first. Collects class usages from `tokens`
   decls + classed spans, with refinements unioned per class.
6. **`emitParser`** — produces the per-schema TypeScript parser file. Composed
   of: an inline tokenizer (`emit/tokenize.ts`), tiny inlined runtime helpers
   (`emit/runtime.ts`), per-node parser functions (`emit/parse.ts`), and the
   `parse`/`tokenize`/`stringify` exports.

Implemented in 2026-06-06 (roadmap Phase 3):

- **`inferStructureTypes`** (`infer/structure-types.ts`) — derives a
  TypeScript type per `(NodeType, target)` pair from the union of
  `.render(target, body)` shapes across that node's productions. Capture
  types follow the closed class+refinement+modifier vocabulary:
  `.number()` → `string`, `.number().coerce()` → `number`, `.ident()` →
  `string`, `.of('NodeType')` → that node's inferred type, `.of('A','B')`
  → `A | B`, `.optional()` → `T | null`, `.repeats()` → `T[]`,
  `.until([...])` → `string`. The result is emitted as `export type
  <NodeType>_<target>` aliases at the top of every generated parser plus
  per-target `render` / `stringify` function overloads.

Phase 5 — Pratt operator parsing (`emit/v2/pratt.ts`, `interp/parse.ts`):

- **`detectBinaryProductions`** (`infer/binary-operators.ts`) — recognizes
  productions of shape `[recursive(self), operator, recursive(self)]`.
- **`detectUnaryProductions`** (`infer/unary-operators.ts`) — recognizes
  productions of shape `[operator(alts), recursive(self)]`; the `alts`
  list scopes which operators are valid in unary position.
- **`detectTransparentPassthroughs`** (`infer/transparent-passthrough.ts`)
  — recognizes wrapper productions whose `ast` body is just `$.inner`
  recursing into the same node type (e.g. `(expr)`). These are
  forward-only — the inverse path skips them, and the paren-aware
  stringify emits parens by precedence rules.
- **Forward Pratt** emit: `parse<NodeType>__primary` (speculation over
  non-binary, non-unary alts; leads with unary scan when applicable) +
  `parse<NodeType>__pratt(state, minPrec)` (climbing loop with
  per-operator precedence and per-layer associativity).
- **Inverse Pratt** emit: paren-aware binary inverter (`__leftMinPrec` /
  `__rightMinPrec` swap for right-assoc) + paren-aware unary inverter
  (operand minPrec = `numLayers` so any binary child gets wrapped).

The same logic mirrored in `interp/parse.ts` so `checkRoundTrip` +
differential fuzz gate on `interp ≡ v2` parity (835+ random
expressions verified in `test/pratt-fuzz.test.ts`).

Every implemented pass is unit-testable in isolation and consumes only
inferred schema data — never raw schema source.

### The inference model

The compiler treats every example as a production:

```txt
example input + spans + structure  ->  NodeType production
```

The example input demonstrates one concrete spelling. The span list explains
how to generalize that spelling:

- literal spans become exact token/literal matches;
- classed spans (`ident`, `string`, `comment`, etc.) become tokenizer class
  matches;
- `.until(...)` spans become opaque source captures with declared stop tokens;
- recursive spans become calls into other node-type productions;
- `.repeats(...)` recursive spans become child lists.

The structure literal explains what to construct after the production matches.
The compiler never assumes the structure is an AST; it only preserves the
shape the schema asks for.

Recursive role lists define *where* a node type may appear. A standalone
`Comment` example only defines how to parse a comment node. A parent span such
as `['Comment', 'Rule', 'Declaration']` is what allows comments to appear in
that parent's child list.

Token declarations define *what the tokenizer must recognize even when no
span at the current position explicitly consumes that class*. This matters for
`.until(...)` captures: if `comment` or `string` may appear inside an opaque
capture, the schema should declare that token class so the generated scanner
does not split it into unrelated punctuators.

## Generated parser shape & performance

The compiler's first-class output is **performance**. Each schema compiles to
a hand-written-quality recursive-descent parser specialized to its grammar.

### What the generated code looks like

| Concern | Current implementation | Future |
|---|---|---|
| **Control flow** | Straight-line code; each grammar production is its own function. Multi-production nodes dispatch via speculative try-each-in-order (`trySpeculate` / `tryRoles`). | First-token-lookahead dispatch when productions are disjoint. |
| **Character predicates** | Inlined integer-range checks (e.g. `(c >= 0x61 && c <= 0x7a) \|\| ...`). No regex. | — |
| **Keyword recognition** | Per-keyword `if (input.startsWith('keyword', i))` branches sorted longest-first. No `Map.get(name)`. | Switch on first char + length, for hotter dispatch. |
| **Punctuator recognition** | Single-char punctuators use direct char-code compare; multi-char use `startsWith`. Multi-char branches emitted BEFORE class scanners; class scanners emitted before single-char punctuators (so `/*` comment wins over `/` delim). | — |
| **Span captures** | Literal/classed spans capture the token's `value`. `.until()` captures a source slice via `input.slice(startOff, endOff)`. | Lazy capture for unused refs (skip the slice if structure doesn't use `$.name`). |
| **Source positions** | Each token carries `{ start, end }`. Each parsed node carries `source: { start: { line, column, offset }, end: { ... } }`, computed from first/last consumed tokens via a `lineStarts` index. | — |
| **Structure construction** | Object literals with field order from the structure literal. `source` field appended last. | Stable shape, monomorphic — discriminant `type` first for inline-cache friendliness. |
| **Recursion** | Statically resolved across `uses:` + in-schema node-type graph. Each node type becomes one or more functions; multi-production nodes get a dispatch wrapper. | Inlining cold rules at call sites where shape allows. |
| **Lookahead** | Bounded and explicit per case via `peekLiteral`. Where speculation is needed (multi-role spans, multi-production nodes), uses `trySpeculate` / `tryRoles` / `tryRolesOrNull` — these reset `state.pos` on failure. | Convert disjoint speculations into single-token switches. |
| **`.until()` capture** | Walks tokens tracking `() [] {}` depth; stops at depth-zero match against the stop set, OR at a closing bracket while at depth zero (the boundary of an enclosing block — stops without consuming). | — |
| **Direct fast paths** | Some schema shapes compile to direct character scanners for `mode: 'fast'`, bypassing token allocation while returning the same plain structure. These paths are inferred from generic nested-block / pair / prefixed-production patterns. | More shape families, e.g. line records and key/value lists. |

### Non-goals (runtime)

- No regex anywhere in the hot path.
- No runtime parser library imported by the generated parser.
- No runtime schema interpretation.
- No AST visitor framework.
- No backtracking parser combinator engine.
- No dynamic dispatch tables, no `Map`/`Set` lookups in the hot path.
- No package-specific runtime code; the generated file is the only runtime.

### Performance gates

Performance is enforced at CI level:

```sh
npm run bench        -w @parser2/<schema>
npm run perf:gate    -w @parser2/<schema>
npm run size:gate    -w @parser2/<schema>
```

- **Parser package benchmark contract** — every generated parser package must
  expose a package-level `bench` script plus named hot-path scripts such as
  `bench:parse`, `bench:tokenize`, or `bench:validate` as appropriate for that
  parser's public contract. Root `package.json` should expose matching
  `bench:<schema>:<path>` shortcuts for focused runs when a parser has a
  distinct hot path worth tracking.
- **`scripts/bench-table.ts`** — all human-readable benchmark entrypoints use
  the shared table harness for input sizing, input hashes, timing columns,
  units, and relative comparisons. Package-local `bench/common.ts` files may
  provide input generators, but must delegate table execution to this shared
  harness rather than creating their own `tinybench` loops.
- **`scripts/perf-gate.ts`** — measures ops/s for `tokenize`, `parse` (and
  optionally domain-specific runs) at fixed input sizes. Fails the build when
  the current ops/s drops below `baseline * (1 - tolerance)`. Baselines live
  at `packages/<schema>/bench/perf-baseline.json`.
- **`scripts/size-gate.ts`** — builds the browser bundle via esbuild and
  fails when bundle size or gzipped size exceeds
  `baseline * (1 + tolerance)`. Baselines live at
  `packages/<schema>/bench/size-baseline.json`.

A change that violates a gate either improves the implementation until the
gate passes, or — if the change is intentional and justified — re-runs
`baseline` to relock. Baseline changes are visible in PR diffs and are
reviewed.

This is a repo design requirement, not optional hygiene. A generated parser
package contains:

- `src/schema.ts` as the source of parser behavior.
- `src/_generated/parser.ts` as the generated runtime.
- `src/index.ts` as generated-symbol re-exports only; no package-local parser
  code, custom scanner helpers, wrappers, or custom functions.
- `test/*.test.ts` coverage for the generated public surface.
- `bench` entrypoints, `perf-baseline.json`, `size-baseline.json`, and a
  passing `gate` workflow.

Run `npm run audit:parser-contract` before merging parser-package changes.

## Recovery and tolerance

The compiler distinguishes three concerns:

| Concern | Where it lives | Compiler treatment |
|---|---|---|
| **Tolerance** | Span modifiers (`optional`, `repeats({ trailing: 'allowed' })`) | Compiled into the grammar; no diagnostic emitted. |
| **Recovery** | `.recovers({ syncAt, drop })` examples | Compiled into per-production sync-and-skip code paths. Produces a partial structure plus a diagnostic. |
| **Correction** | Not a parser concern | The parser engine does not perform input correction. A separate tool may consume `parse()`'s structure + diagnostics to emit corrected source text. |

The grammar generated for tolerance is indistinguishable from a hand-written
permissive parser. The recovery paths add no overhead to the valid-input fast
path; they are only entered when a syntax error is detected.

## Validation strategy

Each parser schema validates at three layers:

- **Unit tests** — small intentional cases, written against the generated
  `parse` / `tokenize` / `stringify`. Live in `packages/<schema>/test/`.
- **Conformance suites** — when a schema targets a real spec language (CSS,
  JS), large external fixture sets exercise breadth. The diagnostic output
  tracks total / accepted-valid / rejected-invalid / false-accepts /
  false-rejects. Conformance is opt-in via `PARSER2_CONFORMANCE=1`.
- **Bench and size gates** — guard against performance and bundle
  regressions on every change to the generated parser.

A green `npm test` is necessary but not sufficient for "spec complete". Track
the conformance metrics independently.

## Building a new parser

1. Create a package at `packages/<schema>` with `package.json`, `tsconfig.json`,
   `src/schema.ts`, generated-only `src/index.ts`, and a `test/` directory.
2. Decide on the schema's *structure shape commitment* — AST, extractor,
   metrics, etc. All examples must produce structures in this family.
3. Start with 3–5 representative examples covering the root node type. Each
   example should explain one grammar production and its returned structure.
4. Add additional node types as separate `.as(NodeType)` examples, or split
   into composed sub-schemas if the language benefits from modularity (the
   normal case for non-trivial languages).
5. Declare `operators`, `punctuators`, `tokens`, and `whitespace` as needed.
   Add token classes for things that may appear inside `.until(...)` captures,
   not only for spans consumed directly.
6. Run `npm run generate -w @parser2/<schema>` to emit
   `src/_generated/parser.ts`.
7. Keep `src/index.ts` to re-exports from `./_generated/parser.ts` plus
   generated types only. Do not add package-local parse wrappers, scanners,
   validators, or stringifiers.
8. Write unit tests asserting `parse` / `tokenize` / `stringify`.
9. Add `bench`, named hot-path benchmark scripts, `perf:gate`, `size:gate`,
   `baseline`, and `gate` scripts to the package. Add matching focused root
   benchmark shortcuts when useful.
10. If the schema has a browser build, lock perf and size baselines:
   `npm run baseline -w @parser2/<schema>`.

## Design checklist

Before merging a parser change:

- Is the new behavior described in `src/schema.ts` (examples first)?
- Did any new compiler logic stay generic (no package-specific branches)?
- Did `npm run generate` actually update the affected
  `src/_generated/parser.ts`?
- Is `src/index.ts` only re-exporting generated parser symbols and generated
  types?
- Do unit tests pass?
- Is the parser aligned to the bench/gate contract (`bench`,
  named hot-path bench scripts, perf baseline, size baseline, and `gate`)?
- Does `npm run audit:parser-contract` pass?
- If the schema targets a spec language, did conformance metrics improve, or
  at least not introduce false rejects?
- Did perf and size gates pass — or, if intentionally adjusted, was the
  baseline change reviewed?
- If a new primitive was added to the compiler, does it meet the admission
  policy (genericity + workload-reduction OR perf-win)?

If a change cannot answer "yes" to the first two, it is probably in the wrong
layer.
