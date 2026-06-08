import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { generateParser } from './index.ts';
import type { Backend } from './emit/backend.ts';
import { TS_BACKEND } from './emit/ts.ts';
import { BYTECODE_BACKEND } from './emit/bytecode/index.ts';
import { RUST_BACKEND } from './emit/rust/index.ts';

// Usage:
//   tsx packages/compiler/src/cli.ts packages/<schema>/src/schema.ts \
//        [--ts] [--rs] [--bcode]                     # multi-backend (new)
//        [--backend ts|bytecode|rust]                # single-backend (legacy)
//
// Imports the schema module (default export must be a SchemaDef), runs the
// compiler once per requested backend, and writes
// `packages/<schema>/src/_generated/parser<ext>` per backend.
//
// Default behaviour (no flags): emit TS only — byte-identical to the
// pre-multi-flag behaviour so every existing per-package `generate` script
// keeps working without change.
//
// The packageName passed to the compiler is derived from the schema path —
// it is the only piece of "identity" the compiler ever sees, and it never
// influences parser behavior (only the generated file header and the
// validator module metadata).

const argv = process.argv.slice(2);
const positional: string[] = [];
const requested: Backend[] = [];
const requestedNames = new Set<string>();

for (let i = 0; i < argv.length; i++) {
  const arg = argv[i]!;
  if (arg === '--ts') {
    addBackend(TS_BACKEND);
  } else if (arg === '--rs' || arg === '--rust') {
    addBackend(RUST_BACKEND);
  } else if (arg === '--bcode' || arg === '--bytecode') {
    addBackend(BYTECODE_BACKEND);
  } else if (arg === '--backend') {
    const name = argv[++i];
    if (name === undefined || name.startsWith('--')) {
      throw new Error('--backend requires a value');
    }
    addBackend(resolveBackend(name));
  } else if (arg.startsWith('--')) {
    throw new Error(`Unknown flag: ${arg}`);
  } else {
    positional.push(arg);
  }
}

const schemaArg = positional[0];
if (!schemaArg) {
  console.error(
    'usage: tsx packages/compiler/src/cli.ts <schema.ts> [--ts] [--rs] [--bcode] | [--backend ts|bytecode|rust]',
  );
  process.exit(1);
}

// Back-compat: no flags ⇒ TS only.
if (requested.length === 0) addBackend(TS_BACKEND);

const schemaPath = isAbsolute(schemaArg) ? schemaArg : resolve(process.cwd(), schemaArg);

await main(schemaPath, requested);

function addBackend(backend: Backend): void {
  if (requestedNames.has(backend.name)) return;
  requestedNames.add(backend.name);
  requested.push(backend);
}

async function main(path: string, backends: ReadonlyArray<Backend>): Promise<void> {
  const module = (await import(pathToFileURL(path).href)) as { default?: unknown; validation?: unknown };
  const schema = module.default;
  if (!isSchema(schema)) {
    throw new Error(`Schema at ${path} does not default-export a SchemaDef`);
  }
  const validation = isValidation(module.validation) ? module.validation : undefined;
  const packageName = packageNameFromPath(path);
  const outDir = resolve(dirname(path), '_generated');
  mkdirSync(outDir, { recursive: true });
  for (const backend of backends) {
    const code = generateParser(schema, validation, { packageName, backend });
    const outFile = resolve(outDir, `parser${backend.fileExtension}`);
    writeFileSync(outFile, code);
    console.log(`generated ${relative(outFile)}`);
  }
}

function resolveBackend(name: string): Backend {
  if (name === 'ts') return TS_BACKEND;
  if (name === 'bytecode') return BYTECODE_BACKEND;
  if (name === 'rust') return RUST_BACKEND;
  throw new Error(`Unknown backend: ${name}`);
}

function packageNameFromPath(path: string): string {
  // Expect .../packages/<name>/src/schema.ts. Extract <name>. Fall back to
  // 'parser' if the path doesn't match — the compiler still works; only the
  // header comment and validator metadata become generic.
  const parts = path.split(sep);
  const pkgIdx = parts.lastIndexOf('packages');
  if (pkgIdx >= 0 && pkgIdx + 1 < parts.length) return parts[pkgIdx + 1]!;
  return 'parser';
}

function isValidation(value: unknown): value is ValidationDef {
  return (
    typeof value === 'object' &&
    value !== null &&
    isSchema((value as { schema?: unknown }).schema) &&
    Array.isArray((value as { rules?: unknown }).rules)
  );
}

function isSchema(value: unknown): value is SchemaDef {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { rootType?: unknown }).rootType === 'string' &&
    Array.isArray((value as { examples?: unknown }).examples)
  );
}

function relative(p: string): string {
  const cwd = process.cwd();
  return p.startsWith(`${cwd}/`) ? p.slice(cwd.length + 1) : p;
}
