import { fmtNs, generateCss } from './common.ts';

type Span = readonly [propStart: number, propEnd: number, valueStart: number, valueEnd: number];
type Decl = { type: 'decl'; prop: string; value: string };
type LazyDecl = Decl & { __input: string; __ps: number; __pe: number; __vs: number; __ve: number };

const input = generateCss(100 * 1024);
const spans = collectDeclarationLikeSpans(input);

const lazyProto = {
  get prop(): string {
    return (this as LazyDecl).__input.slice((this as LazyDecl).__ps, (this as LazyDecl).__pe);
  },
  get value(): string {
    return (this as LazyDecl).__input.slice((this as LazyDecl).__vs, (this as LazyDecl).__ve);
  },
};

const CASES = [
  {
    label: 'eager plain',
    build: buildEager,
    plain: true,
  },
  {
    label: 'own getters',
    build: buildOwnGetters,
    plain: true,
  },
  {
    label: 'prototype getters',
    build: buildPrototypeGetters,
    plain: false,
  },
  {
    label: 'offsets then materialize',
    build: buildOffsetsThenMaterialize,
    plain: true,
  },
] as const;

console.log('Lazy materialization experiment');
console.log('This is an internal bench only. A shippable fast AST must preserve plain-object enumeration/JSON behavior.');
console.log(`input=${input.length}B declarations=${spans.length}`);
console.log(
  'case'.padEnd(26) +
  'build'.padEnd(12) +
  'read'.padEnd(12) +
  'json'.padEnd(12) +
  'keys'.padEnd(20) +
  'plain-safe',
);
console.log('-'.repeat(92));

for (const benchCase of CASES) {
  const built = bench(() => benchCase.build(), 120);
  const nodes = benchCase.build();
  const read = bench(() => readFields(nodes), 120);
  const jsonIterations = benchCase.plain ? 20 : 1;
  const json = bench(() => JSON.stringify(nodes).length, jsonIterations, 0);
  const keys = Object.keys(nodes[0] ?? {}).join(',');
  const visibleKeys = keys.length > 17 ? `${keys.slice(0, 16)}...` : keys;
  console.log(
    benchCase.label.padEnd(26) +
    fmtNs(built.ns).padEnd(12) +
    fmtNs(read.ns).padEnd(12) +
    fmtNs(json.ns).padEnd(12) +
    visibleKeys.padEnd(20) +
    (benchCase.plain && keys.includes('prop') && keys.includes('value') ? 'yes' : 'no'),
  );
}

function buildEager(): Decl[] {
  const nodes: Decl[] = [];
  for (const span of spans) {
    nodes[nodes.length] = {
      type: 'decl',
      prop: input.slice(span[0], span[1]),
      value: input.slice(span[2], span[3]),
    };
  }
  return nodes;
}

function buildOwnGetters(): Decl[] {
  const nodes: Decl[] = [];
  for (const span of spans) {
    const node = { type: 'decl' } as Decl;
    Object.defineProperty(node, 'prop', {
      enumerable: true,
      configurable: true,
      get() { return input.slice(span[0], span[1]); },
    });
    Object.defineProperty(node, 'value', {
      enumerable: true,
      configurable: true,
      get() { return input.slice(span[2], span[3]); },
    });
    nodes[nodes.length] = node;
  }
  return nodes;
}

function buildPrototypeGetters(): Decl[] {
  const nodes: Decl[] = [];
  for (const span of spans) {
    const node = Object.create(lazyProto) as LazyDecl;
    node.type = 'decl';
    node.__input = input;
    node.__ps = span[0];
    node.__pe = span[1];
    node.__vs = span[2];
    node.__ve = span[3];
    nodes[nodes.length] = node;
  }
  return nodes;
}

function buildOffsetsThenMaterialize(): Decl[] {
  const offsets: Array<{ ps: number; pe: number; vs: number; ve: number }> = [];
  for (const span of spans) offsets[offsets.length] = { ps: span[0], pe: span[1], vs: span[2], ve: span[3] };
  const nodes: Decl[] = [];
  for (const offset of offsets) {
    nodes[nodes.length] = {
      type: 'decl',
      prop: input.slice(offset.ps, offset.pe),
      value: input.slice(offset.vs, offset.ve),
    };
  }
  return nodes;
}

function readFields(nodes: readonly Decl[]): number {
  let total = 0;
  for (const node of nodes) total += node.prop.length + node.value.length;
  return total;
}

function bench(fn: () => number | object, iterations: number, warmup = 20): { ns: number } {
  for (let i = 0; i < warmup; i++) fn();
  const start = process.hrtime.bigint();
  for (let i = 0; i < iterations; i++) fn();
  return { ns: Number(process.hrtime.bigint() - start) / iterations };
}

function collectDeclarationLikeSpans(source: string): Span[] {
  const spans: Span[] = [];
  let pos = 0;
  while (pos < source.length) {
    const colon = source.indexOf(':', pos);
    if (colon < 0) break;
    const end = findAny(source, colon + 1, [';', '}']);
    if (end < 0) break;
    let propStart = colon - 1;
    while (propStart > 0 && !isBoundary(source.charCodeAt(propStart - 1))) propStart--;
    while (propStart < colon && isWs(source.charCodeAt(propStart))) propStart++;
    let propEnd = colon;
    while (propEnd > propStart && isWs(source.charCodeAt(propEnd - 1))) propEnd--;
    let valueStart = colon + 1;
    while (valueStart < end && isWs(source.charCodeAt(valueStart))) valueStart++;
    let valueEnd = end;
    while (valueEnd > valueStart && isWs(source.charCodeAt(valueEnd - 1))) valueEnd--;
    if (propStart < propEnd && valueStart < valueEnd) spans[spans.length] = [propStart, propEnd, valueStart, valueEnd];
    pos = end + 1;
  }
  return spans;
}

function findAny(source: string, start: number, chars: readonly string[]): number {
  let best = -1;
  for (const char of chars) {
    const idx = source.indexOf(char, start);
    if (idx >= 0 && (best < 0 || idx < best)) best = idx;
  }
  return best;
}

function isBoundary(code: number): boolean {
  return code === 0x7b || code === 0x7d || code === 0x3b || code === 0x0a;
}

function isWs(code: number): boolean {
  return code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d;
}
