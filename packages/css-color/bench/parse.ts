import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('css-color',process.argv.includes('--check'));
