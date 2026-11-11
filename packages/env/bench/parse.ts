import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('env',process.argv.includes('--check'));
