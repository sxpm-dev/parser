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
  const dir = mkdtempSync(join(here, '.case-emit-'));
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

// Schema design note: the `open` and `close` spans are literal (no `.until()`
// modifier) so that case-sensitive matching can REJECT uppercase input — a
// literal span uses `input.startsWith(text, pos)` which is exact-byte.
// `.until('>')` would happily capture `DIV` regardless of the example value,
// defeating the case-sensitive default test. The body span keeps `.until('</')`
// because the body content is arbitrary user text, not a fixed token.
function makeTagSchema(caseSensitive: boolean) {
  return defineSchema({
    rootType: 'Tag',
    caseSensitive,
    examples: [
      ex('<div>x</div>')
        .as('Tag')
        .span('<')
        .span('open', 'div')
        .span('>')
        .span('body', 'x').until('</')
        .span('</')
        .span('close', 'div')
        .span('>')
        .render('ast', { open: $.open, body: $.body, close: $.close })
        .render('source', tpl`<${$.open}>${$.body}</${$.close}>`)
        .build(),
    ],
  });
}

const caseInsensitive = inferSchema(makeTagSchema(false));
const caseSensitive = inferSchema(makeTagSchema(true));

test('case-insensitive interp: lowercase input matches as-is', () => {
  assert.deepEqual(
    interpretParse(caseInsensitive, '<div>x</div>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: uppercase input produces lowercase captures', () => {
  assert.deepEqual(
    interpretParse(caseInsensitive, '<DIV>x</DIV>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: mixed-case input produces lowercase captures', () => {
  assert.deepEqual(
    interpretParse(caseInsensitive, '<DiV>x</dIv>'),
    { open: 'div', body: 'x', close: 'div' },
  );
});

test('case-insensitive interp: body content is also lowercased', () => {
  const result = interpretParse(caseInsensitive, '<DIV>X</DIV>') as { body: string };
  assert.equal(result.body, 'x');
});

test('case-sensitive default: uppercase input fails to parse', () => {
  // Match SyntaxError specifically — `assert.throws` with no matcher would
  // accept any thrown value (including unrelated bugs).
  assert.throws(
    () => interpretParse(caseSensitive, '<DIV>x</DIV>'),
    SyntaxError,
  );
});

// --- Emit-side mirror tests (Task 8.5) -------------------------------------

test('case-insensitive emit: uppercase input produces lowercase captures', async () => {
  const { mod, dir } = await loadGeneratedParser(makeTagSchema(false));
  try {
    assert.deepEqual(
      mod.render('<DIV>x</DIV>', { type: 'ast' }),
      { open: 'div', body: 'x', close: 'div' },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('case-insensitive emit: mixed-case input produces lowercase captures', async () => {
  const { mod, dir } = await loadGeneratedParser(makeTagSchema(false));
  try {
    assert.deepEqual(
      mod.render('<DiV>x</dIv>', { type: 'ast' }),
      { open: 'div', body: 'x', close: 'div' },
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('case-sensitive default emit: uppercase input fails to parse', async () => {
  const { mod, dir } = await loadGeneratedParser(makeTagSchema(true));
  try {
    assert.throws(
      () => mod.render('<DIV>x</DIV>', { type: 'ast' }),
      SyntaxError,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
