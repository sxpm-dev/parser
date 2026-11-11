import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('npm-range',process.argv.includes('--check'));
