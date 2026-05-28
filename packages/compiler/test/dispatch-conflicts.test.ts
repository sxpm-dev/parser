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
  const { defineSchema, relation, parse, span, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'foo',
        encodings: {
          src: parse([span('a', 'foo').ident()]),
          ast: { kind: 'a', a: $.a },
          source: tpl`${$.a}`,
        },
      }),
      relation('X', {
        input: 'bar',
        encodings: {
          src: parse([span('a', 'bar').ident()]),
          ast: { kind: 'b', a: $.a },
          source: tpl`${$.a}`,
        },
      }),
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
  const { defineSchema, relation, parse, literal, $ } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    unknownChars: 'fail',
    examples: [
      relation('X', {
        input: 'foo',
        encodings: {
          src: parse([literal('foo')]),
          ast: { kind: 'a' },
          source: 'foo',
        },
      }),
      relation('X', {
        input: 'fer',
        encodings: {
          src: parse([literal('fer')]),
          ast: { kind: 'b' },
          source: 'fer',
        },
      }),
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
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    punctuators: { hash2: '##', hash1: '#' },
    examples: [
      relation('X', {
        input: '## heading',
        encodings: {
          src: parse([
            literal('##'),
            span('a', 'heading').until('\n'),
          ]),
          ast: { depth: 2, a: $.a },
          source: tpl`## ${$.a}`,
        },
      }),
      relation('X', {
        input: '# heading',
        encodings: {
          src: parse([
            literal('#'),
            span('a', 'heading').until('\n'),
          ]),
          ast: { depth: 1, a: $.a },
          source: tpl`# ${$.a}`,
        },
      }),
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
  const { defineSchema, relation, parse, literal, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'ab',
        encodings: {
          src: parse([literal('a'), literal('b')]),
          ast: { kind: 'ab' },
          source: 'ab',
        },
      }),
      relation('X', {
        input: 'ac',
        encodings: {
          src: parse([literal('a'), literal('c')]),
          ast: { kind: 'ac' },
          source: 'ac',
        },
      }),
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
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: '<script>',
        encodings: {
          src: parse([
            literal('<'),
            span('tag', 'script').ident().html().oneOf(['script', 'style']),
            literal('>'),
          ]),
          ast: { kind: 'raw', tag: $.tag },
          source: tpl`<${$.tag}>`,
        },
      }),
      relation('X', {
        input: '<div>',
        encodings: {
          src: parse([
            literal('<'),
            span('tag', 'div').ident().html(),
            literal('>'),
          ]),
          ast: { kind: 'el', tag: $.tag },
          source: tpl`<${$.tag}>`,
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// Fallthrough production never conflicts with a byte-led one. The
// dispatcher reserves fallthroughs for the catch-all path.
test('checkDispatch — fallthrough vs byte-led pass', async () => {
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: '@foo;',
        encodings: {
          src: parse([
            literal('@'),
            span('name', 'foo').ident(),
            literal(';'),
          ]),
          ast: { kind: 'at', name: $.name },
          source: tpl`@${$.name};`,
        },
      }),
      relation('X', {
        input: 'some text',
        encodings: {
          src: parse([span('text', 'some text').until('\n', { balanced: false })]),
          ast: { kind: 'text', text: $.text },
          source: tpl`${$.text}`,
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});

// Total-dispatch (Task 3.2): when the schema sets unknownChars: 'tolerate'
// but the root has no fallthrough production and its byte-led signatures
// don't cover all bytes, the tolerance policy is structurally impossible.
test('checkDispatch — tolerate policy without fallthrough at root throws', async () => {
  const { defineSchema, relation, parse, literal, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    unknownChars: 'tolerate',
    examples: [
      relation('X', {
        input: 'foo',
        encodings: {
          src: parse([literal('foo')]),
          ast: { kind: 'a' },
          source: 'foo',
        },
      }),
      relation('X', {
        input: 'bar',
        encodings: {
          src: parse([literal('bar')]),
          ast: { kind: 'b' },
          source: 'bar',
        },
      }),
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
  const { defineSchema, relation, parse, span, literal, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: '| --- |',
        encodings: {
          src: parse([
            literal('|'),
            literal('---'),
            literal('|'),
          ]),
          ast: { kind: 'delim' },
          source: '| --- |',
        },
      }),
      relation('X', {
        input: '| cell |',
        encodings: {
          src: parse([
            literal('|'),
            span('text', 'cell').until('|', { balanced: false }),
            literal('|'),
          ]),
          ast: { kind: 'row', text: $.text },
          source: tpl`| ${$.text} |`,
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  assert.ok(inferred.nodeTypes.size > 0);
});
