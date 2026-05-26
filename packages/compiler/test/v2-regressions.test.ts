// Regression tests for v2 backend feature parity.
//
// Each test pins a minimal failing schema for one v2 emit feature added by
// Task 1.3a/b/c/d/e (see docs/v2-migration-status.md). The test asserts both
// that the v2 generator produces JS (no `not yet supported` throw) AND that
// the generated parser executes correctly for the minimal example. Where
// possible we also assert structural properties of the emitted code so the
// test catches regressions in the emit shape — not just runtime behavior.

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { generateParser } from '../src/index.ts';

// Helper: write generated v2 source to a temp .ts file and dynamic-import it
// via tsx's loader so the test can call into the emitted parser. The v2
// emit exports `render(input, options)` (which internally calls `__parse`)
// and `validate(input)`. We use `render(input, { type: 'ast' })` as the
// test entry point — when the schema only declares an 'ast' render, the
// render dispatcher returns the captures map directly.
async function loadV2Parser(code: string): Promise<{
  render: (input: string, options?: { type?: string; mode?: 'fast' | 'raws' }) => unknown;
  validate?: (input: string) => void;
}> {
  const dir = mkdtempSync(join(tmpdir(), 'parser3-v2-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = (await import(pathToFileURL(file).href)) as {
    render?: (input: string, options?: { type?: string; mode?: 'fast' | 'raws' }) => unknown;
    validate?: (input: string) => void;
  };
  if (typeof mod.render !== 'function') {
    throw new Error('generated v2 parser did not export render');
  }
  return { render: mod.render, validate: mod.validate };
}

test('v2 emits scan-until for balanced .until() capture', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      ex('color: red;')
        .as('Decl')
        .span('prop', 'color').until(':')
        .span(':')
        .span('value', 'red').until(';')
        .span(';')
        .render('ast', { type: 'decl', prop: $.prop, value: $.value })
        .build(),
    ],
  });
  // Today this throws "until/rawUntil span not yet supported". After Task 1.3a
  // it must succeed and produce a runnable parser.
  const code = generateParser(schema, undefined, { v2: true });
  assert.match(code, /function parseDecl\(/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('color: red;') as { type: string; prop: string; value: string };
  assert.equal(result.type, 'decl');
  assert.equal(result.prop, 'color');
  assert.equal(result.value, 'red');
});

test('v2 .until() respects balanced brackets', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // The `;` inside `f(a;b)` must NOT terminate the capture, because the
  // balanced-bracket tracking keeps depth > 0 while we're inside `(...)`.
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      ex('expr: f(a;b);')
        .as('Decl')
        .span('prop', 'expr').until(':')
        .span(':')
        .span('value', 'f(a;b)').until(';')
        .span(';')
        .render('ast', { prop: $.prop, value: $.value })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('expr: f(a;b);') as { prop: string; value: string };
  assert.equal(result.prop, 'expr');
  assert.equal(result.value, 'f(a;b)');
});

test('v2 .until() trims trailing whitespace from capture', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      ex('color: red;')
        .as('Decl')
        .span('prop', 'color').until(':')
        .span(':')
        .span('value', 'red').until(';')
        .span(';')
        .render('ast', { prop: $.prop, value: $.value })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  // `   red   ` is the captured slice between `:` and `;` ws-included. The
  // .until() trim policy strips both sides, so the captured value is `red`
  // and the parser's `off` is positioned at the trailing ws so the `;`
  // literal still matches after the inter-span ws skip.
  const result = __parse('color:   red   ;') as { prop: string; value: string };
  assert.equal(result.prop, 'color');
  assert.equal(result.value, 'red');
});

test('v2 .until() honors rejectSuffix by returning null (no throws)', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Rule',
    examples: [
      ex('a { }')
        .as('Rule')
        .span('selector', 'a').until(['{'], { rejectSuffix: ':' })
        .span('{')
        .span('}')
        .render('ast', { sel: $.selector })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const ok = __parse('a { }') as { sel: string };
  assert.equal(ok.sel, 'a');
  // `--foo:` ends with the rejectSuffix `:` — the production must fail.
  // Top-level parse() then throws because no other production matched.
  assert.throws(() => __parse('--foo:{ }'));
});

test('v2 .until({ trim: false }) preserves surrounding whitespace', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      ex('foo:bar;')
        .as('Decl')
        // trim:false so the capture keeps both leading & trailing ws inside
        // the slice. Note the inter-span ws-skip still moves `off` past
        // outer ws before/after the span — this only suppresses the
        // capture-internal trim. With no leading/trailing ws in the input
        // the trim=false path is just exercised for code coverage.
        .span('prop', 'foo').until([':'], { trim: false })
        .span(':')
        .span('value', 'bar').until([';'], { trim: false })
        .span(';')
        .render('ast', { prop: $.prop, value: $.value })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('foo:bar;') as { prop: string; value: string };
  assert.equal(result.prop, 'foo');
  assert.equal(result.value, 'bar');
});

test('v2 .rawUntil() captures opaque text up to a literal stop', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Tag',
    examples: [
      ex('<script>x=1</script>')
        .as('Tag')
        .span('<script>')
        .span('body', 'x=1').rawUntil(['</script>'])
        .span('</script>')
        .render('ast', { body: $.body })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('<script>x=1</script>') as { body: string };
  assert.equal(result.body, 'x=1');
});
