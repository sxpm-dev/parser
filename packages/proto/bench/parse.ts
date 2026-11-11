import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('proto',process.argv.includes('--check'));
