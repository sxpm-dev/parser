// Phase 6.5 — Rust backend differential parity.
//
// Goal: for each schema whose Rust emit compiles today, build a small
// stand-alone Cargo binary that wraps the emitted parser, run a fixture
// corpus through it via stdin/stdout, and assert byte/value parity with
// the TS backend's `render` + `stringify` on the same inputs.
//
// This is the compile-and-run companion to `rust-goldens.test.ts`. The
// goldens catch emit-side regressions (Rust source changed in a way we
// didn't intend); this test catches behavioral regressions (Rust source
// still compiles but parses or stringifies differently from TS).
//
// Opt-in: this test only runs when `RUST_DIFF=1` is set. Reasons:
//   1. rustc / cargo aren't a hard dependency of the repo — a contributor
//      working purely on the TS backend shouldn't be forced to install it.
//   2. cargo build is slow on the first run (10-30s per crate) and noisy in
//      regular `npm test` output.
//   3. The Rust backend is known to have parse / stringify divergences
//      surfaced by this very test (see "Known failures" below). Until those
//      land, gating the workspace gate on them would be a perpetual red.
//
// To run:    RUST_DIFF=1 npx tsx --test packages/compiler/test/rust-diff.test.ts
//
// Workdir: packages/compiler/test/.rust-diff/<schema>/ (gitignored).
// Each schema gets its own Cargo crate so cargo's incremental rebuild
// keeps per-test wall time near 1s after the first run.
//
// Known failures (Phase 6.5 follow-ups, tracked but not blocking):
//   - cron / iso-duration / pg-select render: Rust parser drops alts that
//     TS handles (`*/5` multi-prod dispatch, `P1Y2M3DT4H5M6S` multi-component
//     repeats, pg-select shared-prefix factoring for WHERE / LIMIT alts).
//   - cron / iso-duration / pg-select / toml stringify: trailing-empty slot
//     literals, mid-template boolean discriminant routing, and the same
//     parse-side issues bleed through.
// rrule passes end-to-end as of this commit.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { generateParser } from '../src/index.ts';
import { RUST_BACKEND } from '../src/emit/rust/index.ts';
import cronSchema from '../../cron/src/schema.ts';
import isoDurationSchema from '../../iso-duration/src/schema.ts';
import rruleSchema from '../../rrule/src/schema.ts';
import pgSelectSchema from '../../pg-select/src/schema.ts';
import tomlSchema from '../../toml/src/schema.ts';
import * as cronTs from '../../cron/src/index.ts';
import * as isoDurationTs from '../../iso-duration/src/index.ts';
import * as rruleTs from '../../rrule/src/index.ts';
import * as pgSelectTs from '../../pg-select/src/index.ts';
import * as tomlTs from '../../toml/src/index.ts';

interface TsRenderOpts {
  target: 'ast' | 'source';
  mode?: 'fast' | 'raws';
}
interface TsStringifyOpts {
  target: 'ast' | 'source';
}
interface TsApi {
  render(input: string, options: TsRenderOpts): unknown;
  stringify(value: unknown, options: TsStringifyOpts): string;
}

interface SchemaCase {
  readonly packageName: string;
  readonly schema: Parameters<typeof generateParser>[0];
  readonly ts: TsApi;
  readonly fixtures: ReadonlyArray<string>;
}

const here = dirname(fileURLToPath(import.meta.url));
const workRoot = resolve(here, '.rust-diff');
const ENABLED = process.env.RUST_DIFF === '1';

const CASES: ReadonlyArray<SchemaCase> = [
  { packageName: 'cron', schema: cronSchema, ts: cronTs as unknown as TsApi, fixtures: cronFixtures() },
  { packageName: 'iso-duration', schema: isoDurationSchema, ts: isoDurationTs as unknown as TsApi, fixtures: isoDurationFixtures() },
  { packageName: 'rrule', schema: rruleSchema, ts: rruleTs as unknown as TsApi, fixtures: rruleFixtures() },
  { packageName: 'pg-select', schema: pgSelectSchema, ts: pgSelectTs as unknown as TsApi, fixtures: pgSelectFixtures() },
  { packageName: 'toml', schema: tomlSchema, ts: tomlTs as unknown as TsApi, fixtures: tomlFixtures() },
];

// One detection pass shared across every case; the test still emits one
// `test()` per schema so the names are visible in the output even when all
// of them skip.
const RUST_AVAILABLE = ENABLED && detectRustToolchain();

for (const c of CASES) {
  test(`phase 6.5 rust diff: ${c.packageName}`, async (t) => {
    if (!ENABLED) {
      t.skip('opt-in test — set RUST_DIFF=1 to run');
      return;
    }
    if (!RUST_AVAILABLE) {
      assert.fail('RUST_DIFF=1 set but rustc / cargo not found on PATH');
    }

    const schemaDir = resolve(workRoot, c.packageName);
    prepareCrate(schemaDir, c.packageName, c.schema);

    const buildResult = spawnSync('cargo', ['build', '--release'], {
      cwd: schemaDir,
      env: { ...process.env, CARGO_TERM_COLOR: 'never' },
      encoding: 'utf8',
    });
    if (buildResult.status !== 0) {
      assert.fail(
        `cargo build failed for ${c.packageName}:\nSTDOUT:\n${buildResult.stdout}\nSTDERR:\n${buildResult.stderr}`,
      );
    }

    const binPath = resolve(schemaDir, 'target', 'release', `${c.packageName}-rust-diff`);
    // Drive the binary: one fixture per line on stdin, one result per line
    // on stdout. The order is preserved so we can zip-compare.
    const stdinPayload = c.fixtures.join('\n') + '\n';
    const runResult = spawnSync(binPath, [], {
      input: stdinPayload,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (runResult.status !== 0) {
      assert.fail(
        `rust-diff binary failed for ${c.packageName} (status ${runResult.status}):\nSTDERR:\n${runResult.stderr}`,
      );
    }
    const rustLines = runResult.stdout.split('\n');
    if (rustLines.length > 0 && rustLines[rustLines.length - 1] === '') rustLines.pop();
    assert.equal(
      rustLines.length,
      c.fixtures.length,
      `rust binary returned ${rustLines.length} lines for ${c.fixtures.length} fixtures`,
    );

    // Two independent parity checks: render alone, and stringify(render).
    // A stringify-only divergence (e.g. inter-slot whitespace) shouldn't
    // mask the fact that render itself matches; the inverse holds when a
    // schema's parser path drifts but the inverse emit happens to coincide.
    const renderMismatches: Array<{ idx: number; input: string; ts: string; rust: string }> = [];
    const stringifyMismatches: Array<{ idx: number; input: string; ts: string; rust: string }> = [];
    for (let i = 0; i < c.fixtures.length; i++) {
      const input = c.fixtures[i]!;
      const tsParts = tsExpectedParts(c.ts, input);
      const rustParts = splitDriverLine(rustLines[i]!);
      if (tsParts.render !== rustParts.render) {
        renderMismatches.push({ idx: i, input, ts: tsParts.render, rust: rustParts.render });
      }
      if (tsParts.stringify !== rustParts.stringify) {
        stringifyMismatches.push({ idx: i, input, ts: tsParts.stringify, rust: rustParts.stringify });
      }
    }

    await t.test(`render parity (${c.packageName})`, () => {
      if (renderMismatches.length === 0) return;
      const sample = renderMismatches.slice(0, 3).map((m) =>
        `  fixture[${m.idx}] '${m.input}'\n    ts:   ${m.ts}\n    rust: ${m.rust}`,
      ).join('\n');
      assert.fail(
        `${renderMismatches.length} / ${c.fixtures.length} render mismatches:\n${sample}`,
      );
    });

    await t.test(`stringify parity (${c.packageName})`, () => {
      if (stringifyMismatches.length === 0) return;
      const sample = stringifyMismatches.slice(0, 3).map((m) =>
        `  fixture[${m.idx}] '${m.input}'\n    ts:   ${m.ts}\n    rust: ${m.rust}`,
      ).join('\n');
      assert.fail(
        `${stringifyMismatches.length} / ${c.fixtures.length} stringify mismatches:\n${sample}`,
      );
    });
  });
}

interface DriverParts {
  readonly render: string;
  readonly stringify: string;
}

function splitDriverLine(line: string): DriverParts {
  // Format from main.rs: "OK\t<render>\t<stringify>" or "ERR\t<message>".
  // ERR lines route the message into the render slot so a parse failure
  // surfaces as a render divergence (not a stringify one).
  if (line.startsWith('OK\t')) {
    const rest = line.slice(3);
    const tab = rest.indexOf('\t');
    if (tab < 0) return { render: rest, stringify: '' };
    return { render: rest.slice(0, tab), stringify: rest.slice(tab + 1) };
  }
  return { render: line, stringify: '' };
}

// --- crate scaffolding -----------------------------------------------------

function prepareCrate(dir: string, packageName: string, schema: SchemaCase['schema']): void {
  mkdirSync(resolve(dir, 'src'), { recursive: true });
  const rustCode = generateParser(schema, undefined, {
    backend: RUST_BACKEND,
    packageName,
  });
  // The emit already has `use std::fmt;` at the top. We append `use std::io`,
  // the driver `main`, and rely on the emitted Display impl for the
  // canonical render serialization.
  const driver = `\n// === appended by rust-diff.test.ts ===\nuse std::io::{self, BufRead, Write};\n\nfn main() {\n    let stdin = io::stdin();\n    let stdout = io::stdout();\n    let mut out = stdout.lock();\n    let mut buf = String::new();\n    for line in stdin.lock().lines() {\n        let input = match line {\n            Ok(s) => s,\n            Err(_) => break,\n        };\n        buf.clear();\n        match render(&input) {\n            Ok(v) => {\n                let s = stringify(&v);\n                buf.push_str(\"OK\\t\");\n                buf.push_str(&format!(\"{}\", v));\n                buf.push('\\t');\n                buf.push_str(&s);\n            }\n            Err(e) => {\n                buf.push_str(\"ERR\\t\");\n                buf.push_str(&e);\n            }\n        }\n        writeln!(out, \"{}\", buf).expect(\"write stdout\");\n    }\n}\n`;
  writeAtomic(resolve(dir, 'src', 'main.rs'), rustCode + driver);
  writeAtomic(
    resolve(dir, 'Cargo.toml'),
    `[package]\nname = "${packageName}-rust-diff"\nversion = "0.0.0"\nedition = "2021"\n\n[[bin]]\nname = "${packageName}-rust-diff"\npath = "src/main.rs"\n\n[profile.release]\nopt-level = 1\nlto = false\ndebug-assertions = false\n`,
  );
}

function writeAtomic(path: string, content: string): void {
  // Skip the write if the on-disk bytes are already identical — cargo
  // looks at mtime, and rewriting the same file invalidates the
  // incremental build cache, which means every `npm test` becomes a full
  // recompile. Idempotent writes give us ~1s per-test instead of ~30s.
  try {
    const prev = readFileSync(path, 'utf8');
    if (prev === content) return;
  } catch {
    // No existing file — fall through to write.
  }
  writeFileSync(path, content);
}

// --- toolchain detection ---------------------------------------------------

function detectRustToolchain(): boolean {
  // Honour an explicit `RUSTUP_HOME` / `CARGO_HOME` setup — but rustup's
  // standard layout drops the binaries in `$HOME/.cargo/bin`, which isn't
  // always on PATH in the shell that runs `npm test` (especially when the
  // user installed via the standard installer but only configured their
  // login shell). Augment PATH if .cargo/bin exists, then probe.
  const home = process.env.HOME;
  if (home) {
    const cargoBin = resolve(home, '.cargo', 'bin');
    const sep = process.platform === 'win32' ? ';' : ':';
    const path = process.env.PATH ?? '';
    if (!path.split(sep).includes(cargoBin)) {
      process.env.PATH = `${cargoBin}${sep}${path}`;
    }
  }
  const cargoVersion = spawnSync('cargo', ['--version'], { encoding: 'utf8' });
  const rustcVersion = spawnSync('rustc', ['--version'], { encoding: 'utf8' });
  return cargoVersion.status === 0 && rustcVersion.status === 0;
}

// --- TS-side canonical encoding --------------------------------------------

/** Mirror of the Rust `Display` impl on the emitted `Value` enum (see
 *  `packages/compiler/src/emit/rust/index.ts` preamble). The Rust side
 *  uses this format to print render results; we mirror it on the TS side
 *  so the diff is byte-stable string-vs-string.
 *
 *  Specifically:
 *   - null            → "null"
 *   - bool            → "true" / "false"
 *   - number          → Rust's `format!("{}", f64)` — finite values match
 *                       JS `String(n)` for integers and simple decimals
 *   - string          → `"<text>"` with only `\\` and `"` escaped
 *   - array           → `[v1,v2,...]`
 *   - object          → `{"k1":v1,"k2":v2,...}` (insertion order preserved)
 *
 *  This is NOT standard JSON — it's deliberately the Rust side's format
 *  so a parity test compares like for like.
 */
function rustDisplay(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (Array.isArray(v)) return `[${v.map(rustDisplay).join(',')}]`;
  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>);
    return `{${entries.map(([k, val]) => `"${k.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}":${rustDisplay(val)}`).join(',')}}`;
  }
  throw new Error(`rustDisplay: unsupported value type for ${String(v)}`);
}

function tsExpectedParts(api: TsApi, input: string): DriverParts {
  // The Rust emit defaults to the schema's first-declared render target —
  // every in-scope schema declares `ast` first (or only). Mirror that on
  // the TS side by passing target: 'ast' explicitly.
  try {
    const value = api.render(input, { target: 'ast' });
    const stringified = api.stringify(value, { target: 'ast' });
    return { render: rustDisplay(value), stringify: stringified };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Route TS-side errors into the render slot — same convention as the
    // Rust driver — so an unexpected parse failure surfaces under render.
    return { render: `ERR\t${message}`, stringify: '' };
  }
}

// --- fixtures --------------------------------------------------------------
//
// Each schema gets a curated list of valid inputs that exercise its
// representative shapes. Kept small (10-20 inputs) so a fresh build runs in
// reasonable time; the test asserts parity on every fixture so even a small
// set catches any divergence between backends.

function cronFixtures(): string[] {
  return [
    '* * * * *',
    '*/5 * * * *',
    '0 9 * * 1',
    '15 14 1 * *',
    '0 0 * * 0',
    '30 4 1 1 *',
  ];
}

function isoDurationFixtures(): string[] {
  return [
    'P1Y2M3DT4H5M6S',
    'PT15M',
    'P2W',
    'P10D',
    'PT1H',
    'PT45S',
    'P1DT1H',
    'P1Y2M',
    'PT4H5M',
  ];
}

function rruleFixtures(): string[] {
  return [
    'FREQ=DAILY',
    'FREQ=DAILY;COUNT=10',
    'FREQ=DAILY;INTERVAL=2',
    'FREQ=WEEKLY;BYDAY=MO',
    'FREQ=WEEKLY;BYDAY=MO,WE,FR',
    'FREQ=MONTHLY;BYMONTHDAY=1,15',
    'FREQ=MONTHLY;COUNT=12',
    'FREQ=YEARLY;BYMONTH=1',
  ];
}

function pgSelectFixtures(): string[] {
  return [
    'SELECT * FROM users',
    'SELECT id FROM users',
    'SELECT name FROM users WHERE id = 42',
    'SELECT * FROM orders WHERE total > 100',
    'SELECT a FROM t WHERE x <= 10',
    'SELECT name FROM people WHERE age >= 18',
    'SELECT * FROM users LIMIT 25',
    'SELECT id FROM users WHERE active = 1 LIMIT 10',
  ];
}

function tomlFixtures(): string[] {
  return [
    'title = "parser benchmark"',
    'count = 42',
    'active = true',
    'disabled = false',
    'name = "alice"',
    'home = "/home/alice"',
    'retries = 3',
    'timeout = 30',
  ];
}
