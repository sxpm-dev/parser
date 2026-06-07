import { $, defineSchema, literal, parse, relation, span } from '@parser2/parser';

// JavaScript-style binary expression grammar — the first user of the
// Phase 5 Pratt forward emit. Grammar (subset):
//
//   expr     = primary { binop expr }
//   primary  = ident | number
//   binop    = "||" | "&&"                          (logical, loosest)
//            | "==" | "!=" | "===" | "!=="           (equality)
//            | "<" | ">" | "<=" | ">="               (comparison)
//            | "+" | "-"                             (additive)
//            | "*" | "/" | "%"                       (multiplicative)
//            | "**"                                  (exponential, tightest)
//
// Pratt loop wires the recursion: each declared layer in `operators:`
// gets a precedence index (layer 0 = loosest), and the climbing loop
// recurses on the right operand at `prec + 1` (left-associative).
//
// What this schema does NOT include yet:
//   - Parentheses for explicit grouping. Adding `(expr)` as a primary
//     production is straightforward; the Pratt loop is unaffected. Skipped
//     in the first cut so the round-trip surface stays minimal — the
//     paren-aware stringify (parenthesizing children that bind looser
//     than the parent op) is Phase 5c.
//   - Unary prefix operators (`!a`, `-x`). Same Pratt loop with a small
//     pre-primary scan.
//   - Right-associative operators (`**`). Pratt handles right-assoc by
//     recursing at `prec` instead of `prec + 1`; an "associativity"
//     annotation on the operator layer is the natural extension.
//
// Targets:
//   ast    — { type: 'BinaryExpression', op, left, right } | { type: 'Identifier', name } | { type: 'NumericLiteral', value }
//   source — value-stable rebuild from the AST (no parens emitted; only
//            valid for expressions whose AST shape matches a no-paren parse)

export default defineSchema({
  rootType: 'Expr',
  defaultTarget: 'ast',
  operators: {
    logical: ['||', '&&'],
    equality: ['===', '!==', '==', '!='],
    comparison: ['<=', '>=', '<', '>'],
    additive: ['+', '-'],
    multiplicative: ['*', '/', '%'],
    // `**` is right-associative in JavaScript: `2 ** 3 ** 2` evaluates as
    // `2 ** (3 ** 2)` = 512, not `(2 ** 3) ** 2` = 64. The schema opts in
    // via the object form. The Pratt loop recurses at `prec` (instead of
    // `prec + 1`) for the right operand; the inverse swaps the equal-
    // precedence paren rules accordingly.
    exponential: { ops: ['**'], assoc: 'right' },
  },
  examples: [
    // Primary: identifier
    relation('Expr', {
      input: 'a',
      encodings: {
        src: parse([span('name', 'a').ident().js()]),
        ast: { type: 'Identifier', name: $.name },
      },
    }),

    // Primary: numeric literal (integer, coerced to JS number)
    relation('Expr', {
      input: '42',
      encodings: {
        src: parse([span('value', '42').number().int().coerce()]),
        ast: { type: 'NumericLiteral', value: $.value },
      },
    }),

    // Phase 5g — parenthesized primary. The AST body is just `$.inner`,
    // which the compiler recognizes as a transparent passthrough: the
    // parens are erased at parse time, the inner's AST is returned
    // verbatim, and no inverter is emitted (the paren-aware stringify
    // generates parens by precedence rules). On the forward path the
    // standard primary dispatcher tries this alt alongside Identifier
    // and NumericLiteral; an input starting with `(` matches here.
    relation('Expr', {
      input: '(a)',
      encodings: {
        src: parse([
          literal('('),
          span('inner', 'a').of('Expr'),
          literal(')'),
        ]),
        ast: $.inner,
      },
    }),

    // Unary prefix template — the Pratt detector recognizes the
    // [operator(alts), recursive(self)] shape and weaves the unary check
    // into the primary dispatcher. `.operator(['!', '~'])` scopes the
    // unary recognizer to these literals; pure-binary ops (`*`, `&&`,
    // etc.) are NOT valid here. Chained unaries (`!!a`) work because the
    // operand recursion calls the primary itself.
    relation('Expr', {
      input: '!a',
      encodings: {
        src: parse([
          span('op', '!').operator(['!', '~']),
          span('operand', 'a').of('Expr'),
        ]),
        ast: { type: 'UnaryExpression', op: $.op, operand: $.operand },
      },
    }),

    // Binary expression template — the Pratt detector recognizes this
    // shape and replaces the standard dispatcher with a primary +
    // climbing loop. The `op` capture binds to ANY declared operator;
    // the precedence map drives the climbing.
    relation('Expr', {
      input: 'a + b',
      encodings: {
        src: parse([
          span('left', 'a').of('Expr'),
          span('op', '+').operator(),
          span('right', 'b').of('Expr'),
        ]),
        ast: { type: 'BinaryExpression', op: $.op, left: $.left, right: $.right },
      },
    }),
  ],
});
