import assert from 'node:assert/strict';
import test from 'node:test';
import type { NodeTypeInfo, Production, ResolvedSpan } from '../src/model.ts';
import { detectPrefixShare } from '../src/emit/v2/prefix-share-dispatch.ts';

function literal(text: string): ResolvedSpan {
  return { class: 'literal', text, refinements: [], modifiers: [], recursiveRoles: [] };
}

function ident(name: string): ResolvedSpan {
  return { name, class: 'ident', refinements: [{ name: 'js', args: [] }], modifiers: [], recursiveRoles: [] };
}

function recursive(name: string, role: string, modifiers: ResolvedSpan['modifiers'] = []): ResolvedSpan {
  return { name, class: 'literal', refinements: [], modifiers, recursiveRoles: [role] };
}

function prod(spans: ResolvedSpan[]): Production {
  return {
    nodeType: 'X',
    source: { input: '' } as Production['source'],
    spans,
    renders: new Map(),
  };
}

test('detectPrefixShare returns null for single-alt info', () => {
  const info: NodeTypeInfo = { name: 'X', productions: [prod([literal('SELECT'), ident('table')])] };
  assert.equal(detectPrefixShare(info), null);
});

test('detectPrefixShare returns null when shared prefix is only 1 span', () => {
  // K=1 is the byte-prefix dispatcher's territory; matching it here would
  // duplicate that path.
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('SELECT'), ident('a')]),
      prod([literal('SELECT'), ident('b')]),
    ],
  };
  // The two ident spans have different `text` (example) — but spansMatchExactly
  // ignores `text` for non-literal classes... actually it does NOT ignore for
  // literal class only. For ident, the `text` field is the example, so they
  // match exactly here. Adjust by giving them different shapes:
  info.productions = [
    prod([literal('SELECT'), { ...ident('a'), modifiers: [{ name: 'optional', args: [] }] }]),
    prod([literal('SELECT'), ident('b')]),
  ];
  assert.equal(detectPrefixShare(info), null);
});

test('detectPrefixShare matches pg-select.Select shape: 4 alts, prefix=4, literal-led suffixes', () => {
  // SELECT cols FROM table [WHERE …] [LIMIT …]
  const cols = recursive('columns', 'ColumnRef', [{ name: 'repeats', args: [{ sep: ',', min: 1 }] }]);
  const tbl = ident('table');
  const where = recursive('where', 'Predicate');
  const lim = ident('limit');
  const info: NodeTypeInfo = {
    name: 'Select',
    productions: [
      prod([literal('SELECT'), cols, literal('FROM'), tbl]), // alt 0
      prod([literal('SELECT'), cols, literal('FROM'), tbl, literal('WHERE'), where]), // alt 1
      prod([literal('SELECT'), cols, literal('FROM'), tbl, literal('LIMIT'), lim]), // alt 2
      prod([literal('SELECT'), cols, literal('FROM'), tbl, literal('WHERE'), where, literal('LIMIT'), lim]), // alt 3
    ],
  };
  const result = detectPrefixShare(info);
  assert.ok(result);
  assert.equal(result.prefixLen, 4);
  assert.deepEqual(result.suffixHeads, [
    { altIdx: 0, head: null },
    { altIdx: 1, head: 'WHERE' },
    { altIdx: 2, head: 'LIMIT' },
    { altIdx: 3, head: 'WHERE' },
  ]);
});

test('detectPrefixShare returns null when two alts have empty suffix', () => {
  // Two empty suffixes mean two identical productions — schema error, not a
  // shape we should rewrite.
  const tbl = ident('table');
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('SELECT'), tbl]),
      prod([literal('SELECT'), tbl]),
    ],
  };
  assert.equal(detectPrefixShare(info), null);
});

test('detectPrefixShare returns null when a suffix head is a strict prefix of another', () => {
  // "LIMIT" vs "LIMITED" — dispatching by startsWith on "LIMIT" would also
  // catch "LIMITED" inputs, leading to wrong routing. Conservative bail.
  const tbl = ident('table');
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('SELECT'), tbl, literal('LIMIT'), ident('n')]),
      prod([literal('SELECT'), tbl, literal('LIMITED'), ident('n')]),
    ],
  };
  assert.equal(detectPrefixShare(info), null);
});

test('detectPrefixShare returns null when a suffix starts with a non-literal span', () => {
  // The dispatcher peeks a fixed literal to route; an ident-led suffix has
  // no fixed prefix bytes to peek.
  const tbl = ident('table');
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('SELECT'), tbl, literal('END')]),
      prod([literal('SELECT'), tbl, ident('extra')]),
    ],
  };
  assert.equal(detectPrefixShare(info), null);
});

test('detectPrefixShare returns null when alts diverge at K=0 (no shared prefix)', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('SELECT'), ident('a'), literal('END')]),
      prod([literal('INSERT'), ident('b'), literal('END')]),
    ],
  };
  assert.equal(detectPrefixShare(info), null);
});
