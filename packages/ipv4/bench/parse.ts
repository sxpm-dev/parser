import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('ipv4',process.argv.includes('--check'));
