import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('pg-select',process.argv.includes('--check'));
