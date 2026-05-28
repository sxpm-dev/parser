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

async function loadGeneratedParser(schemaDef: Parameters<typeof inferSchema>[0]) {
  const schema = inferSchema(schemaDef);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(here, '.newlines-emit-'));
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

// A `rawUntil([])` span captures the post-preamble input verbatim — no
// whitespace skipping, no stop trimming. The asserted value is exactly the
// bytes the interpreter sees after `applyPreamble` runs. This is the
// cleanest way to verify each `newlines` dial's transformation because the
// captured string equals the post-preamble input.
function rawSchema(opts: { newlines: 'LF' | 'CRLF' | 'either-preserve' }) {
  return defineSchema({
    rootType: 'Doc',
    newlines: opts.newlines,
    examples: [
      ex('a\nb')
        .as('Doc')
        .span('all', 'a\nb').rawUntil([])
        .render('ast', $.all)
        .render('source', tpl`${$.all}`)
        .build(),
    ],
  });
}

test('newlines: LF leaves input as-is (happy path with LF input)', () => {
  const schema = inferSchema(rawSchema({ newlines: 'LF' }));
  assert.equal(interpretParse(schema, 'a\nb'), 'a\nb');
});

test('newlines: LF leaves CR and CRLF untouched (lossless mode)', () => {
  const schema = inferSchema(rawSchema({ newlines: 'LF' }));
  // LF mode does no transform — lone `\r` and `\r\n` survive into the
  // captured slice exactly as supplied.
  assert.equal(interpretParse(schema, 'a\rb'), 'a\rb');
  assert.equal(interpretParse(schema, 'a\r\nb'), 'a\r\nb');
});

test('newlines: CRLF rewrites \\r\\n to \\n', () => {
  const schema = inferSchema(rawSchema({ newlines: 'CRLF' }));
  assert.equal(interpretParse(schema, 'a\r\nb'), 'a\nb');
});

test('newlines: CRLF leaves lone \\r untouched (strict CRLF only)', () => {
  const schema = inferSchema(rawSchema({ newlines: 'CRLF' }));
  // Lone `\r` is NOT a CRLF sequence — strict CRLF mode does not touch it.
  assert.equal(interpretParse(schema, 'a\rb'), 'a\rb');
});

test('newlines: either-preserve rewrites both \\r\\n and lone \\r to \\n', () => {
  const schema = inferSchema(rawSchema({ newlines: 'either-preserve' }));
  assert.equal(interpretParse(schema, 'a\r\nb'), 'a\nb');
  assert.equal(interpretParse(schema, 'a\rb'), 'a\nb');
  // Plain LF passes through unchanged.
  assert.equal(interpretParse(schema, 'a\nb'), 'a\nb');
});

// --- Emit-side mirror tests (Task 8.5) -------------------------------------

test('emit newlines: LF leaves CR and CRLF untouched (lossless)', async () => {
  const { mod, dir } = await loadGeneratedParser(rawSchema({ newlines: 'LF' }));
  try {
    assert.equal(mod.render('a\nb', { target: 'ast' }), 'a\nb');
    assert.equal(mod.render('a\rb', { target: 'ast' }), 'a\rb');
    assert.equal(mod.render('a\r\nb', { target: 'ast' }), 'a\r\nb');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit newlines: CRLF rewrites \\r\\n to \\n', async () => {
  const { mod, dir } = await loadGeneratedParser(rawSchema({ newlines: 'CRLF' }));
  try {
    assert.equal(mod.render('a\r\nb', { target: 'ast' }), 'a\nb');
    // Lone \r is NOT a CRLF sequence — strict CRLF mode leaves it alone.
    assert.equal(mod.render('a\rb', { target: 'ast' }), 'a\rb');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit newlines: either-preserve rewrites both \\r\\n and lone \\r to \\n', async () => {
  const { mod, dir } = await loadGeneratedParser(rawSchema({ newlines: 'either-preserve' }));
  try {
    assert.equal(mod.render('a\r\nb', { target: 'ast' }), 'a\nb');
    assert.equal(mod.render('a\rb', { target: 'ast' }), 'a\nb');
    assert.equal(mod.render('a\nb', { target: 'ast' }), 'a\nb');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
