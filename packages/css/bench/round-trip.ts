import postcss from 'postcss';
import { render, stringify } from '../src/index.ts';
import { type BenchResult, type Contestant, runBenchTable } from './common.ts';

// CSS source-target round-trip bench. Replaces the pre-Phase-6 json bench:
// the 'json' and 'json-auto' targets were dropped in the Phase 6 css
// migration (the 'json' target had merge-at-parent semantics with no
// clean inverse).
//
// The contestants exercise the two halves of the spec's value-stable
// round-trip contract (Section "Design rules", rule 5):
//
//   forward: render(input, 'source')                  — string -> string (canonical)
//   reverse: stringify(render(input, 'ast'), 'source') — ast -> string
//
// Plus two baselines for context: postcss parse + .toString() (a real
// CSS toolchain's round-trip cost) and a JSON.stringify of the AST
// (what most callers would write if they wanted a serializable form;
// measures the 'ast' surface's raw allocation cost).
//
// Reverse round-trip caveat: the source rebuild's value-stability is
// fixture-dependent. Real-world CSS may contain constructs the AST -> source
// inverse can't reconstruct (free-floating comments — see the comment in
// packages/css/test/round-trip.test.ts; selector forms not represented in
// the schema's example baseline; etc.). Rather than narrow the bench
// inputs to a value-stable subset (which would obscure throughput at
// realistic shapes), reverse contestants swallow stringify errors and
// fall back to reporting the AST's JSON byte-size as a stable proxy unit.
// The forward contestant runs unconditionally — render is total.

const contestants: Contestant[] = [
  {
    label: 'parser2 render source (forward)',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const out = render(input, { target: 'source' }) as string;
      return { units: out.length };
    },
  },
  {
    label: 'parser2 stringify source (reverse)',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const ast = render(input, { target: 'ast' });
      try {
        const out = stringify(ast, { target: 'source' });
        return { units: out.length };
      } catch {
        // Fall back to the JSON byte-size of the AST so the unit column
        // stays meaningful when the inverse can't reconstruct the input.
        return { units: JSON.stringify(ast).length, sanity: 'inverse-fallback' };
      }
    },
  },
  {
    label: 'JSON.stringify(render ast)',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const ast = render(input, { target: 'ast' });
      const out = JSON.stringify(ast);
      return { units: out.length };
    },
  },
  {
    label: 'postcss parse + toString',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const root = postcss.parse(input, { from: undefined });
      const out = root.toString();
      return { units: out.length };
    },
  },
];

await runBenchTable('css → source round-trip', contestants);
