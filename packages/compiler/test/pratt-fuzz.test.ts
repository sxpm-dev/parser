// Phase 5h — randomized differential fuzz: interp ≡ v2 on Pratt schemas.
//
// Seeded LCG generates expressions over the full js-expr operator
// alphabet, including parens, unary prefix (`!`, `~`), and binary
// operators at every precedence layer (logical, equality, comparison,
// additive, multiplicative, exponential with right-associativity).
// Each expression is run through both backends and the resulting ASTs
// are deep-compared.
//
// This complements the 71-row deterministic matrix in
// `pratt-interp-parity.test.ts` by covering combinations no human would
// enumerate by hand (e.g. `~(a ** b) + !!c == d || e * f`).
//
// Reproducibility: the seed is hard-coded. To exercise a different
// corpus, change SEED and commit the new value (so CI runs the same
// inputs every time).

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

// Same schema as pratt-interp-parity.test.ts — no .coerce() (so interp's
// raw-slice captures match v2's slice captures), parens + unary + full
// 6-layer binary precedence.
function makeExprSchema(): SchemaDef {
  return defineSchema({
    rootType: 'Expr',
    operators: {
      logical: ['||', '&&'],
      equality: ['===', '!==', '==', '!='],
      comparison: ['<=', '>=', '<', '>'],
      additive: ['+', '-'],
      multiplicative: ['*', '/', '%'],
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
      relation('Expr', {
        input: '42',
        encodings: {
          src: parse([span('value', '42').number().int()]),
          ast: { type: 'NumericLiteral', value: $.value },
        },
      }),
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

// Compile the v2 parser once for the entire fuzz run; reuse across all
// generated inputs.
const schema = makeExprSchema();
const inferred = inferSchema(schema);
const v2Code = generateParser(schema);
const v2Dir = mkdtempSync(join(tmpdir(), 'pratt-fuzz-v2-'));
const v2File = join(v2Dir, 'parser.ts');
writeFileSync(v2File, v2Code);
const v2Mod = (await import(pathToFileURL(v2File).href)) as {
  render: (input: string, options?: { target?: string }) => unknown;
};

function runV2(input: string): unknown {
  return v2Mod.render(input, { target: 'ast' });
}

function runInterp(input: string): unknown {
  return interpretParse(inferred, input);
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

// --- Generator -------------------------------------------------------------

// Park-Miller LCG. Deterministic, fast, no dependencies. Sequence is
// fully reproducible from `seed` so a failing fuzz run is debuggable.
function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  if (s === 0) s = 1;
  return () => {
    s = Math.imul(s, 48271) >>> 0;
    s = s % 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const IDENTS = 'abcdefghijklmnopqrstuvwxyz';
const BINARY_OPS = [
  '||', '&&',
  '===', '!==', '==', '!=',
  '<=', '>=', '<', '>',
  '+', '-',
  '*', '/', '%',
  '**',
];
const UNARY_OPS = ['!', '~'];

function pick<T>(rng: () => number, arr: ReadonlyArray<T>): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

// Build an expression string with a target maximum depth. The shape mix
// (primary / unary / binary / paren) is sampled at each level so the
// corpus exercises all four shapes evenly. At depth 0 only primaries
// are emitted, guaranteeing termination.
function genExpr(rng: () => number, depth: number): string {
  if (depth <= 0) {
    if (rng() < 0.5) return pick(rng, IDENTS.split(''));
    return String(Math.floor(rng() * 100));
  }
  const choice = rng();
  if (choice < 0.15) {
    // Parens around a sub-expression at the same depth (the inner is
    // a fresh expression that may itself be deep).
    return `(${genExpr(rng, depth - 1)})`;
  }
  if (choice < 0.30) {
    // Unary prefix. No space — matches the schema's `!a` example.
    return `${pick(rng, UNARY_OPS)}${genExpr(rng, depth - 1)}`;
  }
  // Binary. Space-padded to match the schema's `a + b` example.
  const left = genExpr(rng, depth - 1);
  const op = pick(rng, BINARY_OPS);
  const right = genExpr(rng, depth - 1);
  return `${left} ${op} ${right}`;
}

// --- Fuzz runs -------------------------------------------------------------

const SEED = 1337;

test('pratt fuzz: 500 expressions at depth ≤ 4 — interp ≡ v2', () => {
  const rng = makeRng(SEED);
  for (let i = 0; i < 500; i++) {
    const depth = 1 + Math.floor(rng() * 4); // 1..4
    const expr = genExpr(rng, depth);
    let v2: unknown;
    let interp: unknown;
    try {
      v2 = stripSource(runV2(expr));
      interp = stripSource(runInterp(expr));
    } catch (e) {
      throw new Error(
        `pratt fuzz: parse error at i=${i} on '${expr}': ${(e as Error).message}`,
      );
    }
    assert.deepEqual(
      interp,
      v2,
      `pratt fuzz: interp diverged from v2 at i=${i} on '${expr}'`,
    );
  }
});

test('pratt fuzz: 100 deeply-nested expressions at depth 6 — interp ≡ v2', () => {
  const rng = makeRng(SEED + 1);
  for (let i = 0; i < 100; i++) {
    const expr = genExpr(rng, 6);
    let v2: unknown;
    let interp: unknown;
    try {
      v2 = stripSource(runV2(expr));
      interp = stripSource(runInterp(expr));
    } catch (e) {
      throw new Error(
        `pratt fuzz (deep): parse error at i=${i} on '${expr}': ${(e as Error).message}`,
      );
    }
    assert.deepEqual(
      interp,
      v2,
      `pratt fuzz (deep): interp diverged from v2 at i=${i} on '${expr}'`,
    );
  }
});

test('pratt fuzz: round-trip stability (render → stringify → re-render)', async () => {
  // For each generated expression: forward parse, stringify the AST,
  // re-parse the stringified output, assert the AST shape is preserved.
  // Catches paren-aware-inverse bugs that leave the round-trip lossy.
  const v2Mod2 = (await import(pathToFileURL(v2File).href)) as {
    render: (input: string, options?: { target?: string }) => unknown;
    stringify: (value: unknown, options?: { target?: string }) => string;
  };
  const rng = makeRng(SEED + 2);
  for (let i = 0; i < 200; i++) {
    const depth = 1 + Math.floor(rng() * 4);
    const expr = genExpr(rng, depth);
    let ast: unknown;
    let stringified: string;
    let reparsed: unknown;
    try {
      ast = v2Mod2.render(expr, { target: 'ast' });
      stringified = v2Mod2.stringify(ast, { target: 'ast' });
      reparsed = v2Mod2.render(stringified, { target: 'ast' });
    } catch (e) {
      throw new Error(
        `pratt fuzz round-trip: error at i=${i} on '${expr}': ${(e as Error).message}`,
      );
    }
    assert.deepEqual(
      stripSource(reparsed),
      stripSource(ast),
      `pratt fuzz round-trip: AST drift at i=${i} on '${expr}' → stringified '${stringified}'`,
    );
  }
});
