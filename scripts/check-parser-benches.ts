import { parserPackages } from './parser-packages.ts';
import { runParserBench } from './migration-bench.ts';
for(const name of parserPackages.filter(n=>!['css','scss','less'].includes(n))) await runParserBench(name,true);
