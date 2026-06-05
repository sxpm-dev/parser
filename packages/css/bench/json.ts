import postcss, { type Declaration, type Rule } from 'postcss';
import { render, stringify } from '../src/index.ts';
import { type BenchResult, type Contestant, runBenchTable } from './common.ts';

// Flat-json target bench. Three directions exercised separately so wins/
// losses on each side are visible:
//
//   forward   :  css string  ->  { [selector]: { [prop]: value } }
//   inverse   :  same object  ->  css string
//   round-trip:  css string  ->  json  ->  css string
//
// parser2 contestants use the schema-declared `json` target lit up by the
// recent dynKey + merge body builders. The postcss contestants reach the
// same shape via hand-written walkers (postcss has no flat-object surface
// natively); these mirror what a typical user would write to extract a
// "selector → declarations" map from postcss output.
//
// Note on coverage: comments, at-rules, and !important all drop out of the
// flat shape (that was the trade-off accepted at schema-author time so the
// inverse stays unambiguous). Both parser2 AND the postcss-equivalent
// walkers omit them — the comparison stays apples-to-apples.

// ----- postcss helpers -----------------------------------------------------

interface FlatJson { readonly [selector: string]: { readonly [prop: string]: string } }

function postcssCssToJson(input: string): FlatJson {
  const root = postcss.parse(input, { from: undefined });
  const out: Record<string, Record<string, string>> = {};
  root.walkRules((rule: Rule) => {
    const decls: Record<string, string> = {};
    rule.walkDecls((decl: Declaration) => {
      // Skip !important to mirror the parser2 flat-shape decision — keeps
      // the per-byte comparison fair.
      if (decl.important) return;
      decls[decl.prop] = decl.value;
    });
    out[rule.selector] = decls;
  });
  return out;
}

function postcssJsonToCss(value: FlatJson): string {
  const root = postcss.root();
  for (const selector of Object.keys(value)) {
    const decls = value[selector]!;
    const rule = postcss.rule({ selector });
    for (const prop of Object.keys(decls)) {
      rule.append(postcss.decl({ prop, value: decls[prop]! }));
    }
    root.append(rule);
  }
  return root.toString();
}

// ----- contestants ---------------------------------------------------------

function countJsonNodes(value: unknown): number {
  if (value === null || typeof value !== 'object') return 0;
  let n = 1;
  for (const v of Object.values(value as Record<string, unknown>)) n += countJsonNodes(v);
  return n;
}

const forward: Contestant[] = [
  {
    label: 'parser2 css → json',
    unit: 'nodes',
    fn: (input: string): BenchResult => ({
      units: countJsonNodes(render(input, { target: 'json' })),
    }),
  },
  {
    label: 'postcss + walker → json',
    unit: 'nodes',
    fn: (input: string): BenchResult => ({
      units: countJsonNodes(postcssCssToJson(input)),
    }),
  },
];

const inverse: Contestant[] = [
  {
    label: 'parser2 json → css',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      // Pre-build the json value so the bench only times json → css.
      // tinybench's contestant API doesn't have a per-run setup hook, so
      // we hold the parsed value in a module-scope cache keyed by input.
      const json = cachedJson(input, 'parser2');
      const out = stringify(json, { target: 'json' });
      return { units: out.length };
    },
  },
  {
    label: 'postcss + builder → css',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const json = cachedJson(input, 'postcss');
      const out = postcssJsonToCss(json);
      return { units: out.length };
    },
  },
];

const roundTrip: Contestant[] = [
  {
    label: 'parser2 css → json → css',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const json = render(input, { target: 'json' });
      const out = stringify(json, { target: 'json' });
      return { units: out.length };
    },
  },
  {
    label: 'postcss css → json → css',
    unit: 'bytes',
    fn: (input: string): BenchResult => {
      const json = postcssCssToJson(input);
      const out = postcssJsonToCss(json);
      return { units: out.length };
    },
  },
];

// Per-(input, library) memoization for the inverse bench. Keys by input
// identity so each fixture's parsed json is built once during sanity
// checks and reused across iterations.
const cache = new Map<string, FlatJson>();
function cachedJson(input: string, lib: 'parser2' | 'postcss'): FlatJson {
  const key = `${lib}::${input.length}::${input.slice(0, 32)}`;
  let val = cache.get(key);
  if (val === undefined) {
    val = lib === 'parser2'
      ? (render(input, { target: 'json' }) as FlatJson)
      : postcssCssToJson(input);
    cache.set(key, val);
  }
  return val;
}

await runBenchTable('css → json (forward)', forward);
await runBenchTable('json → css (inverse)', inverse);
await runBenchTable('css → json → css (round-trip)', roundTrip);
