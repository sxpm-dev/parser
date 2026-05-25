import postcss from 'postcss';
import { parse, render, stringify } from '../src/index.ts';
import { type BenchResult, type Contestant, runBenchTable } from './common.ts';

// CSS → JSON bench. Two parser2 paths under test:
//
//   - target 'json'      — author-written tpl templates on each CSS production
//                          (Variant A in the design conversation).
//   - target 'json-auto' — compiler-synthesized templates derived mechanically
//                          from each production's .structure({...}) literal
//                          (Variant B).
//
// Both targets produce byte-identical semantic JSON for the CSS schema (no
// `raws`), so this bench measures the cost-of-templating, not the
// cost-of-serialization-shape.
//
// Baselines compare the parser2 paths to the natural alternatives:
//
//   - JSON.stringify(parse(input).value)  — what most callers would write
//                                           today: parse to Structure, then
//                                           stringify the Structure with the
//                                           runtime's generic walker.
//   - postcss parse + JSON.stringify of a stripped tree — what someone reaching
//                                           for postcss would pay.

const contestants: Contestant[] = [
  {
    label: 'parser2 render json',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const out = render(input, { target: 'json' });
      return { units: out.length };
    },
  },
  {
    label: 'parser2 render json-auto',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const out = render(input, { target: 'json-auto' });
      return { units: out.length };
    },
  },
  {
    label: 'parser2 stringify json',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const out = stringify(parse(input), { target: 'json' });
      return { units: out.length };
    },
  },
  {
    label: 'JSON.stringify(parse)',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const out = JSON.stringify(parse(input));
      return { units: out.length };
    },
  },
  {
    label: 'postcss + JSON.stringify',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const root = postcss.parse(input, { from: undefined });
      const out = JSON.stringify(rootToPlain(root));
      return { units: out.length };
    },
  },
];

interface PlainNode {
  type: string;
  [key: string]: unknown;
}

function rootToPlain(root: postcss.Root): PlainNode {
  return {
    type: 'root',
    nodes: root.nodes.map(nodeToPlain),
  };
}

function nodeToPlain(node: postcss.ChildNode): PlainNode {
  if (node.type === 'rule') {
    return {
      type: 'rule',
      selector: node.selector,
      nodes: node.nodes.map(nodeToPlain),
    };
  }
  if (node.type === 'atrule') {
    const out: PlainNode = {
      type: 'atrule',
      name: node.name,
      params: node.params,
    };
    if (node.nodes) out.nodes = node.nodes.map(nodeToPlain);
    return out;
  }
  if (node.type === 'decl') {
    const out: PlainNode = {
      type: 'decl',
      prop: node.prop,
      value: node.value,
    };
    if (node.important) out.important = true;
    return out;
  }
  if (node.type === 'comment') {
    return { type: 'comment', text: `/*${node.text}*/` };
  }
  return { type: 'unknown' };
}

await runBenchTable('css → json', contestants);
