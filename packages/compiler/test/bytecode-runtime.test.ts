import test from 'node:test';
import { strict as assert } from 'node:assert';
import { encodeSchema } from '../src/emit/bytecode/encoder.ts';
import { runParse } from '../src/emit/bytecode/runtime.ts';
import { inferSchema } from '../src/index.ts';

test('bytecode runtime: parse cron "* * * * * date"', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const encoded = encodeSchema(schema);
  const state = {
    input: '* * * * * date',
    ops: encoded.ops,
    stringPool: encoded.stringPool,
    numberPool: encoded.numberPool,
    off: 0,
    pc: 0,
    maxOff: 0,
    valueStack: [] as unknown[],
  };
  const rootOffset = encoded.productionOffsets.get(encoded.rootProductionKey)!;
  const captures = runParse(state, rootOffset);
  assert.ok(captures !== null, 'parse must return captures, not null');
  assert.equal((captures as { __production: string }).__production, encoded.rootProductionKey);
});
