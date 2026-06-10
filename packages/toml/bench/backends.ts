// Cross-backend bench — TS vs Rust(wasm). bcode is intentionally absent
// here: toml.Document uses a multi-role recursive span (`.of('Pair',
// 'Table')`) that the bytecode encoder doesn't yet support in its
// stringify path. Re-enable the bcode contestant once that gap lands.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
import { type BenchResult, type Contestant, countRows, runBenchTable } from './common.ts';
import {
  filterContestants,
  loadRustWasm,
  parseOnlyArg,
} from '../../../scripts/backends-bench-helpers.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');
const repoRoot = resolve(packageDir, '..', '..');

const only = parseOnlyArg();

const wantsRust = only === null || only.has('rust');
const rustWasm = wantsRust ? await loadRustWasmOrNull() : null;

async function loadRustWasmOrNull(): Promise<Awaited<ReturnType<typeof loadRustWasm>> | null> {
  try {
    return await loadRustWasm('toml', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 toml parse (ts)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderTs(row, { target: 'ast' }); }),
  },
  rustWasm === null ? null : {
    label: 'parser2 toml parse (rust-wasm)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { rustWasm.render(row); }),
  },
];

await runBenchTable(
  'toml backends — ts | rust(wasm)',
  filterContestants(contestants, only),
);
