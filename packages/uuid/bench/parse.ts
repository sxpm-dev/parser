import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('uuid',process.argv.includes('--check'));
