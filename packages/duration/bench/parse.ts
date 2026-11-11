import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('duration',process.argv.includes('--check'));
