import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('rrule',process.argv.includes('--check'));
