// Bench harness for @parser2/toml. Same shape as iso-duration / rrule /
// pg-select: each "row" is a single key = value pair parsed as a
// stand-alone mini-TOML document. The synthetic generator concatenates
// the corpus to hit target byte sizes.

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

export const REAL_WORLD_FIXTURE = readFileSync(
  join(here, 'fixture', 'real-world.txt'),
  'utf8',
);

export function generateInput(targetBytes: number): string {
  const lines = REAL_WORLD_FIXTURE.trim().split(/\n+/);
  const chunks: string[] = [];
  let bytes = 0;
  let i = 0;
  while (bytes < targetBytes) {
    const row = lines[i % lines.length]!;
    chunks.push(row);
    bytes += row.length + 1;
    i++;
  }
  return chunks.join('\n') + '\n';
}

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
    parserColumnWidth: 30,
  });
}
