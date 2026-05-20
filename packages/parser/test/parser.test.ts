import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, ex, isStructureRef } from '../src/index.ts';

test('defineSchema fills defaults', () => {
  const schema = defineSchema({
    name: 'demo',
    rootType: 'Root',
    examples: [],
  });
  assert.equal(schema.name, 'demo');
  assert.equal(schema.rootType, 'Root');
  assert.deepEqual(schema.uses, []);
  assert.deepEqual(schema.operators, {});
  assert.deepEqual(schema.punctuators, []);
  assert.equal(schema.whitespace, 'standard');
  assert.deepEqual(schema.examples, []);
});

test('ex builds a minimal valid example', () => {
  const example = ex('foo').as('Token').span('name', 'foo').ident().structure({ value: $.name }).build();
  assert.equal(example.input, 'foo');
  assert.equal(example.nodeType, 'Token');
  assert.equal(example.spans.length, 1);
  const span = example.spans[0]!;
  assert.equal(span.name, 'name');
  assert.equal(span.text, 'foo');
  assert.equal(span.class, 'ident');
  assert.equal(span.refinements.length, 0);
  assert.equal(span.modifiers.length, 0);
  assert.equal(example.status.kind, 'valid');
});

test('span chain accepts class, refinement, and modifier', () => {
  const example = ex('color: red')
    .as('Decl')
    .span('prop', 'color').ident().css()
    .span(':')
    .span('value', 'red').ident().css()
    .span(';').optional()
    .structure({ prop: $.prop, value: $.value })
    .build();
  assert.equal(example.spans.length, 4);
  const [prop, colon, value, semi] = example.spans;
  assert.equal(prop!.class, 'ident');
  assert.deepEqual(prop!.refinements, [{ name: 'css' }]);
  assert.equal(colon!.class, 'literal');
  assert.equal(colon!.text, ':');
  assert.equal(value!.class, 'ident');
  assert.equal(semi!.modifiers[0]?.kind, 'optional');
});

test('span repeats modifier captures options', () => {
  const example = ex('a;b')
    .as('Decls')
    .span('items', 'a;b', 'Item').repeats({ sep: ';', trailing: 'allowed' })
    .structure({ items: $.items })
    .build();
  const span = example.spans[0]!;
  const mod = span.modifiers[0]!;
  assert.equal(mod.kind, 'repeats');
  if (mod.kind !== 'repeats') throw new Error('unreachable');
  assert.equal(mod.sep, ';');
  assert.equal(mod.trailing, 'allowed');
});

test('recursive span carries single role', () => {
  const example = ex('a').as('Expr').span('inner', 'a', 'Inner').structure({ inner: $.inner }).build();
  const span = example.spans[0]!;
  assert.deepEqual(span.recursiveRoles, ['Inner']);
});

test('recursive span carries multiple roles', () => {
  const example = ex('x')
    .as('Container')
    .span('child', 'x', ['Rule', 'AtRule'])
    .structure({ child: $.child })
    .build();
  const span = example.spans[0]!;
  assert.deepEqual(span.recursiveRoles, ['Rule', 'AtRule']);
});

test('$ proxy returns distinct value- and presence-ref markers', () => {
  const valueRef = $.foo;
  assert.ok(isStructureRef(valueRef));
  assert.equal(valueRef.__ref, 'span-value');
  assert.equal(valueRef.name, 'foo');

  const presenceRef = $.foo.present;
  assert.ok(isStructureRef(presenceRef));
  assert.equal(presenceRef.__ref, 'span-presence');
  assert.equal(presenceRef.name, 'foo');
});

test('recovers marks status', () => {
  const example = ex('bad')
    .as('Stmt')
    .span('x', 'bad').ident().js()
    .recovers({ syncAt: [';', '}'], drop: 'bad-stmt' })
    .structure({ recovered: true })
    .build();
  assert.equal(example.status.kind, 'recovered');
  if (example.status.kind !== 'recovered') throw new Error('unreachable');
  assert.deepEqual(example.status.recovery.syncAt, [';', '}']);
  assert.equal(example.status.recovery.drop, 'bad-stmt');
});

test('rejects marks status and omits structure', () => {
  const example = ex('throw\n1;').as('Statement').rejects().build();
  assert.equal(example.status.kind, 'rejected');
  assert.equal(example.structure, undefined);
});

test('schema composition holds onto used schemas', () => {
  const inner = defineSchema({ name: 'inner', rootType: 'Inner', examples: [] });
  const outer = defineSchema({
    name: 'outer',
    rootType: 'Outer',
    uses: [inner],
    examples: [],
  });
  assert.equal(outer.uses[0]?.name, 'inner');
});

test('operators and punctuators carry through', () => {
  const schema = defineSchema({
    name: 'js-expr',
    rootType: 'Expression',
    operators: {
      additive: ['+', '-'],
      multiplicative: ['*', '/'],
    },
    punctuators: ['=>', '...'],
    examples: [],
  });
  assert.deepEqual(schema.operators.additive, ['+', '-']);
  assert.deepEqual(schema.punctuators, [
    { literal: '=>', type: '=>' },
    { literal: '...', type: '...' },
  ]);
});

test('punctuators accept named object form', () => {
  const schema = defineSchema({
    name: 'named',
    rootType: 'Root',
    punctuators: {
      lbrace: '{',
      rbrace: '}',
      colon: ':',
      delim: ['.', '+', '>'],
    },
    examples: [],
  });
  // Each literal maps to its assigned type name.
  const map = new Map(schema.punctuators.map((p) => [p.literal, p.type]));
  assert.equal(map.get('{'), 'lbrace');
  assert.equal(map.get('}'), 'rbrace');
  assert.equal(map.get(':'), 'colon');
  assert.equal(map.get('.'), 'delim');
  assert.equal(map.get('+'), 'delim');
  assert.equal(map.get('>'), 'delim');
});
