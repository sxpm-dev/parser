// Fusion round-trip coverage (Task 5.4 — Phase 5).
//
// Property: the v2-generated public `render(input, {type:T})` (which now
// tries the fused path first and falls back to captures dispatch — see
// Tasks 5.1–5.3) produces the SAME target value as the canonical
// interpreter (`interp.render(interp.parse(input), T)`). The interpreter
// is the Phase-2 trust anchor and is independent of fusion entirely, so
// using it as the comparator effectively checks that fusion preserves
// the spec rule 5 (value-stable) contract.
//
// Coverage: every (schema, production, declared non-'ast' target) for
// css, html, markdown — i.e. all in-scope Phase-5 packages.
//
// Why not compare fused-vs-captures directly:
//   - Public `render()` always tries fused first, so isolating the
//     captures-only output requires reaching into private internals
//     (e.g. `__renderDispatch[target](captures)`). The interp comparator
//     is independent code AND the spec's trust anchor, so divergences
//     surface real Phase-5 bugs without coupling the test to v2 internals.
//
// Known exclusions are kept in sync with `check/round-trip.ts:KNOWN_EXCLUSIONS`
// to avoid duplicating the rationale per (nodeType, target, input).
//
// A divergence here is a real Task-5 bug. Fix the emitter (most likely
// `emit/v2/fusion.ts`), don't expand the exclusion list.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { inferSchema } from '../src/index.ts';
import { interpretParseCaptures } from '../src/interp/parse.ts';
import { interpretRender } from '../src/interp/render.ts';
import type { InferredSchema, Production } from '../src/model.ts';

type RenderFn = (input: string, options?: { target?: string }) => unknown;

type SchemaFixture = {
  readonly name: string;
  readonly schemaImport: () => Promise<{ default: unknown }>;
  readonly packageImport: () => Promise<{ render: RenderFn }>;
};

const SCHEMAS: ReadonlyArray<SchemaFixture> = [
  {
    name: 'css',
    schemaImport: () => import('../../css/src/schema.ts'),
    packageImport: () => import('../../css/src/index.ts') as Promise<{ render: RenderFn }>,
  },
  {
    name: 'html',
    schemaImport: () => import('../../html/src/schema.ts'),
    packageImport: () => import('../../html/src/index.ts') as Promise<{ render: RenderFn }>,
  },
  {
    name: 'markdown',
    schemaImport: () => import('../../markdown/src/schema.ts'),
    packageImport: () => import('../../markdown/src/index.ts') as Promise<{ render: RenderFn }>,
  },
];

// Mirrors check/round-trip.ts KNOWN_EXCLUSIONS. Kept in sync by hand —
// when that file's list shrinks, this one shrinks too.
type Exclusion = {
  readonly nodeType: string;
  readonly target: string;
  readonly input: string;
  readonly reason: string;
};

const KNOWN_EXCLUSIONS: ReadonlyArray<Exclusion> = [
  {
    nodeType: 'Comment',
    target: 'source',
    input: '/* foo */',
    reason: '.comment() strips delimiters on parse; the production-span rebuild produces only the interior. Phase 7 follow-up.',
  },
];

// Per-schema minimum comparison counts. Updates ratchet upward as
// fusion eligibility expands. A drop below these floors signals a
// silent coverage regression (e.g. a target rename dropped all
// non-ast targets without anyone noticing).
const EXPECTED_MIN_COMPARISONS: Record<string, number> = {
  css: 5,
  html: 15,
  markdown: 70,
};

function isExcluded(nodeType: string, target: string, input: string): boolean {
  for (const e of KNOWN_EXCLUSIONS) {
    if (e.nodeType === nodeType && e.target === target && e.input === input) return true;
  }
  return false;
}

// Strip `source` byte-range metadata before comparison. v2 fused output
// for the 'ast' target carries `source` ranges; interp's 'ast' rendering
// also carries source ranges but they may differ in byte offsets when
// fusion takes a different traversal order. The Phase-2 round-trip check
// already strips this — we mirror that here. (For non-ast targets the
// fields are normally absent, so the strip is a no-op.)
function stripSource(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(stripSource);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === 'source') continue;
    out[k] = stripSource(v);
  }
  return out;
}

type ProductionCase = {
  readonly nodeType: string;
  readonly prodIdx: number;
  readonly production: Production;
};

function collectCases(schema: InferredSchema): ReadonlyArray<ProductionCase> {
  const cases: ProductionCase[] = [];
  for (const info of schema.nodeTypes.values()) {
    for (let pi = 0; pi < info.productions.length; pi++) {
      const production = info.productions[pi]!;
      // Recovery productions describe lossy malformed-input fallbacks.
      if (production.recovery) continue;
      cases.push({ nodeType: info.name, prodIdx: pi, production });
    }
  }
  return cases;
}

for (const fixture of SCHEMAS) {
  test(`fusion round-trip: ${fixture.name}`, async () => {
    const { default: rawSchema } = await fixture.schemaImport();
    const { render } = await fixture.packageImport();
    // We need the inferred schema (production list + render targets), not
    // the raw SchemaDef. `inferSchema` is idempotent and runs the
    // codegen-time round-trip check itself; passing the same schema the
    // generated parser was built from is the canonical Phase-2 anchor.
    const schema = inferSchema(rawSchema as Parameters<typeof inferSchema>[0]);

    let comparisons = 0;
    const cases = collectCases(schema);
    assert.ok(cases.length > 0, `${fixture.name}: expected at least one production case`);

    for (const { nodeType, prodIdx, production } of cases) {
      const example = production.source.input;

      // Sub-tree fixtures (examples declared on a non-root node type that
      // don't parse from the schema root) — silently skip. Mirrors the
      // same gate in check/round-trip.ts.
      let captures: ReturnType<typeof interpretParseCaptures>;
      try {
        captures = interpretParseCaptures(schema, example);
      } catch {
        continue;
      }
      // The example must actually dispatch to this production from the
      // root. Otherwise the comparison would be checking something else.
      if (captures.__production !== `${nodeType}#${prodIdx}` &&
          !producesNested(captures, `${nodeType}#${prodIdx}`)) {
        continue;
      }

      for (const target of production.renders.keys()) {
        if (target === 'ast') continue;
        // Inverse overrides exempt the round-trip check at codegen for
        // the body↔inverse path. Here we're comparing render outputs (no
        // inverse involved), so override-presence doesn't apply — keep
        // these in scope.
        if (isExcluded(nodeType, target, example)) continue;

        const v2Output = render(example, { target });
        const canonical = interpretRender(schema, captures, target);

        assert.deepStrictEqual(
          stripSource(v2Output),
          stripSource(canonical),
          `${fixture.name} ${nodeType}#${prodIdx} target=${target}: v2 fused output diverges from interp canonical`
            + `\n  input: ${JSON.stringify(example)}`,
        );
        comparisons++;
      }
    }

    const floor = EXPECTED_MIN_COMPARISONS[fixture.name] ?? 1;
    assert.ok(
      comparisons >= floor,
      `${fixture.name}: expected at least ${floor} comparisons, got ${comparisons}`,
    );
  });
}

// Mirrors the same helper in check/round-trip.ts. A sub-tree fixture
// declared via `.as('Pair')` won't dispatch to Pair#0 at the schema root,
// but the parse-tree of a root-parseable example might still contain a
// Pair#0 sub-capture — exercising the production indirectly. Treating
// that as in-scope mirrors the Phase-2 round-trip check's coverage.
function producesNested(captures: unknown, productionKey: string): boolean {
  if (captures === null || typeof captures !== 'object') return false;
  if (Array.isArray(captures)) {
    for (const v of captures) if (producesNested(v, productionKey)) return true;
    return false;
  }
  const obj = captures as Record<string, unknown>;
  if (obj.__production === productionKey) return true;
  for (const v of Object.values(obj)) {
    if (producesNested(v, productionKey)) return true;
  }
  return false;
}
