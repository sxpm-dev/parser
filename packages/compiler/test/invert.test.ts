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
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      relation('Heading', {
        input: '# title',
        encodings: {
          src: parse([
            literal('#'),
            span('first', 'title').ident().css(),
          ]),
          ast: { type: 'heading', text: $.first },
        },
      }),
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
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Pair',
    examples: [
      relation('Pair', {
        input: 'a b',
        encodings: {
          src: parse([
            span('a', 'a').ident(),
            span('b', 'b').ident(),
          ]),
          ast: { type: 'pair', a: $.a, b: $.b },
          arr: [$.a, $.b],
        },
      }),
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
  const { defineSchema, relation, parse, span } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Yes',
    examples: [
      relation('Yes', {
        input: 'yes',
        encodings: {
          src: parse([span('y', 'yes').ident()]),
          ast: { type: 'yes' },
          flag: true,
        },
      }),
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
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Word',
    examples: [
      relation('Word', {
        input: 'hello',
        encodings: {
          src: parse([span('v', 'hello').ident()]),
          ast: { type: 'word', v: $.v },
          raw: $.v,
        },
      }),
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
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      relation('Heading', {
        input: '# title',
        encodings: {
          src: parse([
            literal('#'),
            span('first', 'title').ident().css(),
          ]),
          ast: { type: 'heading', text: $.first },
          html: tpl`<h1>${$.first}</h1>`,
        },
      }),
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
  const { defineSchema, relation, parse, span, literal, $, tpl, withInverse } = await import('@parser2/parser');
  // The override path: the schema author explicitly supplies an inverse
  // template via `withInverse()`. The derived InverseIR carries the
  // override's segments, not the body's. When body and override are not
  // mutually round-trippable, the codegen's round-trip closure check
  // (Task 3.1) skips this entry — see check/round-trip.ts header — but
  // the override IS still derived into the IR (this test pins that).
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      relation('Heading', {
        input: '# title',
        encodings: {
          src: parse([
            literal('#'),
            span('first', 'title').ident().css(),
          ]),
          ast: { type: 'heading', text: $.first },
          html: withInverse(tpl`<h1>${$.first}</h1>`, tpl`<H>${$.first}</H>`),
        },
      }),
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
  const { defineSchema, relation, parse, span, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'AB',
    examples: [
      relation('AB', {
        input: 'ab',
        encodings: {
          src: parse([
            span('a', 'a').ident(),
            span('b', 'b').ident(),
          ]),
          ast: { type: 'ab', a: $.a, b: $.b },
          compact: tpl`${$.a}${$.b}`,
        },
      }),
    ],
  });
  assert.throws(() => inferSchema(schema), /slots \$\.a and \$\.b are adjacent with no separator/);
});

test('inverse: indistinguishable productions on object target -> CompilerError', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  // Two productions of node 'Item' both render `{ type: 'item', v: $.v }` to
  // 'ast'. Inverse dispatcher cannot tell them apart from the value alone.
  const schema = defineSchema({
    rootType: 'Item',
    examples: [
      relation('Item', {
        input: 'alpha',
        encodings: {
          src: parse([span('v', 'alpha').ident()]),
          ast: { type: 'item', v: $.v },
        },
      }),
      relation('Item', {
        input: 'beta',
        encodings: {
          src: parse([span('v', 'beta').ident()]),
          ast: { type: 'item', v: $.v },
        },
      }),
    ],
  });
  assert.throws(() => inferSchema(schema), /indistinguishable productions/);
});

// Fix 1: template productions can share an empty leading prefix as long as
// one of them carries a unique embedded literal segment — that segment is a
// runtime discriminator the inverse dispatcher can match on.
test('inverse: two templates with shared empty leading prefix but differing embedded literals do NOT collide', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  // Two productions of 'Field': ${$.value} vs ${$.start}-${$.end}. Both
  // start with a capture (empty leading prefix). The second has an
  // embedded `-` literal between its two captures — that's the runtime
  // discriminator.
  const schema = defineSchema({
    rootType: 'Field',
    examples: [
      relation('Field', {
        input: '5',
        encodings: {
          src: parse([span('value', '5').number().int()]),
          ast: { type: 'value', value: $.value },
          source: tpl`${$.value}`,
        },
      }),
      relation('Field', {
        input: '1-5',
        encodings: {
          src: parse([
            span('start', '1').number().int(),
            literal('-'),
            span('end', '5').number().int(),
          ]),
          ast: { type: 'range', start: $.start, end: $.end },
          source: tpl`${$.start}-${$.end}`,
        },
      }),
    ],
  });
  // Inference should succeed — the `-` literal in the second template
  // distinguishes the two productions at runtime.
  assert.doesNotThrow(() => inferSchema(schema));
});

test('inverse: cron-like three-template field round-trips via unique-literal dispatch', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  // Mimics CronField:
  //   ${$.value}          (no embedded literals)
  //   ${$.start}-${$.end} (embedded '-')
  //   */${$.step}         (leading '*/')
  //   *                   (all-literal '*')
  const schema = defineSchema({
    rootType: 'Field',
    punctuators: { star: '*', slash: '/', dash: '-' },
    examples: [
      relation('Field', {
        input: '*',
        encodings: {
          src: parse([literal('*')]),
          ast: { type: 'wildcard' },
          source: tpl`*`,
        },
      }),
      relation('Field', {
        input: '*/5',
        encodings: {
          src: parse([
            literal('*'),
            literal('/'),
            span('step', '5').number().int(),
          ]),
          ast: { type: 'step', step: $.step },
          source: tpl`*/${$.step}`,
        },
      }),
      relation('Field', {
        input: '9',
        encodings: {
          src: parse([span('value', '9').number().int()]),
          ast: { type: 'value', value: $.value },
          source: tpl`${$.value}`,
        },
      }),
      relation('Field', {
        input: '1-5',
        encodings: {
          src: parse([
            span('start', '1').number().int(),
            literal('-'),
            span('end', '5').number().int(),
          ]),
          ast: { type: 'range', start: $.start, end: $.end },
          source: tpl`${$.start}-${$.end}`,
        },
      }),
    ],
  });
  assert.doesNotThrow(() => inferSchema(schema));
  const mod = await loadGenerated(schema, 'fix1-cronlike');
  // Test forward: render to source preserves the input.
  for (const input of ['*', '*/5', '9', '1-5']) {
    const v1 = mod.render(input, { target: 'source' });
    assert.equal(v1, input);
  }
  // Test the inverse round-trip including the AST target so we exercise
  // the unique-literal dispatch (each AST shape is distinct, so a
  // misrouted inverse would produce a different AST).
  for (const input of ['*', '*/5', '9', '1-5']) {
    const ast1 = mod.render(input, { target: 'ast' });
    const sourceText = mod.render(input, { target: 'source' });
    const back = mod.stringify(sourceText, { target: 'source' });
    const ast2 = mod.render(back, { target: 'ast' });
    assert.deepEqual(ast2, ast1, `roundtrip for ${input}`);
  }
});

// Fix 2: optional spans preceded by a literal separator must be fused with
// that separator so an absent optional doesn't leave a dangling separator
// in the rebuilt source.
test('rebuild: optional trailing span absent collapses both slot and preceding separator', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Greeting',
    examples: [
      relation('Greeting', {
        input: 'hi there',
        encodings: {
          src: parse([
            span('verb', 'hi').ident(),
            span('subject', 'there').of('Word').optional(),
          ]),
          ast: { type: 'greeting', verb: $.verb, subject: $.subject },
        },
      }),
      relation('Word', {
        input: 'there',
        encodings: {
          src: parse([span('w', 'there').ident()]),
          ast: $.w,
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'fix2-optional-fusion');
  // With optional subject present: full source rebuilds verbatim.
  assert.equal(mod.stringify(mod.render('hi there', { target: 'ast' }), { target: 'ast' }), 'hi there');
  // With optional subject ABSENT: no trailing space should remain.
  assert.equal(mod.stringify(mod.render('hi', { target: 'ast' }), { target: 'ast' }), 'hi');
});

// Fix 3: `.repeats()` without an explicit `sep` should join children with a
// single space at rebuild time (whitespace-separated at parse time —
// children don't carry their own trailing separator).
test('rebuild: .repeats() without sep joins children with a single space', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Command',
    examples: [
      relation('Command', {
        input: 'npm test',
        encodings: {
          src: parse([span('words', 'npm').of('Word').repeats({ min: 1 })]),
          ast: { type: 'command', words: $.words },
        },
      }),
      relation('Word', {
        input: 'npm',
        encodings: {
          src: parse([span('w', 'npm').ident()]),
          ast: $.w,
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'fix3-repeats-join');
  const ast = mod.render('npm test', { target: 'ast' });
  assert.deepEqual(ast, { type: 'command', words: ['npm', 'test'] });
  // Round-trip through stringify must preserve the inter-child space.
  const src = mod.stringify(ast, { target: 'ast' });
  assert.equal(src, 'npm test');
});

// Fix 4: optional span surfaced inside a Template body should render as ""
// when the captured value is null, not as the literal string "null" or
// "undefined".
test('render template body null-coerces missing optional captures to ""', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Greeting',
    examples: [
      relation('Greeting', {
        input: 'hi there',
        encodings: {
          src: parse([
            span('verb', 'hi').ident(),
            literal(' ').optional(),
            span('subject', 'there').of('Word').optional(),
          ]),
          ast: { type: 'greeting', verb: $.verb, subject: $.subject },
          html: tpl`<g>${$.verb}<s>${$.subject}</s></g>`,
        },
      }),
      relation('Word', {
        input: 'there',
        encodings: {
          src: parse([span('w', 'there').ident()]),
          ast: $.w,
          html: tpl`${$.w}`,
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'fix4-template-null');
  // With optional subject present: rendered HTML contains the captured text.
  assert.equal(mod.render('hi there', { target: 'html' }), '<g>hi<s>there</s></g>');
  // With optional subject absent: rendered HTML must use "" — NOT "null"
  // or "undefined".
  assert.equal(mod.render('hi', { target: 'html' }), '<g>hi<s></s></g>');
});

// ---------- Round-trip via generated parser -------------------------------

test('round-trip: render(stringify(render(x, T), T), T) === render(x, T) for ast', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      relation('Heading', {
        input: '# title',
        encodings: {
          src: parse([
            literal('#'),
            span('first', 'title').ident().css(),
          ]),
          ast: { type: 'heading', text: $.first },
          html: tpl`<h1>${$.first}</h1>`,
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-roundtrip-ast');
  const original = '# title';
  const v1 = mod.render(original, { target: 'ast' });
  const src = mod.stringify(v1, { target: 'ast' });
  const v2 = mod.render(src, { target: 'ast' });
  assert.deepEqual(v2, v1);
});

test('round-trip: render(stringify(render(x, T), T), T) === render(x, T) for html', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      relation('Heading', {
        input: '# title',
        encodings: {
          src: parse([
            literal('#'),
            span('first', 'title').ident().css(),
          ]),
          ast: { type: 'heading', text: $.first },
          html: tpl`<h1>${$.first}</h1>`,
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-roundtrip-html');
  const original = '# title';
  const v1 = mod.render(original, { target: 'html' });
  const src = mod.stringify(v1, { target: 'html' });
  const v2 = mod.render(src, { target: 'html' });
  assert.deepEqual(v2, v1);
});

test('stringify(value, { type: "ast" }) reconstructs source', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      relation('Heading', {
        input: '# title',
        encodings: {
          src: parse([
            literal('#'),
            span('first', 'title').ident().css(),
          ]),
          ast: { type: 'heading', text: $.first },
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-stringify-ast');
  const value = mod.render('# title', { target: 'ast' });
  assert.equal(mod.stringify(value, { target: 'ast' }), '# title');
});

test('stringify with missing target throws', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Word',
    examples: [
      relation('Word', {
        input: 'hi',
        encodings: {
          src: parse([span('v', 'hi').ident()]),
          ast: { type: 'word', v: $.v },
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-stringify-missing');
  assert.throws(() => mod.stringify({ type: 'word', v: 'hi' }), /stringify: missing target/);
});

test('stringify with unknown target throws', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Word',
    examples: [
      relation('Word', {
        input: 'hi',
        encodings: {
          src: parse([span('v', 'hi').ident()]),
          ast: { type: 'word', v: $.v },
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-stringify-unknown');
  assert.throws(() => mod.stringify({ type: 'word', v: 'hi' }, { target: 'bogus' }), /stringify: unknown target 'bogus'/);
});

test('round-trip: array body with positional captures', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Pair',
    examples: [
      relation('Pair', {
        input: 'a b',
        encodings: {
          src: parse([
            span('a', 'a').ident(),
            span('b', 'b').ident(),
          ]),
          ast: { type: 'pair', a: $.a, b: $.b },
          arr: [$.a, $.b],
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-roundtrip-array');
  const v1 = mod.render('a b', { target: 'arr' });
  assert.deepEqual(v1, ['a', 'b']);
  const src = mod.stringify(v1, { target: 'arr' });
  const v2 = mod.render(src, { target: 'arr' });
  assert.deepEqual(v2, v1);
});

test('round-trip: scalar body asserts equality and rebuilds source', async () => {
  const { defineSchema, relation, parse, span } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Yes',
    examples: [
      relation('Yes', {
        input: 'yes',
        encodings: {
          src: parse([span('y', 'yes').ident()]),
          ast: { type: 'yes' },
          flag: true,
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'phase4-roundtrip-scalar');
  // forward: render -> true
  assert.equal(mod.render('yes', { target: 'flag' }), true);
  // inverse: stringify(true, flag) -> source
  assert.equal(mod.stringify(true, { target: 'flag' }), 'yes');
  // mismatched scalar throws (no production matches because the scalar
  // dispatcher routes only on equal value).
  assert.throws(() => mod.stringify(false, { target: 'flag' }), /stringify: no production matches/);
});

// Feature 1: Two productions whose template bodies are structurally
// identical (same segments AND same captures) are NOT a collision — the
// inverse dispatcher can pick either and the spec's round-trip contract
// is value-stable, not byte-stable (Design rule 5). The chosen production
// is the lowest-index one for determinism.
test('inverse: structurally-identical template bodies do NOT collide; dispatcher picks lowest-index production', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  // Two heading productions render IDENTICAL HTML — `<h1>${text}</h1>`.
  // Their AST shapes differ ({type:'h1-hash'} vs {type:'h1-bang'}) so the
  // AST target stays unambiguous; the HTML target is the one we're
  // relaxing. Distinct leading punctuators (`#` vs `!`) keep the
  // forward parser unambiguous.
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      relation('Heading', {
        input: '# title',
        encodings: {
          src: parse([
            literal('#'),
            span('text', 'title').ident().css(),
          ]),
          ast: { type: 'h1-hash', text: $.text },
          html: tpl`<h1>${$.text}</h1>`,
        },
      }),
      relation('Heading', {
        input: '! title',
        encodings: {
          src: parse([
            literal('!'),
            span('text', 'title').ident().css(),
          ]),
          ast: { type: 'h1-bang', text: $.text },
          html: tpl`<h1>${$.text}</h1>`,
        },
      }),
    ],
  });
  // Inference must succeed even though both `html` templates are identical.
  assert.doesNotThrow(() => inferSchema(schema));
  const mod = await loadGenerated(schema, 'feature1-identical-templates');
  // Forward: each input renders to the same HTML.
  const htmlA = mod.render('# title', { target: 'html' });
  const htmlB = mod.render('! title', { target: 'html' });
  assert.equal(htmlA, '<h1>title</h1>');
  assert.equal(htmlB, '<h1>title</h1>');
  // Inverse: stringify must not throw; it picks the lowest-index
  // production (hash form). The re-rendered HTML matches the original.
  const back = mod.stringify(htmlA, { target: 'html' });
  // Lowest-index production is the hash form, so back rebuilds to `# title`.
  assert.equal(back, '# title');
  // Value-stable round-trip: render(stringify(html)) === html.
  const html2 = mod.render(back, { target: 'html' });
  assert.equal(html2, htmlA);
});

// Feature 2: Multi-role recursive captures. Previously, a capture whose
// `recursiveRoles.length > 1` (e.g. `.span('children', '', ['Foo','Bar'])`)
// was rejected at emit time. The dispatcher now recurses INTO each role
// at runtime, selecting the child-node dispatcher whose value-shape
// matches each array element. Children dispatch via the per-(NodeType,
// target) inverse dispatcher already established by Gap C.
test('inverse: multi-role recursive capture dispatches per array element', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Parent 'Doc' captures a heterogeneous children array. Two child node
  // types (Foo / Bar) discriminate by `value.type`. Mimics html's
  // `children: ['Doctype', 'Comment', 'HtmlElement', 'TextNode']` shape.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Doc', {
        input: 'foo',
        encodings: {
          src: parse([span('children', 'foo').of('Foo', 'Bar').repeats({ min: 1, sep: '|' })]),
          ast: { type: 'doc', children: $.children },
        },
      }),
      relation('Foo', {
        input: 'foo',
        encodings: {
          src: parse([span('text', 'foo').ident()]),
          ast: { type: 'foo', text: $.text },
        },
      }),
      relation('Bar', {
        input: '!bar',
        encodings: {
          src: parse([
            literal('!'),
            span('text', 'bar').ident(),
          ]),
          ast: { type: 'bar', text: $.text },
        },
      }),
    ],
  });
  // Inference + emit must succeed (previously: error referencing 'v1
  // supports single-role recursive captures only').
  assert.doesNotThrow(() => inferSchema(schema));
  const mod = await loadGenerated(schema, 'feature2-multi-role');
  // Forward: parser yields heterogeneous children array.
  const ast = mod.render('foo|!bar|foo', { target: 'ast' });
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
  const src = mod.stringify(ast, { target: 'ast' });
  const ast2 = mod.render(src, { target: 'ast' });
  assert.deepEqual(ast2, ast);
  // Verify order and types are preserved.
  const kids = (ast2 as { children: Array<{ type: string }> }).children;
  assert.deepEqual(kids.map((c) => c.type), ['foo', 'bar', 'foo']);
});

// generateParser code shape: both render + stringify exported.
test('generateParser emits public render and public stringify', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      relation('Heading', {
        input: '# title',
        encodings: {
          src: parse([
            literal('#'),
            span('first', 'title').ident().css(),
          ]),
          ast: { type: 'heading', text: $.first },
          html: tpl`<h1>${$.first}</h1>`,
        },
      }),
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

// Task #18: source-target template bodies are reconstructed from the
// template's literal segments + captures, not from production spans. This
// matters when a span's refinement strips part of the source slice into
// the capture (e.g. `.comment()` removes `/* */` delimiters from a CSS
// comment's text). The span-driven rebuild would emit only the stripped
// interior; the template-driven path wraps it back with the delimiters
// from the template's segments.
test('inverse: source-target template rebuild restores stripped delimiters', async () => {
  const { defineSchema, relation, parse, span, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Comment',
    examples: [
      relation('Comment', {
        input: '/* hi */',
        encodings: {
          src: parse([span('text', '/* hi */').comment()]),
          ast: { type: 'comment', text: $.text },
          source: tpl`/* ${$.text} */`,
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'template-rebuild-comment');
  // Forward: source template wraps the stripped interior with delimiters.
  assert.equal(mod.render('/* hi */', { target: 'source' }), '/* hi */');
  // Inverse from the AST: stringify routes through Comment_source dispatcher,
  // template scanner extracts text='hi', template rebuild puts delimiters
  // back via the segments.
  assert.equal(mod.stringify({ type: 'comment', text: 'hi' }, { target: 'ast' }), '/* hi */');
  // Inverse from source self-round-trip: stringify a source string through
  // the source target — also routes through template rebuild.
  assert.equal(mod.stringify('/* hi */', { target: 'source' }), '/* hi */');
});

// Phase 2.2 / Task #17: substring-based template dispatch is unsafe when
// any sibling production has a span that captures arbitrary text (string /
// .until() / .rawUntil()). A forward-rendered sibling value could embed
// the would-be discriminator literal and mis-route to this branch. The
// dispatcher now wraps every non-safe-prefix branch in try/catch so the
// next plan in priority order gets a chance when this one's positional
// template scan throws — the inverter IS the position-anchored validator.
test('inverse: unsafe substring dispatch falls through to sibling on inverter throw', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  // Mimics CSS Declaration#0 (!important) vs Declaration#1 (plain). Both
  // share an empty leading prefix because they begin with a capture.
  // Decl#0 has ` !` between value and important — a unique segment vs
  // Decl#1 — so the old dispatcher emitted `value.indexOf(" !") >= 0`.
  // A plain Decl whose value field legitimately contains ` !` would
  // mis-route to Decl#0 before this fix; now the inverter's template
  // scan throws on the missing `important` ident and the dispatcher
  // falls through to Decl#1.
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'color: red !important;',
        encodings: {
          src: parse([
            span('prop', 'color').until([':', ';']),
            literal(':'),
            literal(' '),
            span('value', 'red').until([';', '!']),
            literal('!'),
            span('important', 'important').ident().css(),
            literal(';'),
          ]),
          ast: { type: 'decl', prop: $.prop, value: $.value, important: true },
          source: tpl`${$.prop}: ${$.value} !${$.important};`,
        },
      }),
      relation('Decl', {
        input: 'color: red;',
        encodings: {
          src: parse([
            span('prop', 'color').until([':', ';']),
            literal(':'),
            literal(' '),
            span('value', 'red').until([';']),
            literal(';'),
          ]),
          ast: { type: 'decl', prop: $.prop, value: $.value },
          source: tpl`${$.prop}: ${$.value};`,
        },
      }),
    ],
  });
  const mod = await loadGenerated(schema, 'unsafe-dispatch-fallthrough');
  // Decl#1 with value `red !` triggers indexOf(" !") on Decl#0; #0's
  // scanner can't extract a valid `important` ident from `red !; ` so it
  // throws, dispatcher falls through to #1, which scans cleanly.
  const back = mod.stringify('x: red !foo;', { target: 'source' });
  assert.equal(back, 'x: red !foo;');
});

// ---------- Helpers --------------------------------------------------------

type GeneratedModule = {
  render: (input: string, options?: { target?: string }) => unknown;
  stringify: (value: unknown, options?: { target?: string }) => string;
};

async function loadGenerated(schema: unknown, name: string): Promise<GeneratedModule> {
  const code = generateParser(schema as Parameters<typeof generateParser>[0], undefined, { packageName: name });
  const dir = mkdtempSync(join(tmpdir(), `parser2-${name}-`));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  return (await import(pathToFileURL(file).href)) as GeneratedModule;
}
