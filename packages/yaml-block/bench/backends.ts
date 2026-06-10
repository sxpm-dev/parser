// Cross-backend bench — TS vs bcode. Rust is intentionally absent:
// yaml-block uses .indent(), which the rust backend doesn't yet support
// (`rust backend (Phase 6.2): span modifiers not yet supported (got
// [indent])`). Re-enable the rust contestant once the indent modifier
// lands in emit/rust/index.ts.

import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render as renderTs } from '../src/_generated/parser.ts';
import { render as renderBcode } from '../src/_generated/parser.bcode.ts';
import {
  type BenchResult,
  type Contestant,
  repeatToBytes,
  runBenchTable,
} from '../../../scripts/bench-table.ts';
import {
  filterContestants,
  parseOnlyArg,
} from '../../../scripts/backends-bench-helpers.ts';
import { loadFixture } from '../../../scripts/bench-fixture.ts';

const here = dirname(fileURLToPath(import.meta.url));
const packageDir = resolve(here, '..');

const seed = loadFixture({
  packageDir,
  seed: 'name: ex\nvalues:\n  - 1\n  - 2\n  - 3\n',
});

const only = parseOnlyArg();

function parseOne(input: string, fn: (s: string) => void): BenchResult {
  fn(input);
  return { units: 1 };
}

const contestants: ReadonlyArray<Contestant | null> = [
  {
    label: 'parser2 yaml-block parse (ts)',
    unit: 'docs',
    fn: (input: string): BenchResult =>
      parseOne(input, (s) => { renderTs(s, { target: 'ast' }); }),
  },
  {
    label: 'parser2 yaml-block parse (bcode)',
    unit: 'docs',
    fn: (input: string): BenchResult =>
      parseOne(input, (s) => { renderBcode(s, { target: 'ast' }); }),
  },
];

await runBenchTable({
  title: 'yaml-block backends — ts | bcode [rust pending]',
  contestants: filterContestants(contestants, only),
  generateInput: (bytes) => repeatToBytes(seed, bytes),
});
