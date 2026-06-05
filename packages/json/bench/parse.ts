import { render } from '../src/index.ts';
import { type BenchResult, type Contestant, runBenchTable } from '../../../scripts/bench-table.ts';
import { SEED } from './common.ts';

function countOne(input: string, fn: (s: string) => void): BenchResult {
  fn(input);
  return { units: 1 };
}

const contestants: Contestant[] = [
  {
    label: 'parser2 json render',
    unit: 'docs',
    fn: (input: string): BenchResult => countOne(input, (s) => { render(s, { target: 'ast' }); }),
  },
  {
    label: 'JSON.parse',
    unit: 'docs',
    fn: (input: string): BenchResult => countOne(input, (s) => { JSON.parse(s); }),
  },
];

// Wrap repeated SEED copies in `[ … ]` so the scaled input is itself a
// single valid JSON document (an array of N seed objects). Both
// contestants then succeed symmetrically; JSON.parse doesn't throw on
// the scaled bench input.
await runBenchTable({
  title: 'JSON package render - parser2 vs JSON.parse',
  contestants,
  generateInput: (bytes) => {
    const items: string[] = [];
    let total = 2; // '[' + ']'
    while (total < bytes) {
      items.push(SEED);
      total += SEED.length + 1; // include separator comma
    }
    return `[${items.join(',')}]`;
  },
});
