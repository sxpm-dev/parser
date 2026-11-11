import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('cookie',process.argv.includes('--check'));
