// Task 7.5 — Inverse stringify emits indent on target='source'.
// Tests that interpretStringify correctly joins children of an
// indent-modified repeats span with '\n' separators (column-0 MVP).
//
// Strategy: define the same yamlList schema used in Tasks 7.2 and 7.4,
// then call interpretStringify directly with an AST value and assert the
// reconstructed source string.

import test from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { $, defineSchema, literal, parse, relation, span, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { interpretStringify } from '../src/interp/index.ts';
import { emitV2Parser } from '../src/emit/v2/index.ts';

const yamlListSchema = defineSchema({
  rootType: 'YamlList',
  examples: [
    relation('YamlItem', {
      input: '- a',
      encodings: {
        src: parse([literal('- '), span('value', 'a').until('\n')]),
        ast: $.value,
        source: tpl`- ${$.value}`,
      },
    }),

    relation('YamlList', {
      input: `- a\n- b`,
      encodings: {
        src: parse([span('items').of('YamlItem').indent().repeats({ min: 0 })]),
        ast: { type: 'list', items: $.items },
        source: tpl`${$.items}`,
      },
    }),
  ],
});

test('interp stringify: emits items at column 0 with newline separation', () => {
  const schema = inferSchema(yamlListSchema);
  const ast = { type: 'list', items: ['a', 'b'] };
  // Target 'ast' — the object-valued render. The inverse recovers 'items'
  // as ['- a', '- b'] (each YamlItem rebuilt through its own source), then
  // rebuildSource joins them. With kind:'indent', the joiner must be '\n'.
  const source = interpretStringify(schema, ast, 'ast');
  // Both items at column 0, separated by a single newline. Trailing newline
  // must NOT be emitted; downstream round-trip relies on exact equality.
  assert.equal(source, '- a\n- b');
});

const here = dirname(fileURLToPath(import.meta.url));

// Exercises the EMITTER-SIDE rebuild path (emit/rebuild.ts and emit/render.ts
// both run their own copies of joinSeparatorOf / repeatsJoinSeparator). The
// interp test above only covers interp/stringify.ts; this test ensures the
// generated parser produces the same '\n' joiner for indent-modified spans.
test('emit v2: generated stringify emits items at column 0 with newline separation', async () => {
  const schema = inferSchema(yamlListSchema);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(here, '.indent-stringify-emit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source, 'utf8');
  try {
    const mod = await import(pathToFileURL(file).href);
    const ast = { type: 'list', items: ['a', 'b'] };
    const out = mod.stringify(ast, { target: 'ast' });
    assert.equal(out, '- a\n- b');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
