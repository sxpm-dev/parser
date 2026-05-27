import test from 'node:test';
import { strict as assert } from 'node:assert';
import { encodeSchema } from '../src/emit/bytecode/encoder.ts';
import { inferSchema } from '../src/index.ts';

test('bytecode encoder: cron schema produces a non-empty opcode stream', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const { ops, stringPool, numberPool, productionOffsets } = encodeSchema(schema);
  assert.ok(ops instanceof Uint8Array, 'ops must be Uint8Array');
  assert.ok(ops.byteLength > 0, 'cron should produce a non-empty opcode stream');
  assert.ok(stringPool.length > 0, 'cron schema has literal strings');
  assert.ok(productionOffsets.size > 0, 'cron has productions');
  // numberPool may legitimately be empty for cron (no baked-in numeric constants).
  assert.ok(Array.isArray(numberPool), 'numberPool must be an array');
});
