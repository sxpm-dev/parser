import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('iso-duration',process.argv.includes('--check'));
