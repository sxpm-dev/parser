import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('mac',process.argv.includes('--check'));
