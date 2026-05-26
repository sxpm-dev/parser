// Dispatch-uniqueness theorems (Tasks 3.2 + 3.3) — codegen-time check
// that every multi-production node-type's productions are statically
// distinguishable by the parse-time dispatcher (either by disjoint
// first-byte signatures, distinct literal first spans, divergent
// structural fingerprints, or specificity asymmetry that the dispatcher's
// priority ordering resolves). See `src/check/dispatch.ts` header for
// the full property statement.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { inferSchema } from '../src/index.ts';
import { CompilerError } from '../src/model.ts';

// ---------------------------------------------------------------------------
// Positive: every in-scope schema passes the dispatch check
// ---------------------------------------------------------------------------

test('checkDispatch — markdown schema passes', async () => {
  const { default: schema } = await import('../../markdown/src/schema.ts');
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

test('checkDispatch — css schema passes', async () => {
  const { default: schema } = await import('../../css/src/schema.ts');
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

test('checkDispatch — html schema passes', async () => {
  const { default: schema } = await import('../../html/src/schema.ts');
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// ---------------------------------------------------------------------------
// Negative: contrived schemas hit the various failure modes
// ---------------------------------------------------------------------------

// Two productions with IDENTICAL fingerprints (same literal first span,
// same single-element shape). The dispatcher would resolve them by
// declaration order alone — the schema author MUST add a discriminator.
//
// We surface inverse-discrimination upstream by giving the productions
// different literal AST fields (`kind`), so the inverse check passes and
// the forward dispatch check is what trips.
test('checkDispatch — two productions with identical fingerprint throws', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      ex('foo')
        .as('X')
        .span('a', 'foo').ident()
        .render('ast', { kind: 'a', a: $.a })
        .render('source', tpl`${$.a}`)
        .build(),
      ex('bar')
        .as('X')
        .span('a', 'bar').ident()
        .render('ast', { kind: 'b', a: $.a })
        .render('source', tpl`${$.a}`)
        .build(),
    ],
  });
  // Both productions: first span is `ident()` (CSS-default), no oneOf,
  // identical structural shape. They overlap on every byte in the ident
  // start set (a-z A-Z _ etc.) — no static discrimination exists.
  let threw: unknown;
  try {
    inferSchema(schema);
  } catch (e) {
    threw = e;
  }
  assert.ok(threw, 'expected CompilerError, got success');
  assert.ok(threw instanceof CompilerError, `expected CompilerError, got ${(threw as Error)?.name}`);
  assert.match((threw as Error).message, /dispatch ambiguity|identical static fingerprint/);
});

// Two productions whose first-span LITERALS differ — speculation correctly
// resolves: each production's literal-match either succeeds or fails
// atomically, so at most one accepts any given input. The schema needs
// unknownChars: 'tolerate' OR a fallthrough to satisfy total dispatch;
// the productions cover all bytes used in their literals, but we don't
// want to test totality here — that's a separate concern.
test('checkDispatch — two productions with distinct literal first spans pass', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    unknownChars: 'fail',
    examples: [
      ex('foo')
        .as('X')
        .span('foo')
        .render('ast', { kind: 'a' })
        .render('source', tpl`foo`)
        .build(),
      ex('fer')
        .as('X')
        .span('fer')
        .render('ast', { kind: 'b' })
        .render('source', tpl`fer`)
        .build(),
    ],
  });
  // Same first byte 'f', but the literal differs ('foo' vs 'fer'). The
  // literal-match step on each production's first span succeeds for at
  // most one — divergence at the second byte of the literal.
  void $;
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// Longer-literal-prefix dispatch: `##` literal beats `#` literal at the
// same first byte. The dispatcher's longest-literal-prefix sort tries
// `##` first; on `##`-led input it succeeds; on `#`-led input it fails
// and `#` picks up.
test('checkDispatch — longest-match punctuator separation passes', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    punctuators: { hash2: '##', hash1: '#' },
    examples: [
      ex('## heading')
        .as('X')
        .span('##')
        .span('a', 'heading').until('\n')
        .render('ast', { depth: 2, a: $.a })
        .render('source', tpl`## ${$.a}`)
        .build(),
      ex('# heading')
        .as('X')
        .span('#')
        .span('a', 'heading').until('\n')
        .render('ast', { depth: 1, a: $.a })
        .render('source', tpl`# ${$.a}`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// Two productions with the same first literal but divergent subsequent
// shape (one literal "b" at position 1, the other literal "c"). The
// dispatcher's speculation correctly picks the one whose position-1
// literal matches the input.
test('checkDispatch — same first literal with downstream divergence passes', async () => {
  const { defineSchema, ex, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      ex('ab').as('X')
        .span('a')
        .span('b')
        .render('ast', { kind: 'ab' })
        .render('source', tpl`ab`)
        .build(),
      ex('ac').as('X')
        .span('a')
        .span('c')
        .render('ast', { kind: 'ac' })
        .render('source', tpl`ac`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// Specificity asymmetry — one production has .oneOf restricting its tag
// to a fixed set; the other accepts any ident. The dispatcher's
// restricted-first priority guarantees the .oneOf production tries
// first; if its oneOf rejects, the catch-all picks up. Mirrors the
// HtmlElement script/style/textarea/title raw-text dispatch.
test('checkDispatch — restricted (.oneOf) vs unrestricted productions pass', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      ex('<script>')
        .as('X')
        .span('<')
        .span('tag', 'script').ident().html().oneOf(['script', 'style'])
        .span('>')
        .render('ast', { kind: 'raw', tag: $.tag })
        .render('source', tpl`<${$.tag}>`)
        .build(),
      ex('<div>')
        .as('X')
        .span('<')
        .span('tag', 'div').ident().html()
        .span('>')
        .render('ast', { kind: 'el', tag: $.tag })
        .render('source', tpl`<${$.tag}>`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// Fallthrough production never conflicts with a byte-led one. The
// dispatcher reserves fallthroughs for the catch-all path.
test('checkDispatch — fallthrough vs byte-led pass', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      ex('@foo;')
        .as('X')
        .span('@')
        .span('name', 'foo').ident()
        .span(';')
        .render('ast', { kind: 'at', name: $.name })
        .render('source', tpl`@${$.name};`)
        .build(),
      ex('some text')
        .as('X')
        .span('text', 'some text').until('\n', { balanced: false })
        .render('ast', { kind: 'text', text: $.text })
        .render('source', tpl`${$.text}`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// Total-dispatch (Task 3.2): when the schema sets unknownChars: 'tolerate'
// but the root has no fallthrough production and its byte-led signatures
// don't cover all bytes, the tolerance policy is structurally impossible.
test('checkDispatch — tolerate policy without fallthrough at root throws', async () => {
  const { defineSchema, ex, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    unknownChars: 'tolerate',
    examples: [
      ex('foo')
        .as('X')
        .span('foo')
        .render('ast', { kind: 'a' })
        .render('source', tpl`foo`)
        .build(),
      ex('bar')
        .as('X')
        .span('bar')
        .render('ast', { kind: 'b' })
        .render('source', tpl`bar`)
        .build(),
    ],
  });
  let threw: unknown;
  try {
    inferSchema(schema);
  } catch (e) {
    threw = e;
  }
  assert.ok(threw, 'expected CompilerError, got success');
  assert.ok(threw instanceof CompilerError, `expected CompilerError, got ${(threw as Error)?.name}`);
  assert.match((threw as Error).message, /dispatch totality|tolerate/);
});

// Specificity asymmetry where one production has more literal commitments
// than the other — mirrors the markdown table-delimiter vs table-row case.
test('checkDispatch — more-specific production wins via span-count tiebreaker', async () => {
  const { defineSchema, ex, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      ex('| --- |')
        .as('X')
        .span('|')
        .span('---')
        .span('|')
        .render('ast', { kind: 'delim' })
        .render('source', tpl`| --- |`)
        .build(),
      ex('| cell |')
        .as('X')
        .span('|')
        .span('text', 'cell').until('|', { balanced: false })
        .span('|')
        .render('ast', { kind: 'row', text: $.text })
        .render('source', tpl`| ${$.text} |`)
        .build(),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});
