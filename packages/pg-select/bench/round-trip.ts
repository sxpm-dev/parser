// Bidirectional bench: parse → ast → stringify back to SQL. Compared
// against node-sql-parser's `astify` + `sqlify` pair, which is the
// closest equivalent in any JS SQL parser today.

import nodeSqlParserPkg from 'node-sql-parser';
const { Parser } = nodeSqlParserPkg as { Parser: typeof import('node-sql-parser').Parser };
import { render, stringify } from '../src/index.ts';
import { type BenchResult, type Contestant, countRows, runBenchTable } from './common.ts';

const sqlParser = new Parser();
const sqlOpts = { database: 'postgresql' } as const;

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
    label: 'node-sql-parser astify + sqlify',
    unit: 'rows',
    fn: (input: string): BenchResult =>
      countRows(input, (row) => {
        const ast = sqlParser.astify(row, sqlOpts);
        sqlParser.sqlify(ast, sqlOpts);
      }),
  },
];

await runBenchTable('pg-select round-trip — parser2 inverse vs node-sql-parser', contestants);
