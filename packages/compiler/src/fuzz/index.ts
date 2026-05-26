// Differential fuzzer harness (Task 2.4). Public entrypoints used by the
// CLI (`npm run fuzz`) and the test-mode wrapper (test/fuzz.test.ts).
//
// Layout:
//   - InScopeSchema lists the schemas the fuzzer targets. The actual
//     SchemaSetup (schema + v2 render + per-target lists) is loaded
//     outside this module by the caller because cross-package source
//     imports cannot live under the compiler's tsc rootDir.
//   - seedCorpus(name) returns the seed inputs for one schema, drawn from
//     the v2 round-trip test corpus + interp test inputs. Keep small;
//     mutators do the heavy lifting.
//   - runFuzz(opts) is the main driver. It loops until either the input
//     budget or the time budget is exhausted, running each (seed, mutator)
//     pair through compareOne and collecting divergences.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Divergence, SchemaSetup } from './runner.ts';
import { compareOne } from './runner.ts';
import { allMutators, makeRng, type MutatedInput, type Mutator } from './mutators.ts';

// --- Schema registry -------------------------------------------------------

export const inScopeSchemas = ['markdown', 'css', 'html'] as const;
export type InScopeSchema = (typeof inScopeSchemas)[number];

// Per-schema render-target configuration. Callers (bin/fuzz.ts and
// test/fuzz.test.ts) supply the actual SchemaSetup with the schema and
// v2 render fn loaded from the package source — those cross-package
// imports cannot live under the compiler's tsc rootDir, so they belong
// in non-compiled entrypoints.
export type TargetConfig = {
  readonly equivalenceTargets: ReadonlyArray<string>;
  readonly roundTripTargets: ReadonlyArray<string>;
};

export const schemaTargets: Readonly<Record<InScopeSchema, TargetConfig>> = {
  // Both 'html' and 'source' are template targets; round-trip via the
  // 'source' target. Ast equivalence is implied by ast-mismatch detection
  // in compareOne (which always parses against the schema's AST shape).
  markdown: {
    equivalenceTargets: ['html', 'source'],
    roundTripTargets: ['source'],
  },
  css: {
    equivalenceTargets: ['source'],
    roundTripTargets: ['source'],
  },
  // HTML 'source' is not a fixed point under repeated rendering for shapes
  // with attribute or sibling-whitespace (the v2 rebuild canonicalizes
  // inter-child whitespace). Skip round-trip here; round-trip via the
  // interpreter is exercised by interp-stringify tests with a curated
  // fixture set.
  html: {
    equivalenceTargets: ['source'],
    roundTripTargets: [],
  },
};

// --- Seed corpus -----------------------------------------------------------

// Seed inputs are drawn from:
//   - the interp test corpora (interp-render.test.ts) — known-good across
//     the entire pipeline; used as the "trusted" baseline.
//   - the package's own fixture files (markdown/test/fixtures/*.md,
//     html/test/fixtures/phase-1/*.html, css/test/cases/*.css).
// The corpus is intentionally small (~30 entries per schema) — the
// mutators expand each seed into hundreds of variants.

const __filename = fileURLToPath(import.meta.url);
// __filename: <repo>/packages/compiler/src/fuzz/index.ts
const REPO_ROOT = join(__filename, '..', '..', '..', '..', '..');
const PACKAGES = join(REPO_ROOT, 'packages');

// Single-block seeds only. Multi-block markdown isn't a value-stable
// fixed point under repeated rendering (the v2 rebuild canonicalizes
// inter-block whitespace inconsistently at concatenation boundaries —
// see packages/markdown/test/round-trip.test.ts for the curated
// fixture set, which restricts itself to single-block inputs for the
// same reason). Mutators (e.g. `duplicate`) will still synthesize
// multi-block inputs; those divergences are surfaced and saved as
// regression fixtures rather than failing the smoke test.
const MARKDOWN_BASELINE: ReadonlyArray<string> = [
  '# Release notes',
  '## Installation guide',
  '### API reference',
  '#### Deep section',
  '##### Small section',
  '###### Tiny heading',
  '> quoted text',
  '- first item',
  '+ alternate marker',
  '* star marker',
  '1. ordered item',
  '[docs](https://example.com)',
  '![diagram](https://example.com/diagram.png)',
  '**bold**',
  '*italic*',
  '~~removed~~',
  '`code`',
  '---',
  '***',
  '___',
  'Plain paragraph',
];

// CSS baseline. Drawn from interp-stringify.test.ts so the round-trip
// path is known-good for every seed. We deliberately omit the
// comment-leading variant ('/* a comment */ a { color: red; }') because
// the interpreter's stringify path does not yet reconstruct leading
// block comments — a Phase 3+ task (the comment is dropped during
// rebuild because there's no template segment to anchor it to).
const CSS_BASELINE: ReadonlyArray<string> = [
  'a { color: red; }',
  'a { color: red; background: blue; }',
  '.foo { margin: 0; }',
  '#bar { padding: 5px; }',
  'a { color: red !important; }',
  'body { font-size: 14px; }',
  '@import "foo.css";',
  'a, b { color: green; }',
  '@media (min-width: 600px) { a { color: blue; } }',
];

const HTML_BASELINE: ReadonlyArray<string> = [
  '<p>hello</p>',
  '<div>hi</div>',
  '<span>text</span>',
  '<a href="x">link</a>',
  '<img src="x.png">',
  '<br>',
  '<hr>',
  '<input type="text">',
  '<!-- comment -->',
  '<p>hello <b>world</b></p>',
  '<div><span>x</span><em>y</em></div>',
];

export function seedCorpus(name: InScopeSchema): ReadonlyArray<string> {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (s: string): void => {
    if (!seen.has(s)) {
      seen.add(s);
      out.push(s);
    }
  };
  if (name === 'markdown') {
    for (const s of MARKDOWN_BASELINE) push(s);
    // Pull additional single-block snippets from the fixtures by
    // splitting on blank lines and only keeping snippets that are a
    // single (non-newline-containing) line. Multi-line snippets would
    // hit the same v2-rebuild canonicalization issue that excludes them
    // from MARKDOWN_BASELINE.
    const fixturesDir = join(PACKAGES, 'markdown', 'test', 'fixtures');
    for (const file of safeReaddir(fixturesDir)) {
      if (!file.endsWith('.md')) continue;
      const content = safeRead(join(fixturesDir, file));
      if (content === null) continue;
      for (const block of content.split(/\n{2,}/)) {
        const trimmed = block.trim();
        if (trimmed.length === 0) continue;
        if (trimmed.includes('\n')) continue;
        push(trimmed);
      }
    }
    return out;
  }
  if (name === 'css') {
    for (const s of CSS_BASELINE) push(s);
    // The css/test/cases/*.css fixtures cover real-world CSS that goes
    // well beyond what the reference interpreter handles (escapes,
    // raw decls, IE filters, custom properties with arbitrary values).
    // Those are explicitly out-of-scope for the interpreter's slow
    // trust-anchor role; including them surfaces divergences that are
    // already tracked in Phase 1/3 backlog rather than fuzzer-new bugs.
    return out;
  }
  if (name === 'html') {
    for (const s of HTML_BASELINE) push(s);
    // html/test/fixtures/phase-1/*.html holds attribute-heavy / multi-
    // child / void-element shapes — many are NOT value-stable under
    // round-trip via the interpreter's stringify (see comment in
    // interp-stringify.test.ts) AND go beyond the parse cases the
    // interpreter is wired for. Equivalence-only seeding works at the
    // baseline; the fixture pull is left to the longer `npm run fuzz`
    // path where divergences are reported, not asserted.
    return out;
  }
  return out;
}

function safeReaddir(dir: string): ReadonlyArray<string> {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function safeRead(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

// --- Driver ----------------------------------------------------------------

export type FuzzOptions = {
  // Pre-loaded schema setups. The caller (CLI / test wrapper) is
  // responsible for inferring schemas and importing the v2 generated
  // parsers — those imports cross compiler-package rootDir and so live
  // outside the tsc'd source tree.
  readonly setups: ReadonlyArray<SchemaSetup>;
  readonly seed?: number;
  // Soft time budget in milliseconds. The driver checks `Date.now()`
  // after each input; it doesn't preempt within an input.
  readonly durationMs?: number;
  // Hard input cap. Whichever budget (time or input count) hits first
  // ends the run.
  readonly maxInputs?: number;
  // When provided, restrict mutators to the named subset. Default: all.
  readonly mutators?: ReadonlyArray<Mutator>;
  // Stop at the first divergence per (schema, mutator)? Useful for the
  // test-mode wrapper that wants concise output. Defaults to false.
  readonly stopOnFirstPerMutator?: boolean;
  // Receives every report line. Defaults to console.log.
  readonly log?: (line: string) => void;
};

export type FuzzResult = {
  readonly inputsTried: number;
  readonly durationMs: number;
  readonly perSchema: ReadonlyMap<string, { inputs: number; divergences: number }>;
  readonly divergences: ReadonlyArray<Divergence>;
};

export async function runFuzz(opts: FuzzOptions): Promise<FuzzResult> {
  const log = opts.log ?? ((line: string) => console.log(line));
  const durationMs = opts.durationMs ?? 60_000;
  const maxInputs = opts.maxInputs ?? Number.POSITIVE_INFINITY;
  const stopPerMutator = opts.stopOnFirstPerMutator ?? false;
  const baseSeed = opts.seed ?? 0xc0ffee;
  const mutators = opts.mutators ?? allMutators;
  const setups = opts.setups;
  if (setups.length === 0) {
    throw new Error('runFuzz: opts.setups is empty — supply at least one SchemaSetup');
  }

  const start = Date.now();
  const perSchema = new Map<string, { inputs: number; divergences: number }>();
  for (const s of setups) {
    perSchema.set(s.name, { inputs: 0, divergences: 0 });
  }
  const divergences: Divergence[] = [];

  // Outer loop: each iteration cycles through (schema, seed, mutator).
  // RNG advances with each mutator call so reruns of the same baseSeed
  // produce the same stream.
  const rng = makeRng(baseSeed);
  let inputsTried = 0;

  // Track (schema, mutator)-keys for stop-on-first behavior.
  const reported = new Set<string>();

  // The caller supplies each schema's seed corpus on its SchemaSetup.

  // Loop order: (pass, mutator, schema, seed). Outer pass advances the
  // RNG for RNG-driven mutators; mutator is the innermost-but-one so we
  // interleave schemas evenly even when the input cap is small (every
  // mutator-pass touches every schema before moving on). Deterministic
  // mutators (identity / truncate / duplicate*) keep producing the same
  // variants on every pass — we dedupe via a (schema|input) seen-set so
  // they cost ~O(seeds) total instead of O(seeds * passes). The budget
  // guards exit.
  const seen = new Set<string>();
  outer: while (Date.now() - start < durationMs && inputsTried < maxInputs) {
    let anyNew = false;
    for (const mut of mutators) {
      for (const setup of setups) {
        if (stopPerMutator && reported.has(`${setup.name}|${mut.name}`)) continue;
        for (const seed of setup.seedCorpus) {
          const variants = mut(seed, rng);
          for (const v of variants) {
            const key = `${setup.name}|${v.input}`;
            if (seen.has(key)) continue;
            seen.add(key);
            if (Date.now() - start >= durationMs) break outer;
            if (inputsTried >= maxInputs) break outer;
            const result = runOne(setup, v);
            inputsTried++;
            const counters = perSchema.get(setup.name)!;
            counters.inputs++;
            anyNew = true;
            if (result) {
              counters.divergences++;
              divergences.push(result);
              log(formatDivergence(result));
              if (stopPerMutator) {
                reported.add(`${setup.name}|${mut.name}`);
                break;
              }
            }
          }
        }
      }
    }
    if (!anyNew) break; // every mutator's variants were already seen — done.
  }

  return {
    inputsTried,
    durationMs: Date.now() - start,
    perSchema,
    divergences,
  };
}

function runOne(setup: SchemaSetup, candidate: MutatedInput): Divergence | null {
  try {
    return compareOne(setup, candidate);
  } catch (e) {
    // compareOne already converts most thrown errors into reports, but
    // unexpected exceptions (typically from interp internal invariants)
    // bubble up here. Convert to a structured report so the fuzzer keeps
    // running.
    return {
      schema: setup.name,
      mutator: candidate.mutator,
      seed: candidate.seed,
      input: candidate.input,
      kind: 'interp-internal-error',
      detail: `unhandled exception from compareOne: ${String((e as Error).message)}`,
    };
  }
}

export function formatDivergence(d: Divergence): string {
  const lines: string[] = [];
  lines.push(
    `DIVERGENCE [${d.schema}] kind=${d.kind}${d.target ? ` target=${d.target}` : ''} mutator=${d.mutator}`,
  );
  lines.push(`  seed=${JSON.stringify(d.seed)}`);
  lines.push(`  input=${JSON.stringify(d.input)}`);
  lines.push(`  ${d.detail}`);
  if (d.interpValue !== undefined) {
    lines.push(`  interp=${safeStringify(d.interpValue)}`);
  }
  if (d.v2Value !== undefined) {
    lines.push(`  v2=${safeStringify(d.v2Value)}`);
  }
  return lines.join('\n');
}

function safeStringify(value: unknown): string {
  try {
    const s = JSON.stringify(value);
    if (s === undefined) return String(value);
    return s.length > 1000 ? `${s.slice(0, 1000)}…(truncated)` : s;
  } catch {
    return String(value);
  }
}

// --- Corpus persistence ----------------------------------------------------

// Stable hash for the failing input. We keep it short (8 hex chars) so
// file names stay reasonable; collisions are unlikely in practice but
// harmless (just overwrites the prior fixture).
export function hashInput(input: string): string {
  // FNV-1a 32-bit.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0).toString(16)).padStart(8, '0');
}

export type { Divergence };
