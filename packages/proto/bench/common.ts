export {
  DEFAULT_SIZES_KB as SIZES_KB,
  type BenchResult,
  type Contestant,
  fmtNs,
  hashInput,
  repeatToBytes,
} from '../../../scripts/bench-table.ts';
import { repeatToBytes, runBenchTable as runSharedBenchTable } from '../../../scripts/bench-table.ts';
import type { Contestant } from '../../../scripts/bench-table.ts';

const seed = 'message User_NNN { string name = 1; int32 age = 2; }\n';

export function generateProto(targetBytes: number): string {
  return rewriteForCompetitors(repeatToBytes(seed, targetBytes).trim());
}

export async function runBenchTable(title: string, contestants: readonly Contestant[]): Promise<void> {
  await runSharedBenchTable({ title, contestants, generateInput: generateProto, parserColumnWidth: 26, sizesKb: [5, 20, 100] });
}

function rewriteForCompetitors(input: string): string {
  let counter = 0;
  const body = input.replace(/_NNN/g, () => `_${(counter++).toString(36)}`);
  return `syntax = "proto3"; package example.v1; ${body}`;
}
