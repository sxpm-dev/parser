import MarkdownIt from 'markdown-it';
import { marked } from 'marked';
import { micromark } from 'micromark';
import { tokenize } from '../src/index.ts';
import { type BenchResult, type Contestant, runBenchTable } from './common.ts';

const markdownIt = new MarkdownIt();

const contestants: Contestant[] = [
  {
    label: 'parser2 md tokenize',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: tokenize(input).length }),
  },
  {
    label: 'markdown-it tokens',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: markdownIt.parse(input, {}).length }),
  },
  {
    label: 'marked lexer',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: marked.lexer(input).length }),
  },
  {
    label: 'micromark html',
    unit: 'bytes',
    fn: (input: string): BenchResult => ({ units: micromark(input).length }),
  },
];

await runBenchTable('Markdown package tokenizer - parser2 vs popular tokenizers', contestants);
