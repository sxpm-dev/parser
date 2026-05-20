import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { SchemaDef } from '@parser2/parser';
import { generateParser } from './index.ts';

// Usage:
//   tsx packages/compiler/src/cli.ts packages/<schema>/src/schema.ts
//
// Imports the schema module (default export must be a SchemaDef), runs the
// compiler, and writes packages/<schema>/src/_generated/parser.ts.

const argv = process.argv.slice(2);
const schemaArg = argv[0];
if (!schemaArg) {
  console.error('usage: tsx packages/compiler/src/cli.ts <schema.ts>');
  process.exit(1);
}

const schemaPath = isAbsolute(schemaArg) ? schemaArg : resolve(process.cwd(), schemaArg);

await main(schemaPath);

async function main(path: string): Promise<void> {
  const module = (await import(pathToFileURL(path).href)) as { default?: unknown };
  const schema = module.default;
  if (!isSchema(schema)) {
    throw new Error(`Schema at ${path} does not default-export a SchemaDef`);
  }
  const code = generateParser(schema);
  const outDir = resolve(dirname(path), '_generated');
  const outFile = resolve(outDir, 'parser.ts');
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, code);
  console.log(`generated ${relative(outFile)}`);
}

function isSchema(value: unknown): value is SchemaDef {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { name?: unknown }).name === 'string' &&
    typeof (value as { rootType?: unknown }).rootType === 'string' &&
    Array.isArray((value as { examples?: unknown }).examples)
  );
}

function relative(p: string): string {
  const cwd = process.cwd();
  return p.startsWith(`${cwd}/`) ? p.slice(cwd.length + 1) : p;
}
