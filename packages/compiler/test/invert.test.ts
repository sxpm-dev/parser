import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser, inferSchema } from '../src/index.ts';

// Tests for Phase 4 inverse derivation + emit. Each test covers one
// derivation case from the spec ("Inverse derivation" in
// docs/superpowers/specs/2026-05-25-unified-render-targets-design.md).
// Compile-error tests assert named CompilerError messages. Round-trip tests
// exercise the generated parser end-to-end via render() + stringify().

// ---------- Per-derivation-case IR shape ----------------------------------

test('inverse derivation: object body -> InverseIR.object with literal + inverse fields', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title')
        .as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: $.first })
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Heading')!.productions[0]!;
  const inverse = production.renders.get('ast')!.inverseDerived;
  assert.ok(inverse, 'inverseDerived populated');
  assert.equal(inverse!.kind, 'object');
  if (inverse!.kind !== 'object') return;
  // Literal type field
  const typeField = inverse!.fields.find((f) => f.name === 'type')!;
  assert.equal(typeField.kind, 'literal');
  if (typeField.kind === 'literal') assert.equal(typeField.value, 'heading');
  // Inverse text field (it's a $.name ref -> nested ref inverse)
  const textField = inverse!.fields.find((f) => f.name === 'text')!;
  assert.equal(textField.kind, 'inverse');
  if (textField.kind === 'inverse') {
    assert.equal(textField.inverse.kind, 'ref');
    if (textField.inverse.kind === 'ref') assert.equal(textField.inverse.capture, 'first');
  }
});

test('inverse derivation: array body -> InverseIR.array with per-element inverse', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Pair',
    examples: [
      ex('a b').as('Pair')
        .span('a', 'a').ident()
        .span('b', 'b').ident()
        .render('ast', { type: 'pair', a: $.a, b: $.b })
        .render('arr', [$.a, $.b])
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Pair')!.productions[0]!;
  const inverse = production.renders.get('arr')!.inverseDerived;
  assert.ok(inverse);
  assert.equal(inverse!.kind, 'array');
  if (inverse!.kind !== 'array') return;
  assert.equal(inverse!.elements.length, 2);
  assert.equal(inverse!.elements[0]!.kind, 'ref');
  assert.equal(inverse!.elements[1]!.kind, 'ref');
});

test('inverse derivation: scalar body -> InverseIR.scalar with literal value', async () => {
  const { defineSchema, ex } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Yes',
    examples: [
      ex('yes').as('Yes').span('y', 'yes').ident()
        .render('ast', { type: 'yes' })
        .render('flag', true)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Yes')!.productions[0]!;
  const inverse = production.renders.get('flag')!.inverseDerived;
  assert.ok(inverse);
  assert.equal(inverse!.kind, 'scalar');
  if (inverse!.kind === 'scalar') assert.equal(inverse!.value, true);
});

test('inverse derivation: bare $.name body -> InverseIR.ref', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Word',
    examples: [
      ex('hello').as('Word').span('v', 'hello').ident()
        .render('ast', { type: 'word', v: $.v })
        .render('raw', $.v)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Word')!.productions[0]!;
  const inverse = production.renders.get('raw')!.inverseDerived;
  assert.ok(inverse);
  assert.equal(inverse!.kind, 'ref');
  if (inverse!.kind === 'ref') assert.equal(inverse!.capture, 'v');
});

test('inverse derivation: template body -> InverseIR.template with segments+captures', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: $.first })
        .render('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Heading')!.productions[0]!;
  const inverse = production.renders.get('html')!.inverseDerived;
  assert.ok(inverse);
  assert.equal(inverse!.kind, 'template');
  if (inverse!.kind !== 'template') return;
  assert.deepEqual(inverse!.segments, ['<h1>', '</h1>']);
  assert.deepEqual(inverse!.captures, ['first']);
});

test('inverse derivation: explicit options.inverse overrides body-derived inverse', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: $.first })
        .render('html', tpl`<h1>${$.first}</h1>`, { inverse: tpl`<H>${$.first}</H>` })
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Heading')!.productions[0]!;
  const inverse = production.renders.get('html')!.inverseDerived;
  assert.ok(inverse);
  assert.equal(inverse!.kind, 'template');
  if (inverse!.kind === 'template') {
    assert.deepEqual(inverse!.segments, ['<H>', '</H>']);
  }
});

// ---------- Compile-time precondition errors ------------------------------

test('inverse: adjacent slots in template body -> CompilerError', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'AB',
    examples: [
      ex('ab').as('AB')
        .span('a', 'a').ident()
        .span('b', 'b').ident()
        .render('ast', { type: 'ab', a: $.a, b: $.b })
        .render('compact', tpl`${$.a}${$.b}`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /slots \$\.a and \$\.b are adjacent with no separator/);
});

test('inverse: indistinguishable productions on object target -> CompilerError', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Two productions of node 'Item' both render `{ type: 'item', v: $.v }` to
  // 'ast'. Inverse dispatcher cannot tell them apart from the value alone.
  const schema = defineSchema({
    rootType: 'Item',
    examples: [
      ex('alpha').as('Item').span('v', 'alpha').ident()
        .render('ast', { type: 'item', v: $.v })
        .build(),
      ex('beta').as('Item').span('v', 'beta').ident()
        .render('ast', { type: 'item', v: $.v })
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /indistinguishable productions/);
});

// ---------- Round-trip via generated parser -------------------------------

test('round-trip: render(stringify(render(x, T), T), T) === render(x, T) for ast', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: $.first })
        .render('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-roundtrip-ast');
  const original = '# title';
  const v1 = mod.render(original, { type: 'ast' });
  const src = mod.stringify(v1, { type: 'ast' });
  const v2 = mod.render(src, { type: 'ast' });
  assert.deepEqual(v2, v1);
});

test('round-trip: render(stringify(render(x, T), T), T) === render(x, T) for html', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: $.first })
        .render('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-roundtrip-html');
  const original = '# title';
  const v1 = mod.render(original, { type: 'html' });
  const src = mod.stringify(v1, { type: 'html' });
  const v2 = mod.render(src, { type: 'html' });
  assert.deepEqual(v2, v1);
});

test('stringify(value, { type: "ast" }) reconstructs source', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: $.first })
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-stringify-ast');
  const value = mod.render('# title', { type: 'ast' });
  assert.equal(mod.stringify(value, { type: 'ast' }), '# title');
});

test('stringify with missing target throws', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Word',
    examples: [
      ex('hi').as('Word').span('v', 'hi').ident()
        .render('ast', { type: 'word', v: $.v })
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-stringify-missing');
  assert.throws(() => mod.stringify({ type: 'word', v: 'hi' }), /stringify: missing target/);
});

test('stringify with unknown target throws', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Word',
    examples: [
      ex('hi').as('Word').span('v', 'hi').ident()
        .render('ast', { type: 'word', v: $.v })
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-stringify-unknown');
  assert.throws(() => mod.stringify({ type: 'word', v: 'hi' }, { type: 'bogus' }), /stringify: unknown target 'bogus'/);
});

test('round-trip: array body with positional captures', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Pair',
    examples: [
      ex('a b').as('Pair')
        .span('a', 'a').ident()
        .span('b', 'b').ident()
        .render('ast', { type: 'pair', a: $.a, b: $.b })
        .render('arr', [$.a, $.b])
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-roundtrip-array');
  const v1 = mod.render('a b', { type: 'arr' });
  assert.deepEqual(v1, ['a', 'b']);
  const src = mod.stringify(v1, { type: 'arr' });
  const v2 = mod.render(src, { type: 'arr' });
  assert.deepEqual(v2, v1);
});

test('round-trip: scalar body asserts equality and rebuilds source', async () => {
  const { defineSchema, ex } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Yes',
    examples: [
      ex('yes').as('Yes').span('y', 'yes').ident()
        .render('ast', { type: 'yes' })
        .render('flag', true)
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-roundtrip-scalar');
  // forward: render -> true
  assert.equal(mod.render('yes', { type: 'flag' }), true);
  // inverse: stringify(true, flag) -> source
  assert.equal(mod.stringify(true, { type: 'flag' }), 'yes');
  // mismatched scalar throws (no production matches because the scalar
  // dispatcher routes only on equal value).
  assert.throws(() => mod.stringify(false, { type: 'flag' }), /stringify: no production matches/);
});

// generateParser code shape: both render + stringify exported.
test('generateParser emits public render and public stringify', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: $.first })
        .render('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test' });
  assert.match(code, /export function render\(/);
  assert.match(code, /export function stringify\(/);
  assert.match(code, /__invert_Heading_0_ast/);
  assert.match(code, /__invert_Heading_0_html/);
  assert.match(code, /__rebuild_Heading_0/);
  assert.match(code, /__inverseDispatch/);
});

// ---------- Helpers --------------------------------------------------------

type GeneratedModule = {
  render: (input: string, options?: { type?: string }) => unknown;
  stringify: (value: unknown, options?: { type?: string }) => string;
};

async function loadGenerated(schema: unknown, name: string): Promise<GeneratedModule> {
  const code = generateParser(schema as Parameters<typeof generateParser>[0], undefined, { packageName: name });
  const dir = mkdtempSync(join(tmpdir(), `parser2-${name}-`));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  return (await import(pathToFileURL(file).href)) as GeneratedModule;
}
