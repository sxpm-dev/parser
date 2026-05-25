# Unified Render Targets — design

Status: design draft, awaiting approval. Author: Claude (Opus 4.7).
Supersedes the relevant portions of `2026-05-24-stringify-templates-design.md`
(auto-derived `source`, json/json-auto split, separate `.structure` and
`.stringify` builder methods).

## Goal

Collapse the current schema-authoring split between `.structure({...})` (the
AST/parser-output shape) and `.stringify(target, tpl`...`)` (per-target text
emit) into a single `.render(target, body)` method. Drop auto-derivation
entirely — no `json-auto`, no auto-`source`. Make every target a first-class,
schema-declared peer with both a forward (input → target) and an inverse
(target → input) implementation derived from the same body.

Concrete user-visible result:

```ts
// schema authoring
ex("color: red !important;")
  .as("Declaration")
  .span("prop", "color").until([":", ";", "}"])
  .span(":")
  .span("value", "red").until([";", "}", "!"])
  .span("!")
  .span("important", "important").ident().css()
  .span(";").optional()
  .render("ast", {
    type: "decl",
    prop: $.prop,
    value: $.value,
    important: true,
  })
  .render("json", tpl`"${$.prop}":"${$.value} !important"`)
  .build()
```

```ts
// public runtime
const ast  = render(css, { type: "ast"  });  // → object
const json = render(css, { type: "json" });  // → string
const back = stringify(ast,  { type: "ast"  });  // → source string
const same = stringify(json, { type: "json" });  // → source string
// render(stringify(render(x, {type:T}), {type:T}), {type:T}) === render(x, {type:T})
```

## Design rules

Non-negotiable.

1. **Domainless, targetless compiler.** Target names are opaque keys. The
   compiler must not branch on `target === 'ast'` / `'json'` / `'html'` /
   anything. Code that today contains `if (target === 'json-auto')` (see
   `packages/compiler/src/emit/stringify.ts:299`) gets deleted, not
   refactored. All dispatch is structural over the body's value shape.
2. **Body shape IS the output shape.** A `Template` body produces a string;
   an object body produces an object; an array body produces an array; a
   scalar body produces that scalar; a bare `$.name` body produces the raw
   capture value. The compiler walks the body recursively and emits
   build-this-value code uniformly.
3. **All slots resolve through the same capture vocabulary.** `$.name`,
   `$.gap(a, b)`, `$.commentLeft(name)`, `$.commentRight(name)`,
   `$.endsWith(name)`, `$.tail(name)`, `$.presence(name)`. The body can use
   any of these regardless of whether it is a `Template` or an object
   literal.
4. **Bidirectional by default.** For each declared `(production, target)`
   pair the compiler emits both forward and inverse code. Inverse derivation
   has strict preconditions (Section 5); failures are compile errors with
   actionable messages, not runtime surprises.
5. **Round-trip is value-stable, not byte-stable.**
   `render(stringify(render(x, T), T), T) === render(x, T)` is the contract.
   Whitespace, trailing punctuation, and comment positions are allowed to
   normalize.
6. **Per-target completeness.** If target `T` is declared on any production,
   every production reachable in the grammar must declare `T`, or compile
   fails. Applies uniformly — same rule for `'ast'`, `'json'`, custom names.

## Schema-authoring API

`ExampleBuilder.render(target: string, body: RenderBody, options?: { inverse?: Template }): ExampleBuilder`

`RenderBody` is the union of all value shapes a body can take: `Template`,
plain object with `RenderBody` children, array of `RenderBody`, scalar
(string / number / boolean / null), or a `StructureRef` (one of the `$.*`
capture refs). It is the same type today's `StructureValue` describes, with
`Template` added to the union.

Removed builder methods: `.structure(value)`, `.stringify(target, template)`.
A schema rewriting one for the other is mechanical:

| before                                  | after                                         |
| --                                      | --                                            |
| `.structure({ ... })`                   | `.render("ast", { ... })` *(if you want an AST view)* |
| `.stringify("source", tpl\`...\`)`      | `.render("source", tpl\`...\`)` *(if you want this target)* |
| `.stringify("json", tpl\`...\`)`        | `.render("json", tpl\`...\`)`                 |

The `options.inverse` knob is a `Template` providing an author-written
inverse parser for cases where the compiler cannot derive one (Section 5).
For `'ast'`-style object bodies the inverse is always derivable, and the
override is unused. For ambiguous string templates it is the escape hatch.

## Public runtime API

```ts
function render(input: string, options?: { type?: string }): unknown
function stringify(value: unknown, options?: { type?: string }): string
```

`render`'s return type is `unknown` at the package boundary. Per-package
generated `.d.ts` files augment this with declared targets — e.g. the CSS
package emits

```ts
export function render(input: string, options: { type: "ast"  }): CssAst
export function render(input: string, options: { type: "json" }): string
```

via discriminated overloads.

`stringify` always returns a string — the reconstructed input source for the
given target. There is no `'source'` target privileged by the compiler;
source is the substrate the parser consumed, recoverable through the inverse
of any declared target.

`parse()` is no longer exported. Schemas that want an AST view declare
`.render('ast', { ... })` and the runtime exposes that via `render(input,
{type:'ast'})`. The captures-tree / CST that the parser builds internally
stays as a compiler implementation detail.

The runtime dispatch table is statically built per generated parser:

```ts
const __renderDispatch: Record<string, (input: string) => unknown> = {
  ast:  __render_ast,
  json: __render_json,
  // ...one entry per declared target
};

export function render(input: string, options?: { type?: string }): unknown {
  const target = options?.type ?? <default-or-required>;
  const fn = __renderDispatch[target];
  if (!fn) throw new Error("render: unknown target '" + target + "'");
  return fn(input);
}
```

Default-target behavior is a follow-up decision: either no default (caller
must pass `type`), or per-schema default declared in `defineSchema({
defaultTarget: 'ast' })`. Both are easy; pick one when the implementation
lands.

## Forward emit

For each declared `(production, target)` pair the compiler emits a builder:

```ts
function __build_<Production>_<target>(captures: Captures): <value>
```

Builder emit is structural over the body:

| body shape                         | emitted JS                                                   |
| --                                 | --                                                           |
| scalar (`42`, `true`, `null`, `"x"`) | the JS literal                                             |
| `$.name`                           | `captures.<name>`                                            |
| `$.gap("a", "b")` and similar refs | `captures.<derived>`                                         |
| object `{k1: v1, k2: v2}`          | `{ "k1": <build(v1)>, "k2": <build(v2)> }`                   |
| array `[a, b, c]`                  | `[<build(a)>, <build(b)>, <build(c)>]`                       |
| `Template { parts, slots }`        | `seg0 + captures.<slot0> + seg1 + captures.<slot1> + seg2 + ...` |

The per-target dispatcher selects the production builder based on which
production matched. The parser already knows this — no `s.type` lookup is
required to dispatch (in contrast to today's `stringify(ast, ...)` which
discriminates on `ast.type`). For string-valued targets this is a fused
emit: no intermediate object allocation.

For object-valued targets, the dispatcher allocates the object as the body
prescribes and returns it. Subsequent `stringify(obj, ...)` calls feed the
inverse machinery (Section 5).

Note the asymmetry: the *forward* dispatcher uses the matched production as
input — discrimination is free. The *inverse* dispatcher receives only the
value, with no record of how it was produced, so it has to discriminate
from value shape. That's why production discrimination is a precondition
for inverse derivation (Section 5, precondition 2), not for forward.

## Inverse derivation

For each `(production, target)` the compiler derives an inverse function:

```ts
function __invert_<Production>_<target>(value: <body-shape>): Captures
```

Once captures are recovered, source reconstruction is a single
**target-independent** subroutine: it interleaves the production's literal
spans with the captured texts in the order the parser consumed them, using
captured `$.gap` slots where present and a single-space default where not.
This subroutine already lives inside today's `attachSourceTemplates` /
source-emit code and gets repurposed as a shared `__rebuild_<Production>` —
called by every target's inverse dispatcher, not per-target.

### Derivation cases

- **Object body.** Inverse reads each field as a capture; asserts literal
  fields match (e.g. `obj.type === "decl"`). Trivially unambiguous.
- **Array body.** Inverse positional. Length must be statically known (no
  spread, no `$.rest`); this is enforceable.
- **Scalar body.** Inverse asserts equality. Yields no captures itself; the
  production has no free slots in this target.
- **`$.name` bare body.** Inverse reads the value into `captures.<name>`
  directly.
- **`Template` body.** Inverse is a tiny parser whose alphabet is the
  template's literal segments. Walk the segments; between consecutive
  literals `L_i` and `L_{i+1}`, read the captured text by scanning until
  `L_{i+1}` matches. Same algorithm as the parser's `.until([...])` scan,
  applied to the template's literal layout. The first literal segment is the
  starting prefix; the last literal segment is the terminator.

### Preconditions

1. **Adjacent slots must be separated by a non-empty literal.**
   `tpl`${$.a}${$.b}`` is ambiguous (no boundary between captures); compile
   error: *"target T, production P: slots `a` and `b` are adjacent with no
   separator; provide explicit options.inverse"*.
2. **Per-target production discrimination.** When multiple productions
   declare the same target with overlapping literal prefixes, the inverse
   dispatcher cannot tell which production a piece of text came from.
   Discrimination strategies (in priority order):
   - Object-valued targets: discriminate on the body's literal field values
     (e.g. `obj.type === "decl"` vs `obj.type === "rule"`).
   - String-valued targets: discriminate on the unique literal prefix of
     each production's body.
   - Compile error if neither works — author has to make one production
     distinguishable.
3. **Nested captures preserve their `.until` set.** A span captured with
   `.until([":", ";", "}"])` has its terminator set threaded into the
   derived inverse, so the inverse stops at the same places the forward
   parser does. No compile error; this is automatic from the schema info.

### Explicit inverse override

```ts
.render("html",
  tpl`<dd>${$.text}</dd>`,
  { inverse: tpl`<dd>${$.text}</dd>` },
)
```

The override is a `Template` consumed by the same inverse-parser machinery.
The intended use is the case where forward and inverse templates differ
syntactically (e.g. the forward emits HTML-escaped content but the inverse
needs to read raw text). For symmetric templates the override is rarely
needed; document it as the escape hatch, not the default.

## Compiler structure

| File (today)                                       | After                                  |
| --                                                 | --                                     |
| `packages/compiler/src/infer/templates.ts`         | `infer/render-targets.ts` (rewritten)  |
| `packages/compiler/src/infer/source-template.ts`   | deleted; logic moves into shared `__rebuild_<Production>` emit |
| `packages/compiler/src/infer/json-auto-template.ts`| deleted                                |
| `packages/compiler/src/emit/stringify.ts`          | split into `emit/render.ts` (forward) + `emit/inverse.ts` (inverse) |
| `packages/compiler/src/emit/render.ts`             | rewritten to use the per-target dispatch table |
| —                                                  | new: `infer/invert.ts` — derivation pass |

`packages/compiler/src/index.ts` becomes a thin orchestrator:

```ts
attachRenderTargets(nodeTypes);   // walks .render(...) calls per production
deriveInverses(nodeTypes);        // populates per-target inverse code
const { ... } = buildTokenizerProgram(...);
```

The `RESERVED_TARGETS` set is deleted. The `validate(nodeTypes)` pass picks
up the per-target completeness check (Section 1 rule 6).

## Per-package migration

Affected packages (each has at least one `.structure({...})` and one
`.stringify(...)` call): `arn`, `cron`, `css`, `css-color`,
`css-length-percentage`, `html`, `log`, `mac`, `markdown`, `proto`, `url`.

Migration is mechanical per example block:

1. Replace `.structure({...})` with `.render("ast", {...})`.
2. Replace each `.stringify(target, tpl)` with `.render(target, tpl)`.
3. Decide whether the package wants an explicit `'source'` target for
   round-trip tests. Per design rule 6, this is all-or-nothing — either
   *every* production in the package declares `'source'`, or none do.
   Most packages will declare it; a one-off migration script can extract
   today's auto-derived source template per production and emit it as
   `.render("source", tpl`...`)` so authors don't write it by hand. The
   script is a migration aid, not a permanent compiler feature.
4. Regenerate the parsers (`npm run generate`).
5. Run the existing per-package test suites. Round-trip tests now go
   through `stringify(render(input, {type:T}), {type:T})` for whichever
   target the package declared as its round-trip identity.

The CSS package's recent `.stringify("json", tpl`...`)` work (commit
`d13416e`) becomes the migration template — schemas that already have a
custom JSON target just rename `.stringify` to `.render`. The CSS
`'json-auto'` target disappears entirely; the CSS `bench/json.ts` keeps
only the `'json'` contestant.

## Testing surface

- **Round-trip property tests per `(package, target)`.** For each example
  fixture: `assert deepEqual(render(stringify(render(x, T), T), T),
  render(x, T))`. Lives in each package's test directory; the
  test-harness for the assertion lives in the `parser` package (shared).
- **Inverse-derivability golden tests.** Goldens under
  `packages/compiler/test/inverse-goldens/` capture the derived inverse
  JS for each `(target, production)` in a representative schema (we use the
  CSS schema as the canary because it exercises all body shapes). Detects
  accidental changes to derivation behavior across compiler refactors.
- **Compile-time error fixtures.** Under
  `packages/compiler/test/error-fixtures/`: schemas with adjacent slots
  (precondition 1), with one-production-missing-a-target (rule 6), with
  indistinguishable productions (precondition 2). Each asserts the
  expected compile error message.
- **Bench parity.** The existing `packages/css/bench/json.ts` keeps its
  forward measurements (`parser2 render json`); add a reverse counterpart
  (`parser2 stringify json`) to measure inverse-direction throughput as a
  regression signal.

## Risks and known trickiness

- **Production discrimination for arbitrary string targets** (precondition
  2 in Section 5). For carefully-designed targets this is fine; for ad-hoc
  author templates it is the most likely source of compile errors. Mitigated
  by: clear error messages that point at the colliding productions, and a
  short docs page documenting the common patterns that disambiguate
  (distinct keyword prefixes, distinct opening punctuation).
- **`.gap` slots inside the body affect the inverse.** A target whose
  template surfaces `$.gap("prop", "value")` will round-trip the whitespace
  between `prop` and `value` byte-perfectly. A target that omits the gap
  slot loses that info on the way back; the rebuild subroutine fills in a
  single-space default. This is the value-stable-not-byte-stable boundary
  in practice.
- **Recursive sub-grammars.** A production whose body contains
  `$.expression` where `expression` is itself a span resolved by another
  production needs the inverse for the sub-production. Implementation:
  derive inverses bottom-up over the production graph; emit per-target
  inverse dispatchers that recurse just like the forward dispatchers do.
- **Breaking-change scope.** Every package in the monorepo is touched. The
  migration commits should be staged: first the compiler change with a
  flag-guarded fallback, then per-package migrations one at a time, then
  the flag removal. (Detail belongs in the implementation plan, not this
  spec.)
- **Performance of the inverse direction.** Today's bench focuses on
  forward (`render`) throughput. The inverse is a new codepath; first
  measurements may surprise. Risk is bounded — the inverse is one parser
  per template, same algorithmic class as the existing `.until()` scan
  machinery the forward parser already uses.

## Out of scope

- Default target selection (`defineSchema({ defaultTarget })` vs require
  caller to pass `type`). Easy follow-up; document the choice when
  implementing.
- Generated per-package TypeScript surfaces for `render` (discriminated
  overloads per declared target). Real ergonomic win, but a
  declarations-emit detail; not architecturally load-bearing.
- Streaming `render`. Today's `render` is synchronous and string-returning;
  staying that way for v1.
- Lens-laws verification (well-behavedness, well-formedness). Round-trip
  property tests cover the practical surface; formal verification is a
  research project.
