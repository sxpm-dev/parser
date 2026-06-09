// Feature-parity matrix (Phase 1 of docs/superpowers/plans/2026-06-06-9-10-roadmap.md).
//
// Rows: closed-vocabulary primitives of the schema DSL (one per row).
// Columns: execution backends. The current architecture exposes three:
//   - interp     — packages/compiler/src/interp/      (slow trust anchor)
//   - v2         — packages/compiler/src/emit/v2/     (default TS backend;
//                                                     captures-based forward
//                                                     path plus optional
//                                                     fusion fast paths)
//   - bytecode   — packages/compiler/src/emit/bytecode/ (Phase 6 stretch;
//                                                     not yet wired into the
//                                                     parity matrix)
//
// The matrix lists 'interp' and 'v2' only. Bytecode rows can be added when
// Phase 6 lands; the runner skips that column by design today.
//
// Note: the roadmap doc referred to a separate "v1 emit" alongside v2. That
// labeling did not match the current codebase. `packages/compiler/src/emit/`
// contains shared helpers (render.ts, captures.ts, inverse.ts, rebuild.ts,
// preamble.ts, strings.ts) imported by emit/v2/index.ts; there is no parallel
// "v1" emitter. The matrix reflects today's actual structure.
//
// Cells:
//   - 'impl' — backend executes and produces the row's expectedAst exactly.
//   - 'gap'  — backend throws, mismatches, or otherwise fails.
//
// Each row carries an `expected` map. The test asserts actual == expected.
// Two failure modes catch real bugs:
//   - regression: a cell was 'impl', now actually 'gap'  → fix the backend.
//   - silent fix: a cell was 'gap',  now actually 'impl' → bump the matrix
//                                                          ('gap' → 'impl').
//
// Phase 1 acceptance from the roadmap is: every cell is 'impl'. That gate is
// a *separate* check (a CI rule "grep for `'gap'` in this file → fail"). It
// is intentionally NOT baked into the test runner here — keeping the in-file
// matrix passing while gaps are open lets unrelated dev work proceed without
// CI noise from the long tail of known-broken cells. As each gap is closed
// the corresponding `'gap'` is flipped to `'impl'`; Phase 1 lands when no
// `'gap'` remains in this file.

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

type Backend = 'interp' | 'v2';
type Cell = 'impl' | 'gap';

type ParityRow = {
  readonly name: string;
  readonly category:
    | 'class'
    | 'refinement'
    | 'modifier'
    | 'schemaDecl'
    | 'structureRef';
  readonly schema: () => SchemaDef;
  readonly input: string;
  readonly expectedAst: unknown;
  readonly expected: Readonly<Record<Backend, Cell>>;
  // Reason to skip the backend entirely (e.g. interp hangs forever on this
  // input — runtime guard not yet in place). Skipped backends report 'skip'
  // and don't count toward expected/actual comparison. Use sparingly.
  readonly skip?: Readonly<Partial<Record<Backend, string>>>;
};

// ---------------------------------------------------------------------------
// Runners
// ---------------------------------------------------------------------------

async function runV2(schema: SchemaDef, input: string): Promise<unknown> {
  const code = generateParser(schema, undefined, {});
  const dir = mkdtempSync(join(tmpdir(), 'parser3-parity-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = (await import(pathToFileURL(file).href)) as {
    render: (input: string, options?: { target?: string }) => unknown;
  };
  return mod.render(input, { target: 'ast' });
}

function runInterp(schema: SchemaDef, input: string): unknown {
  const inferred = inferSchema(schema);
  return interpretParse(inferred, input);
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

async function classify(row: ParityRow, backend: Backend): Promise<Cell> {
  try {
    const schema = row.schema();
    const actual =
      backend === 'interp' ? runInterp(schema, row.input) : await runV2(schema, row.input);
    assert.deepEqual(stripSource(actual), row.expectedAst);
    return 'impl';
  } catch {
    return 'gap';
  }
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

const rows: ReadonlyArray<ParityRow> = [
  // --- Classes -------------------------------------------------------------

  {
    name: 'class:literal',
    category: 'class',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'hello',
            encodings: {
              src: parse([literal('hello')]),
              ast: { type: 'x' },
            },
          }),
        ],
      }),
    input: 'hello',
    expectedAst: { type: 'x' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'class:ident',
    category: 'class',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'hello',
            encodings: {
              src: parse([span('name', 'hello').ident()]),
              ast: { type: 'x', name: $.name },
            },
          }),
        ],
      }),
    input: 'world',
    expectedAst: { type: 'x', name: 'world' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'class:number',
    category: 'class',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '42',
            encodings: {
              src: parse([span('n', '42').number()]),
              ast: { type: 'num', value: $.n },
            },
          }),
        ],
      }),
    input: '123',
    expectedAst: { type: 'num', value: '123' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'class:string',
    category: 'class',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '"hi"',
            encodings: {
              src: parse([span('s', '"hi"').string().doubleQuoted()]),
              ast: { type: 'str', value: $.s },
            },
          }),
        ],
      }),
    input: '"world"',
    expectedAst: { type: 'str', value: '"world"' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  // Note: `.keyword(text)` was previously in the DSL surface but no shipped
  // schema used it and it didn't meet the admission policy (it was
  // functionally equivalent to `literal(text)` or `span('kw', text)`). It
  // was removed during Phase 1 cleanup rather than implemented; that's why
  // no `class:keyword` row appears here.

  {
    name: 'class:operator',
    category: 'class',
    schema: () =>
      defineSchema({
        rootType: 'X',
        operators: { add: ['+', '-'] },
        examples: [
          relation('X', {
            input: 'a + b',
            encodings: {
              src: parse([
                span('left', 'a').ident(),
                span('op', '+').operator(),
                span('right', 'b').ident(),
              ]),
              ast: { type: 'binop', op: $.op, left: $.left, right: $.right },
            },
          }),
        ],
      }),
    input: 'x - y',
    expectedAst: { type: 'binop', op: '-', left: 'x', right: 'y' },
    // Wired during Phase 1 — both interp and v2 do longest-match scan over
    // InferredSchema.operatorLiterals (sorted longest-first at infer time).
    // Pratt-precedence layered parsing is still Phase 5; this row only
    // exercises the class scanner, not the layered operator parse.
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'class:hex',
    category: 'class',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'FF',
            encodings: {
              src: parse([span('value', 'FF').hex()]),
              ast: { type: 'hex', value: $.value },
            },
          }),
        ],
      }),
    input: 'CAFE',
    expectedAst: { type: 'hex', value: 'CAFE' },
    // The hex class scans bare hex digits ([0-9a-fA-F]+). 0x-prefix forms
    // are spelled `literal('0x') + span('v', ...).hex()`.
    expected: { interp: 'impl', v2: 'impl' },
  },

  // Note: class:regex and class:template were removed from the DSL during
  // Phase 1 (no shipped schema used them; per the roadmap policy "remove
  // when zero users"). The removal cleared their feature-parity rows.

  {
    name: 'class:comment',
    category: 'class',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '/* hi */',
            encodings: {
              src: parse([span('value', '/* hi */').comment().block('/*', '*/')]),
              ast: { type: 'comment', value: $.value },
            },
          }),
        ],
      }),
    input: '/* note */',
    // Both backends strip `/* ... */` delimiters and trim interior
    // whitespace when the span carries the (implicit) .comment()
    // refinement; the captured value is the interior text.
    expectedAst: { type: 'comment', value: 'note' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  // Note: class:whitespace was removed from the DSL during Phase 1
  // (no shipped schema used it; the schema-level `whitespace: 'preserve'`
  // declaration is a different feature). The removal cleared its row.

  // --- Modifiers -----------------------------------------------------------

  {
    name: 'modifier:optional',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'foo bar',
            encodings: {
              src: parse([
                span('a', 'foo').ident(),
                span('b', 'bar').ident().optional(),
              ]),
              ast: { type: 'pair', a: $.a, b: $.b },
            },
          }),
        ],
      }),
    input: 'foo',
    expectedAst: { type: 'pair', a: 'foo', b: null },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'modifier:until-balanced',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'name: value;',
            encodings: {
              src: parse([
                span('k', 'name').until(':'),
                literal(':'),
                span('v', 'value').until(';'),
                literal(';'),
              ]),
              ast: { type: 'kv', k: $.k, v: $.v },
            },
          }),
        ],
      }),
    input: 'prop: data;',
    expectedAst: { type: 'kv', k: 'prop', v: 'data' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'modifier:repeats',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'List',
        punctuators: { comma: ',' },
        examples: [
          relation('Item', {
            input: 'x',
            encodings: {
              src: parse([span('name', 'x').ident()]),
              ast: { type: 'item', name: $.name },
            },
          }),
          relation('List', {
            input: 'x, y',
            encodings: {
              src: parse([
                span('items', 'x').of('Item').repeats({ sep: ',' }),
              ]),
              ast: { type: 'list', items: $.items },
            },
          }),
        ],
      }),
    input: 'a, b, c',
    expectedAst: {
      type: 'list',
      items: [
        { type: 'item', name: 'a' },
        { type: 'item', name: 'b' },
        { type: 'item', name: 'c' },
      ],
    },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'modifier:repeats-stopBefore',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'Block',
        punctuators: { comma: ',' },
        examples: [
          relation('Item', {
            input: 'x',
            encodings: {
              src: parse([span('name', 'x').ident()]),
              ast: { type: 'item', name: $.name },
            },
          }),
          relation('Block', {
            input: 'x, y FROM',
            encodings: {
              src: parse([
                span('items', 'x')
                  .of('Item')
                  .repeats({ sep: ',', stopBefore: ['FROM'] }),
                literal('FROM'),
              ]),
              ast: { type: 'block', items: $.items },
            },
          }),
        ],
      }),
    input: 'a, b FROM',
    expectedAst: {
      type: 'block',
      items: [
        { type: 'item', name: 'a' },
        { type: 'item', name: 'b' },
      ],
    },
    expected: { interp: 'impl', v2: 'impl' },
  },

  // --- Refinements ---------------------------------------------------------

  {
    name: 'refinement:ident-css',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '--foo-bar',
            encodings: {
              src: parse([span('name', '--foo-bar').ident().css()]),
              ast: { type: 'cssId', name: $.name },
            },
          }),
        ],
      }),
    input: '--baz',
    expectedAst: { type: 'cssId', name: '--baz' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'refinement:number-int',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '42',
            encodings: {
              src: parse([span('n', '42').number().int()]),
              ast: { type: 'int', value: $.n },
            },
          }),
        ],
      }),
    input: '7',
    expectedAst: { type: 'int', value: '7' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'refinement:number-float',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '3.14',
            encodings: {
              src: parse([span('n', '3.14').number().float()]),
              ast: { type: 'float', value: $.n },
            },
          }),
        ],
      }),
    input: '2.71',
    expectedAst: { type: 'float', value: '2.71' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'refinement:number-scientific',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '1e10',
            encodings: {
              src: parse([span('n', '1e10').number().scientific()]),
              ast: { type: 'sci', value: $.n },
            },
          }),
        ],
      }),
    input: '2.5e-3',
    expectedAst: { type: 'sci', value: '2.5e-3' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'refinement:number-coerce',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '42',
            encodings: {
              src: parse([span('n', '42').number().int().coerce()]),
              ast: { type: 'int', value: $.n },
            },
          }),
        ],
      }),
    input: '99',
    // .coerce() converts the captured slice to a JS number.
    expectedAst: { type: 'int', value: 99 },
    // Phase 1 deliberate gap (documented in roadmap Phase 5 design
    // notes): interp keeps .coerce() captures as raw slices because
    // mirroring coerce on the forward path would also require
    // teaching interp/stringify to re-encode on the inverse direction
    // (JSON-quote, etc.). Today schemas using .coerce() round-trip
    // correctly because interp's render+stringify are self-consistent.
    expected: { interp: 'gap', v2: 'impl' },
  },

  {
    name: 'refinement:string-singleQuoted',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: "'hi'",
            encodings: {
              src: parse([span('s', "'hi'").string().singleQuoted()]),
              ast: { type: 'str', value: $.s },
            },
          }),
        ],
      }),
    input: "'world'",
    expectedAst: { type: 'str', value: "'world'" },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'refinement:string-coerce',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '"hi"',
            encodings: {
              src: parse([span('s', '"hi"').string().doubleQuoted().coerce()]),
              ast: { type: 'str', value: $.s },
            },
          }),
        ],
      }),
    input: '"world"',
    // .coerce() strips quotes and processes escapes on string class.
    expectedAst: { type: 'str', value: 'world' },
    // Phase 1 deliberate gap (see refinement:number-coerce note above).
    expected: { interp: 'gap', v2: 'impl' },
  },

  {
    name: 'refinement:ident-oneOf',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'left',
            encodings: {
              src: parse([span('dir', 'left').ident().oneOf(['left', 'right'])]),
              ast: { type: 'dir', value: $.dir },
            },
          }),
        ],
      }),
    input: 'right',
    expectedAst: { type: 'dir', value: 'right' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'refinement:ident-js',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'name',
            encodings: {
              src: parse([span('n', 'name').ident().js()]),
              ast: { type: 'jsId', value: $.n },
            },
          }),
        ],
      }),
    input: '_id$',
    expectedAst: { type: 'jsId', value: '_id$' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'refinement:ident-html',
    category: 'refinement',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'div',
            encodings: {
              src: parse([span('tag', 'div').ident().html()]),
              ast: { type: 'htmlId', value: $.tag },
            },
          }),
        ],
      }),
    input: 'my-element',
    expectedAst: { type: 'htmlId', value: 'my-element' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  // --- Modifier options ---------------------------------------------------

  {
    name: 'modifier:until-balanced-false',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: '[a (b) c]',
            encodings: {
              src: parse([
                literal('['),
                span('inner', 'a (b) c').until(']', { balanced: false }),
                literal(']'),
              ]),
              ast: { type: 'block', inner: $.inner },
            },
          }),
        ],
      }),
    input: '[x (y) z]',
    expectedAst: { type: 'block', inner: 'x (y) z' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'modifier:until-nonEmpty',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'data;',
            encodings: {
              src: parse([
                span('v', 'data').until(';', { nonEmpty: true }),
                literal(';'),
              ]),
              ast: { type: 'x', value: $.v },
            },
          }),
        ],
      }),
    input: 'hello;',
    expectedAst: { type: 'x', value: 'hello' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'modifier:rawUntil',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'body</end>',
            encodings: {
              src: parse([
                span('v', 'body').rawUntil('</'),
                literal('</'),
                span('tag', 'end').ident(),
                literal('>'),
              ]),
              ast: { type: 'x', value: $.v, tag: $.tag },
            },
          }),
        ],
      }),
    input: 'content</close>',
    expectedAst: { type: 'x', value: 'content', tag: 'close' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'modifier:repeats-min',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'List',
        punctuators: { comma: ',' },
        examples: [
          relation('Item', {
            input: 'x',
            encodings: {
              src: parse([span('name', 'x').ident()]),
              ast: { type: 'item', name: $.name },
            },
          }),
          relation('List', {
            input: 'x',
            encodings: {
              src: parse([
                span('items', 'x').of('Item').repeats({ sep: ',', min: 0 }),
              ]),
              ast: { type: 'list', items: $.items },
            },
          }),
        ],
      }),
    input: '',
    expectedAst: { type: 'list', items: [] },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'modifier:repeats-trailing',
    category: 'modifier',
    schema: () =>
      defineSchema({
        rootType: 'List',
        punctuators: { comma: ',' },
        examples: [
          relation('Item', {
            input: 'x',
            encodings: {
              src: parse([span('name', 'x').ident()]),
              ast: { type: 'item', name: $.name },
            },
          }),
          relation('List', {
            input: 'x,y,',
            encodings: {
              src: parse([
                span('items', 'x').of('Item').repeats({ sep: ',', trailing: 'allowed' }),
              ]),
              ast: { type: 'list', items: $.items },
            },
          }),
        ],
      }),
    input: 'a,b,',
    expectedAst: {
      type: 'list',
      items: [
        { type: 'item', name: 'a' },
        { type: 'item', name: 'b' },
      ],
    },
    expected: { interp: 'impl', v2: 'impl' },
  },

  // --- Schema-level declarations -------------------------------------------

  {
    name: 'schemaDecl:punctuators-named',
    category: 'schemaDecl',
    schema: () =>
      defineSchema({
        rootType: 'X',
        punctuators: { colon: ':' },
        examples: [
          relation('X', {
            input: 'a:b',
            encodings: {
              src: parse([
                span('l', 'a').ident(),
                literal(':'),
                span('r', 'b').ident(),
              ]),
              ast: { type: 'pair', l: $.l, r: $.r },
            },
          }),
        ],
      }),
    input: 'x:y',
    expectedAst: { type: 'pair', l: 'x', r: 'y' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  // --- Structure refs ------------------------------------------------------

  {
    name: 'schemaDecl:operators',
    category: 'schemaDecl',
    schema: () =>
      defineSchema({
        rootType: 'X',
        operators: { add: ['+', '-'], mul: ['*', '/'] },
        examples: [
          relation('X', {
            input: 'a + b',
            encodings: {
              src: parse([
                span('left', 'a').ident(),
                span('op', '+').operator(),
                span('right', 'b').ident(),
              ]),
              ast: { type: 'binop', op: $.op, left: $.left, right: $.right },
            },
          }),
        ],
      }),
    input: 'x / y',
    expectedAst: { type: 'binop', op: '/', left: 'x', right: 'y' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'schemaDecl:defaultTarget',
    category: 'schemaDecl',
    schema: () =>
      defineSchema({
        rootType: 'X',
        defaultTarget: 'ast',
        examples: [
          relation('X', {
            input: 'hello',
            encodings: {
              src: parse([span('v', 'hello').ident()]),
              ast: { type: 'x', value: $.v },
            },
          }),
        ],
      }),
    input: 'world',
    expectedAst: { type: 'x', value: 'world' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'schemaDecl:unknownChars-tolerate',
    category: 'schemaDecl',
    schema: () =>
      defineSchema({
        rootType: 'X',
        unknownChars: 'tolerate',
        examples: [
          relation('X', {
            input: 'a',
            encodings: {
              src: parse([span('v', 'a').until('\n')]),
              ast: { type: 'x', value: $.v },
            },
          }),
        ],
      }),
    input: 'data!@#$%^',
    expectedAst: { type: 'x', value: 'data!@#$%^' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  // --- Structure refs ------------------------------------------------------

  {
    name: 'structureRef:span-value',
    category: 'structureRef',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'hello',
            encodings: {
              src: parse([span('greeting', 'hello').ident()]),
              ast: { type: 'msg', text: $.greeting },
            },
          }),
        ],
      }),
    input: 'hi',
    expectedAst: { type: 'msg', text: 'hi' },
    expected: { interp: 'impl', v2: 'impl' },
  },

  {
    name: 'structureRef:span-presence',
    category: 'structureRef',
    schema: () =>
      defineSchema({
        rootType: 'X',
        examples: [
          relation('X', {
            input: 'a b',
            encodings: {
              src: parse([
                span('l', 'a').ident(),
                span('r', 'b').ident().optional(),
              ]),
              ast: { type: 'pair', present: $.r.present },
            },
          }),
        ],
      }),
    input: 'x',
    expectedAst: { type: 'pair', present: false },
    // Closed 2026-06-07: span-presence is now invertible. The new
    // InverseIR kind 'presence' lets stringify set captures[name] from
    // the boolean — literal text on true (for literal-only optional
    // spans, baked in at derivation time) or null otherwise. Value-
    // stable (not byte-stable) on class-typed optional spans: stringify
    // can't reconstruct the source text from a bare bool, so the
    // optional emit becomes a no-op on that branch. Documented in
    // packages/compiler/src/model.ts (InverseIR doc).
    expected: { interp: 'impl', v2: 'impl' },
  },
];

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

for (const row of rows) {
  for (const backend of ['interp', 'v2'] as const) {
    const skipReason = row.skip?.[backend];
    if (skipReason !== undefined) {
      test(`parity [${row.name}] (${backend}) — skipped: ${skipReason}`, () => {});
      continue;
    }
    test(`parity [${row.name}] (${backend})`, async () => {
      const actual = await classify(row, backend);
      assert.equal(
        actual,
        row.expected[backend],
        `cell mismatch for [${row.name}] (${backend}): expected ${row.expected[backend]}, got ${actual}`,
      );
    });
  }
}

// --- Negative codegen checks -----------------------------------------------
// Some configurations would hang or crash at runtime; the compiler rejects
// them at codegen time so neither backend can ever encounter them.

test('codegen rejects .repeats({ sep: "" }) — empty sep would loop forever', () => {
  const schema = defineSchema({
    rootType: 'List',
    examples: [
      relation('Item', {
        input: 'x',
        encodings: {
          src: parse([span('name', 'x').ident()]),
          ast: { type: 'item', name: $.name },
        },
      }),
      relation('List', {
        input: 'x',
        encodings: {
          src: parse([
            span('items', 'x').of('Item').repeats({ sep: '' }),
          ]),
          ast: { type: 'list', items: $.items },
        },
      }),
    ],
  });
  assert.throws(
    () => inferSchema(schema),
    /sep: ''.*infinite|empty/i,
    'inferSchema should reject sep:"" with a CompilerError',
  );
});
