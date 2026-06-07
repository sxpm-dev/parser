import assert from 'node:assert/strict';
import test from 'node:test';
import { $, defineSchema, isStructureRef, literal, parse, relation, span, tpl, withInverse } from '../src/index.ts';
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

test('relation builds a minimal valid example', () => {
  const example = relation('Token', {
    input: 'foo',
    encodings: {
      src: parse([span('name', 'foo').ident()]),
      ast: { value: $.name },
    },
  });
  assert.equal(example.input, 'foo');
  assert.equal(example.nodeType, 'Token');
  assert.equal(example.spans.length, 1);
  const s = example.spans[0]!;
  assert.equal(s.name, 'name');
  assert.equal(s.text, 'foo');
  assert.equal(s.class, 'ident');
  assert.equal(s.refinements.length, 0);
  assert.equal(s.modifiers.length, 0);
  assert.equal(example.status.kind, 'valid');
});

test('span chain accepts class, refinement, and modifier', () => {
  const example = relation('Decl', {
    input: 'color: red',
    encodings: {
      src: parse([
        span('prop', 'color').ident().css(),
        literal(':'),
        span('value', 'red').ident().css(),
        literal(';').optional(),
      ]),
      ast: { prop: $.prop, value: $.value },
    },
  });
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
  const example = relation('Decls', {
    input: 'a;b',
    encodings: {
      src: parse([span('items', 'a;b').of('Item').repeats({ sep: ';', trailing: 'allowed' })]),
      ast: { items: $.items },
    },
  });
  const s = example.spans[0]!;
  const mod = s.modifiers[0]!;
  assert.equal(mod.kind, 'repeats');
  if (mod.kind !== 'repeats') throw new Error('unreachable');
  assert.equal(mod.sep, ';');
  assert.equal(mod.trailing, 'allowed');
});

test('recursive span carries single role', () => {
  const example = relation('Expr', {
    input: 'a',
    encodings: {
      src: parse([span('inner', 'a').of('Inner')]),
      ast: { inner: $.inner },
    },
  });
  const s = example.spans[0]!;
  assert.deepEqual(s.recursiveRoles, ['Inner']);
});

test('recursive span carries multiple roles', () => {
  const example = relation('Container', {
    input: 'x',
    encodings: {
      src: parse([span('child', 'x').of('Rule', 'AtRule')]),
      ast: { child: $.child },
    },
  });
  const s = example.spans[0]!;
  assert.deepEqual(s.recursiveRoles, ['Rule', 'AtRule']);
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
  const example = relation('Stmt', {
    input: 'bad',
    status: { kind: 'recovered', recovery: { syncAt: [';', '}'], drop: 'bad-stmt' } },
    encodings: {
      src: parse([span('x', 'bad').ident().js()]),
      ast: { recovered: true },
    },
  });
  assert.equal(example.status.kind, 'recovered');
  if (example.status.kind !== 'recovered') throw new Error('unreachable');
  assert.deepEqual(example.status.recovery.syncAt, [';', '}']);
  assert.equal(example.status.recovery.drop, 'bad-stmt');
});

test('rejects marks status and leaves renders empty', () => {
  const example = relation('Statement', {
    input: 'throw',
    status: { kind: 'rejected' },
    encodings: {
      src: parse([span('v', 'throw').ident()]),
    },
  });
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
  const example = relation('MarkdownLeaf', {
    input: '## Installation guide',
    encodings: {
      src: parse([
        literal('##'),
        span('first', 'Installation').ident().css(),
        span('second', 'guide').ident().css(),
      ]),
      ast: { type: 'heading', depth: 2, text: [$.first, $.second] },
      html: tpl`<h2>${$.first} ${$.second}</h2>`,
    },
  });
  assert.equal(example.renders.length, 2);
  assert.equal(example.renders[1]!.target, 'html');
  const body = example.renders[1]!.body as Template;
  assert.deepEqual(body.parts, ['<h2>', ' ', '</h2>']);
  assert.deepEqual(body.slots, [
    { kind: 'capture', ref: 'first' },
    { kind: 'capture', ref: 'second' },
  ]);
});

test('.render chains accumulate (one per target)', () => {
  const example = relation('MarkdownLeaf', {
    input: '---',
    encodings: {
      src: parse([literal('---')]),
      ast: { type: 'thematic-break' },
      html: tpl`<hr>`,
    },
  });
  assert.equal(example.renders.length, 2);
});

test('multiple encodings accumulate (one per target)', () => {
  const example = relation('MarkdownLeaf', {
    input: '# title',
    encodings: {
      src: parse([
        literal('#'),
        span('first', 'title').ident().css(),
      ]),
      ast: { type: 'heading', depth: 1, text: [$.first] },
      html: tpl`<h1>${$.first}</h1>`,
      plain: tpl`${$.first}`,
    },
  });
  assert.deepEqual(
    example.renders.map((r) => r.target),
    ['ast', 'html', 'plain'],
  );
});

test('example without render encodings still has renders: []', () => {
  const example = relation('Token', {
    input: 'foo',
    status: { kind: 'rejected' },
    encodings: {
      src: parse([span('v', 'foo').ident()]),
    },
  });
  assert.deepEqual(example.renders, []);
});

test('withInverse attaches body and optional inverse to ExampleDef.renders', () => {
  const e = relation('Atom', {
    input: 'a',
    encodings: {
      src: parse([span('v', 'a').ident()]),
      ast: { type: 'atom', v: $.v },
      html: withInverse(tpl`<a>${$.v}</a>`, tpl`<a>${$.v}</a>`),
    },
  });
  assert.equal(e.renders.length, 2);
  assert.equal(e.renders[0]!.target, 'ast');
  assert.equal(e.renders[1]!.target, 'html');
  assert.ok(e.renders[1]!.inverse, 'inverse override carried through');
  assert.equal('inverse' in e.renders[0]!, false, 'ast entry must not have inverse key');
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
