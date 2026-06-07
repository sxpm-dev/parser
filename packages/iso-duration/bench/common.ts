// Bench harness for @parser2/iso-duration. Mirrors the shape of the CSS /
// HTML / cron benches: a seed corpus is repeated to hit target byte sizes,
// real-world fixtures land alongside the synthetic sizes, and the shared
// runBenchTable harness handles timing and reporting.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_SIZES_KB,
  runBenchTable as runSharedBenchTable,
  type BenchResult,
  type Contestant,
} from '../../../scripts/bench-table.ts';

export {
  DEFAULT_SIZES_KB as SIZES_KB,
  type BenchResult,
  type Contestant,
} from '../../../scripts/bench-table.ts';

const here = dirname(fileURLToPath(import.meta.url));

// Newline-delimited corpus of common ISO 8601 durations — small dial-tone
// timeouts (PT30M), recurring backups (P1D, P7D), subscription terms
// (P1Y / P1M), and a handful of full Y/M/D + H/M/S forms.
export const REAL_WORLD_FIXTURE = readFileSync(
  join(here, 'fixture', 'real-world.txt'),
  'utf8',
);

// Synthetic generator: repeats the real-world corpus until the requested
// byte target is hit. The unit of work for a "row" is one duration.
export function generateInput(targetBytes: number): string {
  const lines = REAL_WORLD_FIXTURE.trim().split(/\n+/);
  const chunks: string[] = [];
  let bytes = 0;
  let i = 0;
  while (bytes < targetBytes) {
    const row = lines[i % lines.length]!;
    chunks.push(row);
    bytes += row.length + 1; // newline accounted for
    i++;
  }
  return chunks.join('\n') + '\n';
}

// One unit of work = one parsed duration. The contestant `fn` receives
// the full corpus; we iterate rows so per-call overhead doesn't dominate.
export function countRows(input: string, fn: (row: string) => void): BenchResult {
  let units = 0;
  for (const row of input.trim().split(/\n/)) {
    fn(row);
    units++;
  }
  return { units };
}

export async function runBenchTable(
  title: string,
  contestants: readonly Contestant[],
  sizesKb: readonly number[] = DEFAULT_SIZES_KB,
): Promise<void> {
  await runSharedBenchTable({
    title,
    contestants,
    generateInput,
    namedInputs: [{ label: 'real-world', input: REAL_WORLD_FIXTURE }],
    sizesKb,
    parserColumnWidth: 32,
  });
}
