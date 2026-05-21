import postcss from 'postcss';
import { parse, validate, type CssNode, type CssRoot } from '../src/index.ts';
import { fmtNs, generateCss, hashInput } from './common.ts';

type ParserCase = {
  readonly label: string;
  readonly fn: (input: string) => number;
};

type Sample = {
  readonly ns: number;
  readonly units: number;
};

const CASES: readonly ParserCase[] = [
  {
    label: 'fast',
    fn: (input) => countAst(parse(input, { mode: 'fast' }) as CssRoot),
  },
  {
    label: 'raws',
    fn: (input) => countAst(parse(input, { mode: 'raws' }) as CssRoot),
  },
  {
    label: 'validate',
    fn: (input) => {
      validate(input);
      return 0;
    },
  },
  {
    label: 'fast + validate',
    fn: (input) => countAst(parse(input, { mode: 'fast', validateProperties: true }) as CssRoot),
  },
  {
    label: 'raws + validate',
    fn: (input) => countAst(parse(input, { mode: 'raws', validateProperties: true }) as CssRoot),
  },
  {
    label: 'postcss',
    fn: (input) => {
      const root = postcss.parse(input, { from: undefined });
      let nodes = 0;
      root.walk(() => { nodes++; });
      return nodes;
    },
  },
];

const SIZES = [
  { kb: 5, iterations: 1200, warmup: 300 },
  { kb: 20, iterations: 350, warmup: 80 },
  { kb: 100, iterations: 80, warmup: 15 },
  { kb: 500, iterations: 12, warmup: 3 },
  { kb: 1000, iterations: 6, warmup: 2 },
] as const;

const SAMPLE_COUNT = 5;

console.log('Focused CSS AST parse bench');
console.log('Deterministic hrtime loop; median/min/max are per parse. Use this for regression checks before tinybench comparisons.');
console.log(
  'size'.padEnd(8) +
  'input'.padEnd(18) +
  'parser'.padEnd(16) +
  'median'.padEnd(12) +
  'min'.padEnd(12) +
  'max'.padEnd(12) +
  'units'.padEnd(14) +
  'rel',
);
console.log('-'.repeat(94));

for (const size of SIZES) {
  const input = generateCss(size.kb * 1024);
  const label = `${Math.round(input.length / 1024)}KB/${hashInput(input)}`;
  const results = CASES.map((parserCase) => ({
    parserCase,
    samples: measure(input, parserCase.fn, size.iterations, size.warmup),
  }));
  const baseMedian = median(results[0]!.samples.map((sample) => sample.ns));

  let first = true;
  for (const result of results) {
    const times = result.samples.map((sample) => sample.ns);
    const med = median(times);
    const min = Math.min(...times);
    const max = Math.max(...times);
    const units = result.samples[0]?.units ?? 0;
    console.log(
      (first ? `${size.kb}KB` : '').padEnd(8) +
      (first ? label : '').padEnd(18) +
      result.parserCase.label.padEnd(16) +
      fmtNs(med).padEnd(12) +
      fmtNs(min).padEnd(12) +
      fmtNs(max).padEnd(12) +
      `${units} nodes`.padEnd(14) +
      `${(med / baseMedian).toFixed(2)}x`,
    );
    first = false;
  }
  console.log('-'.repeat(94));
}

function measure(input: string, fn: (input: string) => number, iterations: number, warmup: number): Sample[] {
  for (let i = 0; i < warmup; i++) fn(input);

  const samples: Sample[] = [];
  for (let sample = 0; sample < SAMPLE_COUNT; sample++) {
    let units = 0;
    const start = process.hrtime.bigint();
    for (let i = 0; i < iterations; i++) units = fn(input);
    const elapsed = Number(process.hrtime.bigint() - start);
    samples.push({ ns: elapsed / iterations, units });
  }
  return samples;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? 0;
}

function countAst(root: CssRoot): number {
  let nodes = 1;
  const visit = (node: CssNode): void => {
    nodes++;
    if ('nodes' in node && node.nodes) {
      for (const child of node.nodes) visit(child);
    }
  };
  for (const node of root.nodes) visit(node);
  return nodes;
}
