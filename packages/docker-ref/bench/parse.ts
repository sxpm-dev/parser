import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('docker-ref',process.argv.includes('--check'));
