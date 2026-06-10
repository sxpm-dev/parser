// Shared compile-to-module helper for emitter behavior tests: infer the
// schema, emit the v2 TS parser, write it to a temp dir next to the tests,
// and import it as a live module. Callers receive the module AND the emitted
// source so they can pin generated-code shapes alongside behavior.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inferSchema } from '../../src/index.ts';
import { emitV2Parser } from '../../src/emit/v2/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

export interface CompiledModule {
  readonly render: (input: string, options?: object) => unknown;
  readonly source: string;
  /** Remove the temp dir holding the generated module. */
  readonly cleanup: () => void;
}

export async function compileToModule(
  schemaDef: Parameters<typeof inferSchema>[0],
  prefix = 'compile-helper-',
): Promise<CompiledModule> {
  const schema = inferSchema(schemaDef);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(here, `.${prefix}`));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source, 'utf8');
  try {
    const mod = await import(pathToFileURL(file).href);
    return {
      render: mod.render,
      source,
      cleanup: () => rmSync(dir, { recursive: true, force: true }),
    };
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw e;
  }
}
