// Cross-backend bench — TS vs bcode vs Rust(wasm). Mirrors the shape
// of bench/parse.ts: same seed corpus, same `repeatToBytes` scaler, same
// runBenchTable. Only the competitor list changes — the three @parser2/
// cron backends instead of cron-parser + cronstrue.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
import { render as renderBcode } from '../src/_generated/parser.bcode.ts';
import {
  type BenchResult,
  type Contestant,
  countRows,
  repeatToBytes,
  runBenchTable,
} from '../../../scripts/bench-table.ts';
import {
  filterContestants,
  loadRustWasm,
  parseOnlyArg,
} from '../../../scripts/cross-backend-bench-helpers.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');
const repoRoot = resolve(packageDir, '..', '..');

const seed = '*/5 * * * *\n0 9 * * 1-5\n15 14 1 * *\n';

const only = parseOnlyArg();

const wantsRust = only === null || only.has('rust');
const rustWasm = wantsRust ? await loadRustWasmOrNull() : null;

async function loadRustWasmOrNull(): Promise<Awaited<ReturnType<typeof loadRustWasm>> | null> {
  try {
    return await loadRustWasm('cron', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 cron parse (ts)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderTs(row, { target: 'ast' }); }),
  },
  {
    label: 'parser2 cron parse (bcode)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderBcode(row, { target: 'ast' }); }),
  },
  rustWasm === null ? null : {
    label: 'parser2 cron parse (rust-wasm)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { rustWasm.render(row); }),
  },
];

await runBenchTable({
  title: 'cron cross-backend — ts | bcode | rust(wasm)',
  contestants: filterContestants(contestants, only),
  generateInput: (bytes) => repeatToBytes(seed, bytes),
});
