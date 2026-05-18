import * as acorn from 'acorn';
import * as esprima from 'esprima';
import * as meriyah from 'meriyah';
import * as babelParser from '@babel/parser';
import { parse as parser2Parse, tokenize as parser2Tokenize } from '../src/index.ts';
import { lines, runBenchTable, type BenchResult, type Contestant } from './common.ts';

const JS_SEED = `a + b * c; arr.map(function (x) { return x * 2; }); obj.foo(1, 2); if (x > 0) y = z; for (var i = 0; i < n; i++) sum += i; switch (k) { case 1: break; default: break; }\n`;

const tokenizerContestants: Contestant[] = [
  {
    label: 'parser2 js tokenize',
    unit: 'tokens',
    fn: (input): BenchResult => {
      const tokens = parser2Tokenize(input);
      return { units: tokens.length, sanity: tokens[0]?.type ?? 'none' };
    },
  },
  {
    label: 'acorn tokenizer',
    unit: 'tokens',
    fn: (input): BenchResult => {
      let count = 0;
      let first: string | undefined;
      for (const tok of acorn.tokenizer(input, { ecmaVersion: 'latest' })) {
        if (count === 0) first = tok.type.label;
        count++;
      }
      return { units: count, sanity: first ?? 'none' };
    },
  },
  {
    label: 'esprima tokenize',
    unit: 'tokens',
    fn: (input): BenchResult => {
      const toks = esprima.tokenize(input);
      return { units: toks.length, sanity: toks[0]?.type ?? 'none' };
    },
  },
];

const astContestants: Contestant[] = [
  {
    label: 'parser2 js parse',
    unit: 'roots',
    fn: (input): BenchResult => {
      const ast = parser2Parse(input);
      return { units: ast.body.length + 1, sanity: ast.type };
    },
  },
  {
    label: 'acorn',
    unit: 'roots',
    fn: (input): BenchResult => {
      const ast = acorn.parse(input, { ecmaVersion: 'latest', sourceType: 'module' }) as {
        type: string;
        body: unknown[];
      };
      return { units: ast.body.length + 1, sanity: ast.type };
    },
  },
  {
    label: 'esprima parseModule',
    unit: 'roots',
    fn: (input): BenchResult => {
      const ast = esprima.parseModule(input);
      return { units: ast.body.length + 1, sanity: ast.type };
    },
  },
  {
    label: 'meriyah',
    unit: 'roots',
    fn: (input): BenchResult => {
      const ast = meriyah.parse(input, { module: true, next: true });
      return { units: ast.body.length + 1, sanity: ast.type };
    },
  },
  {
    label: '@babel/parser',
    unit: 'roots',
    fn: (input): BenchResult => {
      const ast = babelParser.parse(input, {
        sourceType: 'module',
        plugins: ['classProperties', 'decorators-legacy'],
      });
      return { units: ast.program.body.length + 1, sanity: ast.type };
    },
  },
];

async function main(): Promise<void> {
  await runBenchTable({
    title: 'JS tokenizers - flat token stream',
    seed: JS_SEED,
    prepare: lines,
    smallInputs: ['function foo(a, b) { return a + b; }'],
    contestants: tokenizerContestants,
    sizesKb: [5, 20, 100],
  });

  await runBenchTable({
    title: 'JS AST parsers - structured AST output',
    seed: JS_SEED,
    prepare: lines,
    smallInputs: ['function foo(a, b) { return a + b; }'],
    contestants: astContestants,
    sizesKb: [5, 20, 100],
  });
}

void main();
