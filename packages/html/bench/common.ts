import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import {
  DEFAULT_SIZES_KB as SIZES_KB,
  type BenchResult,
  type Contestant,
  repeatToBytes,
  runBenchTable as runSharedBenchTable,
} from '../../../scripts/bench-table.ts';

const seed = [
  '<!doctype html>',
  '<h1 class="title">Hello world</h1>',
  '<p class="copy" disabled>Parser benchmark text</p>',
  '<br />',
  '',
].join('\n');

// huge-page.html — the WHATWG HTML living standard, ~907 KB. Real-world
// HTML with tag soup, raw-text scripts/styles, implicit closes, and
// non-ASCII content. Loaded once for the named bench input.
const hugePagePath = resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../test/fixtures/huge-page.html',
);
const hugePage = readFileSync(hugePagePath, 'utf8');

export { type BenchResult, type Contestant, SIZES_KB, repeatToBytes };

export function generateHtml(targetBytes: number): string {
  return repeatToBytes(seed, targetBytes);
}

export async function runBenchTable(title: string, contestants: readonly Contestant[]): Promise<void> {
  await runSharedBenchTable({
    title,
    contestants,
    generateInput: generateHtml,
    parserColumnWidth: 26,
    namedInputs: [{ label: 'huge-page', input: hugePage }],
  });
}
