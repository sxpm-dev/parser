// Phase 4b — whitespace: 'preserve'.
//
// When a schema declares `whitespace: 'preserve'`, the compiler captures
// every inter-span whitespace slice into a synthetic `__ws` array on the
// captures payload. The stringify rebuild then re-emits those exact bytes
// between span pieces (instead of the canonical single-space sep used for
// `'standard'`). The result: byte-exact round-trip for unmodified input.
//
// Scope of v1 (this test):
//   - Single production with multiple named/literal spans.
//   - Inter-span ws of varied length (one space, multi-space, tab, newline).
//   - No optional spans, no .repeats, no recursion.
//
// Out of scope (deferred to a follow-up): leading/trailing ws, optional
// spans, repeats arrays, recursion-with-preserve.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser, inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/parse.ts';
import { interpretStringify } from '../src/interp/stringify.ts';
import {
  $,
  defineSchema,
  literal,
  parse,
  relation,
  span,
  type SchemaDef,
} from '@parser2/parser';

function buildSchema(): SchemaDef {
  return defineSchema({
    rootType: 'KV',
    whitespace: 'preserve',
    examples: [
      relation('KV', {
        input: 'k = v',
        encodings: {
          parse: parse([
            span('k', 'k').ident(),
            literal('='),
            span('v', 'v').ident(),
          ]),
          // Phase 4c v1: the schema author no longer needs to write
          // `__ws: $.__ws` here. The compiler auto-attaches `__ws` to
          // every AST object emitted by a preserve schema so byte-exact
          // round-trip works without polluting the schema's intended
          // shape with the synthetic key.
          ast: { type: 'kv', k: $.k, v: $.v },
        },
      }),
    ],
  });
}

type RenderFn = (input: string, options?: { target?: string }) => unknown;
type StringifyFn = (value: unknown, options?: { target?: string }) => string;

async function loadV2(schema: SchemaDef): Promise<{
  render: RenderFn;
  stringify: StringifyFn;
}> {
  const code = generateParser(schema, undefined, {});
  const dir = mkdtempSync(join(tmpdir(), 'parser3-ws-preserve-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = (await import(pathToFileURL(file).href)) as {
    render: RenderFn;
    stringify: StringifyFn;
  };
  return { render: mod.render, stringify: mod.stringify };
}

const INPUTS = [
  'a = b',          // single-space sep on both sides
  'a  =  b',        // multi-space
  'a\t=\tb',        // tab
  'a=b',            // no ws
  'a   =\tb',       // mixed
];

test('v2: whitespace:preserve gives byte-exact round-trip via stringify', async () => {
  const schema = buildSchema();
  const { render, stringify } = await loadV2(schema);
  for (const input of INPUTS) {
    const ast = render(input, { target: 'ast' });
    const out = stringify(ast, { target: 'ast' });
    assert.equal(out, input, `round-trip should be byte-exact for ${JSON.stringify(input)}; got ${JSON.stringify(out)}`);
  }
});

test('interp: whitespace:preserve gives byte-exact round-trip', () => {
  const schema = buildSchema();
  const inferred = inferSchema(schema);
  for (const input of INPUTS) {
    const ast = interpretParse(inferred, input);
    const out = interpretStringify(inferred, ast, 'ast');
    assert.equal(out, input, `interp round-trip should be byte-exact for ${JSON.stringify(input)}; got ${JSON.stringify(out)}`);
  }
});

// Phase 4c v1 — recursion. Each production captures its own __ws and the
// auto-attach happens at each AST level. Nested children round-trip
// byte-exactly the same way the root does.
test('v2: whitespace:preserve round-trips through recursive children', async () => {
  const schema = defineSchema({
    rootType: 'Pair',
    whitespace: 'preserve',
    examples: [
      relation('Atom', {
        input: 'a',
        encodings: {
          parse: parse([span('name', 'a').ident()]),
          ast: { type: 'atom', name: $.name },
        },
      }),
      relation('Pair', {
        input: 'a , b',
        encodings: {
          parse: parse([
            span('left', 'a', 'Atom'),
            literal(','),
            span('right', 'b', 'Atom'),
          ]),
          ast: { type: 'pair', left: $.left, right: $.right },
        },
      }),
    ],
  });
  const { render, stringify } = await loadV2(schema);
  for (const input of ['a , b', 'a  ,  b', 'a,b']) {
    const ast = render(input, { target: 'ast' });
    const out = stringify(ast, { target: 'ast' });
    assert.equal(out, input, `recursive round-trip failed for ${JSON.stringify(input)}; got ${JSON.stringify(out)}`);
  }
});

// Phase 4c v2 — comments interleaved between spans. When the schema
// declares the `comment` token class, the inter-span skip eats `/* */`
// comments alongside whitespace, and the `__ws` slice captures the full
// region including the comment text. So a comment between two spans
// round-trips through the auto-attached `__ws`.
test('v2: whitespace:preserve preserves block comments between spans', async () => {
  const schema = defineSchema({
    rootType: 'KV',
    whitespace: 'preserve',
    tokens: ['comment'],
    examples: [
      relation('KV', {
        input: 'k = v',
        encodings: {
          parse: parse([
            span('k', 'k').ident(),
            literal('='),
            span('v', 'v').ident(),
          ]),
          ast: { type: 'kv', k: $.k, v: $.v },
        },
      }),
    ],
  });
  const { render, stringify } = await loadV2(schema);
  for (const input of [
    'a /* leading */ = /* mid */ b',
    'a/*x*/=/*y*/b',
    'a = b',
  ]) {
    const ast = render(input, { target: 'ast' });
    const out = stringify(ast, { target: 'ast' });
    assert.equal(out, input, `comment round-trip failed for ${JSON.stringify(input)}; got ${JSON.stringify(out)}`);
  }
});

// Phase 4c v2 — UNNAMED optional literal spans now round-trip in preserve
// mode via the parser-tracked `__litPres` array. The compiler auto-attaches
// `__litPres` to the AST so stringify can gate the literal emission per
// span position.
test('v2: whitespace:preserve handles unnamed optional literals via __litPres', async () => {
  const schema = defineSchema({
    rootType: 'Pair',
    whitespace: 'preserve',
    examples: [
      relation('Pair', {
        input: 'a , b',
        encodings: {
          parse: parse([
            span('l', 'a').ident(),
            literal(',').optional(),
            span('r', 'b').ident(),
          ]),
          ast: { type: 'pair', l: $.l, r: $.r },
        },
      }),
    ],
  });
  const { render, stringify } = await loadV2(schema);
  for (const input of ['a , b', 'a,b', 'a  ,  b', 'a b', 'a   b']) {
    const ast = render(input, { target: 'ast' });
    assert.equal(stringify(ast, { target: 'ast' }), input, `unnamed-optional round-trip failed for ${JSON.stringify(input)}`);
  }
});

// Phase 4c v2 — NAMED optional spans. The captured value is null when
// absent and the rebuild's optional-fuse logic suppresses both the slot
// and its surrounding sep. With __ws auto-attached, both present and
// absent cases round-trip byte-exactly.
test('v2: whitespace:preserve handles named optional spans present/absent symmetrically', async () => {
  const schema = defineSchema({
    rootType: 'Pair',
    whitespace: 'preserve',
    examples: [
      relation('Pair', {
        input: 'a , b',
        encodings: {
          parse: parse([
            span('l', 'a').ident(),
            span('sep', ',').optional(),
            span('r', 'b').ident(),
          ]),
          ast: { type: 'pair', l: $.l, sep: $.sep, r: $.r },
        },
      }),
    ],
  });
  const { render, stringify } = await loadV2(schema);
  for (const input of ['a , b', 'a,b', 'a  ,  b', 'a b', 'a   b']) {
    const ast = render(input, { target: 'ast' });
    assert.equal(stringify(ast, { target: 'ast' }), input, `optional round-trip failed for ${JSON.stringify(input)}`);
  }
});

// Phase 4c v4 — comments BETWEEN .repeats() iterations. The sep-sweep
// now eats `/* ... */` block comments alongside whitespace when the
// schema declares the `comment` token class AND none of the repeats
// roles consume comments. Without this guard, the role-ladder would
// silently swallow what should be a Comment child node.
test('v2: whitespace:preserve handles comments between repeats iterations', async () => {
  const schema = defineSchema({
    rootType: 'List',
    whitespace: 'preserve',
    tokens: ['comment'],
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          parse: parse([span('name', 'x').ident()]),
          ast: { type: 'item', name: $.name },
        },
      }),
      relation('List', {
        input: 'x, y',
        encodings: {
          parse: parse([
            span('items', 'x').of('Item').repeats({ sep: ',', trailing: 'allowed' }),
          ]),
          ast: { type: 'list', items: $.items },
        },
      }),
    ],
  });
  const { render, stringify } = await loadV2(schema);
  for (const input of ['a, b', 'a /* c */, b', 'a,/* c */ b']) {
    const ast = render(input, { target: 'ast' });
    const out = stringify(ast, { target: 'ast' });
    assert.equal(out, input, `inter-iteration comment round-trip failed for ${JSON.stringify(input)}; got ${JSON.stringify(out)}`);
  }
});

// Phase 4c v4 — leading/trailing ws around the root parse. The public
// `__parse` captures the ws+comments at offset 0 and the trailing
// ws+comments after the root match, then attaches them to the AST as
// `__leadingWs` and `__trailingWs`. The public `stringify` reads them
// back so a full document round-trips byte-exactly.
test('v2: whitespace:preserve preserves leading/trailing root whitespace', async () => {
  const schema = defineSchema({
    rootType: 'KV',
    whitespace: 'preserve',
    tokens: ['comment'],
    examples: [
      relation('KV', {
        input: 'k = v',
        encodings: {
          parse: parse([
            span('k', 'k').ident(),
            literal('='),
            span('v', 'v').ident(),
          ]),
          ast: { type: 'kv', k: $.k, v: $.v },
        },
      }),
    ],
  });
  const { render, stringify } = await loadV2(schema);
  for (const input of [
    '  a = b  ',
    '\n a = b \n',
    '/* leading */ a = b /* trailing */',
    'a = b',
  ]) {
    const ast = render(input, { target: 'ast' });
    const out = stringify(ast, { target: 'ast' });
    assert.equal(out, input, `leading/trailing round-trip failed for ${JSON.stringify(input)}; got ${JSON.stringify(out)}`);
  }
});

// Phase 4c v5 — sep-less .repeats() should also capture per-iteration
// trivia. Schemas that need byte-exact round-trip but can't use sep:''
// (the interp loops on zero-length sep sweeps) currently lose the
// inter-item whitespace because captureIws was gated on sep !== undefined.
// Without iws, the rebuild interleaves items with the schema's canonical
// separator (a single space for standard policy / empty for preserve),
// so 'P1Y\t2M' round-trips as 'P1Y2M' (preserve) or 'P1Y 2M' (standard)
// — both wrong. Drop the sep gate so iws fires for ALL named repeats.
test('v2: whitespace:preserve gives byte-exact round-trip for sep-less .repeats()', async () => {
  const schema = defineSchema({
    rootType: 'Bag',
    whitespace: 'preserve',
    examples: [
      relation('Atom', {
        input: 'x',
        encodings: {
          parse: parse([span('name', 'x').ident()]),
          ast: { type: 'atom', name: $.name },
        },
      }),
      relation('Bag', {
        input: 'a b',
        encodings: {
          parse: parse([
            span('items', 'a').of('Atom').repeats({ min: 1 }),
          ]),
          ast: { type: 'bag', items: $.items },
        },
      }),
    ],
  });
  const { render, stringify } = await loadV2(schema);
  for (const input of ['a b', 'a  b', 'a\tb', 'ab', 'a b c', 'a  b\tc']) {
    const ast = render(input, { target: 'ast' });
    const out = stringify(ast, { target: 'ast' });
    assert.equal(out, input, `sep-less repeats round-trip failed for ${JSON.stringify(input)}; got ${JSON.stringify(out)}`);
  }
});

test('interp: whitespace:preserve gives byte-exact round-trip for sep-less .repeats()', () => {
  const schema = defineSchema({
    rootType: 'Bag',
    whitespace: 'preserve',
    examples: [
      relation('Atom', {
        input: 'x',
        encodings: {
          parse: parse([span('name', 'x').ident()]),
          ast: { type: 'atom', name: $.name },
        },
      }),
      relation('Bag', {
        input: 'a b',
        encodings: {
          parse: parse([
            span('items', 'a').of('Atom').repeats({ min: 1 }),
          ]),
          ast: { type: 'bag', items: $.items },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  for (const input of ['a b', 'a  b', 'a\tb', 'ab', 'a b c', 'a  b\tc']) {
    const ast = interpretParse(inferred, input);
    const out = interpretStringify(inferred, ast, 'ast');
    assert.equal(out, input, `interp sep-less repeats round-trip failed for ${JSON.stringify(input)}; got ${JSON.stringify(out)}`);
  }
});

test('v2: whitespace:standard schema still canonicalizes ws to single space', async () => {
  // Baseline: ensure default schemas behavior is unchanged.
  const schema = defineSchema({
    rootType: 'KV',
    examples: [
      relation('KV', {
        input: 'k = v',
        encodings: {
          parse: parse([
            span('k', 'k').ident(),
            literal('='),
            span('v', 'v').ident(),
          ]),
          ast: { type: 'kv', k: $.k, v: $.v },
        },
      }),
    ],
  });
  const { render, stringify } = await loadV2(schema);
  const ast = render('a   =   b', { target: 'ast' });
  const out = stringify(ast, { target: 'ast' });
  // 'standard' policy collapses ws to single space — that's the legacy
  // behavior that pre-Phase-4b schemas depend on.
  assert.equal(out, 'a = b');
});
