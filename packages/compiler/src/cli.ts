import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SchemaDef, ValidationDef } from '@parser2/parser';
import { generateParser } from './index.ts';

// Usage:
//   tsx packages/compiler/src/cli.ts packages/<schema>/src/schema.ts
//
// Imports the schema module (default export must be a SchemaDef), runs the
// compiler, and writes packages/<schema>/src/_generated/parser.ts.
// The packageName passed to the compiler is derived from the schema path —
// it is the only piece of "identity" the compiler ever sees, and it never
// influences parser behavior (only the generated file header and the
// validator module metadata).

const argv = process.argv.slice(2);
const positional: string[] = [];
let scannerless = false;
let v2 = false;
for (const arg of argv) {
  if (arg === '--scannerless') { scannerless = true; continue; }
  if (arg === '--v2') { v2 = true; scannerless = true; continue; }
  positional.push(arg);
}
const schemaArg = positional[0];
if (!schemaArg) {
  console.error('usage: tsx packages/compiler/src/cli.ts [--scannerless] [--v2] <schema.ts>');
  process.exit(1);
}

const schemaPath = isAbsolute(schemaArg) ? schemaArg : resolve(process.cwd(), schemaArg);

await main(schemaPath, scannerless, v2);

async function main(path: string, scannerless: boolean, v2: boolean): Promise<void> {
  const module = (await import(pathToFileURL(path).href)) as { default?: unknown; validation?: unknown };
  const schema = module.default;
  if (!isSchema(schema)) {
    throw new Error(`Schema at ${path} does not default-export a SchemaDef`);
  }
  const validation = isValidation(module.validation) ? module.validation : undefined;
  const packageName = packageNameFromPath(path);
  const code = generateParser(schema, validation, { packageName, scannerless, v2 });
  const outDir = resolve(dirname(path), '_generated');
  const outFile = resolve(outDir, 'parser.ts');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, code);
  const tag = v2 ? ' (v2)' : scannerless ? ' (scannerless)' : '';
  console.log(`generated ${relative(outFile)}${tag}`);
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
