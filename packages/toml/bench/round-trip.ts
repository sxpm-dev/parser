// Bidirectional bench: parse → ast → stringify back to TOML.
//
// @iarna/toml ships a `stringify(value)` that goes the other direction;
// smol-toml ships one too. Both produce canonical TOML output, so the
// round-trip cost is directly comparable to parser2's render+stringify.

import toml from '@iarna/toml';
import { parse as smolParse, stringify as smolStringify } from 'smol-toml';
import { render, stringify } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, runBenchTable } from './common.ts';

const contestants: Contestant[] = [
  {
    label: 'parser2 render source (forward)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { render(row, { target: 'source' }); }),
  },
  {
    label: 'parser2 stringify (reverse)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => {
        const value = render(row, { target: 'ast' });
        stringify(value, { target: 'ast' });
      }),
  },
  {
    label: '@iarna/toml parse + stringify',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => {
        const v = toml.parse(row);
        toml.stringify(v);
      }),
  },
  {
    label: 'smol-toml parse + stringify',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => {
        const v = smolParse(row);
        smolStringify(v as Record<string, unknown>);
      }),
  },
];

await runBenchTable('toml round-trip — parser2 inverse vs @iarna/toml + smol-toml', contestants);
