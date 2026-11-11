import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('ini',process.argv.includes('--check'));
