import { render } from '../src/index.ts';
import { fmtNs, hashInput } from './common.ts';

type ProfileCase = {
  readonly label: string;
  readonly css: string;
};

const TARGET_BYTES = 50 * 1024;
const CASES: readonly ProfileCase[] = [
  {
    label: 'top-level declarations',
    css: fill(TARGET_BYTES, (i) => `--token-${i}: ${i % 17}px;\n`),
  },
  {
    label: 'simple rules',
    css: fill(TARGET_BYTES, (i) => `.card-${i} { color: red; margin: ${i % 17}px ${i % 11}px; }\n`),
  },
  {
    label: 'colon selectors',
    css: fill(TARGET_BYTES, (i) => `.card-${i}:hover, .card-${i}:focus-visible { border-color: green; transform: translate(${i % 9}px, ${i % 7}px); }\n`),
  },
  {
    label: 'at-rule blocks',
    css: fill(TARGET_BYTES, (i) => `@media screen and (max-width: ${320 + (i % 600)}px) { .card-${i} { color: red; padding: ${i % 13}px; } }\n`),
  },
  {
    label: 'comments and strings',
    css: fill(TARGET_BYTES, (i) => `/* theme ${i} */ [data-state="open-${i}"]::before { content: "{ item ${i}; }"; background: url("asset-${i}.svg"); }\n`),
  },
];

console.log('Direct fast path shape profile');
console.log('Each row uses render(input, { type: "ast", mode: "fast" }) and counts AST nodes. This profiles schema shapes through the public API.');
console.log(
  'shape'.padEnd(24) +
  'input'.padEnd(18) +
  'median'.padEnd(12) +
  'min'.padEnd(12) +
  'max'.padEnd(12) +
  'nodes'.padEnd(10) +
  'ns/node',
);
console.log('-'.repeat(92));

for (const profileCase of CASES) {
  const samples = measure(profileCase.css);
  const times = samples.map((sample) => sample.ns);
  const med = median(times);
  const min = Math.min(...times);
  const max = Math.max(...times);
  const nodes = samples[0]?.nodes ?? 0;
  console.log(
    profileCase.label.padEnd(24) +
    `${Math.round(profileCase.css.length / 1024)}KB/${hashInput(profileCase.css)}`.padEnd(18) +
    fmtNs(med).padEnd(12) +
    fmtNs(min).padEnd(12) +
    fmtNs(max).padEnd(12) +
    String(nodes).padEnd(10) +
    (nodes > 0 ? (med / nodes).toFixed(1) : '-'),
  );
}

function measure(input: string): Array<{ ns: number; nodes: number }> {
  for (let i = 0; i < 100; i++) countAst(render(input, { type: 'ast', mode: 'fast' }));
  const samples: Array<{ ns: number; nodes: number }> = [];
  for (let sample = 0; sample < 7; sample++) {
    let nodes = 0;
    const start = process.hrtime.bigint();
    for (let i = 0; i < 120; i++) nodes = countAst(render(input, { type: 'ast', mode: 'fast' }));
    samples[samples.length] = { ns: Number(process.hrtime.bigint() - start) / 120, nodes };
  }
  return samples;
}

function fill(targetBytes: number, chunk: (index: number) => string): string {
  const chunks: string[] = [];
  let bytes = 0;
  let i = 0;
  while (bytes < targetBytes) {
    const next = chunk(i++);
    chunks[chunks.length] = next;
    bytes += next.length;
  }
  return chunks.join('');
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? 0;
}

function countAst(value: unknown): number {
  if (!value || typeof value !== 'object') return 0;
  const node = value as { readonly nodes?: readonly unknown[] };
  let count = 1;
  if (node.nodes) for (const child of node.nodes) count += countAst(child);
  return count;
}
