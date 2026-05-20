import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { parse } from '../src/index.ts';

// Fixture-driven CSS test runner.
//
// For each test/cases/<name>.css fixture, parse it and deep-compare against
// test/cases/<name>.json. The JSON files are the EXPECTED structure (curated,
// not snapshot-regenerated). When a test fails we either adjust the JSON
// (renaming props) or fix the parser to produce the expected shape.
//
// Temporary measure while raws implementation is in progress: strip `source`
// from BOTH sides, and strip raws EXCEPT for the fields we've implemented
// (currently: before). As more raws fields land, expand RAWS_KEEP. Once all
// raws fields are implemented and source positions are fully PostCSS-
// aligned, delete this helper and compare AST trees directly.
const RAWS_KEEP: ReadonlySet<string> = new Set(['before', 'between', 'afterName', 'after', 'semicolon', 'left', 'right']);

function stripFormat(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripFormat);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === 'source') continue;
      if (k === 'raws') {
        const inRaws = v as Record<string, unknown>;
        const kept: Record<string, unknown> = {};
        for (const [rk, rv] of Object.entries(inRaws)) {
          if (RAWS_KEEP.has(rk)) kept[rk] = rv;
        }
        if (Object.keys(kept).length > 0) out.raws = kept;
        continue;
      }
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
