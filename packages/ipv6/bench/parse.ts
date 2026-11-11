import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('ipv6',process.argv.includes('--check'));
