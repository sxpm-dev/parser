// Composition test — Phase 4a (recovery + diagnostic) and Phase 4b/4c
// (whitespace: 'preserve' with auto-attach) are independent features but
// they must compose. A preserve schema with a recovery alt should:
//   1. Round-trip valid input byte-exactly (preserve semantics).
//   2. Recover from malformed input AND emit a diagnostic.
//   3. Round-trip the recovered AST byte-exactly within the captured
//      regions (each Decl carries its own __ws).
//
// The compose test catches accidental coupling between the two features —
// e.g. the captures-path failure-rewrite truncating __ws by mistake, or
// the recovery alt's __ws being lost in the dispatcher hand-off.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser } from '../src/index.ts';
import { $, defineSchema, literal, parse, relation, span, type SchemaDef } from '@parser2/parser';

function buildSchema(): SchemaDef {
  return defineSchema({
    rootType: 'List',
    whitespace: 'preserve',
    punctuators: { semicolon: ';', colon: ':' },
    examples: [
      relation('Decl', {
        input: 'k:v',
        encodings: {
          parse: parse([
            span('k', 'k').ident(),
            literal(':'),
            span('v', 'v').ident(),
          ]),
          ast: { type: 'decl', k: $.k, v: $.v },
        },
      }),
      relation('Decl', {
        input: 'foo bar',
        status: {
          kind: 'recovered',
          recovery: { syncAt: [';'], drop: 'malformed-decl' },
        },
        encodings: {
          parse: parse([
            span('text', 'foo bar').until(';', { nonEmpty: true }),
          ]),
          ast: { type: 'recovered-decl', text: $.text },
        },
      }),
      relation('List', {
        input: 'k:v',
        encodings: {
          parse: parse([
            span('items', 'k:v').of('Decl').repeats({ sep: ';', trailing: 'allowed' }),
          ]),
          ast: { type: 'list', items: $.items },
        },
      }),
    ],
  });
}

type Diagnostic = { code: string; drop: string; start: number; end: number };

async function loadV2(schema: SchemaDef) {
  const code = generateParser(schema, undefined, {});
  const dir = mkdtempSync(join(tmpdir(), 'parser3-compose-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  return (await import(pathToFileURL(file).href)) as {
    render: (input: string, options?: { target?: string; onDiagnostic?: (d: Diagnostic) => void }) => unknown;
    stringify: (value: unknown, options?: { target?: string }) => string;
  };
}

// Phase 4c v2 — per-iteration ws is now captured. Each Decl preserves
// its own ws AND the inter-Decl gap (including the separator) is replayed
// byte-exactly.
const INPUT_CLEAN = 'a : b; c : d';

test('compose: preserve + recovery — byte-exact round-trip across iterations', async () => {
  const { render, stringify } = await loadV2(buildSchema());
  const ast = render(INPUT_CLEAN, { target: 'ast' });
  const out = stringify(ast, { target: 'ast' });
  assert.equal(out, INPUT_CLEAN);
});

test('compose: preserve + recovery — diagnostic fires AND AST shape is correct', async () => {
  const { render } = await loadV2(buildSchema());
  const input = 'a:b; foo bar; c:d';
  const diagnostics: Diagnostic[] = [];
  const ast = render(input, { target: 'ast', onDiagnostic: (d) => diagnostics.push(d) }) as {
    type: string;
    items: Array<Record<string, unknown>>;
  };
  // 1. Diagnostic fired for the malformed region with the right drop label.
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]!.drop, 'malformed-decl');
  assert.equal(input.slice(diagnostics[0]!.start, diagnostics[0]!.end), 'foo bar');
  // 2. AST contains 3 items: valid, recovered, valid.
  assert.equal(ast.items.length, 3);
  assert.equal(ast.items[0]!.type, 'decl');
  assert.equal(ast.items[1]!.type, 'recovered-decl');
  assert.equal(ast.items[2]!.type, 'decl');
});
