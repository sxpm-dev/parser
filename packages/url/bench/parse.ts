import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('url',process.argv.includes('--check'));
