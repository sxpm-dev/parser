import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('json',process.argv.includes('--check'));
