import { $, defineSchema, dynKey, literal, merge, parse, relation, span, tpl } from '@parser2/parser';

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
  tokens: [
    'number',
    'string',
    // Phase 4c v5: the `line` refinement opts into JSON5 `// ...\n`
    // line-comment support in the leading/trailing skip, the
    // inter-span gap, and the `.repeats()` sep-sweep.
    { class: 'comment', refinements: [{ name: 'line', args: ['//'] }] },
  ],
  examples: [
    // --- Comment (block) -------------------------------------------------
    // Not surfaced in the AST; recognized by the tokenizer so standard
    // whitespace can absorb it between spans (JSON5 tolerance).
    relation('Comment', {
      input: '/* hello */',
      encodings: {
        parse: parse([
          span('text', '/* hello */').comment().block('/*', '*/'),
        ]),
        ast: null,
        source: tpl`${$.text}`,
      },
    }),

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

    // JSON5: single-quoted string. Same body shape as the canonical
    // double-quoted production; the compiler's first-declared-wins
    // inverse relaxation (Phase 4c v6) means stringify always emits
    // double quotes, so round-trip from a single-quoted source
    // canonicalizes.
    relation('JsonString', {
      input: "'hello'",
      encodings: {
        parse: parse([span('value', "'hello'").string().singleQuoted().coerce()]),
        ast: $.value,
        source: $.value,
      },
    }),

    // --- JsonArray ------------------------------------------------------
    // `trailing: 'allowed'` accepts JSON5 trailing commas on input; the
    // inverse rebuild emits no trailing comma (canonical strict JSON).
    relation('JsonArray', {
      input: '[1,2]',
      encodings: {
        parse: parse([
          literal('['),
          span('items', '1,2').of('JsonValue').repeats({ sep: ',', min: 0, trailing: 'allowed' }),
          literal(']'),
        ]),
        ast: $.items,
        source: tpl`[${$.items}]`,
      },
    }),

    // --- JsonMember: quoted key -----------------------------------------
    relation('JsonMember', {
      input: '"a":1',
      encodings: {
        parse: parse([
          span('key', '"a"').string().doubleQuoted().coerce(),
          literal(':'),
          span('value', '1').of('JsonValue'),
        ]),
        ast: dynKey($.key, $.value),
        source: tpl`${$.key}:${$.value}`,
      },
    }),

    // JSON5: unquoted identifier key. Same body shape as the canonical
    // quoted variant; the first-declared-wins relaxation (Phase 4c v6)
    // means stringify always emits the quoted form so round-trip
    // canonicalizes.
    relation('JsonMember', {
      input: 'a:1',
      encodings: {
        parse: parse([
          span('key', 'a').ident().js(),
          literal(':'),
          span('value', '1').of('JsonValue'),
        ]),
        ast: dynKey($.key, $.value),
        source: tpl`${$.key}:${$.value}`,
      },
    }),

    // --- JsonObject -----------------------------------------------------
    // `trailing: 'allowed'` accepts JSON5 trailing commas; canonical
    // stringify output drops them.
    relation('JsonObject', {
      input: '{"a":1,"b":2}',
      encodings: {
        parse: parse([
          literal('{'),
          span('entries', '"a":1,"b":2').of('JsonMember').repeats({ sep: ',', min: 0, trailing: 'allowed' }),
          literal('}'),
        ]),
        ast: merge($.entries),
        source: tpl`{${$.entries}}`,
      },
    }),

    // --- JsonValue: dispatcher (grows as productions are added) ----------
    relation('JsonValue', {
      input: 'true',
      encodings: {
        parse: parse([
          span('node', 'true').of('JsonObject', 'JsonArray', 'JsonString', 'JsonNumber', 'JsonTrue', 'JsonFalse', 'JsonNull'),
        ]),
        ast: $.node,
        source: $.node,
      },
    }),
  ],
});
