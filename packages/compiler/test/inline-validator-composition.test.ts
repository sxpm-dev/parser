import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { generateParser } from '../src/index.ts';

// Task C.3 — inline-validator composition pass in the v2 backend.
//
// When `defineValidation.validate(SchemaDef)` is called the resulting rule's
// validator is `{ kind: 'inline', schema }`. The codegen must compile each
// unique sub-schema with a unique symbolPrefix in emitMode='inline' and
// concatenate its source into the parent's generated parser, then emit a
// `__validator_N` alias per rule that runs the sub-schema's root parse fn
// and throws on partial parse or null return.

test('codegen inlines sub-schema as validator with unique prefix', async () => {
  const { $, defineSchema, defineValidation, literal, parse, relation, span } = await import('@parser2/parser');

  const colorMini = defineSchema({
    rootType: 'MiniColor',
    punctuators: {},
    tokens: [],
    examples: [
      relation('MiniColor', {
        input: 'red',
        encodings: {
          parse: parse([span('value', 'red').ident().css().oneOf(['red', 'green', 'blue'])]),
          ast: { type: 'mini-color', value: $.value },
        },
      }),
    ],
  });

  const parent = defineSchema({
    rootType: 'Decl',
    punctuators: { colon: ':' },
    tokens: [],
    examples: [
      relation('Decl', {
        input: 'color: red',
        encodings: {
          parse: parse([
            span('prop', 'color').ident().css(),
            literal(':'),
            span('value', 'red').until('\n'),
          ]),
          ast: { type: 'decl', prop: $.prop, value: $.value },
        },
      }),
    ],
  });

  const validation = defineValidation(parent)
    .node('Decl').field('value').match('prop', ['color']).validate(colorMini)
    .build();

  const source = generateParser(parent, validation, { packageName: 'host' });

  // Shape checks — the parent must contain the sub-schema's parse fn under a
  // unique prefix and a __validator_0 alias that dispatches to it.
  assert.match(source, /function __v0_parseMiniColor/);
  assert.match(source, /function __validator_0/);
  // The sub-schema's source must be wrapped in a banner block.
  assert.match(source, /Inlined validator: MiniColor/);
  // emitMode='inline' must suppress public exports inside the sub-schema's
  // body — the parent retains its own single set of exports (render,
  // stringify, validate — typical v2 emit). If the sub-schema's exports
  // leaked through we'd see duplicates and the module would fail to load.
  const exportFnCount = (source.match(/export function /g) ?? []).length;
  assert.equal(exportFnCount, 3, `expected exactly 3 exported functions, got ${exportFnCount}`);
  // Same goes for shared type declarations — exactly one ParseMode /
  // ParseOptions, not two.
  const parseModeCount = (source.match(/export type ParseMode\b/g) ?? []).length;
  assert.equal(parseModeCount, 1, `expected exactly 1 ParseMode export, got ${parseModeCount}`);

  // Materialize and exercise. data: URLs don't carry .ts MIME, so use a temp
  // file and import via pathToFileURL — mirrors the pattern used elsewhere
  // in the test suite for runtime fixtures.
  const dir = mkdtempSync(join(tmpdir(), 'c3-compose-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source);
  try {
    const mod = await import(pathToFileURL(file).href) as {
      validate: (s: string, o?: { validate?: boolean }) => void;
    };
    // Per the generated parser convention, validate runs sub-validators
    // only when { validate: true }. 'red' is in the allowed set.
    assert.doesNotThrow(() => mod.validate('color: red', { validate: true }));
    // 'purple' is NOT in the allowed set — sub-validator must reject.
    assert.throws(() => mod.validate('color: purple', { validate: true }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
