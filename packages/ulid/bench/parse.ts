import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('ulid',process.argv.includes('--check'));
