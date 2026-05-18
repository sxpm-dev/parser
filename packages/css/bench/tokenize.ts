import { createRequire } from 'node:module';
import * as cssTree from 'css-tree';
import { tokenize as csstoolsTokenize } from '@csstools/css-tokenizer';
import { tokenize as stylisTokenize } from 'stylis';
import moo from 'moo';
import CSSOM from 'cssom';
import rework from 'rework';
import { countTokens, tokenize } from '../src/index.ts';
import { type BenchResult, type Contestant, runBenchTable } from './common.ts';

const require = createRequire(import.meta.url);
const CssTokenize = require('css-tokenize') as () => {
  on(event: 'data', callback: () => void): void;
  end(input: Buffer): void;
};

const mooLexer = moo.compile({
  ws: { match: /[ \t\r\n]+/, lineBreaks: true },
  comment: { match: /\/\*[^]*?\*\//, lineBreaks: true },
  string: { match: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/, lineBreaks: true },
  atKeyword: /@[a-zA-Z_-][a-zA-Z0-9_-]*/,
  hash: /#[a-zA-Z0-9_-]+/,
  number: /-?(?:\d+|\d*\.\d+)(?:[a-zA-Z%]+)?/,
  ident: /-?[a-zA-Z_][a-zA-Z0-9_-]*/,
  punct: /[{}()[\],;:>+~*=|^$!.]/,
  other: { match: /[^]/, lineBreaks: true },
});

const contestants: Contestant[] = [
  {
    label: 'parser2 css scan',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: countTokens(input) }),
  },
  {
    label: 'parser2 css tokenize',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: tokenize(input).length }),
  },
  {
    label: 'css-tree tokenize',
    unit: 'tokens',
    fn: (input: string): BenchResult => {
      let tokens = 0;
      cssTree.tokenize(input, () => { tokens++; });
      return { units: tokens };
    },
  },
  {
    label: 'css-tree materialize',
    unit: 'tokens',
    fn: (input: string): BenchResult => {
      const tokens: Array<{ type: unknown; value: string; start: number; end: number }> = [];
      cssTree.tokenize(input, (type, start, end) => {
        tokens.push({ type, value: input.slice(start, end), start, end });
      });
      return { units: tokens.length };
    },
  },
  {
    label: 'css-tokenize',
    unit: 'events',
    fn: (input: string): BenchResult => {
      let tokens = 0;
      const tokenizer = CssTokenize();
      tokenizer.on('data', () => { tokens++; });
      const warn = console.warn;
      console.warn = () => undefined;
      try {
        tokenizer.end(Buffer.from(input));
      } finally {
        console.warn = warn;
      }
      return { units: tokens };
    },
  },
  {
    label: 'stylis tokenize',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: stylisTokenize(input).length }),
  },
  {
    label: '@csstools/tokenizer',
    unit: 'tokens',
    fn: (input: string): BenchResult => ({ units: csstoolsTokenize({ css: input }).length }),
  },
  {
    label: 'moo custom',
    unit: 'tokens',
    fn: (input: string): BenchResult => {
      mooLexer.reset(input);
      let tokens = 0;
      while (mooLexer.next()) tokens++;
      return { units: tokens };
    },
  },
  {
    label: 'cssom (full parse)',
    unit: 'rules',
    fn: (input: string): BenchResult => ({ units: CSSOM.parse(input).cssRules.length }),
  },
  {
    label: 'rework (full parse)',
    unit: 'rules',
    fn: (input: string): BenchResult => {
      const obj = rework(input).obj as { stylesheet?: { rules: unknown[] } };
      return { units: obj.stylesheet?.rules.length ?? 0 };
    },
  },
];

await runBenchTable('CSS package tokenizer - parser2 vs popular tokenizers', contestants);
