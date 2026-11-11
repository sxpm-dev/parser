import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('toml',process.argv.includes('--check'));
