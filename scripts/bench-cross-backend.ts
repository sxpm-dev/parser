// Cross-backend benchmark — same schema, same fixtures, three render
// implementations. Builds a side-by-side ops/s table so the cost of
// each backend's runtime shape is visible at a glance.
//
// Backends compared:
//   - TS      : `_generated/parser.ts` — straight-line specialized code,
//               no runtime dependency. The default the project ships.
//   - bcode   : `_generated/parser.bcode.ts` — emitted bytecode plus a
//               small shared interpreter at `@parser2/compiler/bytecode/
//               runtime`. Trades raw speed for smaller emitted artifact
//               and a single runtime payload.
//   - rust    : `_generated/parser.rs` compiled to wasm32-unknown-unknown
//               + driven through the Phase 6.6 extern "C" exports. Loaded
//               via the host's built-in WebAssembly runtime.
//
// Schema scope: only schemas whose Rust + bcode emit succeed today.
// CSS / HTML / toml hit known per-backend gaps (Rust: `comment` span
// class; bcode: multi-role recursive stringify); each one is its own
// follow-up to land. See docs/superpowers/plans/2026-06-06-9-10-
// roadmap.md "Open work" for the tracked items.
//
// Run from repo root: `npm run bench:cross-backend`.
// The bench:cross-backend npm script runs `generate:all` first so the
// `_generated/` artifacts are fresh.

import { Bench } from 'tinybench';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface SchemaCase {
  readonly name: string;
  readonly fixtures: ReadonlyArray<{ readonly label: string; readonly input: string }>;
}

const CASES: ReadonlyArray<SchemaCase> = [
  {
    name: 'rrule',
    fixtures: [
      { label: 'simple', input: 'FREQ=DAILY' },
      { label: 'with-count', input: 'FREQ=DAILY;COUNT=10' },
      { label: 'weekday-list', input: 'FREQ=WEEKLY;BYDAY=MO,WE,FR' },
    ],
  },
  {
    name: 'iso-duration',
    fixtures: [
      { label: 'short', input: 'PT15M' },
      { label: 'date+time', input: 'P1DT1H' },
      { label: 'full', input: 'P1Y2M3DT4H5M6S' },
    ],
  },
  {
    name: 'pg-select',
    fixtures: [
      { label: 'minimal', input: 'SELECT * FROM users' },
      { label: 'where', input: 'SELECT name FROM users WHERE id = 42' },
      { label: 'where+limit', input: 'SELECT id FROM users WHERE active = 1 LIMIT 10' },
    ],
  },
  {
    name: 'cron',
    fixtures: [
      { label: 'wildcard', input: '* * * * *' },
      { label: 'step', input: '*/5 * * * *' },
      { label: 'mixed', input: '0 9 7 8 1-5' },
    ],
  },
];

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const wasmCacheDir = resolve(repoRoot, '.bench-cache', 'wasm');

interface BackendFn {
  readonly label: string;
  readonly render: (input: string) => unknown;
}

async function loadBackends(schemaName: string): Promise<ReadonlyArray<BackendFn | null>> {
  const out: Array<BackendFn | null> = [];

  // TS backend — direct dynamic import.
  try {
    const tsMod = (await import(
      resolve(repoRoot, 'packages', schemaName, 'src', '_generated', 'parser.ts')
    )) as { render: (input: string, opts?: { target: string }) => unknown };
    out.push({
      label: 'ts',
      render: (input) => tsMod.render(input, { target: 'ast' }),
    });
  } catch (err) {
    console.error(`  [ts] load failed: ${(err as Error).message}`);
    out.push(null);
  }

  // Bytecode backend — same import shape.
  try {
    const bcodeMod = (await import(
      resolve(repoRoot, 'packages', schemaName, 'src', '_generated', 'parser.bcode.ts')
    )) as { render: (input: string, opts?: { target: string }) => unknown };
    out.push({
      label: 'bcode',
      render: (input) => bcodeMod.render(input, { target: 'ast' }),
    });
  } catch (err) {
    console.error(`  [bcode] load failed: ${(err as Error).message}`);
    out.push(null);
  }

  // Rust → wasm32. Compile-and-cache once per schema; reuse the .wasm
  // bytes on subsequent bench runs. Skip gracefully if cargo/wasm32 is
  // missing rather than aborting the whole run.
  try {
    const wasm = await loadWasmBackend(schemaName);
    out.push(wasm);
  } catch (err) {
    console.error(`  [rust-wasm] unavailable: ${(err as Error).message}`);
    out.push(null);
  }

  return out;
}

async function loadWasmBackend(schemaName: string): Promise<BackendFn> {
  mkdirSync(wasmCacheDir, { recursive: true });
  const crateName = schemaName.replace(/-/g, '_');
  const crateDir = resolve(wasmCacheDir, schemaName);
  const wasmPath = resolve(
    crateDir,
    'target',
    'wasm32-unknown-unknown',
    'release',
    `${crateName}.wasm`,
  );

  // Mirror packages/compiler/test/rust-wasm.test.ts crate scaffolding —
  // a cdylib lib.rs that re-exports the generated parser source, plus a
  // small Cargo.toml configured for wasm32 with panic=abort and opt-level
  // 'z' to keep the binary small. The bench result is independent of
  // opt-level beyond a constant factor; we pick a setting that compiles
  // fast and runs reasonably.
  const rsSource = readFileSync(
    resolve(repoRoot, 'packages', schemaName, 'src', '_generated', 'parser.rs'),
    'utf8',
  );
  mkdirSync(resolve(crateDir, 'src'), { recursive: true });
  writeAtomic(resolve(crateDir, 'src', 'lib.rs'), rsSource);
  writeAtomic(
    resolve(crateDir, 'Cargo.toml'),
    `[package]\nname = "${crateName}"\nversion = "0.0.0"\nedition = "2021"\n\n[lib]\nname = "${crateName}"\ncrate-type = ["cdylib"]\npath = "src/lib.rs"\n\n[profile.release]\nopt-level = "z"\nlto = false\ndebug-assertions = false\npanic = "abort"\n`,
  );

  // Augment PATH to include rustup's default install dir — mirror the
  // probe in rust-diff.test.ts. Without this the spawnSync below would
  // fail with ENOENT on a stock install that didn't add ~/.cargo/bin to
  // the user's login PATH.
  const home = process.env.HOME;
  if (home) {
    const cargoBin = resolve(home, '.cargo', 'bin');
    const sep = process.platform === 'win32' ? ';' : ':';
    const path = process.env.PATH ?? '';
    if (!path.split(sep).includes(cargoBin)) {
      process.env.PATH = `${cargoBin}${sep}${path}`;
    }
  }

  const build = spawnSync(
    'cargo',
    ['build', '--release', '--target', 'wasm32-unknown-unknown'],
    {
      cwd: crateDir,
      env: { ...process.env, CARGO_TERM_COLOR: 'never' },
      encoding: 'utf8',
    },
  );
  if (build.status !== 0) {
    throw new Error(
      `cargo wasm build failed for ${schemaName}:\n${build.stdout}\n${build.stderr}`,
    );
  }

  const wasmBytes = readFileSync(wasmPath);
  const module = await WebAssembly.compile(new Uint8Array(wasmBytes));
  const instance = await WebAssembly.instantiate(module, {});
  const exp = instance.exports as unknown as {
    memory: WebAssembly.Memory;
    parser_alloc: (size: number) => number;
    parser_dealloc: (ptr: number, size: number) => void;
    parser_render: (ptr: number, len: number) => number;
    parser_result_ptr: () => number;
  };
  const encoder = new TextEncoder();

  return {
    label: 'rust(wasm)',
    render: (input) => {
      const bytes = encoder.encode(input);
      const ptr = exp.parser_alloc(bytes.length);
      new Uint8Array(exp.memory.buffer, ptr, bytes.length).set(bytes);
      const outLen = exp.parser_render(ptr, bytes.length);
      exp.parser_dealloc(ptr, bytes.length);
      // For benchmarking we don't decode the result — the host-side
      // TextDecoder.decode work would dominate small inputs and unfairly
      // penalise the wasm row. Returning the length confirms the call
      // executed and that the result buffer is populated.
      return outLen;
    },
  };
}

function writeAtomic(path: string, content: string): void {
  try {
    if (readFileSync(path, 'utf8') === content) return;
  } catch {
    // No existing file — fall through.
  }
  writeFileSync(path, content);
}

async function main(): Promise<void> {
  // Per-fixture column width — labels + ops/s fit in 24 chars comfortably.
  const colWidth = 22;
  for (const schema of CASES) {
    console.log(`\n=== ${schema.name} ===`);
    const backends = await loadBackends(schema.name);
    const labels = backends.map((b, i) => b?.label ?? `slot${i}-unavailable`);

    // Header row
    console.log('fixture'.padEnd(18) + labels.map((l) => l.padStart(colWidth)).join(''));
    console.log('-'.repeat(18 + colWidth * labels.length));

    for (const { label, input } of schema.fixtures) {
      const bench = new Bench({ time: 200, warmupIterations: 50, iterations: 1 });
      for (const b of backends) {
        if (!b) continue;
        bench.add(b.label, () => b.render(input));
      }
      await bench.run();
      const opsByLabel = new Map<string, string>();
      for (const task of bench.tasks) {
        const hz = task.result?.hz;
        opsByLabel.set(task.name, hz === undefined ? 'err' : formatOps(hz));
      }
      const cells = backends.map((b) =>
        b === null ? 'N/A' : (opsByLabel.get(b.label) ?? 'err'),
      );
      console.log(label.padEnd(18) + cells.map((c) => c.padStart(colWidth)).join(''));
    }
  }
}

function formatOps(hz: number): string {
  if (hz >= 1_000_000) return `${(hz / 1_000_000).toFixed(2)}M ops/s`;
  if (hz >= 1_000) return `${(hz / 1_000).toFixed(2)}K ops/s`;
  return `${hz.toFixed(0)} ops/s`;
}

await main();
