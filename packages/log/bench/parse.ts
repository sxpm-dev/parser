import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('log',process.argv.includes('--check'));
