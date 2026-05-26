// Default-on smoke run of the differential fuzzer (Task 2.4). Runs as
// part of `npm run test`; the longer free-running fuzz lives under
// `npm run fuzz` (60s default).
//
// The smoke run splits into two parts:
//   1. Seed-only — every baseline seed is run through the identity
//      mutator (no transformation) and ALL declared equivalence +
//      round-trip targets are cross-checked between the reference
//      interpreter and the v2-generated parser. Zero divergences here is
//      an acceptance criterion: the interp tests already covered each
//      seed in isolation, so the harness must agree.
//   2. Mutator survey — runs every mutator (truncate / duplicate /
//      insert-noise / etc.) against the same seeds with a small input
//      cap. Divergences here are EXPECTED to surface real bugs in either
//      the interpreter or v2 codegen; the test SUMMARIZES them but does
//      not fail. (See task 2.4 spec — fixing them is Phase 3+ work.)
//
// Tweak SMOKE_MAX_INPUTS / SURVEY_MAX_INPUTS to balance runtime vs
// coverage. With the default cap the suite completes in < 1s.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { inferSchema } from '../src/index.ts';
import {
  formatDivergence,
  inScopeSchemas,
  runFuzz,
  schemaTargets,
  seedCorpus,
  type InScopeSchema,
} from '../src/fuzz/index.ts';
import { identity } from '../src/fuzz/mutators.ts';
import type { SchemaSetup, V2Render } from '../src/fuzz/runner.ts';

const SURVEY_MAX_INPUTS = 600;

async function loadSetup(name: InScopeSchema): Promise<SchemaSetup> {
  const targets = schemaTargets[name];
  const corpus = seedCorpus(name);
  if (name === 'markdown') {
    const { default: schema } = await import('../../markdown/src/schema.ts');
    const { render } = (await import('../../markdown/src/_generated/parser.ts')) as {
      render: V2Render;
    };
    return { name, schema: inferSchema(schema), render, seedCorpus: corpus, ...targets };
  }
  if (name === 'css') {
    const { default: schema } = await import('../../css/src/schema.ts');
    const { render } = (await import('../../css/src/_generated/parser.ts')) as {
      render: V2Render;
    };
    return { name, schema: inferSchema(schema), render, seedCorpus: corpus, ...targets };
  }
  if (name === 'html') {
    const { default: schema } = await import('../../html/src/schema.ts');
    const { render } = (await import('../../html/src/_generated/parser.ts')) as {
      render: V2Render;
    };
    return { name, schema: inferSchema(schema), render, seedCorpus: corpus, ...targets };
  }
  throw new Error(`fuzz test: unknown schema '${name as string}'`);
}

let cachedSetups: SchemaSetup[] | null = null;
async function getSetups(): Promise<SchemaSetup[]> {
  if (cachedSetups) return cachedSetups;
  const setups: SchemaSetup[] = [];
  for (const name of inScopeSchemas as ReadonlyArray<InScopeSchema>) {
    setups.push(await loadSetup(name));
  }
  cachedSetups = setups;
  return setups;
}

test(
  `fuzz seed corpus (markdown+css+html, identity mutator, no divergences allowed)`,
  async () => {
    const setups = await getSetups();
    const result = await runFuzz({
      setups,
      seed: 0xc0ffee,
      mutators: [identity],
      // No max-inputs: the seed corpus is small (~50 entries total).
      // A 10s safety net catches infinite-loop regressions in the
      // interpreter.
      durationMs: 10_000,
      log: () => {}, // silenced; failure path includes the formatted list.
    });
    assert.ok(result.inputsTried > 0, 'fuzz seed corpus ran zero inputs');
    if (result.divergences.length > 0) {
      const summary = result.divergences
        .slice(0, 10)
        .map((d) => formatDivergence(d))
        .join('\n\n');
      assert.fail(
        `fuzz seed corpus found ${result.divergences.length} divergence(s) (across ${result.inputsTried} inputs):\n\n${summary}`,
      );
    }
  },
);

test(
  `fuzz mutator survey (markdown+css+html, ${SURVEY_MAX_INPUTS} inputs, seed=0xC0FFEE)`,
  async () => {
    const setups = await getSetups();
    const result = await runFuzz({
      setups,
      seed: 0xc0ffee,
      maxInputs: SURVEY_MAX_INPUTS,
      durationMs: 30_000,
      log: () => {}, // captured below as TAP diagnostics, not stdout-spam.
    });
    assert.ok(result.inputsTried > 0, 'fuzz mutator survey ran zero inputs');
    // Don't fail on divergences here — they're known follow-up work for
    // Phase 3+. Just emit a TAP-friendly summary so they show up in CI
    // logs and are tracked over time.
    const perSchemaSummary = Array.from(result.perSchema.entries())
      .map(([s, c]) => `${s}: ${c.inputs} inputs, ${c.divergences} divergences`)
      .join('; ');
    console.log(
      `fuzz survey: ${result.inputsTried} inputs in ${result.durationMs}ms (${perSchemaSummary})`,
    );
    if (result.divergences.length > 0) {
      console.log(`fuzz survey: ${result.divergences.length} divergence(s) detected (not failing — see Phase 3+ tasks)`);
      // Surface the first three as TAP diagnostics. The 60s fuzz run
      // (`npm run fuzz`) persists every divergence to fuzz-corpus/.
      for (const d of result.divergences.slice(0, 3)) {
        console.log(formatDivergence(d));
      }
    }
  },
);
