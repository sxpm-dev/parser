// Forward-only (parse → ast) bench for TOML key = value pairs.
//
// Competitors:
//   - @iarna/toml: the long-standing standard, broad TOML 1.0 coverage.
//   - smol-toml:   newer, smaller bundle, also TOML 1.0 spec-complete.
//
// parser2 here implements a useful subset (bare-key pairs + tables +
// string / integer / boolean values) so this is "tightly-scoped subset
// vs full grammar". The shape of the comparison is the same as for the
// other parsers: each "row" is a single mini-document.

import toml from '@iarna/toml';
import { parse as smolParse } from 'smol-toml';
import { render } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, runBenchTable } from './common.ts';

const contestants: Contestant[] = [
  {
    label: 'parser2 toml parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { render(row, { target: 'ast' }); }),
  },
  {
    label: '@iarna/toml parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { toml.parse(row); }),
  },
  {
    label: 'smol-toml parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { smolParse(row); }),
  },
];

await runBenchTable('toml parse — parser2 vs @iarna/toml + smol-toml', contestants);
