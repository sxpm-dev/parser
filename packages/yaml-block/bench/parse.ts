import { render } from '../src/index.ts';
import { type BenchResult, type Contestant, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

// A flat yaml-block document — each repeated unit is a top-level key
// with a scalar value. Mirrors scripts/perf-gate.ts's yaml-block seed
// so the human-readable bench and the gate measure the same shape.
const block = [
  'name: my-project',
  'version: 1.0.0',
  'author: alice',
  'license: MIT',
  'description: parser2 yaml-block benchmark',
  'language: typescript',
  'target: esnext',
  'strict: true',
  'declaration: true',
  'composite: true',
].join('\n') + '\n';

const contestants: Contestant[] = [
  {
    label: 'parser2 yaml-block parse',
    unit: 'docs',
    fn: (input: string): BenchResult => {
      render(input, { target: 'ast' });
      return { units: 1 };
    },
  },
];

await runBenchTable({
  title: 'yaml-block parse',
  contestants,
  generateInput: (bytes) => repeatToBytes(block, bytes),
});
