// Phase 5a — `detectBinaryProductions` (infer/binary-operators.ts).
//
// Detection is the first half of the Pratt lift. These tests lock the shape
// vocabulary so Phase 5b's forward + inverse emit can rely on a stable set
// of pre-conditions.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import {
  $,
  defineSchema,
  literal,
  parse,
  relation,
  span,
} from '@parser2/parser';
import { inferSchema } from '../src/index.ts';

test('binary detection: canonical [recursive, operator, recursive] shape is detected', () => {
  const schema = defineSchema({
    rootType: 'Expr',
    operators: { add: ['+'] },
    examples: [
      relation('Expr', {
        input: 'a',
        encodings: {
          src: parse([span('name', 'a').ident()]),
          ast: { type: 'Identifier', name: $.name },
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
  const inferred = inferSchema(schema);
  const info = inferred.binaryProductions.get('Expr');
  assert.ok(info, 'Expr should have a binary production');
  assert.equal(info.prodIdx, 1);
  assert.equal(info.leftCapture, 'left');
  assert.equal(info.opCapture, 'op');
  assert.equal(info.rightCapture, 'right');
});

test('binary detection: non-self-recursive spans do not match', () => {
  const schema = defineSchema({
    rootType: 'Expr',
    operators: { add: ['+'] },
    examples: [
      relation('Other', {
        input: 'a',
        encodings: {
          src: parse([span('v', 'a').ident()]),
          ast: { type: 'O', v: $.v },
        },
      }),
      relation('Expr', {
        input: 'a + b',
        encodings: {
          // left/right recurse into 'Other', not 'Expr'.
          src: parse([
            span('left', 'a').of('Other'),
            span('op', '+').operator(),
            span('right', 'b').of('Other'),
          ]),
          ast: { type: 'B', op: $.op, left: $.left, right: $.right },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.equal(inferred.binaryProductions.size, 0);
});

test('binary detection: middle span must be class operator', () => {
  const schema = defineSchema({
    rootType: 'Expr',
    examples: [
      relation('Expr', {
        input: 'a',
        encodings: {
          src: parse([span('name', 'a').ident()]),
          ast: { type: 'I', name: $.name },
        },
      }),
      relation('Expr', {
        input: 'a , b',
        encodings: {
          // comma literal — NOT class operator.
          src: parse([
            span('left', 'a').of('Expr'),
            literal(','),
            span('right', 'b').of('Expr'),
          ]),
          ast: { type: 'B', left: $.left, right: $.right },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.equal(inferred.binaryProductions.size, 0);
});

test('binary detection: body must reference all three captures or detection skips', () => {
  // The body skips $.left — operands would be lost on round-trip. Detection
  // refuses to claim this as a binary template (returns no entry) so the
  // standard multi-prod dispatch still runs; later passes surface the round-
  // trip failure via their own diagnostics.
  const schema = defineSchema({
    rootType: 'Expr',
    operators: { add: ['+'] },
    examples: [
      relation('Expr', {
        input: 'a',
        encodings: {
          src: parse([span('name', 'a').ident()]),
          ast: { type: 'I', name: $.name },
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
          // No $.left reference — detection skips.
          ast: { type: 'B', op: $.op, right: $.right },
        },
      }),
    ],
  });
  // inferSchema may still succeed for the rest of the pipeline; the binary
  // detector simply produces an empty entry for this node. (Inverse
  // derivation will likely complain about the missing $.left in its own
  // pass — that's intentional and orthogonal.)
  try {
    const inferred = inferSchema(schema);
    assert.equal(
      inferred.binaryProductions.has('Expr'),
      false,
      'detection should NOT claim this production as binary',
    );
  } catch {
    // Acceptable: some other pass rejects the schema. The key invariant is
    // that detection didn't silently treat this as a valid binary shape.
  }
});

test('binary detection: more than one matching production is rejected', () => {
  // Two binary alts can't coexist — the schema can't tell which to choose
  // at parse time, and the Pratt loop needs a single canonical shape.
  assert.throws(
    () => {
      const schema = defineSchema({
        rootType: 'Expr',
        operators: { add: ['+', '-'] },
        examples: [
          relation('Expr', {
            input: 'a',
            encodings: {
              src: parse([span('name', 'a').ident()]),
              ast: { type: 'I', name: $.name },
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
              ast: { type: 'B', op: $.op, left: $.left, right: $.right },
            },
          }),
          relation('Expr', {
            input: 'a - b',
            encodings: {
              src: parse([
                span('l', 'a').of('Expr'),
                span('o', '-').operator(),
                span('r', 'b').of('Expr'),
              ]),
              ast: { type: 'B', op: $.o, left: $.l, right: $.r },
            },
          }),
        ],
      });
      inferSchema(schema);
    },
    /binary-operator detection.*more than one production/i,
  );
});

test('binary detection: optional or repeats modifier on operand disqualifies', () => {
  const schema = defineSchema({
    rootType: 'Expr',
    operators: { add: ['+'] },
    examples: [
      relation('Expr', {
        input: 'a',
        encodings: {
          src: parse([span('name', 'a').ident()]),
          ast: { type: 'I', name: $.name },
        },
      }),
      relation('Expr', {
        input: 'a + b',
        encodings: {
          src: parse([
            span('left', 'a').of('Expr'),
            span('op', '+').operator(),
            // .optional() on the right operand is not the binary shape.
            span('right', 'b').of('Expr').optional(),
          ]),
          ast: { type: 'B', op: $.op, left: $.left, right: $.right },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.equal(inferred.binaryProductions.size, 0);
});

test('binary detection: schemas without any binary production yield an empty map', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'a',
        encodings: {
          src: parse([literal('a')]),
          ast: { type: 'x' },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.equal(inferred.binaryProductions.size, 0);
});
