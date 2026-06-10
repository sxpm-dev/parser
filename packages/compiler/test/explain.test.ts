import assert from 'node:assert/strict';
import test from 'node:test';
import { inferSchema } from '../src/index.ts';
import { emitV2Parser } from '../src/emit/v2/index.ts';
import { beginExplain, drainExplain } from '../src/emit/v2/explain.ts';

// The report is asserted on entries (kind + detail substrings), never on
// CLI formatting. The css schema is the richest fixture: it exercises the
// merged until-divergence dispatcher, union guards on both paths, alt
// viability gating, and structured fusion.
async function cssReport() {
  const raw = (await import('../../css/src/schema.ts')).default;
  const schema = inferSchema(raw);
  beginExplain();
  emitV2Parser(schema);
  return drainExplain();
}

test('explain report covers the css codegen decisions', async () => {
  const report = await cssReport();
  const find = (kind: string, node: string, needle: string) =>
    report.some((e) => e.kind === kind && e.node === node && e.detail.includes(needle));

  assert.ok(
    find('fusion-merged', 'Declaration', 'until-divergence'),
    'Declaration should get the merged until-divergence dispatcher',
  );
  assert.ok(
    find('union-guard', 'Rule', 'until-viability'),
    'Rule probes in body unions should be guarded',
  );
  assert.ok(
    find('dispatch', 'Declaration', 'speculation chain'),
    'Declaration captures-path dispatch should be a speculation chain',
  );
  assert.ok(
    find('dispatch-gate', 'Declaration', 'multi-segment until-viability'),
    'the !important alt should be viability-gated',
  );
  assert.ok(
    report.some((e) => e.kind === 'fusion' && e.node === 'Stylesheet'),
    'Stylesheet should be structured-fused for some target',
  );
});

test('explain is a no-op when no collection is open', async () => {
  const raw = (await import('../../css/src/schema.ts')).default;
  const schema = inferSchema(raw);
  emitV2Parser(schema); // no beginExplain
  assert.deepEqual(drainExplain(), []);
});
