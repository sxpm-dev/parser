// Forward-only (parse → ast) bench for RRULE values. Compared against
// the canonical `rrule` npm package's `rrulestr` parser — which is what
// every calendar tooling in the JS ecosystem reaches for. `rrulestr`
// returns an RRule instance (parses the rule AND prepares for iteration);
// for a fairer parse-only comparison we also run `RRule.parseString`
// when it's available — it does the parsing without instantiating the
// iteration machinery.

import rrulePkg from 'rrule';
const { RRule, rrulestr } = rrulePkg as { RRule: typeof import('rrule').RRule; rrulestr: typeof import('rrule').rrulestr };
import { render } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, runBenchTable } from './common.ts';

const contestants: Contestant[] = [
  {
    label: 'parser2 rrule parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { render(row, { target: 'ast' }); }),
  },
  {
    label: 'rrule.parseString',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { RRule.parseString(row); }),
  },
  {
    label: 'rrulestr (full parse)',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => {
        // rrulestr expects an iCalendar property line ("RRULE:..."). Wrap
        // bare rule bodies so the comparison stays parse-shaped.
        rrulestr(`RRULE:${row}`);
      }),
  },
];

await runBenchTable('rrule parse — parser2 vs canonical rrule lib', contestants);
