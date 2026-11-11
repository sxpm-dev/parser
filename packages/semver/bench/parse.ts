import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('semver',process.argv.includes('--check'));
