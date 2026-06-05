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

    // --- JsonValue: dispatcher (grows as productions are added) ----------
    relation('JsonValue', {
      input: 'null',
      encodings: {
        parse: parse([
          span('node', 'null').of('JsonNull'),
        ]),
        ast: $.node,
        source: $.node,
      },
    }),
  ],
});
