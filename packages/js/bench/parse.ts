import * as acorn from 'acorn';
import * as esprima from 'esprima';
import * as meriyah from 'meriyah';
import * as babelParser from '@babel/parser';
import { parse as parser2Parse } from '../src/index.ts';
import { lines, runBenchTable, type BenchResult, type Contestant } from './common.ts';

const JS_SEED = `a + b * c; arr.map(function (x) { return x * 2; }); obj.foo(1, 2); if (x > 0) y = z; for (var i = 0; i < n; i++) sum += i; switch (k) { case 1: break; default: break; }\n`;

const contestants: Contestant[] = [
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

await runBenchTable({
  title: 'JS AST parsers - structured AST output',
  seed: JS_SEED,
  prepare: lines,
  smallInputs: ['function foo(a, b) { return a + b; }'],
  contestants,
  sizesKb: [5, 20, 100],
});
