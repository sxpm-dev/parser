import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('yaml-block',process.argv.includes('--check'));
