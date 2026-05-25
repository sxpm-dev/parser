import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, ex, isStructureRef, tpl } from '../src/index.ts';
import type { Template } from '../src/index.ts';

test('defineSchema fills defaults', () => {
  const schema = defineSchema({
    rootType: 'Root',
    examples: [],
  });
  assert.equal(schema.rootType, 'Root');
  assert.deepEqual(schema.uses, []);
  assert.deepEqual(schema.operators, {});
  assert.deepEqual(schema.punctuators, []);
  assert.equal(schema.whitespace, 'standard');
  assert.equal(schema.unknownChars, 'reject');
  assert.deepEqual(schema.examples, []);
});

test('ex builds a minimal valid example', () => {
  const example = ex('foo').as('Token').span('name', 'foo').ident().render('ast', { value: $.name }).build();
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
    .render('ast', { prop: $.prop, value: $.value })
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
    .render('ast', { items: $.items })
    .build();
  const span = example.spans[0]!;
  const mod = span.modifiers[0]!;
  assert.equal(mod.kind, 'repeats');
  if (mod.kind !== 'repeats') throw new Error('unreachable');
  assert.equal(mod.sep, ';');
  assert.equal(mod.trailing, 'allowed');
});

test('recursive span carries single role', () => {
  const example = ex('a').as('Expr').span('inner', 'a', 'Inner').render('ast', { inner: $.inner }).build();
  const span = example.spans[0]!;
  assert.deepEqual(span.recursiveRoles, ['Inner']);
});

test('recursive span carries multiple roles', () => {
  const example = ex('x')
    .as('Container')
    .span('child', 'x', ['Rule', 'AtRule'])
    .render('ast', { child: $.child })
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
    .render('ast', { recovered: true })
    .build();
  assert.equal(example.status.kind, 'recovered');
  if (example.status.kind !== 'recovered') throw new Error('unreachable');
  assert.deepEqual(example.status.recovery.syncAt, [';', '}']);
  assert.equal(example.status.recovery.drop, 'bad-stmt');
});

test('rejects marks status and leaves renders empty', () => {
  const example = ex('throw\n1;').as('Statement').rejects().build();
  assert.equal(example.status.kind, 'rejected');
  assert.deepEqual(example.renders, []);
});

test('schema composition holds onto used schemas', () => {
  const inner = defineSchema({ rootType: 'Inner', examples: [] });
  const outer = defineSchema({
    rootType: 'Outer',
    uses: [inner],
    examples: [],
  });
  // Composition identity is by object reference, not name.
  assert.equal(outer.uses[0], inner);
});

test('operators and punctuators carry through', () => {
  const schema = defineSchema({
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

test('.render attaches a Template body under the given target', () => {
  const example = ex('## Installation guide')
    .as('MarkdownLeaf')
    .span('##')
    .span('first', 'Installation').ident().css()
    .span('second', 'guide').ident().css()
    .render('ast', { type: 'heading', depth: 2, text: [$.first, $.second] })
    .render('html', tpl`<h2>${$.first} ${$.second}</h2>`)
    .build();
  assert.equal(example.renders.length, 2);
  assert.equal(example.renders[1]!.target, 'html');
  const body = example.renders[1]!.body as Template;
  assert.deepEqual(body.parts, ['<h2>', ' ', '</h2>']);
  assert.deepEqual(body.slots, [
    { kind: 'capture', ref: 'first' },
    { kind: 'capture', ref: 'second' },
  ]);
});

test('.render chains from inside a span builder', () => {
  const example = ex('---')
    .as('MarkdownLeaf')
    .span('---')
    .render('ast', { type: 'thematic-break' })
    .render('html', tpl`<hr>`)
    .build();
  assert.equal(example.renders.length, 2);
});

test('multiple .render() calls accumulate (one per target)', () => {
  const example = ex('# title')
    .as('MarkdownLeaf')
    .span('#')
    .span('first', 'title').ident().css()
    .render('ast', { type: 'heading', depth: 1, text: [$.first] })
    .render('html', tpl`<h1>${$.first}</h1>`)
    .render('plain', tpl`${$.first}`)
    .build();
  assert.deepEqual(
    example.renders.map((r) => r.target),
    ['ast', 'html', 'plain'],
  );
});

test('example without .render() still has renders: []', () => {
  const example = ex('foo').as('Token').span('v', 'foo').ident().build();
  assert.deepEqual(example.renders, []);
});

test('.render attaches body and optional inverse to ExampleDef.renders', () => {
  const e = ex('a')
    .as('Atom')
    .span('v', 'a').ident()
    .render('ast', { type: 'atom', v: $.v })
    .render('html', tpl`<a>${$.v}</a>`, { inverse: tpl`<a>${$.v}</a>` })
    .build();
  assert.equal(e.renders.length, 2);
  assert.equal(e.renders[0]!.target, 'ast');
  assert.equal(e.renders[1]!.target, 'html');
  assert.ok(e.renders[1]!.inverse, 'inverse override carried through');
});

test('defineSchema accepts optional defaultTarget', () => {
  const schema = defineSchema({
    rootType: 'A',
    defaultTarget: 'ast',
    examples: [],
  });
  assert.equal(schema.defaultTarget, 'ast');
});

test('defineSchema leaves defaultTarget undefined when not given', () => {
  const schema = defineSchema({ rootType: 'A', examples: [] });
  assert.equal(schema.defaultTarget, undefined);
});
