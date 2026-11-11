import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('cron',process.argv.includes('--check'));
