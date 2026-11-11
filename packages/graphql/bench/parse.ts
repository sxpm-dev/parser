import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('graphql',process.argv.includes('--check'));
