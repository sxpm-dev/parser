// Cross-backend bench — TS vs Rust(wasm). bcode is intentionally absent:
// js-expr uses Pratt-driven binary productions (operatorPrecedence +
// .operator()), which the bytecode encoder doesn't yet support in its
// stringify path (`bytecode encoder: stringify needs render body for
// 'Expr#0:source'`). Re-enable the bcode contestant once that gap lands.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
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
} from '../../../scripts/backends-bench-helpers.ts';
import { loadFixture } from '../../../scripts/bench-fixture.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');
const repoRoot = resolve(packageDir, '..', '..');

const seed = loadFixture({
  packageDir,
  seed: [
    'a + b * c - d',
    '(x + y) / z',
    'a == b && c != d',
    '!a || b',
    'x ** y ** z',
    '~a + ~b',
  ].join('\n') + '\n',
});

const only = parseOnlyArg();

const wantsRust = only === null || only.has('rust');
const rustWasm = wantsRust ? await loadRustWasmOrNull() : null;

async function loadRustWasmOrNull(): Promise<Awaited<ReturnType<typeof loadRustWasm>> | null> {
  try {
    return await loadRustWasm('js-expr', packageDir, repoRoot);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    return null;
  }
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 js-expr parse (ts)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { renderTs(row, { target: 'ast' }); }),
  },
  rustWasm === null ? null : {
    label: 'parser2 js-expr parse (rust-wasm)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { rustWasm.render(row); }),
  },
];

await runBenchTable({
  title: 'js-expr backends — ts | rust(wasm) [bcode pending]',
  contestants: filterContestants(contestants, only),
  generateInput: (bytes) => repeatToBytes(seed, bytes),
});
