import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('commits',process.argv.includes('--check'));
