import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';

// TOML — a usefully-sized subset of v1.0.0. Implemented here:
//
//   - Bare-key = value pairs at document root
//   - Tables: [name] with their own key=value pairs
//   - Values: double-quoted strings, integers, booleans (true / false)
//   - Bare keys (ident-shaped)
//
// Deferred (each one is a straightforward extension, left out to keep
// the first pass small and focused on the engine's strengths):
//   - Dotted keys (a.b.c = …)
//   - Arrays, inline tables, array of tables ([[…]])
//   - Floats, multi-line strings, literal strings, dates / times
//   - Comments (would use the comment class with .line('#') once that's
//     fully wired through v2 codegen — defer alongside other deferrals)
//
// Round-trip note: the document and table bodies use list-slot captures
// (`items`, `pairs`), so multi-element source-target stringify hits the
// same list-splitter gap noted in @parser2/iso-duration. Parse + ast
// round-trip works for any document size; source-target byte-stable
// round-trip is documented as single-pair / single-table only.
//
// Targets:
//   ast    — { type:'document', items:[…pair|table…] }
//   source — canonical TOML string (single-space joins between items)

export default defineSchema({
  rootType: 'Document',
  defaultTarget: 'ast',
  punctuators: {
    eq: '=',
    lbracket: '[',
    rbracket: ']',
  },
  tokens: ['number', 'string'],
  examples: [
    // ---- Value: string ------------------------------------------------
    relation('Value', {
      input: '"hello"',
      encodings: {
        parse: parse([span('value', '"hello"').string().doubleQuoted()]),
        ast: { type: 'string', value: $.value },
        source: tpl`${$.value}`,
      },
    }),
    // ---- Value: boolean ----------------------------------------------
    relation('Value', {
      input: 'true',
      encodings: {
        parse: parse([literal('true')]),
        ast: { type: 'boolean', value: true },
        source: tpl`true`,
      },
    }),
    relation('Value', {
      input: 'false',
      encodings: {
        parse: parse([literal('false')]),
        ast: { type: 'boolean', value: false },
        source: tpl`false`,
      },
    }),
    // ---- Value: integer (slot-only — declared LAST so the inverse
    // dispatcher's startsWith ladder tries the prefixed forms first) ---
    relation('Value', {
      input: '42',
      encodings: {
        parse: parse([span('value', '42').number().int()]),
        ast: { type: 'integer', value: $.value },
        source: tpl`${$.value}`,
      },
    }),

    // ---- Pair --------------------------------------------------------
    relation('Pair', {
      input: 'key = "hello"',
      encodings: {
        parse: parse([
          span('key', 'key').ident().css(),
          literal('='),
          span('value', '"hello"').of('Value'),
        ]),
        ast: { type: 'pair', key: $.key, value: $.value },
        source: tpl`${$.key} = ${$.value}`,
      },
    }),

    // ---- Table -------------------------------------------------------
    // `pairs` repeats over Pair until the next dispatcher candidate
    // (next `[` table header or EOF) — at which point Pair's leading
    // ident-start scan fails, the repeats loop exits cleanly, and the
    // outer Document repeats picks up the next item.
    relation('Table', {
      input: '[server] host = "localhost"',
      encodings: {
        parse: parse([
          literal('['),
          span('name', 'server').ident().css(),
          literal(']'),
          span('pairs', 'host = "localhost"').of('Pair').repeats({ min: 0 }),
        ]),
        ast: { type: 'table', name: $.name, pairs: $.pairs },
        source: tpl`[${$.name}] ${$.pairs}`,
      },
    }),

    // ---- Document root ----------------------------------------------
    // Multi-role list dispatches between Pair (first byte is an ident
    // start) and Table (first byte is `[`). The standard-whitespace
    // policy absorbs the newlines that real-world TOML uses as item
    // separators.
    relation('Document', {
      input: 'k = 1',
      encodings: {
        parse: parse([
          span('items', 'k = 1').of('Pair', 'Table').repeats({ min: 0 }),
        ]),
        ast: { type: 'document', items: $.items },
        source: tpl`${$.items}`,
      },
    }),
  ],
});
