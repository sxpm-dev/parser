import test from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inferSchema } from '../src/index.ts';
import { BYTECODE_BACKEND } from '../src/emit/bytecode/index.ts';

test('bytecode backend: cron emits a runnable parser', async () => {
  const raw = (await import('../../cron/src/schema.ts')).default;
  const schema = inferSchema(raw);
  const source = BYTECODE_BACKEND.emit(schema);
  // Write to a temp dir INSIDE this package so the generated file's import
  // `@parser2/compiler/bytecode/runtime` resolves via the workspace's
  // node_modules. (System tmpdir is outside the repo and node module
  // resolution would never find @parser2/* from there.)
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = mkdtempSync(join(here, '.bcode-roundtrip-'));
  const file = join(dir, 'cron.bcode.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(pathToFileURL(file).href);
    const captures = mod.__parse('* * * * * date');
    assert.equal((captures as { __production: string }).__production, 'Cron#0');
    const rendered = mod.render('* * * * * date', { type: 'source' });
    assert.equal(rendered, '* * * * * date');
    // Inverse stringify of an AST value rebuilds the source. (Cron's
    // inverse only encodes ast-shaped productions in the bytecode runtime
    // today, so the dispatch key is 'ast' even though the output is source
    // text.)
    const ast = mod.render('* * * * * date', { type: 'ast' });
    const back = mod.stringify(ast, { type: 'ast' });
    assert.equal(back, '* * * * * date');
    // Missing target raises a helpful error (cron doesn't set defaultTarget).
    assert.throws(
      () => mod.render('* * * * * date'),
      /render: missing target/,
    );
    // Syntax errors surface from __parse.
    assert.throws(() => mod.__parse('not a cron line'), /Unexpected/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
