import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('sql',process.argv.includes('--check'));
