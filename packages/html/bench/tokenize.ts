import { Parser } from 'htmlparser2';
import { tokenize } from '../src/index.ts';
import { type BenchResult, type Contestant, runBenchTable } from './common.ts';

const contestants: Contestant[] = [
  {
    label: 'parser2 html tokenize',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: tokenize(input).length }),
  },
  {
    label: 'htmlparser2 tokenizer',
    unit: 'events',
    fn: (input: string): BenchResult => ({ units: countHtmlparser2Events(input) }),
  },
];

await runBenchTable('HTML package tokenizer - parser2 vs popular tokenizers', contestants);

function countHtmlparser2Events(input: string): number {
  let units = 0;
  const parser = new Parser(
    {
      onopentag() { units++; },
      ontext() { units++; },
      onclosetag() { units++; },
      oncomment() { units++; },
      onprocessinginstruction() { units++; },
    },
    { decodeEntities: false },
  );
  parser.write(input);
  parser.end();
  return units;
}
