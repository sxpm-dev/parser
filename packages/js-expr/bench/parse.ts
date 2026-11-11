import { runParserBench } from '../../../scripts/migration-bench.ts';
await runParserBench('js-expr',process.argv.includes('--check'));
