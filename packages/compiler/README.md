# Example inference compiler

`schema.ts` defines the authoring-only data model. `infer.ts` aligns concrete source/output pairs into literal and capture sequences, infers list separators and output projections, resolves recursive references and rejects contradictory evidence. `emit.ts` emits one recursive-descent method per production and inverse builders per output. `scan-source.ts` specializes balanced scans to lexical policies and delimiters; `literal-source.ts` factors declared literal sets into exact prefix predicates; `runtime-source.ts` supplies shared cursor/error primitives. `types-source.ts` emits recursive output types directly from projections.

The compiler is domainless. It never branches on package names, language names, output names, CSS properties or preprocessor constructs. The tests include a non-CSS record language and recursive bracket syntax. All language policy lives in package `schema.ts` files.

`compile(schema)` returns standalone JavaScript and executes generated methods at build time to verify every teaching example. `compile(schema, {typescript:true})` also emits TypeScript output types. The CLI checks inverse round trips before replacing generated files. Generation is deterministic and rewrites only changed files.

```sh
npm run generate
npm test
npm run typecheck
npm run audit:parser-contract
npm run bench
npm run baseline  # intentional baseline replacement only
npm run gate
```

Parser package entrypoints only re-export `./_generated/parser.ts`. There is no handwritten package runtime, tokenizer fallback, runtime grammar interpreter, or external runtime dependency.

Generated parsers materialize example-defined output directly. Text scanners are specialized at compile time to avoid per-character grammar-table iteration. Prefix constraints reject incompatible alternatives before scanning. Output JSON is explicit serialization of the chosen projection. Reverse conversion validates its reconstruction using the same parser in comparison mode. This mode compares captures and list items directly with the supplied structure; it does not construct a second output tree. A shape mismatch must not skip a grammar alternative: grammar selection is unchanged, and a successful parse with a different output is rejected.

Other generic optimizations:
- Exact literal-prefix factoring shares common suffix tests without broadening accepted literals.
- Whitespace/comment skipping is generated from lexical metadata and cached at the current cursor.
- List boundary predicates are emitted directly, avoiding per-iteration delimiter-array allocation.
- Schemas with one structured output omit redundant target dispatch.
- Identical output-shape predicates and inverse layouts share emitted functions even when their lexical constraints differ.

Optimization decisions depend only on literal sets, field kinds, projection shapes and output counts. No language, package, production, field or output name selects behavior. Tests include renamed schemas, arbitrary record/bracket languages, tuple and scalar projections, ordered overlapping alternatives and malformed inverse values. `validate` still uses the allocating parse path.

See [the DSL reference](../../docs/example-first-structure-dsl.md) for the supported syntax, limitations and public API, and [benchmark methodology](../../docs/benchmarks/README.md) for reproducible comparisons and gates.

Generic composition additionally supports scalar production references, sticky token captures, explicit opaque-span boundaries, bounded repetitions, trailing separators, and configurable whitespace significance. These features are selected only from schema metadata. `composition.test.ts` exercises recursive records, adjacent captures, empty-list evidence, line boundaries and both text/production trailing separators. Domain-specific schemas and competitor imports stay outside the compiler/runtime.
