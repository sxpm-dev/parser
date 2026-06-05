# JSON Parser Design

**Date:** 2026-06-05
**Package:** `@parser2/json` at `packages/json/`
**Status:** Approved (brainstorming → writing-plans)

## Contract

Two equivalence properties define the parser:

1. For inputs that are valid strict JSON (RFC 8259):

   ```ts
   render(input, { type: 'ast' })  deepEqual  JSON.parse(input)
   ```

2. For any value `v` that `JSON.stringify(v)` does not return `undefined`:

   ```ts
   stringify(v, { type: 'ast' })  ===  JSON.stringify(v)
   ```

`render` accepts a strict superset of JSON (JSON5-ish — see below). `stringify`
always emits canonical strict JSON.

## Architecture invariants (recap)

This work lands in a schema-first compiler-generated parser project. The
non-negotiables that apply:

- The parser package is ONLY: `src/schema.ts`, `src/_generated/parser.ts`,
  `src/index.ts` (just `export * from './_generated/parser.ts';`), tests,
  benches, fixtures, package metadata.
- The compiler is domainless. No JSON-specific branches in the compiler.
  Every parser behavior must come from generic schema primitives.
- All performance work happens in generic compiler codegen, not handwritten
  package code.

## Package layout

```
packages/json/
  package.json            mirror of yaml-block's: generate / build / test
  tsconfig.json
  src/
    schema.ts             source of truth
    index.ts              export * from './_generated/parser.ts';
  test/
    json-parse-parity.test.ts
    json-stringify-parity.test.ts
    json5-extensions.test.ts
    round-trip.test.ts
  bench/
    common.ts
    parse.ts
    perf-baseline.json
    size-baseline.json
```

After `npm run generate -w @parser2/json`, `src/_generated/parser.ts` is
emitted. The package's `index.ts` only re-exports that file.

## Schema shape

```ts
defineSchema({
  rootType: 'JsonValue',
  defaultTarget: 'ast',
  punctuators: {
    lbrace: '{', rbrace: '}',
    lbracket: '[', rbracket: ']',
    colon: ':',
    comma: ',',
  },
  tokens: ['number', 'string', 'comment'],
  // whitespace: 'standard'  (default — covers JSON5 inter-token whitespace and comments)
  examples: [ /* productions below */ ],
})
```

## Productions

| Node           | Parse shape                                                                                  | `ast` body                  |
| -------------- | -------------------------------------------------------------------------------------------- | --------------------------- |
| `JsonNull`     | literal `null`                                                                               | `null`                      |
| `JsonTrue`     | literal `true`                                                                               | `true`                      |
| `JsonFalse`    | literal `false`                                                                              | `false`                     |
| `JsonString`   | `.string().doubleQuoted()` (+ JSON5: `.singleQuoted()` as separate production)               | `$.value` (parsed JS string) |
| `JsonNumber`   | `.number().float().scientific()` — covers int / float / exp / negative                       | `$.value` (JS number)       |
| `JsonMember`   | `key : value` — key is a `JsonString` (or JSON5 unquoted ident); value is a `JsonValue`      | `dynKey($.key, $.value)`    |
| `JsonObject`   | `{ JsonMember, … , trailing-comma allowed (JSON5) }` — empty `{}` allowed                    | `merge($.entries)`          |
| `JsonArray`    | `[ JsonValue, … , trailing-comma allowed (JSON5) ]` — empty `[]` allowed                     | `$.items`                   |
| `JsonValue`    | `.of('JsonObject','JsonArray','JsonString','JsonNumber','JsonTrue','JsonFalse','JsonNull')`  | `$.node`                    |

`rootType` is `JsonValue`.

### Why `merge` + `dynKey` for objects

The CSS schema's flat-json target already uses this exact pattern for the
`{ selector: { prop: value } }` shape:

- `Declaration.json = dynKey($.prop, $.value)` — a single-entry object
- `Rule.json = dynKey($.selector, merge($.nodes))` — selector key + merged
  body
- `Stylesheet.json = merge($.nodes)` — merges all children

`JsonMember` reuses Declaration's shape; `JsonObject` reuses Stylesheet's
shape. The compiler's `merge` slot helper (see `dc9511b perf(compiler):
specialized merge slot helper — direct value-type dispatch`) is the inverse
machinery this design depends on.

### Dispatch order matters

`JsonValue` lists more-specific productions first. `JsonObject` /
`JsonArray` are bracketed and unambiguous; the four literal-ish productions
(`JsonString`, `JsonNumber`, `JsonTrue`, `JsonFalse`, `JsonNull`) follow.
Speculative dispatch falls through in order on the first token.

## Stringify (inverse)

Derived automatically by the compiler. The `JsonValue` dispatcher's
inverse discriminates by JS runtime type:

| Runtime test                                  | Production    |
| --------------------------------------------- | ------------- |
| `v === null`                                  | `JsonNull`    |
| `v === true`                                  | `JsonTrue`    |
| `v === false`                                 | `JsonFalse`   |
| `typeof v === 'string'`                       | `JsonString`  |
| `typeof v === 'number'`                       | `JsonNumber`  |
| `Array.isArray(v)`                            | `JsonArray`   |
| `typeof v === 'object' && v !== null`         | `JsonObject`  |

Each production's `source` template emits canonical strict-JSON syntax —
double-quoted strings, no whitespace, no trailing comma, no comments. The
result of `stringify(v, {type:'ast'})` is byte-identical to
`JSON.stringify(v)` for any JS value `JSON.stringify` does not coerce to
`undefined`.

## JSON5 feature scope

**In:**
- Line `//` and block `/* */` comments — anywhere whitespace is allowed.
- Trailing comma in arrays and objects.
- Unquoted identifier keys (JSON5 `IdentifierName` — same as `.ident().js()`).
- Single-quoted strings (separate `JsonString` production using `.singleQuoted()`).

**Out (explicitly deferred — would need new generic number-class
refinements, and either round-trip lossy under JSON.stringify or can't be
expressed by the current closed vocabulary):**

- Hex numbers (`0xff`)
- Leading / trailing decimal (`.5`, `5.`)
- Explicit `+` sign on numbers
- `NaN` / `Infinity` / `-Infinity`
- String line continuations
- Escape sequences beyond the standard JSON set

## Tests

- **JSON.parse parity (`json-parse-parity.test.ts`)** — for a fixture
  corpus of strict-JSON inputs covering primitives, nested objects, nested
  arrays, deep nesting, unicode escapes, control-char escapes, scientific
  notation, large numbers, and empty containers:

  ```ts
  assert.deepEqual(render(input, { type: 'ast' }), JSON.parse(input))
  ```

- **JSON.stringify parity (`json-stringify-parity.test.ts`)** — for a
  corpus of JS values (primitives, nested objects, arrays, strings needing
  escapes, special numeric values like `-0`):

  ```ts
  assert.strictEqual(stringify(v, { type: 'ast' }), JSON.stringify(v))
  ```

- **JSON5 acceptance (`json5-extensions.test.ts`)** — inputs with
  comments / trailing commas / unquoted keys / single quotes parse to the
  JS value that JSON.parse would yield for the strict equivalent. (No
  parity property here since JSON.parse rejects these inputs.)

- **Round-trip (`round-trip.test.ts`)**:

  ```ts
  const v1 = render(input, { type: 'ast' })
  const s  = stringify(v1, { type: 'ast' })
  const v2 = render(s, { type: 'ast' })
  assert.deepEqual(v2, v1)
  ```

  Round-trip is value-stable, not byte-stable (input whitespace and JSON5
  features are dropped on output by definition).

## Bench

`bench/parse.ts` benchmarks `render(input, {type:'ast'})` against
`JSON.parse` on a representative fixture (large nested document — e.g.
package-lock.json fragment, ~50KB). Uses the shared `scripts/bench-table.ts`
harness. `perf-baseline.json` and `size-baseline.json` are locked via
`npm run baseline -w @parser2/json` once the implementation is green.

## Risks (verification during implementation; not blockers)

These are all generic compiler concerns. If any gap is found, the fix
lives in the compiler — every schema benefits, not just JSON.

1. **`.string().doubleQuoted()` capture value.** Must yield the *parsed*
   JS string (escape sequences processed) rather than the raw source
   slice. Verify against `'"a\\nb"'` → `"a\nb"`. If the class currently
   captures the slice, the fix is in the generic string-class capture
   path.

2. **Line-comment scanner.** Per `packages/compiler/README.md`, block
   comments work today; line comments may need to be wired through the
   generic comment scanner. If `//` doesn't work, the JSON5 spec drops to
   block comments only and we file a follow-up against the compiler.

3. **Value-type dispatch on `JsonValue` inverse.** CSS flat-json discriminates
   by string-vs-object; JSON needs the full JS-type ladder including `null`
   distinguishing from object, and `Array.isArray` distinguishing from plain
   object. If gaps exist, the generic dispatcher emitter is the place to
   close them.

4. **`merge($.entries)` on a plain repeating span.** CSS uses `merge` on
   spans that produce a mixed-type child list (Declaration / Rule / etc.).
   JSON's `JsonObject.entries` is a uniform list of `JsonMember` results
   (each a single-entry object via `dynKey`). The merge helper should
   handle this trivially, but it's worth a smoke test before relying on it
   for the full design.

## Out of scope

- `replacer` argument
- `space` / indent argument for pretty-printing
- `toJSON` method invocation on values
- BigInt support
- Streaming / incremental parsing
- A `'source'` render target (JSON.stringify is already canonical; there's
  no original formatting to preserve)

## Open follow-ups

- After the schema works end-to-end, evaluate whether any of the JSON5
  "out" features are worth promoting in via new generic number-class
  refinements (`.hex()` on number, leading-dot, `+` sign). Each would
  need to clear the compiler's admission policy (genericity +
  workload-reduction or perf-win).
