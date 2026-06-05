import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';

// JSON parser schema. Root is JsonValue, which dispatches to the
// JSON value type productions. Strict-JSON-only at this stage;
// JSON5 extensions are layered in later tasks.

export default defineSchema({
  rootType: 'JsonValue',
  defaultTarget: 'ast',
  punctuators: {
    lbrace: '{', rbrace: '}',
    lbracket: '[', rbracket: ']',
    colon: ':',
    comma: ',',
  },
  tokens: ['number', 'string', 'comment'],
  examples: [
    // --- JsonNull --------------------------------------------------------
    relation('JsonNull', {
      input: 'null',
      encodings: {
        parse: parse([literal('null')]),
        ast: null,
        source: 'null',
      },
    }),

    // --- JsonTrue --------------------------------------------------------
    relation('JsonTrue', {
      input: 'true',
      encodings: {
        parse: parse([literal('true')]),
        ast: true,
        source: 'true',
      },
    }),

    // --- JsonFalse -------------------------------------------------------
    relation('JsonFalse', {
      input: 'false',
      encodings: {
        parse: parse([literal('false')]),
        ast: false,
        source: 'false',
      },
    }),

    // --- JsonNumber -----------------------------------------------------
    // Single production. `.scientific()` is the broadest number refinement —
    // accepts int, float, and exponent forms. The compiler's number scanner
    // also handles optional leading sign so negatives work without a
    // separate production. `.coerce()` makes the captured value a JS
    // number (Number(slice)) so `ast: $.value` matches JSON.parse.
    relation('JsonNumber', {
      input: '42',
      encodings: {
        parse: parse([span('value', '42').number().scientific().coerce()]),
        ast: $.value,
        source: $.value,
      },
    }),

    // --- JsonString: double-quoted --------------------------------------
    // `.coerce()` makes the captured value the parsed JS string (escape
    // sequences processed, surrounding quotes stripped) so `ast: $.value`
    // matches JSON.parse output.
    relation('JsonString', {
      input: '"hello"',
      encodings: {
        parse: parse([span('value', '"hello"').string().doubleQuoted().coerce()]),
        ast: $.value,
        source: $.value,
      },
    }),

    // --- JsonArray ------------------------------------------------------
    relation('JsonArray', {
      input: '[1,2]',
      encodings: {
        parse: parse([
          literal('['),
          span('items', '1,2').of('JsonValue').repeats({ sep: ',', min: 0 }),
          literal(']'),
        ]),
        ast: $.items,
        source: tpl`[${$.items}]`,
      },
    }),

    // --- JsonValue: dispatcher (grows as productions are added) ----------
    relation('JsonValue', {
      input: 'true',
      encodings: {
        parse: parse([
          span('node', 'true').of('JsonArray', 'JsonString', 'JsonNumber', 'JsonTrue', 'JsonFalse', 'JsonNull'),
        ]),
        ast: $.node,
        source: $.node,
      },
    }),
  ],
});
