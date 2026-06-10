// Cross-backend bench — TS vs bcode vs Rust(wasm). Same harness +
// inputs as bench/parse.ts (the SEED-scaled JSON array).

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
import { render as renderBcode } from '../src/_generated/parser.bcode.ts';
import {
  type BenchResult,
  type Contestant,
  runBenchTable,
} from '../../../scripts/bench-table.ts';
import {
  filterContestants,
  loadRustWasm,
  parseOnlyArg,
} from '../../../scripts/backends-bench-helpers.ts';
import { SEED } from './common.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');
const repoRoot = resolve(packageDir, '..', '..');

const only = parseOnlyArg();

const wantsRust = only === null || only.has('rust');
const rustWasm = wantsRust ? await loadRustWasmOrNull() : null;

async function loadRustWasmOrNull(): Promise<Awaited<ReturnType<typeof loadRustWasm>> | null> {
  try {
    return await loadRustWasm('json', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

function countOne(input: string, fn: (s: string) => void): BenchResult {
  fn(input);
  return { units: 1 };
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 json render (ts)',
    unit: 'docs',
    fn: (input: string): BenchResult =>
      countOne(input, (s) => { renderTs(s, { target: 'ast' }); }),
  },
  {
    label: 'parser2 json render (bcode)',
    unit: 'docs',
    fn: (input: string): BenchResult =>
      countOne(input, (s) => { renderBcode(s, { target: 'ast' }); }),
  },
  rustWasm === null ? null : {
    label: 'parser2 json render (rust-wasm)',
    unit: 'docs',
    fn: (input: string): BenchResult =>
      countOne(input, (s) => { rustWasm.render(s); }),
  },
];

await runBenchTable({
  title: 'json backends — ts | bcode | rust(wasm)',
  contestants: filterContestants(contestants, only),
  generateInput: (bytes) => {
    const items: string[] = [];
    let total = 2;
    while (total < bytes) {
      items.push(SEED);
      total += SEED.length + 1;
    }
    return `[${items.join(',')}]`;
  },
});
