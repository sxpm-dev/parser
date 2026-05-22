# Example-First Structure DSL

This document is the canonical reference for the schema DSL. Schemas describe a
language by example; the compiler infers everything else.

## Pipeline

```txt
examples + target structure  ->  compiler inference  ->  optimized generated parser
```

Three things follow from this pipeline:

- **Examples are the source of truth.** Concrete input strings paired with
  expected output structures are the contract. Everything else (operator
  tables, punctuator tables, recovery policies) is a small set of declarations
  attached to the schema to disambiguate generalization.
- **`parse()` returns a Structure, not an AST.** AST is *one* shape a Structure
  can take. An extractor (`{ hovers: [...] }`), a metrics object, a list of
  spans, a normalized object, or a custom domain shape are all equally valid.
  The shape is whatever the examples' `.structure({...})` literals describe.
- **Schemas describe; the compiler optimizes.** A schema never ships runtime
  parser code. The compiler emits a per-schema, straight-line, hand-tuned
  recursive-descent parser. The schema author writes examples; the compiler
  takes care of performance.

## Mental model

An example is not just a fixture. It is one grammar production plus the shape
to return when that production matches.

This CSS declaration example:

```ts
ex('color: red;')
  .as('Declaration')
  .span('prop', 'color').until([':', ';', '}'])
  .span(':')
  .span('value', 'red').until([';', '}'])
  .span(';').optional()
  .structure({ type: 'decl', prop: $.prop, value: $.value })
  .build()
```

teaches the compiler:

```txt
Declaration :=
  prop captured until ":" / ";" / "}"
  then ":"
  then value captured until ";" / "}"
  then optional ";"

return { type: "decl", prop, value }
```

The concrete text (`color`, `red`) is a teaching sample. The span modifiers
tell the compiler which parts generalize.

Node placement is explicit. Defining a `Comment` production teaches how to
parse a comment node, but it does not automatically allow comments everywhere.
Comments become valid children only where a recursive span lists `Comment` as
one of its roles:

```ts
.span('nodes', 'color: red', ['Comment', 'AtRule', 'Rule', 'Declaration'])
  .repeats({ sep: ';', trailing: 'allowed' })
```

Tokenization is separate from placement. The schema's `tokens` declaration
tells the generated tokenizer which classes it must recognize even inside
opaque `.until(...)` captures. For example, CSS declares:

```ts
tokens: ['number', 'string', 'comment']
```

so selectors, params, and values can contain numbers, strings, and comments
without the scanner splitting them into unrelated punctuators.

## What every example carries

For the compiler to learn from one example it must know all of:

| Layer | Purpose |
|---|---|
| **Input string** | The concrete syntax being demonstrated. |
| **Structure literal** | What `parse()` should return for this input. |
| **Span roles** | Which substring becomes which piece of structure, and whether the piece is a terminal (literal), a tokenized atom (class), or a non-terminal (recursive node type). |
| **Status** | One of: valid, recovered (invalid input with explicit recovery policy + post-recovery structure), or rejected (invalid input that must fail to parse). |

Tokens are not declared separately. A terminal span *is* a token. Tokenizer
behavior is derived from the spans plus the schema's declared classes,
operators, punctuators, and whitespace policy.

## Schema shape

```ts
import { defineSchema, ex, $ } from '@parser2/parser'

export default defineSchema({
  name: 'js-expression',
  rootType: 'Expression',
  uses: [ /* other schemas */ ],
  operators: { /* layered precedence */ },
  punctuators: { /* named punctuator map — see below */ },
  tokens: [ /* token classes the tokenizer should scan */ ],
  whitespace: 'standard',
  examples: [ /* ex(...).build() ... */ ],
})
```

Every field except `name`, `rootType`, and `examples` is optional.

### Domainless compiler contract

This is a strict requirement:

**The compiler is domainless. Parsing behavior MUST be inferred from schema
examples and generic schema configuration.**

Schemas are generic data consumed by a domainless compiler. The compiler does
not know about CSS colors, CSS properties, JavaScript modules, HTML tags,
selectors, URLs, logs, protobuf declarations, ARNs, cron expressions, or any
other product/domain concept. It only knows the closed schema vocabulary:
examples, spans, recursive roles, operators, punctuators, token classes,
refinements, modifiers, whitespace policy, validation composition, recovery
policies, and schema composition.

The source of truth for parser behavior is only:

```txt
schema examples + generic schema declarations -> inference -> generated parser
```

The compiler MUST NOT branch on schema, package, or domain names such as
`css`, `html`, `url`, `markdown`, `proto`, or any other parser package name.
A package may be named after a domain; the compiler may use that name only for
generated comments, module identity metadata, or output paths, never to decide
grammar behavior.

Forbidden compiler patterns:

```ts
if (schema.name === 'html') emitHtmlParser(...)
if (schema.rootSchemaName === 'css') emitCssFastPath(...)
switch (packageName) { case 'url': ... }
```

Allowed compiler patterns are shape-based and reusable:

```ts
if (isGenericNestedBlockShape(schema)) emitNestedBlockFastPath(...)
if (span.modifiers.some((m) => m.kind === 'until')) emitUntilCapture(span)
if (commentRefinement.block) emitGenericCommentScanner(open, close)
```

If a language needs behavior the current schema DSL cannot express, add a
reusable schema primitive or generic compiler inference rule first, then
express the language behavior in that package's `src/schema.ts`. Do not add a
package-specific emitter, handwritten parser, domain lookup table, or
package-name special case.

That means schema declarations must not contain domain-specific generated API
names such as `parseCssColor`, `validateCssColor`, or property-to-parser maps.
Generated parser APIs stay generic (`parse`, `validate`, `tokenize`,
`stringify`). Domain meaning comes from the package/module boundary: a color
grammar package can export `parse` and `validate`, and callers know it is a
color parser because they imported it from the color package.

The exported `validate` for a value grammar package is also schema-driven. For
example, `@parser2/css-color` must export the generated `validate` produced
from its generic color schema. Do not replace that export with handwritten
CSS-color checks in `src/index.ts`; if the validator needs to be faster, improve
generic compiler codegen for `validate()` instead.

The only domain-shaped affordances allowed in the schema DSL are generic
patterns/refinements that the compiler can compile without knowing the domain:
`.ident()`, `.number()`, `.string()`, `.hex()`, `.css()`, `.js()`,
`.oneOf(...)`, and similar closed-vocabulary refinements. If a feature needs a
new schema primitive, it must be justified as a reusable generic pattern, not
as a CSS-specific or JavaScript-specific shortcut.

**Mutual recursion:** when node types reference each other (e.g. CSS `Rule`
contains `AtRule` contains `Rule`), define them all in one schema rather than
splitting into separate schemas that `use` each other. The `uses:` graph must
be acyclic; the within-schema node-type graph can be freely recursive.

### `uses` — explicit composition

A schema can reference node types from other schemas only by importing those
schemas through `uses:`. Resolution is **explicit only** — there is no
transitive resolution and no automatic discovery. If a schema references
`Expression`, exactly one schema in `uses:` must export `Expression`.

A schema cannot override or extend an imported node type. If you need
additions, define a new schema that wraps the imported one and adds new
examples.

This makes the dependency graph visible at the top of every schema, prevents
surprise cycles, and lets each schema compile to a standalone parser.

### `operators` — layered precedence

```ts
operators: {
  logical:        ['||', '&&'],           // loosest (binds least tightly)
  equality:       ['==', '===', '!=', '!=='],
  comparison:     ['<', '>', '<=', '>='],
  additive:       ['+', '-'],
  multiplicative: ['*', '/', '%'],
  exponential:    ['**'],                 // tightest (binds most tightly)
}
```

Top to bottom = loosest to tightest. The layer *order* carries precedence; no
numeric levels. The compiler emits a single straight-line Pratt loop from this
declaration. Layer names are author-chosen; only the order matters.

`.span('op', '+').operator()` then matches any declared operator. The captured
`$.op` is typed as the union of all literal symbols.

### `punctuators` — named or anonymous

Two forms are supported:

**Array form** (each literal becomes its own token type):

```ts
punctuators: ['=>', '...', '++', '--', '==']
```

**Object form** (each literal is assigned a token type name):

```ts
punctuators: {
  lbrace: '{',
  rbrace: '}',
  colon: ':',
  semicolon: ';',
  comma: ',',
  delim: ['.', '+', '>', '~', '*', '/'],  // any number of literals can share a type
}
```

With the object form, the generated tokenizer emits tokens like
`{ type: 'lbrace', value: '{', start, end }`. When multiple literals share
a type (e.g. `delim`), they're distinguished by `value` at parse time.

Multi-char punctuators (`=>`, `~=`, `||`) must be listed so longest-match
wins at tokenization time. Single-char punctuators that compose into
multi-char ones (`=` + `>`) can be in either form.

### `tokens` — extra token classes the tokenizer must scan

Spans declare what they bind to (literal, classed, recursive). The tokenizer
also needs to recognize tokens that appear *inside* `.until()` captures —
numbers and strings inside selectors and declaration values, for instance —
even when no span references them directly.

```ts
tokens: ['number', 'string', 'comment']
```

Each entry adds that class's scanner to the generated tokenizer. Without
this, `.until([';', '}'])` would fail to scan past a digit inside a value
expression. Long-form with refinements:

```ts
tokens: [
  { class: 'number' },
  { class: 'string', refinements: [{ name: 'doubleQuoted' }] },
]
```

`tokens` does not say where a node is allowed. It only says what the tokenizer
can recognize. Placement still comes from spans and recursive role lists.

For comments this distinction matters:

```ts
tokens: ['comment']
```

means the tokenizer recognizes comments, including comments inside
`.until(...)` captures. A `Comment` node appears in the output only when there
is a `Comment` production and some parent span includes `Comment` in its role
list.

### `whitespace` — implicit between spans

By default the schema declares `whitespace: 'standard'`, meaning any whitespace
(including newlines) plus line/block comments are ignored between spans.
Specific spans can override this with `.noLineTerminatorAfter()`,
`.noWhitespaceAfter()`, or `.requireSpaceAfter()` modifiers.

## The example DSL

Every example is built with a single fluent chain that ends in `.build()`.

```ts
ex(input)                  // 1. the concrete input string
  .as(NodeType)            // 2. declare which node type this example defines
  .span(...)               // 3. zero or more labeled spans (left to right)
  .structure({ ... })      // 4. the expected output structure
  .build()
```

`as(NodeType)` may be omitted when the structure literal contains a `type:`
field that unambiguously identifies the node type (e.g. `.structure({ type:
'Rule', ... })`). When omitted, the compiler infers the node type from `type:`.

### Spans

```ts
.span(name?, text?, recursiveRole?)
```

| Form | Meaning |
|---|---|
| `.span(';')` | Unnamed literal. Match the exact text. No capture. |
| `.span('selector', '.foo:hover')` | Named literal. Match the exact text. Capture as string. |
| `.span('prop', 'color').ident().css()` | Classed span. Tokenize using the named class; refinement narrows the pattern. Capture as the class's value type. |
| `.span('init', '42', 'Expression')` | Recursive span (single role). Parse this substring with the named node type's grammar. |
| `.span('child', '.foo {}', ['Rule', 'AtRule'])` | Recursive span (multi-role). At parse time, try each role in order until one succeeds. |
| `.span('value', 'red').until([';', '}'])` | Opaque-string capture. See "Modifiers" below. |

A span's *text* is the substring as it appears in the example input. The
compiler resolves spans left-to-right, in declaration order, by finding the
next occurrence of the text after the previous span's end. If a span's text is
not uniquely findable from the prior cursor, the compiler errors and asks the
author to disambiguate — for example, by rewriting `'async (x) => x'` as
`'async (x) => c'` so the recursive `Expression` span has a distinct
substring.

For multi-role spans, the example text demonstrates *one* concrete case (e.g.
a Rule); the role list says which other node types are also acceptable at
this position. At parse time the compiler tries each role in order via
speculation; the first to succeed wins. Order list from most-specific to
least-specific when ambiguity is possible.

### Classes (closed vocabulary)

Classes are the generic primitives that describe how to tokenize and how to
capture a value. The set is closed; it grows only under the admission policy
documented in `packages/compiler/README.md`.

| Class | Captured type | Notes |
|---|---|---|
| `literal` *(implicit)* | string | The span text must match exactly. |
| `ident` | string | Identifier-shaped token. |
| `number` | number | Numeric literal, coerced to JS number. |
| `string` | string | Quoted string literal. |
| `hex` | string | Hex literal (CSS `#fff`, JS `0xff`). |
| `regex` | `{ pattern, flags }` | JS regex literal. |
| `template` | structured | JS template literal. |
| `comment` | string | Comment token; usually ignored. |
| `whitespace` | (none) | Whitespace token; usually ignored. |
| `keyword` | string | Fixed reserved word. |
| `operator` | string (union of declared) | Matches any operator declared in `operators`. |

### Refinements (closed, scoped per class)

Refinements narrow a class's pattern and narrow the captured type. Implemented
refinements are *enforced* by the generated parser: an input outside the
refinement is rejected.

| Class | Refinements |
|---|---|
| `number` | `.int()`, `.float()`, `.bigint()`, `.binary()`, `.octal()`, `.hex()`, `.scientific()`, `.separator('_')` |
| `string` | `.singleQuoted()`, `.doubleQuoted()`, `.backtick()`, `.hexString()`, `.urlString()` |
| `ident` | `.css()` *(allows `-`, leading `--`)*, `.js()` *(unicode rules)* |
| `comment` | `.line('//')`, `.block('/*', '*/')` |

Refinements compose only one deep — `.number().int()` is valid;
`.number().int().positive()` is not (positivity is not a token-shape concern).

#### Comments

Comments are modeled with the generic `comment` class plus a shape refinement:

```ts
// Block comment shape
ex('/* hello */')
  .as('Comment')
  .span('text', '/* hello */').comment().block('/*', '*/')
  .structure({ type: 'comment', text: $.text })
  .build()

// Line comment shape
ex('// hello')
  .as('Comment')
  .span('text', '// hello').comment().line('//')
  .structure({ type: 'comment', text: $.text })
  .build()
```

Then choose where comments may appear by listing `Comment` in recursive child
roles:

```ts
.span('items', '/* hello */', ['Comment', 'Statement', 'Declaration'])
  .repeats({ sep: ';', trailing: 'allowed' })
```

If a comment occurs inside an opaque capture, such as a CSS selector or value,
it is captured as part of that string unless the parent grammar lists
`Comment` as a separate child at that position.

Current implementation note: the DSL exposes `.line(marker)` and
`.block(open, close)` refinements, but generated comment tokenization is still
being generalized. The CSS parser currently recognizes block comments
`/* ... */`; schemas that need line comments such as `// ...` should add tests
when the generic comment scanner is expanded.

### Modifiers (closed)

Modifiers attach to a span and describe how the parser generalizes that
position. The full set:

| Modifier | Meaning |
|---|---|
| `.optional()` | The span may be absent. For named spans, the captured value is `null` when absent. For unnamed literals, pure tolerance with no effect on structure. |
| `.repeats({ sep?, trailing?, min?, max? })` | The span matches a list of values at this position. `sep` is the separator literal between children — when provided, it is consumed if present but not required (mixed-child bodies like CSS rule bodies can have separator-needing and separator-less children side by side). `trailing: 'allowed' \| 'required' \| 'forbidden'` (default `'forbidden'`). |
| `.until(stops, { balanced?, trim? })` | Opaque-string capture. Consumes tokens from the current position until it sees a token whose value matches any element of `stops`. When `balanced` is true (default), bracket pairs `() [] {}` nest and the stop only fires at depth zero — and a closing bracket at depth zero means the boundary of an enclosing block, so the capture stops there without consuming it. When `trim` is true (default), leading/trailing whitespace is stripped from the captured slice. Captured value is the raw source slice. |
| `.noLineTerminatorAfter()` | No line terminator allowed between this span and the next. |
| `.noWhitespaceAfter()` | No whitespace at all between this span and the next. |
| `.requireSpaceAfter()` | At least one whitespace character required between this span and the next. |

**When to use `.until()`:** for opaque substrings that real CSS/JS parsers
treat as raw text — CSS selectors, CSS at-rule preludes, CSS declaration
values, JSX text, template-literal cooked sections. Saves enumerating every
possible internal form via recursive grammar. The tokenizer must still be
able to scan everything inside (declare any extra classes via the schema's
`tokens` field).

### Structure literals

A structure literal is a plain object that may contain `$` references to span
captures.

```ts
.structure({
  type: 'IfStatement',
  test: $.test,
  consequent: $.consequent,
  alternate: $.alternate,            // null when the optional `else` is absent
  async: $.async.present,            // boolean: true iff the optional span matched
})
```

Two forms of reference are supported:

- `$.name` — the captured value (or `null` if the span was optional and
  absent).
- `$.name.present` — a boolean, `true` iff the named optional span matched.

Structure literals cannot contain arbitrary JavaScript expressions. All
transformations are expressed through classes and refinements (so the captured
value already has the right shape and type) or through structural shape
(positions of `$` references). This keeps structures statically analyzable and
codegen-friendly.

**`source` is auto-attached.** Every node returned by the generated parser
carries a `source: { start, end }` field with `{ line, column, offset }`
sub-positions. Schemas don't need to (and can't) request this in the
structure literal — it's appended automatically after construction. Convention:
`end.offset` is exclusive (one past the last consumed char), `end.line` and
`end.column` refer to the last consumed char (inclusive), matching PostCSS.

### Status: valid, recovered, rejected

A valid example needs no extra marker:

```ts
ex('.foo { color: red }').as('Rule').span(...).structure({...}).build()
```

A recovered example carries `.recovers({ syncAt, drop })` and a structure that
describes the post-recovery result. Recovery means: the input is malformed,
the parser skips to a sync point, drops the malformed region, and continues.

```ts
ex('.a { color red; font-size: 12px }')
  .as('Rule')
  .recovers({ syncAt: [';', '}'], drop: 'malformed-declaration' })
  .structure({
    type: 'Rule',
    selector: '.a',
    declarations: [{ prop: 'font-size', value: '12px' }],
  })
  .build()
```

A rejected example carries `.rejects()` and no structure. The parser must
throw a `SyntaxError` on this input.

```ts
ex('throw\n1;').as('Statement').rejects().build()
```

### Multi-production node types

A single node type can have multiple `.as('NodeType')` examples — each one is
a separate production for that node. Use this when the node has structurally
different shapes that can't be expressed as a single span sequence with
optional modifiers.

Example: a CSS at-rule has two forms — statement (`@charset "x";`) and block
(`@media screen { ... }`). They differ at the end (`;` vs `{...}`), so two
productions are clearer than one with deeply-nested optional spans:

```ts
// Statement form
ex('@charset "UTF-8";').as('AtRule')
  .span('@')
  .span('name', 'charset').ident().css()
  .span('params', '"UTF-8"').until([';', '{', '}'])
  .span(';').optional()
  .structure({ type: 'atrule', name: $.name, params: $.params })
  .build(),

// Block form
ex('@media screen { color: red }').as('AtRule')
  .span('@')
  .span('name', 'media').ident().css()
  .span('params', 'screen').until([';', '{'])
  .span('{')
  .span('nodes', 'color: red', ['Declaration', 'Rule', 'AtRule'])
    .repeats({ sep: ';', trailing: 'allowed' })
  .span('}')
  .structure({ type: 'atrule', name: $.name, params: $.params, nodes: $.nodes })
  .build(),
```

### Recursive roles and "allowed everywhere"

A common mistake is expecting a node type to become globally valid once it has
an example. The compiler does not do that. A node type is only tried where a
span references it.

For example:

```ts
ex('/* x */')
  .as('Comment')
  .span('text', '/* x */').comment().block('/*', '*/')
  .structure({ type: 'comment', text: $.text })
  .build()
```

defines a `Comment` production. This parent span is what permits comments in
a block body:

```ts
.span('nodes', '/* x */', ['Comment', 'Rule', 'Declaration'])
  .repeats({ sep: ';', trailing: 'allowed' })
```

If another parent span lists only `['Rule', 'Declaration']`, then standalone
comments are not valid children there, even though the `Comment` production
exists.

This is intentional. It keeps grammars local, predictable, and fast. If a
language truly allows comments between almost every token, that should be
modeled as tokenizer/whitespace behavior; if comments should appear in the
returned structure, list `Comment` in the relevant child roles.

At parse time the compiler dispatches between productions speculatively:
tries the first; on failure rolls back the token cursor and tries the next;
the last one's error propagates if none succeed. **Order matters** — list
more-specific or more-restrictive productions first.

## Recovery vs tolerance vs correction

Three different concerns are sometimes conflated. The schema author decides
which bucket a case falls into:

| Concept | Where it lives | Mechanism |
|---|---|---|
| **Tolerance** | Grammar | Span modifiers: `.optional()`, `.repeats({ trailing: 'allowed' })`. The grammar *accepts* the variation; no error is raised. |
| **Recovery** | Parser | `.recovers({...})` examples. The input is invalid, but the parser produces a partial structure and a diagnostic, then continues. |
| **Correction** | Layer above the parser | Not a parser concern. A separate transformation consumes the structure + diagnostics and emits corrected text. Out of scope for the parser engine. |

Example: trailing `;` in a CSS rule is **tolerance** (the grammar accepts both
`color: red` and `color: red;`). A malformed declaration like `color red;` is
**recovery** (the parser drops it and continues). Rewriting `color red;` to
`color: red;` as output is **correction** and lives in a tool above the parser.

## Captured values and inferred types

Each schema's exported `parse(input, options?)` is typed by inference from all
the schema's examples. The generated parser accepts a domain-neutral
`options.mode`:

- `fast` (default): omit generated formatting metadata such as `source` and
  `raws`.
- `raws`: include source ranges and `raws` fields for callers that need
  formatting fidelity.

- The return type is `Schema['rootType']`'s inferred shape.
- For each node type, the inferred TypeScript shape is the **union** of all
  `.structure({...})` shapes from examples that share that `.as(NodeType)`.
- Span captures are typed by the class/refinement that produced them. Optional
  spans become `T | null` in the captured type.
- `$.name.present` is always `boolean`.

The author does not write TypeScript types directly. All types are derived
from examples and the closed primitive vocabulary.

## Authoring guidelines

- **One example per shape.** If two examples differ only in a literal value
  (e.g. `+` vs `*`), write both. If they differ in *structural* shape (different
  fields, different node type), write both as distinct examples. Tooling can
  fold near-duplicates for inspection but the source of truth is many small
  examples.
- **Use distinct identifiers inside examples.** Avoid repeating substrings
  unless one is a literal terminal and the other is a recursive role on
  obviously different syntax. The compiler will fail the build if a span
  cannot be uniquely located.
- **Prefer modifiers over duplicate examples for pure variations.** Use
  `.optional()` for "absent vs present" cases when the structure shape is
  unchanged.
- **Push specifics into examples, not declarations.** Operator and punctuator
  declarations exist only because the tokenizer/parser cannot infer them from
  examples efficiently. Do not add domain-specific declaration sections for
  CSS properties, colors, selectors, JavaScript modules, or package-specific
  generated API names.
- **One schema = one structure shape commitment.** All examples in one schema
  must produce structures from the same family (all AST, or all extractor, or
  all metrics). You cannot mix AST examples and extractor examples in one
  schema. Different shapes = different schemas of the same input language.

## Schema composition in practice

A complex language is best expressed as a graph of small schemas.

```ts
const JsExpression = defineSchema({
  name: 'js-expression',
  rootType: 'Expression',
  operators: { /* ... */ },
  punctuators: ['=>', '...', '?.', '**', /* ... */],
  examples: [ /* Identifier, NumericLiteral, BinaryExpression, ... */ ],
})

const JsStatement = defineSchema({
  name: 'js-statement',
  uses: [JsExpression],
  rootType: 'Statement',
  examples: [ /* VariableDeclaration, IfStatement, ... */ ],
})

const JsModule = defineSchema({
  name: 'js-module',
  uses: [JsStatement /* , ImportExportSchema, ... */],
  rootType: 'Program',
  examples: [ /* module-only forms */ ],
})

const JsScript = defineSchema({
  name: 'js-script',
  uses: [JsStatement /* , WithStatementSchema, ... */],
  rootType: 'Program',
  examples: [ /* script-only forms */ ],
})
```

Properties this gives you:

- The expression schema can be used standalone:
  `import { parse } from '@parser2/js-expression'` parses
  `'1 + 4 * r / 2 - (1 + 2)'` directly with no JS-statement baggage.
- Module and script are separate compiled parsers sharing the bulk of their
  grammar via composition. No `sourceType` runtime arg, no auto-detection
  magic.
- CSS benefits in the same way: `Selector`, `DeclarationValue`, `Declaration`
  can each be a schema, composed into `Stylesheet`. The selector parser
  becomes reusable for tooling.
- Each generated parser package is schema-owned: `src/schema.ts` defines
  behavior, `src/_generated/parser.ts` contains the runtime, and `src/index.ts`
  only re-exports generated symbols and generated types. Parser packages do
  not carry package-local parser code, custom scanner helpers, wrappers, or
  custom functions.
- Each schema gets its own tests, `_generated/parser.ts`, size baseline, and
  performance gate.
- Each generated parser package must expose a package-level `bench` script,
  named hot-path bench scripts (`bench:parse`, `bench:tokenize`,
  `bench:validate`, etc.), `baseline`, and `gate`. Human-readable benchmarks
  use the shared `scripts/bench-table.ts` harness; gates use the shared
  `scripts/perf-gate.ts` and `scripts/size-gate.ts` harnesses. Parser changes
  are not design-complete until the relevant perf and size gates pass or
  intentionally relocked baselines are reviewed. The structural contract is
  enforced by `npm run audit:parser-contract`.

## A full CSS slice

The actual CSS schema lives at
[`packages/css/src/schema.ts`](../packages/css/src/schema.ts). Key points:

- **Single schema, multiple node types** (Comment, Declaration, Rule, AtRule,
  Stylesheet) — mutual recursion between Rule and AtRule (and nesting)
  requires they share one schema.
- **Named punctuators** (`lbrace`, `rbrace`, `colon`, `delim`, …) so tokens
  follow CSS Syntax conventions.
- **`.until()` opaque capture** for selector / at-rule prelude / declaration
  value — these are arbitrarily complex but treated as raw source slices.
- **Multi-role spans** for `nodes` lists: rule bodies accept `Comment`,
  `Declaration`, `Rule`, `AtRule`.
- **Multi-production node** for `AtRule` (statement form + block form).

Abridged shape:

```ts
export default defineSchema({
  name: 'css',
  rootType: 'Stylesheet',
  punctuators: {
    lbrace: '{', rbrace: '}',
    lparen: '(', rparen: ')',
    lbracket: '[', rbracket: ']',
    colon: ':', semicolon: ';', comma: ',',
    delim: ['.', '+', '>', '~', '*', '/', '%', '|', '&', '#', '@', '=', '!', '?'],
  },
  tokens: ['number', 'string', 'comment'],
  examples: [
    // Comment
    ex('/* foo */').as('Comment')
      .span('text', '/* foo */').comment()
      .structure({ type: 'comment', text: $.text }).build(),

    // Declaration (consumes its optional trailing `;` so source range includes it)
    ex('color: red;').as('Declaration')
      .span('prop', 'color').ident().css()
      .span(':')
      .span('value', 'red').until([';', '}'])
      .span(';').optional()
      .structure({ type: 'decl', prop: $.prop, value: $.value }).build(),

    // Rule
    ex('.foo:hover { color: red }').as('Rule')
      .span('selector', '.foo:hover').until('{')
      .span('{')
      .span('nodes', 'color: red', ['Comment', 'Declaration', 'Rule', 'AtRule'])
        .repeats({ sep: ';', trailing: 'allowed' })
      .span('}')
      .structure({ type: 'rule', selector: $.selector, nodes: $.nodes }).build(),

    // AtRule statement form
    ex('@charset "UTF-8";').as('AtRule')
      .span('@')
      .span('name', 'charset').ident().css()
      .span('params', '"UTF-8"').until([';', '{', '}'])
      .span(';').optional()
      .structure({ type: 'atrule', name: $.name, params: $.params }).build(),

    // AtRule block form
    ex('@media screen { color: red }').as('AtRule')
      .span('@')
      .span('name', 'media').ident().css()
      .span('params', 'screen').until([';', '{'])
      .span('{')
      .span('nodes', 'color: red', ['Comment', 'Declaration', 'Rule', 'AtRule'])
        .repeats({ sep: ';', trailing: 'allowed' })
      .span('}')
      .structure({
        type: 'atrule', name: $.name, params: $.params, nodes: $.nodes,
      }).build(),

    // Stylesheet
    ex('.foo { color: red }').as('Stylesheet')
      .span('nodes', '.foo { color: red }', ['Comment', 'Rule', 'AtRule'])
        .repeats({ min: 0 })
      .structure({ type: 'root', nodes: $.nodes }).build(),
  ],
})
```

## A full JS slice

```ts
const JsExpression = defineSchema({
  name: 'js-expression',
  rootType: 'Expression',
  operators: {
    logical:        ['||', '&&'],
    equality:       ['==', '===', '!=', '!=='],
    comparison:     ['<', '>', '<=', '>='],
    additive:       ['+', '-'],
    multiplicative: ['*', '/', '%'],
    exponential:    ['**'],
  },
  punctuators: ['=>', '...', '?.', '++', '--'],
  examples: [
    ex('a')
      .as('Expression')
      .span('name', 'a').ident().js()
      .structure({ type: 'Identifier', name: $.name })
      .build(),

    ex('42')
      .as('Expression')
      .span('n', '42').number().int()
      .structure({ type: 'NumericLiteral', value: $.n })
      .build(),

    ex('a + b')
      .as('Expression')
      .span('left', 'a', 'Expression')
      .span('op', '+').operator()
      .span('right', 'b', 'Expression')
      .structure({
        type: 'BinaryExpression',
        op: $.op,
        left: $.left,
        right: $.right,
      })
      .build(),

    ex('async (x) => c')
      .as('Expression')
      .span('async').noLineTerminatorAfter().optional()
      .span('(')
      .span('params', 'x', 'Pattern').repeats({ sep: ',', trailing: 'allowed' })
      .span(')')
      .span('=>')
      .span('body', 'c', 'Expression')
      .structure({
        type: 'ArrowFunctionExpression',
        async: $.async.present,
        params: $.params,
        body: $.body,
      })
      .build(),
  ],
})

const JsStatement = defineSchema({
  name: 'js-statement',
  rootType: 'Statement',
  uses: [JsExpression],
  examples: [
    ex('const answer = 42;')
      .as('Statement')
      .span('const')
      .span('id', 'answer').ident().js()
      .span('=')
      .span('init', '42', 'Expression')
      .span(';')
      .structure({
        type: 'VariableDeclaration',
        kind: 'const',
        id: $.id,
        init: $.init,
      })
      .build(),

    ex('throw err;')
      .as('Statement')
      .span('throw').noLineTerminatorAfter()
      .span('arg', 'err', 'Expression')
      .span(';')
      .structure({ type: 'ThrowStatement', argument: $.arg })
      .build(),

    ex('if (a) {} else {}')
      .as('Statement')
      .span('if')
      .span('(')
      .span('test', 'a', 'Expression')
      .span(')')
      .span('consequent', '{}', 'Statement')
      .span('alternate', 'else {}', 'Statement').optional()
      .structure({
        type: 'IfStatement',
        test: $.test,
        consequent: $.consequent,
        alternate: $.alternate,
      })
      .build(),

    ex('throw\n1;').as('Statement').rejects().build(),
  ],
})
```

## Why the DSL is closed

The DSL surface is intentionally small and closed: a fixed set of classes, a
fixed set of refinements per class, a fixed set of modifiers, and a fixed set
of declaration kinds (operators, punctuators, whitespace, uses).

This closedness is what lets the compiler emit straight-line, hand-tuned
parser code at codegen time:

- Closed class vocabulary means each class compiles to a tight inlined
  character predicate, not a runtime dispatch.
- Closed operator/punctuator declarations mean keyword and longest-match
  tables are baked into the generated parser as switches.
- Closed modifier set means the compiler can reason about every grammar
  position statically.
- The absence of arbitrary JavaScript in structure literals means every
  transformation is statically analyzable.

Anything that would force the compiler to interpret data at runtime (regex
tables, dynamic dispatch tables, runtime grammar interpretation) is excluded
by design. See `packages/compiler/README.md` for the generated parser shape
and performance guarantees that follow from this.
