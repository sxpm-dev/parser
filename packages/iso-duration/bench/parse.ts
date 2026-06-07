// Forward-only (parse → ast) bench. Compares @parser2/iso-duration against
// the two most-used JS ISO 8601 duration libraries:
//
//   - iso8601-duration: pure-JS, ~3.5 KB, dominant on npm.
//   - tinyduration:     similar API, smaller bundle.
//
// All three produce a structured value from the source string. We measure
// rows-per-second so the units column reflects work done, not bytes.

import { parse as iso8601Parse } from 'iso8601-duration';
import { parse as tinyParse } from 'tinyduration';
import { render } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, runBenchTable } from './common.ts';

const contestants: Contestant[] = [
  {
    label: 'parser2 iso-duration parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { render(row, { target: 'ast' }); }),
  },
  {
    label: 'iso8601-duration parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { iso8601Parse(row); }),
  },
  {
    label: 'tinyduration parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { tinyParse(row); }),
  },
];

await runBenchTable('iso-duration parse — parser2 vs competitors', contestants);
