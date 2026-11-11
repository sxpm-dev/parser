import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('gitignore',process.argv.includes('--check'));
