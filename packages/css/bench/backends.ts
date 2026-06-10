// Cross-backend bench — TS vs bcode vs Rust(wasm). Mirrors bench/ast.ts
// but with only the three @parser2/css backends as contestants (no
// css-tree / postcss / cssom / rework). The synthetic input scaling
// goes through bench/common.ts:generateCss so the byte-size column
// stays comparable across the bench / bench:backends commands; the
// "huge-page" named input is the same real-world fixture both runs use.

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
    return await loadRustWasm('css', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

function countAst(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const node = value as { readonly nodes?: readonly unknown[] };
  let count = 1;
  if (node.nodes) for (const child of node.nodes) count += countAst(child);
  return count;
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 css parse (ts)',
    unit: 'nodes',
    fn: (input: string): BenchResult => ({
      units: countAst(renderTs(input, { target: 'ast', mode: 'fast' })),
    }),
  },
  {
    label: 'parser2 css parse (bcode)',
    unit: 'nodes',
    fn: (input: string): BenchResult => ({
      units: countAst(renderBcode(input, { target: 'ast', mode: 'fast' })),
    }),
  },
  rustWasm === null ? null : {
    label: 'parser2 css parse (rust-wasm)',
    unit: 'parses',
    fn: (input: string): BenchResult => {
      rustWasm.render(input);
      return { units: 1 };
    },
  },
];

await runBenchTable(
  'css backends — ts | bcode | rust(wasm)',
  filterContestants(contestants, only) as Contestant[],
);
