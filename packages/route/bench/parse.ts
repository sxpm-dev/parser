import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('route',process.argv.includes('--check'));
