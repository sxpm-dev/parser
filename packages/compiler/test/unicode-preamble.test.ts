import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/index.ts';

// Schema that captures "everything until newline" as a single value. Useful
// for asserting on the raw post-preamble shape of the input.
function makeLineSchema(opts: { bom?: 'allow' | 'reject' | 'require'; unicode?: 'NFC' | 'NFD' | 'none' }) {
  return defineSchema({
    rootType: 'Line',
    bom: opts.bom,
    unicode: opts.unicode,
    examples: [
      ex('hello')
        .as('Line')
        .span('text', 'hello').until('\n')
        .render('ast', $.text)
        .render('source', tpl`${$.text}`)
        .build(),
    ],
  });
}

test('interp preamble: BOM allow strips leading U+FEFF', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'allow' }));
  assert.equal(interpretParse(schema, '﻿hello'), 'hello');
});

test('interp preamble: BOM allow is a no-op when absent', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'allow' }));
  assert.equal(interpretParse(schema, 'hello'), 'hello');
});

test('interp preamble: BOM reject throws if BOM is present', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'reject' }));
  assert.throws(() => interpretParse(schema, '﻿hello'), /BOM/);
});

test('interp preamble: BOM require throws if BOM is absent', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'require' }));
  assert.throws(() => interpretParse(schema, 'hello'), /BOM/);
});

test('interp preamble: BOM require strips BOM when present (happy path)', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'require' }));
  assert.equal(interpretParse(schema, '﻿hello'), 'hello');
});

test('interp preamble: BOM reject is a no-op when BOM is absent (happy path)', () => {
  const schema = inferSchema(makeLineSchema({ bom: 'reject' }));
  assert.equal(interpretParse(schema, 'hello'), 'hello');
});

test('interp preamble: unicode NFC normalizes NFD input', () => {
  // 'é' as NFD = 'e' + combining acute (U+0301). After normalize('NFC') the
  // input becomes the NFC form 'é' (U+00E9). The captured value is whatever
  // the (post-preamble) input contained until newline.
  const nfd = 'café';   // 'cafe' + combining acute (length 5)
  const nfc = 'café';    // 'café' precomposed (length 4)
  const schemaWithDiacritic = inferSchema(
    defineSchema({
      rootType: 'Line',
      unicode: 'NFC',
      examples: [
        ex('café')
          .as('Line')
          .span('text', 'café').until('\n')
          .render('ast', $.text)
          .render('source', tpl`${$.text}`)
          .build(),
      ],
    }),
  );
  const result = interpretParse(schemaWithDiacritic, nfd) as string;
  // Preamble normalized NFD input to NFC before parsing → captured value is
  // NFC (length 4), not the original NFD (length 5).
  assert.equal(result, nfc);
  assert.equal(result.length, 4);
});

test('interp preamble: unicode NFD decomposes precomposed input', () => {
  // Inverse of the NFC test: feed NFC input, assert preamble produced NFD.
  const nfc = 'café';   // 'café' precomposed (length 4)
  const nfd = 'café';  // 'cafe' + combining acute (length 5)
  const schemaNfd = inferSchema(
    defineSchema({
      rootType: 'Line',
      unicode: 'NFD',
      examples: [
        ex('café')
          .as('Line')
          .span('text', 'café').until('\n')
          .render('ast', $.text)
          .render('source', tpl`${$.text}`)
          .build(),
      ],
    }),
  );
  const result = interpretParse(schemaNfd, nfc) as string;
  // Preamble normalized NFC input to NFD before parsing → captured value is
  // NFD (length 5), not the original NFC (length 4).
  assert.equal(result, nfd);
  assert.equal(result.length, 5);
});

test('interp preamble: unicode none leaves input as-is', () => {
  const schemaWithDiacritic = inferSchema(
    defineSchema({
      rootType: 'Line',
      unicode: 'none',
      examples: [
        ex('café')
          .as('Line')
          .span('text', 'café').until('\n')
          .render('ast', $.text)
          .render('source', tpl`${$.text}`)
          .build(),
      ],
    }),
  );
  const nfc = 'café';   // precomposed (length 4)
  const nfd = 'café';  // 'cafe' + combining acute (length 5)
  // NFC input passes through untouched.
  assert.equal(interpretParse(schemaWithDiacritic, nfc), nfc);
  // NFD input is left as NFD when unicode='none' — the captured value still
  // has the decomposed combining acute (length 5 in UTF-16 code units),
  // proving the preamble did not normalize.
  const result = interpretParse(schemaWithDiacritic, nfd) as string;
  assert.equal(result, nfd);
  assert.equal(result.length, 5);
});
