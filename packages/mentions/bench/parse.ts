import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('mentions',process.argv.includes('--check'));
