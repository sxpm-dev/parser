import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('csv',process.argv.includes('--check'));
