// Phase 7 follow-up #2 regression — synthesizePieces accepts empty text on
// required-recursive-repeats spans without the schema author having to
// inline a synthetic multi-line example string.
//
// Before this relaxation, a span like
//   span('entries').of('YamlMappingEntry').indent().repeats({ min: 1 })
// would throw at inferSchema time because rebuild.ts's findSpanStart
// returned null for empty text AND .repeats({min:1}) is not absent-allowed.
// The workaround was to pass the full example string as text, which the
// runtime ignored but the compile-time bookkeeping needed.
//
// The relaxation: empty-text spans whose shape is
// `.of(roles).repeats({min:>=1})` skip the text-anchoring step in the
// same way that absent-allowed spans do — the slot piece is synthesized
// directly. Both emit/rebuild.ts and interp/stringify.ts apply this
// relaxation in lockstep via the shared isRequiredRecursiveRepeats helper.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretStringify } from '../src/interp/index.ts';
import { emitV2Parser } from '../src/emit/v2/index.ts';

const here = dirname(fileURLToPath(import.meta.url));

// Mirror of yaml-block's YamlMapping / YamlMappingEntry trimmed to the
// minimum needed to exercise the empty-text required-recursive-repeats
// shape. The 'block' span has NO example text, only `.of(roles).indent()
// .repeats({ min: 1 })`.
const requiredIndentSchema = defineSchema({
  rootType: 'Doc',
  unknownChars: 'tolerate',
  examples: [
    relation('Line', {
      input: 'foo: 1',
      encodings: {
        src: parse([
          span('key', 'foo').ident().css(),
          literal(': '),
          span('val', '1').until('\n'),
        ]),
        ast: { key: $.key, val: $.val },
        source: tpl`${$.key}: ${$.val}`,
      },
    }),

    relation('Doc', {
      input: 'foo: 1\nbar: 2',
      encodings: {
        // Empty span text — the relaxation under test.
        src: parse([span('block').of('Line').indent().repeats({ min: 1 })]),
        ast: { lines: $.block },
        source: tpl`${$.block}`,
      },
    }),
  ],
});

test('synthesizePieces: empty-text .of(roles).indent().repeats({min:1}) does NOT throw at inferSchema', () => {
  // The pre-relaxation behavior was a CompilerError at inferSchema time:
  //   "rebuild: span 'block' not found in example 'foo: 1\\nbar: 2'"
  // We assert inferSchema succeeds.
  const schema = inferSchema(requiredIndentSchema);
  assert.ok(schema);
});

test('interp stringify: empty-text required-recursive-repeats span rebuilds correctly', () => {
  const schema = inferSchema(requiredIndentSchema);
  const ast = { lines: [{ key: 'foo', val: '1' }, { key: 'bar', val: '2' }] };
  // The 'ast' target uses an object body; the inverse dispatcher rebuilds
  // each Line first, then joins them via the indent joiner. Column 0 →
  // joiner is '\n', no leading prefix.
  const source = interpretStringify(schema, ast, 'ast');
  assert.equal(source, 'foo: 1\nbar: 2');
});

test('emit v2: empty-text required-recursive-repeats span generates a working parser', async () => {
  const schema = inferSchema(requiredIndentSchema);
  const generated = emitV2Parser(schema);
  const dir = mkdtempSync(join(here, '.empty-indent-emit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, generated, 'utf8');
  try {
    const mod = await import(pathToFileURL(file).href);
    // Forward parse: input → AST.
    const ast = mod.render('foo: 1\nbar: 2', { target: 'ast' });
    assert.deepEqual(ast, { lines: [{ key: 'foo', val: '1' }, { key: 'bar', val: '2' }] });
    // Inverse stringify: AST → source. Column 0, single newline joiner.
    const back = mod.stringify(ast, { target: 'ast' });
    assert.equal(back, 'foo: 1\nbar: 2');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Negative test — empty text on a span shape NOT covered by the relaxation
// must still throw. We use a required (.repeats({min:1})) non-recursive
// span — empty text here remains a schema bug. Recursive roles are the
// discriminator that makes the relaxation safe.
test('synthesizePieces: empty-text without recursive roles still throws', () => {
  const badSchema = defineSchema({
    rootType: 'R',
    examples: [
      relation('R', {
        input: 'x',
        encodings: {
          src: parse([
            // Empty text + .repeats({min:1}) but NO .of(...) — not the
            // relaxed shape. inferSchema should throw because synthesizePieces
            // can't anchor the span.
            span('val').until(['\n']).repeats({ min: 1 }),
          ]),
          ast: { val: $.val },
          source: tpl`${$.val}`,
        },
      }),
    ],
  });
  assert.throws(() => inferSchema(badSchema));
});
