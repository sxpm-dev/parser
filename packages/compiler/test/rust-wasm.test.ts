// Phase 6.6 — Rust backend wasm32-unknown-unknown build smoke test.
//
// Companion to rust-diff.test.ts. The differential test proves the
// emitted Rust parser matches the TS backend's behavior on native; this
// test proves the SAME emit compiles to wasm32 and produces a `.wasm`
// binary with the expected C-ABI exports a browser host can call.
//
// What we verify:
//   1. The emit's `#[cfg(target_arch = "wasm32")] mod __wasm_exports`
//      block compiles cleanly under wasm32-unknown-unknown.
//   2. The output `.wasm` file contains the four exports the host
//      depends on (parser_alloc, parser_dealloc, parser_render,
//      parser_stringify, parser_result_ptr).
//   3. Round-trip a fixture through a stand-alone wasm runtime — sanity
//      check that the binary actually runs end-to-end, not just links.
//
// Opt-in: only runs when `RUST_WASM=1`. Same rationale as rust-diff —
// contributors working purely on the TS backend shouldn't pay the
// rustc / wasm32 toolchain cost on every `npm test`.
//
// To run:    RUST_WASM=1 npx tsx --test packages/compiler/test/rust-wasm.test.ts
//
// Workdir: packages/compiler/test/.rust-wasm/<schema>/  (gitignored).
// One Cargo crate per schema, configured as a `cdylib` so cargo emits
// a `.wasm` file straight from `cargo build --target wasm32-unknown-
// unknown --release`. No wasm-bindgen, no wasm-pack — the emit's
// pledge of "no external runtime" extends through the wasm path.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { generateParser } from '../src/index.ts';
import { RUST_BACKEND } from '../src/emit/rust/index.ts';
import rruleSchema from '../../rrule/src/schema.ts';
import isoDurationSchema from '../../iso-duration/src/schema.ts';

interface WasmCase {
  readonly packageName: string;
  readonly schema: Parameters<typeof generateParser>[0];
  // One smoke-test fixture per schema — render-and-roundtrip-through-
  // stringify, just to confirm the binary actually executes.
  readonly fixture: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const workRoot = resolve(here, '.rust-wasm');
const ENABLED = process.env.RUST_WASM === '1';

// rrule and iso-duration both have full rust-diff parity today and have
// small grammar surfaces, so a clean wasm build proves the emit's
// wasm32 compatibility without dragging in larger compile times.
const CASES: ReadonlyArray<WasmCase> = [
  { packageName: 'rrule', schema: rruleSchema, fixture: 'FREQ=DAILY' },
  { packageName: 'iso-duration', schema: isoDurationSchema, fixture: 'P1DT1H' },
];

const RUST_AVAILABLE = ENABLED && detectRustWasmToolchain();

for (const c of CASES) {
  test(`phase 6.6 rust wasm: ${c.packageName}`, async (t) => {
    if (!ENABLED) {
      t.skip('opt-in test — set RUST_WASM=1 to run');
      return;
    }
    if (!RUST_AVAILABLE) {
      assert.fail('RUST_WASM=1 set but rustc / cargo / wasm32 target not found');
    }

    const schemaDir = resolve(workRoot, c.packageName);
    prepareCrate(schemaDir, c.packageName, c.schema);

    const buildResult = spawnSync(
      'cargo',
      ['build', '--release', '--target', 'wasm32-unknown-unknown'],
      {
        cwd: schemaDir,
        env: { ...process.env, CARGO_TERM_COLOR: 'never' },
        encoding: 'utf8',
      },
    );
    if (buildResult.status !== 0) {
      assert.fail(
        `cargo wasm build failed for ${c.packageName}:\nSTDOUT:\n${buildResult.stdout}\nSTDERR:\n${buildResult.stderr}`,
      );
    }

    const wasmPath = resolve(
      schemaDir,
      'target',
      'wasm32-unknown-unknown',
      'release',
      `${rustCrateName(c.packageName)}.wasm`,
    );
    let wasmBytes: Buffer;
    try {
      wasmBytes = readFileSync(wasmPath);
    } catch (err) {
      assert.fail(`expected wasm output at ${wasmPath}: ${(err as Error).message}`);
      return;
    }

    // Instantiate and exercise the binary. The default rustc-generated
    // cdylib already exports `memory`, so the host just needs to read
    // exports off the instance directly.
    const wasmModule = await WebAssembly.compile(new Uint8Array(wasmBytes));
    const instance = await WebAssembly.instantiate(wasmModule, {});
    const exports = instance.exports as unknown as {
      memory: WebAssembly.Memory;
      parser_alloc: (size: number) => number;
      parser_dealloc: (ptr: number, size: number) => void;
      parser_render: (ptr: number, len: number) => number;
      parser_stringify: (ptr: number, len: number) => number;
      parser_result_ptr: () => number;
    };

    // Every required export must be present.
    const requiredExports = [
      'memory',
      'parser_alloc',
      'parser_dealloc',
      'parser_render',
      'parser_stringify',
      'parser_result_ptr',
    ];
    for (const name of requiredExports) {
      assert.ok(
        name in exports,
        `wasm binary for ${c.packageName} missing export '${name}'`,
      );
    }

    // Round-trip the fixture through render + stringify.
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const inputBytes = encoder.encode(c.fixture);
    const inputPtr = exports.parser_alloc(inputBytes.length);
    new Uint8Array(exports.memory.buffer, inputPtr, inputBytes.length).set(inputBytes);

    const renderLen = exports.parser_render(inputPtr, inputBytes.length);
    const renderPtr = exports.parser_result_ptr();
    const renderOut = decoder.decode(
      new Uint8Array(exports.memory.buffer.slice(renderPtr, renderPtr + renderLen)),
    );
    assert.ok(
      !renderOut.startsWith('ERR:'),
      `${c.packageName} parser_render error: ${renderOut}`,
    );

    const stringifyLen = exports.parser_stringify(inputPtr, inputBytes.length);
    const stringifyPtr = exports.parser_result_ptr();
    const stringifyOut = decoder.decode(
      new Uint8Array(
        exports.memory.buffer.slice(stringifyPtr, stringifyPtr + stringifyLen),
      ),
    );
    assert.ok(
      !stringifyOut.startsWith('ERR:'),
      `${c.packageName} parser_stringify error: ${stringifyOut}`,
    );

    exports.parser_dealloc(inputPtr, inputBytes.length);
  });
}

function rustCrateName(packageName: string): string {
  // cargo replaces hyphens with underscores when computing the output
  // file name for a cdylib. Mirror that here.
  return packageName.replace(/-/g, '_');
}

function prepareCrate(
  dir: string,
  packageName: string,
  schema: WasmCase['schema'],
): void {
  mkdirSync(resolve(dir, 'src'), { recursive: true });
  const rustCode = generateParser(schema, undefined, {
    backend: RUST_BACKEND,
    packageName,
  });
  // The emit defines `pub fn render` / `pub fn stringify` at module
  // scope, plus the `__wasm_exports` cfg-gated block. To compile as a
  // cdylib we just expose them as the crate root.
  writeAtomic(resolve(dir, 'src', 'lib.rs'), rustCode);
  const crateName = rustCrateName(packageName);
  writeAtomic(
    resolve(dir, 'Cargo.toml'),
    `[package]\nname = "${crateName}"\nversion = "0.0.0"\nedition = "2021"\n\n[lib]\nname = "${crateName}"\ncrate-type = ["cdylib"]\npath = "src/lib.rs"\n\n[profile.release]\nopt-level = "z"\nlto = false\ndebug-assertions = false\n# strip the size-bloating panic machinery; the parser's panics are\n# programmer-error only — the public surface returns Result/Option.\npanic = "abort"\n`,
  );
}

function writeAtomic(path: string, content: string): void {
  // Same idempotent-write trick as rust-diff: cargo's incremental
  // rebuild is mtime-based, so rewriting identical bytes wastes the
  // cache. Keep per-test wall time near 1s on warm runs.
  try {
    const prev = readFileSync(path, 'utf8');
    if (prev === content) return;
  } catch {
    // No existing file — fall through to write.
  }
  writeFileSync(path, content);
}

function detectRustWasmToolchain(): boolean {
  // Mirror rust-diff's detection but also probe for the wasm32 target.
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
  if (cargoVersion.status !== 0 || rustcVersion.status !== 0) return false;
  const targets = spawnSync('rustup', ['target', 'list', '--installed'], {
    encoding: 'utf8',
  });
  if (targets.status !== 0) return false;
  return targets.stdout.split('\n').some((line) => line.trim() === 'wasm32-unknown-unknown');
}
