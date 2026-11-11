import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('html',process.argv.includes('--check'));
