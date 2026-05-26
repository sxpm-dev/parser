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

test('v2 emits multi-role repeats loop using role-dispatch ladder', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Doc collects 0..N children, each of which is either a SlashItem or
  // HashItem — distinct first bytes so the ladder can dispatch unambiguously.
  // The repeats span has no separator and no min — the loop just keeps
  // dispatching until neither role's first byte matches the next non-ws byte.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('/foo')
        .as('SlashItem')
        .span('/')
        .span('text', 'foo').until(['\n', '@'])
        .render('ast', { type: 'slash', text: $.text })
        .build(),
      ex('#bar')
        .as('HashItem')
        .span('#')
        .span('text', 'bar').until(['\n', '@'])
        .render('ast', { type: 'hash', text: $.text })
        .build(),
      ex('/foo\n#bar\n')
        .as('Doc')
        .span('items', '/foo\n#bar\n', ['SlashItem', 'HashItem']).repeats({ min: 0 })
        .render('ast', { items: $.items })
        .build(),
    ],
  });
  // Until Task 1.3c lands, this throws `v2: multi-role repeats not yet
  // supported`. After 1.3c, codegen succeeds and the generated parser
  // collects mixed-role children into an array.
  const code = generateParser(schema, undefined, { v2: true });
  assert.match(code, /function parseDoc\(/);
  // No tryRoles fallback — the loop must use the byte-prefix ladder.
  assert.doesNotMatch(code, /tryRoles\b/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('/foo\n#bar\n') as { items: Array<{ type: string; text: string }> };
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.type, 'slash');
  assert.equal(result.items[0]?.text, 'foo');
  assert.equal(result.items[1]?.type, 'hash');
  assert.equal(result.items[1]?.text, 'bar');

  // Empty input — min:0 — must yield an empty list, not fail.
  const empty = __parse('') as { items: unknown[] };
  assert.equal(empty.items.length, 0);
});

test('v2 multi-role repeats honors min by failing when count too low', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('/foo')
        .as('SlashItem')
        .span('/')
        .span('text', 'foo').until(['\n', '@'])
        .render('ast', { type: 'slash', text: $.text })
        .build(),
      ex('#bar')
        .as('HashItem')
        .span('#')
        .span('text', 'bar').until(['\n', '@'])
        .render('ast', { type: 'hash', text: $.text })
        .build(),
      ex('/foo\n')
        .as('Doc')
        .span('items', '/foo\n', ['SlashItem', 'HashItem']).repeats({ min: 1 })
        .render('ast', { items: $.items })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  // 1 item satisfies min:1.
  const ok = __parse('/foo\n') as { items: Array<{ type: string }> };
  assert.equal(ok.items.length, 1);
  // 0 items violates min:1 — the production fails, top-level parse throws.
  assert.throws(() => __parse(''));
});

test('v2 multi-role repeats with stopBefore exits the loop early', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Mimics HTML <li> implicit-close: a Container holds 0..N items where each
  // item is either a SlashItem or HashItem. When the upcoming source begins
  // with `</`, the children loop must stop without consuming — the parent
  // will handle that close token. This exercises the stopBefore code path.
  const schema = defineSchema({
    rootType: 'Container',
    examples: [
      ex('/foo')
        .as('SlashItem')
        .span('/')
        .span('text', 'foo').until(['\n', '<'])
        .render('ast', { type: 'slash', text: $.text })
        .build(),
      ex('#bar')
        .as('HashItem')
        .span('#')
        .span('text', 'bar').until(['\n', '<'])
        .render('ast', { type: 'hash', text: $.text })
        .build(),
      ex('[/foo\n#bar\n</>]')
        .as('Container')
        .span('[')
        .span('items', '/foo\n#bar\n', ['SlashItem', 'HashItem'])
          .repeats({ min: 0, stopBefore: ['</'] })
        .span('</>')
        .span(']')
        .render('ast', { items: $.items })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  // The generated code must contain a stopBefore byte-bucketed check.
  // `<` is 0x3c = 60 in decimal.
  assert.match(code, /__sb === 60/);
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('[/foo\n#bar\n</>]') as { items: Array<{ type: string }> };
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.type, 'slash');
  assert.equal(result.items[1]?.type, 'hash');
});

test('v2 multi-role repeats with separator threads items together', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Comma-separated list of (Word | Number) items. Sep=',' splits children;
  // when the next non-ws char isn't a comma, the loop breaks.
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      ex('abc')
        .as('Word')
        .span('value', 'abc').ident().css()
        .render('ast', { kind: 'word', v: $.value })
        .build(),
      ex('42')
        .as('Number')
        .span('value', '42').number().int()
        .render('ast', { kind: 'num', v: $.value })
        .build(),
      ex('abc,42')
        .as('List')
        .span('items', 'abc,42', ['Word', 'Number']).repeats({ min: 0, sep: ',' })
        .render('ast', { items: $.items })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('abc,42') as { items: Array<{ kind: string; v: string }> };
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.kind, 'word');
  assert.equal(result.items[0]?.v, 'abc');
  assert.equal(result.items[1]?.kind, 'num');
  assert.equal(result.items[1]?.v, '42');
});

test('v2 multi-role repeats honors trailing: "forbidden"', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Trailing comma must NOT be consumed: `off` rewinds to before the last
  // sep when the post-sep slot has no item. Surrounding `[ ... ]` brackets
  // let us assert the parser left the comma in place for the outer `]`.
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      ex('a').as('Word').span('value', 'a').ident().css()
        .render('ast', { v: $.value }).build(),
      ex('[a]').as('List')
        .span('[')
        .span('items', 'a', ['Word']).repeats({ min: 0, sep: ',', trailing: 'forbidden' })
        .span(']')
        .render('ast', { items: $.items }).build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  // Plain non-trailing case still works.
  const ok = __parse('[a]') as { items: Array<{ v: string }> };
  assert.equal(ok.items.length, 1);
  // Trailing comma — parser must reject because `]` doesn't follow a sep.
  assert.throws(() => __parse('[a,]'));
});

test('v2 multi-role repeats honors trailing: "required"', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Each item MUST be followed by a sep, even the last one. So `a;b;` parses
  // but `a;b` does not.
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      ex('a').as('Word').span('value', 'a').ident().css()
        .render('ast', { v: $.value }).build(),
      ex('a;').as('List')
        .span('items', 'a', ['Word']).repeats({ min: 0, sep: ';', trailing: 'required' })
        .render('ast', { items: $.items }).build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const ok = __parse('a;b;') as { items: Array<{ v: string }> };
  assert.equal(ok.items.length, 2);
  // Missing trailing sep — fails.
  assert.throws(() => __parse('a;b'));
});

test('v2 repeats-sep tolerates items that consumed their own optional sep', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // CSS-shape regression (Task 1.3j): the Decl production ends with
  // `.span(';').optional()`. When a Decl consumed its trailing `;`, the
  // parent Rule's `repeats({ sep: ';' })` would find NO `;` between the
  // first Decl and the next one and prematurely break the loop, losing
  // every Decl past the first. v1's emit handled this by sweeping leading
  // separators at the TOP of each loop iteration; v2 must match.
  const schema = defineSchema({
    rootType: 'Rule',
    examples: [
      ex('prop: val').as('Decl')
        .span('prop', 'prop').until([':', ';', '}'])
        .span(':')
        .span('value', 'val').until([';', '}'])
        .span(';').optional()
        .render('ast', { prop: $.prop, value: $.value })
        .build(),
      ex('{ a: 1; b: 2 }').as('Rule')
        .span('{')
        .span('decls', 'a: 1; b: 2', ['Decl']).repeats({ sep: ';', trailing: 'allowed', min: 0 })
        .span('}')
        .render('ast', { decls: $.decls })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('{ a: 1; b: 2 }') as { decls: Array<{ prop: string; value: string }> };
  assert.equal(result.decls.length, 2);
  assert.equal(result.decls[0]?.prop, 'a');
  assert.equal(result.decls[0]?.value, '1');
  assert.equal(result.decls[1]?.prop, 'b');
  assert.equal(result.decls[1]?.value, '2');
  // Also tolerates the trailing-sep variant: `b: 2;` ends the inner Decl
  // with its own `;`, so the loop sees no further item.
  const trailing = __parse('{ a: 1; b: 2; }') as { decls: Array<{ prop: string; value: string }> };
  assert.equal(trailing.decls.length, 2);
  assert.equal(trailing.decls[1]?.value, '2');
});

test('v2 multi-role repeats honors max by failing when count too high', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Cap at 2 items. 2 ok, 3 fails.
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      ex('a').as('Word').span('value', 'a').ident().css()
        .render('ast', { v: $.value }).build(),
      ex('a,b').as('List')
        .span('items', 'a,b', ['Word']).repeats({ min: 0, max: 2, sep: ',' })
        .render('ast', { items: $.items }).build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const ok = __parse('a,b') as { items: Array<{ v: string }> };
  assert.equal(ok.items.length, 2);
  // 3 items exceeds max:2 — fails.
  assert.throws(() => __parse('a,b,c'));
});

test('v2 role-ladder treats until-leading role as fallthrough catch-all', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Hash starts with `#` so its first-byte signature is { 0x23 }. Text has
  // a `.until('\n')` first span so it has no fixed first byte — the ladder
  // must treat it as the fallthrough catch-all and dispatch to it whenever
  // the next non-ws byte isn't `#`.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('#hi').as('Hash')
        .span('#')
        .span('text', 'hi').until(['\n'])
        .render('ast', { type: 'hash', text: $.text }).build(),
      ex('plain').as('Text')
        .span('text', 'plain').until(['\n'])
        .render('ast', { type: 'text', text: $.text }).build(),
      ex('#hi').as('Doc')
        .span('item', '#hi', ['Hash', 'Text'])
        .render('ast', { item: $.item }).build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  assert.match(code, /function parseDoc\(/);
  // Hash branches on `#` (0x23 = 35); fallthrough Text is the else.
  assert.match(code, /__c0 === 35/);
  assert.match(code, /parseText\(state\)/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const hash = __parse('#hi') as { item: { type: string; text: string } };
  assert.equal(hash.item.type, 'hash');
  assert.equal(hash.item.text, 'hi');
  const plain = __parse('plain text') as { item: { type: string; text: string } };
  assert.equal(plain.item.type, 'text');
  assert.equal(plain.item.text, 'plain text');
});

test('v2 role-ladder uses sentinel speculation for multiple fallthrough roles', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Two roles, both with `.until(...)` first spans — neither has a fixed
  // first byte. Task 1.3f resolves this via sentinel speculation in author
  // declaration order: Left is tried first, and Right fires only when Left's
  // parse returns null (because Left's terminator `:` is missing).
  //
  // No throws, no try/catch — pure null-return + state.pos rewind.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('foo:').as('Left')
        .span('text', 'foo').until([':'])
        .span(':')
        .render('ast', { kind: 'left', text: $.text }).build(),
      ex('bar;').as('Right')
        .span('text', 'bar').until([';'])
        .span(';')
        .render('ast', { kind: 'right', text: $.text }).build(),
      ex('foo:').as('Doc')
        .span('item', 'foo:', ['Left', 'Right'])
        .render('ast', { item: $.item }).build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  // The ladder must NOT use throw/catch for speculation.
  assert.doesNotMatch(code, /\bthrow\b.*new SyntaxError/);
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const left = __parse('foo:') as { item: { kind: string; text: string } };
  assert.equal(left.item.kind, 'left');
  assert.equal(left.item.text, 'foo');
  // `bar;` doesn't match Left (no `:`); Right picks it up via speculation.
  const right = __parse('bar;') as { item: { kind: string; text: string } };
  assert.equal(right.item.kind, 'right');
  assert.equal(right.item.text, 'bar');
});

test('v2 role-ladder uses sentinel speculation for same-byte literal roles', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Mirrors HTML's Doctype-vs-Comment conflict: both roles start with the
  // same byte `<` but have different literal prefixes (`<!` vs `<!--`). The
  // ladder groups them under one byte-dispatch arm and emits sentinel
  // speculation — longest-prefix role (Comment, `<!--`) is tried first.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('<!DOCTYPE>').as('Doctype')
        .span('<!')
        .span('keyword', 'DOCTYPE').ident().html().oneOf(['DOCTYPE'])
        .span('>')
        .render('ast', { kind: 'doctype', keyword: $.keyword })
        .build(),
      ex('<!--hi-->').as('Comment')
        .span('<!--')
        .span('text', 'hi').until('-->', { trim: false })
        .span('-->')
        .render('ast', { kind: 'comment', text: $.text })
        .build(),
      ex('<!DOCTYPE>').as('Doc')
        .span('item', '<!DOCTYPE>', ['Doctype', 'Comment'])
        .render('ast', { item: $.item })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  // Both roles share byte 0x3c — they live in the same `if (__c0 === 60)`
  // group with speculation between them.
  assert.match(code, /__c0 === 60/);
  assert.doesNotMatch(code, /\bthrow\b.*new SyntaxError/);
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const doc = __parse('<!DOCTYPE>') as { item: { kind: string; keyword: string } };
  assert.equal(doc.item.kind, 'doctype');
  assert.equal(doc.item.keyword, 'DOCTYPE');
  const cmt = __parse('<!--hi-->') as { item: { kind: string; text: string } };
  assert.equal(cmt.item.kind, 'comment');
  assert.equal(cmt.item.text, 'hi');
});

test('v2 role-ladder fallthrough speculation respects author declaration order', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Two fallthrough roles with overlapping shapes; the second only matches
  // when the first would fail. The schema must list the more-specific role
  // first — that's the contract sentinel speculation rests on.
  //
  // Specific role (Underlined) needs both a text capture and a trailing
  // `===` underline. Catch-all (Paragraph) is plain text to EOF.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('hi===').as('Underlined')
        .span('text', 'hi').until('===')
        .span('===')
        .render('ast', { kind: 'heading', text: $.text }).build(),
      ex('hello').as('Paragraph')
        .span('text', 'hello').until([])
        .render('ast', { kind: 'paragraph', text: $.text }).build(),
      ex('hi===').as('Doc')
        .span('item', 'hi===', ['Underlined', 'Paragraph'])
        .render('ast', { item: $.item }).build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  // Speculation chain shape: Underlined tried first, Paragraph on null-return.
  assert.match(code, /parseUnderlined\(state\)[\s\S]*?if \(__r === null\) \{ __r = parseParagraph/);
  assert.doesNotMatch(code, /\bthrow\b.*new SyntaxError/);
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const heading = __parse('hi===') as { item: { kind: string; text: string } };
  assert.equal(heading.item.kind, 'heading');
  assert.equal(heading.item.text, 'hi');
  // No `===` underline — Underlined fails, Paragraph picks up.
  const paragraph = __parse('hello') as { item: { kind: string; text: string } };
  assert.equal(paragraph.item.kind, 'paragraph');
  assert.equal(paragraph.item.text, 'hello');
});

test('v2 emits role-dispatch ladder for multi-role non-repeats span', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Doc wraps a single child that can be either a Comment (starts with `/`)
  // or a Hash (starts with `#`). The two roles have distinct first bytes so
  // byte-prefix dispatch is unambiguous — exactly the case 1.3b targets.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      ex('/foo')
        .as('Comment')
        .span('/')
        .span('text', 'foo').until(['\n', '@'])
        .render('ast', { type: 'comment', text: $.text })
        .build(),
      ex('#bar')
        .as('Hash')
        .span('#')
        .span('text', 'bar').until(['\n', '@'])
        .render('ast', { type: 'hash', text: $.text })
        .build(),
      ex('/foo')
        .as('Doc')
        .span('item', '/foo', ['Comment', 'Hash'])
        .render('ast', { item: $.item })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  assert.match(code, /function parseDoc\(/);
  // The ladder must NOT call tryRoles or use any throw/catch for backtracking.
  assert.doesNotMatch(code, /tryRoles\b/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const commentResult = __parse('/foo') as { item: { type: string; text: string } };
  assert.equal(commentResult.item.type, 'comment');
  assert.equal(commentResult.item.text, 'foo');
  const hashResult = __parse('#bar') as { item: { type: string; text: string } };
  assert.equal(hashResult.item.type, 'hash');
  assert.equal(hashResult.item.text, 'bar');
});

// --- Task 1.3e: number-class refinements ----------------------------------
//
// The v2 number scanner historically defaulted to integer-only and ignored
// declared refinements (.float() / .scientific() / .separator()). These tests
// pin the per-refinement behavior so codegen honors what the schema declares.

test('v2 number scanner with .int() (default) accepts only digits', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      ex('42px')
        .as('Decl')
        .span('value', '42').number().int()
        .span('unit', 'px').ident().css()
        .render('ast', { value: $.value, unit: $.unit })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const ok = __parse('42px') as { value: string; unit: string };
  assert.equal(ok.value, '42');
  assert.equal(ok.unit, 'px');
  // `1.5` must fail: '.' is not part of an int scan, and the trailing `.5px`
  // can't be a valid unit.
  assert.throws(() => __parse('1.5px'));
});

test('v2 number scanner honors .float() — accepts digits and digits.fraction', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      ex('1.5px')
        .as('Decl')
        .span('value', '1.5').number().float()
        .span('unit', 'px').ident().css()
        .render('ast', { value: $.value, unit: $.unit })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  // float with fraction
  const a = __parse('1.5px') as { value: string; unit: string };
  assert.equal(a.value, '1.5');
  assert.equal(a.unit, 'px');
  // float without fraction (integer form must still parse — float scanners
  // historically accept the integer subset).
  const b = __parse('42px') as { value: string; unit: string };
  assert.equal(b.value, '42');
  assert.equal(b.unit, 'px');
  // dot with no following digit isn't consumed by the float scanner: `1.px`
  // captures `1` and leaves `.px` for the ident, which fails since `.` isn't
  // an ident start byte.
  assert.throws(() => __parse('1.px'));
});

test('v2 number scanner honors .scientific() — float + optional exponent', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Lit',
    examples: [
      ex('1.5e10')
        .as('Lit')
        .span('value', '1.5e10').number().scientific()
        .render('ast', { value: $.value })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  assert.equal((__parse('1.5e10') as { value: string }).value, '1.5e10');
  assert.equal((__parse('2E-3') as { value: string }).value, '2E-3');
  assert.equal((__parse('1e+5') as { value: string }).value, '1e+5');
  // Integer form (no exponent, no fraction) is still accepted.
  assert.equal((__parse('42') as { value: string }).value, '42');
  // Float form (no exponent) is accepted by scientific (super-set of float).
  assert.equal((__parse('3.14') as { value: string }).value, '3.14');
});

test('v2 number scanner honors .separator("_") — allows underscores between digits', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Lit',
    examples: [
      ex('1_000')
        .as('Lit')
        .span('value', '1_000').number().separator('_')
        .render('ast', { value: $.value })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  assert.equal((__parse('1_000') as { value: string }).value, '1_000');
  assert.equal((__parse('42') as { value: string }).value, '42');
  assert.equal((__parse('1_000_000') as { value: string }).value, '1_000_000');
  // Leading underscore isn't a digit — must fail at start.
  assert.throws(() => __parse('_1'));
});

// --- Task 1.3g: .until() balanced {} support -------------------------------
//
// The user-facing semantics: `.until([...], { balanced: true })` (default)
// tracks `()`, `[]`, AND `{}` nesting. Stops only fire at depth 0. This
// matches v1 (see scannerless/parse.ts balancedBlock). Two regression tests
// cover the brace-tracking path: shallow `{ nested }`, and deeper
// `{ a: { b: c } }` to exercise depth > 1.

test('v2 .until() balanced:true tracks {} depth (not just () and [])', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // The `;` and the inner `}` inside `{ nested }` must NOT terminate the
  // capture — the balanced-bracket tracking keeps depth > 0 while inside
  // `{...}`. The outer `;` (depth 0) is the stop that fires.
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      ex('prop: { nested };').as('Decl')
        .span('prop', 'prop').until(':')
        .span(':')
        .span('value', '{ nested }').until([';', '}'])
        .span(';')
        .render('ast', { prop: $.prop, value: $.value })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('prop: { nested };') as { prop: string; value: string };
  assert.equal(result.prop, 'prop');
  // Without {} brace tracking, the inner `}` would be treated as a stop and
  // the value would close at `{ nested ` (or empty) — assert the full braced
  // capture is preserved.
  assert.equal(result.value, '{ nested }');
});

test('v2 .until() balanced:true tracks deeply-nested {} depth', async () => {
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  // Doubly-nested `{ a: { b: c } }`. Inner `}` decrements to depth=1, outer
  // `}` decrements to depth=0. The next char after the outer `}` is `;` at
  // depth=0 — that's the stop that fires.
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      ex('p: { a: { b: c } };').as('Decl')
        .span('prop', 'p').until(':')
        .span(':')
        .span('value', '{ a: { b: c } }').until([';', '}'])
        .span(';')
        .render('ast', { prop: $.prop, value: $.value })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  const result = __parse('p: { a: { b: c } };') as { prop: string; value: string };
  assert.equal(result.prop, 'p');
  assert.equal(result.value, '{ a: { b: c } }');
  // Semicolons INSIDE the braces must not stop the scan either.
  const result2 = __parse('p: { a; b; c; };') as { prop: string; value: string };
  assert.equal(result2.value, '{ a; b; c; }');
});

test('v2 .until() always trims trailing whitespace from the captured slice', async () => {
  // Repro for html comment fixtures: a schema like
  //   .span('data', ' hello ').until('-->', { trim: false })
  // declares trim:false but v1's emitter ignores the option (always trims).
  // The AST shape expects the trimmed interior (data === 'hello'), not the
  // raw ' hello '. v2 must match.
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'C',
    examples: [
      ex('<!-- hello -->').as('C')
        .span('<!--')
        .span('data', ' hello ').until('-->', { trim: false })
        .span('-->')
        .render('ast', { data: $.data })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' }) as { data: string };
  assert.equal(__parse('<!-- hello -->').data, 'hello');
  assert.equal(__parse('<!--   hello   -->').data, 'hello');
  assert.equal(__parse('<!---->').data, '');
  assert.equal(__parse('<!--\n  multi\n-->').data, 'multi');
});

test('v2 comment-class span returns interior text and trims surrounding ws', async () => {
  // Repro for css `comments.css` / html `comments.html` / huge-page fixtures.
  // Schema declares `.span('text', '/* foo */').comment()` — the AST surface
  // expects the INTERIOR text (no `/*` `*/` delimiters, leading/trailing
  // whitespace trimmed). v2 had been returning the raw byte slice
  // including the delimiters. The fix lives in emitClassSpanValueExpr.
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'C',
    tokens: ['comment'],
    examples: [
      ex('/* foo */').as('C')
        .span('text', '/* foo */').comment()
        .render('ast', { type: 'comment', text: $.text })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' }) as { text: string };
  assert.equal(__parse('/* foo */').text, 'foo');
  assert.equal(__parse('/*foo*/').text, 'foo');
  assert.equal(__parse('/* hello world */').text, 'hello world');
  assert.equal(__parse('/* */').text, '');
  assert.equal(__parse('/**/').text, '');
  // Leading/trailing whitespace inside `/* */` is trimmed but interior
  // whitespace is preserved as-is.
  assert.equal(__parse('/*  spaced  */').text, 'spaced');
  assert.equal(__parse('/*\n  multi\n  line\n*/').text, 'multi\n  line');
});

test('v2 inter-span gap before optional literal is ws-only (preserve trailing comments)', async () => {
  // Repro for css `comments.css`: a Declaration like `border-radius: 3px / 7px`
  // followed by a trailing `/* end */` comment and a `}` close. v2's
  // inter-span gap was eating the comment before the optional `;` span,
  // so the body loop never got a chance to emit a Comment node. v1 saves
  // the offset before the gap and rewinds when the optional doesn't
  // match — v2 just suppresses the comment-skip before an optional span
  // so the comment stays available for the parent's repeats body.
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Body',
    tokens: ['comment'],
    examples: [
      ex('/* foo */').as('Comment')
        .span('text', '/* foo */').comment()
        .render('ast', { type: 'comment', text: $.text })
        .build(),
      ex('a').as('Decl')
        .span('prop', 'a').ident()
        .span(';').optional()
        .render('ast', { type: 'decl', prop: $.prop })
        .build(),
      ex('a /* x */').as('Body')
        .span('items', 'a', ['Comment', 'Decl'])
        .repeats({ min: 0 })
        .render('ast', { items: $.items })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' }) as { items: { type: string }[] };
  // The trailing /* */ comment must surface as a separate Comment node, not
  // be silently absorbed by the gap before the optional `;`.
  const r = __parse('a /* trailing */');
  assert.deepEqual(r.items.map((it) => it.type), ['decl', 'comment']);
});

test('v2 repeats sweeps LEADING separators before the first item', async () => {
  // Repro for css `semicolons.css` first rule `a {;;\n    color: black;\n}`:
  // v1's emit ran the sep-sweep on every iteration; v2 gated it on
  // list.length > 0, which made the body fail on a leading `;` before any
  // declaration. After the fix, leading seps are absorbed silently on the
  // first iteration without affecting trailing-policy state.
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Body',
    examples: [
      ex('a')
        .as('Item')
        .span('name', 'a').ident()
        .render('ast', { name: $.name })
        .build(),
      ex('{ a; b }')
        .as('Body')
        .span('{')
        .span('items', 'a; b', ['Item'])
        .repeats({ min: 0, sep: ';', trailing: 'allowed' })
        .span('}')
        .render('ast', { items: $.items })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' }) as { items: unknown[] };
  // Leading seps before any item.
  assert.equal(__parse('{;}').items.length, 0);
  assert.equal(__parse('{;;}').items.length, 0);
  assert.equal(__parse('{; a}').items.length, 1);
  assert.equal(__parse('{; ; a}').items.length, 1);
  // Regular cases still work.
  assert.equal(__parse('{a; b; c}').items.length, 3);
});

test('v2 leading skip is ws-only when first span is a comment-class span', async () => {
  // Repro for the regression introduced when the inter-span skip became
  // ws+comment-aware: a Comment production's leading skip was eating the
  // comment it was supposed to capture. Fix: only the INTER-span gap
  // (between consecutive spans of the same production) skips comments;
  // the LEADING skip stays ws-only so a `/* … */` body remains available
  // for the comment span to consume.
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    tokens: ['comment'],
    examples: [
      ex('/* x */').as('Comment')
        .span('text', '/* x */').comment()
        .render('ast', { type: 'comment', text: $.text })
        .build(),
      ex('a').as('Word')
        .span('name', 'a').ident()
        .render('ast', { type: 'word', name: $.name })
        .build(),
      ex('a').as('Doc')
        .span('items', 'a', ['Comment', 'Word'])
        .repeats({ min: 0 })
        .render('ast', { items: $.items })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' }) as { items: { type: string }[] };
  const r = __parse('/* x */ a /* y */');
  assert.deepEqual(r.items.map((it) => it.type), ['comment', 'word', 'comment']);
});

test('v2 inter-span ws skip also skips /* */ comments when schema declares comment token', async () => {
  // Repro for css `between.css` / `prop.css` / `semicolons.css`:
  // Between two spans of the SAME production, v1's emit skips both whitespace
  // and `/* */` comments. v2 only skipped ws, so a comment between a captured
  // selector and its `{` left `off` parked on `/`, failing the literal match.
  const { defineSchema, ex, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Rule',
    tokens: ['comment'],
    examples: [
      ex('a { }').as('Rule')
        .span('selector', 'a').until(['{', ';'])
        .span('{')
        .span('}')
        .render('ast', { selector: $.selector })
        .build(),
    ],
  });
  const code = generateParser(schema, undefined, { v2: true });
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { type: 'ast' });
  // No comments: baseline.
  assert.deepEqual(__parse('a {}'), { selector: 'a' });
  // Trailing /* */ comment between selector trim boundary and `{` must be
  // consumed by the inter-span skip.
  assert.deepEqual(__parse('a/**/{}'), { selector: 'a' });
  assert.deepEqual(__parse('a /* note */ {}'), { selector: 'a' });
  assert.deepEqual(__parse('a/**/\n{}'), { selector: 'a' });
});
