import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('arn',process.argv.includes('--check'));
