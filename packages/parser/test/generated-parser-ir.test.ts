import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * SHA256 byte-equality gate on generated parsers.
 *
 * Replaces `packages/parser/src/relation-ir-equivalence.test.ts` (deleted at
 * the end of Phase 9 when the `ex()` builder DSL was removed in favour of
 * `relation()`). Without that comparator, no in-tree alarm fires when a
 * future `relation()` / codegen change silently drifts the IR of generated
 * parsers. This test reads each in-scope schema's `src/_generated/parser.ts`,
 * computes SHA256, and asserts it matches the value in the sibling
 * `generated-parser-ir.golden.json`.
 *
 * If a change legitimately changes the IR, regenerate the affected package
 * (`npm run generate -w @parser2/<pkg>`) and update the corresponding hash in
 * the golden JSON in the same commit.
 */

interface GoldenEntry {
  readonly path: string;
  readonly sha256: string;
}

interface GoldenFile {
  readonly algorithm: 'sha256';
  readonly packages: Readonly<Record<string, GoldenEntry>>;
}

const here = dirname(fileURLToPath(import.meta.url));
// packages/parser/test -> repo root
const repoRoot = resolve(here, '..', '..', '..');

const goldenPath = resolve(here, 'generated-parser-ir.golden.json');
const goldenRaw = readFileSync(goldenPath, 'utf8');
const golden = JSON.parse(goldenRaw) as GoldenFile;

assert.equal(
  golden.algorithm,
  'sha256',
  `Golden file declares unsupported algorithm: ${golden.algorithm}`,
);

function sha256OfFile(absPath: string): string {
  const buf = readFileSync(absPath);
  return createHash('sha256').update(buf).digest('hex');
}

for (const [pkg, entry] of Object.entries(golden.packages)) {
  test(`generated parser IR is byte-stable for @parser2/${pkg}`, () => {
    const absPath = resolve(repoRoot, entry.path);
    const actual = sha256OfFile(absPath);
    assert.equal(
      actual,
      entry.sha256,
      `SHA256 mismatch for ${entry.path}.\n` +
        `  expected: ${entry.sha256}\n` +
        `  actual:   ${actual}\n` +
        `If this drift is intentional (e.g. you changed the relation() DSL or codegen and ` +
        `regenerated the parser), update the hash in ` +
        `packages/parser/test/generated-parser-ir.golden.json in the same commit.`,
    );
  });
}
