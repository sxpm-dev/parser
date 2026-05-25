// Snapshot runner for inverse-derivation precondition errors. Each
// fixture in ./error-fixtures/ declares a tiny invalid schema plus the
// regex the inferSchema() call must throw against. The runner discovers
// fixtures by directory walk so adding a new precondition only requires
// adding a new file — no test wiring.
//
// Fixtures live in plain .ts files (not compiled to dist) so they can use
// the same `@parser2/parser` import surface package schemas use. tsx (the
// test runner driver) loads them on demand.

import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { inferSchema } from '../src/index.ts';

const dir = new URL('./error-fixtures/', import.meta.url);

for (const file of readdirSync(dir)) {
  if (!file.endsWith('.ts')) continue;
  test(`error fixture: ${file}`, async () => {
    const url = new URL(file, dir);
    const mod = await import(fileURLToPath(url));
    assert.ok(mod.fixture, `fixture ${file} must export 'fixture'`);
    assert.ok(
      mod.expectedError instanceof RegExp,
      `fixture ${file} must export 'expectedError' as a RegExp`,
    );
    assert.throws(() => inferSchema(mod.fixture), mod.expectedError);
  });
}
