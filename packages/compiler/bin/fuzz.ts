#!/usr/bin/env tsx
// CLI wrapper for `npm run fuzz`. Parses --duration / --seed / --schemas /
// --max-inputs from process.argv, runs the harness, prints a one-line
// summary per schema, and saves each failing input as a regression
// fixture under packages/compiler/test/fuzz-corpus/.
//
// Lives outside the compiler's `src/` rootDir so its dynamic imports of
// downstream packages (markdown / css / html schemas + generated
// parsers) don't violate the compiler tsconfig.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { inferSchema } from '../src/index.ts';
import {
  formatDivergence,
  hashInput,
  inScopeSchemas,
  runFuzz,
  schemaTargets,
  seedCorpus,
  type InScopeSchema,
} from '../src/fuzz/index.ts';
import type { SchemaSetup, V2Render } from '../src/fuzz/runner.ts';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(__filename, '..', '..', '..', '..');
const CORPUS_DIR = join(REPO_ROOT, 'packages', 'compiler', 'test', 'fuzz-corpus');

type CliOpts = {
  durationMs: number;
  seed: number;
  schemas: ReadonlyArray<InScopeSchema>;
  maxInputs: number;
  saveFixtures: boolean;
};

function parseArgs(argv: ReadonlyArray<string>): CliOpts {
  let durationMs = 60_000;
  let seed = 0xc0ffee;
  let schemas: ReadonlyArray<InScopeSchema> = inScopeSchemas;
  let maxInputs = Number.POSITIVE_INFINITY;
  let saveFixtures = true;
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--duration') {
      const v = argv[++i];
      if (!v) throw new Error('--duration requires a number (seconds)');
      durationMs = Math.max(1, Number(v)) * 1000;
    } else if (flag === '--seed') {
      const v = argv[++i];
      if (!v) throw new Error('--seed requires a number');
      seed = Number(v) | 0;
    } else if (flag === '--schemas') {
      const v = argv[++i];
      if (!v) throw new Error('--schemas requires a comma-separated list');
      const names = v.split(',').map((s) => s.trim()).filter(Boolean);
      for (const n of names) {
        if (!(inScopeSchemas as ReadonlyArray<string>).includes(n)) {
          throw new Error(`--schemas: unknown schema '${n}'. Known: ${inScopeSchemas.join(', ')}`);
        }
      }
      schemas = names as ReadonlyArray<InScopeSchema>;
    } else if (flag === '--max-inputs') {
      const v = argv[++i];
      if (!v) throw new Error('--max-inputs requires a number');
      maxInputs = Math.max(1, Number(v));
    } else if (flag === '--no-save') {
      saveFixtures = false;
    } else if (flag === '--help' || flag === '-h') {
      process.stdout.write(
        `Usage: tsx packages/compiler/bin/fuzz.ts [options]\n` +
          `  --duration <seconds>    soft time budget (default 60)\n` +
          `  --seed <int>            deterministic RNG seed (default 0xc0ffee)\n` +
          `  --schemas <a,b,c>       restrict to subset (default: ${inScopeSchemas.join(',')})\n` +
          `  --max-inputs <int>      hard cap on input count (default unlimited)\n` +
          `  --no-save               skip writing fixtures for divergences\n` +
          `  --help                  show this message\n`,
      );
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${flag}`);
    }
  }
  return { durationMs, seed, schemas, maxInputs, saveFixtures };
}

// Lazy schema loader. Importing all three at module top-level adds
// ~200ms of inference cost even when the caller only fuzzes one schema.
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
  throw new Error(`fuzz: unknown schema '${name as string}'`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const opts = parseArgs(args);
  process.stdout.write(
    `fuzz: starting (schemas=${opts.schemas.join(',')} duration=${opts.durationMs}ms seed=${opts.seed.toString(16)})\n`,
  );
  const setups: SchemaSetup[] = [];
  for (const s of opts.schemas) setups.push(await loadSetup(s));
  // Cap the live divergence log — at high rates the harness can find
  // thousands of variants of the same root cause and stdout becomes
  // unreadable. The summary + saved fixtures expose the rest.
  const MAX_LIVE_LOG = 50;
  let liveLogged = 0;
  const result = await runFuzz({
    setups,
    durationMs: opts.durationMs,
    seed: opts.seed,
    maxInputs: opts.maxInputs,
    log: (line) => {
      if (liveLogged++ < MAX_LIVE_LOG * 6 /* ~6 lines per divergence */) {
        process.stdout.write(line + '\n');
      }
    },
  });
  if (liveLogged >= MAX_LIVE_LOG * 6) {
    process.stdout.write(
      `... (${liveLogged - MAX_LIVE_LOG * 6} more log lines suppressed — see summary)\n`,
    );
  }
  process.stdout.write(
    `\nfuzz: completed ${result.inputsTried} inputs in ${result.durationMs}ms; ${result.divergences.length} divergence(s) detected\n`,
  );
  for (const [schema, counters] of result.perSchema) {
    process.stdout.write(
      `  [${schema}] inputs=${counters.inputs} divergences=${counters.divergences}\n`,
    );
  }

  if (opts.saveFixtures && result.divergences.length > 0) {
    mkdirSync(CORPUS_DIR, { recursive: true });
    // Dedupe by (schema, kind, target, mutator-family) — many mutated
    // inputs share root causes; saving every one buries the signal.
    // We keep up to MAX_PER_BUCKET smallest inputs per bucket so a human
    // can pick the easiest reproducer per failure mode.
    const MAX_PER_BUCKET = 3;
    const buckets = new Map<string, (typeof result.divergences)[number][]>();
    for (const d of result.divergences) {
      const mutatorFamily = d.mutator.split('@')[0]!.split('-')[0]!;
      const key = `${d.schema}|${d.kind}|${d.target ?? '-'}|${mutatorFamily}`;
      const arr = buckets.get(key) ?? [];
      arr.push(d);
      buckets.set(key, arr);
    }
    const written = new Set<string>();
    for (const [, arr] of buckets) {
      arr.sort((a, b) => a.input.length - b.input.length);
      for (const d of arr.slice(0, MAX_PER_BUCKET)) {
        const hash = hashInput(d.input);
        const path = join(CORPUS_DIR, `${d.schema}-${d.kind}-${hash}.txt`);
        if (written.has(path)) continue;
        written.add(path);
        const header = [
          `# schema=${d.schema}`,
          `# kind=${d.kind}`,
          `# target=${d.target ?? '-'}`,
          `# mutator=${d.mutator}`,
          `# seed=${JSON.stringify(d.seed)}`,
          `# detail=${d.detail}`,
          '',
        ].join('\n');
        writeFileSync(path, header + d.input);
      }
    }
    process.stdout.write(
      `  saved ${written.size} fixture(s) across ${buckets.size} failure-bucket(s) to ${CORPUS_DIR}\n`,
    );
  }

  // Exit non-zero on divergence so CI surfaces the failure. The default
  // budget is 60s; a passing run prints the summary and exits 0.
  process.exit(result.divergences.length === 0 ? 0 : 1);
}

main().catch((e) => {
  process.stderr.write(`fuzz: fatal error: ${String((e as Error).stack ?? (e as Error).message ?? e)}\n`);
  process.exit(2);
});
