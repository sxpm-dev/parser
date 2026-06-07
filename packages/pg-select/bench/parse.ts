// Forward-only (parse → ast) bench. Compared against `node-sql-parser`,
// the most-installed JS SQL parser. The competitor handles the full SQL
// grammar — including a Postgres dialect — so it's a maximally fair
// "real" comparison: parser2 implements a tightly-scoped subset, the
// competitor implements everything; both produce a structured AST.

import nodeSqlParserPkg from 'node-sql-parser';
const { Parser } = nodeSqlParserPkg as { Parser: typeof import('node-sql-parser').Parser };
import { render } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, runBenchTable } from './common.ts';

const sqlParser = new Parser();
const sqlOpts = { database: 'postgresql' } as const;

const contestants: Contestant[] = [
  {
    label: 'parser2 pg-select parse',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { render(row, { target: 'ast' }); }),
  },
  {
    label: 'node-sql-parser astify',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => { sqlParser.astify(row, sqlOpts); }),
  },
];

await runBenchTable('pg-select parse — parser2 vs node-sql-parser', contestants);
