import test from 'node:test';
import assert from 'node:assert/strict';
import { render, stringify, validate } from '../src/index.ts';

// Strip auto-attached `source` metadata so structural asserts stay terse.
function strip(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(strip);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'source') continue;
      out[k] = strip(v);
    }
    return out;
  }
  return value;
}

const ast = (input: string) => strip(render(input, { target: 'ast' }));

// --- Primary productions ----------------------------------------------------

test('parses an identifier', () => {
  assert.deepEqual(ast('answer'), { type: 'Identifier', name: 'answer' });
});

test('parses a numeric literal (coerced to JS number)', () => {
  assert.deepEqual(ast('42'), { type: 'NumericLiteral', value: 42 });
});

// --- Pratt: precedence levels -----------------------------------------------

test('additive: left-associative chain', () => {
  // a + b + c parses as (a + b) + c
  assert.deepEqual(ast('a + b + c'), {
    type: 'BinaryExpression',
    op: '+',
    left: {
      type: 'BinaryExpression',
      op: '+',
      left: { type: 'Identifier', name: 'a' },
      right: { type: 'Identifier', name: 'b' },
    },
    right: { type: 'Identifier', name: 'c' },
  });
});

test('multiplicative binds tighter than additive', () => {
  // a + b * c parses as a + (b * c)
  assert.deepEqual(ast('a + b * c'), {
    type: 'BinaryExpression',
    op: '+',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'BinaryExpression',
      op: '*',
      left: { type: 'Identifier', name: 'b' },
      right: { type: 'Identifier', name: 'c' },
    },
  });
});

test('multiplicative on the left also wins precedence', () => {
  // a * b + c parses as (a * b) + c
  assert.deepEqual(ast('a * b + c'), {
    type: 'BinaryExpression',
    op: '+',
    left: {
      type: 'BinaryExpression',
      op: '*',
      left: { type: 'Identifier', name: 'a' },
      right: { type: 'Identifier', name: 'b' },
    },
    right: { type: 'Identifier', name: 'c' },
  });
});

test('comparison binds looser than additive', () => {
  // a < b + c parses as a < (b + c)
  assert.deepEqual(ast('a < b + c'), {
    type: 'BinaryExpression',
    op: '<',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'BinaryExpression',
      op: '+',
      left: { type: 'Identifier', name: 'b' },
      right: { type: 'Identifier', name: 'c' },
    },
  });
});

test('logical binds loosest', () => {
  // a && b == c parses as a && (b == c)
  assert.deepEqual(ast('a && b == c'), {
    type: 'BinaryExpression',
    op: '&&',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'BinaryExpression',
      op: '==',
      left: { type: 'Identifier', name: 'b' },
      right: { type: 'Identifier', name: 'c' },
    },
  });
});

test('exponential binds tightest', () => {
  // a + b ** c parses as a + (b ** c)
  assert.deepEqual(ast('a + b ** c'), {
    type: 'BinaryExpression',
    op: '+',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'BinaryExpression',
      op: '**',
      left: { type: 'Identifier', name: 'b' },
      right: { type: 'Identifier', name: 'c' },
    },
  });
});

test('longer operator wins over its prefix (longest-match)', () => {
  // `===` wins over `==`, `!==` over `!=`, `<=` over `<`.
  assert.deepEqual(ast('a === b'), {
    type: 'BinaryExpression',
    op: '===',
    left: { type: 'Identifier', name: 'a' },
    right: { type: 'Identifier', name: 'b' },
  });
  assert.deepEqual(ast('a !== b'), {
    type: 'BinaryExpression',
    op: '!==',
    left: { type: 'Identifier', name: 'a' },
    right: { type: 'Identifier', name: 'b' },
  });
});

test('mixed numeric + identifier operands', () => {
  // The Pratt loop doesn't care about operand types; both primaries are
  // valid left/right candidates.
  assert.deepEqual(ast('2 * x + 1'), {
    type: 'BinaryExpression',
    op: '+',
    left: {
      type: 'BinaryExpression',
      op: '*',
      left: { type: 'NumericLiteral', value: 2 },
      right: { type: 'Identifier', name: 'x' },
    },
    right: { type: 'NumericLiteral', value: 1 },
  });
});

// --- Round-trip (no-paren expressions) --------------------------------------
//
// Round-trip works value-stably for any input whose AST shape matches what
// a naive (no-paren) re-parse would produce — i.e. expressions whose
// operator precedence is already encoded by left-to-right reading. Adding
// paren-aware stringify is Phase 5c.

test('round-trip: additive chain', () => {
  for (const inp of ['a', 'a + b', 'a + b + c', 'a + b * c', 'a * b + c', 'a - b - c']) {
    const value = render(inp, { target: 'ast' });
    const back = stringify(value, { target: 'ast' });
    assert.equal(back, inp, `round-trip drift on "${inp}"`);
  }
});

// --- Validate ---------------------------------------------------------------

test('validate accepts grammar-supported inputs and rejects malformed ones', () => {
  validate('a');
  validate('42');
  validate('a + b');
  validate('a + b * c');
  validate('a && b == c');
  // Phase 5g — parens are valid primaries.
  validate('(a)');
  validate('2 * (x + 1)');
  validate('(a + b) * (c - d)');
  assert.throws(() => validate('a + '), /SyntaxError|Unexpected/);
  assert.throws(() => validate('+ b'), /SyntaxError|Unexpected/);
  assert.throws(() => validate('(a + b'), /SyntaxError|Unexpected/);
  assert.throws(() => validate('a + b)'), /SyntaxError|Unexpected/);
});

// --- Paren-aware stringify (Phase 5c) ---------------------------------------
//
// Author-built ASTs that force regrouping. The forward Pratt parser would
// never produce these without explicit parens in the input, but the
// inverter must still round-trip them to source whose re-parse yields the
// same shape (value-stable round-trip).

const idA = { type: 'Identifier', name: 'a' } as const;
const idB = { type: 'Identifier', name: 'b' } as const;
const idC = { type: 'Identifier', name: 'c' } as const;

test('paren-aware: looser child on right side gets parens', () => {
  // a * (b + c) — multiplication wrapping an addition on its right side.
  // myPrec(*) > myPrec(+), so the (+) child binds looser → parens.
  const ast = {
    type: 'BinaryExpression',
    op: '*',
    left: idA,
    right: { type: 'BinaryExpression', op: '+', left: idB, right: idC },
  };
  assert.equal(stringify(ast, { target: 'ast' }), 'a * (b + c)');
});

test('paren-aware: looser child on left side gets parens', () => {
  // (a + b) * c — addition on the left of multiplication.
  const ast = {
    type: 'BinaryExpression',
    op: '*',
    left: { type: 'BinaryExpression', op: '+', left: idA, right: idB },
    right: idC,
  };
  assert.equal(stringify(ast, { target: 'ast' }), '(a + b) * c');
});

test('paren-aware: same-precedence right child gets parens (left-assoc)', () => {
  // a - (b - c) — author-built right-grouped subtraction. For left-assoc
  // ops, equal precedence on the right side needs parens to preserve the
  // grouping (without parens it would re-parse as (a - b) - c).
  const ast = {
    type: 'BinaryExpression',
    op: '-',
    left: idA,
    right: { type: 'BinaryExpression', op: '-', left: idB, right: idC },
  };
  assert.equal(stringify(ast, { target: 'ast' }), 'a - (b - c)');
});

test('paren-aware: same-precedence left child does NOT get parens', () => {
  // (a - b) - c — natural left-grouping of subtraction. No parens needed.
  const ast = {
    type: 'BinaryExpression',
    op: '-',
    left: { type: 'BinaryExpression', op: '-', left: idA, right: idB },
    right: idC,
  };
  assert.equal(stringify(ast, { target: 'ast' }), 'a - b - c');
});

test('paren-aware: tighter child never gets parens', () => {
  // a + b * c — multiplication is tighter than addition; no parens.
  const ast = {
    type: 'BinaryExpression',
    op: '+',
    left: idA,
    right: { type: 'BinaryExpression', op: '*', left: idB, right: idC },
  };
  assert.equal(stringify(ast, { target: 'ast' }), 'a + b * c');
});

test('paren-aware: deeply nested parens cascade correctly', () => {
  // a * (b + (c - d)) — two levels of regrouping.
  const idD = { type: 'Identifier', name: 'd' } as const;
  const ast = {
    type: 'BinaryExpression',
    op: '*',
    left: idA,
    right: {
      type: 'BinaryExpression',
      op: '+',
      left: idB,
      right: { type: 'BinaryExpression', op: '-', left: idC, right: idD },
    },
  };
  // The right (b + (c - d)) needs parens (looser than *).
  // Inside it, (c - d) is the RIGHT child of + with same precedence (additive),
  // so it also needs parens.
  assert.equal(stringify(ast, { target: 'ast' }), 'a * (b + (c - d))');
});

test('paren-aware: rebuild round-trips via re-parse for forced-regroup ASTs', () => {
  // Build an AST, stringify, re-parse the result — wait, re-parsing requires
  // parens in the grammar (which the schema doesn't have yet). For now,
  // skip the re-parse and just assert the stringify produces the expected
  // source layout.
});

// --- Right-associativity (Phase 5e) ----------------------------------------
//
// `**` is the only right-associative operator in the schema. A chain like
// `a ** b ** c` parses as `a ** (b ** c)` — the second `**` binds tighter
// to its right operand than the first. Left-assoc ops (`+`, `*`, etc.)
// keep the normal `(a + b) + c` shape.

test('right-assoc: a ** b ** c parses right-grouped', () => {
  // a ** b ** c → a ** (b ** c)
  assert.deepEqual(ast('a ** b ** c'), {
    type: 'BinaryExpression',
    op: '**',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'BinaryExpression',
      op: '**',
      left: { type: 'Identifier', name: 'b' },
      right: { type: 'Identifier', name: 'c' },
    },
  });
});

test('right-assoc: long chain stays right-grouped', () => {
  // a ** b ** c ** d → a ** (b ** (c ** d))
  assert.deepEqual(ast('a ** b ** c ** d'), {
    type: 'BinaryExpression',
    op: '**',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'BinaryExpression',
      op: '**',
      left: { type: 'Identifier', name: 'b' },
      right: {
        type: 'BinaryExpression',
        op: '**',
        left: { type: 'Identifier', name: 'c' },
        right: { type: 'Identifier', name: 'd' },
      },
    },
  });
});

test('right-assoc: stringify natural-right-grouped AST has no parens', () => {
  // a ** (b ** c) — the right child has same precedence on the right side
  // of a right-assoc parent. Equal-on-right does NOT need parens for right-
  // assoc, mirroring how the parser would produce this shape from
  // `a ** b ** c`.
  const out = stringify({
    type: 'BinaryExpression',
    op: '**',
    left: idA,
    right: {
      type: 'BinaryExpression',
      op: '**',
      left: idB,
      right: idC,
    },
  }, { target: 'ast' });
  assert.equal(out, 'a ** b ** c');
});

test('right-assoc: stringify forced-left-grouped AST DOES emit parens', () => {
  // (a ** b) ** c — left child has same precedence on the LEFT side of a
  // right-assoc parent. Equal-on-left DOES need parens for right-assoc,
  // otherwise the source would re-parse as the natural-right shape.
  const out = stringify({
    type: 'BinaryExpression',
    op: '**',
    left: {
      type: 'BinaryExpression',
      op: '**',
      left: idA,
      right: idB,
    },
    right: idC,
  }, { target: 'ast' });
  assert.equal(out, '(a ** b) ** c');
});

test('right-assoc: full round-trip preserves AST shape', () => {
  // Forward parse + inverse stringify + forward re-parse must yield the
  // same AST. Exercises the natural right-grouped chain through both
  // directions.
  for (const inp of ['a ** b', 'a ** b ** c', 'a ** b ** c ** d']) {
    const value = render(inp, { target: 'ast' });
    const back = stringify(value, { target: 'ast' });
    assert.equal(back, inp, `round-trip drift on "${inp}"`);
    const reparsed = render(back, { target: 'ast' });
    assert.deepEqual(strip(reparsed), strip(value), `AST drift on "${inp}"`);
  }
});

test('right-assoc + left-assoc precedence interaction', () => {
  // `2 + 3 ** 2` — additive (left, looser) + exponential (right, tighter).
  // Should parse as 2 + (3 ** 2). The Pratt loop's `minPrec` machinery
  // handles this without right-assoc-specific code — the right operand
  // recursion at `prec + 1` (for `+`) still catches the `**`.
  // (NumericLiteral uses `.number().int().coerce()` so values are numbers.)
  assert.deepEqual(ast('2 + 3 ** 2'), {
    type: 'BinaryExpression',
    op: '+',
    left: { type: 'NumericLiteral', value: 2 },
    right: {
      type: 'BinaryExpression',
      op: '**',
      left: { type: 'NumericLiteral', value: 3 },
      right: { type: 'NumericLiteral', value: 2 },
    },
  });
});

// --- Unary prefix operators (Phase 5f) -------------------------------------
//
// `.operator(['!', '~'])` declares which operators are valid in unary
// position. The Pratt primary scans for these BEFORE trying other
// primaries; on hit, consumes the operator and recurses into the primary
// for the operand (so chained unaries work naturally).

test('unary: !a parses as UnaryExpression', () => {
  assert.deepEqual(ast('!a'), {
    type: 'UnaryExpression',
    op: '!',
    operand: { type: 'Identifier', name: 'a' },
  });
});

test('unary: ~a parses as UnaryExpression with ~ op', () => {
  assert.deepEqual(ast('~a'), {
    type: 'UnaryExpression',
    op: '~',
    operand: { type: 'Identifier', name: 'a' },
  });
});

test('unary: chained !!a parses as nested unary', () => {
  // !!a → !(!a)
  assert.deepEqual(ast('!!a'), {
    type: 'UnaryExpression',
    op: '!',
    operand: {
      type: 'UnaryExpression',
      op: '!',
      operand: { type: 'Identifier', name: 'a' },
    },
  });
});

test('unary: binds tighter than any binary op', () => {
  // !a + b → (!a) + b
  assert.deepEqual(ast('!a + b'), {
    type: 'BinaryExpression',
    op: '+',
    left: {
      type: 'UnaryExpression',
      op: '!',
      operand: { type: 'Identifier', name: 'a' },
    },
    right: { type: 'Identifier', name: 'b' },
  });
});

test('unary on the right side of a binary op', () => {
  // a && !b → a && (!b)
  assert.deepEqual(ast('a && !b'), {
    type: 'BinaryExpression',
    op: '&&',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'UnaryExpression',
      op: '!',
      operand: { type: 'Identifier', name: 'b' },
    },
  });
});

test('unary: round-trip preserves the AST', () => {
  for (const inp of ['!a', '~a', '!!a', '!a + b', 'a && !b', '!a && !b']) {
    const value = render(inp, { target: 'ast' });
    const back = stringify(value, { target: 'ast' });
    assert.equal(back, inp, `round-trip drift on "${inp}"`);
    const reparsed = render(back, { target: 'ast' });
    assert.deepEqual(strip(reparsed), strip(value), `AST drift on "${inp}"`);
  }
});

test('unary: pure-binary ops are NOT accepted as unary prefix', () => {
  // `*` is binary-only; `*a` is a parse error.
  assert.throws(() => validate('*a'), /SyntaxError|Unexpected/);
  // `&&` is binary-only; `&&a` is a parse error.
  assert.throws(() => validate('&&a'), /SyntaxError|Unexpected/);
});

// --- Parens-as-primary (Phase 5g) ------------------------------------------
//
// The `(expr)` production is a transparent passthrough: parens are erased
// at parse time, the inner expression's AST is returned verbatim. On the
// inverse side the paren-aware stringify (Phase 5c) emits parens by
// precedence rules, so author-built ASTs round-trip with the right
// grouping — and we can now re-parse the stringified output and verify
// AST stability.

test('parens: erased at parse time', () => {
  // `(a)` parses to the same AST as `a`.
  assert.deepEqual(ast('(a)'), { type: 'Identifier', name: 'a' });
  assert.deepEqual(ast('((a))'), { type: 'Identifier', name: 'a' });
  assert.deepEqual(ast('(42)'), { type: 'NumericLiteral', value: 42 });
});

test('parens: change precedence grouping', () => {
  // `(a + b) * c` parses with addition as the multiplication's left
  // operand, NOT the natural `a + (b * c)` shape.
  assert.deepEqual(ast('(a + b) * c'), {
    type: 'BinaryExpression',
    op: '*',
    left: {
      type: 'BinaryExpression',
      op: '+',
      left: { type: 'Identifier', name: 'a' },
      right: { type: 'Identifier', name: 'b' },
    },
    right: { type: 'Identifier', name: 'c' },
  });
  // `a * (b + c)` — addition wrapped on the right side of multiplication.
  assert.deepEqual(ast('a * (b + c)'), {
    type: 'BinaryExpression',
    op: '*',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'BinaryExpression',
      op: '+',
      left: { type: 'Identifier', name: 'b' },
      right: { type: 'Identifier', name: 'c' },
    },
  });
});

test('parens: force right-grouping on a left-assoc op', () => {
  // `a - (b - c)` — without parens, `a - b - c` would parse left-grouped.
  assert.deepEqual(ast('a - (b - c)'), {
    type: 'BinaryExpression',
    op: '-',
    left: { type: 'Identifier', name: 'a' },
    right: {
      type: 'BinaryExpression',
      op: '-',
      left: { type: 'Identifier', name: 'b' },
      right: { type: 'Identifier', name: 'c' },
    },
  });
});

test('parens: force left-grouping on a right-assoc op', () => {
  // `(a ** b) ** c` — without parens, `a ** b ** c` would parse
  // right-grouped (Phase 5e right-assoc).
  assert.deepEqual(ast('(a ** b) ** c'), {
    type: 'BinaryExpression',
    op: '**',
    left: {
      type: 'BinaryExpression',
      op: '**',
      left: { type: 'Identifier', name: 'a' },
      right: { type: 'Identifier', name: 'b' },
    },
    right: { type: 'Identifier', name: 'c' },
  });
});

test('parens: inside unary operand', () => {
  // `!(a + b)` — unary applied to a parenthesized expression.
  assert.deepEqual(ast('!(a + b)'), {
    type: 'UnaryExpression',
    op: '!',
    operand: {
      type: 'BinaryExpression',
      op: '+',
      left: { type: 'Identifier', name: 'a' },
      right: { type: 'Identifier', name: 'b' },
    },
  });
});

test('parens: full re-parse round-trip', () => {
  // The previously author-only paren-aware tests now have a complete
  // round-trip story: render → stringify → re-render must yield the
  // same AST.
  for (const inp of [
    'a',
    '(a)',
    '(a + b) * c',
    'a * (b + c)',
    'a - (b - c)',
    '(a ** b) ** c',
    'a ** b ** c',
    '!(a + b)',
    '(a + b) * (c - d)',
    '!(a) + b',
    '2 * (x + 1)',
  ]) {
    const value = render(inp, { target: 'ast' });
    const back = stringify(value, { target: 'ast' });
    const reparsed = render(back, { target: 'ast' });
    assert.deepEqual(
      strip(reparsed),
      strip(value),
      `re-parse drift on "${inp}" → stringified "${back}"`,
    );
  }
});

test('parens: forced-regroup AST round-trips via real parser', () => {
  // Build an AST that forces regrouping, stringify, RE-PARSE the
  // stringified output, and verify the original AST shape comes back.
  // This was deferred in Phase 5c — now achievable via parens-as-primary.
  const regroupedAst = {
    type: 'BinaryExpression',
    op: '*',
    left: {
      type: 'BinaryExpression',
      op: '+',
      left: idA,
      right: idB,
    },
    right: idC,
  };
  const stringified = stringify(regroupedAst, { target: 'ast' });
  assert.equal(stringified, '(a + b) * c');
  const reparsed = render(stringified, { target: 'ast' });
  assert.deepEqual(strip(reparsed), strip(regroupedAst));
});
