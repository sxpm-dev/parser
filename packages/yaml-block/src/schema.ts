import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';

// YAML-block subset schema. Supports:
//   - Scalars: bare one-line values (letters, digits, dots, hyphens, etc.)
//   - Mapping entries: `key: value` where value is any YamlNode
//   - Mappings: indented block of YamlMappingEntry lines
//   - Sequence items: `- value` where value is any YamlNode
//   - Sequences: indented block of YamlSequenceItem lines
//   - YamlNode: dispatches to Mapping > Sequence > Scalar in that order
//     (mapping is tried first so nested blocks are preferred over scalars)
//   - YamlBlock: root — a single YamlNode (top-level mapping or sequence)
//
// Indent semantics (Phase 7 primitive + follow-ups):
//   - Only ASCII space counts for indent column; tabs not supported.
//   - Nested-indent round-trip is correct on both directions: the inverse
//     stringify path (Task 7.7b) and the forward render path (Phase 7
//     follow-up #1) both thread per-level indent columns through their
//     generated builders, so `render(input, {target:'source'})` and
//     `stringify(ast, {target:'ast'})` produce correctly indented multi-
//     line output for nested mappings/sequences.
//   - Nested-block round-trip tests live in test/round-trip.test.ts;
//     forward-source indent tests live in test/forward-source-indent.test.ts.
//
// `unknownChars: 'tolerate'` is required so that scalar values containing
// dots (3.14, api.example.com), slashes (path/to/file), colons in URLs, etc.
// are captured correctly by the `.until('\n')` modifier.

export default defineSchema({
  rootType: 'YamlBlock',
  unknownChars: 'tolerate',
  examples: [
    // --- YamlScalar: a bare value — captures everything up to (not including)
    //     the next newline. EOF also terminates the capture. The trimming in
    //     parseUntilSpan strips trailing whitespace.
    relation('YamlScalar', {
      input: 'hello world',
      encodings: {
        parse: parse([
          span('value', 'hello world').until('\n'),
        ]),
        ast: $.value,
        source: tpl`${$.value}`,
      },
    }),

    // --- YamlMappingEntry: `key: value` where value is any YamlNode.
    //     The space after the colon is optional (handles `key:value` too).
    //     The value span dispatches to YamlMapping first (nested block wins
    //     over scalar) before falling through to YamlScalar.
    relation('YamlMappingEntry', {
      input: 'foo: bar',
      encodings: {
        parse: parse([
          span('key', 'foo').ident().css(),
          literal(':'),
          literal(' ').optional(),
          span('value', 'bar').of('YamlMapping', 'YamlSequence', 'YamlScalar'),
        ]),
        ast: { type: 'entry', key: $.key, value: $.value },
        source: tpl`${$.key}: ${$.value}`,
      },
    }),

    // --- YamlMapping: indented block of YamlMappingEntry lines.
    //     Uses .indent() to gate each iteration on the column of the first
    //     entry; exits cleanly when the next non-blank line dedents.
    //     The span text is empty — `.of(roles).repeats({min:1})` is a
    //     required-recursive-repeats shape; synthesizePieces synthesizes
    //     its slot directly without needing the example text.
    relation('YamlMapping', {
      input: 'foo: 1\nbar: 2',
      encodings: {
        parse: parse([
          span('entries').of('YamlMappingEntry').indent().repeats({ min: 1 }),
        ]),
        ast: { type: 'mapping', entries: $.entries },
        source: tpl`${$.entries}`,
      },
    }),

    // --- YamlSequenceItem: `- value` where value is any YamlNode.
    relation('YamlSequenceItem', {
      input: '- foo',
      encodings: {
        parse: parse([
          literal('- '),
          span('value', 'foo').of('YamlMapping', 'YamlSequence', 'YamlScalar'),
        ]),
        ast: { type: 'item', value: $.value },
        source: tpl`- ${$.value}`,
      },
    }),

    // --- YamlSequence: indented block of YamlSequenceItem lines. Same
    //     empty-text shape as YamlMapping above.
    relation('YamlSequence', {
      input: '- a\n- b',
      encodings: {
        parse: parse([
          span('items').of('YamlSequenceItem').indent().repeats({ min: 1 }),
        ]),
        ast: { type: 'sequence', items: $.items },
        source: tpl`${$.items}`,
      },
    }),

    // --- YamlNode: dispatches to Mapping > Sequence > Scalar.
    //     YamlMapping is tried first so `key: value` blocks (which start with
    //     letter bytes) are correctly recognized as mappings rather than scalars.
    //     YamlScalar is the final fallback.
    relation('YamlNode', {
      input: 'hello',
      encodings: {
        parse: parse([
          span('node', 'hello').of('YamlMapping', 'YamlSequence', 'YamlScalar'),
        ]),
        ast: $.node,
        source: tpl`${$.node}`,
      },
    }),

    // --- YamlBlock: root — a single YamlNode (top-level mapping or sequence).
    relation('YamlBlock', {
      input: 'foo: bar',
      encodings: {
        parse: parse([
          span('root', 'foo: bar').of('YamlNode'),
        ]),
        ast: $.root,
        source: tpl`${$.root}`,
      },
    }),
  ],
});
