import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { canFuseStructured, emitFusedRenderStructured } from '../src/emit/v2/fusion-structured.ts';

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

test('emitFusedRenderStructured produces a function returning the object literal', () => {
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
  const src = emitFusedRenderStructured(prod, inferred, {
    nodeName: 'Pair',
    prodIdx: 0,
    target: 'ast',
  });
  assert.ok(src, 'expected fusable Pair to emit a structured-fused fn');
  // Function name follows the structured naming convention.
  assert.match(src, /function __fusedRenderStructured_Pair_0_ast\(state: State\): unknown/);
  // Returns the literal shape using captured locals.
  assert.match(src, /return \{[^}]*type: "pair"[^}]*\}/);
});

test('emitFusedRenderStructured handles a recursive repeats slot', () => {
  const schema = defineSchema({
    rootType: 'List',
    caseSensitive: true,
    punctuators: { open: '[', close: ']', comma: ',' },
    tokens: [],
    examples: [
      relation('List', {
        input: '[a,b]',
        encodings: {
          parse: parse([
            literal('['),
            span('items', '').of('Item').repeats({ min: 0, sep: ',' }),
            literal(']'),
          ]),
          source: tpl`[${$.items}]`,
          ast: { type: 'list', items: $.items },
        },
      }),
      relation('Item', {
        input: 'a',
        encodings: {
          parse: parse([span('name', 'a').ident()]),
          source: tpl`${$.name}`,
          ast: { type: 'item', name: $.name },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const prod = inferred.nodeTypes.get('List')!.productions[0]!;
  const src = emitFusedRenderStructured(prod, inferred, {
    nodeName: 'List',
    prodIdx: 0,
    target: 'ast',
  });
  assert.ok(src, 'List should fuse when its recursive Item is also fusable');
  // Items get collected into an array under their declared span name.
  assert.match(src, /const items: unknown\[\] = \[\];/);
  assert.match(src, /items\.push\(/);
  // The dispatcher routes to the Item structured-fused fn (via the per-role
  // structured dispatcher emitted alongside the production).
  assert.match(src, /__fusedRenderStructuredDispatch_Item_ast\(state\)/);
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
