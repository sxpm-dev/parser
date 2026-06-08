// Cross-backend bench — TS vs Rust(wasm), same harness + inputs as
// `bench/parse.ts`. Bcode is intentionally omitted: pg-select uses
// `.operator()`, which the bytecode encoder doesn't yet support (the
// bcode VM only covers cron's primitives — see emit/bytecode/encoder
// .ts:mapClassKind). Once the bcode backend gains operator support, a
// `parser.bcode.ts` import + contestant entry can be added back here.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
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

const wantsRust = only === null || only.has('rust');
const rustWasm = wantsRust ? await loadRustWasmOrNull() : null;

async function loadRustWasmOrNull(): Promise<Awaited<ReturnType<typeof loadRustWasm>> | null> {
  try {
    return await loadRustWasm('pg-select', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 pg-select parse (ts)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderTs(row, { target: 'ast' }); }),
  },
  rustWasm === null ? null : {
    label: 'parser2 pg-select parse (rust-wasm)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { rustWasm.render(row); }),
  },
];

await runBenchTable(
  'pg-select cross-backend — ts | rust(wasm)',
  filterContestants(contestants, only),
);
