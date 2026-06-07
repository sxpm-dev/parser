// Phase 4a — recovery codegen + diagnostic API.
//
// A schema may mark a production with `.recovers({ syncAt, drop })`. The
// recovery production is dispatched as a normal alt today (HTML's
// self-closing-element pattern relies on that). Phase 4a adds the
// observability piece: when a production with `recovery` is the one that
// matched, the parser emits a Diagnostic to the optional `onDiagnostic`
// callback.
//
// Acceptance (per docs/superpowers/plans/2026-06-06-9-10-roadmap.md Phase 4):
//   - A schema using `.recovers({ syncAt, drop })` produces the documented
//     AST shape for the recovery path AND a Diagnostic record on the
//     `onDiagnostic` callback for the dropped region.
//   - The non-recovery valid path is unchanged: no spurious diagnostic.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser, inferSchema } from '../src/index.ts';
import { interpretParse } from '../src/interp/parse.ts';
import {
  $,
  defineSchema,
  literal,
  parse,
  relation,
  span,
  type SchemaDef,
} from '@parser2/parser';

function buildSchema(): SchemaDef {
  return defineSchema({
    rootType: 'List',
    punctuators: { semicolon: ';', colon: ':' },
    examples: [
      // Valid declaration: `prop: value`.
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
      // Recovery declaration: anything up to the next ';' is dropped.
      // `nonEmpty: true` is required so the recovery alt doesn't match an
      // empty trailing region at end-of-list (otherwise the repeats loop
      // would emit a spurious empty `recovered-decl` after the last
      // valid decl).
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
      // List of decls separated by ';'.
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

type RenderFn = (
  input: string,
  options?: {
    target?: string;
    mode?: 'fast' | 'raws';
    onDiagnostic?: (d: Diagnostic) => void;
  },
) => unknown;

type ValidateFn = (
  input: string,
  options?: {
    mode?: 'fast' | 'raws';
    onDiagnostic?: (d: Diagnostic) => void;
  },
) => void;

async function loadV2(schema: SchemaDef): Promise<{ render: RenderFn; validate: ValidateFn }> {
  const code = generateParser(schema, undefined, {});
  const dir = mkdtempSync(join(tmpdir(), 'parser3-recovery-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = (await import(pathToFileURL(file).href)) as {
    render: RenderFn;
    validate: ValidateFn;
  };
  return { render: mod.render, validate: mod.validate };
}

function stripSource(node: unknown): unknown {
  if (node === null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(stripSource);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === 'source') continue;
    out[k] = stripSource(v);
  }
  return out;
}

const INPUT = 'a:b; foo bar; c:d';
const EXPECTED_AST = {
  type: 'list',
  items: [
    { type: 'decl', k: 'a', v: 'b' },
    { type: 'recovered-decl', text: 'foo bar' },
    { type: 'decl', k: 'c', v: 'd' },
  ],
};

test('v2: recovery production emits Diagnostic via onDiagnostic', async () => {
  const schema = buildSchema();
  const { render } = await loadV2(schema);
  const diagnostics: Diagnostic[] = [];
  const ast = render(INPUT, {
    target: 'ast',
    onDiagnostic: (d) => diagnostics.push(d),
  });
  assert.deepEqual(stripSource(ast), EXPECTED_AST);
  assert.equal(diagnostics.length, 1, 'one recovery diagnostic expected');
  const d = diagnostics[0]!;
  assert.equal(d.drop, 'malformed-decl');
  // The diagnostic must point at the dropped source region. INPUT is
  // 'a:b; foo bar; c:d' — `foo bar` lives at offsets 5..12.
  assert.equal(INPUT.slice(d.start, d.end), 'foo bar');
});

test('v2: no diagnostic when only valid productions matched', async () => {
  const schema = buildSchema();
  const { render } = await loadV2(schema);
  const diagnostics: Diagnostic[] = [];
  render('a:b; c:d', { target: 'ast', onDiagnostic: (d) => diagnostics.push(d) });
  assert.equal(diagnostics.length, 0);
});

test('v2: validate() also surfaces recovery diagnostics', async () => {
  const schema = buildSchema();
  const { validate } = await loadV2(schema);
  const diagnostics: Diagnostic[] = [];
  validate(INPUT, { onDiagnostic: (d) => diagnostics.push(d) });
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]!.drop, 'malformed-decl');
});

test('interp: recovery production emits Diagnostic via onDiagnostic', () => {
  const schema = buildSchema();
  const inferred = inferSchema(schema);
  const diagnostics: Diagnostic[] = [];
  const ast = interpretParse(inferred, INPUT, {
    onDiagnostic: (d) => diagnostics.push(d),
  });
  assert.deepEqual(stripSource(ast), EXPECTED_AST);
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]!.drop, 'malformed-decl');
  assert.equal(INPUT.slice(diagnostics[0]!.start, diagnostics[0]!.end), 'foo bar');
});

// Phase 4a v2 — span-less recovery. A `.recovers({syncAt, drop})`
// production with NO spans triggers the runtime depth-tracked
// skip-to-sync-token path. The dispatcher only reaches it after every
// valid alt has failed. Used for "drop the malformed region" semantics
// where the schema author doesn't need to enumerate a span shape.
function buildSpanlessSchema(): SchemaDef {
  return defineSchema({
    rootType: 'List',
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
        input: '',
        status: {
          kind: 'recovered',
          recovery: { syncAt: [';'], drop: 'unknown' },
        },
        encodings: {
          parse: parse([]),
          ast: { type: 'recovered' },
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

test('v2: span-less recovery scans to sync and emits diagnostic', async () => {
  const { render } = await loadV2(buildSpanlessSchema());
  const input = 'a:b; garbage stuff; c:d';
  const diagnostics: Diagnostic[] = [];
  const ast = render(input, { target: 'ast', onDiagnostic: (d) => diagnostics.push(d) }) as {
    type: string;
    items: Array<Record<string, unknown>>;
  };
  assert.equal(ast.items.length, 3);
  assert.equal(ast.items[0]!.type, 'decl');
  assert.equal(ast.items[1]!.type, 'recovered');
  assert.equal(ast.items[2]!.type, 'decl');
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]!.drop, 'unknown');
  // The skip scans `garbage stuff` (leading ws absorbed by the
  // production's own leading-ws-skip; trailing ws stops at the next
  // valid char before the syncAt comma).
  assert.equal(input.slice(diagnostics[0]!.start, diagnostics[0]!.end), 'garbage stuff');
});

test('interp: span-less recovery mirrors v2', () => {
  const schema = buildSpanlessSchema();
  const inferred = inferSchema(schema);
  const input = 'a:b; garbage stuff; c:d';
  const diagnostics: Diagnostic[] = [];
  const ast = interpretParse(inferred, input, {
    onDiagnostic: (d) => diagnostics.push(d),
  }) as { items: Array<Record<string, unknown>> };
  assert.equal(ast.items.length, 3);
  assert.equal(ast.items[1]!.type, 'recovered');
  assert.equal(diagnostics.length, 1);
  assert.equal(input.slice(diagnostics[0]!.start, diagnostics[0]!.end), 'garbage stuff');
});
