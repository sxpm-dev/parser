# @parser2/compiler Deep Dive

`@parser2/compiler` turns parser-package schemas into generated parser modules.
The project rule is:

```txt
examples + target structure -> compiler inference -> optimized generated parser
```

## Important Architecture Invariant

Parser and compiler are domainless.

The parser schema is the single source of truth, and examples are the primary
truth inside the schema. Code generation must contain zero domain knowledge:
no ECMAScript/CSS/JSON-specific emitters, branches, fallbacks, parser-library
runtime shortcuts, or package-specific templates.

All emitted parser behavior must be inferred from schema data and generic,
reusable compiler/runtime mechanisms. If a language feature cannot be expressed
from examples yet, add more examples first. If examples alone are not enough,
extend the example DSL, inference hints, or a domainless runtime family; do not
add a language-specific emitter such as `ecmascript-emitter`.

Parser packages describe their language. They do not own parser templates, fallback
libraries, or package-specific code generation. The compiler is domainless: it may
know about generic runtime families, grammar patterns, recovery policy, tokenizer
rules, and structure inference, but it must not contain CSS/JS/JSON-specific
knowledge.

## Main Architecture Requirement

This is an example-first string parser engine.

The goal is not "generate an AST parser." AST is only one possible output
structure. The real contract is:

```txt
input string -> tokens/spans -> structure
```

`Structure` can be a full AST, a partial extractor, normalized object, list of
matches, metrics, spans only, transformed string, or any custom domain object.
For example, two schemas may parse the same input language while producing
different structures:

- JSON root props: `{ rootProps: ['a', 'b'] }`
- JSON nested number paths: `{ numbers: [{ path: ['b', 'c'], value: 2 }] }`
- CSS hover extractor: `{ hovers: ['.a:hover'] }`
- CSS full stylesheet structure: `{ rules: [...] }`

Examples are always the main source of truth. They define:

- concrete syntax and token shapes
- spans and captures that matter
- the target structure
- ignored syntax
- normalization behavior
- invalid inputs and recovery expectations

Optional grammar/rule/config fields are support material only. They exist to
help the compiler infer general behavior from examples when examples alone are
ambiguous or too sparse. They must not become the primary description of a
language, and they must not encode package-specific parser logic.

When extending a parser schema, prefer this order:

1. Add or improve examples with expected `.structure(...)`.
2. Add optional grammar/rule/capture hints that explain how examples generalize.
3. Add policy examples for invalid/recovery/stringify behavior.
4. Only then add a small domainless runtime capability if no example/hint shape
   can express the needed behavior.

Large config blocks in a language schema are a smell. If the schema needs many
manual knobs, improve the examples and inference DSL instead of moving language
knowledge into runtime config.

## Generated Contract

Each generated parser is written to:

```txt
packages/<name>/src/_generated/parser.ts
```

It exports:

```ts
parse(input: string): Structure
tokenize(input: string): Token[]
stringify(structure: Structure): string
```

`Structure` is intentionally broader than AST. A schema can produce a full AST,
a partial extractor, a parse tree, metrics, spans, transformed text, or any
custom data shape.

## Package Responsibilities

Parser package:

- Owns `src/schema.ts`.
- Defines examples first, with optional rules/hints/policies only where needed.
- Runs conformance, unit, benchmark, and size gates.
- Never imports fallback parser libraries for runtime parsing.
- Never ships package-local parser codegen.

Compiler package:

- Loads schema files.
- Infers tokens, spans, captures, fields, structure types, recoveries, and
  pattern grammar from examples and optional hints.
- Selects a generic runtime emitter from schema data only after inference.
- Emits optimized TypeScript parser code.
- Does not branch on package names or domain concepts.

Core parser package:

- Provides the schema DSL: `defineSchema`, `ex`, examples, target structures,
  pattern rules, recovery builders, and runtime schema types.

## Schema Anatomy

A schema normally has four layers:

```ts
export default defineSchema({
  name: 'json',
  runtime: { ... },
  examples: [ ... ],
});
```

### 1. Examples

Examples are the source of truth for visible behavior and target output
structure.

```ts
ex('{"name":"Ada","count":2}')
  .token('lbrace', '{')
  .token('string', '"name"')
  .token('colon', ':')
  .token('string', '"Ada"')
  .node('JsonDocument', (doc) => doc.node('object'))
  .structure({
    type: 'JsonDocument',
    rootProps: ['name', 'count'],
  })
  .build()
```

The compiler uses examples to infer:

- token names
- node names
- fields and TypeScript field types
- root structure type
- recovery examples
- expected structure shapes
- captures, spans, ignored syntax, and normalization behavior

Use examples for concrete syntax and output contracts. Add examples before
adding runtime knobs. If a parser has only a few examples and a large runtime
config, the schema is probably moving in the wrong direction.

### 2. Example-Owned Captures, Syntax, And Recovery

Examples may carry captures, reusable syntax, output structure, and recovery
policy in one fluent chain. This is the primary DX surface: start with a small
example, then add only the hints needed for the compiler to generalize it.

```ts
ex('.foo {}')
  .capture('selector', '.foo')
  .syntax('Rule', (s) => s.seq(
    s.capture('selector', s.selector()),
    s.token('{'),
    s.repeat('Declaration'),
    s.token('}'),
  ))
  .recover((r) => r
    .syncAfter(['}', ';'])
    .missing('}', 'close rule block'))
  .structure({
    type: 'Rule',
    selector: cap('selector'),
    declarations: [node('Declaration')],
  })
  .build()
```

Small extraction schemas can stay minimal:

```ts
ex('.foo:hover { color: red }')
  .capture('hoverSelector', '.foo:hover')
  .structure({ hovers: [cap('hoverSelector')] })
  .build()
```

Mature language schemas can still use `.generalizes(...)` for multiple
alternatives, but new schema work should prefer `.syntax(...)` when one example
teaches one reusable production.

Pattern syntax for `.generalizes(...)`:

- `%name%` references another rule.
- `%name*%` means zero or more.
- `%name+%` means one or more.
- `%name?%` means optional.
- Literal text outside `%...%` is matched as literal grammar text.

The compiler may also read legacy top-level `rules` for packages that have not
yet migrated, but mature schemas should prefer `.generalizes(...)` on examples.

Invalid examples are assertions only. They must not generate denylist validators
or hidden syntax patches. A parser passes an invalid example only when the
closed valid grammar naturally rejects that input.

The schema should describe valid syntax families, not enumerate every invalid
string. For example, one `if ( %Expression% ) %Statement%` pattern plus a
recursive expression grammar covers `if (a)`, `if (((a)))`, and
`if ((() => 1)())`; malformed inputs fail because they do not match the closed
root grammar.

### 3. Runtime Config

`runtime` chooses a generic emitter family and supplies generic parameters.
It is a low-level support layer, not the center of the schema.

Current families:

- `standard` tokenizer + `value-document` parser for JSON-like values.
- `block-style` tokenizer/parser/stringifier for CSS-like block syntax.
- `statement-list` tokenizer/parser/stringifier for JS-like statement streams.

The names are implementation families, not language domains. For example,
`statement-list` knows how to scan strings, comments, brackets, semicolons,
statement starts, restricted line terminators, numeric literal policies, and
hashbang policy because those are expressed as generic data.

Example JS runtime slice:

```ts
runtime: {
  tokenize: {
    kind: 'statement-list',
  },
  parse: {
    kind: 'statement-list',
    programAlias: 'JsNode',
    statementAlias: 'JsStatement',
    noLineTerminatorAfter: ['throw'],
    numberLiteral: {
      separator: '_',
      bigintSuffix: 'n',
      rejectIdentifierAfter: true,
      prefixes: [
        { prefixes: ['0b', '0B'], digits: '01' },
        { prefixes: ['0o', '0O'], digits: '01234567' },
        { prefixes: ['0x', '0X'], digits: '0123456789abcdefABCDEF' },
      ],
    },
    hashbang: {
      marker: '#!',
      onlyAtStart: true,
      rejectEscapedStart: ['#\\', '\\043', '\\u0023', '\\u{23}', '\\x23'],
    },
    requireBalancedEnd: true,
  },
  stringify: {
    kind: 'statement-list',
    bodyField: 'body',
  },
}
```

Notice the boundary: JS-specific syntax lives in examples and their
generalizations in `packages/js/src/schema.ts`; the compiler only emits generic
behavior inferred from schema data. Runtime config may name generic scanner
policies, aliases, or low-level delimiters, but it must not become a JS grammar
table. Keyword lists, statement tables, block-start tables, call-shape
validators, declaration validators, strict-mode validators, and header
validators are legacy scaffolding to remove as grammar coverage replaces them.

### 4. Recovery And Invalid Examples

Recovery policy is schema-owned and should be example-backed.

```ts
ex('.a { color red; background: blue; }')
  .invalid('missing-colon')
  .recover((recovery) => recovery
    .at('Declaration')
    .onFail()
    .skipUntil(';', '}')
    .drop())
  .build()
```

This says what the parser should do. The compiler decides how to emit it.

## Compiler Flow

Run generation from the repository root:

```sh
npm run generate
```

Or per package:

```sh
npm run generate -w @parser2/js
```

The CLI path is:

```txt
packages/compiler/src/cli.ts
  -> import schema.ts
  -> generateParser(schema, schemaPath)
  -> inferSchema(schema)
  -> emitGenericParser(inferred)
  -> write src/_generated/parser.ts
```

Important compiler steps:

1. `inferSchema()` walks examples and example-owned generalizations.
2. `inferStructure()` infers exported structure types from `.node()` and
   `.field()` examples.
3. `inferRecoveries()` converts `.invalid()` and `.recover()` examples into
   recovery metadata.
4. `inferGrammarFromPatterns()` turns `.generalizes(...).from(...)` patterns
   into a small grammar tree.
5. `emitGenericParser()` routes to a generic emitter based on `runtime.kind`.

Runtime routing currently lives in `packages/compiler/src/emitter.ts`:

- `block-style` -> `emitBlockStyleParser`
- `statement-list` -> `emitStatementListParser`
- `standard` + `value-document` + `native-json` -> value-document emitter

Adding a new language should usually mean adding schema data, not a new emitter.
Add a new emitter only when the runtime family is genuinely new and reusable.

## Building A New Parser

1. Create a package under `packages/<name>`.
2. Add `src/schema.ts`.
3. Start with 3-5 representative examples.
4. Add example-owned `.generalizes(...)` patterns when examples need recursive
   placeholders like `%value%`.
5. Choose or extend a generic `runtime` family.
6. Run generation.
7. Add package unit tests against `parse`, `tokenize`, and `stringify`.
8. Add conformance and benchmark scripts.
9. Add size/performance baselines when there is a browser build.

Minimal skeleton:

```ts
import { defineSchema, ex } from '@parser2/parser';

export default defineSchema({
  name: 'mini',
  runtime: {
    tokenize: { kind: 'standard', ... },
    parse: { kind: 'value-document', ... },
    stringify: { kind: 'native-json', valueField: 'value' },
  },
  examples: [
    ex('1')
      .token('number', '1')
      .node('MiniDocument', (doc) => doc.node('number'))
      .structure({ type: 'MiniDocument', value: 1 })
      .generalizes('MiniDocument', (rule) => rule
        .from('%value%').node('MiniDocument'))
      .build(),
  ],
});
```

## Validation Strategy

For mature parsers, use three layers:

- Unit tests for small, intentional behavior.
- Conformance suites for real spec coverage.
- Bench and size gates for performance regressions.

Useful commands:

```sh
npm test
npm run test -w @parser2/js
PARSER2_CONFORMANCE=1 npm run test:conformance -w @parser2/js
npm run bench -w @parser2/js
npm run size:gate -w @parser2/js
```

When conformance is diagnostic, do not count a green command as full spec
completion. Track:

- total files
- accepted valid files
- rejected invalid files
- false accepts
- false rejects

Only keep parser changes that preserve normal tests and do not introduce false
rejects unless the schema intentionally changes accepted syntax.

## Performance Rules

Performance is a first-class output of the compiler.

Prefer:

- single-pass scanning
- generated straight-line checks
- schema tables baked into generated code
- simple loops over regex-heavy parsing in hot paths
- rejecting net-negative validators

Avoid:

- broad pre-passes when the existing scan can do the work
- parser-library fallbacks
- package-local handwritten parser logic
- feature checks that improve a few invalid cases but reject many valid files
- domain branches in compiler code

When a syntax slice increases generated browser size, update the size baseline
only after measuring conformance and benchmark impact.

## Design Checklist

Before merging a parser change:

- Is the behavior described in `src/schema.ts`?
- Is compiler logic generic and reusable?
- Does the generated parser export `parse`, `tokenize`, and `stringify`?
- Did generation update `src/_generated/parser.ts`?
- Are unit tests green?
- Did conformance improve or at least avoid false-reject regressions?
- Did size/perf gates run when the generated parser changed?

If the answer to the first two questions is no, the change is probably in the
wrong layer.
