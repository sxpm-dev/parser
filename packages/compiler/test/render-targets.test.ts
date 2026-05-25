import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser, inferSchema } from '../src/index.ts';

// Tests for the unified .render(target, body) IR built by
// infer/render-targets.ts (Phase 2) and the structural forward emit landed
// in Phase 3 (emit/render.ts).
//
// Phase 3 removed public `stringify` — Phase 4 will re-introduce it via
// inverse derivation. Tests that exercised the old stringify-driven
// behaviour either move to the per-target render or are skipped pending
// Phase 4.

// ---------- IR-level checks (attachRenderTargets) -------------------------

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

// ---------- Emit checks (generateParser) ----------------------------------

test('generateParser emits both public render and public stringify (Phase 4)', async () => {
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
  // Phase 4 derives an inverse per (production, target) and emits
  // __invert_<Node>_<idx>_<target> plus a per-target dispatcher and a
  // public stringify(value, options).
  assert.match(code, /export function stringify\(/);
  // The forward render side remains unchanged.
  assert.match(code, /export function render\(/);
  assert.match(code, /__build_Heading_0_html/);
  assert.match(code, /__build_Heading_0_ast/);
  assert.match(code, /__renderDispatch/);
  assert.match(code, /__inverseDispatch/);
});

test('render(input, { type: "html" }) returns the templated HTML', async () => {
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
  const mod = await loadGenerated(schema, 'phase3-render-html');
  assert.equal(mod.render('# title', { type: 'html' }), '<h1>title</h1>');
});

test('render(input, { type: "ast" }) returns the structured AST', async () => {
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
  const mod = await loadGenerated(schema, 'phase3-render-ast');
  assert.deepEqual(mod.render('# title', { type: 'ast' }), { type: 'heading', text: 'title' });
});

// ---------- Targeted body-shape tests (TDD) -------------------------------

test('forward emit: scalar body returns the literal', async () => {
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
  const mod = await loadGenerated(schema, 'phase3-scalar-body');
  assert.equal(mod.render('yes', { type: 'flag' }), true);
});

test('forward emit: bare $.name body returns the captured value', async () => {
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
  const mod = await loadGenerated(schema, 'phase3-ref-body');
  assert.equal(mod.render('hello', { type: 'raw' }), 'hello');
});

test('forward emit: array body allocates an array', async () => {
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
  const mod = await loadGenerated(schema, 'phase3-array-body');
  assert.deepEqual(mod.render('a b', { type: 'arr' }), ['a', 'b']);
});

// ---------- Default-target behaviour --------------------------------------

test('render(input) without type uses schema.defaultTarget', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Heading',
    defaultTarget: 'ast',
    examples: [
      ex('# title').as('Heading')
        .span('#')
        .span('first', 'title').ident().css()
        .render('ast', { type: 'heading', text: $.first })
        .build(),
    ],
  });
  const mod = await loadGenerated(schema, 'phase3-default-target');
  assert.deepEqual(mod.render('# title'), { type: 'heading', text: 'title' });
});

test('render(input) throws when neither type nor defaultTarget is set', async () => {
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
  const mod = await loadGenerated(schema, 'phase3-no-default-target');
  assert.throws(() => mod.render('# title'), /render: missing target/);
});

test('render(input, { type: "bogus" }) throws unknown target', async () => {
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
  const mod = await loadGenerated(schema, 'phase3-unknown-target');
  assert.throws(() => mod.render('# title', { type: 'bogus' }), /render: unknown target 'bogus'/);
});

// ---------- Recovery + interleaved-valid regression -----------------------
//
// Regression for the scannerless-emit bug where emitNodeFunctionWithRecovery
// constructed a phantom validInfo (filtered subset of productions) and
// recursed into emitNodeFunction. The recursion stamped captures.__production
// with subset indices (e.g. 0,1) — but the per-target render dispatcher
// switch was emitted from the FULL info (so it expects 0,2). When valid
// productions don't form a prefix of info.productions (i.e. valid alts
// interleave with recovery alts), the dispatcher silently misroutes any
// valid alt whose full-info index sits past a recovery alt — invoking the
// wrong builder (or, if the recovery builder's shape happens to be
// compatible, returning the recovery shape for a valid input).
//
// Setup: valid(idx 0), recovery(idx 1), valid(idx 2). Without the fix,
// the third production gets stamped `<Node>#1` and routes to the
// recovery builder.

test('recovery production interleaved with valid productions: __production keys preserve full-info indices', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      // index 0: valid — `<a>v</a>`
      ex('<a>v</a>').as('X')
        .span('<a>')
        .span('v', 'v').ident()
        .span('</a>')
        .render('ast', { type: 'a', v: $.v })
        .render('html', tpl`<a>${$.v}</a>`)
        .build(),
      // index 1: recovery — `!` followed by raw text up to `;`
      ex('!bad;').as('X')
        .span('!')
        .span('rest', 'bad').rawUntil([';'])
        .span(';')
        .recovers({ syncAt: [';'], drop: 'x-bad' })
        .render('ast', { type: 'bad', rest: $.rest })
        .render('html', tpl`<!--${$.rest}-->`)
        .build(),
      // index 2: valid — `<c>v</c>`. THIS is the indexing risk: the buggy
      // path would stamp this with `X#1` (the subset index inside the
      // filtered valid list), routing it to the recovery builder.
      ex('<c>v</c>').as('X')
        .span('<c>')
        .span('v', 'v').ident()
        .span('</c>')
        .render('ast', { type: 'c', v: $.v })
        .render('html', tpl`<c>${$.v}</c>`)
        .build(),
    ],
  });
  const code = generateParser(schema as Parameters<typeof generateParser>[0], undefined, { packageName: 'recovery-interleave' });
  // The generated source should reference full-info indices (X#0, X#1, X#2)
  // and emit builders for each of them. The bug stamped X#1 onto BOTH the
  // recovery production and the valid `<c>` production — confirm that the
  // captures payload for the `<c>` production carries X#2, not X#1.
  assert.match(code, /"X#2"/);
  assert.match(code, /__build_X_2_ast/);
  assert.match(code, /__build_X_2_html/);
  const mod = await loadGenerated(schema, 'recovery-interleave');
  // Forward-render the valid-at-full-index-2 production through both
  // targets. Misrouted dispatch would either throw "unknown production
  // X#3" (the builder doesn't exist) or, worse, silently invoke the
  // recovery builder and return `{ type: 'bad', rest: 'v' }`.
  assert.deepEqual(mod.render('<c>v</c>', { type: 'ast' }), { type: 'c', v: 'v' });
  assert.equal(mod.render('<c>v</c>', { type: 'html' }), '<c>v</c>');
  // Sanity: the index-0 production still routes correctly.
  assert.deepEqual(mod.render('<a>v</a>', { type: 'ast' }), { type: 'a', v: 'v' });
  assert.equal(mod.render('<a>v</a>', { type: 'html' }), '<a>v</a>');
});

// ---------- Helpers --------------------------------------------------------

type GeneratedModule = {
  parse: (input: string, options?: unknown) => unknown;
  render: (input: string, options?: { type?: string }) => unknown;
};

async function loadGenerated(schema: unknown, name: string): Promise<GeneratedModule> {
  const code = generateParser(schema as Parameters<typeof generateParser>[0], undefined, { packageName: name });
  const dir = mkdtempSync(join(tmpdir(), `parser2-${name}-`));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  return (await import(pathToFileURL(file).href)) as GeneratedModule;
}
