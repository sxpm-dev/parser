// Phase 5 foundation — `InferredSchema.operatorPrecedence` mirrors the
// declaration order of `operators: { layer: [...] }`, with layer 0 = loosest.
// The Pratt emit (forthcoming) reads this map to compute per-operator
// binding power. Until then, this test guards the derivation against drift.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { defineSchema, parse, relation, span, $, literal } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';

test('operatorPrecedence: layer index follows declaration order (loose-to-tight)', () => {
  const schema = defineSchema({
    rootType: 'X',
    operators: {
      logical: ['||', '&&'],
      additive: ['+', '-'],
      multiplicative: ['*', '/'],
    },
    examples: [
      relation('X', {
        input: 'a + b',
        encodings: {
          src: parse([
            span('left', 'a').ident(),
            span('op', '+').operator(),
            span('right', 'b').ident(),
          ]),
          ast: { type: 'binop', op: $.op, left: $.left, right: $.right },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.equal(inferred.operatorPrecedence.get('||'), 0);
  assert.equal(inferred.operatorPrecedence.get('&&'), 0);
  assert.equal(inferred.operatorPrecedence.get('+'), 1);
  assert.equal(inferred.operatorPrecedence.get('-'), 1);
  assert.equal(inferred.operatorPrecedence.get('*'), 2);
  assert.equal(inferred.operatorPrecedence.get('/'), 2);
  // operatorLiterals stays the longest-first scanner list, alphabetical
  // within a length bucket — distinct purpose, distinct ordering from the
  // precedence map.
  assert.deepEqual([...inferred.operatorLiterals], ['&&', '||', '*', '+', '-', '/']);
});

test('operatorPrecedence: empty when schema declares no operators', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'a',
        encodings: {
          src: parse([literal('a')]),
          ast: { type: 'a' },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.equal(inferred.operatorPrecedence.size, 0);
});

test('operatorPrecedence: duplicate operator across layers keeps first (loosest) binding', () => {
  // Schema-author error case: `+` declared in two layers. The first wins;
  // the inferrer doesn't reject it (codegen-time is the right place for
  // that diagnostic when Pratt lands).
  const schema = defineSchema({
    rootType: 'X',
    operators: {
      additive: ['+'],
      multiplicative: ['+', '*'],
    },
    examples: [
      relation('X', {
        input: 'a + b',
        encodings: {
          src: parse([
            span('left', 'a').ident(),
            span('op', '+').operator(),
            span('right', 'b').ident(),
          ]),
          ast: { type: 'binop', op: $.op, left: $.left, right: $.right },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.equal(inferred.operatorPrecedence.get('+'), 0);
  assert.equal(inferred.operatorPrecedence.get('*'), 1);
});
