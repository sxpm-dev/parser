import assert from 'node:assert/strict';
import test from 'node:test';
import { inferSchema } from '../src/index.ts';

test('author templates are attached to the production they describe', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('# title')
        .as('Atom')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: [$.first] })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  const html = production.stringifyTemplates.find((t) => t.target === 'html');
  assert.ok(html, 'html template attached');
  assert.deepEqual(html!.parts, ['<h1>', '</h1>']);
  assert.deepEqual(html!.slots, [{ kind: 'capture', ref: 'first' }]);
});

test('reserved target name "source" rejected from author templates', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('source', tpl`${$.v}`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /reserved target name 'source'/);
});

test('duplicate target on one production is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('html', tpl`<a>${$.v}</a>`)
        .stringify('html', tpl`<b>${$.v}</b>`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /duplicate stringify target 'html'/);
});

test('unresolved slot ref (no matching span) is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .structure({ type: 'atom', v: $.v })
        .stringify('html', tpl`<a>${$.missing}</a>`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /slot \$\.missing references unknown span/);
});

test('source template auto-derives from literal + classed spans (whitespace: standard)', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Heading')!.productions[0]!;
  const source = production.stringifyTemplates.find((t) => t.target === 'source');
  assert.ok(source, 'source template synthesized');
  assert.equal(source!.parts.length, source!.slots.length + 1);
  assert.deepEqual(source!.slots, [{ kind: 'capture', ref: 'first' }]);
});

test('source template includes a slot for a .repeats() span (interpolated as joined recursion)', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('a b').as('Doc')
        .span('items', 'a b', 'Atom').repeats({ min: 0 })
        .structure({ type: 'doc', items: $.items })
        .build(),
      ex('a').as('Atom').span('v', 'a').ident().structure({ type: 'atom', v: $.v }).build(),
    ],
  });
  const inferred = inferSchema(schema);
  const docSource = inferred.nodeTypes.get('Doc')!.productions[0]!.stringifyTemplates.find((t) => t.target === 'source');
  assert.ok(docSource);
  assert.deepEqual(docSource!.slots, [{ kind: 'capture', ref: 'items' }]);
});

test('every production gets a source template even when no author templates exist', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident().structure({ type: 'atom', v: $.v }).build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  assert.ok(production.stringifyTemplates.find((t) => t.target === 'source'));
});

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser } from '../src/index.ts';

test('generateParser emits a stringify function that dispatches by structure.type', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test' });
  assert.match(code, /export function stringify\(/);
  assert.match(code, /stringify_Heading_html/);
  assert.match(code, /stringify_Heading_source/);
  // Compiler must not branch on target name strings — the generated code
  // dispatches on the opaque target value, but the helper string-equality
  // checks inside the generated file are data, not compiler logic. The
  // acceptance grep at Task 16 only fails on `target === 'html'` etc. in
  // packages/compiler/src/, never in generated files.
});

test('stringify(parse(input), { target: "html" }) returns the templated HTML', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test-stringify' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-stringify-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = await import(pathToFileURL(file).href) as {
    parse: (input: string) => unknown;
    stringify: (s: unknown, opts?: { target?: string }) => string;
  };
  const parsed = mod.parse('# title');
  assert.equal(mod.stringify(parsed, { target: 'html' }), '<h1>title</h1>');
});

test('render(input, { target: "html" }) returns the templated HTML', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test-render' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-render-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = await import(pathToFileURL(file).href) as {
    parse: (input: string) => unknown;
    stringify: (s: unknown, opts?: { target?: string }) => string;
    render: (input: string, opts?: { target?: string }) => string;
  };
  assert.equal(mod.render('# title', { target: 'html' }), '<h1>title</h1>');
  // Default target = 'source'; auto-derived round-trip emits canonical form.
  const sourceOut = mod.render('# title');
  assert.equal(typeof sourceOut, 'string');
  assert.ok(sourceOut.includes('title'));
});

test('parity: render(input) === stringify(parse(input)) for every target', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .structure({ type: 'heading', text: $.first })
        .stringify('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { packageName: 'test-parity' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-parity-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = await import(pathToFileURL(file).href) as {
    parse: (input: string) => unknown;
    stringify: (s: unknown, opts?: { target?: string }) => string;
    render: (input: string, opts?: { target?: string }) => string;
  };
  for (const target of ['source', 'html']) {
    assert.equal(
      mod.render('# title', { target }),
      mod.stringify(mod.parse('# title'), { target }),
      `parity at target ${target}`,
    );
  }
});
