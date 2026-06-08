// Layer 1 of the raws-sidecar plan (docs/superpowers/plans/2026-06-08-
// raws-sidecar.md). Acceptance:
//
//   - Standard-whitespace schemas emit `__ws: string[] | null = state.mode
//     === 'raws' ? [] : null` instead of nothing. Fast mode skips the
//     allocation; raws mode populates the array.
//   - Each inter-span push site is wrapped in `if (__ws !== null) __ws.push
//     (...)` for standard schemas. Preserve schemas keep the unconditional
//     `__ws.push(...)` (no perf regression on css / markdown).
//   - The captures payload injects `__ws: __ws, __litPres: __litPres` into
//     the raws branch for standard schemas; the fast branch stays clean.
//
// What this test does NOT check (deferred to Layers 2-3):
//   - the AST builder reading __ws and attaching it as a `.raws` field
//     on each node
//   - stringify in raws mode preferring the recorded trivia
//
// It walks the v2 emit for a small synthetic schema (one with default
// 'standard' whitespace + one with explicit 'preserve') and asserts the
// expected source-level patterns.

import { strict as assert } from 'node:assert';
import test from 'node:test';
import {
  $,
  defineSchema,
  literal,
  parse,
  relation,
  span,
} from '@parser2/parser';
import { generateParser } from '../src/index.ts';

const standardSchema = defineSchema({
  rootType: 'Pair',
  punctuators: { eq: '=' },
  examples: [
    relation('Pair', {
      input: 'a=b',
      encodings: {
        src: parse([
          span('k', 'a').ident(),
          literal('='),
          span('v', 'b').ident(),
        ]),
        ast: { type: 'pair', k: $.k, v: $.v },
      },
    }),
  ],
});

const preserveSchema = defineSchema({
  rootType: 'Pair',
  whitespace: 'preserve',
  punctuators: { eq: '=' },
  examples: [
    relation('Pair', {
      input: 'a=b',
      encodings: {
        src: parse([
          span('k', 'a').ident(),
          literal('='),
          span('v', 'b').ident(),
        ]),
        ast: { type: 'pair', k: $.k, v: $.v },
      },
    }),
  ],
});

test('layer 1: standard schema emits lazy __ws allocation', () => {
  const code = generateParser(standardSchema);
  // Lazy allocation — null in fast mode, [] in raws mode.
  assert.match(
    code,
    /const __ws: string\[\] \| null = state\.mode === 'raws' \? \[\] : null;/,
  );
  assert.match(
    code,
    /const __litPres: boolean\[\] \| null = state\.mode === 'raws' \? \[\] : null;/,
  );
  // Push sites gated on the array being non-null.
  assert.match(code, /if \(__ws !== null\) __ws\.push\(input\.slice\(__wsStart_\d+, off\)\);/);
});

test('layer 1: standard schema injects __ws/__litPres into raws captures only', () => {
  const code = generateParser(standardSchema);
  // The captures-payload branch under `if (state.mode === 'raws')` carries
  // __ws and __litPres; the fast branch does not.
  // Match the entire returnBlock and split on the raws / fast halves.
  const returnBlock = code.match(
    /if \(state\.mode === 'raws'\) \{\s*const __captures: any = \{[^}]*\};[^}]*?\}\s*return \{[^}]*\};/,
  );
  assert.ok(returnBlock, 'expected the raws/fast return block to be present');
  const block = returnBlock[0];
  const rawsHalf = block.slice(0, block.indexOf('return '));
  const fastHalf = block.slice(block.indexOf('return '));
  assert.match(rawsHalf, /__ws: __ws/, 'raws branch must carry __ws');
  assert.match(rawsHalf, /__litPres: __litPres/, 'raws branch must carry __litPres');
  assert.doesNotMatch(fastHalf, /__ws: __ws/, 'fast branch must NOT carry __ws');
  assert.doesNotMatch(fastHalf, /__litPres: __litPres/, 'fast branch must NOT carry __litPres');
});

test('layer 1: preserve schema keeps eager __ws allocation (no perf regression)', () => {
  const code = generateParser(preserveSchema);
  // Eager allocation — unconditional, same shape as before this change.
  assert.match(code, /const __ws: string\[\] = \[\];/);
  assert.match(code, /const __litPres: boolean\[\] = \[\];/);
  // Unconditional push — no `if (__ws !== null)` wrapper for preserve.
  assert.match(code, /  __ws\.push\(input\.slice\(__wsStart_\d+, off\)\);/);
  assert.doesNotMatch(
    code,
    /if \(__ws !== null\) __ws\.push/,
    'preserve schema must not use the lazy-gated push',
  );
});

test('layer 2: standard schema in raws mode attaches .raws to ast nodes', async () => {
  // End-to-end. Generate, write to a temp file (tsx import needs a file
  // path), import dynamically, parse a small input, and verify the ast
  // root carries `.raws.__ws` populated from the inter-span gaps.
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { dirname, resolve } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const here = dirname(fileURLToPath(import.meta.url));
  const outDir = resolve(here, '.raws-layer2-tmp');
  mkdirSync(outDir, { recursive: true });
  const code = generateParser(standardSchema);
  const outPath = resolve(outDir, 'parser.ts');
  writeFileSync(outPath, code);
  const mod = (await import(outPath)) as {
    render: (input: string, opts: { target: string; mode: string }) => unknown;
  };

  const ast = mod.render('a=b', { target: 'ast', mode: 'raws' }) as { raws?: { __ws: string[] } };
  assert.ok(ast.raws, 'standard schema in raws mode must attach .raws');
  assert.ok(Array.isArray(ast.raws.__ws), '.raws.__ws must be an array');
  assert.equal(ast.raws.__ws.length, 2, 'two inter-span gaps for [k, "=", v]');

  // Fast mode: same input, no .raws.
  const astFast = mod.render('a=b', { target: 'ast', mode: 'fast' }) as { raws?: unknown };
  assert.equal(astFast.raws, undefined, 'fast mode must not attach .raws');
});

test('layer 2: standard schema emits gated raws-attach with namespaced payload', () => {
  const code = generateParser(standardSchema);
  // Runtime gate + namespaced `raws: { __ws, __litPres, … }` wrapper.
  assert.match(code, /captures\.__ws != null \? Object\.assign\(/);
  assert.match(code, /\{ raws: \{ __ws: captures\.__ws, __litPres: captures\.__litPres/);
});

test('layer 2: preserve schema keeps top-level __ws attach (no behaviour change)', () => {
  const code = generateParser(preserveSchema);
  // Preserve schemas: unconditional Object.assign, top-level keys, NO
  // `raws: {` namespace.
  assert.match(code, /Object\.assign\(/);
  assert.match(code, /\{ __ws: captures\.__ws, __litPres: captures\.__litPres/);
  assert.doesNotMatch(code, /raws: \{ __ws: captures\.__ws/);
});
