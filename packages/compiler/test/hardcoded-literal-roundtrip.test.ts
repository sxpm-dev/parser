// Hardcoded-literal-in-AST round-trip.
//
// When a render body has a literal scalar (e.g. `value: '-10'`) whose
// field name matches a named span in the production, the inverter now
// populates captures[name] from the literal so the shared rebuild can
// emit the span's text on stringify. Prior to this fix, the inverter
// only asserted equality and the rebuild slot stayed empty — schemas
// that hardcoded a literal in the AST instead of routing it through
// $.name lost the value on stringify.
//
// Both backends covered: the captures-path inverse emit and the
// interpreted runtime mirror the new behavior.

import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { strict as assert } from 'node:assert';
import { $, defineSchema, parse, relation, span } from '@parser2/parser';
import { generateParser, inferSchema } from '../src/index.ts';
import { interpretStringify } from '../src/interp/stringify.ts';

async function loadParser(code: string): Promise<{
  render: (input: string, options?: { target?: string }) => unknown;
  stringify: (value: unknown, options?: { target?: string }) => string;
}> {
  const dir = mkdtempSync(join(tmpdir(), 'hardlit-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  return (await import(pathToFileURL(file).href)) as {
    render: (input: string, options?: { target?: string }) => unknown;
    stringify: (value: unknown, options?: { target?: string }) => string;
  };
}

test('v2: hardcoded literal in AST round-trips through stringify', async () => {
  const schema = defineSchema({
    rootType: 'LP',
    examples: [
      relation('LP', {
        input: '-10px',
        encodings: {
          src: parse([
            span('value', '-10').number(),
            span('unit', 'px').ident(),
          ]),
          // value is hardcoded; unit goes through $.unit
          ast: { type: 'lp', value: '-10', unit: $.unit },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const mod = await loadParser(code);
  const ast = mod.render('-10px', { target: 'ast' }) as { type: string; value: string; unit: string };
  assert.equal(ast.type, 'lp');
  assert.equal(ast.value, '-10');
  assert.equal(ast.unit, 'px');
  const src = mod.stringify(ast, { target: 'ast' });
  // Without the fix: 'px' (value slot empty). With the fix: '-10 px'
  // or '-10px' depending on canonical whitespace.
  assert.match(src, /-10\s*px/);
});

test('v2: hardcoded literal field with non-matching name still just asserts', async () => {
  // Sanity: when the AST field name does NOT match a span name, the
  // literal is just a discriminator — no captures write.
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'foo',
        encodings: {
          src: parse([span('name', 'foo').ident()]),
          ast: { type: 'x', name: $.name, marker: 'literal-only' },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const mod = await loadParser(code);
  const ast = mod.render('foo', { target: 'ast' });
  assert.equal((ast as { marker: string }).marker, 'literal-only');
  // Stringify should succeed — there's no 'marker' span, so the literal
  // doesn't try to populate any captures.
  const src = mod.stringify(ast, { target: 'ast' });
  assert.match(src, /foo/);
});

test('interp: hardcoded literal in AST round-trips through stringify', () => {
  const schema = defineSchema({
    rootType: 'LP',
    examples: [
      relation('LP', {
        input: '-10px',
        encodings: {
          src: parse([
            span('value', '-10').number(),
            span('unit', 'px').ident(),
          ]),
          ast: { type: 'lp', value: '-10', unit: $.unit },
        },
      }),
    ],
  });
  const inferred = inferSchema(schema);
  const src = interpretStringify(inferred, { type: 'lp', value: '-10', unit: 'px' }, 'ast');
  assert.match(src, /-10\s*px/);
});

test('v2: hardcoded literal of non-string type still just asserts (no captures write)', async () => {
  // Numbers / booleans / null aren't routed into the rebuild — captures
  // for spans are string-shaped. Only string-valued hardcoded literals
  // matching a named span trigger the new captures populate path.
  const schema = defineSchema({
    rootType: 'X',
    examples: [
      relation('X', {
        input: 'foo',
        encodings: {
          src: parse([span('flag', 'foo').ident()]),
          ast: { type: 'x', flag: true },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const mod = await loadParser(code);
  const ast = mod.render('foo', { target: 'ast' });
  assert.equal((ast as { flag: boolean }).flag, true);
});
