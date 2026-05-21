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

### 1. The compiler is domainless

The compiler contains zero knowledge of CSS, JavaScript, JSON, or any other
specific language. There are no branches on package names, no JS-specific
emitters, no CSS-specific fallbacks, no per-language templates.

Everything the compiler emits is inferred from schema data — examples,
operators, punctuators, whitespace policy, recovery declarations — through a
small set of generic, reusable primitives.

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
3. Never add a language-specific emitter (`ecmascript-emitter`,
   `css-block-emitter`, etc.).

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

Standalone value packages follow the same rule. If a package is named
`@parser2/css-color`, its `validate(input)` export must be the generated
validator for that package's generic schema. It must not be a handwritten
CSS-color scanner in `src/index.ts`, even as a performance optimization. If
`validate()` is too slow, fix the compiler's generic `validate()` codegen so
every schema benefits.

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
parse(input: string, options?: {
  mode?: 'fast' | 'raws'
}): Structure
validate(input: string, options?: {
  mode?: 'fast' | 'raws'
}): void
tokenize(input: string): Token[]
countTokens(input: string): number
stringify(structure: Structure): string
```

`parse()` defaults to `mode: 'fast'`, which emits the schema structure without
formatting metadata. `mode: 'raws'` keeps source ranges and `raws` fields for
callers that need formatting fidelity. The mode names are domain-neutral and
apply to any generated parser.

`validate()` is the non-materializing sibling of `parse()`: it accepts the same
language, throws on invalid input, and returns nothing on success. It is still
domainless. A package named `@sx/color` may export a generic `validate()`, but
the compiler must not emit API names like `validateCssColor` from schema data.
That `validate()` must be emitted from the schema by codegen; package facades
must not replace it with handwritten domain-specific validation logic.

The `Structure` type is inferred from the schema's examples; see the DSL doc
for the inference rules. `Token[]` is derived from the schema's spans and
declarations; it is intentionally minimal (`type`, `value`, optional position).

Generated parsers never re-export schema data, runtime helpers, or compiler
internals.

## Generic primitive vocabulary

The compiler ships a closed set of generic primitives. These are the only
shortcuts available to schemas. They are *generic*: each primitive maps to a
pattern that recurs across many languages, not to a single language's
construct.

### Closed lists currently supported

- **Span classes**: `literal`, `ident`, `number`, `string`, `hex`, `regex`,
  `template`, `comment`, `whitespace`, `keyword`, `operator`.
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
| Multi-production node types (speculative dispatch) | implemented (slow; no lookahead optimization yet) |
| Source positions auto-attach | implemented |
| `whitespace: 'preserve'` policy | declared but not yet wired through codegen |
| `raws` capture (PostCSS-style formatting) | not yet implemented |
| `.recovers()` policy emission | not yet implemented |
| `stringify` | placeholder that throws |

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
npm run generate -w @parser2/js
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

Not yet implemented as named passes (planned):

- **`inferStructureTypes`** — discriminated-union TypeScript types per node
  type. Currently every parsed structure is `unknown` in TS terms.
- **`buildOperatorTable`** — Pratt precedence layers. Not exercised yet
  because the CSS schema doesn't use `operators`.

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
npm run perf:gate    -w @parser2/<schema>
npm run size:gate    -w @parser2/<schema>
```

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
   `src/schema.ts`, and a `test/` directory.
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
7. Write unit tests asserting `parse` / `tokenize` / `stringify`.
8. If the schema has a browser build, lock perf and size baselines:
   `npm run baseline -w @parser2/<schema>`.

## Design checklist

Before merging a parser change:

- Is the new behavior described in `src/schema.ts` (examples first)?
- Did any new compiler logic stay generic (no package-specific branches)?
- Did `npm run generate` actually update the affected
  `src/_generated/parser.ts`?
- Do unit tests pass?
- If the schema targets a spec language, did conformance metrics improve, or
  at least not introduce false rejects?
- Did perf and size gates pass — or, if intentionally adjusted, was the
  baseline change reviewed?
- If a new primitive was added to the compiler, does it meet the admission
  policy (genericity + workload-reduction OR perf-win)?

If a change cannot answer "yes" to the first two, it is probably in the wrong
layer.
