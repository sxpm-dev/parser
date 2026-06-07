// Phase 3 — unit tests for `inferStructureTypes` (infer/structure-types.ts).
//
// Coverage targets the full TsType vocabulary the inferrer can emit:
//   - primitive captures (ident, string, number, number+coerce, until)
//   - structure refs (span-value, span-presence, span-tail/gap/raw → string)
//   - modifier transforms (.optional() → T|null, .repeats() → T[])
//   - body shapes (literal, object, array→tuple, template→string, dynKey, merge)
//   - recursive role refs (single & multi → union of <Role>_<target> aliases)
//   - operator span → union of declared operator literals
//   - multi-production node types → top-level union of bodies
//
// Each row is a self-contained schema + expected emitted alias block. The
// assertion is over the emitted TS source — the same source that lands in
// generated parsers — so a snapshot drift here is the same drift a consumer
// would see in their `.d.ts`.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import {
  $,
  defineSchema,
  dynKey,
  literal,
  merge,
  parse,
  relation,
  span,
  tpl,
} from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { emitTypes } from '../src/emit/types.ts';

type Row = {
  readonly name: string;
  readonly schema: () => ReturnType<typeof defineSchema>;
  readonly expectedAliases: string;
};

const rows: ReadonlyArray<Row> = [
  {
    name: 'ident → string',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'foo',
            encodings: {
              src: parse([span('name', 'foo').ident()]),
              ast: { type: 'x', name: $.name },
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type X_ast = { type: "x"; name: string };`,
  },
  {
    name: 'number → string; number+coerce → number',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '1 2',
            encodings: {
              src: parse([span('a', '1').number(), literal(' '), span('b', '2').number().coerce()]),
              ast: { type: 'x', a: $.a, b: $.b },
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type X_ast = { type: "x"; a: string; b: number };`,
  },
  {
    name: 'optional → T|null; repeats → T[]',
    schema: () =>
      defineSchema({
        rootType: 'List',
        punctuators: { comma: ',' },
        examples: [
          relation('Item', {
            input: 'x',
            encodings: {
              src: parse([span('name', 'x').ident()]),
              ast: { type: 'item', name: $.name },
            },
          }),
          relation('List', {
            input: 'x, y',
            encodings: {
              src: parse([
                span('items', 'x').of('Item').repeats({ sep: ',' }),
                literal(','),
                span('last', 'y').of('Item').optional(),
              ]),
              ast: { type: 'list', items: $.items, last: $.last },
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type Item_ast = { type: "item"; name: string };\n` +
      `export type List_ast = { type: "list"; items: Item_ast[]; last: Item_ast | null };`,
  },
  // NOTE: a span-presence row (`$.x.present` → boolean) belongs here, but the
  // inverter currently rejects `$.x.present` refs anywhere in a body — the
  // feature-parity matrix carries that restriction explicitly (row
  // `structureRef:span-presence` → `gap`). Once Phase 4's preservation work
  // closes that gap, add a row asserting `hasR: $.r.present` → `boolean`.
  {
    name: 'multi-role recursive span → union of <Role>_<target>',
    schema: () =>
      defineSchema({
        rootType: 'Wrap',
        examples: [
          relation('A', {
            input: 'a',
            encodings: {
              src: parse([span('v', 'a').ident()]),
              ast: { type: 'a', v: $.v },
            },
          }),
          relation('B', {
            input: 'b',
            encodings: {
              src: parse([span('v', 'b').ident()]),
              ast: { type: 'b', v: $.v },
            },
          }),
          relation('Wrap', {
            input: 'a',
            encodings: {
              src: parse([span('child', 'a').of('A', 'B')]),
              ast: { type: 'wrap', child: $.child },
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type A_ast = { type: "a"; v: string };\n` +
      `export type B_ast = { type: "b"; v: string };\n` +
      `export type Wrap_ast = { type: "wrap"; child: A_ast | B_ast };`,
  },
  {
    name: 'multi-production node → top-level union',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'a',
            encodings: {
              src: parse([literal('a')]),
              ast: { type: 'a' },
            },
          }),
          relation('X', {
            input: 'b',
            encodings: {
              src: parse([literal('b')]),
              ast: { type: 'b' },
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type X_ast = { type: "a" } | { type: "b" };`,
  },
  {
    name: 'template body → string',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '1Y',
            encodings: {
              src: parse([span('v', '1').number().int(), literal('Y')]),
              ast: { type: 'years', value: $.v },
              source: tpl`${$.v}Y`,
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type X_ast = { type: "years"; value: string };\n` +
      `export type X_source = string;`,
  },
  {
    name: 'operator span → union of declared operator literals',
    schema: () =>
      defineSchema({
        rootType: 'X',
        operators: { add: ['+', '-'] },
        examples: [
          relation('X', {
            input: 'a + b',
            encodings: {
              src: parse([
                span('l', 'a').ident(),
                span('op', '+').operator(),
                span('r', 'b').ident(),
              ]),
              ast: { type: 'binop', op: $.op, l: $.l, r: $.r },
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type X_ast = { type: "binop"; op: "+" | "-"; l: string; r: string };`,
  },
  {
    name: 'until → string; tuple body',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'a:b',
            encodings: {
              src: parse([
                span('k', 'a').until(':'),
                literal(':'),
                span('v', 'b').until(';'),
                literal(';').optional(),
              ]),
              ast: [$.k, $.v],
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type X_ast = [string, string];`,
  },
  {
    name: 'dynKey body → Record<string, V>',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'k=v',
            encodings: {
              src: parse([
                span('k', 'k').ident(),
                literal('='),
                span('v', 'v').ident(),
              ]),
              ast: dynKey($.k, $.v),
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type X_ast = Record<string, string>;`,
  },
  {
    name: 'merge body → Record<string, unknown>',
    schema: () =>
      defineSchema({
        rootType: 'List',
        examples: [
          relation('Item', {
            input: 'k=v',
            encodings: {
              src: parse([
                span('k', 'k').ident(),
                literal('='),
                span('v', 'v').ident(),
              ]),
              ast: dynKey($.k, $.v),
            },
          }),
          relation('List', {
            input: 'k=v',
            encodings: {
              src: parse([
                span('items', 'k=v').of('Item').repeats({ sep: ',' }),
              ]),
              ast: merge($.items),
            },
          }),
        ],
      }),
    expectedAliases:
      `// --- Inferred types ---\n` +
      `export type Item_ast = Record<string, string>;\n` +
      `export type List_ast = Record<string, unknown>;`,
  },
];

for (const row of rows) {
  test(`structure-types: ${row.name}`, () => {
    const inferred = inferSchema(row.schema());
    const { aliasBlock } = emitTypes(inferred);
    assert.equal(aliasBlock, row.expectedAliases);
  });
}

test('structure-types: render/stringify overloads include every declared target', () => {
  const schema = defineSchema({
    rootType: 'X',
    defaultTarget: 'ast',
    examples: [
      relation('X', {
        input: '1',
        encodings: {
          src: parse([span('v', '1').number().int()]),
          ast: { type: 'x', value: $.v },
          source: tpl`${$.v}`,
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const { renderOverloads, stringifyOverloads } = emitTypes(inferred);
  // One overload per target + default-target form.
  assert.match(renderOverloads, /target: "ast".*: X_ast;/);
  assert.match(renderOverloads, /target: "source".*: X_source;/);
  assert.match(renderOverloads, /target\?: undefined.*: X_ast;/);
  // Stringify: per-target value typing.
  assert.match(stringifyOverloads, /value: X_ast, options: \{ target: "ast" \}/);
  assert.match(stringifyOverloads, /value: X_source, options: \{ target: "source" \}/);
  assert.match(stringifyOverloads, /value: X_ast, options\?: \{ target\?: undefined \}/);
});

test('structure-types: no defaultTarget omits the default-form overload', () => {
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: '1',
        encodings: {
          src: parse([span('v', '1').number().int()]),
          ast: { type: 'x', value: $.v },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const { renderOverloads, stringifyOverloads } = emitTypes(inferred);
  assert.doesNotMatch(renderOverloads, /target\?: undefined/);
  assert.doesNotMatch(stringifyOverloads, /target\?: undefined/);
});
