import assert from 'node:assert/strict';
import test from 'node:test';
import type { Refinement } from '@parser2/parser';
import type { NodeTypeInfo, Production, ResolvedSpan } from '../src/model.ts';
import { detectSharedDispatch } from '../src/emit/v2/shared-dispatch.ts';

function literal(text: string): ResolvedSpan {
  return { class: 'literal', text, refinements: [], modifiers: [], recursiveRoles: [] };
}

function identOneOf(name: string, values: readonly string[]): ResolvedSpan {
  const refinements: ReadonlyArray<Refinement> = [
    { name: 'html', args: [] },
    { name: 'oneOf', args: [values] },
  ];
  return { name, class: 'ident', refinements, modifiers: [], recursiveRoles: [] };
}

function identAny(name: string): ResolvedSpan {
  const refinements: ReadonlyArray<Refinement> = [{ name: 'html', args: [] }];
  return { name, class: 'ident', refinements, modifiers: [], recursiveRoles: [] };
}

function prod(spans: ResolvedSpan[]): Production {
  return {
    nodeType: 'X',
    source: { input: '' } as Production['source'],
    spans,
    renders: new Map(),
  };
}

test('detectSharedDispatch returns null for single-alt info', () => {
  const info: NodeTypeInfo = { name: 'X', productions: [prod([literal('<'), identAny('tag')])] };
  assert.equal(detectSharedDispatch(info), null);
});

test('detectSharedDispatch returns null when alts do not share literal prefix', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identOneOf('tag', ['a'])]),
      prod([literal('['), identOneOf('tag', ['b'])]),
    ],
  };
  assert.equal(detectSharedDispatch(info), null);
});

test('detectSharedDispatch returns null when no alt has oneOf at the discriminator position', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identAny('tag')]),
      prod([literal('<'), identAny('tag')]),
    ],
  };
  assert.equal(detectSharedDispatch(info), null);
});

test('detectSharedDispatch picks up html-shape: literal + ident().oneOf()', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identOneOf('tag', ['script', 'style'])]), // alt 0
      prod([literal('<'), identOneOf('tag', ['li'])]), // alt 1
      prod([literal('<'), identOneOf('tag', ['tr'])]), // alt 2
      prod([literal('<'), identAny('tag')]), // alt 3 (catch-all)
    ],
  };
  const result = detectSharedDispatch(info);
  assert.ok(result);
  assert.equal(result.prefixLen, 2);
  assert.equal(result.discriminatorIdx, 1);
  assert.deepEqual([...result.tagToAlts.keys()].sort(), ['li', 'script', 'style', 'tr']);
  assert.deepEqual(result.tagToAlts.get('script'), [0]);
  assert.deepEqual(result.tagToAlts.get('li'), [1]);
  assert.deepEqual(result.catchAllAlts, [3]);
});

test('detectSharedDispatch groups overlapping oneOf values in declaration order', () => {
  // void-element pattern: two alts share the same oneOf set (different suffix)
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identOneOf('tag', ['br', 'hr'])]), // alt 0 (void)
      prod([literal('<'), identOneOf('tag', ['br', 'hr'])]), // alt 1 (void self-close)
      prod([literal('<'), identAny('tag')]), // alt 2 (catch-all)
    ],
  };
  const result = detectSharedDispatch(info);
  assert.ok(result);
  assert.deepEqual(result.tagToAlts.get('br'), [0, 1]);
  assert.deepEqual(result.tagToAlts.get('hr'), [0, 1]);
  assert.deepEqual(result.catchAllAlts, [2]);
});

test('detectSharedDispatch lowercases oneOf values for the routing key', () => {
  const info: NodeTypeInfo = {
    name: 'X',
    productions: [
      prod([literal('<'), identOneOf('tag', ['SCRIPT', 'Style'])]),
      prod([literal('<'), identAny('tag')]),
    ],
  };
  const result = detectSharedDispatch(info);
  assert.ok(result);
  assert.deepEqual([...result.tagToAlts.keys()].sort(), ['script', 'style']);
});
