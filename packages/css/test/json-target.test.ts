import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse, render, stringify } from '../src/index.ts';

// 'json' target — selector-as-key custom shape:
//   `.foo { color: red }` → `{".foo": {"color":"red"}}`
// 'json-auto' target — AST-shape autopilot (no author work):
//   `.foo { color: red }` → `{"type":"root","nodes":[{"type":"rule",...}]}`

const here = dirname(fileURLToPath(import.meta.url));
const hugePageCss = readFileSync(
  join(here, '..', 'bench', 'fixture', 'huge-page.css'),
  'utf8',
);

const SHAPE_CASES: ReadonlyArray<{ readonly input: string; readonly expected: unknown }> = [
  {
    input: '.foo { color: red }',
    expected: { '.foo': { color: 'red' } },
  },
  {
    input: '.foo { color: red; margin: 0 }',
    expected: { '.foo': { color: 'red', margin: '0' } },
  },
  {
    input: '.foo { color: red }\n.bar { width: 100px }',
    expected: { '.foo': { color: 'red' }, '.bar': { width: '100px' } },
  },
  {
    input: '@media screen { .baz { display: none } }',
    expected: { '@media screen': { '.baz': { display: 'none' } } },
  },
  {
    input: '.foo { color: red !important }',
    expected: { '.foo': { color: 'red !important' } },
  },
  {
    input: '/* comment */ .x { width: 100px }',
    expected: { '.x': { width: '100px' } },
  },
  {
    input: '@charset "UTF-8";',
    expected: { '@charset "UTF-8"': null },
  },
];

for (const { input, expected } of SHAPE_CASES) {
  test(`json target shape: ${trim(input)}`, () => {
    const out = render(input, { target: 'json' });
    const decoded = JSON.parse(out);
    assert.deepEqual(decoded, expected);
  });
}

test('duplicate selectors: JSON.parse keeps the last value', () => {
  const out = render('.foo { color: red }\n.foo { color: blue }', { target: 'json' });
  const decoded = JSON.parse(out) as Record<string, unknown>;
  assert.deepEqual(decoded, { '.foo': { color: 'blue' } });
});

test('json-auto target shape: AST dump', () => {
  const out = render('.foo { color: red }', { target: 'json-auto' });
  const decoded = JSON.parse(out) as { type: string; nodes: ReadonlyArray<{ type: string }> };
  assert.equal(decoded.type, 'root');
  assert.equal(decoded.nodes[0]?.type, 'rule');
});

test('render and stringify agree on json target', () => {
  for (const { input } of SHAPE_CASES) {
    const viaRender = render(input, { target: 'json' });
    const viaStringify = stringify(parse(input), { target: 'json' });
    assert.equal(viaRender, viaStringify, `mismatch for: ${input}`);
  }
});

test('huge fixture: json target produces valid JSON', () => {
  const out = render(hugePageCss, { target: 'json' });
  const decoded = JSON.parse(out);
  assert.equal(typeof decoded, 'object');
  assert.ok(Object.keys(decoded as object).length > 0);
});

test('huge fixture: json-auto target produces valid JSON', () => {
  const out = render(hugePageCss, { target: 'json-auto' });
  const decoded = JSON.parse(out) as { type: string; nodes: unknown[] };
  assert.equal(decoded.type, 'root');
  assert.ok(decoded.nodes.length > 0);
});

function trim(s: string): string {
  return s.length <= 40 ? s : `${s.slice(0, 37)}...`;
}
