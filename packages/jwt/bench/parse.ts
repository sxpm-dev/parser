import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('jwt',process.argv.includes('--check'));
