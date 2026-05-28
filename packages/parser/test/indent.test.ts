import test from 'node:test';
import { strict as assert } from 'node:assert';
import { parse, relation, span } from '../src/index.ts';
import type { SpanModifier } from '../src/types.ts';

test('indent: SpanNode.indent() appends kind:indent modifier', () => {
  const example = relation('YamlList', {
    input: '- a',
    encodings: {
      src: parse([span('children').of('YamlItem').indent().repeats({ min: 0 })]),
      ast: {},
    },
  });
  const s = example.spans[0]!;
  const indentMod = s.modifiers.find((m: SpanModifier) => m.kind === 'indent');
  assert.ok(indentMod, 'expected an indent modifier on the recursive-repeats span');
  // Strict shape check: catches accidental field additions in future refactors.
  assert.deepEqual(indentMod, { kind: 'indent' });
});

test('indent: span().of(roles).indent() creates an indented recursive span', () => {
  const example = relation('YamlList', {
    input: '- a',
    encodings: {
      src: parse([span('children').of('YamlItem').indent().repeats({ min: 0 })]),
      ast: {},
    },
  });
  const s = example.spans[0]!;
  assert.equal(s.name, 'children');
  assert.deepEqual([...s.recursiveRoles], ['YamlItem']);
  assert.ok(s.modifiers.find((m: SpanModifier) => m.kind === 'indent'),
    'must have the indent modifier');
  assert.ok(s.modifiers.find((m: SpanModifier) => m.kind === 'repeats'),
    '.repeats() must still chain after the indent');
});

test('indent: modifier order preserved — indent before repeats', () => {
  const example = relation('YamlList', {
    input: '- a',
    encodings: {
      src: parse([span('children').of('YamlItem').indent().repeats({ min: 0 })]),
      ast: {},
    },
  });
  const kinds = example.spans[0]!.modifiers.map((m) => m.kind);
  assert.deepEqual(kinds, ['indent', 'repeats']);
});
