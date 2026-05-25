import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser, inferSchema } from '../src/index.ts';
import { derivedStringifyTemplates } from '../src/model.ts';

// Tests for the unified .render(target, body) IR built by
// infer/render-targets.ts (Phase 2 of the unified-render-targets refactor).

test('attachRenderTargets collects every declared target onto Production.renders', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('# title')
        .as('Atom')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: [$.first] })
        .render('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  assert.deepEqual([...production.renders.keys()].sort(), ['ast', 'html']);
  // The 'ast' entry preserves the structured body verbatim (object form).
  const ast = production.renders.get('ast')!;
  assert.equal((ast.body as { type: string }).type, 'heading');
  // The 'html' entry preserves the Template body verbatim.
  const html = production.renders.get('html')!;
  assert.equal((html.body as { __tpl: true }).__tpl, true);
});

test('duplicate render target on one production is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .render('ast', { type: 'atom', v: $.v })
        .render('html', tpl`<a>${$.v}</a>`)
        .render('html', tpl`<b>${$.v}</b>`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /duplicate render target 'html'/);
});

test('template slot referencing unknown span is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .render('ast', { type: 'atom', v: $.v })
        .render('html', tpl`<a>${$.missing}</a>`)
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /slot \$\.missing references unknown span/);
});

test('object-body $.name ref to unknown span is rejected', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .render('ast', { type: 'atom', wrong: $.missing })
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /slot \$\.missing references unknown span/);
});

test('inverse-template slot referencing unknown span is rejected', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .render('ast', { type: 'atom', v: $.v })
        .render('html', tpl`<a>${$.v}</a>`, { inverse: tpl`<a>${$.missing}</a>` })
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /slot \$\.missing references unknown span/);
});

test('per-target completeness: every production of a node type must declare the same set of targets', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  // Two productions of the same node type — one declares 'html', the other
  // doesn't. attachRenderTargets must reject this so dispatch tables don't
  // have to handle a "missing template" runtime case.
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('x').as('Atom').span('v', 'x').ident()
        .render('ast', { type: 'atom', v: $.v })
        .render('html', tpl`<a>${$.v}</a>`)
        .build(),
      ex('y').as('Atom').span('v', 'y').ident()
        .render('ast', { type: 'atom', v: $.v })
        .build(),
    ],
  });
  assert.throws(() => inferSchema(schema), /missing render target\(s\) 'html'/);
});

test('derivedStringifyTemplates exposes the legacy view (template bodies only)', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Atom',
    examples: [
      ex('# title')
        .as('Atom')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: [$.first] })
        .render('html', tpl`<h1>${$.first}</h1>`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  const production = inferred.nodeTypes.get('Atom')!.productions[0]!;
  const templates = derivedStringifyTemplates(production);
  const html = templates.find((t) => t.target === 'html');
  assert.ok(html, 'html template surfaced through bridge');
  assert.deepEqual(html!.parts, ['<h1>', '</h1>']);
  assert.deepEqual(html!.slots, [{ kind: 'capture', ref: 'first' }]);
  // The structured 'ast' body is NOT a template, so it's filtered out.
  assert.equal(templates.find((t) => t.target === 'ast'), undefined);
});

test('generateParser emits stringify that dispatches by ast body type', async () => {
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
  assert.match(code, /export function stringify\(/);
  assert.match(code, /stringify_Heading_html/);
});

test('stringify(parse(input), { target: "html" }) returns the templated HTML', async () => {
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
        .render('ast', { type: 'heading', text: $.first })
        .render('html', tpl`<h1>${$.first}</h1>`)
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
});

test('parity: render(input, { target }) === stringify(parse(input), { target }) for declared targets', async () => {
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
  const code = generateParser(schema, undefined, { packageName: 'test-parity' });
  const dir = mkdtempSync(join(tmpdir(), 'parser2-parity-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = await import(pathToFileURL(file).href) as {
    parse: (input: string) => unknown;
    stringify: (s: unknown, opts?: { target?: string }) => string;
    render: (input: string, opts?: { target?: string }) => string;
  };
  for (const target of ['html']) {
    assert.equal(
      mod.render('# title', { target }),
      mod.stringify(mod.parse('# title'), { target }),
      `parity at target ${target}`,
    );
  }
});
