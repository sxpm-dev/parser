// Cross-backend bench — TS vs bcode vs Rust(wasm), same harness +
// inputs as `bench/parse.ts`. The competitor list swaps the external
// iso8601 libraries for the three @parser2/iso-duration backends.
//
// Run from the package root:
//   yarn bench:backends   # ts | bcode | rust(wasm)
//   yarn bench:rs              # rust only      (--only rust)
//   yarn bench:bcode           # bcode only     (--only bcode)

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
import { render as renderBcode } from '../src/_generated/parser.bcode.ts';
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
    return await loadRustWasm('iso-duration', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 iso-duration parse (ts)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderTs(row, { target: 'ast' }); }),
  },
  {
    label: 'parser2 iso-duration parse (bcode)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderBcode(row, { target: 'ast' }); }),
  },
  rustWasm === null ? null : {
    label: 'parser2 iso-duration parse (rust-wasm)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { rustWasm.render(row); }),
  },
];

await runBenchTable(
  'iso-duration backends — ts | bcode | rust(wasm)',
  filterContestants(contestants, only),
);
