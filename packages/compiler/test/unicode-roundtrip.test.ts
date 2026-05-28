import test from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/index.ts';
import { emitV2Parser } from '../src/emit/v2/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

// Email-like grammar: `local@domain` terminated by newline. The schema uses
// `unicode: 'NFC'` so any NFD input (e.g. 'jose' + combining acute) gets
// normalized to its precomposed form (e.g. 'josé') before parsing —
// captures therefore observe NFC bytes only.
const emailSchema = defineSchema({
  rootType: 'Email',
  unicode: 'NFC',
  examples: [
    relation('Email', {
      input: 'user@example.com',
      encodings: {
        src: parse([
          span('local', 'user').until('@'),
          literal('@'),
          span('domain', 'example.com').until('\n'),
        ]),
        ast: { type: 'email', local: $.local, domain: $.domain },
        source: tpl`${$.local}@${$.domain}`,
      },
    }),
  ],
});

async function loadEmitted(): Promise<{ mod: any; dir: string }> {
  const schema = inferSchema(emailSchema);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(here, '.email-emit-'));
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

// Explicit escape forms (no visually-ambiguous literal diacritics):
//   NFC: precomposed 'é' = U+00E9, total length 4.
//   NFD: 'e' + combining acute U+0301, total length 5.
const NFC_LOCAL = 'jos\u00e9';
const NFD_LOCAL = 'jose\u0301';

test('unicode roundtrip interp: NFD input → NFC capture', () => {
  const schema = inferSchema(emailSchema);
  const ast = interpretParse(schema, `${NFD_LOCAL}@example.com`);
  assert.deepEqual(ast, { type: 'email', local: NFC_LOCAL, domain: 'example.com' });
});

test('unicode roundtrip interp: NFC input is identity', () => {
  const schema = inferSchema(emailSchema);
  const ast = interpretParse(schema, `${NFC_LOCAL}@example.com`);
  assert.deepEqual(ast, { type: 'email', local: NFC_LOCAL, domain: 'example.com' });
});

test('unicode roundtrip emit: NFD input through generated parser → NFC capture', async () => {
  const { mod, dir } = await loadEmitted();
  try {
    const ast = mod.render(`${NFD_LOCAL}@example.com`, { target: 'ast' });
    assert.deepEqual(ast, { type: 'email', local: NFC_LOCAL, domain: 'example.com' });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unicode roundtrip emit: stringify produces NFC source', async () => {
  const { mod, dir } = await loadEmitted();
  try {
    const ast = mod.render(`${NFD_LOCAL}@example.com`, { target: 'ast' });
    const source = mod.stringify(ast, { target: 'ast' });
    assert.equal(source, `${NFC_LOCAL}@example.com`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('unicode roundtrip emit: re-parse of stringified source is stable', async () => {
  const { mod, dir } = await loadEmitted();
  try {
    // First round-trip: NFD → NFC.
    const firstAst = mod.render(`${NFD_LOCAL}@example.com`, { target: 'ast' });
    const firstSource = mod.stringify(firstAst, { target: 'ast' });
    // Anchor: the fixed point MUST be NFC (precomposed). A consistently-NFD
    // stringifier would still satisfy the idempotence checks below — this
    // line is what distinguishes "stable" from "stable but wrong".
    assert.equal(firstSource, `${NFC_LOCAL}@example.com`);
    // Second round-trip: NFC → NFC (identity).
    const secondAst = mod.render(firstSource, { target: 'ast' });
    const secondSource = mod.stringify(secondAst, { target: 'ast' });
    assert.equal(secondSource, firstSource);
    assert.deepEqual(secondAst, firstAst);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
