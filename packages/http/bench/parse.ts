import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('http',process.argv.includes('--check'));
