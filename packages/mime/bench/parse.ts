import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('mime',process.argv.includes('--check'));
