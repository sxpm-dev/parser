import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('spdx',process.argv.includes('--check'));
