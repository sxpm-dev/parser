// Bidirectional bench for RRULE: parse → ast → stringify back to source.
// Competitor side uses `rrule`'s `parseString` + the RRule instance's
// `.toString()` for the same round-trip shape (canonical RFC 5545 form).

import rrulePkg from 'rrule';
const { RRule } = rrulePkg as { RRule: typeof import('rrule').RRule };
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
    label: 'rrule parse + toString',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => {
        const opts = RRule.parseString(row);
        new RRule(opts).toString();
      }),
  },
];

await runBenchTable('rrule round-trip — parser2 inverse vs rrule lib', contestants);
