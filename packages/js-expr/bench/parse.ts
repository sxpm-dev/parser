import { render } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, repeatToBytes, runBenchTable } from '../../../scripts/bench-table.ts';

// One expression per line — exercises every declared precedence layer
// plus unary prefixes. Mirrors scripts/perf-gate.ts's js-expr seed so
// the human-readable bench shares an input shape with the gate.
const seed = [
  'a + b * c - d',
  '(x + y) / z',
  'a == b && c != d',
  '!a || b',
  'x ** y ** z',
  '~a + ~b',
  'a + b + c + d',
  '(a + b) * (c - d) / e',
  '42 + foo * bar',
  'a >= b && b <= c',
].join('\n') + '\n';

const contestants: Contestant[] = [
  {
    label: 'parser2 js-expr parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { render(row, { target: 'ast' }); }),
  },
];

await runBenchTable({
  title: 'js-expr parse',
  contestants,
  generateInput: (bytes) => repeatToBytes(seed, bytes),
});
