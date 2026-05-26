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
  // The override path: the schema author explicitly supplies an inverse
  // template via `options.inverse`. The derived InverseIR carries the
  // override's segments, not the body's. When body and override are not
  // mutually round-trippable, the codegen's round-trip closure check
  // (Task 3.1) skips this entry — see check/round-trip.ts header — but
  // the override IS still derived into the IR (this test pins that).
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

// Fix 1: template productions can share an empty leading prefix as long as
// one of them carries a unique embedded literal segment — that segment is a
// runtime discriminator the inverse dispatcher can match on.
test('inverse: two templates with shared empty leading prefix but differing embedded literals do NOT collide', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  // Two productions of 'Field': ${$.value} vs ${$.start}-${$.end}. Both
  // start with a capture (empty leading prefix). The second has an
  // embedded `-` literal between its two captures — that's the runtime
  // discriminator.
  const schema = defineSchema({
    rootType: 'Field',
    examples: [
      ex('5').as('Field').span('value', '5').number().int()
        .render('ast', { type: 'value', value: $.value })
        .render('source', tpl`${$.value}`)
        .build(),
      ex('1-5').as('Field')
        .span('start', '1').number().int()
        .span('-')
        .span('end', '5').number().int()
        .render('ast', { type: 'range', start: $.start, end: $.end })
        .render('source', tpl`${$.start}-${$.end}`)
        .build(),
    ],
  });
  // Inference should succeed — the `-` literal in the second template
  // distinguishes the two productions at runtime.
  assert.doesNotThrow(() => inferSchema(schema));
});

test('inverse: cron-like three-template field round-trips via unique-literal dispatch', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  // Mimics CronField:
  //   ${$.value}          (no embedded literals)
  //   ${$.start}-${$.end} (embedded '-')
  //   */${$.step}         (leading '*/')
  //   *                   (all-literal '*')
  const schema = defineSchema({
    rootType: 'Field',
    punctuators: { star: '*', slash: '/', dash: '-' },
    examples: [
      ex('*').as('Field').span('*')
        .render('ast', { type: 'wildcard' })
        .render('source', tpl`*`)
        .build(),
      ex('*/5').as('Field')
        .span('*').span('/').span('step', '5').number().int()
        .render('ast', { type: 'step', step: $.step })
        .render('source', tpl`*/${$.step}`)
        .build(),
      ex('9').as('Field')
        .span('value', '9').number().int()
        .render('ast', { type: 'value', value: $.value })
        .render('source', tpl`${$.value}`)
        .build(),
      ex('1-5').as('Field')
        .span('start', '1').number().int()
        .span('-')
        .span('end', '5').number().int()
        .render('ast', { type: 'range', start: $.start, end: $.end })
        .render('source', tpl`${$.start}-${$.end}`)
        .build(),
    ],
  });
  assert.doesNotThrow(() => inferSchema(schema));
  const mod = await loadGenerated(schema, 'fix1-cronlike');
  // Test forward: render to source preserves the input.
  for (const input of ['*', '*/5', '9', '1-5']) {
    const v1 = mod.render(input, { type: 'source' });
    assert.equal(v1, input);
  }
  // Test the inverse round-trip including the AST target so we exercise
  // the unique-literal dispatch (each AST shape is distinct, so a
  // misrouted inverse would produce a different AST).
  for (const input of ['*', '*/5', '9', '1-5']) {
    const ast1 = mod.render(input, { type: 'ast' });
    const sourceText = mod.render(input, { type: 'source' });
    const back = mod.stringify(sourceText, { type: 'source' });
    const ast2 = mod.render(back, { type: 'ast' });
    assert.deepEqual(ast2, ast1, `roundtrip for ${input}`);
  }
});

// Fix 2: optional spans preceded by a literal separator must be fused with
// that separator so an absent optional doesn't leave a dangling separator
// in the rebuilt source.
test('rebuild: optional trailing span absent collapses both slot and preceding separator', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Greeting',
    examples: [
      ex('hi there').as('Greeting')
        .span('verb', 'hi').ident()
        .span('subject', 'there', 'Word').optional()
        .render('ast', { type: 'greeting', verb: $.verb, subject: $.subject })
        .build(),
      ex('there').as('Word')
        .span('w', 'there').ident()
        .render('ast', $.w)
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'fix2-optional-fusion');
  // With optional subject present: full source rebuilds verbatim.
  assert.equal(mod.stringify(mod.render('hi there', { type: 'ast' }), { type: 'ast' }), 'hi there');
  // With optional subject ABSENT: no trailing space should remain.
  assert.equal(mod.stringify(mod.render('hi', { type: 'ast' }), { type: 'ast' }), 'hi');
});

// Fix 3: `.repeats()` without an explicit `sep` should join children with a
// single space at rebuild time (whitespace-separated at parse time —
// children don't carry their own trailing separator).
test('rebuild: .repeats() without sep joins children with a single space', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Command',
    examples: [
      ex('npm test').as('Command')
        .span('words', 'npm', 'Word').repeats({ min: 1 })
        .render('ast', { type: 'command', words: $.words })
        .build(),
      ex('npm').as('Word')
        .span('w', 'npm').ident()
        .render('ast', $.w)
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'fix3-repeats-join');
  const ast = mod.render('npm test', { type: 'ast' });
  assert.deepEqual(ast, { type: 'command', words: ['npm', 'test'] });
  // Round-trip through stringify must preserve the inter-child space.
  const src = mod.stringify(ast, { type: 'ast' });
  assert.equal(src, 'npm test');
});

// Fix 4: optional span surfaced inside a Template body should render as ""
// when the captured value is null, not as the literal string "null" or
// "undefined".
test('render template body null-coerces missing optional captures to ""', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Greeting',
    examples: [
      ex('hi there').as('Greeting')
        .span('verb', 'hi').ident()
        .span(' ').optional()
        .span('subject', 'there', 'Word').optional()
        .render('ast', { type: 'greeting', verb: $.verb, subject: $.subject })
        .render('html', tpl`<g>${$.verb}<s>${$.subject}</s></g>`)
        .build(),
      ex('there').as('Word')
        .span('w', 'there').ident()
        .render('ast', $.w)
        .render('html', tpl`${$.w}`)
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'fix4-template-null');
  // With optional subject present: rendered HTML contains the captured text.
  assert.equal(mod.render('hi there', { type: 'html' }), '<g>hi<s>there</s></g>');
  // With optional subject absent: rendered HTML must use "" — NOT "null"
  // or "undefined".
  assert.equal(mod.render('hi', { type: 'html' }), '<g>hi<s></s></g>');
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

// Feature 1: Two productions whose template bodies are structurally
// identical (same segments AND same captures) are NOT a collision — the
// inverse dispatcher can pick either and the spec's round-trip contract
// is value-stable, not byte-stable (Design rule 5). The chosen production
// is the lowest-index one for determinism.
test('inverse: structurally-identical template bodies do NOT collide; dispatcher picks lowest-index production', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  // Two heading productions render IDENTICAL HTML — `<h1>${text}</h1>`.
  // Their AST shapes differ ({type:'h1-hash'} vs {type:'h1-bang'}) so the
  // AST target stays unambiguous; the HTML target is the one we're
  // relaxing. Distinct leading punctuators (`#` vs `!`) keep the
  // forward parser unambiguous.
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('text', 'title').ident().css()
        .render('ast', { type: 'h1-hash', text: $.text })
        .render('html', tpl`<h1>${$.text}</h1>`)
        .build(),
      ex('! title').as('Heading')
        .span('!')
        .span('text', 'title').ident().css()
        .render('ast', { type: 'h1-bang', text: $.text })
        .render('html', tpl`<h1>${$.text}</h1>`)
        .build(),
    ],
  });
  // Inference must succeed even though both `html` templates are identical.
  assert.doesNotThrow(() => inferSchema(schema));
  const mod = await loadGenerated(schema, 'feature1-identical-templates');
  // Forward: each input renders to the same HTML.
  const htmlA = mod.render('# title', { type: 'html' });
  const htmlB = mod.render('! title', { type: 'html' });
  assert.equal(htmlA, '<h1>title</h1>');
  assert.equal(htmlB, '<h1>title</h1>');
  // Inverse: stringify must not throw; it picks the lowest-index
  // production (hash form). The re-rendered HTML matches the original.
  const back = mod.stringify(htmlA, { type: 'html' });
  // Lowest-index production is the hash form, so back rebuilds to `# title`.
  assert.equal(back, '# title');
  // Value-stable round-trip: render(stringify(html)) === html.
  const html2 = mod.render(back, { type: 'html' });
  assert.equal(html2, htmlA);
});

// Feature 2: Multi-role recursive captures. Previously, a capture whose
// `recursiveRoles.length > 1` (e.g. `.span('children', '', ['Foo','Bar'])`)
// was rejected at emit time. The dispatcher now recurses INTO each role
// at runtime, selecting the child-node dispatcher whose value-shape
// matches each array element. Children dispatch via the per-(NodeType,
// target) inverse dispatcher already established by Gap C.
test('inverse: multi-role recursive capture dispatches per array element', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Parent 'Doc' captures a heterogeneous children array. Two child node
  // types (Foo / Bar) discriminate by `value.type`. Mimics html's
  // `children: ['Doctype', 'Comment', 'HtmlElement', 'TextNode']` shape.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('foo').as('Doc')
        .span('children', 'foo', ['Foo', 'Bar']).repeats({ min: 1, sep: '|' })
        .render('ast', { type: 'doc', children: $.children })
        .build(),
      ex('foo').as('Foo')
        .span('text', 'foo').ident()
        .render('ast', { type: 'foo', text: $.text })
        .build(),
      ex('!bar').as('Bar')
        .span('!')
        .span('text', 'bar').ident()
        .render('ast', { type: 'bar', text: $.text })
        .build(),
    ],
  });
  // Inference + emit must succeed (previously: error referencing 'v1
  // supports single-role recursive captures only').
  assert.doesNotThrow(() => inferSchema(schema));
  const mod = await loadGenerated(schema, 'feature2-multi-role');
  // Forward: parser yields heterogeneous children array.
  const ast = mod.render('foo|!bar|foo', { type: 'ast' });
  assert.deepEqual(ast, {
    type: 'doc',
    children: [
      { type: 'foo', text: 'foo' },
      { type: 'bar', text: 'bar' },
      { type: 'foo', text: 'foo' },
    ],
  });
  // Round-trip: stringify(render(input, ast), ast) re-renders to the
  // same value (value-stable, not byte-stable per spec rule 5).
  const src = mod.stringify(ast, { type: 'ast' });
  const ast2 = mod.render(src, { type: 'ast' });
  assert.deepEqual(ast2, ast);
  // Verify order and types are preserved.
  const kids = (ast2 as { children: Array<{ type: string }> }).children;
  assert.deepEqual(kids.map((c) => c.type), ['foo', 'bar', 'foo']);
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
