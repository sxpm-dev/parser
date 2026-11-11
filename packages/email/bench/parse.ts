import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('email',process.argv.includes('--check'));
