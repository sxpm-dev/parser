import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { canFuseStructured } from '../src/emit/v2/fusion-structured.ts';

test('canFuseStructured rejects Template bodies (those use the string fusion)', () => {
  const schema = defineSchema({
    rootType: 'Pair',
    caseSensitive: true,
    punctuators: { dash: '-' },
    tokens: [],
    examples: [
      relation('Pair', {
        input: 'a-b',
        encodings: {
          parse: parse([span('a', 'a').ident(), literal('-'), span('b', 'b').ident()]),
          source: tpl`${$.a}-${$.b}`,
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('Pair')!.productions[0]!;
  assert.equal(canFuseStructured(prod, inferred, 'source'), false);
});

test('canFuseStructured accepts an object-literal ast body with only $.ref leaves', () => {
  const schema = defineSchema({
    rootType: 'Pair',
    caseSensitive: true,
    punctuators: { dash: '-' },
    tokens: [],
    examples: [
      relation('Pair', {
        input: 'a-b',
        encodings: {
          parse: parse([span('a', 'a').ident(), literal('-'), span('b', 'b').ident()]),
          source: tpl`${$.a}-${$.b}`,
          ast: { type: 'pair', a: $.a, b: $.b },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('Pair')!.productions[0]!;
  assert.equal(canFuseStructured(prod, inferred, 'ast'), true);
});

test('canFuseStructured rejects a bare $.ref top-level body (must be object)', () => {
  const schema = defineSchema({
    rootType: 'Wrap',
    caseSensitive: true,
    punctuators: {},
    tokens: [],
    examples: [
      relation('Wrap', {
        input: 'x',
        encodings: {
          parse: parse([span('inner', 'x').ident()]),
          source: tpl`${$.inner}`,
          ast: $.inner,
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('Wrap')!.productions[0]!;
  assert.equal(canFuseStructured(prod, inferred, 'ast'), false);
});
