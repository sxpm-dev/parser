import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('json-flat',process.argv.includes('--check'));
