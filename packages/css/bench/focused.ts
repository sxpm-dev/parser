import postcss from 'postcss';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

type BenchInput = {
  readonly label: string;
  readonly input: string;
  readonly iterations: number;
  readonly warmup: number;
  readonly sampleCount?: number;
  readonly windowMs?: number;
  readonly parseOnly?: boolean;
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
    fn: (input) => countAst(parse(input, { mode: 'fast', validate: true }) as CssRoot),
  },
  {
    label: 'raws + validate',
    fn: (input) => countAst(parse(input, { mode: 'raws', validate: true }) as CssRoot),
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
const HUGE_PAGE_WINDOW_MS = 30_000;

const here = dirname(fileURLToPath(import.meta.url));
const hugePageCss = readFileSync(join(here, 'fixture', 'huge-page.css'), 'utf8');
const INPUTS: readonly BenchInput[] = [
  {
    label: 'huge-page',
    input: hugePageCss,
    iterations: 1,
    warmup: 0,
    sampleCount: 3,
    windowMs: HUGE_PAGE_WINDOW_MS,
    parseOnly: true,
  },
  ...SIZES.map((size) => ({
    label: `${size.kb}KB`,
    input: generateCss(size.kb * 1024),
    iterations: size.iterations,
    warmup: size.warmup,
  })),
];

console.log('Focused CSS AST parse bench');
console.log('Deterministic hrtime loop; median/min/max are per parse. Use this for regression checks before tinybench comparisons.');
console.log(`Real fixtures use a parse-only ${HUGE_PAGE_WINDOW_MS / 1000}s sampling window per parser.`);
console.log(
  'size'.padEnd(12) +
  'input'.padEnd(18) +
  'parser'.padEnd(16) +
  'median'.padEnd(12) +
  'min'.padEnd(12) +
  'max'.padEnd(12) +
  'units'.padEnd(14) +
  'rel',
);
console.log('-'.repeat(98));

for (const benchInput of INPUTS) {
  const input = benchInput.input;
  const label = `${Math.round(input.length / 1024)}KB/${hashInput(input)}`;
  const parserCases = benchInput.parseOnly
    ? CASES.filter((parserCase) => !parserCase.label.includes('validate'))
    : CASES;
  const results = parserCases.map((parserCase) => ({
    parserCase,
    samples: benchInput.windowMs === undefined
      ? measure(input, parserCase.fn, benchInput.iterations, benchInput.warmup)
      : measureWindow(input, parserCase.fn, benchInput.windowMs, benchInput.sampleCount ?? SAMPLE_COUNT),
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
      (first ? benchInput.label : '').padEnd(12) +
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

function measureWindow(input: string, fn: (input: string) => number, windowMs: number, sampleCount: number): Sample[] {
  const samples: Sample[] = [];
  const deadline = Number(process.hrtime.bigint()) + windowMs * 1_000_000;
  while (samples.length < sampleCount) {
    let units = 0;
    const start = process.hrtime.bigint();
    units = fn(input);
    const end = process.hrtime.bigint();
    samples.push({ ns: Number(end - start), units });
    if (Number(end) >= deadline) break;
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
