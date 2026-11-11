# Example-inferred syntax

The source of a parser is concrete input/output pairs plus explicit generalization metadata. The compiler infers fixed literals, capture locations, separators, output placement, and canonical reverse formatting. Inference runs at build time. A generated module imports neither this schema nor a parsing library.

```ts
import { defineSchema, text, list } from './packages/compiler/src/schema.ts';
const schema = defineSchema({
  input: 'source', output: 'record', root: 'entry',
  productions: {
    entry: {
      examples: [
        { source: 'color: red;', record: { property: 'color', value: 'red' } },
        { source: 'margin: 12px;', record: { property: 'margin', value: '12px' } },
      ],
      fields: {
        property: text({ pattern: '[-a-z]+' }),
        value: text({ balanced: true }),
      },
    },
  },
  encodings: { json: { from: 'record', format: 'json' } },
});
```

Here `property` and `value` name paths in the default output. Their concrete values locate captures in the example input. The compiler infers the colon, semicolon, and their order. It emits parsing of unseen values satisfying the declared constraints, not lookup of known examples.

## Metadata

- `text({pattern})`: a full-string, Unicode regular-expression constraint. Patterns are compiled once. No regex inference is attempted.
- `prefix: ['@']`: constrain text prefixes and reject alternatives early. This is generic lexical metadata, not a special at-rule primitive.
- `balanced: true`: respect the schema's quotes, escapes, bracket pairs and comments while finding inferred boundaries.
- `reject: [';', '}']`: forbidden top-level boundaries before the inferred delimiter. Delimiters inside balanced regions are unaffected.
- `allowEmpty: true`: permit an empty captured string. Otherwise strings must be nonempty after trimming.
- `list(text(...), {min: 1})`: infer a text-list separator from an example with two or more items. A one-item example needs explicit `separator` metadata. A list's length is generalized; its minimum is explicit (default 0).
- `list(['declaration', 'rule'])`: ordered recursive alternatives. Examples locate the list; references permit arbitrarily many children, subject to nesting limits. These references are names of productions, never runtime callbacks.
- `optionalEnd: ['}']`: the final inferred literal may be absent before these boundaries or EOF. This expresses a final optional semicolon without accepting missing separators between declarations.

Lexical configuration supplies `pairs`, `quotes`, `escape`, `comments`, `regions` (balanced interpolation openers), and `commentFree` (balanced regions whose contents do not recognize comments, such as an unquoted URL). Bracket and region closers are single characters. Schema comment syntax and dialect-specific interpolation live only in schema data.

Whitespace between inferred literal tokens is insignificant. Captured strings are trimmed. Canonical serialization uses the first example's punctuation and spacing. Comments between constructs are skipped; comments inside opaque captured text remain part of that text. Exact source preservation is not promised.

## Nested examples

The CSS schema's rule example pairs:

```ts
{
  css: '.button, #button { color: red; }',
  object: {
    selectors: ['.button', '#button'],
    children: [{ property: 'color', value: 'red' }],
  },
}
```

with a text list for `selectors` and recursive alternatives for `children`. The comma and braces come from the example. The compiler resolves concrete child output objects to child examples and their inferred inverse layout. More nesting does not require enumerating depths.

Use finite, unambiguous seed examples. Capture text must occur uniquely and captures must not overlap. Child examples should use the same concrete spelling as their occurrences in parent examples. If examples describe distinct literal layouts, put them in separate productions. Examples validate the complete generated parser at compile time; they are not discarded after alignment.

## Outputs and bidirectionality

Output names have no built-in AST meaning. Each example may contain multiple output values, including differently nested objects, tuples, constants and captured strings/lists. The compiler matches example values to infer each projection and emits corresponding TypeScript types.

Every production currently supplies the same output names. Each output must retain all captures, allowing a reverse mapping. Dropped captures, ambiguous bindings, duplicate productions, adjacent unseparated captures, unresolved references, left recursion, and inconsistent examples fail compilation. Ordered overlapping alternatives remain an explicit schema choice; this is not a general proof of grammar unambiguity.

An encoded output such as JSON is a declared serialization of a structured output. It does not introduce a special intermediate AST.

```ts
parse(css);                         // default example-defined output
parse(css, { output: 'json' });      // JSON text
stringify(value);                    // canonical CSS
stringify(json, { input: 'json' });  // JSON text -> canonical CSS
validate(css);                      // throws on structural failure
```

`stringify` checks output shape and validates its reconstruction through the same ordered generated grammar. In comparison mode the parser checks captures and recursive list items directly against the supplied value, without constructing a second output tree or performing a separate deep-equality walk. It still rejects delimiter injection, extra enumerable properties, invalid values, and objects that would select a different grammar alternative. It is a checked inverse, not an unchecked printer. `validate` currently uses the same allocating parse path. Parsing consumes the entire input; failures throw `SyntaxError` with an `offset`. Recursion defaults to 256 production calls (configurable from 1 to 512); inverse recursion is capped at 256.

## CSS, Less, SCSS scope

All three are separate packages with separate generated modules. Less and SCSS reuse CSS schema data at build time; no cross-package runtime import is emitted.

- CSS: selector lists, nested rules, declarations, custom-property balanced values, block/statement at-rules, comments, quoted and escaped text, empty blocks, and final optional declaration semicolons.
- Less: adds `@` variables, interpolated names, mixin calls, mixin definitions/guards as selector text, detached rulesets as balanced variable values, and line comments.
- SCSS: adds `$` variables, interpolation, nested property groups, line comments, and directive blocks/statements for mixins, includes, loops and conditionals.

This is a structural syntax parser, not a complete standards validator or a Less/Sass evaluator. Selectors, property values, at-rule preludes, mixin arguments, guards and expressions remain text. Property-value semantics, selector semantics, module resolution, variable evaluation, mixin expansion and flattening nested selectors are not implemented. Vendor-specific lexical extensions, arbitrary whitespace changes inside a teaching capture, and every historical preprocessor syntax variation are not claimed covered. Acceptance must not be used as proof of valid CSS or successful Sass/Less compilation.

## Additional composition metadata

- `ref(['production', ...])`: one child selected through ordered alternatives, projected directly into the example-defined field (including a root scalar). Recursive references must follow consumed syntax.
- `text({token: true, pattern})`: consume a nonempty sticky regular-expression match at the cursor. This uses normal regexp alternative order, not longest-alternative inference. It permits adjacent captures when the earlier capture has an explicit token boundary. `allowEmpty` permits empty tokens in delimiter-separated fields.
- `text({stop: [...]})`: additional top-level boundaries for opaque capture spans.
- `list(..., {whileMatches: true})`: stop when no child production matches, leaving enclosing syntax to the caller. Full input consumption is still required at the root. No-progress children are rejected.
- `list(..., {stop: [...]})`: explicit enclosing boundaries, useful for record/line compositions.
- `list(..., {trailing: true})`: permit a separator before an enclosing boundary or EOF. Default is false.
- `lexical.whitespace`: `all` (default), `horizontal`, or `none`. Horizontal mode preserves line breaks; none preserves every character, including CSV/markup text spacing.

A nonempty teaching example is still required to infer each list layout. Further examples may demonstrate an empty list; those examples are checked against the generated parser rather than used to locate an empty source span. Reference projections preserve exact object shape during inference and checked inverse conversion.

The migration packages intentionally expose different projections: for example JSON scalar spellings, expression precedence sequences, HTML tokens, and indentation-bearing YAML block records. Their package READMEs describe supported syntax and exclusions; package presence is not a claim of complete standards conformance or compatibility with a competitor's output shape.
