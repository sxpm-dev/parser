import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { generateParser } from './index.ts';
import type { Backend } from './emit/backend.ts';
import { TS_BACKEND } from './emit/ts.ts';

// Usage:
//   tsx packages/compiler/src/cli.ts packages/<schema>/src/schema.ts [--backend ts|bytecode]
//
// Imports the schema module (default export must be a SchemaDef), runs the
// compiler, and writes packages/<schema>/src/_generated/parser<ext> where
// <ext> comes from the selected backend (default: .ts).
// The packageName passed to the compiler is derived from the schema path —
// it is the only piece of "identity" the compiler ever sees, and it never
// influences parser behavior (only the generated file header and the
// validator module metadata).

const argv = process.argv.slice(2);
const backendName = parseFlag('--backend', argv) ?? 'ts';
const positional = argv.filter((arg, idx) => !isFlag(arg, idx, argv));
const schemaArg = positional[0];
if (!schemaArg) {
  console.error('usage: tsx packages/compiler/src/cli.ts <schema.ts> [--backend ts|bytecode]');
  process.exit(1);
}

const schemaPath = isAbsolute(schemaArg) ? schemaArg : resolve(process.cwd(), schemaArg);
const backend = resolveBackend(backendName);

await main(schemaPath, backend);

async function main(path: string, backend: Backend): Promise<void> {
  const module = (await import(pathToFileURL(path).href)) as { default?: unknown; validation?: unknown };
  const schema = module.default;
  if (!isSchema(schema)) {
    throw new Error(`Schema at ${path} does not default-export a SchemaDef`);
  }
  const validation = isValidation(module.validation) ? module.validation : undefined;
  const packageName = packageNameFromPath(path);
  const code = generateParser(schema, validation, { packageName, backend });
  const outDir = resolve(dirname(path), '_generated');
  const outFile = resolve(outDir, `parser${backend.fileExtension}`);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, code);
  console.log(`generated ${relative(outFile)}`);
}

function resolveBackend(name: string): Backend {
  if (name === 'ts') return TS_BACKEND;
  // 'bytecode' is reserved for a future Backend registration (Phase 6.5).
  // Until then, requesting it must fail cleanly rather than crash with an
  // import error.
  throw new Error(`Unknown backend: ${name}`);
}

function parseFlag(name: string, argv: readonly string[]): string | undefined {
  const idx = argv.indexOf(name);
  if (idx === -1) return undefined;
  const value = argv[idx + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`Flag ${name} requires a value`);
  }
  return value;
}

function isFlag(arg: string, idx: number, argv: readonly string[]): boolean {
  if (arg.startsWith('--')) return true;
  // The token immediately after a known flag is its value, not a positional.
  const prev = argv[idx - 1];
  return prev === '--backend';
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
