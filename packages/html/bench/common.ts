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

export { type BenchResult, type Contestant, SIZES_KB, repeatToBytes };

export function generateHtml(targetBytes: number): string {
  return repeatToBytes(seed, targetBytes);
}

export async function runBenchTable(title: string, contestants: readonly Contestant[]): Promise<void> {
  await runSharedBenchTable({ title, contestants, generateInput: generateHtml, parserColumnWidth: 26 });
}
