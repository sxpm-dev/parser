import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('yaml',process.argv.includes('--check'));
