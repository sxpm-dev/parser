import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('search',process.argv.includes('--check'));
