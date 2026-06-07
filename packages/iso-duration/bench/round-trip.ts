// Bidirectional bench: ast → source via stringify(), compared against
// what callers would normally write to round-trip an ISO 8601 duration
// using competitor libraries — which have NO inverse, so the comparison
// stages each competitor's parse step alongside a hand-built rebuild
// (template string concatenation from the parsed object). The point is
// to measure the cost of the engine's automatic inverse against the
// "manually maintained printer" cost any caller would otherwise pay.

import { parse as iso8601Parse } from 'iso8601-duration';
import { parse as tinyParse } from 'tinyduration';
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
    label: 'iso8601-duration parse + manual print',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => {
        const v = iso8601Parse(row);
        printIso(v);
      }),
  },
  {
    label: 'tinyduration parse + manual print',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => {
        const v = tinyParse(row);
        printTiny(v);
      }),
  },
];

await runBenchTable('iso-duration round-trip — parser2 inverse vs manual printers', contestants);

// Hand-written canonical serializers stand in for the printer that
// competitor users would have to maintain themselves.
type Iso8601Parts = {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
};

function printIso(parts: Iso8601Parts): string {
  let out = 'P';
  if (parts.years) out += `${parts.years}Y`;
  if (parts.months) out += `${parts.months}M`;
  if (parts.weeks) out += `${parts.weeks}W`;
  if (parts.days) out += `${parts.days}D`;
  if (parts.hours || parts.minutes || parts.seconds) {
    out += 'T';
    if (parts.hours) out += `${parts.hours}H`;
    if (parts.minutes) out += `${parts.minutes}M`;
    if (parts.seconds) out += `${parts.seconds}S`;
  }
  return out;
}

function printTiny(parts: {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  negative?: boolean;
}): string {
  return (parts.negative ? '-' : '') + printIso(parts);
}
