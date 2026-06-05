// Flat-JSON target tests — dynKey + merge body builders.
//
// Forward direction (Task 2):
//   `render(input, { target: 'json' })` yields a flat object whose keys come
//   from captured values (selector, prop) and whose nested values are merged
//   from arrays of child outputs.
//
// Inverse direction (Task 3 — bidirectional round-trip) is exercised once the
// inverse derivation lands; until then we only assert forward shapes.

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { generateParser } from '../src/index.ts';

async function loadParser(code: string): Promise<{
  render: (input: string, options?: { target?: string; mode?: 'fast' | 'raws' }) => unknown;
  stringify?: (value: unknown, options?: { target?: string }) => string;
}> {
  const dir = mkdtempSync(join(tmpdir(), 'parser3-flat-json-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = (await import(pathToFileURL(file).href)) as {
    render?: (input: string, options?: { target?: string; mode?: 'fast' | 'raws' }) => unknown;
    stringify?: (value: unknown, options?: { target?: string }) => string;
  };
  if (typeof mod.render !== 'function') throw new Error('generated parser did not export render');
  return { render: mod.render, stringify: mod.stringify };
}

test('flat-json forward: dynKey on a Decl produces { [prop]: value }', async () => {
  const { defineSchema, relation, parse, span, literal, dynKey, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'color: red',
        encodings: {
          parse: parse([
            span('prop', 'color').until([':']),
            literal(':'),
            span('value', 'red').until([]),
          ]),
          source: tpl`${$.prop}: ${$.value}`,
          json: dynKey($.prop, $.value),
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadParser(code);
  assert.deepEqual(render('color: red', { target: 'json' }), { color: 'red' });
});

test('flat-json forward: merge on Rule.nodes merges Decl outputs into one object', async () => {
  const { defineSchema, relation, parse, span, literal, dynKey, merge, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Rule',
    examples: [
      relation('Decl', {
        input: 'color: red',
        encodings: {
          parse: parse([
            span('prop', 'color').until([':']),
            literal(':'),
            span('value', 'red').until([';', '}']),
          ]),
          source: tpl`${$.prop}: ${$.value}`,
          json: dynKey($.prop, $.value),
        },
      }),
      relation('Rule', {
        input: '.foo { color: red; font-size: 12px }',
        encodings: {
          parse: parse([
            span('selector', '.foo').until(['{']),
            literal('{'),
            span('decls', 'color: red').of('Decl').repeats({ min: 0, sep: ';', trailing: 'allowed' }),
            literal('}'),
          ]),
          source: tpl`${$.selector} {${$.decls}}`,
          json: dynKey($.selector, merge($.decls)),
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadParser(code);
  assert.deepEqual(
    render('.foo { color: red; font-size: 12px }', { target: 'json' }),
    { '.foo': { color: 'red', 'font-size': '12px' } },
  );
});

test('flat-json forward: merge filters null-bodied children', async () => {
  // A child production declares `json: null` — its captures-path render
  // produces null, and merge's filter drops it from the flat output.
  const { defineSchema, relation, parse, span, literal, dynKey, merge, $, tpl } = await import('@parser2/parser');
  const schema = defineSchema({
    rootType: 'Rule',
    examples: [
      relation('Comment', {
        input: '/* x */',
        encodings: {
          parse: parse([span('text', '/* x */').comment()]),
          source: tpl`${$.text}`,
          json: null,
        },
      }),
      relation('Decl', {
        input: 'color: red',
        encodings: {
          parse: parse([span('prop', 'color').until([':']), literal(':'), span('value', 'red').until([';', '}'])]),
          source: tpl`${$.prop}: ${$.value}`,
          json: dynKey($.prop, $.value),
        },
      }),
      relation('Rule', {
        input: '.foo { color: red }',
        encodings: {
          parse: parse([
            span('selector', '.foo').until(['{']),
            literal('{'),
            span('items', 'color: red').of('Comment', 'Decl').repeats({ min: 0, sep: ';', trailing: 'allowed' }),
            literal('}'),
          ]),
          source: tpl`${$.selector} {${$.items}}`,
          json: dynKey($.selector, merge($.items)),
        },
      }),
    ],
    tokens: ['comment'],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadParser(code);
  assert.deepEqual(
    render('.foo { /* x */ color: red }', { target: 'json' }),
    { '.foo': { color: 'red' } },
  );
});
