import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { render } from '../src/index.ts';

// Fixture-driven CSS test runner.
//
// For each test/cases/<name>.css fixture, parse it and deep-compare against
// test/cases/<name>.json. The JSON files are the EXPECTED structure
// (curated, not snapshot-regenerated).
//
// Phase 5 removed the public parse() export. The AST that used to be
// returned by parse(input, { mode: 'raws' }) is reachable via
// render(input, { target: 'ast' }); raws were dropped from the AST in the
// Phase 6 unified-render-targets migration because the compiler's
// inverse-derivation pass rejects $.gap / $.tail / $.endsWith /
// $.commentLeft / $.commentRight synthetic refs in object-body render
// targets. Source-level whitespace fidelity now flows through the 'source'
// target instead. The fixture-JSON `raws` and `source` blocks are stripped
// from both sides before comparison.

function parse(input: string, options?: { mode?: 'fast' | 'raws' }): unknown {
  return render(input, { target: 'ast', mode: options?.mode ?? 'raws' });
}

function stripFormat(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripFormat);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'source') continue;
      if (k === 'raws') continue;
      // Strip leading-underscore fields (internal discriminators added
      // during the Phase 6 .render migration — e.g. `_important` carries
      // the case-preserving keyword text for AST→source round-trip).
      if (k.startsWith('_')) continue;
      out[k] = stripFormat(v);
    }
    return out;
  }
  return value;
}

const here = dirname(fileURLToPath(import.meta.url));
const casesDir = join(here, 'cases');

const cssFiles = readdirSync(casesDir)
  .filter((f) => f.endsWith('.css'))
  .sort();

for (const cssFile of cssFiles) {
  const name = cssFile.replace(/\.css$/, '');
  test(`fixture: ${name}`, () => {
    const cssPath = join(casesDir, cssFile);
    const jsonPath = join(casesDir, `${name}.json`);
    const css = readFileSync(cssPath, 'utf8');

    let actual: unknown;
    try {
      actual = parse(css);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`parse threw on ${cssFile}: ${message}`);
    }

    const expected = JSON.parse(readFileSync(jsonPath, 'utf8')) as unknown;
    assert.deepEqual(stripFormat(actual), stripFormat(expected));
  });
}
