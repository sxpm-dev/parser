# Example-First Structure DSL

The parser packages are schema packages. They should describe strings and expected
outputs, not implement parser generators.

The core pipeline is:

```txt
schema examples -> compiler inference -> optimized generated parser
```

`parse()` returns a structure. An AST is only one possible structure. A schema may
describe a full syntax tree, a partial extractor, a metric, a list of spans, or a
domain object.

## Required Layer: Examples

Examples are the primary source of truth.

```ts
ex('.foo:hover { color: red }')
  .tokens([...])
  .structure({
    type: 'stylesheet',
    hoverSelectors: ['.foo:hover'],
    declarations: [{ prop: 'color', value: 'red' }],
  });
```

The compiler uses examples to infer:

- token names and literal spans
- structure names and fields
- normalization behavior
- ignored text
- representative invalid/recovery cases

## Optional Layer: Rules

Rules exist when examples alone are not enough or when they would make inference
ambiguous or slow.

```ts
ex.rule('value')
  .from('"x"').node('string')
  .from('1').node('number')
  .from('{ "a": %value% }').node('object')
  .from('[%value%]').node('array');
```

Rules should simplify compiler work. They should not become handwritten parser
logic.

## Optional Layer: Policies

Recovery, syntax errors, and stringify behavior are schema policy. The compiler
owns implementation and optimization.

```ts
ex('.a { color red; background: blue; }')
  .invalid('missing-colon')
  .recover((r) => r.at('Declaration').onFail().skipUntil(';', '}').drop());
```

## Non-Goals

Parser packages must not provide `codegen.ts`, parser templates, fallback parser
libraries, or custom runtime parser implementations.

The compiler must not branch on package names such as CSS, JS, or JSON. Any extra
power needed by a mature parser should be expressed as generic schema data.
