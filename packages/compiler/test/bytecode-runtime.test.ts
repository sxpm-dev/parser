import test from 'node:test';
import { strict as assert } from 'node:assert';
import { encodeSchema } from '../src/emit/bytecode/encoder.ts';
import { runParse, runRender } from '../src/emit/bytecode/runtime.ts';
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

test('bytecode runtime: render cron captures to source', async () => {
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
  assert.ok(captures !== null, 'parse must return captures');
  const source = runRender(encoded, captures, 'source');
  assert.equal(source, '* * * * * date');
});

test('bytecode runtime: render cron captures to ast', async () => {
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
  assert.ok(captures !== null, 'parse must return captures');
  const ast = runRender(encoded, captures, 'ast') as {
    type: string;
    minute: { type: string };
    command: { type: string; words: ReadonlyArray<string> };
  };
  assert.equal(ast.type, 'cron');
  assert.equal(ast.minute.type, 'wildcard');
  assert.equal(ast.command.type, 'command');
  assert.deepEqual(ast.command.words, ['date']);
});
