import test from 'node:test';
import { strict as assert } from 'node:assert';
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { $, defineSchema, ex, tpl } from '@parser2/parser';
import { inferSchema } from '../src/index.ts';
import { emitV2Parser } from '../src/emit/v2/index.ts';

const yamlListSchema = defineSchema({
  rootType: 'YamlList',
  examples: [
    ex('- a')
      .as('YamlItem')
      .span('- ')
      .span('value', 'a').until('\n')
      .render('ast', $.value)
      .render('source', tpl`- ${$.value}`)
      .build(),

    ex(`- a
- b`)
      .as('YamlList')
      .indent('items', ['YamlItem']).repeats({ min: 0 })
      .render('ast', { type: 'list', items: $.items })
      .render('source', tpl`${$.items}`)
      .build(),
  ],
});

const here = dirname(fileURLToPath(import.meta.url));

async function loadGeneratedParser() {
  const schema = inferSchema(yamlListSchema);
  const source = emitV2Parser(schema);
  const dir = mkdtempSync(join(here, '.indent-emit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, source, 'utf8');
  try {
    const mod = await import(pathToFileURL(file).href);
    return { mod, dir };
  } catch (e) {
    rmSync(dir, { recursive: true, force: true });
    throw e;
  }
}

test('emit v2: indent-aware repeats parses two top-level items', async () => {
  const { mod, dir } = await loadGeneratedParser();
  try {
    const ast = mod.render('- a\n- b\n', { type: 'ast' });
    assert.deepEqual(ast, { type: 'list', items: ['a', 'b'] });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit v2: dedent terminates the repeats loop', async () => {
  const { mod, dir } = await loadGeneratedParser();
  try {
    const ast = mod.render('- a\n- b\n', { type: 'ast' });
    assert.equal((ast as { items: string[] }).items.length, 2);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('emit v2: blank lines inside the indent block are skipped', async () => {
  const { mod, dir } = await loadGeneratedParser();
  try {
    const ast = mod.render('- a\n\n- b\n', { type: 'ast' });
    assert.deepEqual((ast as { items: string[] }).items, ['a', 'b']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
