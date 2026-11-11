import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('expression',process.argv.includes('--check'));
