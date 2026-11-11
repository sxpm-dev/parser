import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('filter',process.argv.includes('--check'));
