// Shared bench-fixture loader. Each parser package keeps a "real-world"
// example at `bench/fixture/real-world.<ext>` (or `bench/fixtures/...`)
// — a representative input that exercises the schema's interesting
// shapes. The loader returns the file's contents when it exists; on
// miss it falls back to the caller-supplied `seed` string (a tiny
// synthetic example baked into bench/parse.ts). All bench drivers
// (parse.ts / backends.ts) route through here so the SAME corpus
// powers both competitor benches and cross-backend benches.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

export interface FixtureOptions {
  readonly packageDir: string;
  /** Fallback seed used when no real-world fixture exists. */
  readonly seed: string;
  /** Override path resolution — useful for tests. */
  readonly preferredName?: string;
}

/** Resolve the bench fixture. Tries (in order):
 *    1. `bench/fixture/real-world.*` or `bench/fixtures/real-world.*`
 *       (or whatever `preferredName` the caller supplied).
 *    2. The FIRST file in `bench/fixture/` / `bench/fixtures/`
 *       (sorted alphabetically) — lets packages keep their existing
 *       legacy fixture names (e.g. CSS's `huge-page.css`).
 *    3. Caller-supplied seed.
 *  The first matching file wins, returned verbatim (no encoding
 *  normalization — bench wants byte-identical scaling).
 */
export function loadFixture(opts: FixtureOptions): string {
  const dirs = ['bench/fixture', 'bench/fixtures'];
  for (const dir of dirs) {
    const path = resolve(opts.packageDir, dir);
    if (!existsSync(path)) continue;
    let entries: string[] = [];
    try {
      entries = readdirSync(path).sort();
    } catch {
      continue;
    }
    const want = opts.preferredName?.toLowerCase() ?? 'real-world';
    let chosen: string | null = null;
    for (const entry of entries) {
      const lower = entry.toLowerCase();
      if (lower === want || lower.startsWith(`${want}.`)) {
        const full = resolve(path, entry);
        if (statSync(full).isFile()) { chosen = full; break; }
      }
    }
    // Fallback: first regular file in the directory.
    if (chosen === null) {
      for (const entry of entries) {
        const full = resolve(path, entry);
        if (statSync(full).isFile()) { chosen = full; break; }
      }
    }
    if (chosen !== null) return readFileSync(chosen, 'utf8');
  }
  return opts.seed;
}
