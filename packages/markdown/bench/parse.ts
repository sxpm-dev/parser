import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('markdown',process.argv.includes('--check'));
