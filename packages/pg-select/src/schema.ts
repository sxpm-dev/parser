import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';

// Postgres SELECT — a small but useful subset. Grammar:
//
//   select   = "SELECT" cols "FROM" ident [ "WHERE" predicate ] [ "LIMIT" 1*DIGIT ]
//   cols     = colref *( "," colref )
//   colref   = ident | "*"
//   predicate = colref op literal
//   op       = "=" | "!=" | "<" | ">" | "<=" | ">="
//   literal  = 1*DIGIT | "'" *char "'"
//
// Two design constraints inherited from the iso-duration / rrule rounds:
//   - WHERE and LIMIT optional clauses are expressed as four Select
//     productions (one per absent/present combination) so the source
//     template never has adjacent slots and the inverse dispatcher can
//     route by the embedded ` WHERE ` / ` LIMIT ` literal.
//   - List-slot captures (`columns`) don't round-trip multi-element
//     values byte-stably through the source-target inverter — see the
//     compiler gap noted in @parser2/iso-duration. Single-column SELECTs
//     and AST-shaped inputs work; multi-column source-target stringify
//     receives the whole comma-joined string as one chunk.
//
// The predicate operator uses `.operator()` against a schema-level
// `operators:` pool. No Operator node — the captured `op` is a plain
// string. Earlier rounds carried a six-production `litEnum('Operator',
// […])` workaround when v2 didn't implement `.operator()` yet; that's
// retired here.
//
// Targets:
//   ast    — { type:'select', columns:[...], table:..., where?:..., limit?:... }
//   source — canonical Postgres SELECT string with single-space separators

export default defineSchema({
  rootType: 'Select',
  defaultTarget: 'ast',
  punctuators: {
    comma: ',',
    semicolon: ';',
    star: '*',
  },
  // Comparison operators declared as a single precedence layer so the
  // .operator() scanner picks them up with longest-match dispatch
  // (`!=` / `<=` / `>=` beat their single-char prefixes). No binary
  // production matches the [recursive(self), operator, recursive(self)]
  // shape, so Pratt parsing stays off — `operators` here is purely a
  // literal pool for the predicate operator span.
  operators: {
    comparison: ['!=', '<=', '>=', '=', '<', '>'],
  },
  tokens: ['number', 'string'],
  examples: [
    // ---- ColumnRef ---------------------------------------------------
    relation('ColumnRef', {
      input: '*',
      encodings: {
        parse: parse([literal('*')]),
        ast: { type: 'wildcard' },
        source: tpl`*`,
      },
    }),
    relation('ColumnRef', {
      input: 'name',
      encodings: {
        parse: parse([span('name', 'name').ident().js()]),
        ast: { type: 'column', name: $.name },
        source: tpl`${$.name}`,
      },
    }),

    // ---- LiteralValue ------------------------------------------------
    relation('LiteralValue', {
      input: '42',
      encodings: {
        parse: parse([span('value', '42').number().int()]),
        ast: { type: 'number', value: $.value },
        source: tpl`${$.value}`,
      },
    }),
    relation('LiteralValue', {
      input: "'foo'",
      encodings: {
        parse: parse([span('value', "'foo'").string().singleQuoted()]),
        ast: { type: 'string', value: $.value },
        source: tpl`${$.value}`,
      },
    }),

    // ---- Predicate ---------------------------------------------------
    // `.operator()` scans the schema-level operator pool with longest-
    // match dispatch, replacing the prior `litEnum('Operator', […])` +
    // `.of('Operator')` six-production workaround. The capture is a
    // plain string (the matched operator literal) — no Operator node.
    relation('Predicate', {
      input: 'name = 42',
      encodings: {
        parse: parse([
          span('col', 'name').of('ColumnRef'),
          span('op', '=').operator(),
          span('val', '42').of('LiteralValue'),
        ]),
        ast: { type: 'predicate', col: $.col, op: $.op, val: $.val },
        source: tpl`${$.col} ${$.op} ${$.val}`,
      },
    }),

    // ---- Select root -------------------------------------------------
    // Four productions, one per optional-clause combination. Each
    // template carries the WHERE / LIMIT keywords inline so the
    // template-segment discriminator can route by embedded literal at
    // stringify time.
    relation('Select', {
      input: 'SELECT * FROM users',
      encodings: {
        parse: parse([
          literal('SELECT'),
          span('columns', '*').of('ColumnRef').repeats({ sep: ',', min: 1, stopBefore: ['FROM'] }),
          literal('FROM'),
          span('table', 'users').ident().js(),
        ]),
        ast: { type: 'select', columns: $.columns, table: $.table },
        source: tpl`SELECT ${$.columns} FROM ${$.table}`,
      },
    }),
    relation('Select', {
      input: 'SELECT * FROM users WHERE name = 42',
      encodings: {
        parse: parse([
          literal('SELECT'),
          span('columns', '*').of('ColumnRef').repeats({ sep: ',', min: 1, stopBefore: ['FROM'] }),
          literal('FROM'),
          span('table', 'users').ident().js(),
          literal('WHERE'),
          span('where', 'name = 42').of('Predicate'),
        ]),
        ast: { type: 'select', columns: $.columns, table: $.table, where: $.where },
        source: tpl`SELECT ${$.columns} FROM ${$.table} WHERE ${$.where}`,
      },
    }),
    relation('Select', {
      input: 'SELECT * FROM users LIMIT 10',
      encodings: {
        parse: parse([
          literal('SELECT'),
          span('columns', '*').of('ColumnRef').repeats({ sep: ',', min: 1, stopBefore: ['FROM'] }),
          literal('FROM'),
          span('table', 'users').ident().js(),
          literal('LIMIT'),
          span('limit', '10').number().int(),
        ]),
        ast: { type: 'select', columns: $.columns, table: $.table, limit: $.limit },
        source: tpl`SELECT ${$.columns} FROM ${$.table} LIMIT ${$.limit}`,
      },
    }),
    relation('Select', {
      input: 'SELECT * FROM users WHERE name = 42 LIMIT 10',
      encodings: {
        parse: parse([
          literal('SELECT'),
          span('columns', '*').of('ColumnRef').repeats({ sep: ',', min: 1, stopBefore: ['FROM'] }),
          literal('FROM'),
          span('table', 'users').ident().js(),
          literal('WHERE'),
          span('where', 'name = 42').of('Predicate'),
          literal('LIMIT'),
          span('limit', '10').number().int(),
        ]),
        ast: {
          type: 'select',
          columns: $.columns,
          table: $.table,
          where: $.where,
          limit: $.limit,
        },
        source: tpl`SELECT ${$.columns} FROM ${$.table} WHERE ${$.where} LIMIT ${$.limit}`,
      },
    }),
  ],
});
