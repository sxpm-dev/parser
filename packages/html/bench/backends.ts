// Cross-backend bench — TS vs bcode vs Rust(wasm). Same harness +
// inputs as bench/parse.ts (synthetic scaling via common.ts +
// huge-page named input).

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
import { render as renderBcode } from '../src/_generated/parser.bcode.ts';
import { type BenchResult, type Contestant } from '../../../scripts/bench-table.ts';
import {
  filterContestants,
  loadRustWasm,
  parseOnlyArg,
} from '../../../scripts/backends-bench-helpers.ts';
import { runBenchTable } from './common.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');
const repoRoot = resolve(packageDir, '..', '..');

const only = parseOnlyArg();

const wantsRust = only === null || only.has('rust');
const rustWasm = wantsRust ? await loadRustWasmOrNull() : null;

async function loadRustWasmOrNull(): Promise<Awaited<ReturnType<typeof loadRustWasm>> | null> {
  try {
    return await loadRustWasm('html', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

function countNodes(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const node = value as { readonly childNodes?: readonly unknown[] };
  let count = 1;
  if (node.childNodes) for (const child of node.childNodes) count += countNodes(child);
  return count;
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 html parse (ts)',
    unit: 'nodes',
    fn: (input: string): BenchResult => ({
      units: countNodes(renderTs(input, { target: 'ast', mode: 'fast' })),
    }),
  },
  {
    label: 'parser2 html parse (bcode)',
    unit: 'nodes',
    fn: (input: string): BenchResult => ({
      units: countNodes(renderBcode(input, { target: 'ast', mode: 'fast' })),
    }),
  },
  rustWasm === null ? null : {
    label: 'parser2 html parse (rust-wasm)',
    unit: 'parses',
    fn: (input: string): BenchResult => {
      rustWasm.render(input);
      return { units: 1 };
    },
  },
];

await runBenchTable(
  'html backends — ts | bcode | rust(wasm)',
  filterContestants(contestants, only) as Contestant[],
);
