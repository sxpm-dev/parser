// Inverse-derivability golden tests. For a curated set of CSS productions
// covering every body shape the inverse derivation supports (object body
// with recursive nodes, object body with literal discriminators, $.name
// refs, optional and required template segments), snapshot the derived
// InverseIR to a golden JSON file and compare on every test run.
//
// The InverseIR is the compile-time output of infer/invert.ts —
// deriveInverses() walks each (production, target) pair and stores the
// IR on `RenderTargetIR.inverseDerived`. The emitted runtime inverse
// dispatcher is generated from this IR (see emit/inverse.ts), so pinning
// the IR pins both shapes.
//
// File naming: <NodeType>_<target>.json. The runner parses the filename,
// resolves the production by its node type (first production in the
// node-type's productions list when the file name contains `_<idx>_`,
// otherwise unique-by-node-type via the .as(...) on the example), and
// snapshots its inverse IR.
//
// First-time generation / refresh after intentional IR changes:
//
//   UPDATE_GOLDENS=1 npx tsx --test packages/compiler/test/inverse-goldens.test.ts
//
// The env-var flips the runner from compare to write mode. Without it,
// missing or stale goldens fail the test loudly.

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import test from 'node:test';
// Use a relative path to avoid a hard package dependency from compiler →
// css. The css schema source lives in a peer workspace; tsx resolves the
// `.ts` extension natively. The compiler package's runtime depends only
// on @parser2/parser; the test extends that for schema fixtures.
import cssSchema from '../../css/src/schema.ts';
import { inferSchema } from '../src/index.ts';
import type { InverseIR, Production } from '../src/model.ts';

const here = new URL('./inverse-goldens/', import.meta.url);
const UPDATE = process.env.UPDATE_GOLDENS === '1';

// Each golden specifies the (NodeType, productionIndex, target) tuple the
// IR snapshot covers. Production indices are positional within the
// node-type's productions list (matches the order example blocks declare
// productions in the CSS schema).
const CANARIES: ReadonlyArray<{
  readonly file: string;
  readonly nodeType: string;
  readonly productionIndex: number;
  readonly target: string;
}> = [
  // object body, recursive nodes — top-level Stylesheet
  { file: 'Stylesheet_0_ast.json', nodeType: 'Stylesheet', productionIndex: 0, target: 'ast' },
  // object body, recursive nodes inside a selector wrapper
  { file: 'Rule_0_ast.json', nodeType: 'Rule', productionIndex: 0, target: 'ast' },
  // object body, literal `type` field, no literal discriminator beyond it
  { file: 'Declaration_1_ast.json', nodeType: 'Declaration', productionIndex: 1, target: 'ast' },
  // object body with literal `important: true` discriminator
  { file: 'Declaration_0_ast.json', nodeType: 'Declaration', productionIndex: 0, target: 'ast' },
  // template body with bare $.name refs
  { file: 'Comment_0_source.json', nodeType: 'Comment', productionIndex: 0, target: 'source' },
  // object body, block-form at-rule with recursive nodes
  { file: 'AtRule_0_ast.json', nodeType: 'AtRule', productionIndex: 0, target: 'ast' },
];

const inferred = inferSchema(cssSchema);

function locateProduction(nodeType: string, idx: number): Production {
  const info = inferred.nodeTypes.get(nodeType);
  if (!info) {
    throw new Error(
      `golden test: schema has no node type '${nodeType}'. Known: ${[...inferred.nodeTypes.keys()].join(', ')}`,
    );
  }
  const production = info.productions[idx];
  if (!production) {
    throw new Error(
      `golden test: node '${nodeType}' has no production at index ${idx} (have ${info.productions.length})`,
    );
  }
  return production;
}

function loadGolden(file: string): unknown {
  const path = fileURLToPath(new URL(file, here));
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeGolden(file: string, ir: InverseIR): void {
  const path = fileURLToPath(new URL(file, here));
  // `${stringify}\n` keeps editors happy on save (POSIX trailing newline).
  writeFileSync(path, `${JSON.stringify(ir, null, 2)}\n`);
}

// Catch missing canaries (golden file exists with no test scheduled) and
// stale goldens (test scheduled with no golden) early.
test('golden inventory matches canary set', () => {
  const present = new Set(
    readdirSync(fileURLToPath(here)).filter((f) => f.endsWith('.json')),
  );
  const expected = new Set(CANARIES.map((c) => c.file));
  if (UPDATE) return; // write mode populates the dir
  const missing = [...expected].filter((f) => !present.has(f));
  const extra = [...present].filter((f) => !expected.has(f));
  assert.deepEqual({ missing, extra }, { missing: [], extra: [] });
});

for (const canary of CANARIES) {
  test(`inverse IR golden: ${canary.file}`, () => {
    const production = locateProduction(canary.nodeType, canary.productionIndex);
    const entry = production.renders.get(canary.target);
    assert.ok(
      entry,
      `production '${canary.nodeType}'[${canary.productionIndex}] has no render target '${canary.target}'`,
    );
    const ir = entry.inverseDerived;
    assert.ok(ir, 'inverseDerived must be populated by deriveInverses');
    // Serialize through JSON to match the on-disk shape (strips undefined,
    // pins Map/Set surface, etc.).
    const actual: unknown = JSON.parse(JSON.stringify(ir));
    if (UPDATE) {
      writeGolden(canary.file, ir);
      return;
    }
    const expected = loadGolden(canary.file);
    assert.deepEqual(actual, expected);
  });
}
