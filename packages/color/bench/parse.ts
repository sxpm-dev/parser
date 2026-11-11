import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('color',process.argv.includes('--check'));
