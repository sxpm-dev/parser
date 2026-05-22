import protobufjs from 'protobufjs';
import pbSchema from 'protocol-buffers-schema';
import protoParser from 'proto-parser';
import { tokenize } from '../src/index.ts';
import { type BenchResult, type Contestant, runBenchTable } from './common.ts';

const contestants: Contestant[] = [
  {
    label: 'parser2 proto tokenize',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: tokenize(input).length }),
  },
  {
    label: 'protobufjs parse',
    unit: 'types',
    fn: (input: string): BenchResult => ({ units: Object.keys(protobufjs.parse(input, { keepCase: true }).root.nested ?? {}).length }),
  },
  {
    label: 'protocol-buffers-schema',
    unit: 'messages',
    fn: (input: string): BenchResult => ({ units: pbSchema.parse(input).messages.length }),
  },
  {
    label: 'proto-parser',
    unit: 'items',
    fn: (input: string): BenchResult => ({ units: countObjectItems(protoParser.parse(input)) }),
  },
];

await runBenchTable('Proto package tokenizer - parser2 vs popular parsers', contestants);

function countObjectItems(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  let count = 1;
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (Array.isArray(child)) {
      for (const item of child) count += countObjectItems(item);
    } else {
      count += countObjectItems(child);
    }
  }
  return count;
}
