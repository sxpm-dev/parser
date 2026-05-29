import test from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inferSchema } from '../src/index.ts';
import { BYTECODE_BACKEND } from '../src/emit/bytecode/index.ts';
import { emitPreamble } from '../src/emit/v2/index.ts';
import type { InferredSchema } from '../src/model.ts';

// Helper: clone an InferredSchema with dial overrides.
function withDials(
  schema: InferredSchema,
  dials: Partial<Pick<InferredSchema, 'bom' | 'unicode' | 'newlines' | 'caseSensitive'>>,
): InferredSchema {
  return { ...schema, ...dials };
}

test('bytecode emit: __parse contains the same preamble code string as v2 emit (default dials → BOM allow block)', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const expectedPreamble = emitPreamble(schema);
  // Sanity: default cron dials produce the BOM allow block.
  assert.ok(expectedPreamble.includes('charCodeAt(0) === 0xfeff'));
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(
    source.includes(expectedPreamble),
    'bytecode wrapper must contain the v2 preamble code verbatim',
  );
});

test('bytecode emit: caseSensitive:false produces toLowerCase preamble line', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { caseSensitive: false });
  const expectedPreamble = emitPreamble(schema);
  assert.ok(expectedPreamble.includes("input = input.toLowerCase();"));
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(source.includes("input = input.toLowerCase();"));
});

test('bytecode emit: newlines:CRLF produces \\r\\n replacement preamble line', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { newlines: 'CRLF' });
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(source.includes("input = input.replace(/\\r\\n/g, '\\n');"));
});

test('bytecode emit: unicode:NFC produces normalize preamble line', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { unicode: 'NFC' });
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(source.includes('input = input.normalize("NFC");'));
});

test('bytecode emit: bom:reject produces reject-throw preamble line', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { bom: 'reject' });
  const source = BYTECODE_BACKEND.emit(schema);
  assert.ok(source.includes('schema rejects BOM'));
});

test('bytecode emit: end-to-end — caseSensitive:false bytecode parser accepts uppercase input', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { caseSensitive: false });
  const source = BYTECODE_BACKEND.emit(schema);
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(here, '.bcode-preamble-'));
  const file = join(dir, 'cron-ci.bcode.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(pathToFileURL(file).href);
    // Cron tokens are lowercase ('*'), so caseSensitive:false is a no-op on
    // tokens — but the command word 'DATE' should fold to 'date' and match
    // the command identifier rule.
    const captures = mod.__parse('* * * * * DATE');
    assert.equal((captures as { __production: string }).__production, 'Cron#0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('bytecode emit: end-to-end — bom:require bytecode parser rejects unprefixed input', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = withDials(inferSchema(raw), { bom: 'require' });
  const source = BYTECODE_BACKEND.emit(schema);
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(here, '.bcode-preamble-'));
  const file = join(dir, 'cron-bom.bcode.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(pathToFileURL(file).href);
    assert.throws(() => mod.__parse('* * * * * date'), /requires BOM/);
    // With the BOM prefix, parse succeeds.
    const captures = mod.__parse('﻿* * * * * date');
    assert.equal((captures as { __production: string }).__production, 'Cron#0');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
