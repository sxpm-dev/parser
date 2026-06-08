// Cross-backend bench — TS vs bcode vs Rust(wasm), same harness +
// inputs as `bench/parse.ts`. The competitor list swaps the external
// rrule libraries for the three @parser2/rrule backends.
//
// Run from the package root:
//   yarn bench:cross-backend   # ts | bcode | rust(wasm)
//   yarn bench:rs              # rust only      (--only rust)
//   yarn bench:bcode           # bcode only     (--only bcode)
//
// The wasm contestant builds + caches on first run; subsequent runs
// reuse the cached `.wasm` binary under `.bench-cache/wasm/rrule/`.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
import { render as renderBcode } from '../src/_generated/parser.bcode.ts';
import { type BenchResult, type Contestant, countRows, runBenchTable } from './common.ts';
import {
  filterContestants,
  loadRustWasm,
  parseOnlyArg,
} from '../../../scripts/cross-backend-bench-helpers.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');
const repoRoot = resolve(packageDir, '..', '..');

const only = parseOnlyArg();

// Load the wasm backend lazily — only when the filter would include it,
// so `bench:bcode` doesn't pay the cargo wasm build cost.
const wantsRust = only === null || only.has('rust');
const rustWasm = wantsRust ? await loadRustWasmOrNull() : null;

async function loadRustWasmOrNull(): Promise<Awaited<ReturnType<typeof loadRustWasm>> | null> {
  try {
    return await loadRustWasm('rrule', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 rrule parse (ts)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderTs(row, { target: 'ast' }); }),
  },
  {
    label: 'parser2 rrule parse (bcode)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderBcode(row, { target: 'ast' }); }),
  },
  rustWasm === null ? null : {
    label: 'parser2 rrule parse (rust-wasm)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { rustWasm.render(row); }),
  },
];

await runBenchTable(
  'rrule cross-backend — ts | bcode | rust(wasm)',
  filterContestants(contestants, only),
);
