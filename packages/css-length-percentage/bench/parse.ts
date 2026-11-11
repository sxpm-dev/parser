import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('css-length-percentage',process.argv.includes('--check'));
