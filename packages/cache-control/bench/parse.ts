import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('cache-control',process.argv.includes('--check'));
