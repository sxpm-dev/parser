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
// MVP limitations (Phase 7 indent primitive):
//   - Only ASCII space counts for indent column; tabs not supported.
//   - Stringify joins indent-block children with '\n' only (no leading spaces).
//     This means nested mappings/sequences lose indentation when stringified,
//     so round-trip is value-stable only for flat structures (no nested blocks
//     as mapping values).
//   - The round-trip tests use only flat scalar-valued entries and flat
//     sequences to avoid the nested-indentation loss in the stringifier.
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
    //     The span text matches the full example so synthesizePieces can
    //     locate it; the text is not used during recursive parsing.
    relation('YamlMapping', {
      input: 'foo: 1\nbar: 2',
      encodings: {
        parse: parse([
          span('entries', 'foo: 1\nbar: 2').of('YamlMappingEntry').indent().repeats({ min: 1 }),
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

    // --- YamlSequence: indented block of YamlSequenceItem lines.
    relation('YamlSequence', {
      input: '- a\n- b',
      encodings: {
        parse: parse([
          span('items', '- a\n- b').of('YamlSequenceItem').indent().repeats({ min: 1 }),
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
