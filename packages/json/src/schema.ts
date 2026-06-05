import { $, defineSchema, literal, parse, relation, span } from '@parser2/parser';

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

    // --- JsonValue: dispatcher (grows as productions are added) ----------
    relation('JsonValue', {
      input: 'true',
      encodings: {
        parse: parse([
          span('node', 'true').of('JsonTrue', 'JsonFalse', 'JsonNull'),
        ]),
        ast: $.node,
        source: $.node,
      },
    }),
  ],
});
