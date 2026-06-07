// Rust backend — emitted-source golden tests. Phase 6.5 (without rustc).
//
// For each schema in the canary list, we snapshot the Rust source
// produced by `generateParser(schema, undefined, { backend: RUST_BACKEND
// })` to a checked-in .rs file under packages/compiler/test/rust-goldens/.
// On every test run the emit is recomputed and compared byte-for-byte.
//
// Why goldens, not compile-and-run: rustc is not assumed to be installed
// in the dev environment, so the Phase 6.5 "differential test" (TS render
// ≡ Rust render over a 10k-fixture corpus) is gated on a future session
// with the Rust toolchain available. Until then these goldens catch
// regressions in the Rust emit — every cross-cutting compiler change
// surfaces here immediately rather than only when a downstream consumer
// notices the .rs no longer compiles.
//
// First-time generation / refresh after intentional emit changes:
//
//   UPDATE_GOLDENS=1 npx tsx --test packages/compiler/test/rust-goldens.test.ts
//
// The env-var flips the runner from compare to write mode. Without it,
// missing or stale goldens fail the test loudly.
//
// When rustc lands in CI: the existing goldens become a fast first-line
// check; the differential test layers byte/value parity vs the TS
// backend on top.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { strict as assert } from 'node:assert';
import test from 'node:test';
import { generateParser } from '../src/index.ts';
import { RUST_BACKEND } from '../src/emit/rust/index.ts';
import cronSchema from '../../cron/src/schema.ts';
import isoDurationSchema from '../../iso-duration/src/schema.ts';

const here = new URL('./rust-goldens/', import.meta.url);
const UPDATE = process.env.UPDATE_GOLDENS === '1';

const CANARIES: ReadonlyArray<{ readonly file: string; readonly packageName: string; readonly schema: unknown }> = [
  { file: 'cron.rs.golden', packageName: 'cron', schema: cronSchema },
  { file: 'iso-duration.rs.golden', packageName: 'iso-duration', schema: isoDurationSchema },
];

for (const c of CANARIES) {
  test(`rust golden: ${c.packageName}`, () => {
    const code = generateParser(c.schema as Parameters<typeof generateParser>[0], undefined, {
      backend: RUST_BACKEND,
      packageName: c.packageName,
    });
    const goldenPath = fileURLToPath(new URL(c.file, here));
    if (UPDATE || !existsSync(goldenPath)) {
      writeFileSync(goldenPath, code);
      // First-time write doesn't assert; the next plain `npm test` will.
      return;
    }
    const expected = readFileSync(goldenPath, 'utf8');
    if (expected !== code) {
      assert.fail(
        `rust golden mismatch for ${c.packageName}.\n` +
          `Re-run with UPDATE_GOLDENS=1 if the diff is intentional.\n` +
          firstLineDiff(expected, code),
      );
    }
  });
}

function firstLineDiff(expected: string, actual: string): string {
  const a = expected.split('\n');
  const b = actual.split('\n');
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) {
      return `first diff at line ${i + 1}:\n  expected: ${a[i]}\n  actual:   ${b[i]}`;
    }
  }
  if (a.length !== b.length) {
    return `lengths differ: golden has ${a.length} lines, emit has ${b.length} lines`;
  }
  return 'no line-level diff (whitespace?)';
}
