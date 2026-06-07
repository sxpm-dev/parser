// Phase 5d — interp ≡ v2 parity for Pratt-driven schemas.
//
// Mirrors the feature-parity matrix's runner shape but specializes on
// schemas with binary-operator productions. For each input we run both
// backends (compiled v2 module + reference interpreter) and assert deep-
// equal ASTs.
//
// This is the trust anchor for Phase 5: any drift between the codegen
// Pratt loop and the interp Pratt loop fails the suite, surfacing
// precedence / associativity / longest-match bugs before they reach a
// schema consumer.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser, inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/parse.ts';
import {
  $,
  defineSchema,
  literal,
  parse,
  relation,
  span,
  type SchemaDef,
} from '@parser2/parser';

function makeExprSchema(): SchemaDef {
  return defineSchema({
    rootType: 'Expr',
    operators: {
      logical: ['||', '&&'],
      equality: ['===', '!==', '==', '!='],
      comparison: ['<=', '>=', '<', '>'],
      additive: ['+', '-'],
      multiplicative: ['*', '/', '%'],
      // Right-associative — exercises the Phase 5e `nextMinPrec` swap in
      // both backends. Both the v2 codegen and the interp must produce
      // the same right-grouped AST for `a ** b ** c`.
      exponential: { ops: ['**'], assoc: 'right' },
    },
    examples: [
      relation('Expr', {
        input: 'a',
        encodings: {
          src: parse([span('name', 'a').ident().js()]),
          ast: { type: 'Identifier', name: $.name },
        },
      }),
      // NumericLiteral without .coerce() — interp keeps captures as raw
      // string slices, v2 with .coerce() would convert to JS number. The
      // parity test wants interp ≡ v2 *modulo* the documented coerce
      // discrepancy, so we use the raw form here.
      relation('Expr', {
        input: '42',
        encodings: {
          src: parse([span('value', '42').number().int()]),
          ast: { type: 'NumericLiteral', value: $.value },
        },
      }),
      // Phase 5g transparent-passthrough — parens are erased to the
      // inner AST. Both backends must agree on the unwrapping.
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
      // Unary prefix template — exercises the Phase 5f primary leading
      // unary-prefix check in both backends. The schema-author's `.operator`
      // alts (`['!', '~']`) scope which operators are valid in unary
      // position; pure-binary ops (e.g. `*`, `&&`) won't fall in.
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
}

function stripSource(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(stripSource);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === 'source') continue;
    out[k] = stripSource(v);
  }
  return out;
}

// Materialize the v2 parser once per suite run; reuse for every input.
const schema = makeExprSchema();
const v2Code = generateParser(schema);
const v2Dir = mkdtempSync(join(tmpdir(), 'pratt-parity-v2-'));
const v2File = join(v2Dir, 'parser.ts');
writeFileSync(v2File, v2Code);

const inferred = inferSchema(schema);

async function runV2(input: string): Promise<unknown> {
  const mod = (await import(pathToFileURL(v2File).href)) as {
    render: (input: string, options?: { target?: string }) => unknown;
  };
  return mod.render(input, { target: 'ast' });
}

function runInterp(input: string): unknown {
  return interpretParse(inferred, input);
}

const INPUTS: ReadonlyArray<string> = [
  // Primary
  'a',
  'answer',
  '42',
  '0',
  // Single binary
  'a + b',
  'a - b',
  'a * b',
  'a / b',
  'a % b',
  'a == b',
  'a === b',
  'a != b',
  'a !== b',
  'a < b',
  'a <= b',
  'a > b',
  'a >= b',
  'a && b',
  'a || b',
  'a ** b',
  // Left-associative chains
  'a + b + c',
  'a - b - c',
  'a * b * c',
  // Precedence mixing
  'a + b * c',
  'a * b + c',
  'a + b * c + d',
  'a * b + c * d',
  'a < b + c',
  'a < b * c',
  'a && b == c',
  'a && b || c',
  'a + b ** c',
  'a ** b + c',
  // Numeric + identifier mix
  '2 * x + 1',
  'x + 2 * y - 3',
  // Longest-match operator pairs
  'a === b == c',
  'a !== b != c',
  'a <= b < c',
  'a >= b > c',
  // Deep nesting (left-assoc)
  'a + b + c + d + e',
  // Right-associativity (Phase 5e)
  'a ** b ** c',
  'a ** b ** c ** d',
  '2 ** 3 ** 2',
  'a + b ** c ** d',
  'a ** b + c',
  'a ** b * c',
  // Unary prefix (Phase 5f)
  '!a',
  '~a',
  '!!a',
  '!~a',
  '~!a',
  '!a + b',
  'a + !b',
  '!a && !b',
  '!a == b',
  'a == !b',
  '!a ** b',
  'a ** !b',
  '!!!a',
  // Parens (Phase 5g)
  '(a)',
  '((a))',
  '(a + b)',
  '(a + b) * c',
  'a * (b + c)',
  '(a + b) * (c - d)',
  'a - (b - c)',
  '(a ** b) ** c',
  '!(a + b)',
  '(!a) + b',
  '(a + b) ** c',
  '!((a))',
];

for (const input of INPUTS) {
  test(`pratt parity: '${input}' — interp ≡ v2`, async () => {
    const v2 = stripSource(await runV2(input));
    const interp = stripSource(runInterp(input));
    assert.deepEqual(interp, v2, `interp diverged from v2 on '${input}'`);
  });
}
