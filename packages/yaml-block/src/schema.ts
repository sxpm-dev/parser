import { $, defineSchema, ex, tpl } from '@parser2/parser';

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
    ex('hello world')
      .as('YamlScalar')
      .span('value', 'hello world').until('\n')
      .render('ast', $.value)
      .render('source', tpl`${$.value}`)
      .build(),

    // --- YamlMappingEntry: `key: value` where value is any YamlNode.
    //     The space after the colon is optional (handles `key:value` too).
    //     The value span dispatches to YamlMapping first (nested block wins
    //     over scalar) before falling through to YamlScalar.
    ex('foo: bar')
      .as('YamlMappingEntry')
      .span('key', 'foo').ident().css()
      .span(':')
      .span(' ').optional()
      .span('value', 'bar', ['YamlMapping', 'YamlSequence', 'YamlScalar'])
      .render('ast', { type: 'entry', key: $.key, value: $.value })
      .render('source', tpl`${$.key}: ${$.value}`)
      .build(),

    // --- YamlMapping: indented block of YamlMappingEntry lines.
    //     Uses .indent() to gate each iteration on the column of the first
    //     entry; exits cleanly when the next non-blank line dedents.
    //     The span text matches the full example so synthesizePieces can
    //     locate it; the text is not used during recursive parsing.
    ex(`foo: 1
bar: 2`)
      .as('YamlMapping')
      .span('entries', 'foo: 1\nbar: 2', ['YamlMappingEntry']).indent().repeats({ min: 1 })
      .render('ast', { type: 'mapping', entries: $.entries })
      .render('source', tpl`${$.entries}`)
      .build(),

    // --- YamlSequenceItem: `- value` where value is any YamlNode.
    ex('- foo')
      .as('YamlSequenceItem')
      .span('- ')
      .span('value', 'foo', ['YamlMapping', 'YamlSequence', 'YamlScalar'])
      .render('ast', { type: 'item', value: $.value })
      .render('source', tpl`- ${$.value}`)
      .build(),

    // --- YamlSequence: indented block of YamlSequenceItem lines.
    ex(`- a
- b`)
      .as('YamlSequence')
      .span('items', '- a\n- b', ['YamlSequenceItem']).indent().repeats({ min: 1 })
      .render('ast', { type: 'sequence', items: $.items })
      .render('source', tpl`${$.items}`)
      .build(),

    // --- YamlNode: dispatches to Mapping > Sequence > Scalar.
    //     YamlMapping is tried first so `key: value` blocks (which start with
    //     letter bytes) are correctly recognized as mappings rather than scalars.
    //     YamlScalar is the final fallback.
    ex('hello')
      .as('YamlNode')
      .span('node', 'hello', ['YamlMapping', 'YamlSequence', 'YamlScalar'])
      .render('ast', $.node)
      .render('source', tpl`${$.node}`)
      .build(),

    // --- YamlBlock: root — a single YamlNode (top-level mapping or sequence).
    ex('foo: bar')
      .as('YamlBlock')
      .span('root', 'foo: bar', ['YamlNode'])
      .render('ast', $.root)
      .render('source', tpl`${$.root}`)
      .build(),
  ],
});
