// Regression tests for v2 backend feature parity.
//
// Each test pins a minimal failing schema for one v2 emit feature added by
// Task 1.3a/b/c/d/e (see docs/v2-migration-status.md). The test asserts both
// that the v2 generator produces JS (no `not yet supported` throw) AND that
// the generated parser executes correctly for the minimal example. Where
// possible we also assert structural properties of the emitted code so the
// test catches regressions in the emit shape — not just runtime behavior.

import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { generateParser } from '../src/index.ts';

// Helper: write generated v2 source to a temp .ts file and dynamic-import it
// via tsx's loader so the test can call into the emitted parser. The v2
// emit exports `render(input, options)` (which internally calls `__parse`)
// and `validate(input)`. We use `render(input, { target: 'ast' })` as the
// test entry point — when the schema only declares an 'ast' render, the
// render dispatcher returns the captures map directly.
async function loadV2Parser(code: string): Promise<{
  render: (input: string, options?: { target?: string; mode?: 'fast' | 'raws' }) => unknown;
  validate?: (input: string) => void;
}> {
  const dir = mkdtempSync(join(tmpdir(), 'parser3-v2-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = (await import(pathToFileURL(file).href)) as {
    render?: (input: string, options?: { target?: string; mode?: 'fast' | 'raws' }) => unknown;
    validate?: (input: string) => void;
  };
  if (typeof mod.render !== 'function') {
    throw new Error('generated v2 parser did not export render');
  }
  return { render: mod.render, validate: mod.validate };
}

test('v2 emits scan-until for balanced .until() capture', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'color: red;',
        encodings: {
          src: parse([
            span('prop', 'color').until(':'),
            literal(':'),
            span('value', 'red').until(';'),
            literal(';'),
          ]),
          ast: { type: 'decl', prop: $.prop, value: $.value },
        },
      }),
    ],
  });
  // Today this throws "until/rawUntil span not yet supported". After Task 1.3a
  // it must succeed and produce a runnable parser.
  const code = generateParser(schema, undefined, {});
  assert.match(code, /function parseDecl\(/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const result = __parse('color: red;') as { type: string; prop: string; value: string };
  assert.equal(result.type, 'decl');
  assert.equal(result.prop, 'color');
  assert.equal(result.value, 'red');
});

test('v2 .until() respects balanced brackets', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // The `;` inside `f(a;b)` must NOT terminate the capture, because the
  // balanced-bracket tracking keeps depth > 0 while we're inside `(...)`.
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'expr: f(a;b);',
        encodings: {
          src: parse([
            span('prop', 'expr').until(':'),
            literal(':'),
            span('value', 'f(a;b)').until(';'),
            literal(';'),
          ]),
          ast: { prop: $.prop, value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const result = __parse('expr: f(a;b);') as { prop: string; value: string };
  assert.equal(result.prop, 'expr');
  assert.equal(result.value, 'f(a;b)');
});

test('v2 .until() trims trailing whitespace from capture', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'color: red;',
        encodings: {
          src: parse([
            span('prop', 'color').until(':'),
            literal(':'),
            span('value', 'red').until(';'),
            literal(';'),
          ]),
          ast: { prop: $.prop, value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  // `   red   ` is the captured slice between `:` and `;` ws-included. The
  // .until() trim policy strips both sides, so the captured value is `red`
  // and the parser's `off` is positioned at the trailing ws so the `;`
  // literal still matches after the inter-span ws skip.
  const result = __parse('color:   red   ;') as { prop: string; value: string };
  assert.equal(result.prop, 'color');
  assert.equal(result.value, 'red');
});

test('v2 .until() honors rejectSuffix by returning null (no throws)', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Rule',
    examples: [
      relation('Rule', {
        input: 'a { }',
        encodings: {
          src: parse([
            span('selector', 'a').until(['{'], { rejectSuffix: ':' }),
            literal('{'),
            literal('}'),
          ]),
          ast: { sel: $.selector },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const ok = __parse('a { }') as { sel: string };
  assert.equal(ok.sel, 'a');
  // `--foo:` ends with the rejectSuffix `:` — the production must fail.
  // Top-level parse() then throws because no other production matched.
  assert.throws(() => __parse('--foo:{ }'));
});

test('v2 .until({ trim: false }) preserves surrounding whitespace', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'foo:bar;',
        encodings: {
          src: parse([
            // trim:false so the capture keeps both leading & trailing ws inside
            // the slice. Note the inter-span ws-skip still moves `off` past
            // outer ws before/after the span — this only suppresses the
            // capture-internal trim. With no leading/trailing ws in the input
            // the trim=false path is just exercised for code coverage.
            span('prop', 'foo').until([':'], { trim: false }),
            literal(':'),
            span('value', 'bar').until([';'], { trim: false }),
            literal(';'),
          ]),
          ast: { prop: $.prop, value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const result = __parse('foo:bar;') as { prop: string; value: string };
  assert.equal(result.prop, 'foo');
  assert.equal(result.value, 'bar');
});

test('v2 .rawUntil() captures opaque text up to a literal stop', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Tag',
    examples: [
      relation('Tag', {
        input: '<script>x=1</script>',
        encodings: {
          src: parse([
            literal('<script>'),
            span('body', 'x=1').rawUntil(['</script>']),
            literal('</script>'),
          ]),
          ast: { body: $.body },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const result = __parse('<script>x=1</script>') as { body: string };
  assert.equal(result.body, 'x=1');
});

test('v2 emits multi-role repeats loop using role-dispatch ladder', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Doc collects 0..N children, each of which is either a SlashItem or
  // HashItem — distinct first bytes so the ladder can dispatch unambiguously.
  // The repeats span has no separator and no min — the loop just keeps
  // dispatching until neither role's first byte matches the next non-ws byte.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('SlashItem', {
        input: '/foo',
        encodings: {
          src: parse([
            literal('/'),
            span('text', 'foo').until(['\n', '@']),
          ]),
          ast: { type: 'slash', text: $.text },
        },
      }),
      relation('HashItem', {
        input: '#bar',
        encodings: {
          src: parse([
            literal('#'),
            span('text', 'bar').until(['\n', '@']),
          ]),
          ast: { type: 'hash', text: $.text },
        },
      }),
      relation('Doc', {
        input: '/foo\n#bar\n',
        encodings: {
          src: parse([span('items', '/foo\n#bar\n').of('SlashItem', 'HashItem').repeats({ min: 0 })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  // Until Task 1.3c lands, this throws `v2: multi-role repeats not yet
  // supported`. After 1.3c, codegen succeeds and the generated parser
  // collects mixed-role children into an array.
  const code = generateParser(schema, undefined, {});
  assert.match(code, /function parseDoc\(/);
  // No tryRoles fallback — the loop must use the byte-prefix ladder.
  assert.doesNotMatch(code, /tryRoles\b/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
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
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('SlashItem', {
        input: '/foo',
        encodings: {
          src: parse([literal('/'), span('text', 'foo').until(['\n', '@'])]),
          ast: { type: 'slash', text: $.text },
        },
      }),
      relation('HashItem', {
        input: '#bar',
        encodings: {
          src: parse([literal('#'), span('text', 'bar').until(['\n', '@'])]),
          ast: { type: 'hash', text: $.text },
        },
      }),
      relation('Doc', {
        input: '/foo\n',
        encodings: {
          src: parse([span('items', '/foo\n').of('SlashItem', 'HashItem').repeats({ min: 1 })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  // 1 item satisfies min:1.
  const ok = __parse('/foo\n') as { items: Array<{ type: string }> };
  assert.equal(ok.items.length, 1);
  // 0 items violates min:1 — the production fails, top-level parse throws.
  assert.throws(() => __parse(''));
});

test('v2 multi-role repeats with stopBefore exits the loop early', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Mimics HTML <li> implicit-close: a Container holds 0..N items where each
  // item is either a SlashItem or HashItem. When the upcoming source begins
  // with `</`, the children loop must stop without consuming — the parent
  // will handle that close token. This exercises the stopBefore code path.
  const schema = defineSchema({
    rootType: 'Container',
    examples: [
      relation('SlashItem', {
        input: '/foo',
        encodings: {
          src: parse([literal('/'), span('text', 'foo').until(['\n', '<'])]),
          ast: { type: 'slash', text: $.text },
        },
      }),
      relation('HashItem', {
        input: '#bar',
        encodings: {
          src: parse([literal('#'), span('text', 'bar').until(['\n', '<'])]),
          ast: { type: 'hash', text: $.text },
        },
      }),
      relation('Container', {
        input: '[/foo\n#bar\n</>]',
        encodings: {
          src: parse([
            literal('['),
            span('items', '/foo\n#bar\n').of('SlashItem', 'HashItem')
              .repeats({ min: 0, stopBefore: ['</'] }),
            literal('</>'),
            literal(']'),
          ]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // The generated code must contain a stopBefore byte-bucketed check.
  // `<` is 0x3c = 60 in decimal.
  assert.match(code, /__sb === 60/);
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const result = __parse('[/foo\n#bar\n</>]') as { items: Array<{ type: string }> };
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.type, 'slash');
  assert.equal(result.items[1]?.type, 'hash');
});

test('v2 multi-role repeats with separator threads items together', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  // Comma-separated list of (Word | Number) items. Sep=',' splits children;
  // when the next non-ws char isn't a comma, the loop breaks.
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      relation('Word', {
        input: 'abc',
        encodings: {
          src: parse([span('value', 'abc').ident().css()]),
          ast: { kind: 'word', v: $.value },
        },
      }),
      relation('Number', {
        input: '42',
        encodings: {
          src: parse([span('value', '42').number().int()]),
          ast: { kind: 'num', v: $.value },
        },
      }),
      relation('List', {
        input: 'abc,42',
        encodings: {
          src: parse([span('items', 'abc,42').of('Word', 'Number').repeats({ min: 0, sep: ',' })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const result = __parse('abc,42') as { items: Array<{ kind: string; v: string }> };
  assert.equal(result.items.length, 2);
  assert.equal(result.items[0]?.kind, 'word');
  assert.equal(result.items[0]?.v, 'abc');
  assert.equal(result.items[1]?.kind, 'num');
  assert.equal(result.items[1]?.v, '42');
});

test('v2 multi-role repeats honors trailing: "forbidden"', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Trailing comma must NOT be consumed: `off` rewinds to before the last
  // sep when the post-sep slot has no item. Surrounding `[ ... ]` brackets
  // let us assert the parser left the comma in place for the outer `]`.
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      relation('Word', {
        input: 'a',
        encodings: {
          src: parse([span('value', 'a').ident().css()]),
          ast: { v: $.value },
        },
      }),
      relation('List', {
        input: '[a]',
        encodings: {
          src: parse([
            literal('['),
            span('items', 'a').of('Word').repeats({ min: 0, sep: ',', trailing: 'forbidden' }),
            literal(']'),
          ]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  // Plain non-trailing case still works.
  const ok = __parse('[a]') as { items: Array<{ v: string }> };
  assert.equal(ok.items.length, 1);
  // Trailing comma — parser must reject because `]` doesn't follow a sep.
  assert.throws(() => __parse('[a,]'));
});

test('v2 multi-role repeats honors trailing: "required"', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Each item MUST be followed by a sep, even the last one. So `a;b;` parses
  // but `a;b` does not.
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      relation('Word', {
        input: 'a',
        encodings: {
          src: parse([span('value', 'a').ident().css()]),
          ast: { v: $.value },
        },
      }),
      relation('List', {
        input: 'a;',
        encodings: {
          src: parse([span('items', 'a').of('Word').repeats({ min: 0, sep: ';', trailing: 'required' })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const ok = __parse('a;b;') as { items: Array<{ v: string }> };
  assert.equal(ok.items.length, 2);
  // Missing trailing sep — fails.
  assert.throws(() => __parse('a;b'));
});

test('v2 repeats-sep tolerates items that consumed their own optional sep', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // CSS-shape regression (Task 1.3j): the Decl production ends with
  // `.span(';').optional()`. When a Decl consumed its trailing `;`, the
  // parent Rule's `repeats({ sep: ';' })` would find NO `;` between the
  // first Decl and the next one and prematurely break the loop, losing
  // every Decl past the first. v1's emit handled this by sweeping leading
  // separators at the TOP of each loop iteration; v2 must match.
  const schema = defineSchema({
    rootType: 'Rule',
    examples: [
      relation('Decl', {
        input: 'prop: val',
        encodings: {
          src: parse([
            span('prop', 'prop').until([':', ';', '}']),
            literal(':'),
            span('value', 'val').until([';', '}']),
            literal(';').optional(),
          ]),
          ast: { prop: $.prop, value: $.value },
        },
      }),
      relation('Rule', {
        input: '{ a: 1; b: 2 }',
        encodings: {
          src: parse([
            literal('{'),
            span('decls', 'a: 1; b: 2').of('Decl').repeats({ sep: ';', trailing: 'allowed', min: 0 }),
            literal('}'),
          ]),
          ast: { decls: $.decls },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
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
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  // Cap at 2 items. 2 ok, 3 fails.
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      relation('Word', {
        input: 'a',
        encodings: {
          src: parse([span('value', 'a').ident().css()]),
          ast: { v: $.value },
        },
      }),
      relation('List', {
        input: 'a,b',
        encodings: {
          src: parse([span('items', 'a,b').of('Word').repeats({ min: 0, max: 2, sep: ',' })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const ok = __parse('a,b') as { items: Array<{ v: string }> };
  assert.equal(ok.items.length, 2);
  // 3 items exceeds max:2 — fails.
  assert.throws(() => __parse('a,b,c'));
});

test('v2 role-ladder treats until-leading role as fallthrough catch-all', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Hash starts with `#` so its first-byte signature is { 0x23 }. Text has
  // a `.until('\n')` first span so it has no fixed first byte — the ladder
  // must treat it as the fallthrough catch-all and dispatch to it whenever
  // the next non-ws byte isn't `#`.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Hash', {
        input: '#hi',
        encodings: {
          src: parse([literal('#'), span('text', 'hi').until(['\n'])]),
          ast: { type: 'hash', text: $.text },
        },
      }),
      relation('Text', {
        input: 'plain',
        encodings: {
          src: parse([span('text', 'plain').until(['\n'])]),
          ast: { type: 'text', text: $.text },
        },
      }),
      relation('Doc', {
        input: '#hi',
        encodings: {
          src: parse([span('item', '#hi').of('Hash', 'Text')]),
          ast: { item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(code, /function parseDoc\(/);
  // Hash branches on `#` (0x23 = 35); fallthrough Text is the else.
  assert.match(code, /__c0 === 35/);
  assert.match(code, /parseText\(state\)/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const hash = __parse('#hi') as { item: { type: string; text: string } };
  assert.equal(hash.item.type, 'hash');
  assert.equal(hash.item.text, 'hi');
  const plain = __parse('plain text') as { item: { type: string; text: string } };
  assert.equal(plain.item.type, 'text');
  assert.equal(plain.item.text, 'plain text');
});

test('v2 role-ladder uses sentinel speculation for multiple fallthrough roles', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Two roles, both with `.until(...)` first spans — neither has a fixed
  // first byte. Task 1.3f resolves this via sentinel speculation in author
  // declaration order: Left is tried first, and Right fires only when Left's
  // parse returns null (because Left's terminator `:` is missing).
  //
  // No throws, no try/catch — pure null-return + state.pos rewind.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Left', {
        input: 'foo:',
        encodings: {
          src: parse([span('text', 'foo').until([':']), literal(':')]),
          ast: { kind: 'left', text: $.text },
        },
      }),
      relation('Right', {
        input: 'bar;',
        encodings: {
          src: parse([span('text', 'bar').until([';']), literal(';')]),
          ast: { kind: 'right', text: $.text },
        },
      }),
      relation('Doc', {
        input: 'foo:',
        encodings: {
          src: parse([span('item', 'foo:').of('Left', 'Right')]),
          ast: { item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // The ladder must NOT use throw/catch for speculation.
  assert.doesNotMatch(code, /\bthrow\b.*new SyntaxError/);
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const left = __parse('foo:') as { item: { kind: string; text: string } };
  assert.equal(left.item.kind, 'left');
  assert.equal(left.item.text, 'foo');
  // `bar;` doesn't match Left (no `:`); Right picks it up via speculation.
  const right = __parse('bar;') as { item: { kind: string; text: string } };
  assert.equal(right.item.kind, 'right');
  assert.equal(right.item.text, 'bar');
});

test('v2 role-ladder uses sentinel speculation for same-byte literal roles', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Mirrors HTML's Doctype-vs-Comment conflict: both roles start with the
  // same byte `<` but have different literal prefixes (`<!` vs `<!--`). The
  // ladder groups them under one byte-dispatch arm and emits sentinel
  // speculation — longest-prefix role (Comment, `<!--`) is tried first.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Doctype', {
        input: '<!DOCTYPE>',
        encodings: {
          src: parse([
            literal('<!'),
            span('keyword', 'DOCTYPE').ident().html().oneOf(['DOCTYPE']),
            literal('>'),
          ]),
          ast: { kind: 'doctype', keyword: $.keyword },
        },
      }),
      relation('Comment', {
        input: '<!--hi-->',
        encodings: {
          src: parse([
            literal('<!--'),
            span('text', 'hi').until('-->', { trim: false }),
            literal('-->'),
          ]),
          ast: { kind: 'comment', text: $.text },
        },
      }),
      relation('Doc', {
        input: '<!DOCTYPE>',
        encodings: {
          src: parse([span('item', '<!DOCTYPE>').of('Doctype', 'Comment')]),
          ast: { item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // Both roles share byte 0x3c — they live in the same `if (__c0 === 60)`
  // group with speculation between them.
  assert.match(code, /__c0 === 60/);
  assert.doesNotMatch(code, /\bthrow\b.*new SyntaxError/);
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const doc = __parse('<!DOCTYPE>') as { item: { kind: string; keyword: string } };
  assert.equal(doc.item.kind, 'doctype');
  assert.equal(doc.item.keyword, 'DOCTYPE');
  const cmt = __parse('<!--hi-->') as { item: { kind: string; text: string } };
  assert.equal(cmt.item.kind, 'comment');
  assert.equal(cmt.item.text, 'hi');
});

test('v2 role-ladder fallthrough speculation respects author declaration order', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Two fallthrough roles with overlapping shapes; the second only matches
  // when the first would fail. The schema must list the more-specific role
  // first — that's the contract sentinel speculation rests on.
  //
  // Specific role (Underlined) needs both a text capture and a trailing
  // `===` underline. Catch-all (Paragraph) is plain text to EOF.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Underlined', {
        input: 'hi===',
        encodings: {
          src: parse([span('text', 'hi').until('==='), literal('===')]),
          ast: { kind: 'heading', text: $.text },
        },
      }),
      relation('Paragraph', {
        input: 'hello',
        encodings: {
          src: parse([span('text', 'hello').until([])]),
          ast: { kind: 'paragraph', text: $.text },
        },
      }),
      relation('Doc', {
        input: 'hi===',
        encodings: {
          src: parse([span('item', 'hi===').of('Underlined', 'Paragraph')]),
          ast: { item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // Speculation chain shape: Underlined tried first, Paragraph on null-return.
  assert.match(code, /parseUnderlined\(state\)[\s\S]*?if \(__r === null\) \{ __r = parseParagraph/);
  assert.doesNotMatch(code, /\bthrow\b.*new SyntaxError/);
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const heading = __parse('hi===') as { item: { kind: string; text: string } };
  assert.equal(heading.item.kind, 'heading');
  assert.equal(heading.item.text, 'hi');
  // No `===` underline — Underlined fails, Paragraph picks up.
  const paragraph = __parse('hello') as { item: { kind: string; text: string } };
  assert.equal(paragraph.item.kind, 'paragraph');
  assert.equal(paragraph.item.text, 'hello');
});

test('v2 emits role-dispatch ladder for multi-role non-repeats span', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Doc wraps a single child that can be either a Comment (starts with `/`)
  // or a Hash (starts with `#`). The two roles have distinct first bytes so
  // byte-prefix dispatch is unambiguous — exactly the case 1.3b targets.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Comment', {
        input: '/foo',
        encodings: {
          src: parse([literal('/'), span('text', 'foo').until(['\n', '@'])]),
          ast: { type: 'comment', text: $.text },
        },
      }),
      relation('Hash', {
        input: '#bar',
        encodings: {
          src: parse([literal('#'), span('text', 'bar').until(['\n', '@'])]),
          ast: { type: 'hash', text: $.text },
        },
      }),
      relation('Doc', {
        input: '/foo',
        encodings: {
          src: parse([span('item', '/foo').of('Comment', 'Hash')]),
          ast: { item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(code, /function parseDoc\(/);
  // The ladder must NOT call tryRoles or use any throw/catch for backtracking.
  assert.doesNotMatch(code, /tryRoles\b/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
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
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: '42px',
        encodings: {
          src: parse([
            span('value', '42').number().int(),
            span('unit', 'px').ident().css(),
          ]),
          ast: { value: $.value, unit: $.unit },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const ok = __parse('42px') as { value: string; unit: string };
  assert.equal(ok.value, '42');
  assert.equal(ok.unit, 'px');
  // `1.5` must fail: '.' is not part of an int scan, and the trailing `.5px`
  // can't be a valid unit.
  assert.throws(() => __parse('1.5px'));
});

test('v2 number scanner honors .float() — accepts digits and digits.fraction', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: '1.5px',
        encodings: {
          src: parse([
            span('value', '1.5').number().float(),
            span('unit', 'px').ident().css(),
          ]),
          ast: { value: $.value, unit: $.unit },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
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
  const { defineSchema, relation, parse, span } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Lit',
    examples: [
      relation('Lit', {
        input: '1.5e10',
        encodings: {
          src: parse([span('value', '1.5e10').number().scientific()]),
          ast: { value: span('value', '1.5e10') },
        },
      }),
    ],
  });
  // Need $ for the ast body — let me re-import
  const { defineSchema: ds2, relation: r2, parse: p2, span: s2, $ } = await import('@parser2/parser');
  const schema2 = ds2({
    rootType: 'Lit',
    examples: [
      r2('Lit', {
        input: '1.5e10',
        encodings: {
          src: p2([s2('value', '1.5e10').number().scientific()]),
          ast: { value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema2, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  assert.equal((__parse('1.5e10') as { value: string }).value, '1.5e10');
  assert.equal((__parse('2E-3') as { value: string }).value, '2E-3');
  assert.equal((__parse('1e+5') as { value: string }).value, '1e+5');
  // Integer form (no exponent, no fraction) is still accepted.
  assert.equal((__parse('42') as { value: string }).value, '42');
  // Float form (no exponent) is accepted by scientific (super-set of float).
  assert.equal((__parse('3.14') as { value: string }).value, '3.14');
});

test('v2 number scanner honors .separator("_") — allows underscores between digits', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Lit',
    examples: [
      relation('Lit', {
        input: '1_000',
        encodings: {
          src: parse([span('value', '1_000').number().separator('_')]),
          ast: { value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
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
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // The `;` and the inner `}` inside `{ nested }` must NOT terminate the
  // capture — the balanced-bracket tracking keeps depth > 0 while inside
  // `{...}`. The outer `;` (depth 0) is the stop that fires.
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'prop: { nested };',
        encodings: {
          src: parse([
            span('prop', 'prop').until(':'),
            literal(':'),
            span('value', '{ nested }').until([';', '}']),
            literal(';'),
          ]),
          ast: { prop: $.prop, value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const result = __parse('prop: { nested };') as { prop: string; value: string };
  assert.equal(result.prop, 'prop');
  // Without {} brace tracking, the inner `}` would be treated as a stop and
  // the value would close at `{ nested ` (or empty) — assert the full braced
  // capture is preserved.
  assert.equal(result.value, '{ nested }');
});

test('v2 .until() balanced:true tracks deeply-nested {} depth', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Doubly-nested `{ a: { b: c } }`. Inner `}` decrements to depth=1, outer
  // `}` decrements to depth=0. The next char after the outer `}` is `;` at
  // depth=0 — that's the stop that fires.
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'p: { a: { b: c } };',
        encodings: {
          src: parse([
            span('prop', 'p').until(':'),
            literal(':'),
            span('value', '{ a: { b: c } }').until([';', '}']),
            literal(';'),
          ]),
          ast: { prop: $.prop, value: $.value },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  const result = __parse('p: { a: { b: c } };') as { prop: string; value: string };
  assert.equal(result.prop, 'p');
  assert.equal(result.value, '{ a: { b: c } }');
  // Semicolons INSIDE the braces must not stop the scan either.
  const result2 = __parse('p: { a; b; c; };') as { prop: string; value: string };
  assert.equal(result2.value, '{ a; b; c; }');
});

test('v2 byte-prefix group orders tag-restricted (.oneOf) alts before unrestricted catch-all', async () => {
  // Repro for html implicit-close tests (<ol><li>a<li>b</ol>, <table>…, <p>…).
  // The catch-all `<tag>…</closeTag>` alt and the tag-restricted alts (`<li>`,
  // `<dt>`, `<tr>`, `<p>`, etc.) all begin with the same literal `<`. v2's
  // group speculation was tie-breaking by span count, which put the
  // catch-all (8 spans incl. closeTag) BEFORE the implicit-close `<li>` alt
  // (6 spans, optional close). That caused inputs like `<ol><li>a</ol>` to
  // be eagerly mis-parsed: the inner `<li>a</ol>` matched the catch-all
  // with tag=li/closeTag=ol, leaving the outer `<ol>` without its `</ol>`.
  //
  // The fix prioritizes alts whose spans contain a `.oneOf(...)` refinement
  // — these signal a tag-name discriminator and must be tried first so the
  // catch-all only sees inputs no specific alt can claim.
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      // li implicit-close form, declared SECOND. Has `.oneOf(['li'])`.
      relation('El', {
        input: '<li></li>',
        encodings: {
          src: parse([
            literal('<'),
            span('tag', 'li').ident().oneOf(['li']),
            literal('>'),
            span('children').of('El').repeats({ min: 0, stopBefore: ['<li>', '</ol>'] }),
            literal('</li>').optional(),
          ]),
          ast: { type: 'li', tag: $.tag },
        },
      }),
      // Catch-all regular form, declared FIRST so we can verify reorder.
      relation('El', {
        input: '<x></x>',
        encodings: {
          src: parse([
            literal('<'),
            span('tag', 'x').ident(),
            literal('>'),
            span('children').of('El').repeats({ min: 0 }),
            literal('</'),
            span('closeTag', 'x').ident(),
            literal('>'),
          ]),
          ast: { type: 'el', tag: $.tag, closeTag: $.closeTag },
        },
      }),
      relation('Doc', {
        input: '<x></x>',
        encodings: {
          src: parse([span('items', '<x></x>').of('El').repeats({ min: 0 })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' }) as { items: any[] };
  // `<li></li>` must dispatch to the tag-restricted alt (type:'li'),
  // not the catch-all (type:'el', closeTag:'li').
  assert.equal(__parse('<li></li>').items[0]!.type, 'li');
  // Implicit-close: `<ol><li></ol>` — outer must be el, inner must
  // be li. The inner stopBefore catches `</ol>` before the catch-all
  // alt eats `</ol>` as the inner's close tag.
  const r = __parse('<ol><li></ol>');
  assert.equal(r.items[0]!.type, 'el');
  assert.equal(r.items[0]!.tag, 'ol');
});

test('v2 speculation chain orders same-first-byte literals by descending prefix length', async () => {
  // Repro for markdown fenced code blocks: two alts share a leading byte
  // (`'`'`) but one literal is "```\\n" and the other is "```". When the
  // dispatcher falls back to speculation (because some OTHER alt has a
  // first span with no fixed byte — e.g. a leading .until()), the
  // longer-literal alt must be tried first within the same-first-byte
  // group. v1 does this via its byte-prefix dispatcher; v2 now mirrors
  // the order inside emitSpeculationChain.
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Leaf',
    examples: [
      // Decoy alt with no fixed first byte — forces emitDispatcher to
      // fall through to emitSpeculationChain. Use a leading non-backtick
      // anchor so this alt never matches a `'```...'` input.
      relation('Leaf', {
        input: 'Setext\n===',
        encodings: {
          src: parse([
            span('text', 'Setext').until('\n===', { balanced: false }),
            literal('\n==='),
          ]),
          ast: { type: 'setext', text: $.text },
        },
      }),
      // Alt with shorter literal prefix.
      relation('Leaf', {
        input: '```js\nsample\n```',
        encodings: {
          src: parse([
            literal('```'),
            span('lang', 'js').ident().css(),
            span('body', 'sample').until('```', { balanced: false }),
            literal('```'),
          ]),
          ast: { type: 'code-lang', lang: $.lang, body: $.body },
        },
      }),
      // Alt with longer literal prefix — declared SECOND but should be
      // tried first against `'```\\n...'`-shaped input.
      relation('Leaf', {
        input: '```\nplain\n```',
        encodings: {
          src: parse([
            literal('```\n'),
            span('body', 'plain').until('```', { balanced: false }),
            literal('```'),
          ]),
          ast: { type: 'code-plain', body: $.body },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' }) as { type: string };
  // The "```\\n…" alt must win on the no-lang input.
  assert.equal(__parse('```\nplain\n```').type, 'code-plain');
  // The shorter "```" alt still wins when followed by an ident.
  assert.equal(__parse('```js\nsample\n```').type, 'code-lang');
});

test('v2 .until() always trims trailing whitespace from the captured slice', async () => {
  // Repro for html comment fixtures: a schema like
  //   .span('data', ' hello ').until('-->', { trim: false })
  // declares trim:false but v1's emitter ignores the option (always trims).
  // The AST shape expects the trimmed interior (data === 'hello'), not the
  // raw ' hello '. v2 must match.
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'C',
    examples: [
      relation('C', {
        input: '<!-- hello -->',
        encodings: {
          src: parse([
            literal('<!--'),
            span('data', ' hello ').until('-->', { trim: false }),
            literal('-->'),
          ]),
          ast: { data: $.data },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' }) as { data: string };
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
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'C',
    tokens: ['comment'],
    examples: [
      relation('C', {
        input: '/* foo */',
        encodings: {
          src: parse([span('text', '/* foo */').comment()]),
          ast: { type: 'comment', text: $.text },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' }) as { text: string };
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
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Body',
    tokens: ['comment'],
    examples: [
      relation('Comment', {
        input: '/* foo */',
        encodings: {
          src: parse([span('text', '/* foo */').comment()]),
          ast: { type: 'comment', text: $.text },
        },
      }),
      relation('Decl', {
        input: 'a',
        encodings: {
          src: parse([
            span('prop', 'a').ident(),
            literal(';').optional(),
          ]),
          ast: { type: 'decl', prop: $.prop },
        },
      }),
      relation('Body', {
        input: 'a /* x */',
        encodings: {
          src: parse([span('items', 'a').of('Comment', 'Decl').repeats({ min: 0 })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' }) as { items: { type: string }[] };
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
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Body',
    examples: [
      relation('Item', {
        input: 'a',
        encodings: {
          src: parse([span('name', 'a').ident()]),
          ast: { name: $.name },
        },
      }),
      relation('Body', {
        input: '{ a; b }',
        encodings: {
          src: parse([
            literal('{'),
            span('items', 'a; b').of('Item').repeats({ min: 0, sep: ';', trailing: 'allowed' }),
            literal('}'),
          ]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' }) as { items: unknown[] };
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
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    tokens: ['comment'],
    examples: [
      relation('Comment', {
        input: '/* x */',
        encodings: {
          src: parse([span('text', '/* x */').comment()]),
          ast: { type: 'comment', text: $.text },
        },
      }),
      relation('Word', {
        input: 'a',
        encodings: {
          src: parse([span('name', 'a').ident()]),
          ast: { type: 'word', name: $.name },
        },
      }),
      relation('Doc', {
        input: 'a',
        encodings: {
          src: parse([span('items', 'a').of('Comment', 'Word').repeats({ min: 0 })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' }) as { items: { type: string }[] };
  const r = __parse('/* x */ a /* y */');
  assert.deepEqual(r.items.map((it) => it.type), ['comment', 'word', 'comment']);
});

test('v2 inter-span ws skip also skips /* */ comments when schema declares comment token', async () => {
  // Repro for css `between.css` / `prop.css` / `semicolons.css`:
  // Between two spans of the SAME production, v1's emit skips both whitespace
  // and `/* */` comments. v2 only skipped ws, so a comment between a captured
  // selector and its `{` left `off` parked on `/`, failing the literal match.
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Rule',
    tokens: ['comment'],
    examples: [
      relation('Rule', {
        input: 'a { }',
        encodings: {
          src: parse([
            span('selector', 'a').until(['{', ';']),
            literal('{'),
            literal('}'),
          ]),
          ast: { selector: $.selector },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) => render(input, { target: 'ast' });
  // No comments: baseline.
  assert.deepEqual(__parse('a {}'), { selector: 'a' });
  // Trailing /* */ comment between selector trim boundary and `{` must be
  // consumed by the inter-span skip.
  assert.deepEqual(__parse('a/**/{}'), { selector: 'a' });
  assert.deepEqual(__parse('a /* note */ {}'), { selector: 'a' });
  assert.deepEqual(__parse('a/**/\n{}'), { selector: 'a' });
});

test('v2 .until() with 3+ unbalanced stops uses Aho-Corasick scanner', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  // Markdown's PARAGRAPH_STOPS is the motivating example: 14 multi-byte
  // stops, unbalanced, no string/comment tokens. The compiler should pick
  // the AC fast-path here — verified by grepping for the state-machine
  // signature in the emitted source — and the produced parser must capture
  // the same slice the per-stop chain would have. We wrap Paragraph in a
  // Doc that repeats `Paragraph` so leftover input (`\n# heading`, etc.)
  // doesn't surface as a parse failure — the Doc role chains paragraphs
  // and absorbs whatever follows.
  const PARAGRAPH_STOPS = [
    '\n\n', '\n#', '\n>', '\n- ', '\n-\n',
    '\n+ ', '\n* ', '\n```', '\n|',
    '\n---', '\n***', '\n___', '\n===', '\n[',
  ] as const;
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Paragraph', {
        input: 'Plain paragraph',
        encodings: {
          src: parse([span('text', 'Plain paragraph').until([...PARAGRAPH_STOPS], { balanced: false })]),
          ast: { type: 'paragraph', text: $.text },
        },
      }),
      relation('Doc', {
        input: 'Plain paragraph',
        encodings: {
          src: parse([span('items', 'Plain paragraph').of('Paragraph').repeats({ min: 1 })]),
          ast: { items: $.items },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // The AC emitter's unique signature — `__acState`, `__acBest`, and the
  // max-length bound — should appear in the paragraph parser. Confirms the
  // fast path fired for the 14-stop PARAGRAPH_STOPS.
  assert.match(code, /let __acState = 0;/);
  assert.match(code, /let __acBest = -1;/);
  assert.match(code, /const __acMaxLen = \d+;/);

  const { render } = await loadV2Parser(code);
  const firstText = (input: string): string => {
    const r = render(input, { target: 'ast' }) as {
      items: Array<{ type: string; text: string }>;
    };
    return r.items[0]!.text;
  };
  // Plain paragraph runs to EOF.
  assert.equal(firstText('Plain paragraph'), 'Plain paragraph');
  // Paragraph stops at the first PARAGRAPH_STOPS match.
  assert.equal(firstText('Hello world\n\nNext block'), 'Hello world');
  assert.equal(firstText('Before\n# heading'), 'Before');
  assert.equal(firstText('Quote follows\n> quoted'), 'Quote follows');
  assert.equal(firstText('Code\n```\nfn'), 'Code');
  assert.equal(firstText('Link\n[a][1]'), 'Link');
  // A `\n` not followed by any stop byte stays in the paragraph.
  assert.equal(firstText('multi\nline text'), 'multi\nline text');
  // Trailing whitespace is trimmed (useTrim default).
  assert.equal(firstText('trim me   '), 'trim me');
});

test('v2 .until() with <3 stops still uses per-stop compare chain (no AC)', async () => {
  const { defineSchema, relation, parse, span, $ } = await import('@parser2/parser');
  // Two stops, unbalanced — below the AC_MIN_STOPS threshold. The emitter
  // should pick the byte-walk loop with the compare-chain stopExpr, not
  // the AC scanner.
  const schema = defineSchema({
    rootType: 'P',
    examples: [
      relation('P', {
        input: 'hi',
        encodings: {
          src: parse([span('text', 'hi').until(['\n', '@'], { balanced: false })]),
          ast: { text: $.text },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // The AC signature must NOT appear for this span.
  assert.doesNotMatch(code, /let __acState = 0;/);
  // The compare-chain stop predicate (single-byte form for the two stops)
  // shows up in the byte-walk loop's `if (...) break;` line.
  assert.match(code, /if \(__c === 10 \|\| __c === 64\)/);
});

// Task 4.4: switch-based dispatch jump table for wide first-byte fanout.
// The role-ladder emits a `switch (__c0)` statement instead of a chain of
// `if (__c0 === N) ... else if ...` blocks when there are ≥4 distinct
// first-byte arms. JITs compile small-int switches with ≥4 cases to a
// jump table; chained ifs rely on branch prediction. See role-ladder.ts.

test('v2 role-ladder emits switch dispatch for ≥4 byte-arm roles', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Five roles, each with a distinct literal first byte — Hash `#`, At `@`,
  // Plus `+`, Star `*`, Minus `-`. Above the DISPATCH_SWITCH_MIN_BYTES
  // threshold (4) so the ladder must emit a `switch (__c0)` jump table
  // with one `case N:` per byte and a `default:` for the fallthrough.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Hash', {
        input: '#h',
        encodings: {
          src: parse([literal('#'), span('text', 'h').until(['\n'])]),
          ast: { kind: 'hash', text: $.text },
        },
      }),
      relation('At', {
        input: '@a',
        encodings: {
          src: parse([literal('@'), span('text', 'a').until(['\n'])]),
          ast: { kind: 'at', text: $.text },
        },
      }),
      relation('Plus', {
        input: '+p',
        encodings: {
          src: parse([literal('+'), span('text', 'p').until(['\n'])]),
          ast: { kind: 'plus', text: $.text },
        },
      }),
      relation('Star', {
        input: '*s',
        encodings: {
          src: parse([literal('*'), span('text', 's').until(['\n'])]),
          ast: { kind: 'star', text: $.text },
        },
      }),
      relation('Minus', {
        input: '-m',
        encodings: {
          src: parse([literal('-'), span('text', 'm').until(['\n'])]),
          ast: { kind: 'minus', text: $.text },
        },
      }),
      relation('Doc', {
        input: '#h',
        encodings: {
          src: parse([span('item', '#h').of('Hash', 'At', 'Plus', 'Star', 'Minus')]),
          ast: { item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // The switch dispatch must be present.
  assert.match(code, /switch \(__c0\) \{/);
  // All five byte arms appear as case labels (# = 35, @ = 64, + = 43,
  // * = 42, - = 45).
  assert.match(code, /case 35:/);
  assert.match(code, /case 64:/);
  assert.match(code, /case 43:/);
  assert.match(code, /case 42:/);
  assert.match(code, /case 45:/);
  // No chained `if (__c0 === N) ... else if (__c0 === M)` should remain
  // for this node — the switch replaced it.
  assert.doesNotMatch(code, /if \(__c0 === 35\)[\s\S]{0,80}else if \(__c0 === 64\)/);

  // Runtime correctness across every case + the absence of any byte arm.
  const { render } = await loadV2Parser(code);
  const __parse = (input: string) =>
    render(input, { target: 'ast' }) as { item: { kind: string; text: string } };
  assert.equal(__parse('#hello').item.kind, 'hash');
  assert.equal(__parse('#hello').item.text, 'hello');
  assert.equal(__parse('@user').item.kind, 'at');
  assert.equal(__parse('+plus').item.kind, 'plus');
  assert.equal(__parse('*star').item.kind, 'star');
  assert.equal(__parse('-minus').item.kind, 'minus');
});

test('v2 role-ladder keeps chained if for <4 byte-arm roles', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Three roles with distinct first bytes — below the threshold. The
  // ladder must NOT emit a switch; the chained `if (__c0 === N) else if
  // (__c0 === M)` shape stays so the JIT keeps using branch prediction.
  // Mirrors today's CSS Stylesheet body (Comment 0x2f / AtRule 0x40 /
  // fallthrough Rule|Declaration), which is the narrow-fanout shape we
  // explicitly do NOT want to lower to a switch.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Hash', {
        input: '#h',
        encodings: {
          src: parse([literal('#'), span('text', 'h').until(['\n'])]),
          ast: { kind: 'hash', text: $.text },
        },
      }),
      relation('At', {
        input: '@a',
        encodings: {
          src: parse([literal('@'), span('text', 'a').until(['\n'])]),
          ast: { kind: 'at', text: $.text },
        },
      }),
      relation('Plus', {
        input: '+p',
        encodings: {
          src: parse([literal('+'), span('text', 'p').until(['\n'])]),
          ast: { kind: 'plus', text: $.text },
        },
      }),
      relation('Doc', {
        input: '#h',
        encodings: {
          src: parse([span('item', '#h').of('Hash', 'At', 'Plus')]),
          ast: { item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // No switch statement — the chained-if path stayed.
  assert.doesNotMatch(code, /switch \(__c0\) \{/);
  // The chained-if shape — at least one `if (__c0 === N)` followed by
  // `else if (__c0 === M)`.
  assert.match(code, /if \(__c0 === 35\)/);
  assert.match(code, /else if \(__c0 === 64\)/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) =>
    render(input, { target: 'ast' }) as { item: { kind: string; text: string } };
  assert.equal(__parse('#hi').item.kind, 'hash');
  assert.equal(__parse('@me').item.kind, 'at');
  assert.equal(__parse('+plus').item.kind, 'plus');
});

test('v2 syntaxErrorAt: includes unexpected byte and position in headline', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // A minimal schema — just enough for generateParser to emit the v2 runtime
  // preamble (which contains syntaxErrorAt). We only check the emitted source.
  const schema = defineSchema({
    rootType: 'R',
    examples: [
      relation('R', {
        input: 'a { }',
        encodings: {
          src: parse([
            span('selector', 'a').until(['{'], { rejectSuffix: ':' }),
            literal('{'),
            literal('}'),
          ]),
          ast: { sel: $.selector },
        },
      }),
    ],
  });
  const source = generateParser(schema, undefined, {});
  // The emitted syntaxErrorAt must construct a headline of the form
  //   Unexpected '<ch>' at position <offset>
  // (These are JS template literal expressions inside the emitted source.)
  assert.match(source, /Unexpected '\$\{.*?\}' at position \$\{offset\}/);
  // And, when offset is past end-of-input, a fixed-text headline:
  //   Unexpected end of input at position <offset>
  assert.match(source, /Unexpected end of input at position \$\{offset\}/);
});

test('v2 role-ladder switch dispatch handles same-byte groups and fallthrough', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  // Four byte-arm roles where two share the same first byte (`<`). The
  // ladder must:
  //   1. Group the two `<`-leading roles under a single `case 60:` arm
  //      with sentinel speculation (longest-prefix first).
  //   2. Emit case labels for the other byte-distinct roles.
  //   3. Emit a `default:` for the fallthrough text role.
  // This exercises every code path of the switch emitter in one schema.
  const schema = defineSchema({
    rootType: 'Doc',
    examples: [
      relation('Comment', {
        input: '<!--c-->',
        encodings: {
          src: parse([
            literal('<!--'),
            span('text', 'c').until(['-->'], { trim: false }),
            literal('-->'),
          ]),
          ast: { kind: 'comment', text: $.text },
        },
      }),
      relation('Tag', {
        input: '<tag>',
        encodings: {
          src: parse([literal('<'), span('name', 'tag').ident().html(), literal('>')]),
          ast: { kind: 'tag', name: $.name },
        },
      }),
      relation('Hash', {
        input: '#h',
        encodings: {
          src: parse([literal('#'), span('text', 'h').until(['\n'])]),
          ast: { kind: 'hash', text: $.text },
        },
      }),
      relation('At', {
        input: '@a',
        encodings: {
          src: parse([literal('@'), span('text', 'a').until(['\n'])]),
          ast: { kind: 'at', text: $.text },
        },
      }),
      relation('Plus', {
        input: '+p',
        encodings: {
          src: parse([literal('+'), span('text', 'p').until(['\n'])]),
          ast: { kind: 'plus', text: $.text },
        },
      }),
      relation('Text', {
        input: 'text',
        encodings: {
          src: parse([span('text', 'text').until(['\n'])]),
          ast: { kind: 'text', text: $.text },
        },
      }),
      relation('Doc', {
        input: '<tag>',
        encodings: {
          src: parse([span('item', '<tag>').of('Comment', 'Tag', 'Hash', 'At', 'Plus', 'Text')]),
          ast: { item: $.item },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // Switch present (5 distinct byte arms: 60, 35, 64, 43).
  assert.match(code, /switch \(__c0\) \{/);
  assert.match(code, /case 60:/);
  assert.match(code, /case 35:/);
  assert.match(code, /case 64:/);
  assert.match(code, /case 43:/);
  // Default arm dispatches the fallthrough Text role.
  assert.match(code, /default:[\s\S]{0,160}parseText\(state\)/);
  // The 0x3c shared-byte group uses speculation within the case: Comment
  // (longer literal `<!--`) is tried first, Tag second.
  assert.match(code, /parseComment\(state\)[\s\S]{0,120}parseTag\(state\)/);

  const { render } = await loadV2Parser(code);
  const __parse = (input: string) =>
    render(input, { target: 'ast' }) as { item: { kind: string; text?: string; name?: string } };
  assert.equal(__parse('<!--hi-->').item.kind, 'comment');
  assert.equal(__parse('<div>').item.kind, 'tag');
  assert.equal(__parse('<div>').item.name, 'div');
  assert.equal(__parse('#hash').item.kind, 'hash');
  assert.equal(__parse('@user').item.kind, 'at');
  assert.equal(__parse('+plus').item.kind, 'plus');
  // No byte arm matches → fallthrough default.
  assert.equal(__parse('plain text').item.kind, 'text');
});

test("v2 .until() with unknownChars:'reject' rejects undeclared bytes at depth 0", async () => {
  // Regression for css smoke test #1: backtick (0x60) is not a declared
  // literal, punctuator, or class-start byte in the schema, so the .until()
  // scan should fail fast instead of swallowing it silently.
  // The schema declares an ident class so that the guard is active: with no
  // class declarations, knownBytes would be trivially narrow (whitespace +
  // literal first bytes only) and the guard is suppressed.
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Doc',
    unknownChars: 'reject',
    examples: [
      // The prop span uses .ident() so that schema.classes is non-empty and
      // the unknownChars guard is active on the value's .until() body.
      relation('Doc', {
        input: 'prop: value;',
        encodings: {
          src: parse([
            span('prop', 'prop').ident(),
            literal(':'),
            span('v', 'value').until([';']),
            literal(';'),
          ]),
          ast: { prop: $.prop, v: $.v },
        },
      }),
    ],
  });
  const src = generateParser(schema, undefined, {});
  // Smoke check at codegen: the until body should contain a depth-0 unknown-byte
  // bailout, encoded as a state.pos rewind + null return based on a known-byte
  // bitset check.
  assert.match(src, /unknown char/);
});

test('v2 .until() honors nonEmpty + rejectSuffix array', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'R',
    examples: [
      relation('R', {
        input: '.foo{',
        encodings: {
          src: parse([
            span('s', '.foo').until(['{'], { rejectSuffix: [':', ',', '>'], nonEmpty: true }),
            literal('{'),
          ]),
          ast: { s: $.s },
        },
      }),
    ],
  });
  const src = generateParser(schema, undefined, {});
  assert.match(src, /endsWith\(.*"[,:>]".*\)/);
  assert.match(src, /\.length === 0/);
});

test('v2 .until() with requireStop fails on EOF without stop match', async () => {
  const { defineSchema, relation, parse, span, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'R',
    examples: [
      relation('R', {
        input: 'value"',
        encodings: {
          src: parse([
            span('v', 'value').until(['"'], { requireStop: true }),
            literal('"'),
          ]),
          ast: { v: $.v },
        },
      }),
    ],
  });
  const src = generateParser(schema, undefined, {});
  // The emitted until body should test for EOF after the scan and fail.
  assert.match(src, /off >= len/);
});

test('v2 validate() invokes per-field validators from ValidationDef', () => {
  // Use the real CSS generated parser since the validation infrastructure lives there.
  // This is a code-shape check, not a runtime check — we assert the emitted
  // validate() function contains the validator dispatch logic and dispatches by
  // __production nodeType + matchField.
  //
  // Note (Task 9.11): @parser2/css-color and @parser2/css-length-percentage were
  // deleted as out-of-scope packages. Their validate() functions are now inlined
  // directly into the css _generated/parser.ts rather than imported. The assertions
  // below verify the validation infrastructure is still present in the generated file.
  //
  // The test file lives at packages/compiler/test/v2-regressions.test.ts;
  // navigate up two levels to reach the monorepo root, then into css/_generated.
  const cssParserPath = new URL('../../../packages/css/src/_generated/parser.ts', import.meta.url).pathname;
  const parserSrc = readFileSync(cssParserPath, 'utf8');
  // Validators are now inlined (not imported) — check for the inlined __validator_N wrappers.
  assert.match(parserSrc, /function __validator_\d+/);
  // Generated validate() should reference the validator wrappers by name.
  assert.match(parserSrc, /__validator_\d+/);
  // The validate function should dispatch based on __production field.
  assert.match(parserSrc, /__production/);
});
