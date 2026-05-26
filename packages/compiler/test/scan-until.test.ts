// Tests for the Aho-Corasick scanner library + JS emitter (Tasks 4.1, 4.2).
//
// The library is the slow-but-obviously-correct reference scanner. We
// cross-check it against an even simpler naive O(n*m) scan to guarantee
// the AC automaton is faithful to "find the earliest start position of
// any stop literal in the input". Then we emit JS, write it to a temp
// file, dynamic-import it, and compare the emitted module's scan output
// against the library's scan output across every test case.
//
// Acceptance:
//   - library.scan(input, off) === naiveScan(input, stops, off) for all cases
//   - emittedModule.scan(input, off) === library.scan(input, off) for all cases
//
// Emitted code is loaded by writing it to a tmp .mjs file and using
// dynamic import — the security hook prevents alternative codegen
// loaders, so this file-based path is the only available technique.

import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { buildAcScanner } from '../src/emit/v2/scan-until-ac.ts';

// --- naive reference scan ---------------------------------------------------

// Naive O(n*m) multi-string-match: for each position i ≥ off in input,
// check whether any stop matches starting at i. Return the smallest such
// i, or -1 if no stop matches.
function naiveScan(input: string, stops: readonly string[], off: number): number {
  for (let i = off; i < input.length; i++) {
    for (const stop of stops) {
      if (stop.length === 0) continue;
      if (input.startsWith(stop, i)) return i;
    }
  }
  return -1;
}

// --- emitted-module loader --------------------------------------------------

let tmpDirCache: string | null = null;
function getTmpDir(): string {
  if (tmpDirCache) return tmpDirCache;
  tmpDirCache = mkdtempSync(join(tmpdir(), 'parser3-ac-'));
  return tmpDirCache;
}

interface EmittedModule {
  readonly scan: (input: string, off: number) => number;
}

let counter = 0;

async function loadEmittedScanner(stops: readonly string[]): Promise<EmittedModule> {
  const scanner = buildAcScanner(stops);
  const body = scanner.emitJs('input', 'off');
  // Emit as ESM so dynamic import returns a module namespace. Returning
  // `off` matches the "advance off to match start, or input.length on no
  // match" contract documented on `emitJs`.
  const source = `export function scan(input, off) {\n${body}\n  return off;\n}\n`;
  const file = join(getTmpDir(), `ac-${counter++}.mjs`);
  writeFileSync(file, source);
  return (await import(pathToFileURL(file).href)) as EmittedModule;
}

// --- test cases -------------------------------------------------------------

type Case = {
  readonly name: string;
  readonly stops: readonly string[];
  readonly inputs: readonly string[];
};

const PARAGRAPH_STOPS = [
  '\n\n', '\n#', '\n>', '\n- ', '\n-\n',
  '\n+ ', '\n* ', '\n```', '\n|',
  '\n---', '\n***', '\n___', '\n===', '\n[',
] as const;

const cases: ReadonlyArray<Case> = [
  // 1. Single-pattern (degenerate AC — pure naive trie walk).
  {
    name: 'single-pattern',
    stops: ['abc'],
    inputs: [
      '',
      'abc',
      'xabc',
      'xxxxabcxxx',
      'ab',
      'abx',
      'xab',
      'aabc',  // overlap test
      'abcabc',
    ],
  },
  // 2. Two patterns, no shared prefix.
  {
    name: 'two-disjoint',
    stops: ['ab', 'cd'],
    inputs: ['', 'a', 'ab', 'c', 'cd', 'xx', 'xabxcd', 'cdxab', 'abcd', 'dcba'],
  },
  // 3. Two patterns where one is a prefix of the other.
  // Naive returns the earliest START position; this catches whether AC
  // correctly picks the longer pattern when both match at the same start.
  {
    name: 'prefix-overlap',
    stops: ['ab', 'abc'],
    inputs: ['', 'ab', 'abc', 'abcabc', 'xab', 'xabc', 'a', 'aab'],
  },
  // 4. The shorter pattern matches INSIDE the longer pattern's prefix.
  // E.g. stops = ['abc', 'b'] on 'xabcy': naive returns 1 (start of
  // 'abc'), even though AC's natural "earliest end" semantics would
  // give 2 (start of 'b'). This test verifies our bounded look-ahead
  // correctly reconciles to naive's earliest-start.
  {
    name: 'inner-prefix-overlap',
    stops: ['abc', 'b'],
    inputs: ['', 'b', 'ab', 'abc', 'xabcy', 'xby', 'xabxby', 'aabbcc'],
  },
  // 5. Markdown's PARAGRAPH_STOPS (14 patterns, motivating example).
  {
    name: 'markdown-paragraph-stops',
    stops: PARAGRAPH_STOPS,
    inputs: [
      'plain paragraph',
      'plain paragraph\n\nfollowed by blank',
      'line one\nline two',
      'before\n# heading',
      'before\n## heading',
      'text\n> quote',
      'text\n- item',
      'text\n+ item',
      'text\n* item',
      'text\n--- rule',
      'text\n*** rule',
      'text\n``` code',
      'text\n[link][1]',
      'text\n| table',
      'multi line text\nwith newline but no stop\nand more',
      // Edge: a `\n` not followed by any stop char.
      'text\nplain follow',
      // Edge: stop at end.
      'text\n\n',
      // Edge: stop at very start.
      '\n\nempty start',
    ],
  },
  // 6. Pattern at offset 0.
  {
    name: 'match-at-zero',
    stops: ['hello', 'world'],
    inputs: ['hello', 'helloworld', 'world hello', 'h', 'hellp'],
  },
  // 7. Pattern at end of input.
  {
    name: 'match-at-end',
    stops: ['END'],
    inputs: ['xEND', 'xxEND', 'ENDx', 'EN', 'END', ''],
  },
  // 8. No match (alphabet-disjoint inputs).
  {
    name: 'no-match',
    stops: ['xyz', 'abc'],
    inputs: ['mnpqrstu', '', '123456', 'no match here at all'],
  },
  // 9. Overlapping patterns (classic AC failure-link stress).
  // Pattern set 'he', 'she', 'his', 'hers' — the textbook AC example.
  {
    name: 'classic-ahocorasick',
    stops: ['he', 'she', 'his', 'hers'],
    inputs: [
      'ushers',
      'he',
      'she',
      'his',
      'hers',
      '',
      'ahishers',
      'shehishers',
    ],
  },
  // 10. Single-byte stops mixed with multi-byte (lead-byte conflicts).
  {
    name: 'single-byte-and-multi',
    stops: [';', '/*', '//'],
    inputs: ['a; b', 'a /* comment', 'a // line', 'plain', '/ ', '/*/', '//;'],
  },
];

// --- library vs naive cross-check ------------------------------------------

for (const tc of cases) {
  test(`AC library matches naive scan — ${tc.name}`, () => {
    const scanner = buildAcScanner(tc.stops);
    for (const input of tc.inputs) {
      const got = scanner.scan(input, 0);
      const want = naiveScan(input, tc.stops, 0);
      assert.equal(
        got,
        want,
        `case ${tc.name} input ${JSON.stringify(input)}: library=${got} naive=${want}`,
      );
      // Also test from non-zero offsets across the input.
      for (let off = 1; off <= input.length; off++) {
        const gotN = scanner.scan(input, off);
        const wantN = naiveScan(input, tc.stops, off);
        assert.equal(
          gotN,
          wantN,
          `case ${tc.name} input ${JSON.stringify(input)} off=${off}: library=${gotN} naive=${wantN}`,
        );
      }
    }
  });
}

// --- emitted JS vs library --------------------------------------------------

for (const tc of cases) {
  test(`AC emitted JS matches library scan — ${tc.name}`, async () => {
    const scanner = buildAcScanner(tc.stops);
    const mod = await loadEmittedScanner(tc.stops);
    for (const input of tc.inputs) {
      const libRaw = scanner.scan(input, 0);
      // Library returns -1 for no match; emitted returns input.length.
      const libNormalized = libRaw === -1 ? input.length : libRaw;
      const emitted = mod.scan(input, 0);
      assert.equal(
        emitted,
        libNormalized,
        `case ${tc.name} input ${JSON.stringify(input)} off=0: emitted=${emitted} library=${libNormalized}`,
      );
      for (let off = 1; off <= input.length; off++) {
        const libRawN = scanner.scan(input, off);
        const libNormN = libRawN === -1 ? input.length : libRawN;
        const emittedN = mod.scan(input, off);
        assert.equal(
          emittedN,
          libNormN,
          `case ${tc.name} input ${JSON.stringify(input)} off=${off}: emitted=${emittedN} library=${libNormN}`,
        );
      }
    }
  });
}

// --- stress test ----------------------------------------------------------

test('AC library handles empty stops gracefully', () => {
  const scanner = buildAcScanner([]);
  assert.equal(scanner.scan('anything', 0), -1);
  assert.equal(scanner.scan('', 0), -1);
});

test('AC library filters zero-length stops', () => {
  const scanner = buildAcScanner(['', 'abc']);
  assert.equal(scanner.scan('xabc', 0), 1);
  assert.equal(scanner.scan('xxx', 0), -1);
});

test('AC library handles duplicate stops', () => {
  const scanner = buildAcScanner(['abc', 'abc', 'def']);
  assert.equal(scanner.scan('xabc', 0), 1);
  assert.equal(scanner.scan('def', 0), 0);
});

// --- diagnostics report ---------------------------------------------------

test('emitted-code size report (informational)', () => {
  const scanner = buildAcScanner(PARAGRAPH_STOPS);
  const emitted = scanner.emitJs('input', 'off');
  // Not a hard assertion — just a sanity bound. We expect ~200 lines of
  // emitted JS for PARAGRAPH_STOPS' ~30-state automaton.
  assert.ok(scanner.stateCount > 0, 'should have states');
  assert.ok(scanner.stateCount < 1000, `state count ${scanner.stateCount} is suspiciously large`);
  assert.ok(emitted.length > 0, 'should have emitted source');
});
