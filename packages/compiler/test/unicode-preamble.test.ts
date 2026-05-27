import test from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { emitV2Parser } from '../src/emit/v2/index.ts';
import { interpretParse } from '../src/interp/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

// Compile the schema with the v2 emitter, write the source to a temp file
// under the test directory (so @parser2/parser resolves), and dynamically
// import it. Returns both the module and the temp dir so the test can clean
// up. Used by emit-side tests to assert the GENERATED __parse applies the
// same preamble as the interpreter.
async function loadGeneratedParser(schemaDef: Parameters<typeof inferSchema>[0]) {
  const schema = inferSchema(schemaDef);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(here, '.preamble-emit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source, 'utf8');
  try {
    const mod = await import(pathToFileURL(file).href);
    return { mod, dir };
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw e;
  }
}

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

// --- Emit-side mirror tests (Task 8.5) -------------------------------------
//
// Each test parses through the v2-generated `__parse` (via `render(input,
// {type: 'ast'})`) and asserts the same AST shape the interp tests above
// assert. These exist to prove the generated parser applies the same BOM
// and Unicode dials as the reference interpreter — without this, the
// differential-fuzzing invariant Phase 2 established silently breaks on
// BOM-prefixed or non-NFC input.

test('emit preamble: BOM allow strips leading U+FEFF', async () => {
  const { mod, dir } = await loadGeneratedParser(makeLineSchema({ bom: 'allow' }));
  try {
    assert.equal(mod.render('﻿hello', { type: 'ast' }), 'hello');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit preamble: BOM reject throws if BOM is present', async () => {
  const { mod, dir } = await loadGeneratedParser(makeLineSchema({ bom: 'reject' }));
  try {
    assert.throws(() => mod.render('﻿hello', { type: 'ast' }), /BOM/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit preamble: BOM require strips BOM when present (happy path)', async () => {
  const { mod, dir } = await loadGeneratedParser(makeLineSchema({ bom: 'require' }));
  try {
    assert.equal(mod.render('﻿hello', { type: 'ast' }), 'hello');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit preamble: BOM require throws if BOM is absent', async () => {
  const { mod, dir } = await loadGeneratedParser(makeLineSchema({ bom: 'require' }));
  try {
    assert.throws(() => mod.render('hello', { type: 'ast' }), /BOM/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit preamble: BOM allow is a no-op when absent (happy path)', async () => {
  const { mod, dir } = await loadGeneratedParser(makeLineSchema({ bom: 'allow' }));
  try {
    assert.equal(mod.render('hello', { type: 'ast' }), 'hello');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit preamble: BOM reject is a no-op when BOM is absent (happy path)', async () => {
  const { mod, dir } = await loadGeneratedParser(makeLineSchema({ bom: 'reject' }));
  try {
    assert.equal(mod.render('hello', { type: 'ast' }), 'hello');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit preamble: unicode NFC normalizes NFD input', async () => {
  const nfd = 'café';   // 'cafe' + combining acute (length 5)
  const nfc = 'café';    // precomposed (length 4)
  const { mod, dir } = await loadGeneratedParser(
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
  try {
    const result = mod.render(nfd, { type: 'ast' }) as string;
    assert.equal(result, nfc);
    assert.equal(result.length, 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit preamble: unicode NFD decomposes precomposed input', async () => {
  // Inverse of the NFC test: feed NFC input, assert post-preamble is NFD.
  const nfc = 'café';   // precomposed (length 4)
  const nfd = 'café';  // 'cafe' + combining acute (length 5)
  const { mod, dir } = await loadGeneratedParser(
    defineSchema({
      rootType: 'Line',
      unicode: 'NFD',
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
  try {
    const result = mod.render(nfc, { type: 'ast' }) as string;
    assert.equal(result, nfd);
    assert.equal(result.length, 5);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit preamble: unicode none leaves NFD input as-is', async () => {
  const { mod, dir } = await loadGeneratedParser(
    defineSchema({
      rootType: 'Line',
      unicode: 'none',
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
  try {
    const nfd = 'café';  // 'cafe' + combining acute (length 5)
    const result = mod.render(nfd, { type: 'ast' }) as string;
    assert.equal(result, nfd);
    assert.equal(result.length, 5);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
