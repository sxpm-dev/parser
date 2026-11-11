import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('glob',process.argv.includes('--check'));
