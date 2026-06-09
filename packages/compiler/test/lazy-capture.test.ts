// Phase 5a — lazy span value capture.
//
// The compiler elides the `const <name> = input.slice(start, end)` line for
// class spans whose value never appears in any render body or inverseDerived.
// Literal spans get the same treatment for their constant string. Start/end
// offset locals are kept whenever synthetic refs (gap/raw/tail/...) depend
// on them, and the captures payload drops the field for unreferenced names.
//
// These tests pin the generated-code shape so a future regression in the
// pass shows up here rather than only as a numeric perf drop.

import assert from 'node:assert/strict';
import test from 'node:test';
import { generateParser } from '../src/index.ts';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  $,
  defineSchema,
  literal,
  parse,
  relation,
  span,
} from '@parser2/parser';

async function loadParser(code: string): Promise<{
  render: (input: string, options?: { target?: string }) => unknown;
  stringify: (value: unknown, options?: { target?: string }) => string;
}> {
  const dir = mkdtempSync(join(tmpdir(), 'parser3-lazy-'));
  const file = join(dir, 'parser.ts');
  writeFileSync(file, code);
  const mod = (await import(pathToFileURL(file).href)) as {
    render: (input: string, options?: { target?: string }) => unknown;
    stringify: (value: unknown, options?: { target?: string }) => string;
  };
  return { render: mod.render, stringify: mod.stringify };
}

test('lazy capture: referenced class span keeps its slice', () => {
  const schema = defineSchema({
    rootType: 'Decl',
    examples: [
      relation('Decl', {
        input: 'foo',
        encodings: {
          src: parse([span('name', 'foo').ident()]),
          ast: { type: 'decl', name: $.name },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(
    code,
    /const name = input\.slice\(__name_start, __name_end\)/,
    'a span referenced as $.name must emit its slice extraction',
  );
  assert.match(
    code,
    /name: name/,
    'captures payload must include the referenced span',
  );
});

test('lazy capture: unreferenced class span elides its slice + captures field', () => {
  const schema = defineSchema({
    rootType: 'Tag',
    examples: [
      relation('Tag', {
        input: 'anchor',
        encodings: {
          src: parse([span('anchor', 'anchor').ident()]),
          // anchor span is structural only — never read.
          ast: { type: 'tag' },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.doesNotMatch(
    code,
    /const anchor = input\.slice/,
    'unreferenced class span must not emit a value slice',
  );
  assert.doesNotMatch(
    code,
    /\banchor: anchor\b/,
    'unreferenced span must not appear in the captures payload',
  );
});

test('lazy capture: oneOf refinement forces slice even when unreferenced', () => {
  const schema = defineSchema({
    rootType: 'Direction',
    examples: [
      relation('Direction', {
        input: 'left',
        encodings: {
          src: parse([span('dir', 'left').ident().oneOf(['left', 'right'])]),
          // dir not surfaced — refinement guards acceptance.
          ast: { type: 'dir' },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // Refinement check reads the captured value; slice must stay alive.
  assert.match(
    code,
    /const dir = input\.slice\(__dir_start, __dir_end\)/,
    'oneOf refinement needs the captured value to evaluate the check',
  );
  // But the captures payload should still drop the field — the value
  // isn't referenced by any render body.
  assert.doesNotMatch(
    code,
    /\bdir: dir\b/,
    'unreferenced span must not appear in the captures payload even when scanned for refinement',
  );
});

test('lazy capture: unreferenced span keeps start/end offset locals alive', () => {
  // Even when the value slice is elided, start/end offset locals must
  // remain — downstream synthetic refs (gap/raw/tail/etc.) materialise
  // their slices via `state.input.slice(<start>, <end>)`. The locals
  // are also load-bearing for refinement-free anchor spans that may
  // later be referenced by a sibling span's `until` boundary.
  const schema = defineSchema({
    rootType: 'Anchor',
    examples: [
      relation('Anchor', {
        input: 'x',
        encodings: {
          src: parse([span('a', 'x').ident()]),
          ast: { type: 'anchor' }, // a is structural-only
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(code, /const __a_start = off/, 'start-offset local must stay alive');
  assert.match(code, /const __a_end = off/, 'end-offset local must stay alive');
  assert.doesNotMatch(
    code,
    /const a = input\.slice\(__a_start, __a_end\)/,
    'unreferenced span must skip the slice',
  );
});

test('lazy capture: literal span elides its constant when unreferenced', () => {
  const schema = defineSchema({
    rootType: 'Kw',
    examples: [
      relation('Kw', {
        input: 'as',
        encodings: {
          src: parse([span('kw', 'as')]),
          ast: { type: 'as' },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.doesNotMatch(
    code,
    /const kw = "as"/,
    'unreferenced literal span must not emit its constant',
  );
});

test('lazy capture: literal span kept when referenced as $.kw', () => {
  const schema = defineSchema({
    rootType: 'Kw',
    examples: [
      relation('Kw', {
        input: 'as',
        encodings: {
          src: parse([span('kw', 'as')]),
          ast: { type: 'kw', text: $.kw },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(
    code,
    /const kw = "as"/,
    'referenced literal span must emit its constant value',
  );
});

test('lazy capture: forward parse still works on a multi-span schema with anchors', async () => {
  const schema = defineSchema({
    rootType: 'Header',
    punctuators: { colon: ':' },
    examples: [
      relation('Header', {
        input: 'key: value',
        encodings: {
          parse: parse([
            span('k', 'key').ident(),
            literal(':'),
            span('anchor', 'value').ident(),
          ]),
          // `anchor` exists for shape only — never referenced.
          ast: { type: 'header', k: $.k },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadParser(code);
  // Forward parse: AST is built from $.k only; the anchor span is
  // matched but not surfaced.
  assert.deepEqual(render('key: value', { target: 'ast' }), { type: 'header', k: 'key' });
  // And the elision is observable in the generated source.
  assert.doesNotMatch(code, /const anchor = input\.slice/);
  assert.doesNotMatch(code, /\banchor: anchor\b/);
});

test('lazy capture: span referenced by sibling production keeps its value', () => {
  // Two productions for the same node type. Production 0 references
  // `value`; production 1 doesn't but uses the same span name. Each
  // production is analyzed independently — production 1's `value`
  // span value is dropped, but production 0's stays alive.
  const schema = defineSchema({
    rootType: 'Pair',
    punctuators: { eq: '=' },
    examples: [
      relation('Pair', {
        input: 'a=b',
        encodings: {
          src: parse([
            span('k', 'a').ident(),
            literal('='),
            span('value', 'b').ident(),
          ]),
          ast: { type: 'kv', k: $.k, v: $.value },
        },
      }),
      relation('Pair', {
        input: 'c',
        encodings: {
          src: parse([span('k', 'c').ident()]),
          ast: { type: 'k', k: $.k },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  // Both productions reference `k` in their AST bodies → both keep
  // the slice for `k`.
  const kSliceMatches = [...code.matchAll(/const k = input\.slice/g)];
  assert.equal(kSliceMatches.length >= 2, true, 'every production must keep its referenced `k` slice');
  // Production 0 references `value` → its slice is kept.
  assert.match(code, /const value = input\.slice/, 'production 0 keeps referenced value slice');
});

// ---------------------------------------------------------------------------
// Phase 5a extension — lazy capture for OPTIONAL class spans.
// Three cases by what each production's render bodies reference:
//   (a) value referenced       → keep `string | null` local + slice()
//   (b) presence only          → use `<name>_present: boolean` local
//   (c) neither referenced     → boolean too, no captures field
// ---------------------------------------------------------------------------

test('lazy capture (optional): value referenced keeps `string | null` slice', () => {
  const schema = defineSchema({
    rootType: 'Tag',
    examples: [
      relation('Tag', {
        input: 'name',
        encodings: {
          src: parse([span('id', 'name').ident().optional()]),
          ast: { type: 'tag', id: $.id },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(
    code,
    /let id: string \| null = null/,
    'value-referenced optional span keeps the nullable string local',
  );
  assert.match(
    code,
    /id = input\.slice\(__id_start, __id_end\)/,
    'value-referenced optional span keeps the slice extraction',
  );
  assert.match(code, /id: id/, 'captures payload still surfaces the value');
});

test('lazy capture (optional): presence only → boolean local, no slice', () => {
  const schema = defineSchema({
    rootType: 'Tag',
    examples: [
      relation('Tag', {
        input: 'name',
        encodings: {
          src: parse([span('id', 'name').ident().optional()]),
          // Only presence is checked — value is never read.
          ast: { type: 'tag', hasId: $.id.present },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(
    code,
    /let id_present = false/,
    'presence-only optional span uses a boolean local',
  );
  assert.match(
    code,
    /id_present = true/,
    'boolean local is flipped when the scan succeeds',
  );
  assert.doesNotMatch(
    code,
    /id = input\.slice/,
    'presence-only optional span must skip the slice extraction',
  );
  assert.doesNotMatch(
    code,
    /let id: string \| null/,
    'presence-only optional span must not allocate the string|null local',
  );
  // Captures field must carry a nullable marker so render-side
  // `captures.id != null` works.
  assert.match(
    code,
    /id: \(id_present \|\| null\)/,
    'captures payload surfaces a true|null marker for presence checks',
  );
});

test('lazy capture (optional): neither value nor presence → boolean + no captures field', () => {
  const schema = defineSchema({
    rootType: 'Tag',
    examples: [
      relation('Tag', {
        input: 'name',
        encodings: {
          src: parse([span('id', 'name').ident().optional()]),
          // No reference to $.id or $.id.present — span is purely structural.
          ast: { type: 'tag' },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(
    code,
    /let id_present = false/,
    'optional span still needs a boolean to gate the conditional scan',
  );
  assert.doesNotMatch(
    code,
    /id = input\.slice/,
    'unreferenced optional span must not allocate the slice',
  );
  assert.doesNotMatch(
    code,
    /let id: string \| null/,
    'unreferenced optional span must not allocate the string|null local',
  );
  assert.doesNotMatch(
    code,
    /\bid: \(id_present/,
    'no captures field for a fully-unreferenced optional span',
  );
});

test('lazy capture (optional): oneOf refinement forces `string | null` even when value unreferenced', () => {
  const schema = defineSchema({
    rootType: 'Direction',
    examples: [
      relation('Direction', {
        input: 'left',
        encodings: {
          src: parse([
            span('dir', 'left').ident().oneOf(['left', 'right']).optional(),
          ]),
          // dir not surfaced — refinement guards acceptance when present.
          ast: { type: 'dir' },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  assert.match(
    code,
    /let dir: string \| null = null/,
    'oneOf refinement on optional span keeps the nullable string local for the refinement check',
  );
  assert.match(
    code,
    /dir = input\.slice/,
    'oneOf refinement still needs the captured slice to evaluate the check',
  );
  // The value isn't referenced by any render body, so even though we
  // allocated it for the refinement check, the captures payload drops it.
  assert.doesNotMatch(
    code,
    /\bdir: dir\b/,
    'unreferenced span must not appear in the captures payload even when scanned for refinement',
  );
});

test('lazy capture (optional): forward parse still works on a presence-only span', async () => {
  const schema = defineSchema({
    rootType: 'Tag',
    examples: [
      relation('Tag', {
        input: 'name',
        encodings: {
          parse: parse([
            span('id', 'name').ident().optional(),
          ]),
          ast: { type: 'tag', hasId: $.id.present },
        },
      }),
    ],
  });
  const code = generateParser(schema, undefined, {});
  const { render } = await loadParser(code);
  // Present case: hasId = true.
  assert.deepEqual(render('name', { target: 'ast' }), { type: 'tag', hasId: true });
  // Absent case: hasId = false (empty input — optional span scans nothing).
  assert.deepEqual(render('', { target: 'ast' }), { type: 'tag', hasId: false });
});
