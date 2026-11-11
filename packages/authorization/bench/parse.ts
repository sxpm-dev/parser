import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('authorization',process.argv.includes('--check'));
