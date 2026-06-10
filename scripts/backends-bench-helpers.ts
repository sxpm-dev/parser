// Shared scaffolding for per-package cross-backend benchmarks.
//
// Each parser package keeps its own bench/cross-backend.ts to stay
// consistent with the existing bench/parse.ts pattern (same harness,
// same input generators, same output format — the only difference is
// the competitor list). This module provides the bits that don't
// belong inline in any one of those files:
//
//   - loadRustWasm() — cargo build + WebAssembly load + a closure that
//     mirrors the TS / bcode `render` shape. Reuses ~/.bench-cache so
//     subsequent runs hit the warm wasm artifact.
//   - parseOnlyArg() — reads `--only ts,bcode,rust` from process.argv
//     so per-package scripts (`bench:rs`, `bench:bcode`) can filter
//     the contestants list without each file re-parsing flags.
//   - filterContestants() — drops contestants whose label suffix
//     doesn't match the active --only set.
//   - withSpaceBefore — convenience to label contestants by backend.

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ONLY_ALIASES: Record<string, string> = { rs: 'rust', bytecode: 'bcode' };
const KNOWN_BACKENDS = new Set(['ts', 'bcode', 'rust']);

/** Parse `--only x,y,z` out of process.argv. Aliases: `rs` ⇒ `rust`,
 *  `bytecode` ⇒ `bcode`. Returns null when no filter is requested
 *  (every backend should run). Throws on unknown keys so a typo
 *  doesn't silently no-op. */
export function parseOnlyArg(): Set<string> | null {
  const argv = process.argv.slice(2);
  let raw: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--only') {
      raw = argv[++i];
      if (raw === undefined) throw new Error('--only requires a value (e.g. --only ts,rust)');
    } else if (a.startsWith('--only=')) {
      raw = a.slice('--only='.length);
    }
  }
  if (raw === undefined || raw === '') return null;
  const out = new Set<string>();
  for (const part of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
    const key = ONLY_ALIASES[part] ?? part;
    if (!KNOWN_BACKENDS.has(key)) {
      throw new Error(`Unknown backend '${part}'. Choices: ts, bcode, rust (aliases rs / bytecode).`);
    }
    out.add(key);
  }
  return out.size === 0 ? null : out;
}

/** Filter a Contestant list by the active --only set. Each contestant's
 *  `label` is expected to end with `(<backend>)` — e.g. `parser2 rrule
 *  parse (ts)`. Contestants without a recognised suffix pass through.
 *  Null entries (e.g. a backend whose load failed) are stripped. */
export function filterContestants<T extends { readonly label: string }>(
  contestants: ReadonlyArray<T | null>,
  only: ReadonlySet<string> | null,
): T[] {
  const out: T[] = [];
  for (const c of contestants) {
    if (c === null) continue;
    if (only === null) { out.push(c); continue; }
    const match = c.label.match(/\(([a-z-]+)\)\s*$/);
    if (!match) { out.push(c); continue; } // unlabeled — always keep
    const tag = match[1]!;
    const normalized = tag === 'rust-wasm' ? 'rust' : tag;
    if (only.has(normalized)) out.push(c);
  }
  return out;
}

/** Build + load the wasm32-unknown-unknown binary for a generated
 *  `parser.rs`, and return a small closure that runs one render. Throws
 *  on cargo failure or missing toolchain so the caller can degrade to
 *  null (and the contestant gets dropped from the bench).
 *
 *  `packageDir` is the absolute path to the parser package root (i.e.
 *  `packages/<schema>`). The generated source is read from
 *  `<packageDir>/src/_generated/parser.rs`, and the wasm crate is
 *  scaffolded under `<repoRoot>/.bench-cache/wasm/<schemaName>`.
 *
 *  The returned render() throws on parse errors so the bench's per-row
 *  iterator can record the failure rather than silently scoring a wasm
 *  contestant that's returning ERR: payloads. */
export interface RustWasmBackend {
  readonly render: (input: string) => void;
}

export async function loadRustWasm(
  schemaName: string,
  packageDir: string,
  repoRoot: string,
): Promise<RustWasmBackend> {
  ensureCargoOnPath();
  const crateName = schemaName.replace(/-/g, '_');
  const cacheDir = resolve(repoRoot, '.bench-cache', 'wasm', schemaName);
  mkdirSync(resolve(cacheDir, 'src'), { recursive: true });

  const rsSource = readFileSync(
    resolve(packageDir, 'src', '_generated', 'parser.rs'),
    'utf8',
  );
  writeAtomic(resolve(cacheDir, 'src', 'lib.rs'), rsSource);
  // opt-level 3 + LTO produces a faster wasm at the cost of ~10s extra
  // first-build time. The bench is the right place to spend that —
  // size-conscious browser builds can still pick opt-level "z" with a
  // separate Cargo.toml.
  writeAtomic(
    resolve(cacheDir, 'Cargo.toml'),
    `[package]\nname = "${crateName}"\nversion = "0.0.0"\nedition = "2021"\n\n[lib]\nname = "${crateName}"\ncrate-type = ["cdylib"]\npath = "src/lib.rs"\n\n[profile.release]\nopt-level = 3\nlto = "fat"\ndebug-assertions = false\npanic = "abort"\ncodegen-units = 1\n`,
  );

  const build = spawnSync(
    'cargo',
    ['build', '--release', '--target', 'wasm32-unknown-unknown'],
    {
      cwd: cacheDir,
      env: { ...process.env, CARGO_TERM_COLOR: 'never' },
      encoding: 'utf8',
    },
  );
  if (build.status !== 0) {
    throw new Error(`cargo wasm build failed for ${schemaName}:\n${build.stdout}\n${build.stderr}`);
  }

  const wasmPath = resolve(
    cacheDir,
    'target',
    'wasm32-unknown-unknown',
    'release',
    `${crateName}.wasm`,
  );
  const bytes = readFileSync(wasmPath);
  const module = await WebAssembly.compile(new Uint8Array(bytes));
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
    render(input: string): void {
      const inBytes = encoder.encode(input);
      const ptr = exp.parser_alloc(inBytes.length);
      new Uint8Array(exp.memory.buffer, ptr, inBytes.length).set(inBytes);
      const outLen = exp.parser_render(ptr, inBytes.length);
      // Peek the first 4 bytes of the result for an ERR: prefix without
      // decoding the whole buffer. Lets us fail fast on parse errors
      // without paying TextDecoder cost on the success path.
      if (outLen >= 4) {
        const headPtr = exp.parser_result_ptr();
        const head = new Uint8Array(exp.memory.buffer, headPtr, 4);
        if (head[0] === 0x45 && head[1] === 0x52 && head[2] === 0x52 && head[3] === 0x3a) {
          const all = new Uint8Array(exp.memory.buffer.slice(headPtr, headPtr + outLen));
          exp.parser_dealloc(ptr, inBytes.length);
          throw new Error(new TextDecoder().decode(all));
        }
      }
      exp.parser_dealloc(ptr, inBytes.length);
    },
  };
}

function ensureCargoOnPath(): void {
  const home = process.env.HOME;
  if (!home) return;
  const cargoBin = resolve(home, '.cargo', 'bin');
  const sep = process.platform === 'win32' ? ';' : ':';
  const path = process.env.PATH ?? '';
  if (!path.split(sep).includes(cargoBin)) {
    process.env.PATH = `${cargoBin}${sep}${path}`;
  }
}

function writeAtomic(path: string, content: string): void {
  // Same idempotent-write trick rust-diff / rust-wasm tests use: cargo's
  // incremental rebuild is mtime-based, so rewriting identical bytes
  // wastes the cache. Keep warm bench runs near 0.2s.
  try {
    if (readFileSync(path, 'utf8') === content) return;
  } catch {
    // No existing file — fall through.
  }
  writeFileSync(path, content);
}
